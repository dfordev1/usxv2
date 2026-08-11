import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeAlQuranCloudAyah, normalizeKfgqpcAyah, normalizeQuranComVerse } from "../sdk/adapters.mjs";

test("normalizes a Quran.com-style Hafs response", () => {
  const verse = normalizeQuranComVerse({
    verse_key: "57:24",
    words: [
      { id: 1, position: 1, location: "57:24:1", text_qpc_hafs: "ٱلَّذِينَ" },
      { id: 2, position: 2, location: "57:24:2", text_qpc_hafs: "يَبْخَلُونَ" },
      { id: 3, position: 3, char_type_name: "end", text_qpc_hafs: "٢٤" },
    ],
  });
  assert.equal(verse.reference, "57:24");
  assert.equal(verse.tradition, "hafs-kufi");
  assert.equal(verse.text, "ٱلَّذِينَ يَبْخَلُونَ".normalize("NFC"));
  assert.equal(verse.words[0].location, "57:24:1");
  assert.equal(verse.words.length, 2);
});

test("normalizes a KFGQPC tradition record and removes the ayah-number token", () => {
  const verse = normalizeKfgqpcAyah({ sura_no: 57, aya_no: 23, aya_text: "فَإِنَّ اَ۬للَّهَ اَ۬لْغَنِيُّ اُ۬لْحَمِيدُ ٢٣" }, { tradition: "warsh-kfqc" });
  assert.equal(verse.reference, "57:23");
  assert.equal(verse.tradition, "warsh-kfqc");
  assert.equal(verse.words.length, 4);
  assert.equal(verse.text, "فَإِنَّ اَ۬للَّهَ اَ۬لْغَنِيُّ اُ۬لْحَمِيدُ".normalize("NFC"));
});

test("adapters reject incomplete provider data", () => {
  assert.throws(() => normalizeQuranComVerse({ verse_key: "1:1" }), /words are required/);
  assert.throws(() => normalizeKfgqpcAyah({ sura_no: 1, aya_no: 1 }), /aya_text/);
  assert.throws(() => normalizeAlQuranCloudAyah({ data: { surah: { number: 1 }, numberInSurah: 1, text: "text" } }), /explicit tradition/);
});

test("normalizes an AlQuran Cloud whole-ayah response without guessing its tradition", () => {
  const response = {
    code: 200,
    status: "OK",
    data: {
      number: 1,
      text: "\uFEFFبِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
      edition: { identifier: "quran-uthmani", format: "text", type: "quran" },
      surah: { number: 1, englishName: "Al-Faatiha", numberOfAyahs: 7 },
      numberInSurah: 1,
      juz: 1,
      page: 1,
    },
  };
  const verse = normalizeAlQuranCloudAyah(response, { tradition: "hafs-kufi" });
  assert.equal(verse.source, "alquran.cloud");
  assert.equal(verse.reference, "1:1");
  assert.equal(verse.words.length, 4);
  assert.equal(verse.words[0].text, "بِسْمِ".normalize("NFC"));
  assert.equal(verse.providerRecord.edition.identifier, "quran-uthmani");
});
