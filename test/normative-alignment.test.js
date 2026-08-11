const assert = require("assert");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const alignment = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "alignments", "normative-v1.json"), "utf8"));
const traditions = ["hafs-kufi", "shubah-kfqc", "warsh-kfqc", "qalon-kfqc", "douri-kfqc", "sousi-kfqc"];

test("normative prototype has three unique source-authenticated rules", () => {
  assert.equal(alignment.rules.length, 3);
  assert.equal(new Set(alignment.rules.map((rule) => rule.id)).size, 3);
  assert.equal(new Set(alignment.rules.map((rule) => rule.slotId)).size, 3);
  assert.ok(alignment.rules.every((rule) => rule.authentication === "source-authenticated"));
});

test("every rule maps all six traditions and carries evidence", () => {
  for (const rule of alignment.rules) {
    assert.deepEqual(Object.keys(rule.readings).sort(), [...traditions].sort());
    assert.ok(rule.evidence.length >= 2);
    for (const reading of Object.values(rule.readings)) {
      assert.match(reading.ayah, /^\d+:\d+$/);
      assert.ok(Array.isArray(reading.tokens));
    }
  }
});

test("Al-Hadid rule models Hafs presence and Warsh/Qalun absence", () => {
  const rule = alignment.rules.find((item) => item.id === "qusx:alignment:057:024:001");
  assert.deepEqual(rule.readings["hafs-kufi"].tokens, ["هُوَ"]);
  assert.deepEqual(rule.readings["shubah-kfqc"].tokens, ["هُوَ"]);
  assert.deepEqual(rule.readings["warsh-kfqc"].tokens, []);
  assert.deepEqual(rule.readings["qalon-kfqc"].tokens, []);
  assert.deepEqual(rule.readings["douri-kfqc"].tokens, ["هُوَ"]);
  assert.deepEqual(rule.readings["sousi-kfqc"].tokens, ["هُوَ"]);
  assert.equal(rule.readings["hafs-kufi"].ayah, "57:24");
  assert.equal(rule.readings["warsh-kfqc"].ayah, "57:23");
});

test("reading variants preserve the authenticated reader groups", () => {
  const yasin = alignment.rules.find((item) => item.id === "qusx:alignment:037:130:001");
  assert.deepEqual(yasin.readings["warsh-kfqc"].tokens, ["ءَالِ", "يَاسِينَ"]);
  assert.deepEqual(yasin.readings["qalon-kfqc"].tokens, ["ءَالِ", "يَاسِينَ"]);
  assert.deepEqual(yasin.readings["hafs-kufi"].tokens, ["إِلْ", "يَاسِينَ"]);

  const ghafir = alignment.rules.find((item) => item.id === "qusx:alignment:040:026:001");
  for (const tradition of ["warsh-kfqc", "qalon-kfqc", "douri-kfqc", "sousi-kfqc"]) {
    assert.deepEqual(ghafir.readings[tradition].tokens, ["وَأَن"]);
  }
  for (const tradition of ["hafs-kufi", "shubah-kfqc"]) {
    assert.deepEqual(ghafir.readings[tradition].tokens, ["أَوْ", "أَن"]);
  }
});
