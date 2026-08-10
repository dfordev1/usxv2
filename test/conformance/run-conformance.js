#!/usr/bin/env node
// Executable conformance oracle. Unlike verify-manifest.js (which only proves
// the manifest is internally consistent), this actually RUNS every fixture
// through the real checkers and confirms its declared behavior:
//
//   - the positive fixture MUST be XSD-valid AND Schematron-clean;
//   - every negative fixture MUST actually trip its targetsRule, reported by
//     the checker that owns that rule (XSD for L1/QUSX-STR, Schematron for a
//     schematron-checkable rule, src/validate.js for a js rule, or a parser
//     rejection for QUSX-WF-001).
//
// It asserts the TARGETED rule fires (not an exact set match), so the
// documented multi-rule couplings in manifest.json's notes (e.g. PIN-004
// also tripping PIN-006 in the stateful js checker) are tolerated by design.
//
// This is the CI gate that makes "another implementation can run the fixtures"
// concrete: the same manifest + rules.json + schemas drive it, no fixture
// behavior is hard-coded here.
//
// Usage: node test/conformance/run-conformance.js

const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { validateFile } = require("../../src/validate.js");
const { resolvePython } = require("../python-command.js");

const HERE = __dirname;
const ROOT = path.join(HERE, "..", "..");
const SCHEMA_XSD = path.join(ROOT, "schema", "qusx.xsd");
const SCHEMATRON_RUNNER = path.join(ROOT, "scripts", "schematron_validate.py");
const { command: PYTHON, args: PYTHON_ARGS } = resolvePython();

const manifest = JSON.parse(fs.readFileSync(path.join(HERE, "manifest.json"), "utf-8"));
const rulesDoc = JSON.parse(fs.readFileSync(path.join(HERE, "rules.json"), "utf-8"));
const ruleById = new Map(rulesDoc.rules.map((r) => [r.id, r]));

let passed = 0;
let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`PASS: ${name}`);
  } else {
    failures++;
    console.log(`FAIL: ${name}${detail ? " -- " + detail : ""}`);
  }
}

// --- XSD check via lxml (one python process per file; fixtures are tiny) ---
function xsdResult(absFile) {
  try {
    const out = execFileSync(
      PYTHON,
      [
        ...PYTHON_ARGS,
        "-c",
        `
from lxml import etree
schema = etree.XMLSchema(etree.parse(r"${SCHEMA_XSD}"))
try:
    doc = etree.parse(r"${absFile}")
except etree.XMLSyntaxError:
    print("NOT_WELL_FORMED"); raise SystemExit
print("VALID" if schema.validate(doc) else "INVALID")
`,
      ],
      { encoding: "utf-8" }
    );
    return out.trim();
  } catch (e) {
    return "ERROR:" + (e.message || e);
  }
}

// --- Schematron: run the python runner ONCE over all fixtures, parse output ---
// Output format: "PASS  <path>" or "FAIL  <path>" followed by indented
// "        [QUSX-...] message" lines. Build path -> {ok, ids[]}.
function runSchematronBatch(absFiles) {
  const res = new Map();
  if (absFiles.length === 0) return res;
  const out = spawnSync(PYTHON, [...PYTHON_ARGS, SCHEMATRON_RUNNER, ...absFiles], { encoding: "utf-8" });
  const text = (out.stdout || "") + "\n" + (out.stderr || "");
  let current = null;
  for (const line of text.split("\n")) {
    const m = line.match(/^(PASS|FAIL)\s+(.+?)\s*$/);
    if (m) {
      current = path.resolve(m[2]);
      res.set(current, { ok: m[1] === "PASS", ids: [] });
      continue;
    }
    if (current) {
      for (const id of line.match(/QUSX-[A-Z]+-\d{3}/g) || []) res.get(current).ids.push(id);
    }
  }
  return res;
}

function jsRuleIds(absFile) {
  let errors;
  try {
    errors = validateFile(absFile).errors;
  } catch (e) {
    return ["__THROWN__"];
  }
  const ids = [];
  for (const e of errors) for (const id of e.match(/QUSX-[A-Z]+-\d{3}/g) || []) ids.push(id);
  return ids;
}

// Pre-run Schematron in one batch over every fixture whose targeted rule (or
// the positive fixture) is schematron-relevant.
const schematronFiles = manifest.fixtures
  .filter((fx) => {
    if (fx.expectedOutcome === "pass") return true;
    const r = ruleById.get(fx.targetsRule);
    return r && (r.checkedBy || []).includes("schematron");
  })
  .map((fx) => path.resolve(ROOT, fx.file))
  .filter((p) => fs.existsSync(p));
const schematron = runSchematronBatch(schematronFiles);

for (const fx of manifest.fixtures) {
  const absFile = path.resolve(ROOT, fx.file);
  const label = `${fx.file} (${fx.targetsRule || "positive"})`;
  if (!fs.existsSync(absFile)) {
    check(`${label}: file exists`, false);
    continue;
  }

  if (fx.expectedOutcome === "pass") {
    const xsd = xsdResult(absFile);
    check(`${label}: positive fixture is XSD-valid`, xsd === "VALID", `got ${xsd}`);
    const sch = schematron.get(absFile);
    check(`${label}: positive fixture is Schematron-clean`, sch && sch.ok === true, sch ? `ids: ${sch.ids}` : "no schematron result");
    continue;
  }

  // negative fixture: the targeted rule must actually fire, via its owning checker
  const rule = ruleById.get(fx.targetsRule);
  const checkedBy = (rule && rule.checkedBy) || [];
  const isL1 = rule && rule.level === "L1";

  if (fx.targetsRule === "QUSX-WF-001") {
    const xsd = xsdResult(absFile);
    check(`${label}: rejected as not-well-formed`, xsd === "NOT_WELL_FORMED", `got ${xsd}`);
  } else if (isL1 || checkedBy.includes("xsd")) {
    const xsd = xsdResult(absFile);
    // WF-003 (duplicate attribute) is also not-well-formed; accept either.
    check(`${label}: XSD rejects it (targets ${fx.targetsRule})`, xsd === "INVALID" || xsd === "NOT_WELL_FORMED", `got ${xsd}`);
    // For js-visible structural rules (e.g. WF-003), also confirm validate.js tags it.
    if (checkedBy.includes("js")) {
      check(`${label}: validate.js reports ${fx.targetsRule}`, jsRuleIds(absFile).includes(fx.targetsRule));
    }
  } else if (checkedBy.includes("schematron")) {
    const sch = schematron.get(absFile);
    check(
      `${label}: Schematron reports ${fx.targetsRule}`,
      sch && !sch.ok && sch.ids.includes(fx.targetsRule),
      sch ? `observed ids: ${sch.ids}` : "no schematron result"
    );
    // schematron-checkable pairing rules are ALSO js-checkable; confirm parity where applicable
    if (checkedBy.includes("js")) {
      check(`${label}: validate.js also reports ${fx.targetsRule}`, jsRuleIds(absFile).includes(fx.targetsRule));
    }
  } else if (checkedBy.includes("js")) {
    check(`${label}: validate.js reports ${fx.targetsRule}`, jsRuleIds(absFile).includes(fx.targetsRule), `observed: ${jsRuleIds(absFile)}`);
  } else {
    check(`${label}: has a runnable checker for ${fx.targetsRule}`, false, `checkedBy=${checkedBy}`);
  }
}

console.log(`\nConformance suite: ${passed} passed, ${failures} failed.`);
process.exit(failures > 0 ? 1 : 0);
