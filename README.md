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

QUSX's flat word-stream + independent milestone pins means **one *per-surah* file
serves every view**: an app walks `sid`/`eid` pairs to reconstruct whichever slice it
needs within that surah — an ayah, a printed page, a juz fragment, a riwayah's
numbering — without re-fetching or duplicating the underlying text *within that
file*. To be precise about current scope: this project ships **570 files** (114
surahs × 5 layouts), and text/morphology *is* duplicated once per layout — a page-2
KFGQPC-V2 file and a page-2 IndoPak file both carry the full word text independently,
because layout is baked into each generated document rather than factored into a
separate referenceable layer. Whether/how to split text, morphology, and layout into
independently-combinable documents (so a layout change wouldn't require
regenerating the underlying text) is unresolved — see [Known gaps](#known-gaps).

## Status

Generator produces output for **all 114 surahs, across 5 print layouts** (570 files
total), checked against real data:

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

Two independent checks, not one: `src/validate.js` checks semantic invariants (every
`sid` has exactly one matching `eid`, no axis opened twice without closing, ayah
numbers run 1..N with no gaps) — **all 570 files pass, 0 errors.** Separately,
`scripts/xsd_validate.py` runs the actual [`schema/qusx.xsd`](schema/qusx.xsd)
through a real XML Schema processor (`lxml`/libxml2) — **all 570 files are also
XSD-valid.** These are deliberately two different tools checking different things
(structural shape vs. semantic pairing rules XSD 1.0 can't express); see
[Validating and viewing](#validating-and-viewing) for why both are needed.
[`viewer/viewer.html`](viewer/viewer.html) parses the generator's raw output with the
browser's own `DOMParser` and renders it, so the format is proven consumable
end-to-end, not just internally consistent.

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
| `<juz>` / `<hizb>` / `<rub>` / `<manzil>` / `<ruku>` | Milestone pin | Standard 30/60/240/7-way divisions, plus thematic ruku markers (558 total) — see [`docs/quranic-structural-glossary.xlsx`](docs/quranic-structural-glossary.xlsx) for definitions |
| `<sajda>` | Point marker (non-paired) | Fires once at the ayah containing a prostration point; `type` = `required`/`optional` |

Boundary tags follow the USX convention: `sid` opens a range, a matching bare `eid`
closes it. Each axis (juz/manzil/hizb/rub/page/line/ayah) is independently
well-paired — but axes are **not** required to nest inside one another in document
order. `page`/`line` are word-position-based and legitimately cross `ayah` (and
sometimes `juz`/`hizb`/`rub`) boundaries mid-ayah — e.g. Sūrat An-Nās ayah 3 is split
across two lines in the KFGQPC V2 layout. That crossing is exactly the "overlapping
structures" problem milestone markup exists to solve; see it live in
`viewer/viewer.html`.

**Known scoping limitation:** each `.qusx.xml` file covers one surah, so a
`juz`/`hizb`/`rub`/`manzil` that spans two surahs (e.g. Juz 1 covers all of Surah 1
and part of Surah 2) is written as **two separate fragments with the same
number** — `sid="juz:1"` opens and closes once in `001.qusx.xml`, then opens and
closes *again* in `002.qusx.xml`. Within a single file this is unambiguous (each
number appears at most once), but nothing in the format currently marks these as
fragments of one Quran-wide range rather than two coincidentally-numbered ranges —
a consumer that concatenates files needs to know this convention out of band. A
real fix (e.g. a `continues="true"` flag, or moving these particular axes to a
single whole-Quran document) is an open design question, not yet resolved.

## Data sources

All raw data lives in `data/` and was pulled from:

- **[QUL](https://qul.tarteel.ai)** (TarteelAI) — Uthmani word-by-word text, ayah/juz/hizb/rub/ruku/manzil/sajda metadata, word root/stem/lemma (`data/raw/`), and 5 Mushaf layouts — KFGQPC V1/V2/V4-tajweed, Mushaf Qatar, IndoPak 15-line (`data/layouts/`).
- **[quranpedia/quran-svg](https://github.com/quranpedia/quran-svg)** — per-surah ayah counts across 6 mushaf editions/5 qira'at, used to derive multi-tradition boundary deltas. Our derived analysis is in `data/diff-report.json`; the source repo's raw files are *not* bundled here since it currently has no published license — see it directly if you need the underlying polygon/page data.

Full citation list and independent prior-art (open-quran-view, DigitalKhatt) in
[`docs/prior-art-references.md`](docs/prior-art-references.md). A standalone
reference workbook of every structural term (juz, hizb, rub, manzil, ruku, sajda,
surah), built from the same real QUL data, is in
[`docs/quranic-structural-glossary.xlsx`](docs/quranic-structural-glossary.xlsx).
Exact per-file license/provenance terms for everything bundled are in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Validating and viewing

```bash
npm run verify                                  # everything below, in one command (also runs in CI on every push)
node src/validate.js all                        # conformance-check every generated file, all layouts (semantic invariants: sid/eid pairing, ayah sequencing, word-position continuity, corpus-wide totals)
python scripts/xsd_validate.py                  # validate against schema/qusx.xsd with a real XML Schema processor (lxml/libxml2)
node test/run_tests.js                          # negative tests: proves both validators above actually reject bad input, not just pass good input
```

CI (`.github/workflows/ci.yml`) runs all three on every push/PR.

`src/validate.js` is a hand-written semantic checker (sid/eid pairing, ayah
sequencing, required attributes by convention) — it is **not** an XSD validator and
was never a substitute for one. `scripts/xsd_validate.py` runs the actual
`schema/qusx.xsd` through `lxml` and confirms **570/570 generated files are valid**
against it. Note XSD 1.0 cannot express "sid XOR eid" as a structural constraint
(see the comment in `qusx.xsd`), so that specific rule is still enforced only by
`validate.js`, not by the schema itself — this is a real, stated scope split
between the two tools, not an oversight.

Open `viewer/viewer.html` directly in a browser to see two real generated files
(Al-Fātiḥah and An-Nās) parsed live and rendered, with a raw-XML toggle and
click-to-inspect on every word.

## Text integrity

```bash
node src/checksum-verify.js   # compare QUL's Uthmani text against an independent SHA-256 manifest
```

This cross-checks our word data against the verse-level manifest from
[spqrxi/quranchecksum](https://github.com/spqrxi/quranchecksum), an independent
MIT-licensed tool built from Tanzil's KFGQPC-verified Uthmani text.

**Result: 1,125 / 6,236 verses (18%) match byte-for-byte. Of the 5,111 that don't:**

| Cause | Verses | Explained? |
|---|---|---|
| Tatweel-spaced superscript alef (`ـٰ`, U+0640 U+0670) — QPC glyph-font convention | 3,581 | Yes — documented QPC-vs-Tanzil encoding difference, not a content error |
| Wasla-alef (`ٱ`, U+0671) codepoint choice, no tatweel | 989 | Yes — same category, different specific codepoint |
| **Neither pattern present** | **541** | **No — genuinely unexplained, not yet root-caused** |

The exit code from `checksum-verify.js` is **failure** when any mismatch exists, and
that's correct behavior — a partial explanation is not the same as a pass. The 4,570
verses covered by the two known encoding patterns are a legitimate, documented
divergence between two widely-used "Uthmani script" conventions (`quranchecksum`'s own
spec calls this exact scenario out). The remaining 541 are an open question this
project has not resolved, and this README does not claim otherwise. **This checksum
result establishes that QUL's text is internally reproducible and self-consistent —
it does not establish byte-for-byte equivalence with Tanzil or any other independent
canonical source**, and the 541 unexplained verses mean it cannot yet even fully
account for its own divergence from that source.

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
3. **Text/morphology are duplicated once per layout**, not factored into a
   separately-referenceable layer — see the [Why this exists](#why-this-exists)
   caveat.
4. **Juz/hizb/rub/manzil ranges that span two surahs are written as separate
   same-numbered fragments** in each surah's file, with no in-format marker that
   they're fragments of one Quran-wide range — see the note in
   [Tag reference](#tag-reference).
5. **541 of the 5,111 checksum mismatches (see [Text integrity](#text-integrity))
   are genuinely unexplained**, not just attributed to the known QPC-encoding
   pattern.
6. **Only ~13 of the ~150+ items from the fuller third-party review have been
   triaged and fixed** — the rest (data-model layering beyond #3, richer schema
   semantics, release/versioning policy beyond `CHANGELOG.md`, etc.) remain open.

**Closed since the audit:** real XSD compilation + validation (was previously only
regex-checked), CI (`.github/workflows/ci.yml`, including a deterministic-regeneration
check — committed output must exactly match a fresh build from source), 8 negative
tests proving the validators actually reject bad input (`test/`), word-position and
corpus-completeness checks in `validate.js`, filename/surah-name/count/place
cross-checks against canonical data, a closed `tradition` enum and
`surah`/`ayahCount` range constraints in the schema, `<ruku>` pins (data was
downloaded early on but sat unused), `generatorVersion` embedded in generated files,
`THIRD_PARTY_NOTICES.md`, `CONTRIBUTING.md`, and `CHANGELOG.md`.

This is a v0.1 research prototype open for review and contribution, not a
finished or formally released standard — see the
[Itqan community thread](https://community.itqan.dev/d/549/2) for ongoing
discussion. A structured third-party review surfaced ~160 gaps across schema
rigor, validator coverage, data-model layering, and release engineering; the
items above are the ones triaged and either fixed or explicitly tracked so far,
not an exhaustive list.

## Project layout

```
qusx/
├── .github/workflows/ci.yml   # runs validate.js + xsd_validate.py + test/ on every push
├── src/
│   ├── generate.js           # the generator
│   ├── validate.js           # semantic conformance checker (not an XSD validator)
│   └── checksum-verify.js    # cross-checks text against an independent SHA-256 manifest
├── scripts/
│   ├── xsd_validate.py       # real XSD validation via lxml (requirements.txt)
│   └── build_glossary_xlsx.py
├── test/
│   ├── run_tests.js          # negative tests: proves validators actually reject bad input
│   └── fixtures/             # deliberately malformed/invalid .qusx.xml files
├── schema/qusx.xsd            # formal element/attribute shape
├── viewer/viewer.html         # live DOMParser-based viewer (self-contained)
├── data/
│   ├── raw/                  # QUL exports (text, metadata, morphology, default layout)
│   ├── layouts/               # 4 additional QUL Mushaf layout databases
│   ├── external/              # third-party manifests (quranchecksum)
│   └── diff-report.json      # our derived per-surah ayah-count deltas across traditions
├── output/<layout-key>/      # generated *.qusx.xml, one per surah per layout
├── assets/                   # banner and diagram images
├── LICENSE                   # MIT (code/schema only — see note on bundled data)
├── THIRD_PARTY_NOTICES.md     # exact provenance/terms for every bundled dataset
├── CONTRIBUTING.md
├── CHANGELOG.md
├── requirements.txt           # Python deps for scripts/
├── package.json
└── docs/
    ├── prior-art-references.md
    └── quranic-structural-glossary.xlsx
```
