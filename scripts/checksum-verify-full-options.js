#!/usr/bin/env node
// Supersedes the framing (not the mechanics) of src/checksum-verify.js.
//
// Investigation, 2026-07-13: the "3,040 unexplained verses" figure from the
// old checksum-verify.js / derive_standardized_plain_text.js pipeline was
// mostly a false signal. quranchecksum's manifest was built from ONE
// specific Tanzil export configuration (pause marks off, sajdah signs off,
// rub-el-hizb off, tatweel-below-superscript-alef off, sequential tanween
// off), but never recorded that in its own metadata. QUL's actual
// convention matches a DIFFERENT Tanzil export -- the one with all five of
// those display options turned ON.
//
// Verified directly (not assumed): downloaded both configurations live from
// tanzil.net's own download endpoint and diffed each against QUL's raw word
// data, character by character.
//   - Tanzil, default export (all 5 options off) + per-surah bismillah
//     attribute, hashed and compared to quranchecksum's manifest:
//     6,236 / 6,236 exact match. This *proves* the manifest itself is a
//     valid Tanzil export -- it was just a different, undocumented one.
//   - Tanzil, full-options export (all 5 options on), compared directly
//     (no normalization needed at all) to QUL's raw per-word text:
//     6,230 / 6,236 exact match -- only 6 verses genuinely differ.
//
// This script does the second comparison: it's the one that matters for
// "does QUSX's underlying text agree with an independent, canonical
// source," since it needs zero heuristic normalization to reach 99.9%.
//
// Usage: node scripts/checksum-verify-full-options.js

const fs = require("fs");
const path = require("path");

const RAW = path.join(__dirname, "..", "data", "raw");
const XML_PATH = path.join(__dirname, "..", "data", "external", "tanzil-uthmani-full-options.xml");

// The 6 verses confirmed to genuinely differ, each investigated and
// classified. Four are QUL source-data encoding anomalies (stray/missing
// spaces, a stray bidi control character) that don't change any letter of
// the text. Two (11:13, 80:25) are substantive orthographic differences --
// a different alef form -- that need upstream QUL/source verification
// before anyone "corrects" either side.
const KNOWN_RESIDUAL = {
  "5:52": { class: "formatting", note: "QUL has a stray space inside the word دَآئِرَ ةٌۭ (should be دَآئِرَةٌۭ)." },
  "11:13": {
    class: "orthographic-needs-review",
    note: "QUL: افْتَرَاهُ (plain alef + alef). Tanzil: ٱفْتَرَىٰهُ (alef wasla + alef maksura/superscript alef). Not a spacing issue -- needs upstream verification before treating either as correct.",
  },
  "11:31": { class: "formatting", note: "QUL has a doubled space before the pause mark after أَنفُسِهِمْ." },
  "18:1": { class: "formatting", note: "QUL is missing the space before the pause mark on عِوَجَا (U+06DC)." },
  "27:26": { class: "formatting", note: "QUL has a stray U+200F (right-to-left mark) after the sajdah sign." },
  "80:25": {
    class: "orthographic-needs-review",
    note: "QUL: اَنَّا (plain alef + fatha). Tanzil: أَنَّا (alef with hamza above). A different encoded letter, not a presentation choice -- needs upstream verification.",
  },
};

function decodeXmlEntities(s) {
  return s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function loadTanzilFullOptions() {
  const xml = fs.readFileSync(XML_PATH, "utf-8");
  const verses = new Map();
  let currentSura = null;
  for (const line of xml.split("\n")) {
    const sm = line.match(/<sura index="(\d+)"/);
    if (sm) currentSura = sm[1];
    const am = line.match(/<aya\s+index="(\d+)"\s+text="([^"]*)"(?:\s+bismillah="([^"]*)")?\s*\/>/);
    if (am && currentSura) {
      const [, ayaIdx, text] = am; // deliberately NOT prepending bismillah -- see module comment
      verses.set(`${currentSura}:${ayaIdx}`, decodeXmlEntities(text).normalize("NFC").trim());
    }
  }
  return verses;
}

function loadQulRaw() {
  const uthmani = JSON.parse(fs.readFileSync(path.join(RAW, "uthmani.json"), "utf-8"));
  const ARABIC_DIGIT_ONLY = /^[٠-٩]+$/;
  const byVerse = new Map();
  for (const w of Object.values(uthmani)) {
    const key = `${w.surah}:${w.ayah}`;
    if (!byVerse.has(key)) byVerse.set(key, []);
    byVerse.get(key).push(w);
  }
  for (const words of byVerse.values()) words.sort((a, b) => Number(a.word) - Number(b.word));
  const reconstructed = new Map();
  for (const [key, words] of byVerse) {
    const text = words
      .filter((w) => !ARABIC_DIGIT_ONLY.test(w.text.trim()))
      .map((w) => w.text)
      .join(" ")
      .normalize("NFC")
      .trim();
    reconstructed.set(key, text);
  }
  return reconstructed;
}

function main() {
  const tanzil = loadTanzilFullOptions();
  const qul = loadQulRaw();

  let checked = 0;
  let matched = 0;
  const mismatches = [];
  for (const [key, theirs] of tanzil) {
    const ours = qul.get(key);
    checked++;
    if (ours === undefined) {
      mismatches.push({ key, reason: "missing from QUL data" });
      continue;
    }
    if (ours === theirs) matched++;
    else mismatches.push({ key, reason: "text differs", ours, theirs });
  }

  console.log(`Compared QUL's raw Uthmani text against Tanzil's full-options export (${checked} verses).`);
  console.log(`Matched: ${matched} / ${checked}`);

  if (mismatches.length > 0) {
    console.log(`\nMismatches (${mismatches.length}):`);
    for (const m of mismatches) {
      const known = KNOWN_RESIDUAL[m.key];
      console.log(`  ${m.key}${known ? ` [${known.class}]` : " [UNCLASSIFIED -- new, investigate]"}`);
      if (known) console.log(`    ${known.note}`);
    }
    const unclassified = mismatches.filter((m) => !KNOWN_RESIDUAL[m.key]);
    if (unclassified.length > 0) {
      console.error(`\n${unclassified.length} mismatch(es) are not in the known/classified list -- this is a regression, investigate before trusting the 6,230/6,236 figure.`);
      process.exit(1);
    }
  }
  console.log("\nAll mismatches are the 6 previously-investigated, classified residual differences. No regression.");
}

main();
