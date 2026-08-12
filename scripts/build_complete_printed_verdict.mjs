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
const plan = await gzipJson(path.join(root, "data", "review", "eight-riwayah-printed-audit-plan-v1.json.gz"));
const sourceAudit = await gzipJson(path.join(root, "data", "review", "eight-riwayah-printed-source-audit-v1.json.gz"));
const mirrorAudit = JSON.parse(await readFile(path.join(root, "data", "alignments", "eight-riwayah-mirror-audit-v1.json"), "utf8"));
const batch = JSON.parse(await readFile(path.join(root, "data", "review", "printed-review-batch-001-decisions.json"), "utf8"));
const surah63 = JSON.parse(await readFile(path.join(root, "data", "review", "surah-063-printed-evidence-v1.json"), "utf8"));

if (sourceAudit.status !== "all-referenced-pages-and-ayah-tags-verified") throw new Error("Printed source audit is incomplete");
if (mirrorAudit.unresolvedSubstantiveDifferences !== 0) throw new Error("Mirror audit has unresolved substantive differences");

const reviewed = new Map(batch.records.map((record) => [record.id, { decision: record.decision, notes: record.notes }]));
for (const record of surah63.records) {
  const sequence = Number(record.canonical.split(":").join(""));
  reviewed.set(record.canonical, { decision: record.decision, notes: record.notes, sequence });
}

const records = plan.records.map((record) => {
  const manual = reviewed.get(record.id) ?? reviewed.get(record.canonical);
  if (manual) return { id: record.id, canonical: record.canonical, errorVerdict: "no-source-copy-error-detected", semanticStatus: "printed-edition-reviewed", decision: manual.decision, notes: manual.notes };
  if (record.workbookClassification === "split-join") return { id: record.id, canonical: record.canonical, errorVerdict: "no-source-copy-error-detected", semanticStatus: "source-corroborated", decision: "tokenization", notes: "Workbook split/join flag; source readings are retained losslessly." };
  return { id: record.id, canonical: record.canonical, errorVerdict: "no-source-copy-error-detected", semanticStatus: "source-corroborated-subtype-pending", decision: "reading-or-orthography-variation", notes: "Independent mirror agrees after QUSX normalization and every referenced printed page/ayah tag is verified; precise recitational subtype is not asserted." };
});
const counts = records.reduce((value, record) => {
  value.errorVerdicts[record.errorVerdict] = (value.errorVerdicts[record.errorVerdict] ?? 0) + 1;
  value.decisions[record.decision] = (value.decisions[record.decision] ?? 0) + 1;
  value.semanticStatuses[record.semanticStatus] = (value.semanticStatuses[record.semanticStatus] ?? 0) + 1;
  return value;
}, { errorVerdicts: {}, decisions: {}, semanticStatuses: {} });
const report = {
  format: "qusx-complete-printed-error-verdict",
  version: "1.0.0",
  status: "complete-source-error-audit-semantic-subtypes-partial",
  scope: "Determines whether candidate records indicate source-copy errors; does not claim scholarly certification of every recitational subtype.",
  evidence: {
    candidateInventory: "eight-riwayah-printed-audit-plan-v1.json.gz",
    printedSourceAudit: "eight-riwayah-printed-source-audit-v1.json.gz",
    mirrorAudit: "../alignments/eight-riwayah-mirror-audit-v1.json",
  },
  summary: { records: records.length, ...counts },
  records,
};
const output = path.join(root, "data", "review", "eight-riwayah-complete-error-verdict-v1.json.gz");
const temporary = `${output}.tmp`;
await writeFile(temporary, `${JSON.stringify(report)}\n`);
await pipeline(createReadStream(temporary), createGzip({ level: 9 }), createWriteStream(output));
await unlink(temporary);
console.log(`wrote ${output}: ${records.length} complete error verdicts`);
