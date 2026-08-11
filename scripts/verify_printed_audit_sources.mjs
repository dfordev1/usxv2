#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createGunzip, createGzip } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const planPath = path.join(root, "data", "review", "eight-riwayah-printed-audit-plan-v1.json.gz");
const outputPath = path.join(root, "data", "review", "eight-riwayah-printed-source-audit-v1.json.gz");
const concurrency = Number(process.env.QUSX_AUDIT_CONCURRENCY ?? 12);

async function readGzipJson(file) {
  const chunks = [];
  for await (const chunk of createReadStream(file).pipe(createGunzip())) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const plan = await readGzipJson(planPath);
let previous = null;
try {
  previous = await readGzipJson(outputPath);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const verifiedCache = new Map((previous?.pages ?? [])
  .filter((page) => page.status === "page-and-ayah-tags-verified")
  .map((page) => [page.source, page]));
const requirements = new Map();
for (const record of plan.records) {
  for (const [tradition, page] of Object.entries(record.pages)) {
    if (page.status !== "ready-to-fetch") continue;
    if (!requirements.has(page.source)) requirements.set(page.source, { tradition, page: page.page, ayahs: new Set() });
    requirements.get(page.source).ayahs.add(`${page.sourceSurah ?? record.surah}:${page.sourceAyah ?? record.ayah}`);
  }
}

const jobs = [...requirements].map(([source, item]) => ({ source, ...item, ayahs: [...item.ayahs].sort() }));
const results = new Array(jobs.length);
let cursor = 0;

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= jobs.length) return;
    const job = jobs[index];
    if (verifiedCache.has(job.source)) {
      results[index] = verifiedCache.get(job.source);
      continue;
    }
    try {
      const response = await fetch(job.source, { headers: { "user-agent": "quran-usx printed-edition audit" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const svg = bytes.toString("utf8");
      const missingAyahs = job.ayahs.filter((key) => {
        const [surah, ayah] = key.split(":");
        return !new RegExp(`class=["']ayahPolygon["'][^>]*(?=[^>]*surah=["']0*${surah}["'])(?=[^>]*ayah=["']0*${ayah}["'])`, "i").test(svg)
          && !new RegExp(`class=["']ayahPolygon["'][^>]*(?=[^>]*ayah=["']0*${ayah}["'])(?=[^>]*surah=["']0*${surah}["'])`, "i").test(svg);
      });
      results[index] = {
        source: job.source,
        tradition: job.tradition,
        page: job.page,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
        requiredAyahs: job.ayahs,
        missingAyahs,
        status: missingAyahs.length ? "page-fetched-ayah-tag-missing" : "page-and-ayah-tags-verified",
      };
    } catch (error) {
      results[index] = { source: job.source, tradition: job.tradition, page: job.page, requiredAyahs: job.ayahs, status: "fetch-failed", error: error.message };
    }
    if ((index + 1) % 100 === 0) console.log(`checked ${index + 1}/${jobs.length}`);
  }
}

await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
const counts = results.reduce((acc, result) => ((acc[result.status] = (acc[result.status] ?? 0) + 1), acc), {});
const report = {
  format: "qusx-printed-edition-source-audit",
  version: "1.0.0",
  status: results.every((result) => result.status === "page-and-ayah-tags-verified") ? "all-referenced-pages-and-ayah-tags-verified" : "exceptions-present",
  limitations: "This verifies pinned page bytes and ayah tagging, not the scholarly correctness of the printed reading.",
  plan: { path: "eight-riwayah-printed-audit-plan-v1.json.gz", sha256: createHash("sha256").update(await readFile(planPath)).digest("hex") },
  coverage: { uniquePages: jobs.length, statusCounts: counts },
  pages: results,
};
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(report)}\n`);
await pipeline(createReadStream(temporary), createGzip({ level: 9 }), createWriteStream(outputPath));
await unlink(temporary);
console.log(`wrote ${outputPath}: ${jobs.length} pages; ${JSON.stringify(counts)}`);
