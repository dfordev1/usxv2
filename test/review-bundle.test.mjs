import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const bundle = JSON.parse(await readFile(new URL("../data/review/surah-063-review-v1.json", import.meta.url), "utf8"));

test("Surah 63 bundle is a complete four-location candidate inventory", () => {
  assert.equal(bundle.format, "qusx-surah-alignment-review");
  assert.equal(bundle.surah, 63);
  assert.deepEqual(bundle.completeness, { candidateObservations: 8, uniqueReviewLocations: 4, reviewed: 0, pending: 4 });
  assert.deepEqual(bundle.records.map((record) => record.canonical), ["63:6:16", "63:10:14", "63:11:6", "63:11:11"]);
});

test("bundle preserves every tradition observation without claiming review", () => {
  const traditions = new Set(bundle.records.flatMap((record) => record.observations.map((item) => item.tradition)));
  assert.deepEqual([...traditions].sort(), ["douri-kfqc", "qalon-kfqc", "shubah-kfqc", "sousi-kfqc", "warsh-kfqc"]);
  assert.equal(bundle.records.reduce((sum, record) => sum + record.observations.length, 0), 8);
  for (const record of bundle.records) {
    assert.equal(record.status, "scholarly-review-required");
    assert.equal(record.decision, null);
    assert.equal(record.reviewer, null);
    assert.ok(record.observations.every((item) => item.context.length >= 5));
  }
});
