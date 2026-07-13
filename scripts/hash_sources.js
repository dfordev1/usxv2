#!/usr/bin/env node
// Records SHA-256 hashes of every bundled source-data file (audit item #4).
// THIRD_PARTY_NOTICES.md itself noted source-file integrity was unrecorded;
// this closes that. Writes data/SOURCE_HASHES.json -- a machine-readable
// manifest so a consumer (or a future us) can confirm a bundled input hasn't
// silently changed, and CI can fail if it does.
//
// Covers the raw QUL inputs, layout DBs, and the third-party tradition data
// under data/traditions/ (both the downloaded *_surah.json/*_markers.json
// and the third-party text under data/traditions/text/). Deliberately does
// NOT hash files THIS project generates (ayah-counts.json, *-ayah-boundaries
// .json) -- those are outputs, covered by their own regeneration checks.
//
// Usage:
//   node scripts/hash_sources.js            # verify against the committed manifest
//   node scripts/hash_sources.js --update   # regenerate the manifest

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "data", "SOURCE_HASHES.json");

// Directories/globs whose files are BUNDLED SOURCE inputs (not generated).
const SOURCE_DIRS = [
  "data/raw",
  "data/layouts",
  "data/traditions/text",
  "data/external",
];
// Individual downloaded (not generated) files under data/traditions/.
const SOURCE_FILE_SUFFIXES = ["_surah.json", "_markers.json"];
// Files under the SOURCE_DIRS that are actually THIS project's outputs, not sources.
const GENERATED_EXCLUDE = new Set([
  "data/external/still-unexplained-verses.json",
  "data/external/checksum-baseline.json",
]);

function sha256File(absPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absPath)).digest("hex");
}

function collectSourceFiles() {
  const rels = [];
  for (const dir of SOURCE_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      const rel = `${dir}/${name}`.replace(/\\/g, "/");
      if (!fs.statSync(path.join(abs, name)).isFile()) continue;
      if (GENERATED_EXCLUDE.has(rel)) continue;
      rels.push(rel);
    }
  }
  const traditionsDir = path.join(ROOT, "data", "traditions");
  if (fs.existsSync(traditionsDir)) {
    for (const name of fs.readdirSync(traditionsDir)) {
      if (SOURCE_FILE_SUFFIXES.some((suf) => name.endsWith(suf))) {
        rels.push(`data/traditions/${name}`);
      }
    }
  }
  return rels.sort();
}

function buildManifest() {
  const files = {};
  for (const rel of collectSourceFiles()) {
    files[rel] = sha256File(path.join(ROOT, rel));
  }
  return { algorithm: "sha256", files };
}

function main() {
  const update = process.argv.includes("--update");
  const current = buildManifest();

  if (update) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(current, null, 2) + "\n", "utf-8");
    console.log(`Wrote ${Object.keys(current.files).length} source hashes to data/SOURCE_HASHES.json`);
    return;
  }

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("No data/SOURCE_HASHES.json. Run with --update to create it.");
    process.exit(1);
  }
  const committed = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));

  const problems = [];
  for (const [rel, hash] of Object.entries(current.files)) {
    if (!(rel in committed.files)) problems.push(`new source file not in manifest: ${rel}`);
    else if (committed.files[rel] !== hash) problems.push(`hash CHANGED: ${rel}`);
  }
  for (const rel of Object.keys(committed.files)) {
    if (!(rel in current.files)) problems.push(`source file missing (in manifest, not on disk): ${rel}`);
  }

  if (problems.length) {
    console.error("Source-data integrity check FAILED:");
    for (const p of problems) console.error("  - " + p);
    console.error("If a source was intentionally updated, run: node scripts/hash_sources.js --update");
    process.exit(1);
  }
  console.log(`Source-data integrity OK: ${Object.keys(current.files).length} files match data/SOURCE_HASHES.json`);
}

main();
