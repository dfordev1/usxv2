#!/usr/bin/env node
// Verifies QUSX's underlying Uthmani text against the verse-level SHA-256
// manifest from https://github.com/spqrxi/quranchecksum — an independent,
// MIT-licensed integrity check built from Tanzil's KFGQPC-verified text.
//
// This checks something structural validation can't: whether the *content*
// of our word stream (not just its shape) matches a widely-trusted source,
// verse by verse.
//
// Usage: node src/checksum-verify.js

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAW = path.join(__dirname, "..", "data", "raw");
const MANIFEST_PATH = path.join(__dirname, "..", "data", "external", "quran-uthmani.manifest.json");

const uthmani = JSON.parse(fs.readFileSync(path.join(RAW, "uthmani.json"), "utf-8"));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));

// Arabic-Indic digits (ayah-ending verse number tokens) — Tanzil's per-verse
// text does not include the trailing verse number, but QUL's word stream
// stores it as a final "word" token. Strip it before reconstructing the verse.
const ARABIC_DIGIT_ONLY = /^[٠-٩]+$/;

// group words by verse key, in word order
const byVerse = new Map();
for (const w of Object.values(uthmani)) {
  const key = `${w.surah}:${w.ayah}`;
  if (!byVerse.has(key)) byVerse.set(key, []);
  byVerse.get(key).push(w);
}
for (const words of byVerse.values()) words.sort((a, b) => Number(a.word) - Number(b.word));

function reconstructVerse(words) {
  const filtered = words.filter((w) => !ARABIC_DIGIT_ONLY.test(w.text.trim()));
  return filtered.map((w) => w.text).join(" ").normalize("NFC").trim();
}

function sha256(s) {
  return crypto.createHash("sha256").update(s, "utf-8").digest("hex");
}

let checked = 0;
let matched = 0;
const mismatches = [];

for (const [verseKey, expectedHash] of Object.entries(manifest.verses)) {
  const words = byVerse.get(verseKey);
  checked++;
  if (!words) {
    mismatches.push({ verseKey, reason: "missing from QUL data" });
    continue;
  }
  const text = reconstructVerse(words);
  const actualHash = sha256(text);
  if (actualHash === expectedHash) {
    matched++;
  } else {
    mismatches.push({ verseKey, reason: "hash mismatch", text, expectedHash, actualHash });
  }
}

console.log(`Manifest: ${manifest.meta.source}, ${manifest.meta.verse_count} verses, generated ${manifest.meta.generated_at}`);
console.log(`Checked ${checked} verses from QUL Uthmani word data.`);
console.log(`Matched: ${matched} / ${checked}`);

if (mismatches.length > 0) {
  console.log(`\nMismatches (${mismatches.length}), first 10:`);
  for (const m of mismatches.slice(0, 10)) {
    console.log(JSON.stringify(m, null, 2));
  }
  process.exit(1);
} else {
  console.log("\nAll verses match. QUL's Uthmani text is byte-identical (post-NFC) to Tanzil's KFGQPC-verified source.");
  process.exit(0);
}
