#!/usr/bin/env node
// Extracts real per-ayah page-boundary tagging directly from quran-svg's SVG
// source files, bypassing the confirmed tagging bug in their per-page JSON
// export (see docs/qirat-versification-draft.md). Verified directly: SVG
// <path class="ayahPolygon" surah="S" ayah="A" .../> tags are correctly
// tagged even on pages where the JSON export is broken (e.g. page 050, 602).
//
// This gives us WHERE each tradition's ayah boundaries fall (page + order),
// not the actual word text -- word-level rasm content for non-Hafs
// traditions is still a separate, unsolved problem.
//
// Usage: node scripts/extract_ayah_boundaries_from_svg.js <tradition> [--pages=N]
// Example: node scripts/extract_ayah_boundaries_from_svg.js warsh

const fs = require("fs");
const path = require("path");

const TRADITION = process.argv[2];
if (!TRADITION) {
  console.error("Usage: node scripts/extract_ayah_boundaries_from_svg.js <tradition>");
  process.exit(1);
}

const OUT_DIR = path.join(__dirname, "..", "data", "traditions");
const SURAH_JSON = path.join(OUT_DIR, `${TRADITION}_surah.json`);

const CONCURRENCY = Number(process.env.QUSX_AUDIT_CONCURRENCY || 16);
const QURAN_SVG_COMMIT = "5fbcb1d4d92b5a2972ab51472fe991b6066bb6e2";
const REPO_BASE = `https://raw.githubusercontent.com/quranpedia/quran-svg/${QURAN_SVG_COMMIT}/mushafs/${TRADITION}/kfqc`;
const BASE = `${REPO_BASE}/svg`;

// Attribute order varies across pages/traditions -- e.g. <path id="verse-N"
// class="ayahPolygon" ... ayah="1" surah="1" .../> vs class first, vs
// surah-before-ayah. Match each <path ... class="ayahPolygon" .../> element
// as a whole, then pull ayah/surah out of it independently instead of
// assuming a fixed attribute order.
const PATH_RE = /<path\b[^>]*\bclass="ayahPolygon"[^>]*\/>/g;
const AYAH_ATTR_RE = /\bayah="(\d+)"/;
const SURAH_ATTR_RE = /\bsurah="(\d+)"/;

async function fetchPage(pageNum) {
  const url = `${BASE}/${String(pageNum).padStart(3, "0")}.svg`;
  const res = await fetch(url);
  if (!res.ok) return { pageNum, entries: [], error: `HTTP ${res.status}` };
  const text = await res.text();
  const entries = [];
  for (const pathTag of text.match(PATH_RE) || []) {
    const ayahM = pathTag.match(AYAH_ATTR_RE);
    const surahM = pathTag.match(SURAH_ATTR_RE);
    if (ayahM && surahM) {
      entries.push({ surah: Number(surahM[1]), ayah: Number(ayahM[1]) });
    }
  }
  return { pageNum, entries };
}

async function loadSurahData() {
  if (fs.existsSync(SURAH_JSON)) return JSON.parse(fs.readFileSync(SURAH_JSON, "utf-8"));
  const response = await fetch(`${REPO_BASE}/json/surah.json`);
  if (!response.ok) throw new Error(`Cannot fetch ${TRADITION} surah metadata: HTTP ${response.status}`);
  const data = await response.json();
  fs.writeFileSync(SURAH_JSON, JSON.stringify(data, null, 2) + "\n", "utf-8");
  return data;
}

async function main() {
  const surahData = await loadSurahData();
  const maxPage = Math.max(...surahData.map((s) => s.pageNumber)) + 10; // headroom past last surah's start page

  console.log(`Fetching ${TRADITION}: pages 1..${maxPage}, concurrency ${CONCURRENCY}`);

  const results = [];
  let cursor = 1;
  let errors = 0;
  while (cursor <= maxPage) {
    const batch = [];
    for (let i = 0; i < CONCURRENCY && cursor <= maxPage; i++, cursor++) batch.push(cursor);
    const pages = await Promise.all(batch.map(fetchPage));
    for (const p of pages) {
      if (p.error) errors++;
      results.push(p);
    }
    process.stdout.write(`\r  page ${cursor - 1}/${maxPage}, ${errors} errors`);
  }
  console.log();

  // Build per-surah ordered ayah->page mapping, deduped (a boundary spanning
  // two pages produces two polygon fragments with the same surah/ayah).
  const bySurah = new Map();
  for (const { pageNum, entries } of results) {
    for (const { surah, ayah } of entries) {
      if (!bySurah.has(surah)) bySurah.set(surah, new Map());
      const ayahMap = bySurah.get(surah);
      if (!ayahMap.has(ayah)) ayahMap.set(ayah, pageNum); // first page it appears on
    }
  }

  const output = { tradition: TRADITION, generatedAt: "2026-08-11", source: `quran-svg SVG files at ${QURAN_SVG_COMMIT} (surah/ayah tags), CC0`, surahs: {} };
  let totalAyahs = 0;
  let mismatches = [];
  for (const s of surahData) {
    const ayahMap = bySurah.get(s.number);
    const found = ayahMap ? ayahMap.size : 0;
    totalAyahs += found;
    if (found !== s.ayahCount) {
      mismatches.push(`surah ${s.number}: expected ${s.ayahCount} ayahs, extracted ${found}`);
    }
    output.surahs[s.number] = ayahMap
      ? Array.from(ayahMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([ayah, page]) => ({ ayah, page }))
      : [];
  }

  const outPath = path.join(OUT_DIR, `${TRADITION}-ayah-boundaries.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`wrote ${outPath}`);
  console.log(`total ayahs extracted: ${totalAyahs} (expected ${surahData.reduce((a, s) => a + s.ayahCount, 0)})`);
  if (mismatches.length) {
    console.log(`\n${mismatches.length} surah(s) with mismatched counts:`);
    mismatches.slice(0, 20).forEach((m) => console.log("  - " + m));
  } else {
    console.log("all surahs match expected ayah counts");
  }
}

main();
