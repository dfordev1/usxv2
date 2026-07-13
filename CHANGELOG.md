# Changelog

No formal versioning policy exists yet (see `README.md` Known gaps) — this is a
plain chronological record, not semver-scoped releases.

## Unreleased

- **Closed out the text-integrity work**: added a transparent,
  provenance-tracked correction layer (`data/external/qul-text-corrections.json`)
  applying the 4 formatting fixes (5:52, 11:31, 18:1, 27:26) at comparison time
  only -- `data/raw/uthmani.json` is never edited. Each correction is checked
  for staleness against the live source on every run. Comparison result:
  6,234/6,236 with corrections, 6,230/6,236 raw. The 2 orthographic cases
  (11:13, 80:25) remain deliberately unresolved -- documented in the new
  `data/external/qul-orthographic-review.md` with full provenance and a
  recommended (not yet filed) upstream report to QUL. Added 5 regression
  tests in `test/run_tests.js` pinning the exact match counts, the exact 2
  remaining verses, and that the source file is byte-identical before/after.
  Added `.gitattributes` forcing LF line endings for text/source/data files
  and marking `.db`/`.png`/`.jpg`/`.xlsx`/etc as binary -- Windows' common
  `core.autocrlf=true` was silently converting checked-out text files to
  CRLF, which changes their bytes and breaks `scripts/hash_sources.js`'s
  SHA-256 check on an otherwise-unmodified clone.
- Cross-checked all 6 residual checksum verses against a third source (the
  live quran.com v4 API) -- it agrees with Tanzil on all 6, including both
  orthographic cases (11:13, 80:25). Strengthens the case that these are real
  QUL data defects, but per instruction NOT auto-corrected -- QUL's raw text
  is third-party source data; a fix belongs reported upstream, not patched
  silently here. Updated `scripts/checksum-verify-full-options.js` and
  `README.md` with the corroborating detail.
- **Root-cause finding on the checksum-mismatch investigation: it was mostly
  an export-configuration mismatch, not a text-quality problem.** Tanzil's
  download tool has 5 independent options (pause marks, sajdah signs,
  rub-el-hizb signs, tatweel-below-superscript-alef, sequential tanween).
  quranchecksum's manifest was built from one specific combination but never
  recorded which in its metadata; QUL's own convention matches a *different*
  combination (all 5 options on). Verified by downloading both
  configurations directly from tanzil.net and diffing each against QUL's raw
  word data: Tanzil's default export + its own per-surah Bismillah attribute
  reproduces quranchecksum's manifest exactly (6,236/6,236), proving the
  manifest is valid but under-documented; Tanzil's full-options export
  matches QUL directly, with zero normalization, on 6,230/6,236 verses.
  Added `scripts/checksum-verify-full-options.js` (wired into `npm run
  verify` and CI) and committed `data/external/tanzil-uthmani-full-options.xml`
  (CC-BY 3.0, hash-tracked) as the new primary text-integrity check. The
  remaining 6 verses are individually classified: 4 are QUL formatting
  anomalies (stray/missing whitespace, a stray U+200F), 2 are substantive
  orthographic differences (11:13, 80:25) flagged for upstream review, not
  silently "corrected." Also found and fixed: the old normalization script's
  Bismillah rule used a single hardcoded string for every surah, but Surahs
  95 and 97 need a special form with shadda on the bā' — confirmed directly
  in Tanzil's XML `bismillah` attribute, not assumed. Superseded (not
  deleted) the old `src/checksum-verify.js` / `derive_standardized_plain_text.js`
  framing in `README.md`, since the ~3,000-verse "unexplained" figure it
  produced was chasing the wrong target.
- Deeper checksum-mismatch investigation, done by downloading the real Tanzil
  Uthmani text directly (not just the hash manifest) and diffing it
  character-by-character against every one of the 3,741 still-unexplained
  verses. Found and fixed a real bug in the annotation-stripping rule: it
  left a double space where a mid-verse mark was removed (`word ۖ word` ->
  `word  word`), which never matched Tanzil's single-spaced text even though
  the mark itself was correctly stripped. Fixing the whitespace collapse in
  `scripts/derive_standardized_plain_text.js` resolved 701 more verses with
  no regression risk (2,495 -> 3,196 / 6,236 explained; 3,741 -> 3,040
  unexplained). Also identified, but deliberately did NOT auto-fix: ~2,038 of
  the remaining unexplained verses are missing Tanzil's U+06DF (small high
  rounded zero) mark on silent word-final `وا` -- a real gap in QUL's source
  data, not a codepoint-substitution pattern, and not safe to guess at
  programmatically since it depends on Arabic verb morphology. Documented in
  `README.md`'s Text integrity section as an open, unresolved gap.
- Found a third confirmed checksum-mismatch pattern and fixed a real
  methodology bug in how the first two were being measured. Diffing
  Al-Baqarah 2:2 against real Tanzil text found QUL includes Quranic
  annotation/pause signs (waqf marks, U+06D6-U+06ED) that Tanzil's plain
  download drops. Naively stripping them unconditionally regressed 350
  previously-correct verses (Tanzil keeps some of these marks in some
  verses) -- caught by explicitly checking for regressions, not just
  measuring net gain. Rewrote `scripts/derive_standardized_plain_text.js`
  to cascade per-verse (always prefer raw text if it already matches;
  only try a normalization rule, in order, if it doesn't) instead of
  transforming unconditionally. Final, re-verified numbers: 2,495/6,236
  explained (raw + all three rules, zero regressions), 3,741 genuinely
  unexplained (60% of all verses). README's Text integrity table and
  Known gaps rewritten to show the cumulative/cascading breakdown rather
  than a flat list, so the "never regress" property is visible in the
  numbers themselves.

- Found and confirmed a second real checksum-mismatch pattern while
  continuing the Text integrity investigation: Tanzil's downloaded plain
  text file prepends the Bismillah to a surah's first ayah (except
  Al-Fatihah, where it IS ayah 1, and At-Tawbah, which has none) -- a
  download-format convention, not a QPC-encoding difference. Confirmed
  directly, not assumed from the pattern: hashed Al-Baqarah 2:1 both ways
  and only the Bismillah-prepended version matches the manifest. Added
  as a real rule to `scripts/derive_standardized_plain_text.js` (not a
  one-off check) and re-verified at full scale: 1,928/6,236 explained
  (was 1,865), 4,308 genuinely unexplained (was 4,371). README's Text
  integrity table and Known gaps updated with the corrected figures.

- **Corrected another documentation claim** while investigating the 2
  unaddressed QUL print layouts (Digital Khatt, Ligature Basd SVG
  Mushaf). README said they "use a different data shape than the
  page/line DB schema the generator expects" -- that was never actually
  checked, just assumed from the layouts' names. Read QUL's own published
  schema documentation for both directly (unauthenticated, public pages)
  and confirmed both use the exact same `page_number`/`line_number`
  /`line_type`/`first_word_id`/`last_word_id` schema as the other 10
  layouts already wired in. The real remaining blocker is just
  downloading the actual SQLite files, which needs an authenticated QUL
  session (not available this session) -- not a data-compatibility
  problem. README corrected accordingly.

- **Corrected a real, significant documentation error** in the Text
  integrity section, found while trying to build the "standardized plain
  text" layer (see below). The README claimed 4,570 of 5,111 checksum
  mismatches were explained by two encoding patterns, leaving 541
  genuinely unexplained. Both numbers were wrong -- they came from an
  earlier, uncommitted, never-re-verified analysis. Turned the claimed
  rules into actual code (`scripts/derive_standardized_plain_text.js`)
  and re-tested against the real manifest:
  - The tatweel-spaced-dagger-alif rule is real (confirmed by diffing
    against an actual Tanzil download, not assumed), but only resolves
    740 verses when actually applied and re-hashed -- not 3,581.
  - The "wasla-alef" rule was flatly wrong. Tanzil's own text uses the
    same wasla-alef codepoint in plenty of places (e.g. Al-Fatihah 1:6,
    confirmed by direct codepoint inspection) -- applying this rule
    actively made the match count worse (1,125 -> 515) before it was
    caught and removed.
  Real, corrected numbers: 1,865 / 6,236 verses now explained (was claimed
  as 5,695), 4,371 genuinely unexplained (was claimed as 541) -- a
  majority of all verses, not a small residual. README's Text integrity
  and Known gaps sections updated with an explicit correction note rather
  than silently changing the numbers.

- Added `scripts/derive_no_tashkeel.js` and tested a real community
  proposal (from someone else reviewing this project, not from us): that
  milestone pins should be built once against one text layer and carry
  across other text representations of the same words (e.g. a
  calligraphy-accurate layer, a plain-Unicode layer, a no-diacritics
  layer), instead of duplicating pins per layer. Tested the simplest case
  first -- stripping tashkeel (diacritics) from an already-generated file
  without touching any pin/word-ID structure. Verified at full scale, not
  just the one example surah: derived all 114 Hafs/madani-v2 files this
  way, 0 real errors from validate.js and 114/114 XSD-valid. Confirms the
  core claim holds for this simplest transform. A single example file kept
  at `docs/examples/001-no-tashkeel-example.qusx.xml`; the other 113 were
  cleaned up after verification rather than left cluttering `output/`.
  Deliberately did NOT attempt the harder "standardized plain text" layer
  (QPC-glyph-convention text vs plain Unicode Uthmani) in this pass --
  that needs real normalization rules, not just character removal, per
  the QPC-vs-Tanzil divergence already documented in the Text integrity
  section.

- Narrowed (not resolved) the Al-Duri surah-67 ayah-count conflict (30 vs
  31). Research confirmed this is a real, documented classical
  ʿadd-al-āy (verse-counting) disagreement -- Surah Al-Mulk has 30 ayahs
  under the majority/Kufi counting school and 31 under the Ḥijāzī school
  -- not a data-quality bug in either source. Al-Duri and Al-Susi are both
  transmitters (rawī) of Abu ʿAmr al-Basri specifically, so their true
  count should follow the classical Basri counting school, distinct from
  Kufi/Ḥijāzī/Shami. Could not determine the actual Basri-school count
  for Al-Mulk from general web search -- that lives in specialized
  ʿulūm al-Qurʾān references (e.g. al-Dani's *al-Bayan fi ʿAdd Ay
  al-Qur'an*), not something reachable here. Recorded as a well-defined,
  narrowed question rather than claimed solved.
- Two scope decisions made directly, since they don't require external
  input:
  1. **QUSX v1 models ayah numbering only, not rasm/text variants.** The
     open question a reviewer raised on the Itqan thread (does QUSX
     handle just verse-numbering differences between traditions, or the
     actual differing wording too) is decided: numbering only for v1.
     Rasm-level text differences (Warsh's actual wording differing from
     Hafs's, not just verse boundaries) are a materially harder, separate
     problem -- out of scope until there's a real plan for it.
  2. **Al-Susi stays out of the formally-supported tradition list for
     now.** It has real pilot text and passes validate.js, but (a) has no
     independently verified ayah-count data the way the other 4 do, and
     (b) was never part of the originally-licensed 5-tradition scope from
     `quran-svg`. Its pilot output stays in `output-pilot/sousi/` as a
     bonus artifact, not added to `schema/qusx.xsd`'s tradition enum,
     pending either verification or a deliberate decision to formally add
     it.

- Scaled the pilot generator from 2 example surahs to the full 114-surah
  corpus, across all 5 traditions with real text (Warsh, Qalun, Al-Duri,
  Shu'bah, plus Al-Susi as a bonus extra). Real results, not assumed:
  - Warsh: 6214/6214 ayahs, 114/114 files pass both validate.js and the
    real XSD, 0 errors -- clean on the first full-scale attempt.
  - Qalun, Shu'bah: same, 114/114 clean, 0 errors each.
  - Al-Susi: 114/114 pass validate.js, but is NOT XSD-valid -- its
    `sousi-kfqc` tradition code was never added to `schema/qusx.xsd`'s
    enum, since Al-Susi was always a bonus extra outside the original
    5-tradition scope. Left unresolved rather than silently added to the
    schema without deciding if Al-Susi should really be in scope.
  - Al-Duri: found a real, precise data conflict -- surah 67 has 30 ayahs
    in this text source vs 31 in the earlier `quran-svg`-derived count
    (`data/traditions/ayah-counts.json`). This pinpoints exactly where
    part of the earlier 3-way Al-Duri discrepancy (6217 vs 6218 vs the
    original 6205 announcement) actually lives, rather than leaving it as
    an unlocated aggregate mismatch. Not resolved -- recorded as-is.
  - At full scale this also exposed and fixed a real bug of our own:
    `validate.js` was silently falling back to comparing Al-Susi's ayah
    counts against the Hafs canonical table (since Al-Susi has no
    verified per-tradition count data), producing 43 false-positive
    errors. Fixed by skipping the ayahCount check entirely for a
    recognized non-Hafs tradition we don't have real count data for,
    rather than comparing against the wrong baseline. Re-verified: 0
    errors for Al-Susi after the fix, and the real 1140-file Hafs corpus
    still passes with 0 errors (fix didn't loosen anything there).

- Added `scripts/generate_tradition_pilot.js` — a deliberately separate,
  minimal pilot generator proving the QUSX milestone-pin model works
  end-to-end for a non-Hafs tradition's real text. Kept separate from
  `src/generate.js`, which is tightly coupled to Hafs word-by-word data
  (juz/hizb/rub/manzil/ruku indices are all keyed to Hafs verse numbering
  as canonical) -- reusing it directly would be unsafe without a real
  redesign. Deliberately does NOT attempt root/stem/lemma, juz/hizb/rub
  /manzil/ruku pins, or page/line pins for the pilot tradition -- see the
  script header for why each is out of scope. Piloted on Warsh
  Al-Fatihah (identical ayah count to Hafs, both validators pass 0 errors)
  and Warsh Quraysh (genuinely different count, 4 vs 5 -- passes XSD,
  correctly exposed a real gap in `validate.js` rather than being hidden).
  Surah name, revelation place, and bismillah presence are reused from the
  existing canonical Hafs-sourced metadata for the pilot files, since those
  are facts about the surah itself, not the reading tradition -- only ayah
  text/count/numbering actually varies.
- Made `validate.js`'s ayah-count check tradition-aware. Different qira'at
  genuinely split/merge verse boundaries differently (Warsh's Quraysh has 5
  ayahs vs Hafs's 4) -- the check previously compared every file's
  ayahCount against the single Hafs canonical table regardless of its
  `tradition` attribute, which would have false-flagged every genuinely-
  divergent non-Hafs file as an error. Now looks up the file's own
  tradition in `data/traditions/ayah-counts.json` when available, falling
  back to the Hafs canonical count only for unrecognized traditions. Added
  a positive control (Warsh's real 5-ayah Quraysh is NOT flagged) and a
  negative control (a file wrongly claiming Hafs's count of 4 for a Warsh
  file IS flagged) to `test/run_tests.js` (18/18 passing). Re-ran the full
  1140-file real corpus through the updated validator -- still 0 errors,
  confirming the fix didn't loosen anything for the existing Hafs files.
- Added `data/traditions/text/*-text.json` — real per-ayah Arabic text for
  Warsh, Qalun, Al-Duri, Shu'bah, and Al-Susi, from
  `thetruetruth/quran-data-kfgqpc` (a third-party mirror of King Fahd
  Complex's official font/data packages). This is the first real word/ayah
  *content* we have for any tradition other than Hafs -- everything added
  so far had only been numbering/position data. Verified directly, not
  assumed: pulled Al-Fatihah ayah 2 from the Warsh file and compared
  against our own generated Hafs output -- genuinely different rasm
  (`اِ۬لْحَمْدُ` vs our `ٱلْحَمْدُ`), confirming this is real distinct text,
  not a relabeled Hafs copy. Qalun (6214) and Shu'bah (6236) ayah counts
  match exactly; Al-Duri's count (6217) disagrees with both our earlier
  `quran-svg`-derived count (6218) and the original Itqan announcement
  (6205) -- a three-way discrepancy, recorded rather than resolved by
  picking one arbitrarily.
  **License caveat, stated plainly**: the source repo has no LICENSE file
  and no stated terms beyond a README description saying the data is "for
  developer" use. This was NOT independently verified as a real license --
  it's included on the project owner's explicit judgment call that King
  Fahd Complex's already-confirmed permissive terms (via `quran-svg`,
  see above) likely extend to this derived text. See
  `THIRD_PARTY_NOTICES.md` for the full caveat; treat this as
  unverified-but-included, not cleared.
- Added `data/traditions/*-ayah-boundaries.json` — real per-ayah page
  position for all 5 KFQC reading traditions, now 100% complete for all
  five (6236/6236 Hafs, 6214/6214 Warsh, 6214/6214 Qalun, 6218/6218
  Al-Duri, 6236/6236 Shu'bah). History of how this got to complete, kept
  because the debugging path is itself informative:
  - First pass (`scripts/extract_ayah_boundaries_from_svg.js`) extracted
    from `quranpedia/quran-svg`'s static SVG export, working around a
    confirmed tagging bug in their per-page JSON export (JSON has
    `surahNumber: 0, ayahNumber: 0` on ~97% of sampled pages; the SVG
    source is correctly tagged). Warsh/Qalun/Al-Duri/Shu'bah came back
    100% correct this way. Hafs came back with a real gap — 104 of 6236
    ayahs across 42 surahs — verified by hand (not assumed) that these
    verses are genuinely untagged in the static SVG source, specifically
    ones inside a surah's decorative title-header region.
  - An earlier version of that script also had a real bug of our own
    (assumed a fixed SVG attribute order) that produced a false "Al-Duri's
    Al-Fatiha has 0 ayahs" result — caught, fixed, and re-verified
    (6218/6218) before being trusted.
  - For the remaining Hafs gap: inspecting quranpedia.net's own frontend
    network requests showed it calls a live API
    (`quranpedia.net/api/page/hafs/<page>?surah=<surah>`) that returns the
    same missing verses correctly tagged. Verified directly (page 50,
    surah 3: static export had 7 ayahs starting at ayah 3; live API
    returned all 9, ayah 1-9). Built a second extractor
    (`scripts/extract_ayah_boundaries_live_api.js`) against this live API
    and closed the gap completely. This data is a snapshot of a live,
    unversioned API — may drift if the site changes, unlike the frozen
    GitHub export.
- Added `data/traditions/ayah-counts.json` — verified per-surah ayah counts
  for all 5 KFQC reading traditions (Hafs, Warsh, Qalun, Al-Duri, Shu'bah),
  built from `quranpedia/quran-svg`'s `surah.json`/`markers.json` files (CC0,
  licensed 2026-07-12, confirmed via commit history before use). This is
  numbering data only — it does NOT establish where verse boundaries fall in
  the shared word stream; that's still blocked on a data-tagging bug in the
  source repo's per-page files (reported to the maintainer, not yet fixed).
  Generation surfaced two unresolved discrepancies, recorded rather than
  silently resolved: (1) Warsh and Qalun's `markers.json` has 4 fewer entries
  than their `surah.json` ayah-count totals; (2) Al-Duri's `surah.json` sums
  to 6218 ayahs, not the 6205 stated in the original Itqan announcement.
- Added 5 more Mushaf print layouts from QUL, taking coverage from 5 to 10 of the
  12 layouts QUL publishes (the 2 skipped — Digital Khatt and Ligature Basd SVG —
  use a different data shape than the page/line DB schema the generator expects,
  and haven't been investigated yet): IndoPak 9-line (Gaba), IndoPak 13-line
  (Qudratullah), IndoPak 13-line (Taj Company), IndoPak 16-line (Taj Company), and
  KFGQPC Nastaleeq 15-line. Output grew from 570 to 1140 files (114 surahs × 10
  layouts); all 1140 pass both `validate.js` and the real XSD. Each layout's
  expected max-page-number (1890 / 849 / 847 / 548 / 610 respectively) was taken
  from the actual generated output, not guessed, and added to
  `validate.js`'s corpus-completeness check. CI's deterministic-regeneration loop
  and README file/layout counts updated to match.
- Investigated (before fixing/documenting anything, per the CLI-args lesson)
  two audit claims directly against real data:
  - **Bismillah**: confirmed `bismillahPre` is display-only metadata — Surah
    2 ayah 1 is just `الٓمٓ` in the word stream, no Basmalah words present.
    This is correct, standard behavior, not a bug. Documented precisely in
    README (previously undocumented, which is what the audit actually
    flagged — not broken behavior).
  - **Sajda word-precision**: confirmed `data/raw/quran-metadata-sajda.json`
    only has `verse_key`, no word-level field — pinning sajda to an exact
    word isn't achievable with current source data, not a code bug.
    Documented as a real data limitation instead of silently approximating.
- Formalized 5 previously-manual checks into real `test/run_tests.js`
  assertions: unknown `--layout` value rejection, cross-layout consistency
  catching an injected divergence (operates on a temp copy, real output
  files untouched — verified), cross-layout consistency finding nothing
  wrong between two real uncorrupted layouts (positive control), and
  checksum-verify.js's exit code + known baseline match count
  (1,125/6,236) pinned so a silent regression would be caught. 16/16 tests
  pass.
- **Corrected a real documentation bug**: README.md previously said CLI
  hardening covers "invalid/duplicate surah args rejected" — false for the
  duplicate half. `node src/generate.js 1 1` exits 0 and writes surah 1
  once (deduplicated, not rejected); only out-of-range/non-integer args are
  actually rejected. Caught by external review, verified by reproducing it
  directly (`node src/generate.js 1 1`, confirmed exit 0 / single write).
  Fixed the README wording and added two CLI-level tests
  (`test/run_tests.js`) asserting the exact real behavior — the previous
  test suite only tested `validateFile`/XSD, never actually ran the CLI, so
  it had no way to catch this.
- Added ruku totals (558) and per-layout expected page counts (604 for the
  Madani-family layouts, 610 for IndoPak) to `validate.js`'s
  corpus-completeness check.
- Added a cross-layout consistency check: extracts each surah's word
  text+morphology sequence per layout and confirms they're byte-identical
  across all 5 layouts (only page/line placement should differ). Run
  against real data with no failures found; not yet covered by a dedicated
  negative-test fixture (see README Known gaps).
- Added a duplicate-morphology-mapping warning to `src/generate.js` — if the
  source root/stem/lemma databases ever have two entries for the same word,
  it's now surfaced instead of silently overwritten. Ran against real data:
  zero duplicates found.

## 2026-07-11 — Fourth audit-response batch

- Added `fragment` attribute (`whole`/`start`/`middle`/`end`) to
  juz/hizb/rub/manzil/ruku opening pins, resolving the cross-file identity
  ambiguity flagged in the audit: a range spanning two surah files (e.g. Juz 1
  covers all of Surah 1 and part of Surah 2) is now explicitly marked as
  fragments of one range, not two coincidentally-numbered ones.
- Added `type="number"` to `<word>` elements holding the ayah-ending
  verse-number glyph, distinguishing them from lexical words (a consumer
  counting "words per ayah" would previously be off by one).
- Added `normalization="NFC"` to the `<qusx>` root, with `validate.js` now
  actually checking word text is NFC-normalized rather than just asserting it.
- Hardened `src/generate.js`'s CLI: invalid/out-of-range surah arguments are
  now rejected instead of silently producing garbage, duplicate targets are
  deduped, and output is written via temp-file-then-rename so a crash mid-run
  can't leave a corrupt/partial file at the real output path.
- Verified true determinism (not just "matches last commit"): two independent
  `node src/generate.js --layout=madani-v2 all` runs byte-diffed identical.

## 2026-07-11 — Third audit-response batch

- Added `<ruku>` milestone pins (data was downloaded early on but sat unused
  until now) — same pattern as juz/hizb/rub/manzil.
- Added `generatorVersion` attribute to the `<qusx>` root, sourced from
  `package.json`, so a generated file can self-declare what produced it.
- Added `CONTRIBUTING.md` and this changelog.
- Added a deterministic-regeneration check to CI: regenerates all 570 files
  from source and fails the build if the result differs from what's committed.
- Added filename-vs-declared-surah and surah-name/count/place-vs-canonical
  cross-checks to `src/validate.js`.

## 2026-07-11 — Second audit-response batch

- Fixed `schema/qusx.xsd`: it did not actually compile (`<xs:attribute>` was
  invalid inside `<xs:sequence>`). Verified with a real XML Schema processor
  (`lxml`), not just the project's own regex-based checker.
- Added `scripts/xsd_validate.py` — genuine XSD validation, confirming all 570
  generated files are schema-valid, not just individually well-formed.
- Tightened the schema: `surah` constrained to 1–114, `ayahCount` to 1–286,
  `tradition` to a closed enum, `sajda/@verseKey` to a numeric pattern.
- Added CI (`.github/workflows/ci.yml`) running validation + tests on every push.
- Added `test/` — 6 negative-test fixtures plus `test/run_tests.js`, proving
  the validators actually reject bad input (not just pass good input).
- Added word-position continuity and corpus-completeness checks to
  `src/validate.js`.
- Added `THIRD_PARTY_NOTICES.md` documenting exact source/date/terms for
  every bundled dataset.
- Corrected README overclaims: "one file serves every view" and "zero
  duplication" were true within a single surah/layout file but false across
  the 570-file corpus (text+morphology duplicate once per layout) — now
  stated accurately. Corrected the checksum-verify section, which previously
  implied the full mismatch set was explained by encoding convention; 541 of
  5,111 mismatches are genuinely unexplained, and the README now says so.
- Documented (not yet solved) that juz/hizb/rub/manzil ranges spanning two
  surahs are written as separate same-numbered fragments per file with no
  in-format marker they're the same range.

Prompted by an external audit surfacing ~160 issues across schema rigor,
validator coverage, data-model layering, and release engineering. Findings
were independently re-verified before acting on them — two specific claims in
that audit (duplicated ayah/word totals, a phantom commit hash) did not match
this repository's actual state and were not acted on.

## 2026-07-10 — Initial release

- Generator (`src/generate.js`) producing QUSX XML for all 114 surahs.
- 5 print layouts wired in: KFGQPC V1/V2/V4-tajweed, Mushaf Qatar, IndoPak
  15-line — 570 files total.
- Semantic conformance checker (`src/validate.js`), initial `schema/qusx.xsd`
  (not yet verified against a real processor at this point).
- Live viewer (`viewer/viewer.html`) parsing real generated output with the
  browser's own `DOMParser`.
- Text-integrity cross-check (`src/checksum-verify.js`) against an
  independent SHA-256 manifest ([spqrxi/quranchecksum](https://github.com/spqrxi/quranchecksum)).
- `docs/quranic-structural-glossary.xlsx` — 8-sheet reference workbook built
  from real QUL data.
- `docs/prior-art-references.md` — citations and independent prior art.
