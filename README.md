<p align="center">
  <img src="assets/banner.png" alt="QUSX — Unified Scripture-style Markup for the Qur'an. One text, many layers, zero duplication." width="100%">
</p>

<p align="center">
  <a href="https://github.com/dfordev1/usxv2/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-33564F.svg"></a>
  <a href="https://nodejs.org"><img alt="Node >=22" src="https://img.shields.io/badge/node-%3E%3D22-33564F.svg"></a>
  <img alt="570 files, 0 validation errors" src="https://img.shields.io/badge/validated-570%20files%2C%200%20errors-3f7d4f.svg">
  <img alt="5 Mushaf layouts" src="https://img.shields.io/badge/layouts-5-9c7a3c.svg">
  <a href="https://community.itqan.dev/d/549/2"><img alt="Itqan community discussion" src="https://img.shields.io/badge/discussion-Itqan%20community-33564F.svg"></a>
</p>

# QUSX — a milestone-based XML standard for the Qur'an

**QUSX (Qur'an Unified Scripture XML)** is a data standard for representing Qur'anic
text, modeled directly on the Bible's **USX/USFM** milestone-markup convention (see
[`docs/prior-art-references.md`](docs/prior-art-references.md)). Instead of nesting
Qur'anic text inside a rigid surah → ayah → word tree, the Mushaf is treated as **one
flat stream of words**, sliced by independent boundary pins (`sid`/`eid`) for every
structural layer a Quran app actually needs: ayah, page, line, juz, hizb, rub, manzil,
sajda. Multiple qira'at/riwayat numbering traditions and multiple print-edition
layouts can coexist over that *same* text stream — without duplicating a single
letter.

Born out of a discussion on the [Itqan community](https://community.itqan.dev)
(threads [`/d/549`](https://community.itqan.dev/d/549), [`/d/501`](https://community.itqan.dev/d/501), [`/d/246`](https://community.itqan.dev/d/246))
about the lack of a unified Quranic data standard, and how the Bible's Digital Bible
Library / USX ecosystem solved the same problem — Scripture text served consistently
across 1,773 languages — for Bible software.

## Table of contents

- [Why this exists](#why-this-exists)
- [Status](#status)
- [Quick start](#quick-start)
- [Example output](#example-output-al-fatihah-abridged)
- [Tag reference](#tag-reference)
- [Data sources](#data-sources)
- [Validating and viewing](#validating-and-viewing)
- [Known gaps](#known-gaps)
- [Project layout](#project-layout)

## Why this exists

<p align="center">
  <img src="assets/overview.png" alt="Diagram: one word stream sliced independently by juz, hizb, rub, page, line, and ayah (Hafs and Qalun) boundary pins, plus a real QUSX XML snippet for Al-Fatihah." width="100%">
</p>

Building a Qur'an app or API today usually means maintaining several *separate*,
easy-to-desync datasets: one for page-accurate rendering (matching a specific printed
Mushaf), one for searchable/structured text, one for word-level morphology, and — for
apps supporting more than one riwayah — a full duplicate text per riwayah. Every
independent Quranic-data project we surveyed (QUL, quran-svg, quranhub,
open-quran-view) reinvents a similar-but-incompatible page/line/word schema to solve
this same problem.

QUSX's flat word-stream + independent milestone pins means **one file serves every
view**: an app walks `sid`/`eid` pairs to reconstruct whichever slice it needs — an
ayah, a printed page, a juz, a riwayah's numbering — without re-fetching or
duplicating the underlying text.

## Status

Generator is complete and validated against real data for **all 114 surahs, across 5
print layouts** (570 files total):

| Layout | Pages | Ayah pins | Word tokens | Sajda pins |
|---|---|---|---|---|
| KFGQPC V2 (1421H, default) | 604 | 6236 | 83668 | 15 |
| KFGQPC V1 (1405H) | 604 | 6236 | 83668 | 15 |
| QPC V4 Tajweed (1441H) | 604 | 6236 | 83668 | 15 |
| Mushaf Qatar | 604 | 6236 | 83668 | 15 |
| IndoPak 15-line (Qudratullah) | **610** | 6236 | 83668 | 15 |

Text/ayah/word/sajda counts are identical across layouts (same underlying Hafs/Kufi
text) — only page/line placement changes per print edition, and IndoPak correctly
comes out to 610 pages instead of 604, matching its real-world pagination.

`src/validate.js` additionally checks real semantic invariants — every `sid` has
exactly one matching `eid`, no axis is opened twice without closing, ayah numbers run
1..N with no gaps — against a formal shape defined in [`schema/qusx.xsd`](schema/qusx.xsd).
**All 570 generated files pass with 0 errors.** [`viewer/viewer.html`](viewer/viewer.html)
parses the generator's raw output with the browser's own `DOMParser` and renders it,
so the format is proven consumable end-to-end, not just internally consistent.

Currently ships **one tradition (Hafs/Kufi)** with real word-level text and
morphology. Multi-tradition ayah pins (Qalun, Warsh, Douri, Shu'bah) are proven out
in the interactive demo but not yet merged into the generator — see
[Known gaps](#known-gaps).

## Quick start

```bash
node src/generate.js 1                        # generate one surah, default layout (KFGQPC V2) -> output/madani-v2/001.qusx.xml
node src/generate.js --layout=indopak-15 all  # generate the whole Qur'an in a different layout
node src/generate.js all                      # generate the whole Qur'an, default layout
```

Available `--layout` keys: `madani-v2` (default), `madani-v1`, `madani-v4-tajweed`,
`qatar`, `indopak-15`.

Requires Node 22+ (uses the built-in `node:sqlite` module).

## Example output (Al-Fatihah, abridged)

```xml
<qusx version="0.1" surah="1" name="Al-Fatihah" nameArabic="الفاتحة" ayahCount="7"
      revelationPlace="makkah" bismillahPre="false" tradition="hafs-kufi">
  <juz number="1" sid="juz:1"/>
  <manzil number="1" sid="manzil:1"/>
  <hizb number="1" sid="hizb:1"/>
  <rub number="1" sid="rub:1"/>
  <page number="1" sid="page:1"/>
  <line number="2" sid="page:1:line:2"/>
  <ayah number="1" tradition="hafs-kufi" sid="1:1:hafs-kufi"/>
  <word id="1" position="1" root="س   م   و" stem="سْمِ" lemma="اسْم">بِسْمِ</word>
  <word id="2" position="2" root="ا ل ه" stem="اللَّهِ" lemma="اللَّه">ٱللَّهِ</word>
  ...
  <ayah eid="1:1:hafs-kufi"/>
  ...
</qusx>
```

An app reassembles any ayah, page, juz, or word-with-morphology by walking between
matching `sid`/`eid` pairs over the same underlying word stream — no duplicated text
for different layouts or traditions.

## Tag reference

| Tag | Role | Notes |
|---|---|---|
| `<qusx>` | Root, one per surah | `tradition` attr = active ayah-counting scheme |
| `<word>` | Base text unit (leaf) | `id` = global mushaf position, `position` = index within ayah, `root`/`stem`/`lemma` = morphology embeds |
| `<ayah>` | Milestone pin | `tradition` attr allows multiple counting schemes over the same word stream |
| `<page>` / `<line>` | Milestone pin | From a specific print edition's layout — see `<qusx layout="...">` on the root element |
| `<juz>` / `<hizb>` / `<rub>` / `<manzil>` | Milestone pin | Standard 30/60/240/7-way divisions — see [`docs/quranic-structural-glossary.xlsx`](docs/quranic-structural-glossary.xlsx) for definitions |
| `<sajda>` | Point marker (non-paired) | Fires once at the ayah containing a prostration point; `type` = `required`/`optional` |

Boundary tags follow the USX convention: `sid` opens a range, a matching bare `eid`
closes it. Each axis (juz/manzil/hizb/rub/page/line/ayah) is independently
well-paired — but axes are **not** required to nest inside one another in document
order. `page`/`line` are word-position-based and legitimately cross `ayah` (and
sometimes `juz`/`hizb`/`rub`) boundaries mid-ayah — e.g. Sūrat An-Nās ayah 3 is split
across two lines in the KFGQPC V2 layout. That crossing is exactly the "overlapping
structures" problem milestone markup exists to solve; see it live in
`viewer/viewer.html`.

## Data sources

All raw data lives in `data/` and was pulled from:

- **[QUL](https://qul.tarteel.ai)** (TarteelAI) — Uthmani word-by-word text, ayah/juz/hizb/rub/ruku/manzil/sajda metadata, word root/stem/lemma (`data/raw/`), and 5 Mushaf layouts — KFGQPC V1/V2/V4-tajweed, Mushaf Qatar, IndoPak 15-line (`data/layouts/`).
- **[quranpedia/quran-svg](https://github.com/quranpedia/quran-svg)** — per-surah ayah counts across 6 mushaf editions/5 qira'at, used to derive multi-tradition boundary deltas. Our derived analysis is in `data/diff-report.json`; the source repo's raw files are *not* bundled here since it currently has no published license — see it directly if you need the underlying polygon/page data.

Full citation list and independent prior-art (open-quran-view, DigitalKhatt) in
[`docs/prior-art-references.md`](docs/prior-art-references.md). A standalone
reference workbook of every structural term (juz, hizb, rub, manzil, ruku, sajda,
surah), built from the same real QUL data, is in
[`docs/quranic-structural-glossary.xlsx`](docs/quranic-structural-glossary.xlsx).

## Validating and viewing

```bash
node src/validate.js all                       # conformance-check every generated file, all layouts
node src/validate.js --layout=indopak-15 all    # check just one layout
```

Open `viewer/viewer.html` directly in a browser to see two real generated files
(Al-Fātiḥah and An-Nās) parsed live and rendered, with a raw-XML toggle and
click-to-inspect on every word.

## Text integrity

```bash
node src/checksum-verify.js   # compare QUL's Uthmani text against an independent SHA-256 manifest
```

This cross-checks our word data against the verse-level manifest from
[spqrxi/quranchecksum](https://github.com/spqrxi/quranchecksum), an independent
MIT-licensed tool built from Tanzil's KFGQPC-verified Uthmani text. **Result: 1,125 /
6,236 verses match byte-for-byte; the rest differ in Unicode encoding convention, not
content.** QUL's text follows the **QPC (King Fahd Complex glyph-font) Uthmani
convention** — e.g. representing the superscript alef with a tatweel spacer
(`ـٰ`, U+0640 U+0670) in ~3,638 verses, and using the wasla-alef (`ٱ`, U+0671) where
Tanzil's own transcription uses different codepoint choices for the same
pronunciation. This is a documented, legitimate divergence between two widely-used
"Uthmani script" encodings (`quranchecksum`'s own spec calls this out explicitly), not
an error in either source — but it's worth knowing before assuming byte-identity
between QUSX output and Tanzil-sourced tooling.

## Known gaps

1. **Multi-tradition pins aren't in the generator yet.** `quran-svg`'s data gives
   per-surah ayah-count deltas (55/114 surahs differ) and pinpoints *which page* a
   tradition's numbering first diverges from Hafs, but not the exact *word* where an
   ayah boundary moves — that repo stores click polygons, not per-word Qalun/Warsh
   text. Sourcing actual word-level Qalun/Warsh text (e.g. from Tanzil) is the
   blocking step before `<ayah tradition="qalon">` can be generated for real.
2. **5 of QUL's 12 print layouts are wired in** (KFGQPC V1/V2/V4-tajweed, Mushaf
   Qatar, IndoPak 15-line). The remaining 7 (other IndoPak line counts, Digital
   Khatt, Libyan Awqaf, etc.) follow the same pattern in `LAYOUTS` in
   `src/generate.js` — just need downloading and registering.

This is a v0.1 prototype open for review and contribution, not a finished standard —
see the [Itqan community thread](https://community.itqan.dev/d/549/2) for ongoing
discussion.

## Project layout

```
qusx/
├── src/
│   ├── generate.js          # the generator
│   └── validate.js          # conformance checker
├── schema/qusx.xsd           # formal element/attribute shape
├── viewer/viewer.html        # live DOMParser-based viewer (self-contained)
├── data/
│   ├── raw/                 # QUL exports (text, metadata, morphology, default layout)
│   ├── layouts/              # 4 additional QUL Mushaf layout databases
│   └── diff-report.json     # our derived per-surah ayah-count deltas across traditions
├── output/<layout-key>/     # generated *.qusx.xml, one per surah per layout
├── assets/                  # banner and diagram images
├── LICENSE                  # MIT (code/schema only — see note on bundled data)
├── package.json
└── docs/
    ├── prior-art-references.md
    └── quranic-structural-glossary.xlsx
```
