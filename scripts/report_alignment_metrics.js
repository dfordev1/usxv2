#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const dir = path.join(root, "data", "alignments");
const output = path.join(dir, "metrics-v1.json");
const files = fs.readdirSync(dir).filter((name) => name.endsWith("-to-hafs.candidates.json")).sort();
const traditions = {};
const totals = { alignedSlots: 0, exact: 0, orthographicMatch: 0, uncertainMatch: 0, hafsOnly: 0, traditionOnly: 0 };

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const metrics = { surahs: data.summaries.length, alignedSlots: 0, exact: 0, orthographicMatch: 0, uncertainMatch: 0, hafsOnly: 0, traditionOnly: 0 };
  for (const summary of data.summaries) {
    metrics.alignedSlots += summary.alignedSlots;
    metrics.exact += summary.counts.exact || 0;
    metrics.orthographicMatch += summary.counts["orthographic-match"] || 0;
    metrics.uncertainMatch += summary.counts["uncertain-match"] || 0;
    metrics.hafsOnly += summary.counts["hafs-only"] || 0;
    metrics.traditionOnly += summary.counts["tradition-only"] || 0;
  }
  traditions[data.tradition] = metrics;
  for (const key of Object.keys(totals)) totals[key] += metrics[key];
}

const reviewData = fs.readFileSync(path.join(root, "docs", "examples", "alignment-review-data.js"), "utf8")
  .replace(/^window\.QUSX_ALIGNMENT_REVIEW = /, "").replace(/;\s*$/, "");
const review = JSON.parse(reviewData);
const boundary = JSON.parse(fs.readFileSync(path.join(dir, "boundary-v1.json"), "utf8"));
const report = {
  format: "qusx-alignment-metrics",
  version: "1.0.0",
  scope: "five non-Hafs source traditions aligned independently to Hafs across 114 surahs",
  traditions,
  totals,
  technicalReview: review.technicalSummary,
  authenticatedRules: 3,
  authenticatedRecords: 8,
  ayahMappings: Object.values(boundary.mappings).reduce((sum, rows) => sum + rows.length, 0),
};
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`wrote ${output}: ${totals.alignedSlots} aligned slots, ${report.ayahMappings} ayah mappings`);
