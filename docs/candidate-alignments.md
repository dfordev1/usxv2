# Cross-tradition candidate alignments

**Status:** generated technical research data; not scholarly certified.

The candidate generator aligns each tradition's continuous word stream to
Hafs one surah at a time. It does not assume equal ayah numbers or boundaries.
Original text and source locations remain unchanged in the output.

Run one tradition:

```sh
npm run align:candidates -- warsh
```

Run one surah during development:

```sh
npm run align:candidates -- warsh --surah=57 --output=tmp/warsh-57.json
```

Generated review files are under `data/alignments/`. Each non-trivial slot is
classified as:

- `hafs-only`: possible omission, boundary/source difference, or tokenization difference.
- `tradition-only`: possible addition, boundary/source difference, or tokenization difference.
- `uncertain-match`: sequence-aligned words whose normalized spellings differ.

`exact` and `orthographic-match` slots are counted in each surah summary but
omitted from the review queue. Normalization is an alignment aid only; source
text is never rewritten.

## Required publication gate

Do not publish these candidates as authoritative qira'at mappings merely because
the software produced them. A qualified reviewer must classify every
`review-required` record, cite a source, and approve a separate normative mapping
file. Candidate files intentionally carry the status
`technical-candidates-not-scholarly-certified`.
