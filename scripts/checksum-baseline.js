#!/usr/bin/env node
// Text-integrity baseline gate for CI (audit item #73).
//
// The old CI step ran `checksum-verify.js || true`, which can NEVER fail --
// a silent regression in the text, the reconstruction logic, or the manifest
// would go completely unnoticed. This replaces that with a real gate:
//
//   - It runs the same checksum comparison, but instead of failing on ANY
//     mismatch (which would fail forever, since 4,111 verses legitimately
//     differ by documented encoding conventions -- see README Text integrity),
//     it fails only if the byte-for-byte match count drops BELOW a committed,
//     reviewed baseline.
//   - A change that IMPROVES the match count updates the baseline (with a
//     clear message telling the committer to commit the new baseline), so
//     progress is recorded, not silently absorbed.
//
// This makes the honest partial-match state (1,125/6,236) a tracked number
// that can only move in the reviewed direction, rather than an ignored one.
//
// Usage:
//   node scripts/checksum-baseline.js            # fail if below baseline
//   node scripts/checksum-baseline.js --update   # write current count as baseline

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAW = path.join(__dirname, "..", "data", "raw");
const MANIFEST_PATH = path.join(__dirname, "..", "data", "external", "quran-uthmani.manifest.json");
const BASELINE_PATH = path.join(__dirname, "..", "data", "external", "checksum-baseline.json");

const ARABIC_DIGIT_ONLY = /^[٠-٩]+$/;

function sha256(s) {
  return crypto.createHash("sha256").update(s, "utf-8").digest("hex");
}

function currentMatchCount() {
  const uthmani = JSON.parse(fs.readFileSync(path.join(RAW, "uthmani.json"), "utf-8"));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));

  const byVerse = new Map();
  for (const w of Object.values(uthmani)) {
    const key = `${w.surah}:${w.ayah}`;
    if (!byVerse.has(key)) byVerse.set(key, []);
    byVerse.get(key).push(w);
  }
  for (const words of byVerse.values()) words.sort((a, b) => Number(a.word) - Number(b.word));

  let matched = 0;
  let checked = 0;
  for (const [verseKey, expectedHash] of Object.entries(manifest.verses)) {
    const words = byVerse.get(verseKey);
    if (!words) continue;
    checked++;
    const text = words
      .filter((w) => !ARABIC_DIGIT_ONLY.test(w.text.trim()))
      .map((w) => w.text)
      .join(" ")
      .normalize("NFC")
      .trim();
    if (sha256(text) === expectedHash) matched++;
  }
  return { matched, checked };
}

function main() {
  const { matched, checked } = currentMatchCount();
  const update = process.argv.includes("--update");

  if (update) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify({ matched, checked }, null, 2) + "\n", "utf-8");
    console.log(`Wrote baseline: ${matched} / ${checked} matched.`);
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`No baseline file at ${BASELINE_PATH}. Run with --update to create one.`);
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8"));

  console.log(`Byte-for-byte matches: ${matched} / ${checked} (baseline: ${baseline.matched} / ${baseline.checked})`);

  if (matched < baseline.matched) {
    console.error(
      `::error::Text-integrity REGRESSION: match count dropped from ${baseline.matched} to ${matched}. ` +
        `Something changed the text, the reconstruction, or the manifest for the worse -- investigate before merging.`
    );
    process.exit(1);
  }
  if (matched > baseline.matched) {
    console.log(
      `Match count IMPROVED from ${baseline.matched} to ${matched}. ` +
        `Run 'node scripts/checksum-baseline.js --update' and commit data/external/checksum-baseline.json to record it.`
    );
    // An improvement is not a failure, but the baseline should be updated so
    // the gain becomes the new floor. CI stays green; the message is the nudge.
  }
  process.exit(0);
}

main();
