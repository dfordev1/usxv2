#!/usr/bin/env node
// PILOT / EXPERIMENTAL generator for non-Hafs traditions. Deliberately
// separate from src/generate.js, which is tightly coupled to Hafs word-by-word
// data (juz/hizb/rub/manzil/ruku indices are all keyed to Hafs verse
// numbering as canonical) -- reusing it directly for a different tradition's
// own text/numbering would be unsafe without a real redesign.
//
// This script only proves the pin model works end-to-end for a non-Hafs
// tradition. It deliberately does NOT attempt: root/stem/lemma (we have none
// for these traditions), juz/hizb/rub/manzil/ruku pins (would need those
// ranges re-derived against this tradition's own numbering, not done), or
// page/line pins (this text source's own page numbers haven't been
// validated as a coherent layout -- see caveats in THIRD_PARTY_NOTICES.md).
//
// Usage: node scripts/generate_tradition_pilot.js <tradition> <surahNumber|all>
// Example: node scripts/generate_tradition_pilot.js warsh 1
//          node scripts/generate_tradition_pilot.js warsh all

const fs = require("fs");
const path = require("path");

// Surah name, revelation place, and bismillah presence are facts about the
// surah itself, not the reading tradition -- reusing the canonical
// Hafs-sourced metadata for these is correct, not a Hafs-only shortcut. Only
// ayah text/count/numbering actually varies by tradition.
const surahNames = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "raw", "quran-metadata-surah-name.json"), "utf-8")
);

const TRADITION = process.argv[2];
const SURAH_ARG = process.argv[3];
if (!TRADITION || !SURAH_ARG) {
  console.error("Usage: node scripts/generate_tradition_pilot.js <tradition> <surahNumber|all>");
  process.exit(1);
}

const TRADITION_LABELS = {
  warsh: "warsh-kfqc",
  qalon: "qalon-kfqc",
  douri: "douri-kfqc",
  shubah: "shubah-kfqc",
  sousi: "sousi-kfqc",
};
const traditionId = TRADITION_LABELS[TRADITION];
if (!traditionId) {
  console.error(`Unknown tradition "${TRADITION}". Available: ${Object.keys(TRADITION_LABELS).join(", ")}`);
  process.exit(1);
}

const TEXT_DIR = path.join(__dirname, "..", "data", "traditions", "text");
const OUT_DIR = path.join(__dirname, "..", "output-pilot", TRADITION);

const GENERATOR_VERSION = require("../package.json").version;

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function normalize(s) {
  return String(s).normalize("NFC");
}
const ARABIC_DIGIT_ONLY = /^[٠-٩]+$/;

function generateOne(allAyahs, surahNumber) {
  const surahAyahs = allAyahs.filter((e) => e.sura_no === surahNumber).sort((a, b) => a.aya_no - b.aya_no);
  if (surahAyahs.length === 0) throw new Error(`No ayahs found for surah ${surahNumber}`);

  const canonical = surahNames[String(surahNumber)];
  if (!canonical) throw new Error(`No canonical surah metadata found for surah ${surahNumber}`);

  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<qusx version="0.1" surah="${surahNumber}" name="${xmlEscape(normalize(canonical.name_simple))}" ` +
      `nameArabic="${xmlEscape(normalize(canonical.name_arabic))}" ` +
      `ayahCount="${surahAyahs.length}" revelationPlace="${canonical.revelation_place}" ` +
      `bismillahPre="${canonical.bismillah_pre}" tradition="${traditionId}" ` +
      `generatorVersion="${GENERATOR_VERSION}" normalization="NFC">`
  );

  let wordIdCounter = 1;
  for (const ayahRec of surahAyahs) {
    const verseKey = `${surahNumber}:${ayahRec.aya_no}`;
    const ayahSid = `${verseKey}:${traditionId}`;
    lines.push(`  <ayah number="${ayahRec.aya_no}" tradition="${traditionId}" sid="${ayahSid}"/>`);

    const rawWords = ayahRec.aya_text.trim().split(/\s+/);
    if (rawWords.length === 0 || rawWords.some((w) => w.length === 0)) {
      throw new Error(`surah ${surahNumber} ayah ${ayahRec.aya_no}: empty/malformed word split from "${ayahRec.aya_text}"`);
    }
    rawWords.forEach((rawWord, position) => {
      const wordText = normalize(rawWord);
      const isNumber = ARABIC_DIGIT_ONLY.test(wordText.trim());
      const attrs = [`id="${wordIdCounter++}"`, `position="${position + 1}"`];
      if (isNumber) attrs.push(`type="number"`);
      lines.push(`  <word ${attrs.join(" ")}>${xmlEscape(wordText)}</word>`);
    });

    lines.push(`  <ayah eid="${ayahSid}"/>`);
  }

  lines.push("</qusx>");
  const xml = lines.join("\n");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${String(surahNumber).padStart(3, "0")}.qusx.xml`);
  fs.writeFileSync(outPath, xml, "utf-8");
  return { outPath, bytes: xml.length, ayahCount: surahAyahs.length, wordCount: wordIdCounter - 1 };
}

function main() {
  const textFile = path.join(TEXT_DIR, `${TRADITION}-text.json`);
  const allAyahs = JSON.parse(fs.readFileSync(textFile, "utf-8"));

  const targets = SURAH_ARG === "all" ? Array.from({ length: 114 }, (_, i) => i + 1) : [Number(SURAH_ARG)];

  let succeeded = 0;
  const failures = [];
  for (const surahNumber of targets) {
    try {
      const r = generateOne(allAyahs, surahNumber);
      succeeded++;
      if (targets.length === 1) {
        console.log(`wrote ${r.outPath} (${r.bytes} bytes, ${r.ayahCount} ayahs, ${r.wordCount} words)`);
      }
    } catch (e) {
      failures.push({ surahNumber, error: e.message });
    }
  }

  if (targets.length > 1) {
    console.log(`${TRADITION}: ${succeeded}/${targets.length} surahs generated successfully`);
  }
  if (failures.length > 0) {
    console.log(`\n${failures.length} failure(s), NOT silently skipped:`);
    for (const f of failures) console.log(`  - surah ${f.surahNumber}: ${f.error}`);
    process.exitCode = 1;
  }
}

main();
