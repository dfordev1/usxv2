<p align="center">
  <img src="assets/banner.png" alt="QUSX — Unified Scripture-style Markup for the Qur'an. One text, many layers, zero duplication." width="100%">
</p>

<p align="center">
  <a href="https://dfordev1.github.io/usxv2/app/"><img alt="Live demo" src="https://img.shields.io/badge/▶_live_demo-open_the_app-3f7d4f.svg"></a>
  <a href="https://github.com/dfordev1/usxv2/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-33564F.svg"></a>
  <a href="https://nodejs.org"><img alt="Node >=22" src="https://img.shields.io/badge/node-%3E%3D22-33564F.svg"></a>
  <img alt="1140 files, 0 validation errors" src="https://img.shields.io/badge/validated-1140%20files%2C%200%20errors-3f7d4f.svg">
  <img alt="10 Mushaf layouts" src="https://img.shields.io/badge/layouts-10-9c7a3c.svg">
  <a href="https://community.itqan.dev/d/549/2"><img alt="Itqan community discussion" src="https://img.shields.io/badge/discussion-Itqan%20community-33564F.svg"></a>
</p>

<p align="center">
  <b>▶ Try it live: <a href="https://dfordev1.github.io/usxv2/app/">dfordev1.github.io/usxv2/app</a></b> — read the Mushaf, compare traditions, and inspect any word, straight in the browser. No install.
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
- [JavaScript SDK](#javascript-sdk)
- [Status](#status)
- [Quick start](#quick-start)
- [Example output](#example-output-al-fatihah-abridged)
- [Tag reference](#tag-reference)
- [Data sources](#data-sources)
- [Validating and viewing](#validating-and-viewing)
- [Known gaps](#known-gaps)
- [Project layout](#project-layout)

## JavaScript SDK

Install the dependency-free parser in a Node.js or modern web project:

```sh
npm install quran-usx
```

```js
import { createQusxClient } from "quran-usx";

const qusx = createQusxClient({ layout: "madani-v1" });
const surah = await qusx.load(114);

console.log(surah.getAyah(3).recitationText);
console.log(surah.getLine(604, 13).words);
```

The npm package contains the parser, TypeScript declarations, and schema—not the 98 MB generated corpus. The client fetches individual surahs on demand; production users can point it at their own versioned CDN. See the [SDK guide](docs/sdk.md) for parsing, local-file, and query examples.

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
file*. To be precise about current scope: this project ships **1140 files** (114
surahs × 10 layouts), and text/morphology *is* duplicated once per layout — a page-2
KFGQPC-V2 file and a page-2 IndoPak file both carry the full word text independently,
because layout is baked into each generated document rather than factored into a
separate referenceable layer. Whether/how to split text, morphology, and layout into
independently-combinable documents (so a layout change wouldn't require
regenerating the underlying text) is unresolved — see [Known gaps](#known-gaps).

## Status

Generator produces output for **all 114 surahs, across 10 print layouts** (1140 files
total), checked against real data:

| Layout | Pages | Ayah pins | Word tokens | Sajda pins |
|---|---|---|---|---|
| KFGQPC V2 (1421H, default) | 604 | 6236 | 83668 | 15 |
| KFGQPC V1 (1405H) | 604 | 6236 | 83668 | 15 |
| QPC V4 Tajweed (1441H) | 604 | 6236 | 83668 | 15 |
| Mushaf Qatar | 604 | 6236 | 83668 | 15 |
| IndoPak 15-line (Qudratullah) | **610** | 6236 | 83668 | 15 |
| IndoPak 9-line (Gaba) | **1890** | 6236 | 83668 | 15 |
| IndoPak 13-line (Qudratullah) | **849** | 6236 | 83668 | 15 |
| IndoPak 13-line (Taj Company) | **847** | 6236 | 83668 | 15 |
| IndoPak 16-line (Taj Company) | **548** | 6236 | 83668 | 15 |
| KFGQPC Nastaleeq 15-line | 610 | 6236 | 83668 | 15 |

Text/ayah/word/sajda counts are identical across layouts (same underlying Hafs/Kufi
text) — only page/line placement changes per print edition, and each IndoPak/Nastaleeq
line-count variant correctly comes out to its own real-world page count instead of 604.

Two independent checks, not one: `src/validate.js` checks semantic invariants (every
`sid` has exactly one matching `eid`, no axis opened twice without closing, ayah
numbers run 1..N with no gaps) — **all 1140 files pass, 0 errors.** Separately,
`scripts/xsd_validate.py` runs the actual [`schema/qusx.xsd`](schema/qusx.xsd)
through a real XML Schema processor (`lxml`/libxml2) — **all 1140 files are also
XSD-valid.** These are deliberately two different tools checking different things
(structural shape vs. semantic pairing rules XSD 1.0 can't express); see
[Validating and viewing](#validating-and-viewing) for why both are needed.
[`viewer/viewer.html`](viewer/viewer.html) parses the generator's raw output with the
browser's own `DOMParser` and renders it, so the format is proven consumable
end-to-end, not just internally consistent.

The main generator (`src/generate.js`) ships **one tradition (Hafs/Kufi)** with real
word-level text, morphology (root/stem/lemma), and full page/juz/hizb/rub/manzil/ruku
milestone pins across all 10 print layouts (1140 files, all validated).

A **separate pilot generator** (`scripts/generate_tradition_pilot.js`) produces real,
XSD-valid ayah-numbering pins with real Arabic text for 5 more traditions — Warsh,
Qalun, Al-Duri, Shu'bah and Al-Susi (570 files, `output-pilot/`). Together with
Hafs, the research prototype covers six riwāyāt. This is genuinely real, not a demo: real per-tradition text,
verified to differ from Hafs at the rasm level, not a relabeled copy. It is
**deliberately narrower** than the main generator's output, though — no
morphology, and no page/juz/hizb/rub/manzil/ruku pins, since those would need
re-deriving against each tradition's own numbering, not yet done. It's also kept
as a separate script rather than merged into `src/generate.js`, since that
generator is tightly coupled to Hafs-canonical indexing throughout. See
[Known gaps](#known-gaps) for open questions (license status of the pilot's
text source, an unresolved Al-Duri count discrepancy, and whether QUSX should
model numbering-only or full rasm/text variants).

### Six-riwāyah alignment prototype

[`data/alignments/normative-v1.json`](data/alignments/normative-v1.json) is a
versioned companion alignment file containing three unique, source-authenticated
textual differences across all six riwāyāt. It uses stable slot IDs without
changing existing QUSX word IDs. Every rule maps Hafs, Shu'bah, Warsh, Qalun,
Al-Duri and Al-Susi, including an empty token list where a reading has no word at
that position. The JSON shape is defined by
[`schema/qusx-alignment.schema.json`](schema/qusx-alignment.schema.json), tested
by [`test/normative-alignment.test.js`](test/normative-alignment.test.js), and
published from the npm package as `quran-usx/alignment`.

The SDK now exposes `createAlignmentClient()` for reading/comparing slots and
`createAyahMappingClient()` for cross-riwāyah ayah navigation. The generated
ayah companion maps all 31,098 non-Hafs source ayahs through a Hafs hub and is
published as `quran-usx/ayah-mapping`. It is algorithmic research data; only the
three alignment rules above currently carry source-authenticated status. Optional
provider adapters (`quran-usx/adapters`) normalize Quran.com-style word arrays,
KFGQPC ayah records, and AlQuran Cloud whole-ayah responses into one
QUSX-compatible JSON shape. AlQuran Cloud requires an explicit tradition and
retains its edition record rather than inferring a riwayah from the provider's
identifier. See
[`docs/sdk.md`](docs/sdk.md).

The package also ships an executable CLI:

```bash
npx quran-usx@beta compare hafs warsh 57:24
npx quran-usx@beta map hafs warsh 2:1
npx quran-usx@beta validate ./001.qusx.xml
npx quran-usx@beta eight-summary
npx quran-usx@beta slot 63:11:11
```

Add `--json` for machine-readable output. `compare` reports all currently
reviewed alignment slots attached to the requested source ayah; an empty result
means no reviewed rule is published for that ayah, not that the recitations are
identical. `validate` performs the package's safe structural parser checks; the
repository's XSD, Schematron, and corpus-wide checks remain the complete
conformance gate.

For a unified live API interface, `quran-usx/providers` currently supports
Quran.com and AlQuran Cloud:

```js
import { createProvider } from "quran-usx/providers";

const provider = createProvider("quran.com");
const verse = await provider.getAyah("57:24");
const surah = await provider.getSurah(1);
```

The complete live Al-Fatihah pilot matches all seven ayahs between both
providers at letter and lexical-word-count level after provider presentation
marks are normalized. This is a compatibility layer, not part of the normative
QUSX XML standard.

The first complete-surah alignment review inventory is also bundled for Surah
63. It consolidates all eight generated observations across the five non-Hafs
sources into four unique locations, without claiming that any candidate has
been scholarly approved:

```bash
npx quran-usx@beta review 63
npx quran-usx@beta review 63 --json
```

See [`docs/surah-063-review.md`](docs/surah-063-review.md) for the reviewer
contract and decision vocabulary.

An additional eight-riwayah pilot converts Sheikh Talha bin Bashir's 77,432-row
parallel-word workbook into stable QUSX slots for Hafs, Shu'bah, Warsh, Qalun,
Al-Bazzi, Al-Duri, Qunbul, and Al-Susi. It produces a complete compressed dataset
and a focused queue of 937 substantive or split/join candidates. This materially
answers the practical alignment question, but does not replace scholarly review;
the records remain `source-derived-candidate-review-required`. See
[`docs/eight-riwayah-workbook.md`](docs/eight-riwayah-workbook.md).
Only the focused review queue is included in the npm package. The 3.5 MB full
parallel-text archive is repository-only pending explicit redistribution
permission.
The full letter-stream cross-check against a pinned eight-dataset KFGQPC mirror
found no unresolved substantive disagreements; its machine-readable hashes and
classified residuals are published in
[`data/alignments/eight-riwayah-mirror-audit-v1.json`](data/alignments/eight-riwayah-mirror-audit-v1.json).

Status is deliberately `source-authenticated-research-prototype`, not
`scholarly-certified`. Evidence and the authentication boundary are documented
in [`docs/alignment-authentication.md`](docs/alignment-authentication.md).

## Quick start

```bash
node src/generate.js 1                        # generate one surah, default layout (KFGQPC V2) -> output/madani-v2/001.qusx.xml
node src/generate.js --layout=indopak-15 all  # generate the whole Qur'an in a different layout
node src/generate.js all                      # generate the whole Qur'an, default layout
```

Available `--layout` keys: `madani-v2` (default), `madani-v1`, `madani-v4-tajweed`,
`qatar`, `indopak-15`, `indopak-9-gaba`, `indopak-13-qudratullah`, `indopak-13-taj`,
`indopak-16-taj`, `nastaleeq`.

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
| `<qusx>` | Root, one per surah | `tradition` = active ayah-counting scheme; `normalization="NFC"` states the text-encoding policy (checked by `validate.js`); `generatorVersion` self-declares what produced the file; `bismillahPre` — see note below |
| `<word>` | Base text unit (leaf) | `id` = global mushaf position, `position` = index within ayah, `type="number"` marks the ayah-ending verse-number glyph (not a lexical word — see below), `root`/`stem`/`lemma` = morphology embeds |
| `<ayah>` | Milestone pin | `tradition` attr allows multiple counting schemes over the same word stream |
| `<page>` / `<line>` | Milestone pin | From a specific print edition's layout — see `<qusx layout="...">` on the root element |
| `<juz>` / `<hizb>` / `<rub>` / `<manzil>` / `<ruku>` | Milestone pin | Standard 30/60/240/7-way divisions, plus thematic ruku markers (558 total); `fragment` (`whole`/`start`/`middle`/`end`) states whether this file's copy is the entire range or a piece of one spanning surahs — see below. Definitions in [`docs/quranic-structural-glossary.xlsx`](docs/quranic-structural-glossary.xlsx) |
| `<sajda>` | Point marker (non-paired) | Fires once at the ayah containing a prostration point; `type` = `required`/`optional`. **Precision limit, verified not fixable with current data:** QUL's sajda dataset only gives `verse_key` (ayah-level), not a word position — checked directly against `data/raw/quran-metadata-sajda.json`, which has no word field at all. The pin fires after the ayah's last word as the closest available approximation; pinning to the exact word would need a different/richer data source. |

**What `bismillahPre` means — verified, not assumed:** it's a **display-only flag**,
not a pointer to any `<word>` elements. Checked directly against real data: Surah
2's ayah 1 is just `الٓمٓ` (Alif-Lam-Meem) — no Basmalah words appear in the word
stream at all, even though `bismillahPre="true"`. This matches standard practice:
the opening formula printed atop most surahs is paratextual (a page heading, like
a surah's name), not part of the counted ayah text — except in Al-Fatihah, where
it genuinely *is* ayah 1 (and `bismillahPre="false"` there for exactly that
reason — it's already inside the ayah stream, not a separate heading), and
At-Tawbah, which has no Basmalah at all. A consumer wanting to *display* the
Basmalah before a surah needs to render it as static boilerplate text of their
own — QUSX doesn't carry it as data, and doing so would either duplicate the
Fatiha's actual ayah-1 text under a different guise or invent word elements with
no source-data backing.

Boundary tags follow the USX convention: `sid` opens a range, a matching bare `eid`
closes it. Each axis (juz/manzil/hizb/rub/page/line/ayah) is independently
well-paired — but axes are **not** required to nest inside one another in document
order. `page`/`line` are word-position-based and legitimately cross `ayah` (and
sometimes `juz`/`hizb`/`rub`) boundaries mid-ayah — e.g. Sūrat An-Nās ayah 3 is split
across two lines in the KFGQPC V2 layout. That crossing is exactly the "overlapping
structures" problem milestone markup exists to solve; see it live in
`viewer/viewer.html`.

**Cross-file fragment identity:** each `.qusx.xml` file covers one surah, so a
`juz`/`hizb`/`rub`/`manzil`/`ruku` that spans two surahs (e.g. Juz 1 covers all of
Surah 1 and part of Surah 2) is written once per file it touches — `sid="juz:1"`
opens and closes in `001.qusx.xml`, then opens and closes *again* in `002.qusx.xml`.
The `fragment` attribute on the opening pin disambiguates these explicitly:
`001.qusx.xml`'s `juz:1` carries `fragment="start"` (the range begins here), and
`002.qusx.xml`'s carries `fragment="end"` (continuation, ends here) — so a consumer
concatenating files can tell these are two pieces of *one* range, not two
coincidentally-numbered ones. A range entirely inside one surah (never crossing a
file boundary) gets `fragment="whole"`.

**What `tradition="hafs-kufi"` actually means:** the code is a deliberate compound,
not one flat label — `hafs` names the **recitation transmission** (riwāyah, i.e.
whose reading of Nafiʿ/ʿĀṣim/etc. this is) and `kufi` names the **ayah-counting
system** (ʿadd al-āy school) applied to it. These are two genuinely independent
axes — e.g. Warsh's transmission can in principle be counted by more than one
school — and the schema's closed `traditionCode` enum (see `schema/qusx.xsd`)
currently only has compound values for the specific transmission+counting pairs
this project has real per-surah data for (see `data/diff-report.json`), not a
general cross-product of every possible pairing.

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
`schema/qusx.xsd` through `lxml` and confirms **1140/1140 generated files are valid**
against it. Note XSD 1.0 cannot express "sid XOR eid" as a structural constraint
(see the comment in `qusx.xsd`), so that specific rule is still enforced only by
`validate.js`, not by the schema itself — this is a real, stated scope split
between the two tools, not an oversight.

**Hosted app (no install):** [dfordev1.github.io/usxv2/app](https://dfordev1.github.io/usxv2/app/)
— reads the full Mushaf across all 10 layouts, compares numbering traditions
side by side, and lets you inspect any word's morphology, fetching live from
this repo.

**Local single-file viewer:** open `viewer/viewer.html` directly in a browser
to see two real generated files (Al-Fātiḥah and An-Nās) parsed live and
rendered, with a raw-XML toggle and click-to-inspect on every word.

## Text integrity

```bash
node scripts/checksum-verify-full-options.js   # compare QUL's raw text directly against a real Tanzil export
node src/checksum-verify.js                    # (superseded framing, kept for history — see below)
python scripts/audit_qurancom.py madani-v1     # live independent audit of generated text/counts/structure against Quran.com
```

The Quran.com audit is deliberately separate from the deterministic offline
verification gate because it requires network access and compares against a
live external service. It checks all 6,236 generated ayahs plus each ayah's
page/juz/hizb/rub/manzil/ruku assignment. Exact glyph comparison is reported
separately from a letter-level comparison so differences in optional recitation
marks are not misreported as different Qur'anic letters.

For the full retrieval details (exact Tanzil download options/URLs, dates,
file hashes, Bismillah behavior) and the final per-verse decisions in one
place, see
[`data/external/TEXT_INTEGRITY_PROVENANCE.md`](data/external/TEXT_INTEGRITY_PROVENANCE.md).

**Root-cause finding, 2026-07-13 (supersedes everything below it in this
section): the "thousands of unexplained verses" figure was never mostly a
text-quality problem. It was an export-configuration mismatch.**

Tanzil's own download tool has five independent on/off options (pause marks,
sajdah signs, rub-el-hizb signs, tatweel-below-superscript-alef, sequential
tanween). [spqrxi/quranchecksum](https://github.com/spqrxi/quranchecksum)'s
manifest was built from one specific combination of those options, but never
recorded *which* combination in its own metadata — so a QUL convention that
matches a *different*, equally legitimate Tanzil export looked like thousands
of unexplained textual divergences, when it was actually one undocumented
download setting.

Verified directly by downloading both configurations live from tanzil.net's
own endpoint and diffing each against QUL's raw word data:
- Tanzil's **default export** (all 5 options off) + its own per-surah
  Bismillah attribute (see the Bismillah note below), hashed and compared to
  quranchecksum's manifest: **6,236 / 6,236 exact match.** This proves the
  manifest is a valid Tanzil export — just an undocumented one, not a
  different/wrong text.
- Tanzil's **full-options export** (all 5 options on) — the configuration
  QUL's own convention actually matches — compared directly to QUL's raw
  text, with **zero normalization needed**: **6,230 / 6,236 exact match.**

`scripts/checksum-verify-full-options.js` runs this second comparison (the
one that matters for "does QUSX's text agree with an independent source") and
is now part of `npm run verify` and CI. It compares against
`data/external/tanzil-uthmani-full-options.xml`, a real file downloaded
directly from tanzil.net (Creative Commons Attribution 3.0, license block
embedded in the file itself) and integrity-checked in `data/SOURCE_HASHES.json`
like every other bundled source.

**The 6 remaining differences, each individually investigated and classified**
(the script fails CI only if a *new*, unclassified mismatch appears):

| Verse | Class | What differs |
|---|---|---|
| 5:52 | formatting | QUL has a stray space inside a word: `دَآئِرَ ةٌۭ` vs `دَآئِرَةٌۭ` |
| 11:31 | formatting | QUL has a doubled space before a pause mark |
| 18:1 | formatting | QUL is missing a space before a pause mark |
| 27:26 | formatting | QUL has a stray U+200F (right-to-left mark) after the sajdah sign |
| 11:13 | **orthographic, needs review** | QUL: `افْتَرَاهُ` (plain alef). Tanzil: `ٱفْتَرَىٰهُ` (alef wasla + alef maksura/superscript alef) — a different encoded letter, not spacing |
| 80:25 | **orthographic, needs review** | QUL: `اَنَّا` (plain alef). Tanzil: `أَنَّا` (alef with hamza above) — a different encoded letter, not spacing |

**Cross-checked against a third source, 2026-07-13:** fetched all 6 verse keys live
from the [quran.com v4 API](https://api.quran.com/api/v4/quran/verses/uthmani) —
it agrees with Tanzil on every one of the 6, including both orthographic cases.
Quran.com's Uthmani text likely shares lineage with Tanzil's, so this isn't a
fully independent third source, but it is evidence that a second major,
actively-maintained platform disagrees with QUL's word-level data at exactly
these 6 positions — consistent with real QUL transcription defects rather than
a legitimate alternate convention.

**A transparent correction layer, not a silent edit, 2026-07-13:** the 4
formatting cases are now corrected — but only in a dedicated, committed,
versioned file, [`data/external/qul-text-corrections.json`](data/external/qul-text-corrections.json),
applied by `checksum-verify-full-options.js` when reconstructing text for
comparison. **`data/raw/uthmani.json` itself is never modified** — it's
third-party licensed source data (see [`data/LICENSES.md`](data/LICENSES.md)),
and this project's policy is to report suspected defects upstream, not alter
imported source text. Each correction records its provenance (what QUL has,
what Tanzil and quran.com both agree on) and is checked for staleness against
the live source on every run — if the underlying data ever changes, the
correction stops applying automatically rather than silently going wrong.
This brings the *comparison-layer* result to **6,234 / 6,236**.

The 2 orthographic cases (11:13, 80:25) are deliberately left uncorrected —
see [`data/external/qul-orthographic-review.md`](data/external/qul-orthographic-review.md)
for the full provenance and the recommended next step (an upstream report to
QUL, not yet filed — it needs a human decision on the right channel).

The four "formatting" cases are QUL source-data encoding anomalies (extra/missing
whitespace, a stray bidi control character) — they don't change a single Quranic
letter, and are candidates for reporting upstream to QUL, not for silently
patching in this repo (`data/raw/uthmani.json` is third-party licensed source
data — see [`data/LICENSES.md`](data/LICENSES.md) — not something this project
edits). The two "orthographic" cases are genuinely different encoded letters and
need expert/upstream verification before anyone treats either side as correct.

**Bismillah correction, 2026-07-13:** the normalization script below (superseded,
but still committed) used Al-Fātiḥah 1:1 as *the* Bismillah for every applicable
surah. That's wrong for two surahs: Tanzil's XML export records a per-surah
`bismillah` attribute, and Surahs 95 (At-Tin) and 97 (Al-Qadr) use a special form
with shadda on the bā' (`بِّسْمِ...`, not `بِسْمِ...`) — confirmed directly in
Tanzil's own XML, not assumed. Using the per-surah attribute (not a single
hardcoded string) is what makes the manifest match exactly, above.

<details>
<summary>Superseded framing (kept for history, not deleted — the analysis
methodology below was real work and the corrections in it are still accurate,
but the ~3,000-verse "unexplained" number it produced is now understood to be
mostly an artifact of comparing against the wrong Tanzil export configuration)</summary>

`node src/checksum-verify.js` cross-checks QUL's raw text against quranchecksum's
manifest with no normalization: **1,125 / 6,236 verses (18%) match byte-for-byte**
against that specific export configuration — expected, now that the configuration
mismatch above is understood, and not evidence of 5,111 real content problems.

`scripts/derive_standardized_plain_text.js` applies a set of heuristic
normalization rules (tatweel-spaced superscript alef, Bismillah-prepending,
selective annotation-mark stripping) to explain more of that gap without
ever regressing a verse that already matched raw. It reached 3,196 / 6,236
explained before this investigation — a real result, but one aimed at
reverse-engineering the *wrong* target (quranchecksum's specific export)
instead of checking QUL against Tanzil directly. Its rule-by-rule history,
including two rejected hypotheses (a "wasla-alef" rule that made things worse,
and an initial version of the annotation rule that regressed 350 verses before
being fixed to cascade per-verse) remains in the script's own comments as a
record of what was tried and why it was wrong, in case a related question
comes up again.

</details>

**Current state: QUL's raw Uthmani text matches a real, independently-downloaded
Tanzil export (with matching display options) on 6,230 / 6,236 verses (99.9%)
with zero corrections, or **6,234 / 6,236 with the 4 documented, provenance-tracked
formatting corrections applied in a comparison layer that never touches source
data.** The remaining 2 (11:13, 80:25) are substantive orthographic differences
that need upstream review before either side is called "correct." This is a
materially different, far stronger claim than earlier versions of this README
made, and it took two rounds of being wrong (see the corrections above) to get
here — recorded rather than smoothed over.

## Known gaps

1. **Multi-tradition text/alignment exists as a real research prototype, not yet in the main generator.**
   Real per-tradition Arabic text was found for Warsh, Qalun, Al-Duri, Shu'bah
   (and Al-Susi as a bonus) — sourced from `thetruetruth/quran-data-kfgqpc`, a
   third-party mirror of King Fahd Complex's official font/data packages —
   and used to generate real, XSD-valid ayah-numbering pins for all 114 surahs
   in each tradition (`scripts/generate_tradition_pilot.js`, output in
   `output-pilot/`). This is genuinely real, verified data (spot-checked to
   differ from Hafs at the rasm level, not a relabeled copy), not a mockup.
   Three real caveats, stated plainly rather than glossed over:
   - **License status is a judgment call, not a confirmed clearance.** The
     source repo has no LICENSE file or stated terms beyond "for developer"
     use. Included on the project owner's reasoning that King Fahd Complex's
     already-confirmed-permissive terms (via `quran-svg`'s licensing) likely
     extend to this derived text — see `THIRD_PARTY_NOTICES.md` for the full
     caveat. Treat as unverified-but-included, not cleared.
   - **Numbering/text only, not full parity with the main generator's output**
     — no morphology (root/stem/lemma), and no page/juz/hizb/rub/manzil/ruku
     pins, since those would need re-deriving against each tradition's own
     numbering, not yet done.
   - **Al-Duri has an unresolved 3-way count discrepancy** (6205 in the
     original Itqan announcement, 6218 from `quran-svg`, 6217 from this text
     source) — precisely located to surah 67 (30 vs 31 ayahs). Narrowed, not
     resolved: this is a real, documented classical ʿadd-al-āy
     (verse-counting) disagreement — Al-Mulk has 30 ayahs under the
     majority/Kufi counting school and 31 under the Ḥijāzī school, not a
     data-quality bug. Al-Duri and Al-Susi are both transmitters of Abu ʿAmr
     al-Basri, so the true count should follow the classical Basri counting
     school specifically — that number lives in specialized ʿulūm al-Qurʾān
     references (e.g. al-Dani's *al-Bayan fi ʿAdd Ay al-Qur'an*), not
     reachable from general web search.
   **Current scope:** core QUSX XML remains numbering/milestone-oriented. A
   separate optional alignment companion now prototypes rasm/text variants
   without destabilizing word IDs or the XML schema. It currently contains only
   three authenticated locations and is not a complete qirāʾāt corpus.
   **Checked and ruled out** as a text source: [tanzil.net/download](https://tanzil.net/download/)
   — verified directly, no riwayah/qira'a selector at all.
2. **10 of QUL's 12 print layouts are wired in** (KFGQPC V1/V2/V4-tajweed,
   Mushaf Qatar, 5 IndoPak line-counts, KFGQPC Nastaleeq). The remaining 2
   (Digital Khatt, the SVG-based Ligature Basd Mushaf) are NOT wired in yet,
   but **not because of a data-shape mismatch** — that was a prior
   assumption, never actually checked. Corrected 2026-07-13: read QUL's own
   published schema docs for both directly, and both use the *exact same*
   `page_number`/`line_number`/`line_type`/`first_word_id`/`last_word_id`
   schema as the other 10 layouts already integrated. The real blocker is
   just downloading the actual SQLite files, which needs an authenticated
   QUL session — not yet done, but should follow the same pattern as the
   other 10 layouts once downloaded.
3. **Text/morphology are duplicated once per layout**, not factored into a
   separately-referenceable layer — see the [Why this exists](#why-this-exists)
   caveat. This is the one substantial item left that's a real architecture
   decision, not a mechanical fix: separating text/morphology/layout into
   independently-combinable documents needs a join-key contract designed first.
4. **2 of the 6,236 verses (11:13, 80:25) have a genuine, unresolved orthographic
   difference from an independent Tanzil export** — see
   [Text integrity](#text-integrity) and `data/external/qul-orthographic-review.md`.
   4 formerly-residual formatting anomalies are now corrected in a transparent,
   provenance-tracked comparison layer (`data/external/qul-text-corrections.json`)
   that never touches the underlying source data. Earlier versions of this README
   claimed this gap was in the thousands (541, then 3,741, then 3,040) — all
   of those were measuring divergence from the wrong thing: a specific,
   undocumented Tanzil export configuration that doesn't match QUL's own
   convention, not real textual disagreement. See the 2026-07-13 root-cause
   finding in that section for the full correction trail.
5. **Only ~26 of the ~150+ items from the fuller third-party review have been
   triaged and fixed** — the rest (richer schema semantics beyond what's listed
   below, release/versioning policy beyond `CHANGELOG.md`, punctuation/pause-sign
   modeling, extension/namespace policy, etc.) remain open.
6. **Sajda can't be pinned to an exact word with current data** — checked
   directly: `data/raw/quran-metadata-sajda.json` only has `verse_key`
   (ayah-level), no word position. This isn't a bug to fix in our code; it's a
   real limit of the source dataset. The pin fires at the end of the containing
   ayah as the closest available approximation.

**Closed since the audit:** real XSD compilation + validation (was previously only
regex-checked), CI (`.github/workflows/ci.yml`, including a deterministic-regeneration
check — committed output must exactly match a fresh build from source, verified with
two independent generation runs diffing byte-identical), 16 negative tests proving
the validators, CLI, cross-layout consistency check, and checksum script all
actually reject/catch bad input and match known-real baselines — not just pass good
input (`test/`), word-position and
corpus-completeness checks in `validate.js` (now including ruku totals and
per-layout page counts), filename/surah-name/count/place cross-checks against
canonical data, a cross-layout consistency check confirming word text and
morphology are byte-identical across all 10 layouts (only page/line placement
differs, as intended), a closed `tradition` enum and `surah`/`ayahCount` range
constraints in the schema, `<ruku>` pins (data was downloaded early on but sat
unused), `generatorVersion` and `normalization="NFC"` embedded in generated files
(with `validate.js` checking the latter is actually true), a `fragment` attribute
resolving the juz/hizb/rub/manzil/ruku cross-file identity ambiguity, a
`type="number"` distinction so verse-number glyphs aren't mistaken for lexical
words, CLI hardening (invalid/out-of-range surah args rejected; duplicate
args deduplicated, not rejected — `node src/generate.js 1 1` exits 0 and
writes surah 1 once; atomic temp-file-then-rename writes; duplicate
morphology mappings now warned about instead of silently overwritten),
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
