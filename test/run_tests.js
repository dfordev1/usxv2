#!/usr/bin/env node
// Negative tests: proves the validators actually REJECT bad input, not just
// pass good input. Each fixture in test/fixtures/ targets one specific
// defect class; a fixture that passes validation is a test failure.
//
// Also runs one positive control (a real generated file) through both
// validators to prove they don't reject everything indiscriminately.
//
// Usage: node test/run_tests.js
// (scripts/xsd_validate.py's per-file logic is reused via a small inline
// Python snippet, since well-formedness/XSD checks require a real parser
// that src/validate.js deliberately does not implement — see its header
// comment on the validate.js/xsd_validate.py split of responsibility.)

const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { validateFile, validateCrossLayoutConsistency } = require("../src/validate.js");

const FIXTURES = path.join(__dirname, "fixtures");
const SCHEMA = path.join(__dirname, "..", "schema", "qusx.xsd");
const GENERATE = path.join(__dirname, "..", "src", "generate.js");

let failures = 0;
let passed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`PASS: ${name}`);
  } else {
    failures++;
    console.log(`TEST FAILURE: ${name}${detail ? " — " + detail : ""}`);
  }
}

function xsdValid(filePath) {
  try {
    const out = execFileSync(
      "python",
      [
        "-c",
        `
from lxml import etree
schema = etree.XMLSchema(etree.parse(r"${SCHEMA}"))
try:
    doc = etree.parse(r"${filePath}")
except etree.XMLSyntaxError as e:
    print("NOT_WELL_FORMED")
    exit()
print("VALID" if schema.validate(doc) else "INVALID")
`,
      ],
      { encoding: "utf-8" }
    );
    return out.trim();
  } catch (e) {
    return "PYTHON_ERROR: " + e.message;
  }
}

// --- semantic validator (validate.js) negative tests ---

function semanticErrorsFor(fixtureName) {
  const p = path.join(FIXTURES, fixtureName);
  try {
    return validateFile(p).errors;
  } catch (e) {
    // a thrown exception while validating garbage counts as "rejected"
    return [String(e)];
  }
}

check(
  "duplicate-sid.qusx.xml is rejected by validate.js",
  semanticErrorsFor("duplicate-sid.qusx.xml").some((e) => /duplicate sid/i.test(e)),
  "expected a 'duplicate sid' error"
);

check(
  "unclosed-milestone.qusx.xml is rejected by validate.js",
  semanticErrorsFor("unclosed-milestone.qusx.xml").some((e) => /unclosed milestone/i.test(e)),
  "expected an 'unclosed milestone' error"
);

check(
  "bad-word-position.qusx.xml is rejected by validate.js",
  semanticErrorsFor("bad-word-position.qusx.xml").some((e) => /position/i.test(e)),
  "expected a word-position error"
);

check(
  "bad-ayah-sequence.qusx.xml is rejected by validate.js",
  semanticErrorsFor("bad-ayah-sequence.qusx.xml").some((e) => /ayah numbers/i.test(e)),
  "expected an ayah-sequence error"
);

// --- tradition-aware ayah-count check ---
// Different qira'at genuinely split/merge verse boundaries differently (e.g.
// Warsh's Quraysh has 5 ayahs vs Hafs's 4). validateFile() must compare a
// non-Hafs file's declared ayahCount against ITS OWN tradition's real count
// (data/traditions/ayah-counts.json), not silently fall back to the Hafs
// canonical count -- that would false-flag every genuinely-divergent surah.

check(
  "a real Warsh file with its own correct ayah count (5, not Hafs's 4) is NOT flagged (positive control)",
  semanticErrorsFor("tradition-warsh/106.qusx.xml").length === 0,
  `expected no errors, got: ${JSON.stringify(semanticErrorsFor("tradition-warsh/106.qusx.xml"))}`
);

check(
  "a Warsh file with the wrong ayah count (4, Hafs's count, not Warsh's real 5) IS flagged",
  semanticErrorsFor("tradition-warsh-wrong-ayah-count/106.qusx.xml").some((e) => /does not match expected 5.*warsh-kfqc/i.test(e)),
  `expected a tradition-aware ayahCount error, got: ${JSON.stringify(semanticErrorsFor("tradition-warsh-wrong-ayah-count/106.qusx.xml"))}`
);

// --- XSD (real XML Schema processor) negative tests ---

check(
  "malformed-not-well-formed.xml is rejected as not-well-formed XML",
  xsdValid(path.join(FIXTURES, "malformed-not-well-formed.xml")) === "NOT_WELL_FORMED"
);

check(
  "schema-violation-surah-out-of-range.qusx.xml is rejected by the XSD",
  xsdValid(path.join(FIXTURES, "schema-violation-surah-out-of-range.qusx.xml")) === "INVALID"
);

// --- CLI behavior tests (src/generate.js), run for real, not mocked ---
// These exist because README/CHANGELOG once imprecisely implied duplicate
// CLI args are "rejected" like invalid ones — they're not, they're silently
// deduplicated. `node src/generate.js 1 1` exits 0. Asserting both behaviors
// explicitly here means that gap can't reappear silently again.

const dedupeRun = spawnSync("node", [GENERATE, "--layout=madani-v2", "1", "1"], { encoding: "utf-8" });
check(
  "duplicate CLI args (`1 1`) are deduplicated, not rejected — exits 0",
  dedupeRun.status === 0,
  `expected exit 0, got ${dedupeRun.status}. stderr: ${dedupeRun.stderr}`
);
check(
  "duplicate CLI args (`1 1`) write surah 1 exactly once, not twice",
  (dedupeRun.stdout.match(/wrote .*001\.qusx\.xml/g) || []).length === 1,
  `expected exactly one "wrote ...001.qusx.xml" line, got: ${dedupeRun.stdout}`
);

const invalidRun = spawnSync("node", [GENERATE, "--layout=madani-v2", "999"], { encoding: "utf-8" });
check(
  "invalid/out-of-range CLI arg (`999`) is rejected — exits non-zero",
  invalidRun.status !== 0,
  `expected non-zero exit, got ${invalidRun.status}`
);

const invalidLayoutRun = spawnSync("node", [GENERATE, "--layout=nonexistent-layout", "1"], { encoding: "utf-8" });
check(
  "unknown --layout value is rejected — exits non-zero",
  invalidLayoutRun.status !== 0,
  `expected non-zero exit, got ${invalidLayoutRun.status}`
);

// --- cross-layout consistency negative test ---
// validateCrossLayoutConsistency was previously only proven by hand (corrupt
// a real file, run validate.js, restore) — not by an automated test. This
// formalizes that exact manual check: corrupt a temp copy of a real file's
// word text, confirm the checker flags it against an uncorrupted layout,
// with no risk to the actual committed output (operates on a temp copy only).

const realDir = path.join(__dirname, "..", "output");
const tmpDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "qusx-crosslayout-test-"));
const layoutA = "madani-v2";
const layoutB = "madani-v1";
fs.mkdirSync(path.join(tmpDir, layoutA), { recursive: true });
fs.mkdirSync(path.join(tmpDir, layoutB), { recursive: true });
const cleanFileA = path.join(realDir, layoutA, "001.qusx.xml");
const cleanFileB = path.join(realDir, layoutB, "001.qusx.xml");
const tmpFileA = path.join(tmpDir, layoutA, "001.qusx.xml");
const tmpFileB = path.join(tmpDir, layoutB, "001.qusx.xml");
fs.copyFileSync(cleanFileA, tmpFileA);
const corrupted = fs.readFileSync(cleanFileB, "utf-8").replace("بِسْمِ", "XXXXX");
fs.writeFileSync(tmpFileB, corrupted, "utf-8");

const crossLayoutErrorsOnCorrupted = validateCrossLayoutConsistency(
  new Map([[1, { [layoutA]: tmpFileA, [layoutB]: tmpFileB }]])
);
check(
  "cross-layout consistency check catches an injected word-text divergence",
  crossLayoutErrorsOnCorrupted.length > 0,
  "expected at least one divergence error between the clean and corrupted copies"
);

const crossLayoutErrorsOnClean = validateCrossLayoutConsistency(
  new Map([[1, { [layoutA]: cleanFileA, [layoutB]: cleanFileB }]])
);
check(
  "cross-layout consistency check finds no divergence between two real, uncorrupted layouts (positive control)",
  crossLayoutErrorsOnClean.length === 0
);

fs.rmSync(tmpDir, { recursive: true, force: true });

// --- checksum-verify.js negative-control test ---
// Pins the known, documented real-world result (see README Text integrity)
// so a silent regression in the checksum logic — or a silent change in the
// underlying data — doesn't go unnoticed. This is intentionally NOT
// asserting a clean pass: 1,125/6,236 matching is the honest current state.

const checksumRun = spawnSync("node", [path.join(__dirname, "..", "src", "checksum-verify.js")], {
  encoding: "utf-8",
});
check("checksum-verify.js exits non-zero (matches known 1,125/6,236 partial-match state)", checksumRun.status === 1);
check(
  "checksum-verify.js reports the known baseline match count (1125/6236)",
  /Matched: 1125 \/ 6236/.test(checksumRun.stdout),
  `expected "Matched: 1125 / 6236" in output, got: ${checksumRun.stdout.split("\n").slice(0, 3).join(" ")}`
);

// --- positive control: a real generated file must NOT be rejected ---

const realFile = path.join(__dirname, "..", "output", "madani-v2", "001.qusx.xml");
check("real generated file passes validate.js (positive control)", validateFile(realFile).errors.length === 0);
check("real generated file passes the XSD (positive control)", xsdValid(realFile) === "VALID");

console.log(`\n${passed} passed, ${failures} failed.`);
process.exit(failures > 0 ? 1 : 0);
