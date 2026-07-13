# Al-Susi pilot output is NON-CONFORMING by design

**These 114 files are NOT XSD-valid, and that is expected, not a bug.**

Al-Susi (`sousi-kfqc`) was a bonus tradition picked up alongside the four
originally-scoped pilot traditions (Warsh, Qalun, Al-Duri, Shubah). Its
tradition code is **deliberately not in `schema/qusx.xsd`'s tradition enum**,
so every file here fails XSD validation on that attribute.

Why it's kept anyway: the underlying per-ayah Arabic text is real and was
verified to differ from Hafs at the rasm level, so the output has value as a
reference artifact. But Al-Susi has **no independently verified ayah-count
data** the way the other four do, and it was never part of the originally
licensed/scoped set — so it is not a formally supported tradition.

Consequences (all intentional):
- `scripts/xsd_validate.py --pilot` **excludes** this directory (it validates
  only the 4 conforming traditions). This directory is expected to be
  0/114 XSD-valid.
- `src/validate.js` recognizes `sousi-kfqc` but skips the ayah-count check for
  it, since there is no verified count baseline.

If Al-Susi is ever promoted to formal support, that requires: verified
per-tradition ayah counts, adding `sousi-kfqc` to the schema enum, and moving
these files into a conforming location.

See `docs/multi-tradition-status.md` for the full decision record.
