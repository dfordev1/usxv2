# Surah 63 complete alignment review pilot

Surah 63 (Al-Munafiqun) is the first complete-surah QUSX alignment review
inventory. It was selected because all five non-Hafs source traditions are
represented while the complete generated candidate set is only eight
observations at four unique locations.

```bash
npx quran-usx@beta review 63
npx quran-usx@beta review 63 --json
```

The four decisions required are at `63:6:16`, `63:10:14`, `63:11:6`, and
`63:11:11`. The JSON preserves every source token and its surrounding context.
None is approved yet: each record is `scholarly-review-required`, with empty
reviewer, date, evidence, and decision fields.

A qualified reviewer should classify each location as one of:

- `reading-variant`
- `orthography-presentation`
- `tokenization`
- `source-versification`
- `reject-candidate`

For an approval, fill `reviewer`, `reviewedAt`, `decision`, at least one
authoritative evidence URL, and concise notes. A second reviewer should verify
all `reading-variant` decisions before they move into the normative alignment
file. Regenerate the untouched inventory with `npm run review:surah -- 63`.
