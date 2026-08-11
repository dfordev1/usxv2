import { readFile } from "node:fs/promises";
import { createAlignmentClient, createAyahMappingClient, parseQusx } from "./index.mjs";

const ALIGNMENT_URL = new URL("../data/alignments/normative-v1.json", import.meta.url);
const MAPPING_URL = new URL("../data/alignments/boundary-v1.json", import.meta.url);
const REVIEW_URLS = Object.freeze({ 63: new URL("../data/review/surah-063-review-v1.json", import.meta.url) });

export async function readQusx(path, options) {
  return parseQusx(await readFile(path, "utf8"), options);
}

export async function loadBundledAlignment() {
  return createAlignmentClient(await readFile(ALIGNMENT_URL, "utf8"));
}

export async function loadBundledAyahMapping() {
  return createAyahMappingClient(await readFile(MAPPING_URL, "utf8"));
}

export async function validateQusxFile(path, options) {
  try {
    const document = await readQusx(path, options);
    return Object.freeze({ valid: true, path: String(path), errors: Object.freeze([]), metadata: document.metadata, wordCount: document.words.length });
  } catch (error) {
    return Object.freeze({ valid: false, path: String(path), errors: Object.freeze([error instanceof Error ? error.message : String(error)]) });
  }
}

export async function loadBundledSurahReview(surah) {
  const number = Number(surah);
  const url = REVIEW_URLS[number];
  if (!url) throw new Error(`No bundled complete-surah review for surah ${surah}`);
  return JSON.parse(await readFile(url, "utf8"));
}

export * from "./index.mjs";
