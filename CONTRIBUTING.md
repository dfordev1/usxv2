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
npm install       # no runtime deps, but keeps package-lock in sync
pip install -r requirements.txt
npm run verify    # confirms your environment can run everything CI runs
```

## Making a change

- **Changing the generator** (`src/generate.js`): after any change, regenerate
  *all* layouts (`for layout in madani-v2 madani-v1 madani-v4-tajweed qatar
  indopak-15; do node src/generate.js --layout=$layout all; done`) and commit the
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

This runs everything CI runs (`validate.js`, `xsd_validate.py`, `test/run_tests.js`)
in one command. If it doesn't pass locally, it won't pass in CI.

## What's most useful right now

See `README.md` → Known gaps for the current prioritized list. The single highest-value
open item is sourcing verified word-level Qalun/Warsh (or other riwayah) text — see
that section for exactly what's blocking it and what's already been tried.
