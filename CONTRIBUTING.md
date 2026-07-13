# Contributing to QUSX

This is a v0.1 research prototype (see `README.md` Known gaps), not a formally
governed project — there's no maintainer team or approval process beyond normal
GitHub PR review. That said, here's how to contribute usefully.

## Before you start

Read `README.md` in full, especially **Known gaps** — it lists what's already known
to be missing or wrong, so you don't duplicate discovery work. If you're fixing
something from that list, mention which item in your PR description.

## Setup

```bash
npm install       # no runtime JS deps; installs devDependencies if any
pip install -r requirements.txt
npm run verify    # runs most of what CI runs (see the note under "Before opening a PR")
```

## Making a change

- **Changing the generator** (`src/generate.js`): after any change, regenerate
  *all ten* layouts (`for layout in madani-v2 madani-v1 madani-v4-tajweed qatar
  indopak-15 indopak-9-gaba indopak-13-qudratullah indopak-13-taj indopak-16-taj
  nastaleeq; do node src/generate.js --layout=$layout all; done`) and commit the
  regenerated `output/` files in the same PR. CI's deterministic-regeneration
  check will fail the build otherwise — it exists specifically to catch
  generator changes that weren't followed by a regeneration.
- **Changing the schema** (`schema/qusx.xsd`): run `python scripts/xsd_validate.py`
  and `node test/run_tests.js` — both must still pass. If you're tightening a
  constraint, check whether it now (correctly) rejects any currently-committed
  output; if so, that's a real bug in the generator to fix, not the schema.
- **Changing the validator** (`src/validate.js`): add a fixture to
  `test/fixtures/` demonstrating what you're now catching (or now correctly no
  longer flagging), and an assertion for it in `test/run_tests.js`. A validator
  change with no new test is easy to accidentally revert later.
- **Adding data** (`data/`): update `THIRD_PARTY_NOTICES.md` with the source,
  retrieval date, and license/terms — this project has already hit two cases
  (mislabeled data, unlicensed data) where skipping this check caused real
  problems; see `docs/prior-art-references.md` for what happened.

## Before opening a PR

```bash
npm run verify
```

This runs `validate.js`, `xsd_validate.py` (main + `--pilot`), `test/run_tests.js`,
and the checksum baseline gate in one command. **It does not run the
deterministic-regeneration checks that CI also runs** (main + pilot) — those
regenerate every file from source and fail if the result differs from what's
committed. If you changed the generator, run the regeneration commands above
(and their pilot equivalent, `for tradition in warsh qalon douri shubah sousi;
do node scripts/generate_tradition_pilot.js $tradition all; done`) and commit
the result, or CI will fail even though `npm run verify` passed locally.

## What's most useful right now

See `README.md` → Known gaps for the current prioritized list. The single highest-value
open item is sourcing verified word-level Qalun/Warsh (or other riwayah) text — see
that section for exactly what's blocking it and what's already been tried.
