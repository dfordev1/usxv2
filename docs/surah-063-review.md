# Surah 63 complete alignment review pilot

Surah 63 (Al-Munafiqun) is the first complete-surah QUSX alignment review
inventory. It was selected because all five non-Hafs source traditions are
represented while the complete generated candidate set is only eight
observations at four unique locations.

```bash
npx quran-usx@beta review 63
npx quran-usx@beta review 63 --json
```

The four locations are `63:6:16`, `63:10:14`, `63:11:6`, and `63:11:11`.
The JSON preserves every source token and its surrounding context. All four are
now `printed-edition-verified`: they were visually checked against page 555 of
the relevant KFQC vector-page exports. Source pages, focused screenshots,
hashes and decisions are recorded in
`data/review/surah-063-printed-evidence-v1.json` and
`docs/evidence/surah-063/`.

This status means that QUSX matches what those edition files visibly print. It
does not claim scholarly certification of the underlying qiraat.

A later qualified reviewer may confirm or revise each classification:

- `reading-variant`
- `orthography-presentation`
- `tokenization`
- `source-versification`
- `reject-candidate`

The two `reading-variant` decisions should not move into the normative alignment
file as scholarly certified without qualified review. Regenerate the inventory
and reapply its evidence overlay with `npm run review:surah -- 63`.
