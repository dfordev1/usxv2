# Orthographic differences pending upstream review (11:13, 80:25)

**Status: unresolved, deliberately not auto-corrected.** These 2 of the 6
residual checksum differences (see `README.md`'s Text integrity section)
change an encoded letter, not just spacing — a materially different kind of
change from the 4 formatting corrections in `qul-text-corrections.json`, and
one this project will not apply without an authoritative upstream decision.

## 11:13

- QUL (`data/raw/uthmani.json`): `افْتَرَاهُ` — plain alef, then alef.
- Tanzil (`data/external/tanzil-uthmani-full-options.xml`, live download,
  2026-07-13): `ٱفْتَرَىٰهُ` — alef wasla, then alef maksura with superscript
  alef.
- quran.com v4 API (`api.quran.com/api/v4/quran/verses/uthmani?verse_key=11:13`,
  live fetch, 2026-07-13): `ٱفْتَرَىٰهُ` — agrees with Tanzil.

## 80:25

- QUL: `اَنَّا` — plain alef with fatha.
- Tanzil: `أَنَّا` — alef with hamza above.
- quran.com v4 API: `أَنَّا` — agrees with Tanzil.

## Why this isn't corrected here

Two independently-operated, actively-maintained platforms (Tanzil, quran.com)
agree with each other and disagree with QUL at exactly these two positions.
That's real evidence of a QUL transcription defect, not a legitimate
alternate reading or riwayah — but:

1. quran.com's Uthmani text likely shares lineage with Tanzil's, so this is
   not a fully independent third source; it does not rise to the level of
   "authoritative confirmation" on its own.
2. Neither check consulted a primary/printed source (e.g. the Madinah Mushaf
   used by KFGQPC, which is QUL's own stated origin) or QUL directly.
3. `data/raw/uthmani.json` is third-party licensed source data (see
   `data/LICENSES.md`) — this project's policy is to report suspected
   defects upstream, not silently patch imported source text, scriptural or
   otherwise.

## Recommended next step

Open an issue against QUL (https://qul.tarteel.ai or its GitHub, once
confirmed) citing this document and both corroborating sources, and ask
whether 11:13 and 80:25 are known/intentional. This project has not sent
that report yet — it needs a human decision on QUL's actual issue-tracking
channel before anything is filed on the maintainer's behalf.

**If QUL confirms and corrects upstream:** re-run
`node scripts/checksum-verify-full-options.js` — the fix will show up as a
newly-matching verse automatically, no code change needed.

**If QUL disputes the correction, or this project wants to unblock text
integrity without waiting on QUL:** add matching entries to
`data/external/qul-text-corrections.json` with class `"orthographic"`
(distinct from `"formatting"`) and full provenance, following the same
transparent-correction-layer pattern already used for the 4 formatting
cases — never edit `data/raw/uthmani.json` directly.
