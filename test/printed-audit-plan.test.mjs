import test from "node:test";
import assert from "node:assert/strict";
import { createGunzip } from "node:zlib";
import { createReadStream } from "node:fs";

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
  assert.deepEqual(audit.coverage.statusCounts, { "page-and-ayah-tags-verified": 2213 });
  assert.equal(audit.pages.length, 2213);
  assert.ok(audit.pages.every((page) => /^[0-9a-f]{64}$/.test(page.sha256) && page.missingAyahs.length === 0));
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
