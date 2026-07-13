# Data licensing — separate from the code license

**The repository's root `LICENSE` (MIT) covers the QUSX code, schema, and
scripts. It does NOT cover the data under `data/` or the generated output.**
This file is a per-source summary so a consumer never assumes the root MIT
license applies to bundled data. `THIRD_PARTY_NOTICES.md` has the full detail,
retrieval dates, and caveats; this is the at-a-glance table.

Integrity: every bundled source file's SHA-256 is recorded in
`data/SOURCE_HASHES.json` and checked in CI (`scripts/hash_sources.js`).

| Data | Source | License status | Redistribute? |
|---|---|---|---|
| `data/raw/` (Uthmani text, metadata, morphology) | [QUL / TarteelAI](https://qul.tarteel.ai/resources) | Informal grant ("download and package with your own project"), **no formal license file** | Check QUL's current terms first |
| `data/layouts/` (all 9 Mushaf layout DBs) | [QUL / TarteelAI](https://qul.tarteel.ai/resources/mushaf-layout) | Same as above | Check QUL's terms first |
| `data/traditions/*_surah.json`, `*_markers.json` | [quranpedia/quran-svg](https://github.com/quranpedia/quran-svg) | **CC0 1.0 (public domain)** — confirmed via LICENSE + commit history | Yes, freely |
| `data/traditions/text/*-text.json` (Warsh/Qalun/Douri/Shubah/Susi per-ayah Arabic text) | [thetruetruth/quran-data-kfgqpc](https://github.com/thetruetruth/quran-data-kfgqpc), a mirror of King Fahd Complex font packages | **NOT formally verified.** No LICENSE file; only a "for developer" README note. Included on a judgment call that KFGQPC's own permissive terms (confirmed via quran-svg) likely extend to this derived text — see `THIRD_PARTY_NOTICES.md` | **Treat as unverified** — confirm with KFGQPC / the maintainer before redistributing |
| `data/external/quran-uthmani.manifest.json` | [spqrxi/quranchecksum](https://github.com/spqrxi/quranchecksum) | MIT (hashes only, no Quran text) | Yes |
| `data/external/tanzil-uthmani-full-options.xml` | [Tanzil Project](https://tanzil.net/download/), downloaded directly with pause marks/sajdah signs/rub-el-hizb/tatweel/sequential-tanween all enabled | Creative Commons Attribution 3.0 (license block embedded in the file itself; verbatim copies only, no changes) | Yes, verbatim only — do not alter |
| `data/diff-report.json` | Derived by this project from quran-svg counts | This project's analysis output | Yes (MIT); underlying counts are CC0 |
| Files this project generates (`data/traditions/ayah-counts.json`, `*-ayah-boundaries.json`, `docs/*.xlsx`) | Generated here | MIT (this repo); underlying data per rows above | Yes, subject to underlying data terms |

**The Qur'anic text itself is not subject to copyright and may be freely
reproduced, but must never be altered and its sanctity must be preserved.**
The licensing above concerns the *encoding, formatting, and derived data*, not
the sacred text.

## Generated output (`output/`, `output-pilot/`)

Covered by this repo's MIT license as far as the *format and generation* go,
but each file's underlying **text and morphology originate from the sources
above** and carry those terms. In particular, `output-pilot/` for the four
pilot traditions embeds the "NOT formally verified" KFGQPC-derived text — the
same caveat applies to redistributing pilot output.
