# QUSX v1 conformance fixture suite

This directory is a **self-contained, versioned test suite** for QUSX v1
conformance. It is designed so that another implementation can prove its own
checker is correct **without reading any JavaScript in this repository** —
everything it needs is the XSD, the Schematron schema, and the two JSON files
here.

## Layout

```
test/conformance/
  rules.json          machine-readable index of every normative rule id
                       (source of truth: docs/conformance/NORMATIVE-RULES.md)
  manifest.json        the fixture manifest (see schema below)
  README.md            this file
  verify-manifest.js   internal consistency check for manifest.json (optional --
                        you do not need Node or this script to consume the suite)
  fixtures/            new fixtures written for this suite, one directory per
                        rule, each containing a single NNN.qusx.xml file
```

Some negative fixtures are **reused** from `test/fixtures/` (the repo's
pre-existing hand-written negative-test fixtures) rather than duplicated.
`manifest.json` entries reference those by their existing path
(`test/fixtures/...`) instead of copying them under `test/conformance/fixtures/`.

## The manifest schema

`manifest.json` is a JSON object:

```jsonc
{
  "version": "1.0-draft",
  "fixtures": [
    {
      "file": "test/conformance/fixtures/positive/001.qusx.xml", // repo-relative path
      "description": "...",                // one line, human-readable
      "expectedOutcome": "pass",            // "pass" | "fail"
      "targetsRule": null,                  // the rule id this fixture demonstrates, or null for the positive fixture
      "expectedFailingRules": [],            // rule ids a correct checker should report; empty for "pass"
      "level": "L2"                          // conformance level the rule belongs to (see rules.json "levels")
    }
  ]
}
```

Every `targetsRule` and every entry in `expectedFailingRules` is guaranteed to
exist as an `id` in `test/conformance/rules.json`.

### Isolation and the two documented exceptions

The design goal is: **each negative fixture violates exactly one rule**, so a
checker that reports the wrong rule id (or fails to report the right one) is
unambiguously wrong. Most fixtures in this suite achieve that exactly —
`expectedFailingRules` has one entry, equal to `targetsRule`.

Three categories of fixture do **not** meet that literal one-entry bar, and
`manifest.json`'s own `"notes"` array explains each:

1. **`QUSX-PIN-004` and `QUSX-PIN-005` fixtures.** These two rules are
   `"checkedBy": ["js"]` only in `rules.json` — `schema/qusx.sch` deliberately
   does not implement them (see that file's own header comment: they need
   document-order state a Schematron pattern can't cleanly express). The
   reference `src/validate.js` tracks only one "currently open" sid per axis,
   so reopening an axis while open (PIN-004), or closing with a mismatched eid
   (PIN-005), necessarily leaves the true sid without a valid close in the
   same pass — `src/validate.js` also reports `QUSX-PIN-006` alongside the
   targeted rule. This was verified empirically (`node src/validate.js
   <fixture>`), not assumed; `expectedFailingRules` reflects that ground
   truth.
2. **A handful of `test/fixtures/*.qusx.xml` reused fixtures** predate this
   suite and declare `ayahCount="7"` (the real Al-Fatihah header) while only
   including 1-2 ayahs for brevity, so they incidentally also trip
   `QUSX-AYH-001`. They are referenced by path rather than edited or
   duplicated (per this suite's design constraints), and the incidental
   finding is listed honestly rather than hidden.
3. **`QUSX-HDR-001`** (filename `NNN.qusx.xml` must encode the same surah as
   the `surah` attribute) is *never* listed for any fixture in this manifest.
   It is explicitly scoped to files inside a corpus tree (see
   `NORMATIVE-RULES.md`: "Files not matching that pattern are outside the
   corpus naming convention and reported as such"). Every new fixture here
   lives at `test/conformance/fixtures/<rule-slug>/001.qusx.xml` — a real
   `NNN.qusx.xml` filename with `surah="1"`, so `QUSX-HDR-001` never actually
   fires in practice, but it's excluded from the contract on principle: these
   are conformance-suite fixtures, not corpus files.

`QUSX-HDR-002` through `QUSX-HDR-006` are **non-portable** (they need
`data/raw/quran-metadata-surah-name.json` and
`data/traditions/ayah-counts.json`) and are out of scope for this suite by
design — see `docs/conformance/CONFORMANCE.md`'s portable/corpus-aware split.
The positive fixture, being a small hand-written excerpt rather than a real
full surah, will incidentally fail the non-portable `QUSX-HDR-006` ayah-count
cross-check if you run it through `src/validate.js` with the repo's real
reference data loaded — that is expected and not part of what
`expectedFailingRules` asserts (which covers only the portable L0-L2 rule set
this suite targets).

## How to consume this suite (no JavaScript required)

For each entry in `manifest.json`:

1. Parse `fixtures[i].file` with your own XML parser.
   - If it doesn't parse: your checker should report `QUSX-WF-001`. Compare
     against `expectedFailingRules` (only the well-formedness fixture expects
     this).
2. If it parses, validate it against `schema/qusx.xsd` with any XSD 1.0
   processor. Collect every violation and map it to the appropriate
   `QUSX-WF-*` / `QUSX-STR-*` rule id (see `NORMATIVE-RULES.md` for the
   mapping — e.g. an enumeration facet failure on `tradition` is
   `QUSX-STR-006`).
3. If the document is XSD-valid, validate it against `schema/qusx.sch` with
   any ISO Schematron processor (queryBinding `xslt`). Each `<assert>` in that
   file is tagged with its rule id in its own failure message text.
4. For the two rules Schematron does not implement (`QUSX-PIN-004`,
   `QUSX-PIN-005`), and for the rules the Schematron file's header comment
   marks as deliberately absent (see that file), you need your own semantic
   pass. `docs/conformance/NORMATIVE-RULES.md` states each of these rules
   precisely enough to implement independently: track, per milestone axis, the
   currently-open `sid`; flag `QUSX-PIN-004` if a new `sid` opens on an axis
   with one already open; flag `QUSX-PIN-005` if a closing `eid` doesn't match
   the currently-open `sid` on that axis; flag `QUSX-AYH-001` /`QUSX-WRD-001`
   / `QUSX-WRD-002` / `QUSX-NRM-001` per their normative text.
5. Compare the set of rule ids you found against `expectedFailingRules` for
   that fixture (order doesn't matter; it's a set comparison). A
   `"expectedOutcome": "pass"` fixture must produce an empty set. A
   `"expectedOutcome": "fail"` fixture must produce a set containing at least
   `targetsRule` (and, per the notes above, sometimes one or two more
   documented rule ids).

You never need to open a `.js` file in this repository to do any of the above
— `schema/qusx.xsd`, `schema/qusx.sch`, `rules.json`, and
`docs/conformance/NORMATIVE-RULES.md` are the complete, self-describing
contract.

## Rule coverage

Every rule listed in the task's coverage requirement has a dedicated fixture
whose `targetsRule` is that rule id: `QUSX-WF-003`, `QUSX-STR-002`,
`QUSX-STR-006`, `QUSX-STR-007`, `QUSX-STR-008`, `QUSX-STR-011`,
`QUSX-PIN-001`, `QUSX-PIN-002`, `QUSX-PIN-003`, `QUSX-PIN-004`,
`QUSX-PIN-005`, `QUSX-PIN-006`, `QUSX-PIN-008`, `QUSX-AYH-001`,
`QUSX-WRD-001`, `QUSX-WRD-002`, `QUSX-TRD-001`, `QUSX-NRM-001`. `QUSX-WF-001`
(not well-formed XML) is covered by the reused
`test/fixtures/malformed-not-well-formed.xml`.

## Internal self-check (optional, Node-based)

`verify-manifest.js` is a convenience script for maintainers of *this repo*
(not required reading for a third-party implementation). It checks that every
`file` referenced in `manifest.json` exists, every rule id round-trips through
`rules.json`, and every fixture's `expectedFailingRules` includes its own
`targetsRule`. Run it with:

```
node test/conformance/verify-manifest.js
```

It does **not** run the XSD, Schematron, or semantic checks itself — it only
proves the manifest is an internally-consistent contract, not that the
fixtures actually validate/fail the way they claim. That claim was verified
manually while building this suite, by running each fixture through
`schema/qusx.xsd` (via `lxml.etree.XMLSchema`), `schema/qusx.sch` (via
`lxml.isoschematron.Schematron`), and `node src/validate.js <file>`.
