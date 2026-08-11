import { QusxError } from "./index.mjs";
import { normalizeAlQuranCloudAyah, normalizeQuranComVerse } from "./adapters.mjs";

const PROVIDERS = Object.freeze(["quran.com", "alquran.cloud"]);

function reference(value) {
  const match = /^(?:[1-9]|[1-9]\d|10\d|11[0-4]):[1-9]\d*$/.exec(value ?? "");
  if (!match) throw new QusxError(`Invalid ayah reference: ${value}`, "QUSX_PROVIDER");
  return value;
}

function surahNumber(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 114) throw new QusxError(`Invalid surah number: ${value}`, "QUSX_PROVIDER");
  return number;
}

async function json(fetchImpl, url) {
  const response = await fetchImpl(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new QusxError(`Provider request failed: ${response.status} ${response.statusText}`, "QUSX_PROVIDER");
  return response.json();
}

export function createProvider(name, options = {}) {
  if (!PROVIDERS.includes(name)) throw new QusxError(`Unknown provider: ${name}`, "QUSX_PROVIDER");
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new QusxError("No fetch implementation is available", "QUSX_PROVIDER");
  const baseUrl = (options.baseUrl ?? (name === "quran.com" ? "https://api.quran.com/api/v4" : "https://api.alquran.cloud/v1")).replace(/\/$/, "");
  const tradition = options.tradition ?? (name === "quran.com" ? "hafs-kufi" : undefined);
  if (!tradition) throw new QusxError(`${name} provider requires an explicit tradition`, "QUSX_PROVIDER");
  const edition = options.edition ?? "quran-uthmani";

  return Object.freeze({
    name,
    tradition,
    async getAyah(value) {
      const key = reference(value);
      if (name === "quran.com") {
        const payload = await json(fetchImpl, `${baseUrl}/verses/by_key/${key}?words=true&word_fields=text_qpc_hafs`);
        return normalizeQuranComVerse(payload, { tradition });
      }
      const payload = await json(fetchImpl, `${baseUrl}/ayah/${key}/${encodeURIComponent(edition)}`);
      return normalizeAlQuranCloudAyah(payload, { tradition });
    },
    async getSurah(value) {
      const number = surahNumber(value);
      if (name === "quran.com") {
        const payload = await json(fetchImpl, `${baseUrl}/verses/by_chapter/${number}?words=true&word_fields=text_qpc_hafs&per_page=300`);
        if (!Array.isArray(payload.verses)) throw new QusxError("Quran.com verses array is required", "QUSX_PROVIDER");
        return Object.freeze(payload.verses.map((verse) => normalizeQuranComVerse(verse, { tradition })));
      }
      const payload = await json(fetchImpl, `${baseUrl}/surah/${number}/${encodeURIComponent(edition)}`);
      if (!Array.isArray(payload?.data?.ayahs)) throw new QusxError("AlQuran Cloud ayahs array is required", "QUSX_PROVIDER");
      return Object.freeze(payload.data.ayahs.map((ayah) => normalizeAlQuranCloudAyah({
        ...ayah,
        surah: ayah.surah ?? { number: payload.data.number },
      }, { tradition })));
    },
  });
}

export function listProviders() {
  return PROVIDERS;
}
