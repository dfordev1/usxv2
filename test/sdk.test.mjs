import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createAlignmentClient, createAyahMappingClient, createQusxClient, parseAlignment, parseQusx, QusxError } from "../sdk/index.mjs";
import { readQusx } from "../sdk/node.mjs";

const fixtureUrl = new URL("../output/madani-v1/114.qusx.xml", import.meta.url);
const alignmentUrl = new URL("../data/alignments/normative-v1.json", import.meta.url);
const boundaryUrl = new URL("../data/alignments/boundary-v1.json", import.meta.url);

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

test("alignment SDK reads empty, single-token, and multi-token slots", async () => {
  const client = createAlignmentClient(await readFile(alignmentUrl, "utf8"));
  assert.equal(client.listAlignmentRules().length, 3);
  assert.equal(client.getReading("qusx:slot:057:024:001", "hafs-kufi").text, "هُوَ");
  assert.deepEqual(client.getReading("qusx:slot:057:024:001", "warsh-kfqc").tokens, []);
  assert.deepEqual(client.getReading("qusx:slot:040:026:001", "hafs-kufi").tokens, ["أَوْ", "أَن"]);
  assert.equal(client.compareReadings("qusx:alignment:037:130:001").readings["qalon-kfqc"].text, "ءَالِ يَاسِينَ");
  assert.ok(client.getAlignmentEvidence("qusx:slot:037:130:001").evidence.length >= 2);
});

test("alignment SDK rejects malformed data and unknown queries", async () => {
  const data = JSON.parse(await readFile(alignmentUrl, "utf8"));
  assert.throws(() => parseAlignment({ ...data, traditions: ["hafs-kufi", "hafs-kufi"] }), /unique array/);
  assert.throws(() => parseAlignment({ ...data, rules: [{ ...data.rules[0], readings: { "hafs-kufi": data.rules[0].readings["hafs-kufi"] } }] }), /every listed tradition/);
  const client = createAlignmentClient(data);
  assert.throws(() => client.getReading("missing", "hafs-kufi"), QusxError);
  assert.throws(() => client.getReading(data.rules[0].slotId, "unknown"), QusxError);
});

test("ayah mapping SDK resolves shifts, splits, inverse, and cross-tradition mappings", async () => {
  const client = createAyahMappingClient(await readFile(boundaryUrl, "utf8"));
  assert.deepEqual(client.mapAyah("57:24", "warsh-kfqc"), ["57:23"]);
  assert.deepEqual(client.mapAyah("57:23", "hafs-kufi", "warsh-kfqc"), ["57:24"]);
  assert.deepEqual(client.mapAyah("2:1", "hafs-kufi", "warsh-kfqc"), ["2:1", "2:2"]);
  assert.deepEqual(client.mapAyah("57:23", "qalon-kfqc", "warsh-kfqc"), ["57:23"]);
  assert.deepEqual(client.mapAyah("999:999", "warsh-kfqc", "warsh-kfqc"), []);
  assert.deepEqual(client.mapAyah("1:1", "warsh-kfqc"), []);
  assert.deepEqual(client.mapping.unmappedHubAyahs["warsh-kfqc"], ["1:1"]);
  assert.throws(() => client.mapAyah("57:24", "unknown"), QusxError);
  const invalid = JSON.parse(await readFile(boundaryUrl, "utf8"));
  invalid.mappings["warsh-kfqc"][0].source = "115:1";
  assert.throws(() => createAyahMappingClient(invalid), /invalid source ayah/);
});
