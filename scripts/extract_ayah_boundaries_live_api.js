#!/usr/bin/env node
// Extracts real per-ayah page-boundary tagging from quranpedia.net's LIVE
// API (quranpedia.net/api/page/<tradition>/<page>?surah=<surah>), not the
// static GitHub export used by extract_ayah_boundaries_from_svg.js.
//
// Why this exists: the static GitHub export (quranpedia/quran-svg) has a
// confirmed real gap in Hafs -- 104 ayahs across 42 surahs are untagged,
// specifically verses inside a surah's decorative title-header region (see
// docs/qirat-versification-draft.md). Checking the live site's own network
// requests (quranpedia.net/surah/1/3) showed it calls a per-(page,surah)
// API that returns the SAME missing ayahs correctly tagged -- verified
// directly: page 50 surah 3 returns ayah 1-9 (9 entries), vs only 7 (ayah
// 3-9) from the static export. The live API is a live, moving target (not
// a frozen data release), so results here are a live-verified snapshot,
// not something to assume stays fixed at these exact values forever.
//
// Usage: node scripts/extract_ayah_boundaries_live_api.js <tradition>

const fs = require("fs");
const path = require("path");

const TRADITION = process.argv[2];
if (!TRADITION) {
  console.error("Usage: node scripts/extract_ayah_boundaries_live_api.js <tradition>");
  process.exit(1);
}

const OUT_DIR = path.join(__dirname, "..", "data", "traditions");
const SURAH_JSON = path.join(OUT_DIR, `${TRADITION}_surah.json`);
const CONCURRENCY = 6;
const MAX_PAGES_PER_SURAH = 60; // Al-Baqara spans pages 2-49 (48 pages) -- 25 was too tight, verified by an undershoot on the 4 longest surahs

const PATH_RE = /<path\b[^>]*\bclass="ayahPolygon"[^>]*\/>/g;
const AYAH_ATTR_RE = /\bayah="(\d+)"/;
const SURAH_ATTR_RE = /\bsurah="(\d+)"/;

async function fetchPageForSurah(page, surah) {
  const url = `https://quranpedia.net/api/page/${TRADITION}/${page}?surah=${surah}`;
  const res = await fetch(url);
  if (!res.ok) return { page, entries: [], error: `HTTP ${res.status}` };
  const text = await res.text();
  const entries = [];
  for (const pathTag of text.match(PATH_RE) || []) {
    const ayahM = pathTag.match(AYAH_ATTR_RE);
    const surahM = pathTag.match(SURAH_ATTR_RE);
    if (ayahM && surahM && Number(surahM[1]) === surah) {
      entries.push({ ayah: Number(ayahM[1]), page });
    }
  }
  return { page, entries };
}

async function fetchSurah(s) {
  const found = new Map(); // ayah -> page
  let page = s.pageNumber;
  let pagesTried = 0;
  while (found.size < s.ayahCount && pagesTried < MAX_PAGES_PER_SURAH) {
    const { entries, error } = await fetchPageForSurah(page, s.number);
    if (error) break;
    for (const { ayah, page: p } of entries) {
      if (!found.has(ayah)) found.set(ayah, p);
    }
    page++;
    pagesTried++;
  }
  return found;
}

async function main() {
  const surahData = JSON.parse(fs.readFileSync(SURAH_JSON, "utf-8"));
  console.log(`Fetching ${TRADITION} from live API, ${surahData.length} surahs, concurrency ${CONCURRENCY}`);

  const output = { tradition: TRADITION, generatedAt: "2026-07-13", source: "quranpedia.net live API (surah/ayah tags), snapshot", surahs: {} };
  let totalAyahs = 0;
  let mismatches = [];

  for (let i = 0; i < surahData.length; i += CONCURRENCY) {
    const batch = surahData.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(fetchSurah));
    results.forEach((found, idx) => {
      const s = batch[idx];
      totalAyahs += found.size;
      if (found.size !== s.ayahCount) {
        mismatches.push(`surah ${s.number}: expected ${s.ayahCount} ayahs, extracted ${found.size}`);
      }
      output.surahs[s.number] = Array.from(found.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([ayah, page]) => ({ ayah, page }));
    });
    process.stdout.write(`\r  surah ${Math.min(i + CONCURRENCY, surahData.length)}/${surahData.length}`);
  }
  console.log();

  const outPath = path.join(OUT_DIR, `${TRADITION}-ayah-boundaries-live.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`wrote ${outPath}`);
  console.log(`total ayahs extracted: ${totalAyahs} (expected ${surahData.reduce((a, s) => a + s.ayahCount, 0)})`);
  if (mismatches.length) {
    console.log(`\n${mismatches.length} surah(s) still mismatched:`);
    mismatches.forEach((m) => console.log("  - " + m));
  } else {
    console.log("all surahs match expected ayah counts");
  }
}

main();
