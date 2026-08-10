#!/usr/bin/env node
// QUSX conformance checker.
// Enforces schema/qusx.xsd's shape rules (element/attribute set, sid XOR eid)
// plus semantic invariants an XSD can't express: every sid has exactly one
// matching eid, ayah numbers are contiguous from 1, and the header ayahCount
// matches the ayahs actually present.
//
// Nesting note: each milestone axis (juz/manzil/hizb/rub/page/line/ayah) is
// validated for well-paired sid/eid *independently*. Axes are NOT required to
// nest inside one another in document order — page/line boundaries are
// word-position-based and legitimately cross ayah (and even juz/hizb/rub)
// boundaries mid-ayah. That crossing is exactly the "overlapping structures"
// problem milestone markup exists to solve (see USX's own justification for
// milestones over nested elements) — requiring strict cross-axis nesting
// here would reject correct data, not catch real bugs.
//
// Usage: node src/validate.js [--layout=key] [file ... | all]
// With no file args, validates every *.xml under output/<layout>/ (all layouts
// if --layout is omitted).

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "output");
const PACKAGE = require("../package.json");
const GENERATOR_VERSION = PACKAGE.qusxGeneratorVersion || PACKAGE.version;

// Canonical surah names, loaded once for the name/number cross-check below.
// Missing gracefully (this validator can run on files outside the repo where
// data/raw/ isn't present) rather than crashing.
let CANONICAL_SURAH_NAMES = null;
try {
  CANONICAL_SURAH_NAMES = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "data", "raw", "quran-metadata-surah-name.json"), "utf-8")
  );
} catch {
  CANONICAL_SURAH_NAMES = null;
}

// Per-tradition ayah counts (surah name/bismillah/revelation-place are facts
// about the surah itself and don't vary by tradition -- only ayah count and
// numbering do, since different qira'at split/merge verse boundaries
// differently). Maps a <qusx tradition="..."> value (e.g. "warsh-kfqc") to
// its short key (e.g. "warsh") in data/traditions/ayah-counts.json. Missing
// gracefully, same pattern as CANONICAL_SURAH_NAMES above.
const TRADITION_ID_TO_KEY = {
  "hafs-kufi": "hafs",
  "warsh-kfqc": "warsh",
  "qalon-kfqc": "qalon",
  "douri-kfqc": "douri",
  "shubah-kfqc": "shubah",
  "sousi-kfqc": "sousi", // recognized, but no verified per-tradition count data exists yet -- see expectedAyahCount() usage below
};
let TRADITION_AYAH_COUNTS = null;
try {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "data", "traditions", "ayah-counts.json"), "utf-8")
  );
  TRADITION_AYAH_COUNTS = data.traditions;
} catch {
  TRADITION_AYAH_COUNTS = null;
}

// Returns the expected ayah count for a surah under a given tradition, or
// null if unknown (falls back to the Hafs canonical count in that case).
function expectedAyahCount(traditionAttr, surahNumber) {
  const key = TRADITION_ID_TO_KEY[traditionAttr];
  if (!key || !TRADITION_AYAH_COUNTS || !TRADITION_AYAH_COUNTS[key]) return null;
  const rec = TRADITION_AYAH_COUNTS[key].perSurah.find((s) => s.surah === surahNumber);
  return rec ? rec.ayahCount : null;
}

function allGeneratedFiles(layoutFilter) {
  const files = [];
  const layoutDirs = fs
    .readdirSync(OUT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !layoutFilter || name === layoutFilter);
  for (const dir of layoutDirs) {
    for (const f of fs.readdirSync(path.join(OUT, dir)).filter((f) => f.endsWith(".xml"))) {
      files.push(path.join(OUT, dir, f));
    }
  }
  return files.sort();
}

const MILESTONE_TAGS = ["juz", "manzil", "hizb", "rub", "ruku", "page", "line", "ayah"];
const REQUIRED_ATTRS = {
  juz: ["number", "sid"],
  manzil: ["number", "sid"],
  hizb: ["number", "sid"],
  rub: ["number", "sid"],
  ruku: ["number", "sid"],
  page: ["number", "sid"],
  line: ["number", "sid"],
  ayah: ["number", "tradition", "sid"],
  word: ["id", "position"],
  sajda: ["number", "type", "verseKey"],
};

// Returns { attrs, duplicates }. Silently overwriting a duplicate attribute
// (e.g. malformed input with `number="1" number="2"`) would hide a real
// well-formedness problem the XSD pass might not always catch first --
// duplicates are surfaced explicitly instead.
function parseAttrs(attrString) {
  const attrs = {};
  const duplicates = [];
  const re = /([A-Za-z_][\w:.-]*)="([^"]*)"/g;
  let m;
  while ((m = re.exec(attrString))) {
    if (Object.prototype.hasOwnProperty.call(attrs, m[1])) duplicates.push(m[1]);
    attrs[m[1]] = m[2];
  }
  return { attrs, duplicates };
}

function isValidVersion(value) {
  return /^\d+\.\d+(?:\.\d+)?(?:[-+][A-Za-z0-9.-]+)?$/.test(value);
}

function stripXmlNoise(xml) {
  return xml
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\?(?!xml)[\s\S]*?\?>/g, "");
}

function validateFile(filePath) {
  const errors = [];
  const fileName = path.basename(filePath);

  // Always return the same shape ({errors, wordCount, ...}), even on early
  // failure -- a caller that destructures the result shouldn't have to
  // special-case "no root element found" as a different return type.
  const EMPTY_RESULT = { wordCount: 0, sajdaCount: 0, rukuCount: 0, maxPageNumber: 0, ayahCount: 0, surah: null, generatorVersion: null };

  try {
    fs.readFileSync(filePath, "utf-8");
  } catch (e) {
    // A missing/unreadable file is a validation failure to report, not a
    // crash -- a raw Node stack trace isn't a useful diagnostic here.
    return { errors: [`[QUSX-WF-001] ${fileName}: could not read file (${e.code || e.message})`], ...EMPTY_RESULT };
  }

  const xml = fs.readFileSync(filePath, "utf-8");
  const xmlForScanning = stripXmlNoise(xml);
  const rootMatch = xmlForScanning.match(/<qusx\b([^>]*)\/?>/);
  if (!rootMatch) {
    return { errors: [`[QUSX-WF-001] ${fileName}: no <qusx> root element found`], ...EMPTY_RESULT };
  }
  const { attrs: rootAttrs, duplicates: rootDuplicates } = parseAttrs(rootMatch[1]);
  for (const dup of rootDuplicates) {
    errors.push(`[QUSX-WF-003] ${fileName}: root <qusx> has duplicate attribute "${dup}"`);
  }
  const scanChildren = [];
  const childRe = /<(\w+)([^>]*?)(\/)?>/g;
  let m;
  while ((m = childRe.exec(xmlForScanning))) {
    const tag = m[1];
    if (tag === "qusx" || tag === "?xml") continue;
    const { attrs } = parseAttrs(m[2]);
    scanChildren.push({ tag, attrs, text: "" });
  }
  if ("generatorVersion" in rootAttrs && rootAttrs.generatorVersion !== GENERATOR_VERSION) {
    errors.push(`[QUSX-HDR-007] ${fileName}: generatorVersion="${rootAttrs.generatorVersion}" does not match generator version "${GENERATOR_VERSION}"`);
  }
  for (const req of ["version", "surah", "name", "nameArabic", "ayahCount", "revelationPlace", "bismillahPre", "tradition"]) {
    if (!(req in rootAttrs)) {
      errors.push(`[QUSX-STR-001] ${fileName}: root <qusx> missing required attr "${req}"`);
    }
  }
  if ("version" in rootAttrs && !isValidVersion(rootAttrs.version)) {
    errors.push(`[QUSX-STR-001] ${fileName}: root version "${rootAttrs.version}" is not a valid semantic version`);
  }
  const declaredAyahCount = Number(rootAttrs.ayahCount);
  const declaredSurah = Number(rootAttrs.surah);

  // filename vs declared surah number: "042.qusx.xml" must contain surah="42"
  const fileNameMatch = fileName.match(/^(\d+)\.qusx\.xml$/);
  if (fileNameMatch) {
    const fileNameSurah = Number(fileNameMatch[1]);
    if (fileNameSurah !== declaredSurah) {
      errors.push(`[QUSX-HDR-001] ${fileName}: filename implies surah ${fileNameSurah}, but root surah="${declaredSurah}"`);
    }
  } else {
    errors.push(`[QUSX-HDR-001] ${fileName}: filename does not match expected pattern NNN.qusx.xml`);
  }

  // surah name/count vs the canonical QUL surah-name table, when available
  if (CANONICAL_SURAH_NAMES) {
    const canonical = CANONICAL_SURAH_NAMES[String(declaredSurah)];
    if (!canonical) {
      errors.push(`[QUSX-STR-002] ${fileName}: surah="${declaredSurah}" is not a valid surah number (no canonical entry 1-114)`);
    } else {
      if (rootAttrs.name !== canonical.name_simple) {
        errors.push(`[QUSX-HDR-002] ${fileName}: name="${rootAttrs.name}" does not match canonical "${canonical.name_simple}" for surah ${declaredSurah}`);
      }
      if (rootAttrs.nameArabic !== canonical.name_arabic) {
        errors.push(`[QUSX-HDR-003] ${fileName}: nameArabic="${rootAttrs.nameArabic}" does not match canonical "${canonical.name_arabic}" for surah ${declaredSurah}`);
      }
      // ayah count varies by tradition (different qira'at split/merge verse
      // boundaries differently). Only Hafs's canonical count is comparable
      // to a file with no `tradition` attribute or tradition="hafs-kufi" --
      // for a RECOGNIZED non-Hafs tradition we don't have verified
      // per-tradition counts for (e.g. Al-Susi), comparing against Hafs's
      // number would be comparing against the wrong baseline, not a
      // reasonable fallback. Skip the check in that case rather than
      // produce a false error.
      const isRecognizedNonHafs = rootAttrs.tradition && rootAttrs.tradition !== "hafs-kufi" && TRADITION_ID_TO_KEY[rootAttrs.tradition];
      const traditionExpected = expectedAyahCount(rootAttrs.tradition, declaredSurah);
      if (isRecognizedNonHafs && traditionExpected === null) {
        // no verified count available for this tradition -- skip, don't guess
      } else {
        const expected = traditionExpected !== null ? traditionExpected : Number(canonical.verses_count);
        if (expected !== declaredAyahCount) {
          errors.push(
            `[QUSX-HDR-006] ${fileName}: ayahCount="${declaredAyahCount}" does not match expected ${expected} for surah ${declaredSurah}` +
              (traditionExpected !== null ? ` (tradition="${rootAttrs.tradition}")` : " (Hafs canonical)")
          );
        }
      }
      if (String(rootAttrs.bismillahPre) !== String(canonical.bismillah_pre)) {
        errors.push(`[QUSX-HDR-005] ${fileName}: bismillahPre="${rootAttrs.bismillahPre}" does not match canonical ${canonical.bismillah_pre} for surah ${declaredSurah}`);
      }
      const canonicalPlace = canonical.revelation_place.toLowerCase();
      if (rootAttrs.revelationPlace !== canonicalPlace) {
        errors.push(`[QUSX-HDR-004] ${fileName}: revelationPlace="${rootAttrs.revelationPlace}" does not match canonical "${canonicalPlace}" for surah ${declaredSurah}`);
      }
    }
  }

  // walk every top-level element in document order
  const openPerAxis = new Map(); // tag -> currently open {sid} for that axis (each axis is single-range at a time)
  const seenSids = new Map(); // sid -> tag
  let closedSids = new Set();
  let ayahNumbers = [];
  let wordIds = [];
  let lastWordId = 0;
  let expectedPosition = 1; // resets to 1 at the start of each ayah
  let wordCount = 0;
  let sajdaCount = 0;
  let rukuCount = 0;
  let maxPageNumber = 0;

  for (const node of scanChildren) {
    const tag = node.tag;
    const attrs = node.attrs || {};

    if (tag === "word") {
      for (const req of REQUIRED_ATTRS.word) {
        if (!(req in attrs)) errors.push(`[QUSX-STR-008] ${fileName}: <word> missing required attr "${req}" near id=${attrs.id}`);
      }
      const id = Number(attrs.id);
      wordIds.push(id);
      wordCount++;
      if (id <= lastWordId) errors.push(`[QUSX-WRD-001] ${fileName}: word id ${id} is not strictly increasing after ${lastWordId}`);
      lastWordId = id;

      const position = Number(attrs.position);
      if (position !== expectedPosition) {
        errors.push(
          `[QUSX-WRD-002] ${fileName}: word id ${id} has position ${position}, expected ${expectedPosition} (position should count 1..N within each ayah, resetting at each ayah boundary)`
        );
      }
      expectedPosition++;
      continue;
    }

    if (tag === "sajda") {
      for (const req of REQUIRED_ATTRS.sajda) {
        if (!(req in attrs)) errors.push(`[QUSX-STR-010] ${fileName}: <sajda> missing required attr "${req}"`);
      }
      if (attrs.type && !["required", "optional"].includes(attrs.type)) {
        errors.push(`[QUSX-STR-010] ${fileName}: <sajda> invalid type "${attrs.type}"`);
      }
      sajdaCount++;
      continue;
    }

    if (!MILESTONE_TAGS.includes(tag)) {
      errors.push(`[QUSX-STR-007] ${fileName}: unexpected element <${tag}>`);
      continue;
    }

    const isOpen = "sid" in attrs;
    const isClose = "eid" in attrs && !isOpen;

    if (!isOpen && !("eid" in attrs)) {
      errors.push(`[QUSX-PIN-001] ${fileName}: <${tag}> has neither sid nor eid`);
      continue;
    }
    if (isOpen && "eid" in attrs) {
      errors.push(`[QUSX-PIN-001] ${fileName}: <${tag} sid="${attrs.sid}" eid="${attrs.eid}"> has both sid and eid -- must be exactly one (XOR)`);
      continue;
    }

    if (isOpen) {
      for (const req of REQUIRED_ATTRS[tag]) {
        if (!(req in attrs)) errors.push(`[QUSX-PIN-002] ${fileName}: <${tag} sid="${attrs.sid}"> missing required attr "${req}"`);
      }
      if (seenSids.has(attrs.sid)) {
        errors.push(`[QUSX-PIN-003] ${fileName}: duplicate sid "${attrs.sid}"`);
      }
      seenSids.set(attrs.sid, tag);

      // each axis can only have one open range at a time (a new <ayah sid=...>
      // can't open before the previous ayah closed) — but different axes are
      // independent of each other, see file-level comment on overlap.
      const alreadyOpen = openPerAxis.get(tag);
      if (alreadyOpen) {
        errors.push(
          `[QUSX-PIN-004] ${fileName}: <${tag} sid="${attrs.sid}"> opened while <${tag} sid="${alreadyOpen.sid}"> (same axis) was still open`
        );
      }
      openPerAxis.set(tag, { sid: attrs.sid });

      if (tag === "ayah") {
        ayahNumbers.push(Number(attrs.number));
        expectedPosition = 1; // word position numbering restarts at each ayah
        // QUSX-TRD-001: an ayah pin's tradition must equal the root tradition;
        // a file must not mix traditions. (Also enforced portably in
        // schema/qusx.sch; kept here so the reference corpus checker honors
        // every rule rules.json says it checks.)
        if ("tradition" in attrs && rootAttrs.tradition && attrs.tradition !== rootAttrs.tradition) {
          errors.push(
            `[QUSX-TRD-001] ${fileName}: <ayah sid="${attrs.sid}"> tradition="${attrs.tradition}" does not match root tradition="${rootAttrs.tradition}"`
          );
        }
      }
      if (tag === "ruku") rukuCount++;
      if (tag === "page") maxPageNumber = Math.max(maxPageNumber, Number(attrs.number));
      continue;
    }

    if (isClose) {
      const open = openPerAxis.get(tag);
      if (!open) {
        errors.push(`[QUSX-PIN-005] ${fileName}: <${tag} eid="${attrs.eid}"> has no matching open <${tag} sid="...">`);
      } else {
        if (open.sid !== attrs.eid) {
          errors.push(`[QUSX-PIN-005] ${fileName}: <${tag} eid="${attrs.eid}"> does not match its own open sid "${open.sid}"`);
        }
        openPerAxis.delete(tag);
        closedSids.add(attrs.eid);
      }
    }
  }

  // NFC-normalization check: run as a separate pass over <word>...</word>
  // text content (Arabic text never contains a literal "<", so this is safe)
  // rather than threading text capture through the attribute-only tag walker
  // above.
  const declaredNormalization = rootAttrs.normalization;
  if (declaredNormalization === "NFC") {
    const wordTextRe = /<word\b[^>]*>([^<]*)<\/word>/g;
    let wm;
    while ((wm = wordTextRe.exec(xml))) {
      const text = wm[1];
      if (text.normalize("NFC") !== text) {
        errors.push(`[QUSX-NRM-001] ${fileName}: word text "${text}" is not NFC-normalized, but root declares normalization="NFC"`);
      }
    }
  }

  const stillOpen = [...openPerAxis.keys()];
  if (stillOpen.length > 0) {
    errors.push(`[QUSX-PIN-006] ${fileName}: unclosed milestones at end of file: ${stillOpen.join(", ")}`);
  }

  for (const sid of seenSids.keys()) {
    if (!closedSids.has(sid)) errors.push(`[QUSX-PIN-006] ${fileName}: sid "${sid}" was never closed`);
  }

  // ayah numbers should be exactly 1..ayahCount, each appearing once, in order
  const expected = Array.from({ length: declaredAyahCount }, (_, i) => i + 1);
  if (JSON.stringify(ayahNumbers) !== JSON.stringify(expected)) {
    errors.push(
      `[QUSX-AYH-001] ${fileName}: ayah numbers ${JSON.stringify(ayahNumbers)} do not match expected 1..${declaredAyahCount}`
    );
  }

  return {
    errors,
    wordCount,
    sajdaCount,
    rukuCount,
    maxPageNumber,
    ayahCount: ayahNumbers.length,
    surah: Number(rootAttrs.surah),
    generatorVersion: rootAttrs.generatorVersion || null,
  };
}

// Known Quran-wide totals (Hafs/Kufi, standard 15-sajda list, 558 ruku
// markers) — used to check that a layout's generated corpus is complete, not
// just that each file is individually well-formed.
const EXPECTED_CORPUS_TOTALS = { surahCount: 114, ayahCount: 6236, wordCount: 83668, sajdaCount: 15, rukuCount: 558 };

// Real page count per print edition, from each layout database's own `info`
// table (see src/generate.js buildWordLocation) — not guessed. IndoPak
// genuinely paginates differently (610 vs 604) and that's correct, not a bug;
// this check exists to catch the case where it's *wrong* (e.g. a layout
// silently truncated or a wrong database wired to the wrong key).
const EXPECTED_PAGE_COUNTS = {
  "madani-v2": 604,
  "madani-v1": 604,
  "madani-v4-tajweed": 604,
  qatar: 604,
  "indopak-15": 610,
  "indopak-9-gaba": 1890,
  "indopak-13-qudratullah": 849,
  "indopak-13-taj": 847,
  "indopak-16-taj": 548,
  nastaleeq: 610,
};

function validateLayoutCompleteness(layoutDir, fileResults) {
  const errors = [];
  const surahsPresent = new Set(fileResults.map((r) => r.surah));
  if (surahsPresent.size !== EXPECTED_CORPUS_TOTALS.surahCount) {
    const missing = [];
    for (let i = 1; i <= 114; i++) if (!surahsPresent.has(i)) missing.push(i);
    errors.push(
      `[QUSX-COR-001] ${layoutDir}: expected 114 surahs, found ${surahsPresent.size}. Missing: ${missing.join(", ") || "(duplicates present instead)"}`
    );
  }

  const totals = fileResults.reduce(
    (acc, r) => ({
      ayahCount: acc.ayahCount + r.ayahCount,
      wordCount: acc.wordCount + r.wordCount,
      sajdaCount: acc.sajdaCount + r.sajdaCount,
      rukuCount: acc.rukuCount + r.rukuCount,
      generatorVersionMismatch: acc.generatorVersionMismatch + (r.generatorVersion && r.generatorVersion !== GENERATOR_VERSION ? 1 : 0),
    }),
    { ayahCount: 0, wordCount: 0, sajdaCount: 0, rukuCount: 0, generatorVersionMismatch: 0 }
  );

  const CORPUS_TOTAL_RULE_IDS = {
    ayahCount: "QUSX-COR-002",
    wordCount: "QUSX-COR-003",
    sajdaCount: "QUSX-COR-004",
    rukuCount: "QUSX-COR-005",
  };
  for (const key of ["ayahCount", "wordCount", "sajdaCount", "rukuCount"]) {
    if (totals[key] !== EXPECTED_CORPUS_TOTALS[key]) {
      errors.push(`[${CORPUS_TOTAL_RULE_IDS[key]}] ${layoutDir}: corpus-wide ${key} is ${totals[key]}, expected ${EXPECTED_CORPUS_TOTALS[key]}`);
    }
  }
  if (totals.generatorVersionMismatch > 0) {
    errors.push(`[QUSX-HDR-007] ${layoutDir}: ${totals.generatorVersionMismatch} file(s) have a generatorVersion that does not match generator version "${GENERATOR_VERSION}"`);
  }

  const expectedPages = EXPECTED_PAGE_COUNTS[layoutDir];
  if (expectedPages) {
    const actualMaxPage = Math.max(...fileResults.map((r) => r.maxPageNumber));
    if (actualMaxPage !== expectedPages) {
      errors.push(`[QUSX-LAY-001] ${layoutDir}: highest page number across the corpus is ${actualMaxPage}, expected ${expectedPages}`);
    }
  }

  return errors;
}

// Word text (and morphology) should be byte-identical across every layout —
// only page/line placement is supposed to differ between print editions. This
// extracts each file's word sequence (text + root/stem/lemma, ignoring
// page/line/fragment attributes) and compares the same surah across all
// layouts present in this run, flagging any real divergence — which would
// mean a layout's generation path silently diverged, not just its pagination.
function extractWordSequence(filePath) {
  const xml = fs.readFileSync(filePath, "utf-8");
  const re = /<word\b([^>]*)>([^<]*)<\/word>/g;
  const sequence = [];
  let m;
  while ((m = re.exec(xml))) {
    const { attrs } = parseAttrs(m[1]);
    sequence.push({ text: m[2], root: attrs.root || null, stem: attrs.stem || null, lemma: attrs.lemma || null });
  }
  return sequence;
}

function validateCrossLayoutConsistency(filesByLayoutBySurah) {
  const errors = [];
  for (const [surah, byLayout] of filesByLayoutBySurah) {
    const layoutNames = Object.keys(byLayout);
    if (layoutNames.length < 2) continue;
    const [firstLayout, ...restLayouts] = layoutNames;
    const firstSeq = JSON.stringify(extractWordSequence(byLayout[firstLayout]));
    for (const layout of restLayouts) {
      const seq = JSON.stringify(extractWordSequence(byLayout[layout]));
      if (seq !== firstSeq) {
        errors.push(
          `[QUSX-LAY-002] surah ${surah}: word/morphology sequence in layout "${layout}" differs from layout "${firstLayout}" (should be identical — only page/line placement should differ between layouts)`
        );
      }
    }
  }
  return errors;
}

function main() {
  const rawArgs = process.argv.slice(2);
  let layoutFilter = null;
  const args = [];
  for (const a of rawArgs) {
    const m = a.match(/^--layout=(.+)$/);
    if (m) layoutFilter = m[1];
    else args.push(a);
  }

  // A typo'd --layout value previously matched zero directories silently
  // (allGeneratedFiles just filters an empty result), producing a false
  // "Checked 0 file(s), 0 error(s)" green run. Reject it explicitly instead.
  if (layoutFilter) {
    const existingLayouts = fs
      .readdirSync(OUT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    if (!existingLayouts.includes(layoutFilter)) {
      console.error(`Unknown layout "${layoutFilter}". Available: ${existingLayouts.join(", ")}`);
      process.exit(1);
    }
  }

  let files;
  if (args.length === 0 || args[0] === "all") {
    files = allGeneratedFiles(layoutFilter);
  } else {
    // A file argument that already resolves to a real path (relative to cwd,
    // or absolute) is used literally -- e.g. `test/fixtures/example.xml`.
    // Only a bare filename with no existing match falls back to the
    // convenience shorthand of being joined under output/<layout>/, which is
    // what the common `validate.js 001.qusx.xml` usage relies on.
    files = args.map((a) => (fs.existsSync(a) ? a : path.join(OUT, layoutFilter || "madani-v2", a)));
  }

  // A validation run that discovers zero files is not a green pass -- most
  // likely a wrong path, an empty/not-yet-generated output directory, or an
  // argument mistake. Fail loudly instead of reporting "0 file(s), 0 error(s)".
  if (files.length === 0) {
    console.error("No files to validate -- 0 files matched. This is treated as a failure, not a pass.");
    process.exit(1);
  }

  let totalErrors = 0;
  const resultsByLayout = new Map(); // layoutDir -> [{wordCount, sajdaCount, ayahCount, surah}]
  const filesByLayoutBySurah = new Map(); // surah -> {layoutDir: filePath}

  for (const f of files) {
    const { errors, ...result } = validateFile(f);
    totalErrors += errors.length;
    for (const e of errors) console.log("FAIL: " + e);

    const layoutDir = path.basename(path.dirname(f));
    if (!resultsByLayout.has(layoutDir)) resultsByLayout.set(layoutDir, []);
    resultsByLayout.get(layoutDir).push(result);

    if (!filesByLayoutBySurah.has(result.surah)) filesByLayoutBySurah.set(result.surah, {});
    filesByLayoutBySurah.get(result.surah)[layoutDir] = f;
  }

  // corpus-completeness and cross-layout checks only make sense when
  // validating a full "all" run (not a hand-picked file list) — skip otherwise.
  if (args.length === 0 || args[0] === "all") {
    for (const [layoutDir, results] of resultsByLayout) {
      const completenessErrors = validateLayoutCompleteness(layoutDir, results);
      totalErrors += completenessErrors.length;
      for (const e of completenessErrors) console.log("FAIL: " + e);
    }

    if (!layoutFilter) {
      const crossLayoutErrors = validateCrossLayoutConsistency(filesByLayoutBySurah);
      totalErrors += crossLayoutErrors.length;
      for (const e of crossLayoutErrors) console.log("FAIL: " + e);
    }
  }

  console.log(`\nChecked ${files.length} file(s), ${totalErrors} error(s).`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { validateFile, validateLayoutCompleteness, validateCrossLayoutConsistency };
