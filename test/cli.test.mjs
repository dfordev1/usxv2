import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("../cli/qusx.mjs", import.meta.url));

test("CLI maps ayah boundaries using short tradition names", async () => {
  const { stdout } = await run(process.execPath, [cli, "map", "hafs", "warsh", "57:24", "--json"]);
  const result = JSON.parse(stdout);
  assert.deepEqual(result.targets, ["57:23"]);
  assert.equal(result.source, "hafs-kufi");
});

test("CLI compares every reviewed slot attached to an ayah", async () => {
  const { stdout } = await run(process.execPath, [cli, "compare", "--from", "hafs", "--to", "warsh", "--ayah", "57:24", "--json"]);
  const result = JSON.parse(stdout);
  assert.equal(result.reviewedDifferences.length, 1);
  assert.equal(result.reviewedDifferences[0].target.text, "");
  assert.equal(result.reviewedDifferences[0].authentication, "source-authenticated");
});

test("CLI validates a QUSX file and rejects malformed input", async () => {
  const valid = fileURLToPath(new URL("../output/madani-v1/114.qusx.xml", import.meta.url));
  assert.match((await run(process.execPath, [cli, "validate", valid])).stdout, /^VALID/);
  const invalid = fileURLToPath(new URL("fixtures/malformed-not-well-formed.xml", import.meta.url));
  await assert.rejects(run(process.execPath, [cli, "validate", invalid]), (error) => error.code === 1 && /INVALID/.test(error.stderr));
});
