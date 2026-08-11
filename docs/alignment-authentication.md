# Alignment difference authentication

**Result:** the eight records (three unique locations) are authenticated as
published-source textual differences.

Authentication scope is deliberately precise: the readings below occur in the
repository's KFGQPC-derived files and in the newer KFGQPC-derived datasets used
and cross-validated by `quran-center/quran-meta`. King Fahd Complex also
publishes the corresponding digital mushaf editions. This establishes source
authenticity; it is not a claim that a named qira'at scholar signed this QUSX
mapping.

## Confirmed locations

- 37:130 — Hafs/Douri/Sousi/Shubah: `إِلْ يَاسِينَ`; Warsh/Qalun: `ءَالِ يَاسِينَ`.
- 40:26 — Hafs/Shubah: `أَوْ أَن يُظْهِرَ`; Warsh/Qalun/Douri/Sousi: `وَأَن يُظْهِرَ`.
- 57:24 Hafs (corresponding to 57:23 in Warsh/Qalun) — Hafs/Douri/Sousi/Shubah
  include `هُوَ`; Warsh/Qalun do not.

## Evidence

- [King Fahd Complex digital mushaf editions](https://dm.qurancomplex.gov.sa/)
- [KFGQPC-derived Hafs dataset](https://github.com/quran-center/quran-meta/blob/master/examples/data-check/data/hafsData_v2-0.json)
- [KFGQPC-derived Warsh dataset](https://github.com/quran-center/quran-meta/blob/master/examples/data-check/data/warshData_v2-1.json)
- [KFGQPC-derived Qalun dataset](https://github.com/quran-center/quran-meta/blob/master/examples/data-check/data/QalounData_v2-1.json)
- [KFGQPC-derived Douri dataset](https://github.com/quran-center/quran-meta/blob/master/examples/data-check/data/DouriData_v2-0.json)
- [KFGQPC-derived Sousi dataset](https://github.com/quran-center/quran-meta/blob/master/examples/data-check/data/SousiData_v2-0.json)

## Independent cross-checks

The three locations were also checked against sources outside the two dataset
copies:

- **37:130:** Quranpedia's King Fahd Complex Warsh mushaf prints
  `ءَالِ يَاسِينَ`. Classical qira'at commentary identifies this as the reading
  of Nafi' (therefore Warsh and Qalun), while the other form is `إِلْ يَاسِينَ`.
  See [Quranpedia Warsh](https://quranpedia.net/surah/4/37) and
  [al-Tibyan on the reading](https://tafsir.app/altibyan-ghreeb/37/130).
- **40:26:** Quranpedia's Qalun text prints `وَأَنْ يُظْهِرَ`, and its Douri
  comparison explicitly records changing `أَوْ أَن` to `وَأَن`. Classical
  attribution groups Nafi', Abu 'Amr, Ibn Kathir and Ibn Amir with `وَأَن`, and
  'Asim, Hamza and al-Kisa'i with `أَوْ أَن`. See
  [Qalun mushaf text](https://quranpedia.net/surah/7/40) and
  [Douri reading table](https://quranpedia.net/book-attachment/19870/77911).
- **57:23/24:** Early qira'at/tafsir sources explicitly attribute omission of
  `هُوَ` to Nafi' and Ibn Amir, with the other readers retaining it. This
  matches Warsh/Qalun versus Hafs/Douri/Sousi/Shubah. See
  [Bahr al-'Ulum](https://www.greattafsirs.com/Tafsir_Library.aspx?AyahNo=25&LanguageID=1&MadhabNo=2&QuranAyat_Home=1&SoraNo=57&TafsirNo=11)
  and [Quranpedia's reading note](https://quranpedia.net/surah/1/57/book/27800).

No checked source contradicted any of the eight records.
