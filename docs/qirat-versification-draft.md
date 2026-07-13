# Qirā'āt versification mapping — draft format

**Status: design draft, not implemented.** Only surah-level ayah *counts* are
verified below (real data). All verse-level mappings are TODO — populating
them needs either the `quran-svg` tagging bug fixed, or a scholarly source for
the actual Ḥafṣ↔Warsh boundary differences.

## The idea

Bible tooling (`usfm-bible/usfmtc`) already solved this exact problem —
different traditions numbering the same text differently — with a plain-text
mapping file (`.vrs`):

```
GEN 31:55 = GEN 32:1
```

We're adapting the idea for Qur'an traditions, not their book-code syntax.

## Design: hub-and-spoke, not pairwise

Their real implementation maps every tradition to/from one canonical
reference set, rather than tradition-to-tradition directly. With 5 Qur'an
traditions in scope, that's 5 mapping files (each to Ḥafṣ as canonical)
instead of up to 10 pairwise files.

Two mechanics worth reusing:
- **Equal-length ranges auto-zip 1:1** — `32:1-32 = 32:2-33` means verse-by-
  verse, not a blob. Only real merges/splits need individual lines.
- **`&` prefix** = one-to-many shorthand for verse-merge/split cases.

## Proposed format: `.qvrs`

```
# Tradition: warsh-kfqc  →  Canonical: hafs-kufi
# Format: SURAH:AYAH[-AYAH] = SURAH:AYAH[-AYAH]
# Surahs with identical numbering need no entry.

# Verified count divergence (quranpedia/quran-svg, 2026-07-12) — 50 surahs
# differ, e.g.:
# 106  hafs=4  warsh=5
# (full list: see CHANGELOG)

# Actual boundary mappings — none populated yet, e.g.:
# 106:1-2 = 106:1     <- illustrative only, NOT verified real data
```

## How this plugs into QUSX

A non-Ḥafṣ file would carry `tradition="warsh-kfqc"` on its `<ayah>` pins,
with `number=` resolved through the `.qvrs` mapping — same idea as
`usfmtc`'s `reversify()`, reimplemented for our pin model.

## Simpler alternative for some cases: `altnumber`

USX's `<verse>` element has an `altnumber` attribute — a second verse number
printed alongside the main one, for traditions that number the same content
differently. For surahs where only the *number* shifts (boundaries stay in
the same place), this is simpler than a full `.qvrs` mapping — put it
directly on the `<ayah>` pin: `<ayah number="4" altnumber="5" tradition="warsh" sid/>`.

**Limit:** doesn't work where traditions actually split/merge verses (e.g.
Quraysh: 4 ayahs in Ḥafṣ vs 5 in Warsh — the boundary itself moves, not just
the label). Those genuinely need the `.qvrs` range-mapping approach above. We
don't yet know how many of the 50 divergent surahs are simple renumbering vs.
real boundary shifts — that's still blocked on real per-ayah data.

## Other ideas worth considering (from the same repo, not yet designed)

- **Speaker attribution** — USX's `Milestone` schema supports a `who`
  attribute on nested quotation spans. Directly relevant to Qur'an text,
  where many verses are direct speech (Allah, a prophet, Iblīs, etc.) —
  nothing in QUSX currently tags who's speaking in a given span.
- **USJ (JSON serialization)** — USX has an official, mechanical JSON twin
  (same document, `type`/`marker`/attributes/content instead of XML tags). A
  "QUSJ" equivalent would make QUSX usable without an XML parser — relevant
  since most Itqan community projects are JS/mobile apps.
- **Peripheral content** — a structural home for surah introductions, tafsir
  notes, or glossary entries, separate from the main word stream.
- **Footnote element** — anchored commentary/tafsir annotation tied to an
  exact text span.
- **Figure element** — could reference real Mushaf page images (once
  `quran-svg`'s tagging bug is fixed).

None of these are designed yet — listed here so they aren't lost, not as
commitments.

## Open questions

1. Where do the real mappings come from — fixed `quran-svg` data, or a
   scholarly reference table?
2. Does QUSX v1 model numbering only, or rasm/text variants too? (Abdullah
   Obeid's open question — this file only ever solves numbering.)
3. How many of the 50 divergent surahs are simple renumbering (→ `altnumber`
   suffices) vs. genuine boundary shifts (→ needs `.qvrs`)? Unknown until we
   have real per-ayah data.
