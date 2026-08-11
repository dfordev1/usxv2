import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { test } from "node:test";

const bundle = JSON.parse(await readFile(new URL("../data/review/surah-063-review-v1.json", import.meta.url), "utf8"));
const printedEvidence = JSON.parse(await readFile(new URL("../data/review/surah-063-printed-evidence-v1.json", import.meta.url), "utf8"));

test("Surah 63 bundle is a complete four-location candidate inventory", () => {
  assert.equal(bundle.format, "qusx-surah-alignment-review");
  assert.equal(bundle.surah, 63);
  assert.deepEqual(bundle.completeness, { candidateObservations: 8, uniqueReviewLocations: 4, reviewed: 4, pending: 0 });
  assert.deepEqual(bundle.records.map((record) => record.canonical), ["63:6:16", "63:10:14", "63:11:6", "63:11:11"]);
});

test("printed-edition evidence pins every source page by SHA-256", async () => {
  assert.equal(printedEvidence.records.length, 4);
  assert.equal(printedEvidence.status, "printed-edition-verified-not-scholarly-certified");
  for (const page of Object.values(printedEvidence.pages)) {
    const bytes = await readFile(new URL(page.path, new URL("../data/review/", import.meta.url)));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), page.sha256);
  }
});

test("bundle preserves every observation with edition-scoped verification", () => {
  const traditions = new Set(bundle.records.flatMap((record) => record.observations.map((item) => item.tradition)));
  assert.deepEqual([...traditions].sort(), ["douri-kfqc", "qalon-kfqc", "shubah-kfqc", "sousi-kfqc", "warsh-kfqc"]);
  assert.equal(bundle.records.reduce((sum, record) => sum + record.observations.length, 0), 8);
  for (const record of bundle.records) {
    assert.equal(record.status, "printed-edition-verified");
    assert.ok(record.decision);
    assert.equal(record.reviewer, "QUSX printed-edition audit");
    assert.ok(record.observations.every((item) => item.context.length >= 5));
  }
});
