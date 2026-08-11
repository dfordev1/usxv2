#!/usr/bin/env node
/**
 * Generate technical, non-normative word-alignment candidates between Hafs
 * and a KFGQPC tradition. Verse numbers are retained as references but are
 * deliberately not used as alignment keys because verse boundaries differ.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TRADITIONS = ["warsh", "qalon", "douri", "shubah", "sousi"];
const ARABIC_NUMBER = /^[\u0660-\u0669\u06f0-\u06f9]+$/u;

function normalizeToken(value) {
  return String(value)
    .normalize("NFC")
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/gu, "")
    .replace(/[\u0640\u06de۞]/gu, "")
    .replace(/[ٱأإآ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ؤ/gu, "و")
    .replace(/ئ/gu, "ي")
    .replace(/[^\p{Script=Arabic}\p{Letter}]/gu, "");
}

function isContentToken(token) {
  const trimmed = String(token).trim();
  return trimmed && !ARABIC_NUMBER.test(trimmed) && normalizeToken(trimmed).length > 0;
}

function loadHafs() {
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "raw", "uthmani.json"), "utf8"));
  const bySurah = new Map();
  for (const record of Object.values(source)) {
    if (!isContentToken(record.text)) continue;
    const surah = Number(record.surah);
    if (!bySurah.has(surah)) bySurah.set(surah, []);
    bySurah.get(surah).push({
      surah,
      ayah: Number(record.ayah),
      word: Number(record.word),
      location: record.location,
      text: record.text,
      normalized: normalizeToken(record.text),
    });
  }
  for (const words of bySurah.values()) words.sort((a, b) => a.ayah - b.ayah || a.word - b.word);
  return bySurah;
}

function loadTradition(tradition) {
  const file = path.join(ROOT, "data", "traditions", "text", `${tradition}-text.json`);
  const source = JSON.parse(fs.readFileSync(file, "utf8"));
  const bySurah = new Map();
  for (const ayah of source) {
    const surah = Number(ayah.sura_no);
    if (!bySurah.has(surah)) bySurah.set(surah, []);
    let position = 0;
    for (const text of String(ayah.aya_text).trim().split(/\s+/u)) {
      if (!isContentToken(text)) continue;
      position += 1;
      bySurah.get(surah).push({
        surah,
        ayah: Number(ayah.aya_no),
        word: position,
        location: `${surah}:${ayah.aya_no}:${position}:${tradition}`,
        text,
        normalized: normalizeToken(text),
      });
    }
  }
  return bySurah;
}

function substitutionCost(a, b) {
  return a.normalized === b.normalized ? 0 : 1;
}

// Needleman-Wunsch edit alignment. Two rolling score rows keep memory small;
// one byte per cell retains the traceback needed for auditable output.
function alignWords(left, right) {
  const width = right.length + 1;
  const trace = new Uint8Array((left.length + 1) * width);
  let previous = new Uint32Array(width);
  let current = new Uint32Array(width);
  for (let j = 1; j < width; j++) {
    previous[j] = j;
    trace[j] = 2; // right-only
  }
  for (let i = 1; i <= left.length; i++) {
    current[0] = i;
    trace[i * width] = 1; // left-only
    for (let j = 1; j <= right.length; j++) {
      const diagonal = previous[j - 1] + substitutionCost(left[i - 1], right[j - 1]);
      const leftOnly = previous[j] + 1;
      const rightOnly = current[j - 1] + 1;
      const offset = i * width + j;
      if (diagonal <= leftOnly && diagonal <= rightOnly) {
        current[j] = diagonal;
        trace[offset] = 0;
      } else if (leftOnly <= rightOnly) {
        current[j] = leftOnly;
        trace[offset] = 1;
      } else {
        current[j] = rightOnly;
        trace[offset] = 2;
      }
    }
    [previous, current] = [current, previous];
  }

  const aligned = [];
  let i = left.length;
  let j = right.length;
  while (i > 0 || j > 0) {
    const direction = trace[i * width + j];
    if (i > 0 && j > 0 && direction === 0) {
      aligned.push({ hafs: left[--i], tradition: right[--j] });
    } else if (i > 0 && (j === 0 || direction === 1)) {
      aligned.push({ hafs: left[--i], tradition: null });
    } else {
      aligned.push({ hafs: null, tradition: right[--j] });
    }
  }
  return aligned.reverse();
}

function classify(pair) {
  if (!pair.hafs) return { type: "tradition-only", confidence: "review-required" };
  if (!pair.tradition) return { type: "hafs-only", confidence: "review-required" };
  if (pair.hafs.text.normalize("NFC") === pair.tradition.text.normalize("NFC")) {
    return { type: "exact", confidence: "high" };
  }
  if (pair.hafs.normalized === pair.tradition.normalized) {
    return { type: "orthographic-match", confidence: "high" };
  }
  return { type: "uncertain-match", confidence: "review-required" };
}

function compactPair(pair, tradition) {
  return {
    hafs: pair.hafs ? { location: pair.hafs.location, text: pair.hafs.text } : null,
    [tradition]: pair.tradition ? { location: pair.tradition.location, text: pair.tradition.text } : null,
  };
}

function generate(tradition, surahs = Array.from({ length: 114 }, (_, i) => i + 1)) {
  if (!TRADITIONS.includes(tradition)) throw new Error(`Unknown tradition: ${tradition}`);
  const hafs = loadHafs();
  const other = loadTradition(tradition);
  const candidates = [];
  const summaries = [];
  let slot = 0;

  for (const surah of surahs) {
    const left = hafs.get(surah) || [];
    const right = other.get(surah) || [];
    const pairs = alignWords(left, right);
    const counts = {};
    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
      const pair = pairs[pairIndex];
      slot += 1;
      const classification = classify(pair);
      counts[classification.type] = (counts[classification.type] || 0) + 1;
      if (classification.type !== "exact" && classification.type !== "orthographic-match") {
        candidates.push({
          slot,
          surah,
          ...classification,
          ...compactPair(pair, tradition),
          context: pairs
            .slice(Math.max(0, pairIndex - 4), pairIndex + 5)
            .map((contextPair) => compactPair(contextPair, tradition)),
        });
      }
    }
    summaries.push({ surah, hafsWords: left.length, traditionWords: right.length, alignedSlots: pairs.length, counts });
  }

  return {
    format: "qusx-candidate-alignment",
    version: 1,
    status: "technical-candidates-not-scholarly-certified",
    canonical: "hafs",
    tradition,
    normalization: "NFC; Quranic marks removed; common Arabic letter variants folded",
    summaries,
    candidates,
  };
}

function main() {
  const args = process.argv.slice(2);
  const tradition = args.find((arg) => !arg.startsWith("--"));
  const surahArg = args.find((arg) => /^--surah=/.test(arg));
  const outputArg = args.find((arg) => /^--output=/.test(arg));
  if (!tradition) throw new Error(`Usage: node ${path.basename(__filename)} <${TRADITIONS.join("|")}> [--surah=N] [--output=path]`);
  const surahs = surahArg ? [Number(surahArg.split("=")[1])] : undefined;
  if (surahs && (!Number.isInteger(surahs[0]) || surahs[0] < 1 || surahs[0] > 114)) throw new Error("--surah must be 1..114");
  const result = generate(tradition, surahs);
  const output = outputArg
    ? path.resolve(outputArg.slice("--output=".length))
    : path.join(ROOT, "data", "alignments", `${tradition}-to-hafs.candidates.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`wrote ${output}: ${result.summaries.length} surah(s), ${result.candidates.length} review candidate(s)`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { alignWords, classify, generate, loadHafs, loadTradition, normalizeToken };
