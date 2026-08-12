#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createGunzip, createGzip } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function gzipJson(file) {
  const chunks = [];
  for await (const chunk of createReadStream(file).pipe(createGunzip())) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
const planPath = path.join(root, "data/review/eight-riwayah-printed-audit-plan-v1.json.gz");
const auditPath = path.join(root, "data/review/eight-riwayah-printed-source-audit-v1.json.gz");
const outputPath = path.join(root, "data/review/five-edition-ayah-crop-evidence-v1.json.gz");
const plan = await gzipJson(planPath);
const sourceAudit = await gzipJson(auditPath);
const pageAudit = new Map(sourceAudit.pages.map((page) => [page.source, page]));

const results = new Map(plan.records.map((record) => [record.id, { id: record.id, canonical: record.canonical, editions: {} }]));
const jobs = new Map();
for (const record of plan.records) {
  for (const [tradition, page] of Object.entries(record.pages)) {
    if (page.status !== "ready-to-fetch") {
      results.get(record.id).editions[tradition] = { status: "boundary-unavailable" };
      continue;
    }
    if (!jobs.has(page.source)) jobs.set(page.source, { source: page.source, tradition, page: page.page, records: [] });
    jobs.get(page.source).records.push({ record, sourceSurah: page.sourceSurah ?? record.surah, sourceAyah: page.sourceAyah ?? record.ayah });
  }
}

function bounds(svg, surah, ayah) {
  const tags = svg.match(/<path\b[^>]*class=["']ayahPolygon["'][^>]*>/gi) ?? [];
  const tag = tags.find((value) => new RegExp(`surah=["']0*${surah}["']`, "i").test(value) && new RegExp(`ayah=["']0*${ayah}["']`, "i").test(value));
  if (!tag) return null;
  const d = tag.match(/\bd=["']([^"']+)/i)?.[1] ?? "";
  const numbers = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  const ys = numbers.filter((_, index) => index % 2 === 1);
  return ys.length ? { top: Math.max(0, Math.min(...ys) - 4), bottom: Math.min(550, Math.max(...ys) + 4) } : null;
}

const queue = [...jobs.values()];
let cursor = 0;
let completed = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= queue.length) return;
    const job = queue[index];
    const response = await fetch(job.source, { headers: { "user-agent": "quran-usx visual audit" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${job.source}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
    if (pageAudit.get(job.source)?.sha256 !== sourceSha256) throw new Error(`Source hash changed: ${job.source}`);
    const svg = bytes.toString("utf8");
    const cropCache = new Map();
    for (const item of job.records) {
      const { record, sourceSurah, sourceAyah } = item;
      const key = `${sourceSurah}:${sourceAyah}`;
      if (!cropCache.has(key)) {
        const box = bounds(svg, sourceSurah, sourceAyah);
        if (!box) throw new Error(`Missing polygon ${key}: ${job.source}`);
        const height = box.bottom - box.top;
        const croppedSvg = svg.replace(/viewBox=["'][^"']+["']/, `viewBox="-6 ${box.top} 345 ${height}"`);
        const png = await sharp(Buffer.from(croppedSvg)).resize({ width: 690 }).flatten({ background: "white" }).png().toBuffer();
        cropCache.set(key, { sourceSha256, cropSha256: createHash("sha256").update(png).digest("hex"), viewBox: { x: -6, y: box.top, width: 345, height }, renderedWidth: 690 });
      }
      results.get(record.id).editions[job.tradition] = { page: job.page, source: job.source, status: "ayah-region-rendered-and-hashed", ...cropCache.get(key) };
    }
    completed += 1;
    if (completed % 100 === 0) console.log(`rendered ${completed}/${queue.length} pages`);
  }
}
await Promise.all(Array.from({ length: Number(process.env.QUSX_AUDIT_CONCURRENCY ?? 10) }, worker));
const records = [...results.values()];
const statuses = records.flatMap((record) => Object.values(record.editions)).reduce((counts, item) => ((counts[item.status] = (counts[item.status] ?? 0) + 1), counts), {});
const report = {
  format: "qusx-five-edition-ayah-crop-evidence",
  version: "1.0.0",
  status: "complete-rendered-ayah-evidence",
  limitations: "Raster hashes prove the pinned ayah regions rendered; they do not by themselves identify or interpret the target word.",
  coverage: { records: records.length, editions: 5, evidenceStatuses: statuses },
  records,
};
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, JSON.stringify(report));
await pipeline(createReadStream(temporary), createGzip({ level: 9 }), createWriteStream(outputPath));
await unlink(temporary);
console.log(JSON.stringify(report.coverage, null, 2));
