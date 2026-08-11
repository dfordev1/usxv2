#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createGunzip, createGzip } from "node:zlib";
import { readFile, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "data", "alignments", "eight-riwayah-review-candidates-v1.json.gz");
const outputPath = path.join(root, "data", "review", "eight-riwayah-printed-audit-plan-v1.json.gz");
const supported = ["hafs", "warsh", "qalon", "douri", "shubah"];
const ids = Object.freeze({ hafs: "hafs-kufi", warsh: "warsh-kfqc", qalon: "qalon-kfqc", douri: "douri-kfqc", shubah: "shubah-kfqc" });
const quranSvgCommit = "5fbcb1d4d92b5a2972ab51472fe991b6066bb6e2";
const upstream = `https://raw.githubusercontent.com/quranpedia/quran-svg/${quranSvgCommit}`;

async function readGzipJson(file) {
  const chunks = [];
  const sink = new WritableStream({ write(chunk) { chunks.push(Buffer.from(chunk)); } });
  await pipeline(createReadStream(file), createGunzip(), sink);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function location(value) {
  const [surah, ayah, word] = value.split(":").map(Number);
  if (![surah, ayah, word].every(Number.isInteger)) throw new Error(`Invalid canonical location: ${value}`);
  return { surah, ayah, word };
}

const candidates = await readGzipJson(sourcePath);
const boundaries = {};
for (const tradition of supported) {
  const data = JSON.parse(await readFile(path.join(root, "data", "traditions", `${tradition}-ayah-boundaries.json`), "utf8"));
  boundaries[tradition] = new Map(Object.entries(data.surahs).flatMap(([surah, rows]) =>
    rows.map((row) => [`${surah}:${row.ayah}`, row.page])));
}

const records = candidates.slots.map((slot) => {
  const canonical = slot.canonicalLocations[0];
  const { surah, ayah, word } = location(canonical);
  const pages = Object.fromEntries(supported.map((tradition) => {
    const page = boundaries[tradition].get(`${surah}:${ayah}`) ?? null;
    return [ids[tradition], page === null ? { status: "boundary-unavailable" } : {
      status: "ready-to-fetch",
      page,
      source: `${upstream}/mushafs/${tradition}/kfqc/svg/${String(page).padStart(3, "0")}.svg`,
    }];
  }));
  return {
    id: `qusx:printed-audit:${String(slot.sequence).padStart(6, "0")}`,
    slotId: slot.id,
    canonical,
    surah,
    ayah,
    word,
    workbookClassification: slot.classification,
    readings: slot.readings,
    pages,
    status: "printed-evidence-pending",
    decision: null,
    evidence: [],
  };
});

const uniqueAyahs = new Set(records.map((record) => `${record.surah}:${record.ayah}`));
const pageCounts = Object.fromEntries(Object.values(ids).map((id) => [id,
  new Set(records.map((record) => record.pages[id].page).filter(Number.isInteger)).size]));
const missingBoundaryCounts = Object.fromEntries(Object.values(ids).map((id) => [id,
  records.filter((record) => record.pages[id].status === "boundary-unavailable").length]));
const sourceSha256 = createHash("sha256").update(await readFile(sourcePath)).digest("hex");
const output = {
  format: "qusx-printed-edition-audit-plan",
  version: "1.0.0",
  status: "complete-inventory-evidence-pending",
  limitations: "This plan locates printed-edition evidence. Automated output is not scholarly certification.",
  source: {
    path: "../alignments/eight-riwayah-review-candidates-v1.json.gz",
    sha256: sourceSha256,
    printedEditionRepository: "https://github.com/quranpedia/quran-svg",
    printedEditionCommit: quranSvgCommit,
  },
  coverage: { candidates: records.length, uniqueAyahs: uniqueAyahs.size, traditionsWithPageBoundaries: supported.length, pageCounts, missingBoundaryCounts },
  workflow: ["fetch-pinned-page", "verify-sha256", "render-ayah-crop", "compare-readings", "record-decision-or-uncertain", "manual-visual-check"],
  records,
};

const temporary = `${outputPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(output)}\n`);
await pipeline(createReadStream(temporary), createGzip({ level: 9 }), createWriteStream(outputPath));
await import("node:fs/promises").then(({ unlink }) => unlink(temporary));
console.log(`wrote ${outputPath}: ${records.length} candidates across ${uniqueAyahs.size} ayahs`);
