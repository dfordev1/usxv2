#!/usr/bin/env node
// Derives a "no-tashkeel" (bare consonant skeleton) text variant from an
// existing generated QUSX file, WITHOUT touching any pin/milestone
// structure -- only the text content inside <word> elements changes.
//
// This is a direct, concrete test of a real proposal from the Itqan
// community (see docs/multi-tradition-status.md / the "calligraphy vs
// plain vs no-tashkeel" idea): that milestone pins should be built once
// against one text layer and carry across other text representations of
// the same underlying words, rather than needing separate pins per layer.
// Stripping diacritics is the simplest possible text-layer transform, so
// it's the cheapest way to prove or disprove that claim before attempting
// the much harder "standardized plain text" (QPC-glyph vs plain Unicode)
// layer, which needs real normalization rules, not just character removal.
//
// Usage: node scripts/derive_no_tashkeel.js <path-to-qusx-file>
// Example: node scripts/derive_no_tashkeel.js output/madani-v2/001.qusx.xml

const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/derive_no_tashkeel.js <path-to-qusx-file>");
  process.exit(1);
}

// Arabic diacritics (harakat, tanwin, sukun, shadda, small high marks) --
// combining-mark ranges actually present in QUL/quran-svg text, confirmed
// by direct inspection, not copied from a generic "Arabic diacritics" list.
// Deliberately does NOT strip tatweel (ـ, U+0640) -- that's a glyph-spacing
// character, not a diacritic, and removing it would change word shape, not
// just remove vowel marks.
const TASHKEEL_RE = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;

function stripTashkeel(text) {
  return text.replace(TASHKEEL_RE, "");
}

function main() {
  const xml = fs.readFileSync(inputPath, "utf-8");

  let wordsTransformed = 0;
  const transformed = xml.replace(/(<word\b[^>]*>)([^<]*)(<\/word>)/g, (match, open, text, close) => {
    wordsTransformed++;
    return open + stripTashkeel(text) + close;
  });

  // Record the transform on the root element so a consumer can tell this
  // isn't the original file, without inventing a new schema attribute --
  // reuse normalization, which already exists for exactly this purpose.
  const withNote = transformed.replace(
    /normalization="NFC"/,
    'normalization="NFC-no-tashkeel"'
  );

  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, ".qusx.xml");
  const outPath = path.join(dir, `${base}.no-tashkeel.qusx.xml`);
  fs.writeFileSync(outPath, withNote, "utf-8");
  console.log(`wrote ${outPath} (${wordsTransformed} words transformed)`);
}

main();
