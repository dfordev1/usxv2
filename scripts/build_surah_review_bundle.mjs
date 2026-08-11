#!/usr/bin/env node
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const surah = Number(process.argv[2] ?? 63);
if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error(`Invalid surah: ${process.argv[2]}`);
const inputDir = path.join(root, "data", "alignments");
const files = (await readdir(inputDir)).filter((name) => name.endsWith(".candidates.json"));
const traditionIds = Object.freeze({ warsh: "warsh-kfqc", qalon: "qalon-kfqc", douri: "douri-kfqc", shubah: "shubah-kfqc", sousi: "sousi-kfqc" });
const grouped = new Map();
let observationCount = 0;

for (const file of files) {
  const document = JSON.parse(await readFile(path.join(inputDir, file), "utf8"));
  for (const candidate of document.candidates.filter((row) => row.surah === surah)) {
    observationCount += 1;
    const canonical = candidate.hafs?.location ?? `slot:${candidate.slot}`;
    if (!grouped.has(canonical)) grouped.set(canonical, { canonical, hafs: candidate.hafs, observations: [] });
    grouped.get(canonical).observations.push({
      tradition: traditionIds[document.tradition] ?? document.tradition,
      type: candidate.type,
      confidence: candidate.confidence,
      reading: candidate[document.tradition],
      context: candidate.context,
    });
  }
}

const records = [...grouped.values()].sort((a, b) => a.canonical.localeCompare(b.canonical, "en", { numeric: true })).map((record, index) => ({
  id: `qusx:review:${String(surah).padStart(3, "0")}:${String(index + 1).padStart(3, "0")}`,
  ...record,
  status: "scholarly-review-required",
  decision: null,
  reviewer: null,
  reviewedAt: null,
  evidence: [],
  notes: "",
}));

const bundle = {
  format: "qusx-surah-alignment-review",
  version: "1.0.0",
  status: "complete-candidate-inventory-review-pending",
  surah,
  canonicalTradition: "hafs-kufi",
  traditions: ["hafs-kufi", "shubah-kfqc", "warsh-kfqc", "qalon-kfqc", "douri-kfqc", "sousi-kfqc"],
  generatedFrom: files.sort().map((file) => `../alignments/${file}`),
  completeness: { candidateObservations: observationCount, uniqueReviewLocations: records.length, reviewed: 0, pending: records.length },
  allowedDecisions: ["reading-variant", "orthography-presentation", "tokenization", "source-versification", "reject-candidate"],
  records,
};

const output = path.join(root, "data", "review", `surah-${String(surah).padStart(3, "0")}-review-v1.json`);
await writeFile(output, `${JSON.stringify(bundle, null, 2)}\n`);
console.log(`wrote ${output}: ${observationCount} observations, ${records.length} review locations`);
