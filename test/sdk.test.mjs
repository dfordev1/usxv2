import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createQusxClient, parseQusx, QusxError } from "../sdk/index.mjs";
import { readQusx } from "../sdk/node.mjs";

const fixtureUrl = new URL("../output/madani-v1/114.qusx.xml", import.meta.url);

test("parses generated QUSX and exposes metadata", async () => {
  const document = parseQusx(await readFile(fixtureUrl, "utf8"));
  assert.equal(document.metadata.surah, 114);
  assert.equal(document.metadata.tradition, "hafs-kufi");
  assert.ok(document.words.length > 20);
});

test("queries crossing ayah and line milestone axes", async () => {
  const document = await readQusx(fixtureUrl);
  const ayah = document.getAyah(3);
  assert.equal(ayah.words.length, 3);
  assert.notEqual(ayah.words[0].axes.line.number, ayah.words[1].axes.line.number);
  assert.equal(document.getLine(604, 13).words[0].id, ayah.words[1].id);
  assert.equal(document.getWord(ayah.words[0].id).text, ayah.words[0].text);
});

test("constructs predictable corpus URLs", () => {
  const client = createQusxClient({ baseUrl: "https://example.test/data/", layout: "madani-v2" });
  assert.equal(client.url(2), "https://example.test/data/madani-v2/002.qusx.xml");
  assert.throws(() => client.url(115), QusxError);
});

test("load uses an injected fetch implementation", async () => {
  const xml = await readFile(fixtureUrl, "utf8");
  const client = createQusxClient({ fetch: async () => new Response(xml) });
  assert.equal((await client.load(114)).metadata.surah, 114);
});

test("rejects unsafe, malformed, and mismatched documents", async () => {
  const xml = await readFile(fixtureUrl, "utf8");
  assert.throws(() => parseQusx(`<!DOCTYPE qusx>${xml}`), /DOCTYPE/);
  assert.throws(() => parseQusx(xml.replace("version=\"0.1\"", "version=\"9.0\"")), /version/);
  assert.throws(() => parseQusx(xml.replace(/<ayah eid="114:1:hafs-kufi"\/>/, '<ayah eid="wrong"/>')), /Unmatched/);
});
