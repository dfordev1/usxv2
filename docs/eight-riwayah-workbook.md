# Eight-riwayah aligned-word dataset

This pilot converts Sheikh Talha bin Bashir's aligned workbook into stable QUSX
slots for Hafs, Shu'bah, Warsh, Qalun, Al-Bazzi, Al-Duri, Qunbul, and Al-Susi.
The workbook contains 77,432 manually aligned rows, using Hafs as its reference.

## What is established

- Every workbook row is mapped to the QUSX Hafs word stream. The importer handles
  the source's two cross-tokenization cases instead of allowing row drift.
- All eight source readings and the original sheet/row provenance are preserved.
- 31,921 rows are identical, 44,574 differ only in presentation/orthography,
  931 are substantive review candidates, and 6 are explicit split/join cases.
- The compressed full dataset and the smaller 937-record review queue are
  deterministic outputs of `scripts/import_eight_riwayah_workbook.py`.
- A complete cross-source audit against commit
  `281dbbe8eed1370daa5a023b6cd81655cbfd6473` of the accessible KFGQPC mirror
  found **zero unresolved substantive letter differences** across all eight
  traditions after QUSX normalization. Hafs matches exactly. The only retained
  differences are the Sūrah 1 Basmalah boundary convention in four traditions
  and a standalone-versus-combining hamza encoding at 2:72 in six traditions.
  See `data/alignments/eight-riwayah-mirror-audit-v1.json`.

## What is not established

These records are source-derived candidates, not scholarly rulings. A qualified
reviewer must approve each substantive and split/join record before it can enter
QUSX's normative alignment. The workbook's redistribution permission also needs
to be documented before a public release should be treated as cleared.

## Rebuild

```bash
python scripts/import_eight_riwayah_workbook.py path/to/riwayat-words.xlsx
```

Expected source SHA-256:
`c38f66638cec1d8464e24b6d891f273cdaf63f70a64769e8f60845d476a00512`.

Cross-check a local clone of the mirror:

```bash
python scripts/audit_kfgqpc_mirror.py path/to/riwayat-words.xlsx path/to/quran-data-kfgqpc
```

## Query

```bash
npx quran-usx@beta eight-summary
npx quran-usx@beta slot 63:11
npx quran-usx@beta slot 63:11:11 --json
```

By default `slot` searches only the review queue. Add `--all` to search all
77,432 aligned slots, including identical and presentation-only rows.
