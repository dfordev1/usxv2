import assert from "node:assert/strict";
import { test } from "node:test";
import { createProvider, listProviders } from "../sdk/providers.mjs";

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

test("provider registry lists supported live clients", () => {
  assert.deepEqual(listProviders(), ["quran.com", "alquran.cloud"]);
  assert.throws(() => createProvider("unknown"), /Unknown provider/);
});

test("Quran.com provider fetches and normalizes an ayah", async () => {
  let requested;
  const provider = createProvider("quran.com", { baseUrl: "https://example.test", fetch: async (url) => {
    requested = url;
    return response({ verse: { verse_key: "57:24", words: [{ id: 1, position: 1, text_qpc_hafs: "هُوَ" }] } });
  } });
  const verse = await provider.getAyah("57:24");
  assert.match(requested, /verses\/by_key\/57:24/);
  assert.equal(verse.reference, "57:24");
  assert.equal(verse.text, "هُوَ");
});

test("AlQuran Cloud provider requires tradition and normalizes a surah", async () => {
  assert.throws(() => createProvider("alquran.cloud"), /explicit tradition/);
  const provider = createProvider("alquran.cloud", { tradition: "hafs-kufi", baseUrl: "https://example.test", fetch: async () => response({ data: { number: 1, ayahs: [{ text: "بِسْمِ ٱللَّهِ", numberInSurah: 1 }] } }) });
  const verses = await provider.getSurah(1);
  assert.equal(verses.length, 1);
  assert.equal(verses[0].words.length, 2);
  assert.equal(verses[0].source, "alquran.cloud");
});

test("providers reject invalid references and HTTP failures", async () => {
  const provider = createProvider("quran.com", { fetch: async () => response({}, 503) });
  await assert.rejects(provider.getAyah("bad"), /Invalid ayah reference/);
  await assert.rejects(provider.getAyah("1:1"), /503/);
});
