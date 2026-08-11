#!/usr/bin/env node
/** Generate hub-and-spoke ayah mappings from the aligned source word streams. */
const fs = require("fs");
const path = require("path");
const { alignWords, loadHafs, loadTradition } = require("./generate_candidate_alignments.js");

const root = path.join(__dirname, "..");
const output = path.join(root, "data", "alignments", "boundary-v1.json");
const traditions = ["warsh", "qalon", "douri", "shubah", "sousi"];
const ids = {
  warsh: "warsh-kfqc", qalon: "qalon-kfqc", douri: "douri-kfqc",
  shubah: "shubah-kfqc", sousi: "sousi-kfqc",
};
const hafs = loadHafs();
const mappings = {};
const unmappedHubAyahs = {};

for (const tradition of traditions) {
  const source = loadTradition(tradition);
  const records = [];
  for (let surah = 1; surah <= 114; surah++) {
    const pairs = alignWords(hafs.get(surah) || [], source.get(surah) || []);
    const sourceToHafs = new Map();
    for (const pair of pairs) {
      if (!pair.hafs || !pair.tradition) continue;
      const sourceKey = `${surah}:${pair.tradition.ayah}`;
      if (!sourceToHafs.has(sourceKey)) sourceToHafs.set(sourceKey, new Set());
      sourceToHafs.get(sourceKey).add(`${surah}:${pair.hafs.ayah}`);
    }
    const ayahs = [...new Set((source.get(surah) || []).map((word) => word.ayah))].sort((a, b) => a - b);
    for (const ayah of ayahs) {
      const sourceKey = `${surah}:${ayah}`;
      const targets = [...(sourceToHafs.get(sourceKey) || [])].sort((a, b) => Number(a.split(":")[1]) - Number(b.split(":")[1]));
      if (!targets.length) throw new Error(`${ids[tradition]} ${sourceKey} has no Hafs overlap`);
      records.push({ source: sourceKey, targets });
    }
  }
  const coveredHafs = new Set(records.flatMap((record) => record.targets));
  const expectedHafs = new Set([...hafs.values()].flatMap((words) => words.map((word) => `${word.surah}:${word.ayah}`)));
  const missingHafs = [...expectedHafs].filter((reference) => !coveredHafs.has(reference));
  unmappedHubAyahs[ids[tradition]] = missingHafs;
  mappings[ids[tradition]] = records;
}

const data = {
  format: "qusx-ayah-mapping",
  version: "1.0.0",
  status: "algorithmic-source-derived-research-prototype",
  hubTradition: "hafs-kufi",
  traditions: ["hafs-kufi", ...Object.values(ids)],
  method: "surah-level minimum-edit word alignment; every source ayah maps to the Hafs ayah(s) containing its aligned words",
  mappings,
  unmappedHubAyahs,
};
fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`wrote ${output}: ${Object.values(mappings).reduce((sum, rows) => sum + rows.length, 0)} source ayah mappings`);
