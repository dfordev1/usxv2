#!/usr/bin/env node
// Derives a "standardized plain text" layer from QUL's QPC-glyph-convention
// word text, and measures how much of the checksum-verify.js mismatch gap
// three confirmed normalization rules actually explain. README's Text
// integrity section previously described these as analysis results, never
// committed as code or actually re-verified -- this script exists so the
// numbers are reproducible, not re-asserted from memory.
//
// Confirmed rules (each verified by diffing against a real Tanzil download
// before being trusted, not assumed from the README's old prose):
//
// 1. Tatweel-spaced dagger alif (ـٰ = U+0640 U+0670, QPC glyph-font
//    convention) -> plain dagger alif alone (ٰ = U+0670).
//
// 2. Tanzil's downloaded plain-text file prepends the Bismillah to a
//    surah's first ayah (except Al-Fatihah, where it IS ayah 1, and
//    At-Tawbah, which has none) -- a download-format convention, not a
//    QPC-encoding difference.
//
// 3. Quranic annotation/pause signs (waqf marks, small high/low letters --
//    U+06D6 to U+06ED) present in QUL's text are absent from Tanzil's plain
//    download. CONFIRMED on Al-Baqarah 2:2: QUL has "ۛ" (U+06DB, small high
//    three dots) and "ۭ" (U+06ED, small low meem) that Tanzil's plain text
//    simply doesn't include.
//
// IMPORTANT: rule 3 is NOT safe to apply unconditionally -- checked
// directly and found 350 verses where stripping these marks broke an
// otherwise-correct match (Tanzil's text keeps some annotation marks in
// some verses). So this script tries raw text first, only falls back to
// normalized candidates if the raw text doesn't already match -- it never
// regresses a verse that was already correct. A rule that only works
// "on average" isn't safe to apply as a blanket transform; per-verse
// cascading is required, not optional.
//
// ~~Wasla-alef (ٱ -> ا) rule~~ -- REJECTED after direct verification: made
// the match count worse (1125 -> 515). Tanzil's own text uses wasla-alef
// (U+0671) too; it was never a real pattern.
//
// Usage: node scripts/derive_standardized_plain_text.js [--verify]
//   --verify: checks every verse against the checksum manifest using the
//             cascading rule order, reports real matched/unexplained
//             counts, and writes the still-unexplained verse list.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAW = path.join(__dirname, "..", "data", "raw");
const MANIFEST_PATH = path.join(__dirname, "..", "data", "external", "quran-uthmani.manifest.json");

const ARABIC_DIGIT_ONLY = /^[٠-٩]+$/;
const QURANIC_ANNOTATION_RE = /[ۖ-ۭ]/g; // U+06D6-U+06ED

function stripTatweelSpacer(text) {
  return text.replace(/ـٰ/g, "ٰ");
}
function stripAnnotations(text) {
  return text.replace(QURANIC_ANNOTATION_RE, "");
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

  const reconstructRaw = (words) =>
    words
      .filter((w) => !ARABIC_DIGIT_ONLY.test(w.text.trim()))
      .map((w) => w.text)
      .join(" ")
      .normalize("NFC")
      .trim();
  const bismillahText = reconstructRaw(byVerse.get("1:1"));

  // Candidate texts for a verse, in preference order -- raw first, so a
  // verse that already matches is never touched by a normalization rule.
  function candidatesFor(verseKey, rawText) {
    const [surahStr, ayahStr] = verseKey.split(":");
    const plain = stripAnnotations(stripTatweelSpacer(rawText)).normalize("NFC").trim();
    const candidates = [rawText, plain];
    if (ayahStr === "1" && surahStr !== "1" && surahStr !== "9") {
      candidates.push(stripAnnotations(stripTatweelSpacer(bismillahText + " " + rawText)).normalize("NFC").trim());
    }
    return candidates;
  }

  if (!verify) {
    const words = byVerse.get("2:2");
    const raw = reconstructRaw(words);
    console.log("raw:  ", raw);
    console.log("plain:", candidatesFor("2:2", raw)[1]);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  let checked = 0;
  let matched = 0;
  const stillMismatched = [];

  for (const [verseKey, expectedHash] of Object.entries(manifest.verses)) {
    const words = byVerse.get(verseKey);
    if (!words) continue;
    checked++;
    const rawText = reconstructRaw(words);
    const isMatch = candidatesFor(verseKey, rawText).some((c) => sha256(c) === expectedHash);
    if (isMatch) matched++;
    else stillMismatched.push(verseKey);
  }

  console.log(`Checked ${checked} verses.`);
  console.log(`Matched (raw, or via a confirmed normalization rule, cascading, never regressing): ${matched} / ${checked}`);
  console.log(`Still unexplained: ${stillMismatched.length}`);
  fs.writeFileSync(
    path.join(__dirname, "..", "data", "external", "still-unexplained-verses.json"),
    JSON.stringify(stillMismatched, null, 2) + "\n",
    "utf-8"
  );
  console.log(`Wrote list of still-unexplained verse keys to data/external/still-unexplained-verses.json`);
}

main();
