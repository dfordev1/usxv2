# QUSX v1 — Conformance levels & scope

**Status: DRAFT for review.** Defines the layered conformance model, what "v1"
covers, and the normative split between portable and corpus-aware checking.
The rules themselves live in [`NORMATIVE-RULES.md`](NORMATIVE-RULES.md);
compatibility/versioning policy in [`COMPATIBILITY.md`](COMPATIBILITY.md).

## Conformance levels

Levels are cumulative: a document at level N satisfies every rule at levels
0..N. A producer or consumer states which level it targets. Each level maps to
concrete rule categories in `NORMATIVE-RULES.md`.

| Level | Name | Means | Checked by | Rule categories |
|---|---|---|---|---|
| **L0** | XML well-formed | Parses as XML 1.0; root is `<qusx>`; no duplicate attributes. | any XML parser | `QUSX-WF` |
| **L1** | XSD structurally valid | Validates against `schema/qusx.xsd` — correct element/attribute grammar, enumerations, datatypes. | any XSD 1.0 processor (`scripts/xsd_validate.py`) | `QUSX-STR` |
| **L2** | Semantically conforming | Every single-document semantic rule holds: sid/eid pairing, ayah numbering, word positions, tradition consistency, normalization, and (with reference data) header cross-checks. | Schematron for portable rules (`schema/qusx.sch`); `src/validate.js` for the reference-data-dependent header rules | `QUSX-HDR`, `QUSX-PIN`, `QUSX-AYH`, `QUSX-WRD`, `QUSX-TRD`, `QUSX-NRM` |
| **L3** | Complete Hafs corpus | A full 114-file, single-tradition, single-layout corpus with correct corpus-wide totals, page counts, and cross-layout word identity. | `src/validate.js` (corpus mode) | `QUSX-COR`, `QUSX-LAY` |
| **L4** | Text-integrity verified | The corpus's underlying text matches the independent Tanzil reference at the committed, classified baseline. | `scripts/checksum-verify-full-options.js` | `QUSX-TXT` |

A single QUSX file can reach at most **L2** on its own. **L3** and **L4** are
properties of a *corpus*, not a file.

### Portable vs. corpus-aware — a normative split, not an accident

- **Portable rules** (`QUSX-WF`, `QUSX-STR`, most of `QUSX-PIN`/`QUSX-AYH`/`QUSX-WRD`/`QUSX-TRD`/`QUSX-NRM`, and `QUSX-HDR-001`) are checkable on one document with no external data. These are expressed in the XSD (L1) and the Schematron schema (L2) so that **any conforming implementation can verify them without reading this project's JavaScript**.
- **Corpus-aware / reference-data rules** (`QUSX-HDR-002..006`, all `QUSX-COR`, `QUSX-LAY`, `QUSX-TXT`) need canonical surah facts, the full corpus, or the external Tanzil reference. These stay in `src/validate.js` and the integrity scripts. The Schematron schema does **not** attempt them, and that is correct, not a gap.

This split is why the acceptance criterion "another implementation can run the
fixtures without reading JavaScript source" is satisfiable: everything a third
party needs to independently check L0–L2 portable rules is in the XSD, the
Schematron schema, and the fixture manifest.

## v1 scope (explicit)

**In scope and normative for v1:**

- The **Hafs/Kufi core profile** (`tradition="hafs-kufi"`). This is the
  conformance target. "A conforming QUSX v1 document/corpus" means the
  Hafs core profile unless an experimental profile is explicitly named.
- All 10 currently-integrated print layouts, for L3/L4 corpus checking.
- The milestone axes, word stream, morphology, sajda, and header model as
  defined in `NORMATIVE-RULES.md`.

**In scope but experimental (not a v1 conformance target):**

- **Non-Hafs traditions** (`warsh-kfqc`, `qalon-kfqc`, `douri-kfqc`,
  `shubah-kfqc`) are **experimental profiles**. Their pilot output
  (`output-pilot/`) is validated for L0/L1/L2 structural + pairing rules, but
  their header/corpus totals are **not** v1-normative (numbering-only, no
  morphology or page/line pins; license status unverified — see README Known
  gaps). A v1-core claim never depends on them, and their being incomplete is
  never a v1-core failure.
- Al-Susi (`sousi-kfqc`) remains outside even the experimental set — not in the
  XSD enum, quarantined by design (`output-pilot/sousi/NONCONFORMING.md`).

**Explicitly NOT v1 blockers:**

- **Unsupported layouts** (Digital Khatt, Ligature Basd SVG Mushaf) are not
  wired in. This is a coverage gap, not a conformance failure: v1 conformance
  is defined over the layouts that *are* present, and adding a layout later is
  a backward-compatible extension (see `COMPATIBILITY.md`).
- **Rasm/text-variant support** for non-Hafs traditions (differing wording, not
  just verse boundaries) is out of v1 scope entirely.

## How a consumer states conformance

- "QUSX v1 L2" — this document is semantically conforming (single file).
- "QUSX v1 L3 (Hafs, madani-v2)" — this corpus is a complete, valid Hafs corpus
  in the madani-v2 layout.
- "QUSX v1 L4 (Hafs)" — additionally text-integrity-verified against the
  committed Tanzil baseline.
- "QUSX v1 experimental profile (warsh-kfqc), L2" — a non-Hafs pilot file that
  passes portable semantic rules, with no L3/L4 claim.
