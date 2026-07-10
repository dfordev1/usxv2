#!/usr/bin/env node
// QUSX generator — reads QUL raw data and emits one QUSX XML file per surah.
// Usage: node src/generate.js [--layout=key] [surahNumber ... | all]
// Layout keys: madani-v2 (default), madani-v1, madani-v4-tajweed, qatar, indopak-15

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const RAW = path.join(__dirname, "..", "data", "raw");
const LAYOUTS_DIR = path.join(__dirname, "..", "data", "layouts");
const OUT = path.join(__dirname, "..", "output");

const LAYOUTS = {
  "madani-v2": { file: path.join(RAW, "qpc-v2-15-lines.db"), label: "KFGQPC V2 (1421H)" },
  "madani-v1": { file: path.join(LAYOUTS_DIR, "qpc-v1-15-lines.db"), label: "KFGQPC V1 (1405H)" },
  "madani-v4-tajweed": { file: path.join(LAYOUTS_DIR, "qpc-v4-tajweed-15-lines.db"), label: "QPC V4 Tajweed (1441H)" },
  qatar: { file: path.join(LAYOUTS_DIR, "mushaf-qatar-layout.db"), label: "Mushaf Qatar" },
  "indopak-15": { file: path.join(LAYOUTS_DIR, "qudratullah-indopak-15-lines.db"), label: "IndoPak 15-line (Qudratullah)" },
};

function loadJSON(name) {
  return JSON.parse(fs.readFileSync(path.join(RAW, name), "utf-8"));
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- load source data -------------------------------------------------

const uthmani = loadJSON("uthmani.json");        // "s:a:w" -> {id, surah, ayah, word, text}
const ayahMeta = loadJSON("quran-metadata-ayah.json");     // "1".."6236" -> {surah_number, ayah_number, verse_key, words_count, text}
const surahNames = loadJSON("quran-metadata-surah-name.json"); // "1".."114" -> {name, name_arabic, ...}
const juzMeta = loadJSON("quran-metadata-juz.json");
const hizbMeta = loadJSON("quran-metadata-hizb.json");
const rubMeta = loadJSON("quran-metadata-rub.json");
const manzilMeta = loadJSON("quran-metadata-manzil.json");
const sajdaMeta = loadJSON("quran-metadata-sajda.json");

const rootDb = new DatabaseSync(path.join(RAW, "word-root.db"), { readOnly: true });
const stemDb = new DatabaseSync(path.join(RAW, "word-stem.db"), { readOnly: true });
const lemmaDb = new DatabaseSync(path.join(RAW, "word-lemma.db"), { readOnly: true });

// ---- build lookup indexes ----------------------------------------------

// words in mushaf order, with global id
const words = Object.values(uthmani)
  .map((w) => ({
    id: w.id,
    surah: Number(w.surah),
    ayah: Number(w.ayah),
    word: Number(w.word),
    text: w.text,
  }))
  .sort((a, b) => a.id - b.id);

const wordsBySurah = new Map();
for (const w of words) {
  if (!wordsBySurah.has(w.surah)) wordsBySurah.set(w.surah, []);
  wordsBySurah.get(w.surah).push(w);
}

// ayah boundaries: verse_key -> {surah, ayah, words_count}
const ayahByKey = new Map();
for (const rec of Object.values(ayahMeta)) {
  ayahByKey.set(rec.verse_key, rec);
}

// page/line layout: global word id -> {page, line}. Built per-layout at generation
// time (see buildWordLocation) since different print editions place words on
// different pages/lines — sometimes even a different total page count (e.g.
// IndoPak layouts run 610 pages, not 604).
function buildWordLocation(layoutDbPath) {
  const db = new DatabaseSync(layoutDbPath, { readOnly: true });
  const info = db.prepare("SELECT * FROM info").get();
  const pageRows = db.prepare("SELECT * FROM pages ORDER BY page_number, line_number").all();
  const wordLocation = new Map();
  for (const row of pageRows) {
    if (row.line_type !== "ayah" || row.first_word_id === "" || row.last_word_id === "") continue;
    for (let wid = row.first_word_id; wid <= row.last_word_id; wid++) {
      wordLocation.set(wid, { page: row.page_number, line: row.line_number });
    }
  }
  db.close();
  return { wordLocation, info };
}

// juz/hizb/rub/manzil boundaries per surah: surah -> [{number, startAyah, endAyah}]
function buildRangeIndex(meta, numberField) {
  const index = new Map(); // surah -> [{number, start, end}]
  for (const rec of Object.values(meta)) {
    for (const [surahStr, range] of Object.entries(rec.verse_mapping)) {
      const surah = Number(surahStr);
      const [start, end] = range.split("-").map(Number);
      if (!index.has(surah)) index.set(surah, []);
      index.get(surah).push({ number: rec[numberField], start, end });
    }
  }
  return index;
}
const juzIndex = buildRangeIndex(juzMeta, "juz_number");
const hizbIndex = buildRangeIndex(hizbMeta, "hizb_number");
const rubIndex = buildRangeIndex(rubMeta, "rub_number");
const manzilIndex = buildRangeIndex(manzilMeta, "manzil_number");

// sajda: verse_key -> {sajdah_number, sajdah_type}
const sajdaByKey = new Map();
for (const rec of Object.values(sajdaMeta)) {
  sajdaByKey.set(rec.verse_key, rec);
}

// word embeds: word_location "s:a:w" -> root/stem/lemma text
function buildWordEmbedIndex(db, groupTable, wordTable, groupIdCol, textCol) {
  const groups = new Map();
  for (const row of db.prepare(`SELECT id, ${textCol} FROM ${groupTable}`).all()) {
    groups.set(row.id, row[textCol]);
  }
  const index = new Map();
  for (const row of db.prepare(`SELECT ${groupIdCol}, word_location FROM ${wordTable}`).all()) {
    index.set(row.word_location, groups.get(row[groupIdCol]));
  }
  return index;
}
const rootIndex = buildWordEmbedIndex(rootDb, "roots", "root_words", "root_id", "arabic_trilateral");
const stemIndex = buildWordEmbedIndex(stemDb, "stems", "stem_words", "stem_id", "text");
const lemmaIndex = buildWordEmbedIndex(lemmaDb, "lemmas", "lemma_words", "lemma_id", "text");

// ---- QUSX generation -----------------------------------------------------

function findRange(index, surah, ayah) {
  const ranges = index.get(surah) || [];
  for (const r of ranges) {
    if (ayah >= r.start && ayah <= r.end) return r;
  }
  return null;
}

function generateSurah(surahNumber, wordLocation, layoutLabel) {
  const surahWords = wordsBySurah.get(surahNumber);
  if (!surahWords) throw new Error("No words found for surah " + surahNumber);

  const surahName = surahNames[String(surahNumber)];
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<qusx version="0.1" surah="${surahNumber}" name="${xmlEscape(
      surahName.name_simple
    )}" nameArabic="${xmlEscape(surahName.name_arabic)}" ayahCount="${surahName.verses_count}" ` +
      `revelationPlace="${surahName.revelation_place}" bismillahPre="${surahName.bismillah_pre}" ` +
      `tradition="hafs-kufi" layout="${xmlEscape(layoutLabel)}">`
  );

  let openAyah = null;
  let openPage = null;
  let openLine = null;
  let openJuz = null;
  let openHizb = null;
  let openRub = null;
  let openManzil = null;

  function closeIfOpen(tag, state) {
    if (state) lines.push(`  <${tag} eid="${state}"/>`);
  }

  for (let i = 0; i < surahWords.length; i++) {
    const w = surahWords[i];
    const verseKey = `${w.surah}:${w.ayah}`;
    const loc = wordLocation.get(w.id);
    const juzR = findRange(juzIndex, w.surah, w.ayah);
    const hizbR = findRange(hizbIndex, w.surah, w.ayah);
    const rubR = findRange(rubIndex, w.surah, w.ayah);
    const manzilR = findRange(manzilIndex, w.surah, w.ayah);

    // open/close juz/hizb/rub/manzil pins (coarse-to-fine order)
    const juzId = juzR ? `juz:${juzR.number}` : null;
    if (juzId !== openJuz) {
      closeIfOpen("juz", openJuz);
      if (juzId) lines.push(`  <juz number="${juzR.number}" sid="${juzId}"/>`);
      openJuz = juzId;
    }
    const manzilId = manzilR ? `manzil:${manzilR.number}` : null;
    if (manzilId !== openManzil) {
      closeIfOpen("manzil", openManzil);
      if (manzilId) lines.push(`  <manzil number="${manzilR.number}" sid="${manzilId}"/>`);
      openManzil = manzilId;
    }
    const hizbId = hizbR ? `hizb:${hizbR.number}` : null;
    if (hizbId !== openHizb) {
      closeIfOpen("hizb", openHizb);
      if (hizbId) lines.push(`  <hizb number="${hizbR.number}" sid="${hizbId}"/>`);
      openHizb = hizbId;
    }
    const rubId = rubR ? `rub:${rubR.number}` : null;
    if (rubId !== openRub) {
      closeIfOpen("rub", openRub);
      if (rubId) lines.push(`  <rub number="${rubR.number}" sid="${rubId}"/>`);
      openRub = rubId;
    }

    // page/line pins
    if (loc) {
      const pageId = `page:${loc.page}`;
      if (pageId !== openPage) {
        closeIfOpen("page", openPage);
        lines.push(`  <page number="${loc.page}" sid="${pageId}"/>`);
        openPage = pageId;
      }
      const lineId = `page:${loc.page}:line:${loc.line}`;
      if (lineId !== openLine) {
        closeIfOpen("line", openLine);
        lines.push(`  <line number="${loc.line}" sid="${lineId}"/>`);
        openLine = lineId;
      }
    }

    // ayah pin
    const ayahId = `${verseKey}:hafs-kufi`;
    if (ayahId !== openAyah) {
      closeIfOpen("ayah", openAyah);
      lines.push(`  <ayah number="${w.ayah}" tradition="hafs-kufi" sid="${ayahId}"/>`);
      openAyah = ayahId;
    }

    // word with embeds
    const wordLocKey = `${w.surah}:${w.ayah}:${w.word}`;
    const root = rootIndex.get(wordLocKey);
    const stem = stemIndex.get(wordLocKey);
    const lemma = lemmaIndex.get(wordLocKey);
    const attrs = [`id="${w.id}"`, `position="${w.word}"`];
    if (root) attrs.push(`root="${xmlEscape(root)}"`);
    if (stem) attrs.push(`stem="${xmlEscape(stem)}"`);
    if (lemma) attrs.push(`lemma="${xmlEscape(lemma)}"`);
    lines.push(`  <word ${attrs.join(" ")}>${xmlEscape(w.text)}</word>`);

    // sajda marker (fires at end of the ayah that contains a sajda point)
    const sajda = sajdaByKey.get(verseKey);
    const isLastWordOfAyah = i + 1 >= surahWords.length || surahWords[i + 1].ayah !== w.ayah;
    if (sajda && isLastWordOfAyah) {
      lines.push(
        `  <sajda number="${sajda.sajdah_number}" type="${sajda.sajdah_type}" verseKey="${verseKey}"/>`
      );
    }
  }

  closeIfOpen("ayah", openAyah);
  closeIfOpen("line", openLine);
  closeIfOpen("page", openPage);
  closeIfOpen("rub", openRub);
  closeIfOpen("hizb", openHizb);
  closeIfOpen("manzil", openManzil);
  closeIfOpen("juz", openJuz);

  lines.push("</qusx>");
  return lines.join("\n");
}

// ---- CLI ------------------------------------------------------------------

function main() {
  const rawArgs = process.argv.slice(2);

  let layoutKey = "madani-v2";
  const args = [];
  for (const a of rawArgs) {
    const m = a.match(/^--layout=(.+)$/);
    if (m) layoutKey = m[1];
    else args.push(a);
  }

  const layout = LAYOUTS[layoutKey];
  if (!layout) {
    console.error(`Unknown layout "${layoutKey}". Available: ${Object.keys(LAYOUTS).join(", ")}`);
    process.exit(1);
  }
  if (!fs.existsSync(layout.file)) {
    console.error(`Layout database not found: ${layout.file}`);
    process.exit(1);
  }

  const { wordLocation, info } = buildWordLocation(layout.file);
  const outDir = path.join(OUT, layoutKey);
  fs.mkdirSync(outDir, { recursive: true });

  let targets;
  if (args.length === 0 || args[0] === "all") {
    targets = Array.from({ length: 114 }, (_, i) => i + 1);
  } else {
    targets = args.map(Number);
  }

  console.log(`Layout: ${layout.label} (${info.number_of_pages} pages, ${info.lines_per_page} lines/page)`);

  for (const surahNumber of targets) {
    const xml = generateSurah(surahNumber, wordLocation, layout.label);
    const outPath = path.join(outDir, `${String(surahNumber).padStart(3, "0")}.qusx.xml`);
    fs.writeFileSync(outPath, xml, "utf-8");
    console.log("wrote " + outPath + " (" + xml.length + " bytes)");
  }
}

main();
