#!/usr/bin/env node
import { createGunzip, createGzip } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function gzipJson(file) {
  const chunks = [];
  for await (const chunk of createReadStream(file).pipe(createGunzip())) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
const plan = await gzipJson(path.join(root, "data/review/eight-riwayah-printed-audit-plan-v1.json.gz"));
const svgEvidence = await gzipJson(path.join(root, "data/review/five-edition-ayah-crop-evidence-v1.json.gz"));
const pdfEvidence = await gzipJson(path.join(root, "data/review/additional-printed-line-evidence-v1.json.gz"));
const batch = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-001-decisions.json"), "utf8"));
const batch2 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-002-decisions.json"), "utf8"));
const batch3 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-003-decisions.json"), "utf8"));
const batch4 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-004-decisions.json"), "utf8"));
const batch5 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-005-decisions.json"), "utf8"));
const batch6 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-006-decisions.json"), "utf8"));
const batch7 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-007-decisions.json"), "utf8"));
const batch8 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-008-decisions.json"), "utf8"));
const batch9 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-009-decisions.json"), "utf8"));
const batch10 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-010-decisions.json"), "utf8"));
const batch11 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-011-decisions.json"), "utf8"));
const batch12 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-012-decisions.json"), "utf8"));
const batch12b = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-012b-decisions.json"), "utf8"));
const batch13 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-013-decisions.json"), "utf8"));
const batch14 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-014-decisions.json"), "utf8"));
const batch15 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-015-decisions.json"), "utf8"));
const batch16 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-016-decisions.json"), "utf8"));
const batch17 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-017-decisions.json"), "utf8"));
const batch18 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-018-decisions.json"), "utf8"));
const batch19 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-019-decisions.json"), "utf8"));
const batch20 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-020-decisions.json"), "utf8"));
const batch21 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-021-decisions.json"), "utf8"));
const batch22 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-022-decisions.json"), "utf8"));
const batch23 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-023-decisions.json"), "utf8"));
const batch24 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-024-decisions.json"), "utf8"));
const batch25 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-025-decisions.json"), "utf8"));
const batch26 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-026-decisions.json"), "utf8"));
const batch27 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-027-decisions.json"), "utf8"));
const batch28 = JSON.parse(await readFile(path.join(root, "data/review/printed-review-batch-028-decisions.json"), "utf8"));
const surah63 = JSON.parse(await readFile(path.join(root, "data/review/surah-063-printed-evidence-v1.json"), "utf8"));
const svgById = new Map(svgEvidence.records.map((record) => [record.id, record]));
const pdfById = new Map(pdfEvidence.records.map((record) => [record.id, record]));
const manual = new Map(batch.records.map((record) => [record.id, record]));
for (const record of batch2.records) manual.set(record.id, record);
for (const record of batch3.records) manual.set(record.id, record);
for (const record of batch4.records) manual.set(record.id, record);
for (const record of batch5.records) manual.set(record.id, record);
for (const record of batch6.records) manual.set(record.id, record);
for (const record of batch7.records) manual.set(record.id, record);
for (const record of batch8.records) manual.set(record.id, record);
for (const record of batch9.records) manual.set(record.id, record);
for (const record of batch10.records) manual.set(record.id, record);
for (const record of batch11.records) manual.set(record.id, record);
for (const record of batch12.records) manual.set(record.id, record);
for (const record of batch12b.records) manual.set(record.id, record);
for (const record of batch13.records) manual.set(record.id, record);
for (const record of batch14.records) manual.set(record.id, record);
for (const record of batch15.records) manual.set(record.id, record);
for (const record of batch16.records) manual.set(record.id, record);
for (const record of batch17.records) manual.set(record.id, record);
for (const record of batch18.records) manual.set(record.id, record);
for (const record of batch19.records) manual.set(record.id, record);
for (const record of batch20.records) manual.set(record.id, record);
for (const record of batch21.records) manual.set(record.id, record);
for (const record of batch22.records) manual.set(record.id, record);
for (const record of batch23.records) manual.set(record.id, record);
for (const record of batch24.records) manual.set(record.id, record);
for (const record of batch25.records) manual.set(record.id, record);
for (const record of batch26.records) manual.set(record.id, record);
for (const record of batch27.records) manual.set(record.id, record);
for (const record of batch28.records) manual.set(record.id, record);
for (const record of surah63.records) manual.set(record.canonical, record);

const folds = new Map([["ٱ", "ا"], ["أ", "ا"], ["إ", "ا"], ["آ", "ا"], ["ى", "ي"], ["ے", "ي"], ["ؤ", "و"], ["ئ", "ي"]]);
function lexical(value) {
  return value.normalize("NFD").replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640\u06e5-\u06e7]/gu, "")
    .split("").filter((char) => /\p{Script=Arabic}/u.test(char) && /\p{Letter}/u.test(char)).map((char) => folds.get(char) ?? char).join("");
}
function classify(record) {
  const override = manual.get(record.id) ?? manual.get(record.canonical);
  if (override) return { decision: override.decision, confidence: "manual-edition-review", notes: override.notes };
  if (record.workbookClassification === "split-join") return { decision: "tokenization", confidence: "source-flagged", notes: "The aligned workbook explicitly flags a split/join boundary; all source tokens are retained." };
  const forms = Object.values(record.readings).map((tokens) => lexical(tokens.join(" ")));
  if (new Set(forms).size === 1) return { decision: "orthography-presentation", confidence: "deterministic", notes: "All eight forms reduce to the same Arabic letter sequence after removing edition presentation marks." };
  const consonantal = forms.map((form) => form.replace(/[اويء]/gu, ""));
  if (new Set(consonantal).size === 1) return { decision: "uncertain", confidence: "requires-domain-interpretation", notes: "The remaining difference is confined to alif, waw, ya or hamza behavior; no semantic subtype is asserted." };
  return { decision: "reading-variant", confidence: "deterministic-letter-group", notes: "At least two editions retain different non-weak Arabic letter sequences; the record is source-corroborated and not a copy error." };
}

const records = plan.records.map((record) => {
  const svg = svgById.get(record.id);
  const pdf = pdfById.get(record.id);
  if (!svg || !pdf) throw new Error(`Missing rendered evidence: ${record.id}`);
  const renderedSvg = Object.values(svg.editions).filter((item) => item.status === "ayah-region-rendered-and-hashed").length;
  const renderedPdf = Object.values(pdf.editions).filter((item) => item.status === "target-line-region-rendered-and-hashed").length;
  if (renderedSvg + renderedPdf < 7) throw new Error(`Insufficient visual editions: ${record.id}`);
  return {
    id: record.id,
    canonical: record.canonical,
    readings: record.readings,
    ...classify(record),
    status: "edition-scoped-reviewed-not-scholarly-certified",
    reviewMode: "individual-record-text-comparison-with-rendered-printed-evidence",
    evidence: {
      renderedEditions: renderedSvg + renderedPdf,
      svgAyahCrops: svg.editions,
      pdfLineCrops: pdf.editions,
    },
  };
});
const decisions = records.reduce((counts, record) => ((counts[record.decision] = (counts[record.decision] ?? 0) + 1), counts), {});
const report = {
  format: "qusx-complete-eight-edition-review",
  version: "1.0.0",
  status: "complete-edition-scoped-review-not-scholarly-certified",
  limitations: [
    "This is an edition-scoped technical review, not a scholarly certification or religious ruling.",
    "Al-Bazzi, Qunbul and Al-Susi use independently mirrored printed PDFs rather than quran-svg KFQC vectors.",
    "Uncertain records deliberately preserve cases where orthographic and recitational interpretation cannot be separated safely by deterministic letter analysis."
  ],
  coverage: { candidates: records.length, traditions: 8, decisions },
  records,
};
const output = path.join(root, "data/review/eight-riwayah-complete-printed-review-v1.json.gz");
const temporary = `${output}.tmp`;
await writeFile(temporary, JSON.stringify(report));
await pipeline(createReadStream(temporary), createGzip({ level: 9 }), createWriteStream(output));
await unlink(temporary);
console.log(JSON.stringify(report.coverage, null, 2));
