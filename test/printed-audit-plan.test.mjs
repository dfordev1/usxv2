import test from "node:test";
import assert from "node:assert/strict";
import { createGunzip } from "node:zlib";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";

async function load() {
  const chunks = [];
  for await (const chunk of createReadStream(new URL("../data/review/eight-riwayah-printed-audit-plan-v1.json.gz", import.meta.url)).pipe(createGunzip())) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks));
}

async function loadSourceAudit() {
  const chunks = [];
  for await (const chunk of createReadStream(new URL("../data/review/eight-riwayah-printed-source-audit-v1.json.gz", import.meta.url)).pipe(createGunzip())) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks));
}

test("printed audit plan covers every candidate without claiming certification", async () => {
  const plan = await load();
  assert.equal(plan.status, "complete-inventory-evidence-pending");
  assert.equal(plan.coverage.candidates, 937);
  assert.equal(plan.coverage.uniqueAyahs, 805);
  assert.equal(plan.records.length, 937);
  assert.match(plan.limitations, /not scholarly certification/i);
  assert.ok(plan.records.every((record) => record.status === "printed-evidence-pending"));
});

test("every referenced printed page and required ayah tag was verified", async () => {
  const audit = await loadSourceAudit();
  assert.equal(audit.status, "all-referenced-pages-and-ayah-tags-verified");
  assert.deepEqual(audit.coverage.statusCounts, { "page-and-ayah-tags-verified": 2230 });
  assert.equal(audit.pages.length, 2230);
  assert.ok(audit.pages.every((page) => /^[0-9a-f]{64}$/.test(page.sha256) && page.missingAyahs.length === 0));
});

test("first printed review batch records ten edition-scoped decisions", async () => {
  const decisions = JSON.parse(await readFile(new URL("../data/review/printed-review-batch-001-decisions.json", import.meta.url), "utf8"));
  assert.equal(decisions.status, "printed-edition-reviewed-not-scholarly-certified");
  assert.equal(decisions.records.length, 10);
  assert.equal(["reading-variant", "orthography-presentation", "tokenization", "source-error", "uncertain"]
    .reduce((sum, key) => sum + decisions.summary[key], 0), decisions.summary.records);
  assert.equal(decisions.summary["source-error"], 0);
  assert.ok(decisions.records.every((record) => record.decision && record.notes));
});

test("complete verdict covers every candidate without inventing semantic certainty", async () => {
  const chunks = [];
  for await (const chunk of createReadStream(new URL("../data/review/eight-riwayah-complete-error-verdict-v1.json.gz", import.meta.url)).pipe(createGunzip())) chunks.push(chunk);
  const verdict = JSON.parse(Buffer.concat(chunks));
  assert.equal(verdict.summary.records, 937);
  assert.deepEqual(verdict.summary.errorVerdicts, { "no-source-copy-error-detected": 937 });
  assert.equal(verdict.summary.decisions.tokenization, 6);
  assert.equal(verdict.summary.semanticStatuses["source-corroborated-subtype-pending"], 919);
  assert.match(verdict.scope, /does not claim scholarly certification/i);
});

test("complete eight-edition review has individual rendered evidence and explicit decisions", async () => {
  const chunks = [];
  for await (const chunk of createReadStream(new URL("../data/review/eight-riwayah-complete-printed-review-v1.json.gz", import.meta.url)).pipe(createGunzip())) chunks.push(chunk);
  const review = JSON.parse(Buffer.concat(chunks));
  assert.equal(review.status, "complete-edition-scoped-review-not-scholarly-certified");
  assert.equal(review.coverage.candidates, 937);
  assert.equal(review.coverage.traditions, 8);
  assert.deepEqual(review.coverage.decisions, {
    "reading-variant": 211,
    "orthography-presentation": 39,
    uncertain: 681,
    tokenization: 6,
  });
  assert.equal(review.records.length, 937);
  for (const record of review.records) {
    assert.ok(["reading-variant", "orthography-presentation", "uncertain", "tokenization"].includes(record.decision));
    assert.equal(record.evidence.renderedEditions, 8);
    assert.equal(Object.keys(record.evidence.svgAyahCrops).length, 5);
    assert.equal(Object.keys(record.evidence.pdfLineCrops).length, 3);
    for (const item of Object.values(record.evidence.svgAyahCrops)) {
      assert.equal(item.status, "ayah-region-rendered-and-hashed");
      assert.match(item.cropSha256, /^[0-9a-f]{64}$/);
    }
    for (const item of Object.values(record.evidence.pdfLineCrops)) {
      assert.equal(item.status, "target-line-region-rendered-and-hashed");
      assert.match(item.cropSha256, /^[0-9a-f]{64}$/);
    }
  }
});

test("every audit record has actionable page evidence or an explicit boundary gap", async () => {
  const plan = await load();
  for (const record of plan.records) {
    assert.match(record.canonical, /^\d+:\d+:\d+$/);
    for (const page of Object.values(record.pages)) {
      assert.ok(["ready-to-fetch", "boundary-unavailable"].includes(page.status));
      if (page.status === "ready-to-fetch") assert.match(page.source, /quranpedia\/quran-svg\/[0-9a-f]{40}\/mushafs\/.+\/\d{3}\.svg$/);
    }
  }
});

