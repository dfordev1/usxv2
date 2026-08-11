import test from "node:test";
import assert from "node:assert/strict";
import { createGunzip } from "node:zlib";
import { createReadStream } from "node:fs";

async function load() {
  const chunks = [];
  for await (const chunk of createReadStream(new URL("../data/review/eight-riwayah-printed-audit-plan-v1.json.gz", import.meta.url)).pipe(createGunzip())) chunks.push(chunk);
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
