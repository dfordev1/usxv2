import assert from "node:assert/strict";
import { test } from "node:test";
import { findBundledEightRiwayahSlots, loadBundledEightRiwayah } from "../sdk/node.mjs";

test("bundled eight-riwayah candidate inventory is complete", async () => {
  const data = await loadBundledEightRiwayah({ candidatesOnly: true });
  assert.equal(data.traditions.length, 8);
  assert.equal(data.slotCount, 77432);
  assert.equal(data.candidateCount, 937);
  assert.equal(data.classificationCounts["substantive-candidate"], 931);
  assert.equal(data.classificationCounts["split-join"], 6);
  assert.equal(data.slots.length, 937);
});

test("Surah 63 candidate slots retain workbook provenance and all readings", async () => {
  const slots = await findBundledEightRiwayahSlots("63:11");
  const target = slots.find((slot) => slot.canonicalLocations.includes("63:11:11"));
  assert.ok(target);
  assert.equal(target.provenance.row, 71687);
  assert.equal(Object.keys(target.readings).length, 8);
  assert.deepEqual(target.readings["shubah-kfqc"], ["يَعۡمَلُونَ"]);
});
