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
const { execFileSync } = require("child_process");
const { validateFile } = require("../src/validate.js");

const FIXTURES = path.join(__dirname, "fixtures");
const SCHEMA = path.join(__dirname, "..", "schema", "qusx.xsd");

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

// --- XSD (real XML Schema processor) negative tests ---

check(
  "malformed-not-well-formed.xml is rejected as not-well-formed XML",
  xsdValid(path.join(FIXTURES, "malformed-not-well-formed.xml")) === "NOT_WELL_FORMED"
);

check(
  "schema-violation-surah-out-of-range.qusx.xml is rejected by the XSD",
  xsdValid(path.join(FIXTURES, "schema-violation-surah-out-of-range.qusx.xml")) === "INVALID"
);

// --- positive control: a real generated file must NOT be rejected ---

const realFile = path.join(__dirname, "..", "output", "madani-v2", "001.qusx.xml");
check("real generated file passes validate.js (positive control)", validateFile(realFile).errors.length === 0);
check("real generated file passes the XSD (positive control)", xsdValid(realFile) === "VALID");

console.log(`\n${passed} passed, ${failures} failed.`);
process.exit(failures > 0 ? 1 : 0);
