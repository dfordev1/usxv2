# Text-integrity provenance record

One consolidated record of every source, retrieval detail, and decision behind
the text-integrity work in [`README.md`](../../README.md#text-integrity). The
README tells the story; this file is the reference sheet — dates, URLs,
hashes, exact download options, and the residual-verse decisions in one place,
not scattered across prose.

## Two distinct claims — do not conflate them

1. **Historical checksum-manifest target** (`src/checksum-verify.js`,
   `scripts/checksum-baseline.js`): compares QUL's raw text against
   [spqrxi/quranchecksum](https://github.com/spqrxi/quranchecksum)'s manifest,
   which was built from **Tanzil's default export** (all 5 display options
   off) plus Tanzil's per-surah Bismillah attribute. Result: **1,125 / 6,236
   byte-for-byte** — expected and unremarkable once the configuration is
   known; **not** evidence of thousands of real text errors.
2. **Full-options source-equivalence check** (`scripts/checksum-verify-full-options.js`):
   compares QUL's raw text against **Tanzil's full-options export** (all 5
   display options on), the configuration QUL's own convention actually
   matches. Result: **6,230 / 6,236 raw**, **6,234 / 6,236** with the 4
   documented formatting corrections applied in a comparison layer that never
   touches source data. This is the claim that matters for "does QUSX's text
   agree with an independent source."

## Tanzil download details

- Source: [tanzil.net/download](https://tanzil.net/download/), via its own
  `pub/download/index.php` endpoint.
- Retrieved: 2026-07-13.
- Quran type: `uthmani`.
- License: Creative Commons Attribution 3.0 (license block embedded verbatim
  in the downloaded file itself — see `data/LICENSES.md`).

| File | Options (marks / sajdah / rub / tatweel / stanween) | Output type | SHA-256 |
|---|---|---|---|
| `tanzil-uthmani-full-options.xml` (committed, hash-tracked in `data/SOURCE_HASHES.json`) | all 5 **on** | XML | `af9311c521b5dadab01ea1ef259c281ffa83cf224bad24ee89469ce1c3c72916` |
| (not committed — used only to reproduce the manifest during investigation) | all 5 **off** (Tanzil's default; params omitted, not `=false` — sending literal `false` was found to be silently ignored by the endpoint) | XML | not committed; reproducible from the URL below |

Full-options URL used (option params `true`, `outType=xml`):
```
https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=xml&marks=true&sajdah=true&rub=true&tatweel=true&stanween=true&agree=true
```
Default-export URL used (params omitted entirely, not `=false`):
```
https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=xml&agree=true
```

## Bismillah behavior

Tanzil's XML export exposes a `bismillah` attribute on the first `<aya>` of
every surah except Al-Fātiḥah (which *is* the Bismillah) and At-Tawbah (which
has none). **Surahs 95 (At-Tin) and 97 (Al-Qadr) use a special form with
shadda on the bā'** (`بِّسْمِ...`, not the usual `بِسْمِ...`) — confirmed
directly by reading the attribute value in the downloaded XML, not assumed
from prior README prose. Using this per-surah attribute (not a single
hardcoded Bismillah string) is what reproduces the quranchecksum manifest
exactly: 6,236 / 6,236.

## quranchecksum manifest

- Source: [spqrxi/quranchecksum](https://github.com/spqrxi/quranchecksum), MIT
  license (hashes only, no Quran text).
- File: `data/external/quran-uthmani.manifest.json`, SHA-256
  `3e3b32c5a1e6548cbaaa3ed64aa340bda2fb94b946d2359a9adac7d91b00a657`.
- The manifest's own metadata does **not** record which Tanzil export options
  were used to build it — this was the root cause of the entire investigation
  (see `README.md`'s 2026-07-13 root-cause finding). Reproduced exactly using
  the default-export configuration above; not something we can change
  upstream in the manifest itself, only document here.

## quran.com cross-check

- Source: [quran.com v4 API](https://api.quran.com/api/v4/quran/verses/uthmani),
  fetched live, 2026-07-13, one request per verse key for all 6 residual
  verses (`?verse_key=5:52`, `11:13`, `11:31`, `18:1`, `27:26`, `80:25`).
- Not committed as a file (live API, not a static download) — the exact
  request URLs and returned `text_uthmani` values are recorded in
  `scripts/checksum-verify-full-options.js`'s comments and
  `data/external/qul-orthographic-review.md`.
- Caveat, stated plainly: quran.com's Uthmani text likely shares lineage with
  Tanzil's, so agreement between the two is corroborating evidence, not two
  fully independent confirmations.

## The 6 residual verses — final decisions

| Verse | Class | Decision | Where |
|---|---|---|---|
| 5:52 | formatting | **Corrected** (comparison layer only) | `data/external/qul-text-corrections.json` |
| 11:31 | formatting | **Corrected** (comparison layer only) | `data/external/qul-text-corrections.json` |
| 18:1 | formatting | **Corrected** (comparison layer only) | `data/external/qul-text-corrections.json` |
| 27:26 | formatting | **Corrected** (comparison layer only) | `data/external/qul-text-corrections.json` |
| 11:13 | orthographic | **Not corrected — approved residual**, pending an authoritative primary-source review (e.g. Madinah Mushaf / KFGQPC) that this project has not performed | `data/external/qul-orthographic-review.md` |
| 80:25 | orthographic | **Not corrected — approved residual**, same reason | `data/external/qul-orthographic-review.md` |

**No local correction of 11:13 or 80:25 without an authoritative primary-source
decision.** Tanzil and quran.com agreeing is real corroborating evidence, not
a substitute for one — this project doesn't have reliable programmatic access
to a primary Madinah Mushaf/KFGQPC reference, and has not claimed to. CI
(`scripts/checksum-verify-full-options.js`, run via `npm run verify` and in
`.github/workflows/ci.yml`) fails if the residual set ever becomes anything
other than exactly `{11:13, 80:25}` — a third verse appearing, or one of these
two silently disappearing, both require an explicit, documented update to this
file and the script's `KNOWN_RESIDUAL` map, not a silent change.

**Recommended, not yet taken:** report 11:13 and 80:25 upstream to QUL,
citing this document and both corroborating sources. This project has not
filed that report — it needs a human decision on QUL's actual issue-tracking
channel.
