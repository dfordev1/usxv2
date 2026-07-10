# QUSX — Prior Art & Data Sources

Compiled while researching a unified Quranic milestone-markup standard (companion to
Itqan community threads /d/549, /d/501, /d/246).

## Data sources pulled and verified

| Source | What it gives QUSX | Status |
|---|---|---|
| [QUL (qul.tarteel.ai)](https://qul.tarteel.ai/resources) | Uthmani word-by-word text, ayah/juz/hizb/rub/ruku/manzil/sajda metadata, word root/stem/lemma, KFGQPC V2 Mushaf layout (604 pages x 15 lines) | Downloaded, schema mapped, join key confirmed: `surah:ayah:word` |
| [quranpedia/quran-svg](https://github.com/quranpedia/quran-svg) | Ayah-polygon boundary data across **6 mushaf editions / 5 qira'at** (Hafs, Warsh, Qalun x2, Douri, Shubah) | Diffed programmatically — 55/114 surahs have real ayah-count divergence across traditions |
| [Quran Foundation API](https://api-docs.quran.foundation) (`quran` GitHub org) | Canonical content API; also backs `open-quran-view`'s layout data | Referenced, not yet pulled directly |
| [quran-mcp](https://github.com/quran/quran-mcp) | Live hosted MCP server (`mcp.quran.ai`) — multi-qira'at text, 50+ translations, 15+ tafsirs, morphology | Live service, not yet connected |
| [spqrxi/quranchecksum](https://github.com/spqrxi/quranchecksum) | Independent MIT-licensed verse-level SHA-256 integrity manifest, built from Tanzil's KFGQPC-verified Uthmani text | **Integrated** — `src/checksum-verify.js` cross-checks QUL's text against it; 1,125/6,236 verses match byte-for-byte, rest differ by documented QPC-vs-Tanzil encoding convention (not content errors) |

## Independent prior art confirming the layout/milestone model

| Project | Approach | Relevance |
|---|---|---|
| [open-quran-view](https://github.com/adelpro/open-quran-view) (Adel bin Yahya) | Page → Line[] → Word[] JSON, keyed by `verseKey: "surah:verse"`, word-level `charType`/`position`/QCF glyph code | Near-identical schema to QUSX's page/line/word model, arrived at independently — strong validation |
| [DigitalKhatt](https://github.com/DigitalKhatt) (sponsored by TarteelAI) | **Algorithmic typesetting**: Metafont-based variable font + HarfBuzz Arabic-justification fork, computes line/page breaks by simulating classical calligraphy rules rather than storing pre-computed positions | Alternative paradigm to pre-computed layout databases — worth citing as a contrast |
| [open-mushaf-native](https://github.com/adelpro/open-mushaf-native), [mushaf-imad-expo](https://github.com/adelpro/mushaf-imad-expo) | Page-image-based rendering | Cited in itqan.dev/d/246 as the "100% accurate but heavy" baseline approach |
| Java-Quran-Web | `quran_layout.csv`, 15-line format | Same page/line convention, simpler format |

## Key community discussions referenced

- **[/d/549](https://community.itqan.dev/d/549/2)** — original post analyzing the Bible USX/USFM standard as a model for Quranic data unification; Ola Saleh's reply introduces the milestone-pin concept this project builds on.
- **[/d/501](https://community.itqan.dev/d/501)** — Libyan Awqaf Mushaf (Qalun) open-data release by Abdullah Obeid / Quranpedia; source of the `quran-svg` repo.
- **[/d/246](https://community.itqan.dev/d/246/7)** — "Best way to render the Mushaf to match print exactly" — community independently converging on the same page/line/word layout-database requirement, citing QCF font + layout as the "ideal but unrealized" solution.

## The fragmentation argument

Three independent projects (QUL/TarteelAI, quran-svg/Quranpedia, open-quran-view/Adel
bin Yahya) have each built their own version of essentially the same page→line→word
layout model, with no shared schema between them. This is the argument for a unified
QUSX standard: the underlying data conventions have already converged organically —
what's missing is a shared markup format so these efforts stop duplicating work.
