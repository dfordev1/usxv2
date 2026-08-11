#!/usr/bin/env node
import { createGunzip } from "node:zlib";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const start = Number(process.argv[2] ?? 0);
const limit = Number(process.argv[3] ?? 10);
if (![start, limit].every(Number.isInteger) || start < 0 || limit < 1 || limit > 50) throw new Error("Usage: build_printed_review_batch.mjs [start>=0] [limit=1..50]");

async function readGzipJson(file) {
  const chunks = [];
  for await (const chunk of createReadStream(file).pipe(createGunzip())) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function polygonBounds(svg, surah, ayah) {
  const tags = svg.match(/<path\b[^>]*class=["']ayahPolygon["'][^>]*>/gi) ?? [];
  const tag = tags.find((value) => new RegExp(`surah=["']0*${surah}["']`, "i").test(value) && new RegExp(`ayah=["']0*${ayah}["']`, "i").test(value));
  if (!tag) return null;
  const d = tag.match(/\bd=["']([^"']+)/i)?.[1] ?? "";
  const numbers = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  const ys = numbers.filter((_, index) => index % 2 === 1);
  return ys.length ? { top: Math.max(0, Math.min(...ys) - 5), bottom: Math.min(550, Math.max(...ys) + 5) } : null;
}

const plan = await readGzipJson(path.join(root, "data", "review", "eight-riwayah-printed-audit-plan-v1.json.gz"));
const records = plan.records.filter((record) => record.surah !== 63).slice(start, start + limit);
for (const record of records) {
  for (const page of Object.values(record.pages)) {
    if (page.status !== "ready-to-fetch") continue;
    const response = await fetch(page.source);
    if (!response.ok) throw new Error(`${response.status} ${page.source}`);
    page.bounds = polygonBounds(await response.text(), record.surah, record.ayah);
  }
}
const label = start === 0 && limit === 10 ? "001" : `${String(start + 1).padStart(4, "0")}-${String(start + records.length).padStart(4, "0")}`;
const output = path.join(root, "docs", "evidence", "review-batches", `batch-${label}.json`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ format: "qusx-printed-review-batch", start, limit, records }, null, 2)}\n`);
console.log(`wrote ${output}: ${records.length} records`);
