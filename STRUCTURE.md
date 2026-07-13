# QUSX repository structure

A map of what lives where and how the pieces connect. For *what QUSX is* and
why, see [`README.md`](README.md); for the normative data standard, see
[`docs/conformance/`](docs/conformance/).

## Top level

```
qusx/
├── README.md                 Project overview, tag reference, known gaps
├── STRUCTURE.md              This file
├── CHANGELOG.md              Chronological record (no formal releases yet)
├── CONTRIBUTING.md           How to regenerate/validate; what CI enforces
├── LICENSE                   MIT — covers CODE ONLY, not the data
├── THIRD_PARTY_NOTICES.md    Per-source provenance, retrieval dates, caveats
├── package.json              npm scripts (generate / validate / verify / …)
├── requirements.txt          Python deps (lxml, openpyxl)
│
├── src/                      Core tools (3 files)
├── scripts/                  Helper/one-off generators & checkers
├── schema/                   The data standard: XSD + Schematron
├── data/                     Bundled source inputs (third-party; see LICENSES)
├── output/                   Generated Hafs corpus, 10 layouts × 114 surahs
├── output-pilot/             Generated non-Hafs pilot corpus (experimental)
├── docs/                     Conformance spec, status docs, web app, examples
├── test/                     Fixtures + conformance suite + negative tests
├── viewer/                   Standalone single-file XML viewer (demo)
├── assets/                   README images
└── drafts/                   Local-only, gitignored (e.g. upstream reports)
```

## `src/` — core tools

| File | LOC | Role |
|---|---|---|
| `generate.js` | ~396 | Builds QUSX XML from `data/`. `--layout=<key>` selects a print layout; `--output-dir=` redirects output (used by tests). Emits one `NNN.qusx.xml` per surah. |
| `validate.js` | ~554 | Reference conformance checker. Enforces the L2/L3 semantic rules (sid/eid pairing, ayah numbering, word positions, tradition consistency, normalization, corpus totals, cross-layout identity). Every error cites a `[QUSX-XXX-NNN]` rule id. |
| `checksum-verify.js` | ~78 | Historical: compares QUL text to the quranchecksum manifest (default-export Tanzil config). Superseded framing — see `checksum-verify-full-options.js`. |

## `scripts/` — helpers

Grouped by purpose:

- **Generation / data build**: `generate_tradition_pilot.js` (non-Hafs pilots),
  `build_tradition_ayah_counts.js`, `extract_ayah_boundaries_from_svg.js`,
  `extract_ayah_boundaries_live_api.js`, `build_glossary_xlsx.py`.
- **Validation**: `xsd_validate.py` (XSD via lxml, main + `--pilot`),
  `schematron_validate.py` (portable L2 rules via ISO Schematron).
- **Text integrity**: `checksum-verify-full-options.js` (the primary check —
  QUL vs Tanzil full-options, 6234/6236 with the correction overlay),
  `checksum-baseline.js` (regression gate), `hash_sources.js` (SHA-256
  manifest of bundled sources).
- **Text-layer derivation**: `derive_no_tashkeel.js`,
  `derive_standardized_plain_text.js`.

## `schema/` — the data standard

| File | Role |
|---|---|
| `qusx.xsd` | Structural grammar (L1): elements, attributes, datatypes, enumerations. Any XSD 1.0 processor. |
| `qusx.sch` | ISO Schematron (L2 portable subset): sid/eid pairing rules and tradition consistency, each assertion tagged with its rule id. Any Schematron processor. |

These two files + `test/conformance/rules.json` + `docs/conformance/` are the
**portable contract**: a third party can validate QUSX without running any of
this project's JavaScript.

## `data/` — bundled source inputs

**Third-party data. NOT covered by the repo's MIT license** — see
[`data/LICENSES.md`](data/LICENSES.md) and `THIRD_PARTY_NOTICES.md`.

| Dir | Size | Contents |
|---|---|---|
| `data/raw/` | ~15M | QUL Uthmani word-by-word text, surah/ayah/juz/hizb/rub/ruku/manzil/sajda metadata, word root/stem/lemma DBs |
| `data/layouts/` | ~2.4M | 10 Mushaf print-layout SQLite DBs (page/line placement) |
| `data/traditions/` | ~18M | Non-Hafs per-ayah text + ayah-boundary/count data |
| `data/external/` | ~2.1M | Integrity references & decisions (see below) |

Integrity of every bundled source is pinned in `data/SOURCE_HASHES.json`
(SHA-256, checked in CI via `hash_sources.js`).

### `data/external/` — text-integrity artifacts

| File | Role |
|---|---|
| `quran-uthmani.manifest.json` | quranchecksum SHA-256 manifest (independent reference) |
| `tanzil-uthmani-full-options.xml` | Real Tanzil download (all 5 display options), the primary comparison target |
| `qul-text-corrections.json` | Transparent, versioned correction overlay — 4 formatting fixes applied at comparison time only, never to source |
| `qul-orthographic-review.md` | The 2 unresolved orthographic residuals (11:13, 80:25), pending upstream review |
| `TEXT_INTEGRITY_PROVENANCE.md` | Consolidated provenance: options, dates, hashes, decisions |
| `checksum-baseline.json`, `still-unexplained-verses.json` | Generated regression/analysis outputs |

## `output/` and `output-pilot/`

- `output/<layout>/NNN.qusx.xml` — the **Hafs core corpus**: 10 layouts ×
  114 surahs = **1,140 files**. This is the v1 conformance target.
- `output-pilot/<tradition>/NNN.qusx.xml` — **experimental** non-Hafs pilots
  (warsh, qalon, douri, shubah, sousi): 5 × 114 = **570 files**. Numbering
  only; not a v1 conformance target. `sousi/` is quarantined
  (`NONCONFORMING.md`).

Both are byte-for-byte reproducible from source; CI fails if a fresh build
differs (deterministic-regeneration gate).

## `docs/`

| Path | Role |
|---|---|
| `docs/conformance/` | **The normative v1 spec** — see below |
| `docs/multi-tradition-status.md` | Non-Hafs status snapshot & decisions |
| `docs/prior-art-references.md` | USX/USFM and versification prior art |
| `docs/qirat-versification-draft.md` | Qira'at / verse-counting notes |
| `docs/app/`, `docs/index.html` | The web app (GitHub Pages demo) |
| `docs/examples/` | Sample `.qusx.xml` files |

### `docs/conformance/` — the v1 standard

| File | Role |
|---|---|
| `NORMATIVE-RULES.md` | 46 rules with permanent ids (`QUSX-XXX-NNN`); the authoritative source |
| `CONFORMANCE.md` | The 5 conformance levels (L0–L4), portable-vs-corpus split, explicit v1 scope |
| `COMPATIBILITY.md` | Versioning, namespace, schema-version & extension policy |
| `MIGRATION-IMPACT.md` | Additivity proof for the conformance pass |

## `test/`

| Path | Role |
|---|---|
| `test/run_tests.js` | Negative + positive control tests (the `npm test` suite) |
| `test/fixtures/` | Legacy per-defect fixtures (reused by the conformance suite) |
| `test/conformance/rules.json` | Machine-readable rule index (the contract) |
| `test/conformance/manifest.json` | Per-fixture expected results + rule ids |
| `test/conformance/fixtures/` | One-rule-per-negative fixtures + a positive |
| `test/conformance/verify-manifest.js` | Manifest self-consistency check |
| `test/conformance/run-conformance.js` | Executable oracle: runs each fixture through XSD/Schematron/validate.js and confirms the targeted rule fires |
| `test/conformance/README.md` | How a third party consumes the suite without JS |

## Data flow

```
data/raw + data/layouts ──► src/generate.js ──► output/<layout>/*.xml
                                                      │
                          ┌───────────────────────────┤
                          ▼                            ▼
              src/validate.js (L2/L3)      scripts/xsd_validate.py (L1)
              schema/qusx.sch (L2 portable, via schematron_validate.py)
                          │
                          ▼
        scripts/checksum-verify-full-options.js  ──►  QUL vs Tanzil (L4)
```

## Conformance levels (quick reference)

| Level | Means | Checked by |
|---|---|---|
| L0 | Well-formed XML, `<qusx>` root | any parser |
| L1 | XSD-valid grammar | `xsd_validate.py` |
| L2 | Semantically conforming (single file) | `qusx.sch` (portable) + `validate.js` |
| L3 | Complete Hafs corpus (totals, pages, cross-layout identity) | `validate.js` |
| L4 | Text-integrity verified vs Tanzil | `checksum-verify-full-options.js` |

## What CI enforces (`.github/workflows/ci.yml`)

Source-data integrity → XSD → semantic (`validate.js`) → negative tests →
conformance suite (manifest + oracle) → Schematron → deterministic
regeneration (main + pilot) → text-integrity baseline + full-options →
working-tree-clean gate. `npm run verify` runs the same battery locally.
