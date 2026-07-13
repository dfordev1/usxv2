#!/usr/bin/env node
// Derives a "standardized plain text" layer from QUL's QPC-glyph-convention
// word text. README's Text integrity section previously described TWO
// candidate normalization rules as analysis results, never committed as
// code or actually re-verified. Re-deriving them here against a real
// Tanzil download (tanzil.net) found only ONE holds up:
//
// 1. Tatweel-spaced dagger alif (ـٰ = U+0640 U+0670, QPC glyph-font
//    convention) -> plain dagger alif alone (ٰ = U+0670). CONFIRMED:
//    diffing QUL's Al-Fatihah 1:1 ("ٱلرَّحْمَـٰنِ") against Tanzil's own
//    published text ("ٱلرَّحْمَٰنِ") -- the only difference is the tatweel.
//
// 2. ~~Wasla-alef (ٱ = U+0671) -> plain alef (ا = U+0627)~~ -- REJECTED.
//    First pass assumed this from the README's old prose without checking
//    codepoints directly, and it actively regressed the match count
//    (1125 -> 515 out of 6236). Direct codepoint check on Al-Fatihah 1:6
//    showed Tanzil's OWN text uses U+0671 (wasla-alef) too -- Tanzil does
//    NOT systematically use plain alef instead. The rule was wrong, not a
//    minor imprecision; removed rather than kept as a partial/approximate
//    rule.
//
// This is run against src/checksum-verify.js's own manifest to measure how
// many verses this one confirmed rule actually resolves -- not assumed.
//
// Usage: node scripts/derive_standardized_plain_text.js [--verify]
//   --verify: also reconstructs every verse with the normalization applied
//             and checks it against the checksum manifest, reporting the
//             real before/after match counts.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAW = path.join(__dirname, "..", "data", "raw");
const MANIFEST_PATH = path.join(__dirname, "..", "data", "external", "quran-uthmani.manifest.json");

const ARABIC_DIGIT_ONLY = /^[٠-٩]+$/;

function toStandardizedPlain(text) {
  return text.replace(/ـٰ/g, "ٰ"); // tatweel + dagger alif -> dagger alif alone (only confirmed rule)
}

function sha256(s) {
  return crypto.createHash("sha256").update(s, "utf-8").digest("hex");
}

function main() {
  const verify = process.argv.includes("--verify");
  const uthmani = JSON.parse(fs.readFileSync(path.join(RAW, "uthmani.json"), "utf-8"));

  const byVerse = new Map();
  for (const w of Object.values(uthmani)) {
    const key = `${w.surah}:${w.ayah}`;
    if (!byVerse.has(key)) byVerse.set(key, []);
    byVerse.get(key).push(w);
  }
  for (const words of byVerse.values()) words.sort((a, b) => Number(a.word) - Number(b.word));

  if (!verify) {
    // just demonstrate the transform on one verse
    const words = byVerse.get("1:1");
    const before = words
      .filter((w) => !ARABIC_DIGIT_ONLY.test(w.text.trim()))
      .map((w) => w.text)
      .join(" ");
    const after = toStandardizedPlain(before);
    console.log("before:", before);
    console.log("after: ", after);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  let checked = 0;
  let matchedBefore = 0;
  let matchedAfter = 0;
  const stillMismatched = [];

  for (const [verseKey, expectedHash] of Object.entries(manifest.verses)) {
    const words = byVerse.get(verseKey);
    if (!words) continue;
    checked++;
    const rawText = words
      .filter((w) => !ARABIC_DIGIT_ONLY.test(w.text.trim()))
      .map((w) => w.text)
      .join(" ")
      .normalize("NFC")
      .trim();
    if (sha256(rawText) === expectedHash) matchedBefore++;

    const plainText = toStandardizedPlain(rawText).normalize("NFC").trim();
    if (sha256(plainText) === expectedHash) {
      matchedAfter++;
    } else if (sha256(rawText) !== expectedHash) {
      stillMismatched.push(verseKey);
    }
  }

  console.log(`Checked ${checked} verses.`);
  console.log(`Matched before normalization: ${matchedBefore} / ${checked}`);
  console.log(`Matched after normalization:  ${matchedAfter} / ${checked}`);
  console.log(`Resolved by the two rules: ${matchedAfter - matchedBefore}`);
  console.log(`Still unexplained: ${stillMismatched.length}`);
  fs.writeFileSync(
    path.join(__dirname, "..", "data", "external", "still-unexplained-verses.json"),
    JSON.stringify(stillMismatched, null, 2) + "\n",
    "utf-8"
  );
  console.log(`Wrote list of still-unexplained verse keys to data/external/still-unexplained-verses.json`);
}

main();
