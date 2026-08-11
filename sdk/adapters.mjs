import { QusxError } from "./index.mjs";

function positive(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new QusxError(`${label} must be a positive integer`, "QUSX_ADAPTER");
  return number;
}

function result(source, tradition, surah, ayah, words, providerRecord) {
  return Object.freeze({
    format: "qusx-compatible-verse",
    version: "1.0.0",
    source,
    tradition,
    surah,
    ayah,
    reference: `${surah}:${ayah}`,
    words: Object.freeze(words.map((word) => Object.freeze(word))),
    text: words.map((word) => word.text).join(" "),
    providerRecord,
  });
}

export function normalizeQuranComVerse(input, options = {}) {
  const verse = input?.verse ?? input;
  if (!verse || typeof verse !== "object") throw new QusxError("Quran.com verse object is required", "QUSX_ADAPTER");
  const match = /^(\d+):(\d+)$/.exec(verse.verse_key ?? verse.verseKey ?? "");
  if (!match) throw new QusxError("Quran.com verse_key is required", "QUSX_ADAPTER");
  if (!Array.isArray(verse.words)) throw new QusxError("Quran.com words are required", "QUSX_ADAPTER");
  const lexicalWords = verse.words.filter((word) => (word.char_type_name ?? word.charTypeName) !== "end");
  const words = lexicalWords.map((word, index) => {
    const text = word.text_qpc_hafs ?? word.text_uthmani ?? word.text ?? word.textUthmani;
    if (typeof text !== "string" || !text.trim()) throw new QusxError(`Quran.com word ${index + 1} has no supported text field`, "QUSX_ADAPTER");
    return { position: positive(word.position ?? index + 1, "word position"), text: text.normalize("NFC"), providerId: word.id, location: word.location };
  });
  return result("quran.com", options.tradition ?? "hafs-kufi", Number(match[1]), Number(match[2]), words, verse);
}

export function normalizeKfgqpcAyah(record, options = {}) {
  if (!record || typeof record !== "object") throw new QusxError("KFGQPC ayah record is required", "QUSX_ADAPTER");
  const surah = positive(record.sura_no ?? record.sora, "sura_no");
  const ayah = positive(record.aya_no, "aya_no");
  if (typeof record.aya_text !== "string" || !record.aya_text.trim()) throw new QusxError("KFGQPC aya_text is required", "QUSX_ADAPTER");
  const tokens = record.aya_text.trim().split(/\s+/u).filter((token) => !/^[\u0660-\u0669\u06f0-\u06f9\ufb50-\ufdff\ufe70-\ufeff]+$/u.test(token));
  const words = tokens.map((text, index) => ({ position: index + 1, text: text.normalize("NFC") }));
  return result("kfgqpc", options.tradition ?? "unknown-kfgqpc", surah, ayah, words, record);
}

export function normalizeAlQuranCloudAyah(input, options = {}) {
  const record = input?.data ?? input;
  if (!record || typeof record !== "object") throw new QusxError("AlQuran Cloud ayah record is required", "QUSX_ADAPTER");
  const surah = positive(record.surah?.number, "surah.number");
  const ayah = positive(record.numberInSurah, "numberInSurah");
  if (typeof record.text !== "string" || !record.text.trim()) throw new QusxError("AlQuran Cloud text is required", "QUSX_ADAPTER");
  if (!options.tradition) throw new QusxError("AlQuran Cloud adapter requires an explicit tradition", "QUSX_ADAPTER");
  const tokens = record.text.replace(/^\uFEFF/u, "").trim().split(/\s+/u);
  const words = tokens.map((text, index) => ({ position: index + 1, text: text.normalize("NFC") }));
  return result("alquran.cloud", options.tradition, surah, ayah, words, record);
}
