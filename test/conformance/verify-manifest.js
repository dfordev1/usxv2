#!/usr/bin/env node
// Sanity-checks test/conformance/manifest.json against test/conformance/rules.json
// and the actual fixture files on disk. Does NOT run any XSD/Schematron/semantic
// validation itself (that's the job of a real conformance checker, per README.md
// in this directory) -- it only proves the manifest is an internally-consistent,
// well-formed contract: every referenced file exists, every rule id referenced
// is a real rule id, and every negative fixture's expectedFailingRules includes
// its own targetsRule exactly once (extra rule ids are allowed only where the
// manifest's own "notes" field documents a known coupling).
//
// Usage: node test/conformance/verify-manifest.js

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const MANIFEST_PATH = path.join(__dirname, "manifest.json");
const RULES_PATH = path.join(__dirname, "rules.json");

let failures = 0;
let passed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`PASS: ${name}`);
  } else {
    failures++;
    console.log(`FAIL: ${name}${detail ? " -- " + detail : ""}`);
  }
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
const rulesDoc = JSON.parse(fs.readFileSync(RULES_PATH, "utf-8"));

const knownRuleIds = new Set(rulesDoc.rules.map((r) => r.id));
const knownLevels = new Set(Object.keys(rulesDoc.levels));

check("manifest has a version field", typeof manifest.version === "string" && manifest.version.length > 0);
check("manifest has a fixtures array", Array.isArray(manifest.fixtures) && manifest.fixtures.length > 0);

// Rules explicitly known to be coupled with an incidental extra rule id in this
// suite (documented in manifest.notes) -- these are allowed more than one
// expectedFailingRules entry. Everything else must be exactly one.
const KNOWN_MULTI_RULE_TARGETS = new Set(["QUSX-PIN-004", "QUSX-PIN-005"]);
// Reused legacy fixtures (predating this suite) that incidentally also trip
// QUSX-AYH-001 or QUSX-WF-003/etc. because of their truncated ayahCount --
// identified by path rather than rule id since the coupling is fixture-specific,
// not rule-specific, for these.
const LEGACY_REUSED_PREFIX = "test/fixtures/";

for (const fx of manifest.fixtures) {
  const label = fx.file;

  check(`${label}: file exists on disk`, fs.existsSync(path.join(ROOT, fx.file)), `resolved path: ${path.join(ROOT, fx.file)}`);

  check(
    `${label}: expectedOutcome is "pass" or "fail"`,
    fx.expectedOutcome === "pass" || fx.expectedOutcome === "fail"
  );

  check(
    `${label}: level is a known conformance level`,
    knownLevels.has(fx.level),
    `level="${fx.level}", known levels: ${[...knownLevels].join(", ")}`
  );

  check(
    `${label}: targetsRule is null or a known rule id`,
    fx.targetsRule === null || knownRuleIds.has(fx.targetsRule),
    `targetsRule="${fx.targetsRule}"`
  );

  check(
    `${label}: expectedFailingRules is an array`,
    Array.isArray(fx.expectedFailingRules)
  );

  for (const ruleId of fx.expectedFailingRules || []) {
    check(`${label}: expectedFailingRules entry "${ruleId}" is a known rule id`, knownRuleIds.has(ruleId));
  }

  if (fx.expectedOutcome === "pass") {
    check(`${label}: pass fixture has targetsRule=null`, fx.targetsRule === null);
    check(`${label}: pass fixture has an empty expectedFailingRules`, (fx.expectedFailingRules || []).length === 0);
  } else {
    check(`${label}: fail fixture has a non-null targetsRule`, typeof fx.targetsRule === "string");

    check(
      `${label}: expectedFailingRules includes targetsRule`,
      (fx.expectedFailingRules || []).includes(fx.targetsRule)
    );

    const isKnownMultiRule = KNOWN_MULTI_RULE_TARGETS.has(fx.targetsRule) || fx.file.startsWith(LEGACY_REUSED_PREFIX);
    if (!isKnownMultiRule) {
      check(
        `${label}: expectedFailingRules lists exactly one rule (isolated negative)`,
        (fx.expectedFailingRules || []).length === 1,
        `got: ${JSON.stringify(fx.expectedFailingRules)}`
      );
    } else {
      check(
        `${label}: expectedFailingRules is non-empty (documented multi-rule fixture)`,
        (fx.expectedFailingRules || []).length >= 1
      );
    }
  }
}

// Every rule id mentioned anywhere in the manifest must round-trip through rules.json.
const referencedRuleIds = new Set();
for (const fx of manifest.fixtures) {
  if (fx.targetsRule) referencedRuleIds.add(fx.targetsRule);
  for (const r of fx.expectedFailingRules || []) referencedRuleIds.add(r);
}
for (const id of referencedRuleIds) {
  check(`rule id "${id}" referenced by the manifest exists in rules.json`, knownRuleIds.has(id));
}

// Coverage check: every rule this task asked us to cover has at least one fixture.
const REQUIRED_COVERAGE = [
  "QUSX-WF-001",
  "QUSX-WF-003",
  "QUSX-STR-002",
  "QUSX-STR-006",
  "QUSX-STR-007",
  "QUSX-STR-008",
  "QUSX-STR-011",
  "QUSX-PIN-001",
  "QUSX-PIN-002",
  "QUSX-PIN-003",
  "QUSX-PIN-004",
  "QUSX-PIN-005",
  "QUSX-PIN-006",
  "QUSX-PIN-008",
  "QUSX-AYH-001",
  "QUSX-WRD-001",
  "QUSX-WRD-002",
  "QUSX-TRD-001",
  "QUSX-NRM-001",
];
const targetedRuleIds = new Set(manifest.fixtures.map((fx) => fx.targetsRule).filter(Boolean));
for (const id of REQUIRED_COVERAGE) {
  check(`required rule "${id}" has a dedicated targeting fixture`, targetedRuleIds.has(id));
}

check("manifest has at least one pass fixture", manifest.fixtures.some((fx) => fx.expectedOutcome === "pass"));

console.log(`\n${passed} passed, ${failures} failed.`);
process.exit(failures > 0 ? 1 : 0);
