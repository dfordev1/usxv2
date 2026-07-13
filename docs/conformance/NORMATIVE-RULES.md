# QUSX v1 — Normative conformance rules

**Status: DRAFT for review. Normative once accepted.** This document defines
what it means for a document to *be* QUSX, independently of any particular
implementation. `src/validate.js` and the Schematron schema
(`schema/qusx.sch`) are two implementations of these rules; where an
implementation and this document disagree, **this document is authoritative**
and the implementation has a bug.

Each rule has a stable identifier (`QUSX-XXX-NNN`). Identifiers are permanent:
once assigned, a number is never reused for a different rule, and a rule's
meaning never changes under the same id (a changed rule gets a new id and the
old one is marked withdrawn). Every conformance-suite fixture and every
validator error message cites the rule id(s) it exercises or reports.

Rule categories:

| Prefix | Category | Conformance level (see `CONFORMANCE.md`) |
|---|---|---|
| `QUSX-WF`  | XML well-formedness | L0 |
| `QUSX-STR` | Structural / grammar (XSD-expressible) | L1 |
| `QUSX-HDR` | Header (`<qusx>` attribute) semantics | L2 |
| `QUSX-PIN` | Milestone sid/eid pairing & axis rules | L2 |
| `QUSX-AYH` | Ayah numbering | L2 |
| `QUSX-WRD` | Word id / position | L2 |
| `QUSX-TRD` | Tradition consistency | L2 |
| `QUSX-NRM` | Text normalization | L2 |
| `QUSX-COR` | Corpus-wide totals & completeness | L3 |
| `QUSX-LAY` | Layout invariants | L3 |
| `QUSX-TXT` | Text-integrity classification | L4 |

The **Portable** column states whether the rule is checkable on a single
document with no external data or corpus context. Portable rules are (or can
be) expressed in Schematron and run by any XSLT/Schematron processor. Non-portable
rules need canonical reference data or the whole corpus and are implemented in
`src/validate.js` (or another corpus-aware tool); this split is itself
normative — see `CONFORMANCE.md`.

---

## L0 — Well-formedness (`QUSX-WF`)

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-WF-001` | The document MUST be well-formed XML per the W3C XML 1.0 recommendation. | yes |
| `QUSX-WF-002` | The document element MUST be `<qusx>`. | yes |
| `QUSX-WF-003` | No element may carry the same attribute name twice. (Well-formed XML already forbids this; stated as a rule because a regex/streaming reader that tolerates it must still reject it.) | yes |

## L1 — Structural / grammar (`QUSX-STR`)

These are exactly the constraints `schema/qusx.xsd` expresses. A document at L1
MUST validate against that XSD.

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-STR-001` | `<qusx>` MUST carry all required attributes: `version`, `surah`, `name`, `nameArabic`, `ayahCount`, `revelationPlace`, `bismillahPre`, `tradition`. | yes |
| `QUSX-STR-002` | `surah` MUST be an integer 1–114. | yes |
| `QUSX-STR-003` | `ayahCount` MUST be an integer 1–286. | yes |
| `QUSX-STR-004` | `revelationPlace` MUST be `makkah` or `madinah`. | yes |
| `QUSX-STR-005` | `bismillahPre` MUST be an `xs:boolean` (`true`/`false`). | yes |
| `QUSX-STR-006` | `tradition` MUST be a value of the `traditionCode` enumeration. | yes |
| `QUSX-STR-007` | Every child of `<qusx>` MUST be one of: `juz`, `manzil`, `hizb`, `rub`, `ruku`, `page`, `line`, `ayah`, `word`, `sajda`. | yes |
| `QUSX-STR-008` | `<word>` MUST carry `id` and `position`, both positive integers. | yes |
| `QUSX-STR-009` | `<word>`'s `type`, if present, MUST be `number`. | yes |
| `QUSX-STR-010` | `<sajda>` MUST carry `number` (positive integer), `type` (`required`\|`optional`), and `verseKey` (matching `[0-9]{1,3}:[0-9]{1,3}`). | yes |
| `QUSX-STR-011` | A milestone pin's `fragment`, if present, MUST be `whole`, `start`, `middle`, or `end`. | yes |

## L2 — Header semantics (`QUSX-HDR`)

Cross-checks of `<qusx>` attributes against canonical surah facts. **Non-portable**
(needs `data/raw/quran-metadata-surah-name.json`), except `QUSX-HDR-001`.

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-HDR-001` | The filename, when it matches `NNN.qusx.xml`, MUST encode the same surah number as the `surah` attribute. Files not matching that pattern are outside the corpus naming convention and reported as such. | yes (filename only) |
| `QUSX-HDR-002` | `name` MUST equal the canonical simple name for `surah`. | no |
| `QUSX-HDR-003` | `nameArabic` MUST equal the canonical Arabic name for `surah`. | no |
| `QUSX-HDR-004` | `revelationPlace` MUST equal the canonical revelation place for `surah`. | no |
| `QUSX-HDR-005` | `bismillahPre` MUST equal the canonical bismillah-pre flag for `surah`. | no |
| `QUSX-HDR-006` | `ayahCount` MUST equal the expected ayah count for (`surah`, `tradition`). For Hafs, that is the canonical count. For a recognized non-Hafs tradition with verified per-tradition counts, it is that tradition's count. For a recognized non-Hafs tradition with **no** verified count data, this rule is **not evaluated** (a skip, not a pass or fail) — see `QUSX-TRD-002`. | no |

## L2 — Milestone sid/eid pairing (`QUSX-PIN`)

The milestone axes are: `juz`, `manzil`, `hizb`, `rub`, `ruku`, `page`, `line`,
`ayah`. Each opening pin carries `sid` (start id); each closing pin carries
`eid` (end id). All `QUSX-PIN` rules are **portable** (single-document,
no external data).

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-PIN-001` | A milestone element MUST carry exactly one of `sid` or `eid` (XOR) — never both, never neither. | yes |
| `QUSX-PIN-002` | An opening pin (`sid`) MUST carry the axis's required opening attributes: all axes require `number`; `ayah` additionally requires `tradition`. | yes |
| `QUSX-PIN-003` | Every `sid` value MUST be unique within the document. | yes |
| `QUSX-PIN-004` | Within a single axis, an opening pin MUST NOT appear while a previous pin on the same axis is still open. (An axis is single-range at a time; ayah N+1 cannot open before ayah N closes.) | yes |
| `QUSX-PIN-005` | A closing pin (`eid`) MUST match the currently-open `sid` on the same axis; a mismatched or unpaired `eid` is a violation. | yes |
| `QUSX-PIN-006` | Every `sid` MUST be closed by a matching `eid` before end of document; no axis may remain open at end of document. | yes |
| `QUSX-PIN-007` | **Cross-axis overlap is EXPLICITLY PERMITTED.** Axes are independent; a `page` or `line` range may begin and end mid-`ayah`, and juz/hizb/rub ranges may cross ayah boundaries. An implementation MUST NOT require milestone axes to nest within one another in document order. (This is the core reason QUSX uses milestones rather than nested elements; see `src/validate.js` header note and USX's own rationale.) | yes |

### Fragment behavior

`fragment` records how much of a multi-surah range (`juz`/`hizb`/`rub`/`manzil`/`ruku`)
lives in this single-surah file. It is meaningful only on the opening (`sid`) pin.

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-PIN-008` | `fragment`, if present, MUST appear on an opening (`sid`) pin, not a closing (`eid`) pin. | yes |
| `QUSX-PIN-009` | `fragment="whole"` asserts the entire range is contained in this file; `start`/`middle`/`end` assert this file holds the opening / an interior / the closing portion of a range that spans multiple surah files. These values are **descriptive metadata**; v1 does NOT require cross-file reconstruction to validate them (a corpus-level checker MAY, as an L3 extension — reserved, not required in v1). | yes (shape only) |

## L2 — Ayah numbering (`QUSX-AYH`)

All portable.

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-AYH-001` | The sequence of opening `ayah` `number` values, in document order, MUST be exactly `1, 2, …, ayahCount` — each number once, contiguous, ascending, with no gaps and no repeats. | yes |

## L2 — Word id / position (`QUSX-WRD`)

All portable.

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-WRD-001` | `<word>` `id` MUST be strictly increasing in document order across the whole file (a single monotonic sequence, not per-ayah). | yes |
| `QUSX-WRD-002` | `<word>` `position` MUST count `1..N` within each ayah, resetting to 1 at each ayah opening pin. | yes |
| `QUSX-WRD-003` | Every `<word>` MUST appear inside an open `ayah` range (between that ayah's `sid` and `eid`). Words outside any ayah are a violation. | yes |

## L2 — Tradition consistency (`QUSX-TRD`)

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-TRD-001` | Every `ayah` opening pin's `tradition` MUST equal the root `<qusx>` `tradition`. A file MUST NOT mix traditions. | yes |
| `QUSX-TRD-002` | The root `tradition` classifies the file's conformance profile: `hafs-kufi` is the v1 **core** profile; other `traditionCode` values are **experimental** profiles (see `CONFORMANCE.md` §v1 scope). An experimental-profile document is never a v1-core conformance failure or success — it is evaluated only against the experimental profile. | yes |

## L2 — Normalization (`QUSX-NRM`)

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-NRM-001` | If `<qusx normalization="NFC">`, every `<word>`'s text content MUST already be in Unicode NFC. | yes |
| `QUSX-NRM-002` | `normalization`, if present, is a claim the producer makes about its own text; a value other than `NFC` is permitted (e.g. `NFC-no-tashkeel`) but only `NFC` triggers the `QUSX-NRM-001` check in v1. Other values are producer-declared and not v1-validated. | yes |

## L3 — Corpus totals & completeness (`QUSX-COR`)

**Non-portable** (needs the whole corpus). Evaluated over a complete
single-tradition, single-layout corpus.

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-COR-001` | A complete Hafs corpus MUST contain exactly 114 surah files, one per surah 1–114. | no |
| `QUSX-COR-002` | Corpus-wide ayah total MUST be 6236 (Hafs). | no |
| `QUSX-COR-003` | Corpus-wide word total MUST be 83668 (Hafs, counting the word stream as generated). | no |
| `QUSX-COR-004` | Corpus-wide sajda total MUST be 15. | no |
| `QUSX-COR-005` | Corpus-wide ruku total MUST be 558. | no |

## L3 — Layout invariants (`QUSX-LAY`)

**Non-portable.**

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-LAY-001` | The highest `page` `number` across a layout's corpus MUST equal that print edition's known page count (e.g. madani-v2 = 604, indopak-15 = 610). | no |
| `QUSX-LAY-002` | For a given surah, the `<word>` text-and-morphology sequence MUST be byte-identical across every layout. Only `page`/`line` placement may differ between layouts; word text, `root`, `stem`, and `lemma` may not. | no |

## L4 — Text-integrity classification (`QUSX-TXT`)

**Non-portable** (needs the external Tanzil reference). See
`data/external/TEXT_INTEGRITY_PROVENANCE.md`.

| Rule | Requirement | Portable |
|---|---|---|
| `QUSX-TXT-001` | QUL raw text MUST match Tanzil's full-options export on the committed baseline count (6230/6236 raw); a drop below that is a regression. | no |
| `QUSX-TXT-002` | With the committed formatting-correction overlay applied, the match MUST reach 6234/6236, and the residual mismatch set MUST be exactly `{11:13, 80:25}` — no new mismatch, no silent disappearance. | no |

---

## Rule index (for tooling)

A machine-readable list of all rule ids lives in
`test/conformance/rules.json`, generated to stay in sync with this document.
That file is the contract the fixture manifest and validators cite; this
document is its human-readable normative source.
