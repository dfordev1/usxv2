#!/usr/bin/env node
import { createProvider } from "../sdk/providers.mjs";

const quranCom = createProvider("quran.com");
const alQuranCloud = createProvider("alquran.cloud", { tradition: "hafs-kufi" });
const [left, right] = await Promise.all([quranCom.getSurah(1), alQuranCloud.getSurah(1)]);

function letters(value) {
  return value.normalize("NFD").replace(/[^\p{L}]/gu, "").replace(/[ٱأإآ]/gu, "ا").normalize("NFC");
}

const rightByReference = new Map(right.map((verse) => [verse.reference, verse]));
const comparisons = left.map((verse) => {
  const other = rightByReference.get(verse.reference);
  return { reference: verse.reference, quranComWords: verse.words.length, alQuranCloudWords: other?.words.length ?? 0, lettersMatch: Boolean(other) && letters(verse.text) === letters(other.text) };
});
const failures = comparisons.filter((row) => !row.lettersMatch);
if (left.length !== 7 || right.length !== 7 || failures.length) throw new Error(`Al-Fatihah provider audit failed: ${JSON.stringify({ left: left.length, right: right.length, failures })}`);
console.log(JSON.stringify({ surah: 1, providers: [quranCom.name, alQuranCloud.name], ayahsCompared: comparisons.length, letterMatches: comparisons.length - failures.length, status: "PASS", comparisons }, null, 2));
