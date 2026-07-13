#!/usr/bin/env node
// Builds data/traditions/ayah-counts.json: verified per-surah ayah counts for
// each of the 5 KFQC reading traditions, sourced from quranpedia/quran-svg's
// surah.json files (data/traditions/<tradition>_surah.json).
//
// This is numbering data ONLY -- how many ayahs each surah has per tradition.
// It does NOT tell us where verse boundaries fall relative to the shared
// Hafs word stream (that would need the per-page json/NNN.json files, which
// have a known tagging bug -- see docs/qirat-versification-draft.md).
//
// Usage: node scripts/build_tradition_ayah_counts.js

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "data", "traditions");
const TRADITIONS = ["hafs", "warsh", "qalon", "douri", "shubah"];

// Stated in the Itqan community announcement (community.itqan.dev/d/501).
// Checked against real surah.json totals below -- Al-Duri does NOT match,
// flagged as a real discrepancy rather than silently trusted either way.
const ANNOUNCED_TOTALS = { hafs: 6236, warsh: 6214, qalon: 6214, douri: 6205, shubah: 6236 };

function loadSurah(tradition) {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${tradition}_surah.json`), "utf-8"));
}

function loadMarkers(tradition) {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${tradition}_markers.json`), "utf-8"));
}

function main() {
  const result = {
    generatedAt: "2026-07-13",
    source: "quranpedia/quran-svg (mushafs/<tradition>/kfqc/json/surah.json), CC0",
    note:
      "ayahCount per surah per tradition, verified against the announced totals. " +
      "This is numbering-only data -- does NOT establish where verse boundaries fall " +
      "relative to the shared Hafs word stream. See docs/qirat-versification-draft.md.",
    traditions: {},
    discrepancies: [],
  };

  for (const tradition of TRADITIONS) {
    const surah = loadSurah(tradition);
    const markers = loadMarkers(tradition);
    const total = surah.reduce((a, s) => a + s.ayahCount, 0);
    const announced = ANNOUNCED_TOTALS[tradition];
    const markerGap = total - markers.length;

    if (total !== announced) {
      result.discrepancies.push(
        `${tradition}: surah.json sums to ${total} ayahs, but the Itqan announcement stated ${announced}. ` +
          `Unresolved -- needs clarification from the source, not assumed correct either way.`
      );
    }
    if (markerGap !== 0) {
      result.discrepancies.push(
        `${tradition}: surah.json total (${total}) and markers.json entry count (${markers.length}) ` +
          `differ by ${markerGap}. Possibly stacked/deduped markers, not yet explained.`
      );
    }

    result.traditions[tradition] = {
      surahCount: surah.length,
      ayahTotal: total,
      announcedTotal: announced,
      markersCount: markers.length,
      perSurah: surah.map((s) => ({ surah: s.number, ayahCount: s.ayahCount, pageNumber: s.pageNumber })),
    };
  }

  const outPath = path.join(DIR, "ayah-counts.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
  console.log(`wrote ${outPath}`);
  if (result.discrepancies.length) {
    console.log("\nDiscrepancies found (not silently resolved):");
    for (const d of result.discrepancies) console.log("  - " + d);
  } else {
    console.log("no discrepancies found");
  }
}

main();
