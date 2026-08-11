const assert = require("assert");
const test = require("node:test");
const { alignWords, classify, generate, normalizeToken } = require("../scripts/generate_candidate_alignments.js");

function word(text, location) {
  return { text, location, normalized: normalizeToken(text) };
}

test("normalization folds Quranic marks without changing source text", () => {
  assert.equal(normalizeToken("ٱلْغَنِىُّ"), normalizeToken("اَ۬لْغَنِيُّ"));
});

test("alignment exposes a Hafs-only token as a review candidate", () => {
  const hafs = [word("ٱللَّهَ", "57:24:9"), word("هُوَ", "57:24:10"), word("ٱلْغَنِىُّ", "57:24:11")];
  const warsh = [word("اَ۬للَّهَ", "57:23:8:warsh"), word("اَ۬لْغَنِيُّ", "57:23:9:warsh")];
  const result = alignWords(hafs, warsh).map((pair) => ({ ...pair, ...classify(pair) }));
  assert.equal(result[1].type, "hafs-only");
  assert.equal(result[1].hafs.text, "هُوَ");
  assert.equal(result[1].tradition, null);
});

test("alignment is lossless and preserves source order", () => {
  const hafs = [word("ا", "h:1"), word("ب", "h:2"), word("ج", "h:3")];
  const other = [word("ا", "o:1"), word("ج", "o:2"), word("د", "o:3")];
  const aligned = alignWords(hafs, other);
  assert.deepEqual(aligned.flatMap((pair) => pair.hafs ? [pair.hafs.location] : []), ["h:1", "h:2", "h:3"]);
  assert.deepEqual(aligned.flatMap((pair) => pair.tradition ? [pair.tradition.location] : []), ["o:1", "o:2", "o:3"]);
});

test("real Al-Hadid data finds Hafs 57:24:10 as Hafs-only against Warsh", () => {
  const result = generate("warsh", [57]);
  const candidate = result.candidates.find((item) => item.hafs?.location === "57:24:10");
  assert.ok(candidate);
  assert.equal(candidate.type, "hafs-only");
  assert.equal(candidate.hafs.text, "هُوَ");
  assert.equal(candidate.warsh, null);
  assert.equal(result.status, "technical-candidates-not-scholarly-certified");
});
