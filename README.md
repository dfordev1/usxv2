# QUSX — Unified Scripture-style Markup for the Qur'an

A milestone-based XML schema for Qur'anic text, modeled on the Bible's USX/USFM
standard (see `docs/prior-art-references.md`). Instead of nesting text inside a
book → chapter → verse tree, the Mushaf is treated as **one flat stream of words**,
sliced by boundary pins (`sid`/`eid`) for every structural layer — ayah, page, line,
juz, hizb, rub, manzil, sajda. Multiple counting traditions can coexist over the same
text stream without duplicating a single letter (see `<ayah tradition="...">`).

Born out of a discussion on the [Itqan community](https://community.itqan.dev)
(threads `/d/549`, `/d/501`, `/d/246`) about the lack of a unified Quranic data
standard, and how the Bible's Digital Bible Library / USX ecosystem solved the same
problem for Scripture data at scale.

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
1..N with no gaps — against a formal shape defined in `schema/qusx.xsd`. **All 570
generated files pass with 0 errors.** `viewer/viewer.html` parses the generator's raw
output with the browser's own `DOMParser` and renders it, so the format is proven
consumable end-to-end, not just internally consistent.

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
| `<juz>` / `<hizb>` / `<rub>` / `<manzil>` | Milestone pin | Standard 30/60/240/7-way divisions |
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
`docs/prior-art-references.md`.

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

## Validating and viewing

```bash
node src/validate.js all                       # conformance-check every generated file, all layouts
node src/validate.js --layout=indopak-15 all    # check just one layout
```

Open `viewer/viewer.html` directly in a browser to see two real generated files
(Al-Fātiḥah and An-Nās) parsed live and rendered, with a raw-XML toggle and
click-to-inspect on every word.

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
├── LICENSE                  # MIT (code/schema only — see note on bundled data)
├── package.json
└── docs/
    └── prior-art-references.md
```
