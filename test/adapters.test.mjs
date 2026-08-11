import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeKfgqpcAyah, normalizeQuranComVerse } from "../sdk/adapters.mjs";

test("normalizes a Quran.com-style Hafs response", () => {
  const verse = normalizeQuranComVerse({
    verse_key: "57:24",
    words: [
      { id: 1, position: 1, location: "57:24:1", text_qpc_hafs: "ٱلَّذِينَ" },
      { id: 2, position: 2, location: "57:24:2", text_qpc_hafs: "يَبْخَلُونَ" },
    ],
  });
  assert.equal(verse.reference, "57:24");
  assert.equal(verse.tradition, "hafs-kufi");
  assert.equal(verse.text, "ٱلَّذِينَ يَبْخَلُونَ".normalize("NFC"));
  assert.equal(verse.words[0].location, "57:24:1");
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
});
