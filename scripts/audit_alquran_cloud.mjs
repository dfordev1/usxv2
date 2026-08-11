#!/usr/bin/env node
import { normalizeAlQuranCloudAyah } from "../sdk/adapters.mjs";

const endpoint = process.argv[2] ?? "https://api.alquran.cloud/v1/ayah/1:1/quran-uthmani";
const response = await fetch(endpoint, { headers: { accept: "application/json" } });
if (!response.ok) throw new Error(`AlQuran Cloud request failed: ${response.status} ${response.statusText}`);
const payload = await response.json();
if (payload.code !== 200 || payload.status !== "OK") throw new Error(`Unexpected AlQuran Cloud envelope: ${JSON.stringify({ code: payload.code, status: payload.status })}`);
const verse = normalizeAlQuranCloudAyah(payload, { tradition: "hafs-kufi" });
if (verse.reference !== "1:1" || verse.words.length !== 4 || !verse.text) throw new Error("Normalized pilot response failed its invariants");
console.log(JSON.stringify({ endpoint, source: verse.source, reference: verse.reference, tradition: verse.tradition, words: verse.words.length, edition: verse.providerRecord.edition?.identifier, status: "PASS" }, null, 2));
