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
const CORRECTIONS_PATH = path.join(__dirname, "..", "data", "external", "qul-text-corrections.json");

// Of the 6 verses confirmed to genuinely differ (investigated 2026-07-13,
// corroborated against Tanzil AND the live quran.com v4 API -- both agree
// with each other on all 6), 4 are formatting anomalies (stray/missing
// whitespace, a stray bidi control character) that don't change any letter
// of the text. Those 4 are corrected ONLY in this comparison layer, via
// data/external/qul-text-corrections.json -- data/raw/uthmani.json itself
// (third-party licensed source data, see data/LICENSES.md) is never
// touched. The remaining 2 (11:13, 80:25) change an encoded letter, not
// just spacing, and are deliberately left unresolved pending an upstream
// QUL decision -- see data/external/qul-orthographic-review.md.
const KNOWN_RESIDUAL = {
  "11:13": {
    class: "orthographic-needs-review",
    note: "QUL: افْتَرَاهُ (plain alef + alef). Tanzil AND quran.com both have ٱفْتَرَىٰهُ (alef wasla + alef maksura/superscript alef). Not a spacing issue -- two independent platforms agree against QUL, suggesting a real QUL defect, but not auto-corrected here; see data/external/qul-orthographic-review.md.",
  },
  "80:25": {
    class: "orthographic-needs-review",
    note: "QUL: اَنَّا (plain alef + fatha). Tanzil AND quran.com both have أَنَّا (alef with hamza above). A different encoded letter, not a presentation choice -- two independent platforms agree against QUL, suggesting a real QUL defect, but not auto-corrected here; see data/external/qul-orthographic-review.md.",
  },
};

function loadCorrections() {
  const doc = JSON.parse(fs.readFileSync(CORRECTIONS_PATH, "utf-8"));
  return doc.corrections;
}

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

// Applies the 4 formatting corrections to a comparison-layer copy of the
// text, and sanity-checks that each correction's recorded `rawText` still
// matches what's actually in data/raw/uthmani.json today -- if the source
// data has since changed underneath a correction, that correction is no
// longer trustworthy and must be re-investigated, not silently applied.
function applyCorrections(qulRaw, corrections) {
  const corrected = new Map(qulRaw);
  const staleCorrections = [];
  for (const [key, c] of Object.entries(corrections)) {
    const current = qulRaw.get(key);
    if (current !== c.rawText) {
      staleCorrections.push(key);
      continue;
    }
    corrected.set(key, c.correctedText);
  }
  return { corrected, staleCorrections };
}

function run(label, tanzil, qul, { failOnUnclassified }) {
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

  console.log(`\n[${label}] Matched: ${matched} / ${checked}`);
  if (mismatches.length > 0) {
    console.log(`Mismatches (${mismatches.length}):`);
    for (const m of mismatches) {
      const known = KNOWN_RESIDUAL[m.key];
      console.log(`  ${m.key}${known ? ` [${known.class}]` : " [UNCLASSIFIED]"}`);
      if (known) console.log(`    ${known.note}`);
    }
  }
  if (failOnUnclassified) {
    const unclassified = mismatches.filter((m) => !KNOWN_RESIDUAL[m.key]);
    if (unclassified.length > 0) {
      console.error(
        `\n${unclassified.length} mismatch(es) are not in the known/classified residual list -- this is a ` +
          `regression (a previously-resolved verse broke again, or a genuinely new divergence appeared). ` +
          `Investigate before trusting this figure; do not add to KNOWN_RESIDUAL without documenting why.`
      );
      process.exit(1);
    }
  }
  return { matched, checked, mismatches };
}

function main() {
  const tanzil = loadTanzilFullOptions();
  const qulRaw = loadQulRaw();
  const corrections = loadCorrections();

  console.log("Compared QUL's Uthmani text against Tanzil's full-options export (6,236 verses).");
  console.log("This preserves QUL's original per-word text unmodified -- see data/raw/uthmani.json, untouched.");

  run("raw QUL text, no corrections (historical figure)", tanzil, qulRaw, { failOnUnclassified: false });

  const { corrected, staleCorrections } = applyCorrections(qulRaw, corrections);
  if (staleCorrections.length > 0) {
    console.error(
      `\n${staleCorrections.length} correction(s) in data/external/qul-text-corrections.json no longer match ` +
        `the current source text: ${staleCorrections.join(", ")}. The source data changed since the correction ` +
        `was recorded -- re-investigate before trusting the corrected comparison.`
    );
    process.exit(1);
  }
  const result = run("with the 4 formatting corrections applied (comparison layer only)", tanzil, corrected, {
    failOnUnclassified: true,
  });

  const expectedMatched = 6236 - Object.keys(KNOWN_RESIDUAL).length;
  if (result.matched !== expectedMatched) {
    console.error(
      `\nExpected exactly ${expectedMatched} matches (6,236 minus the ${Object.keys(KNOWN_RESIDUAL).length} ` +
        `documented residual verses) but got ${result.matched}. The residual set changed without an explicit ` +
        `update to KNOWN_RESIDUAL and this script's documentation -- investigate before trusting this figure.`
    );
    process.exit(1);
  }

  console.log(
    `\nFinal: ${result.matched} / 6,236 matched. Remaining ${Object.keys(KNOWN_RESIDUAL).length} residual ` +
      `verses are the orthographic differences pending upstream review -- see data/external/qul-orthographic-review.md.`
  );
}

main();
