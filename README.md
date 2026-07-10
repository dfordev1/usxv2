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

Generator is complete and validated against real data for **all 114 surahs**:

| Metric | Generated | Expected |
|---|---|---|
| Ayah pins | 6236 | 6236 (Hafs/Kufi count) |
| Word tokens | 83668 | 83668 |
| Sajda pins | 15 | 15 (standard Hafs list) |

Currently ships **one tradition (Hafs/Kufi)** with real word-level text, morphology,
and page/line layout. Multi-tradition ayah pins (Qalun, Warsh, Douri, Shu'bah) are
proven out in the interactive demo but not yet merged into the generator — see
[Known gaps](#known-gaps).

## Quick start

```bash
node src/generate.js 1        # generate one surah -> output/001.qusx.xml
node src/generate.js 1 2 7    # generate several surahs
node src/generate.js all      # generate the whole Qur'an -> output/*.qusx.xml
```

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
| `<page>` / `<line>` | Milestone pin | From a specific print edition's layout (currently KFGQPC V2 / Madani) |
| `<juz>` / `<hizb>` / `<rub>` / `<manzil>` | Milestone pin | Standard 30/60/240/7-way divisions |
| `<sajda>` | Point marker (non-paired) | Fires once at the ayah containing a prostration point; `type` = `required`/`optional` |

Boundary tags follow the USX convention: `sid` opens a range, a matching bare `eid`
closes it. Coarser structures (juz/manzil/hizb/rub) open before finer ones
(page/line/ayah) and close after them, so ranges nest correctly even though the
underlying word stream is flat.

## Data sources

All raw data lives in `data/` and was pulled from:

- **[QUL](https://qul.tarteel.ai)** (TarteelAI) — Uthmani word-by-word text, ayah/juz/hizb/rub/ruku/manzil/sajda metadata, word root/stem/lemma, KFGQPC V2 Mushaf layout. See `data/raw/`.
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
2. **Only one print layout is wired in** (KFGQPC V2 Madani, 604 pages). QUL has 11
   more layouts (IndoPak variants, Libyan Awqaf, etc.) already downloaded in
   principle but not yet joined into the generator.
3. **No schema validation (XSD/RelaxNG) yet** — output is well-formed XML (verified
   by aggregate word/ayah/sajda counts against known totals) but not schema-checked.

## Project layout

```
qusx/
├── src/generate.js          # the generator
├── data/
│   ├── raw/                 # QUL exports (text, metadata, morphology, layout)
│   └── diff-report.json     # our derived per-surah ayah-count deltas across traditions
├── output/                  # generated *.qusx.xml, one per surah
├── LICENSE                  # MIT (code/schema only — see note on bundled data)
├── package.json
└── docs/
    └── prior-art-references.md
```
