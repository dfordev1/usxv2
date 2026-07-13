# Multi-tradition support — status summary

**Purpose of this file:** a single, dated snapshot of the multi-tradition
work, since it's currently scattered across ~10 commits and CHANGELOG
entries. Written 2026-07-13. If this drifts from reality, trust the
CHANGELOG and the actual code/data over this file — it's a snapshot, not a
live source of truth.

## What actually works today

- **Main generator** (`src/generate.js`): Hafs/Kufi only, 10 print layouts,
  1140 files, real word-by-word text + morphology, full milestone pins
  (page/line/juz/hizb/rub/manzil/ruku/ayah/sajda). Fully validated (semantic
  + real XSD). This is the production-quality output.
- **Multi-tradition pilot** (`scripts/generate_tradition_pilot.js`): Warsh,
  Qalun, Al-Duri, Shu'bah — real Arabic text (verified to genuinely differ
  from Hafs at the rasm level, not a relabeled copy), real per-tradition
  ayah numbering, all 114 surahs each, all XSD-valid (456/456). Deliberately
  narrower than the main generator: no morphology, no page/juz/hizb/rub
  /manzil/ruku pins. Output in `output-pilot/`.
- Al-Susi generated too (114/114), but excluded from formal schema support
  — no verified count data, was never in the original licensed scope.

## How we got here (the short version)

1. Abdullah Obeid (Itqan community) licensed `quranpedia/quran-svg`'s
   numbering/position data as CC0.
2. Found and reported a real bug: the per-page JSON export has `surahNumber:
   0, ayahNumber: 0` on ~97% of sampled pages.
3. Worked around it: the SVG source files are correctly tagged even where
   the JSON isn't. Extracted clean per-ayah boundary data for 4/5
   traditions this way (Warsh/Qalun/Al-Duri/Shu'bah: 100% match).
4. Hafs itself had a *different* real gap in the SVG data (104 ayahs, verses
   inside surah title-headers). Found quranpedia.net's live API (via its own
   network requests) and used that instead — closed the gap completely.
5. Researched USX/USFM prior art (`usfm-bible/usfmtc`) for how the Bible
   world solves the identical "different traditions number verses
   differently" problem — versification mapping, hub-and-spoke design,
   `altnumber` attribute. See `docs/qirat-versification-draft.md`.
6. Found real per-ayah *text* (not just numbering) for 5 traditions via
   `thetruetruth/quran-data-kfgqpc`, a third-party mirror of King Fahd
   Complex's official font packages. Verified it's genuinely different rasm
   from Hafs, not a relabeled copy.
7. Built the pilot generator, tested on 2 surahs, then scaled to all 114 ×
   5 traditions. Found and fixed two real bugs along the way (a
   `validate.js` false-positive on Al-Susi, an attribute-order bug in the
   SVG extractor that produced a false "0 ayahs" result).
8. Researched (not fully resolved) an Al-Duri count discrepancy down to a
   specific, well-defined classical scholarly question.

## Open, unresolved

1. **License status of the pilot text source is a judgment call, not a
   confirmed clearance.** `thetruetruth/quran-data-kfgqpc` has no LICENSE
   file. Included on the reasoning that King Fahd Complex's own terms
   (confirmed permissive via `quran-svg`) likely extend to this derived
   data. See `THIRD_PARTY_NOTICES.md` for the full caveat.
2. **Al-Duri's surah 67 ayah count**: 30 (this text source) vs 31
   (`quran-svg`-derived). Narrowed to a real classical counting-school
   question (Basri vs Kufi vs Hijazi ʿadd al-āy) but not resolved — the
   actual Basri-school number needs a primary source (e.g. al-Dani's
   *al-Bayan fi ʿAdd Ay al-Qur'an*) not reachable from general search.
3. **Word-level text for the pilot traditions is per-ayah, not per-word.**
   The main generator's Hafs data has individual word IDs; the pilot's text
   would need real word-splitting to reach that granularity (whitespace
   split is what's done now — works, but hasn't been checked against edge
   cases like multi-word idioms or elongation marks affecting boundaries).
4. **Rasm/text-variant support is explicitly out of scope for v1** (decided,
   not just deferred) — QUSX only models numbering differences between
   traditions, not actual differing wording.

## Decided, not open

- QUSX v1 = numbering-only multi-tradition support. Full rasm-variant
  support is a separate, harder, future problem.
- Al-Susi stays a bonus/unsupported artifact until independently verified.
- The pilot generator stays separate from `src/generate.js` (which is
  tightly coupled to Hafs-canonical indexing throughout) rather than being
  force-merged.

## Good talking points for outside conversations (e.g. the Itqan community)

- Real per-tradition text was found and verified — not just numbering data.
- A real data bug was found, reported, and worked around independently.
- The license question is real and needs outside input — specifically
  worth asking Abdullah Obeid or King Fahd Complex directly, since he's
  already shown he can get exactly this kind of clarification fast.
- The Al-Duri classical-counting-school question is answerable by anyone
  with access to `al-Bayan fi ʿAdd Ay al-Qur'an` or equivalent — a concrete,
  specific ask, not a vague "does anyone know."
