import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const audit = JSON.parse(await readFile(new URL("../data/alignments/eight-riwayah-mirror-audit-v1.json", import.meta.url), "utf8"));

test("KFGQPC mirror audit covers eight pinned datasets without unresolved substantive differences", () => {
  assert.equal(audit.mirror.commit, "281dbbe8eed1370daa5a023b6cd81655cbfd6473");
  assert.equal(audit.results.length, 8);
  assert.equal(audit.unresolvedSubstantiveDifferences, 0);
  assert.equal(audit.results.find((item) => item.tradition === "hafs-kufi").normalizedExact, true);
  assert.ok(audit.results.every((item) => /^[a-f0-9]{64}$/.test(item.sha256)));
});
