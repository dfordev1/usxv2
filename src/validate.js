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
// Usage: node src/validate.js [file ... | all]

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "output");

const MILESTONE_TAGS = ["juz", "manzil", "hizb", "rub", "page", "line", "ayah"];
const REQUIRED_ATTRS = {
  juz: ["number", "sid"],
  manzil: ["number", "sid"],
  hizb: ["number", "sid"],
  rub: ["number", "sid"],
  page: ["number", "sid"],
  line: ["number", "sid"],
  ayah: ["number", "tradition", "sid"],
  word: ["id", "position"],
  sajda: ["number", "type", "verseKey"],
};

function parseAttrs(attrString) {
  const attrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(attrString))) attrs[m[1]] = m[2];
  return attrs;
}

function validateFile(filePath) {
  const xml = fs.readFileSync(filePath, "utf-8");
  const errors = [];
  const fileName = path.basename(filePath);

  const rootMatch = xml.match(/<qusx\s+([^>]*)>/);
  if (!rootMatch) {
    return [`${fileName}: no <qusx> root element found`];
  }
  const rootAttrs = parseAttrs(rootMatch[1]);
  const declaredAyahCount = Number(rootAttrs.ayahCount);

  // walk every top-level element in document order
  const tagRe = /<(\w+)([^>]*?)(\/)?>/g;
  let m;
  const openPerAxis = new Map(); // tag -> currently open {sid} for that axis (each axis is single-range at a time)
  const seenSids = new Map(); // sid -> tag
  let closedSids = new Set();
  let ayahNumbers = [];
  let wordIds = [];
  let lastWordId = 0;

  while ((m = tagRe.exec(xml))) {
    const tag = m[1];
    if (tag === "qusx" || tag === "?xml") continue;
    const attrs = parseAttrs(m[2]);
    const selfClosing = !!m[3];

    if (tag === "word") {
      for (const req of REQUIRED_ATTRS.word) {
        if (!(req in attrs)) errors.push(`${fileName}: <word> missing required attr "${req}" near id=${attrs.id}`);
      }
      const id = Number(attrs.id);
      wordIds.push(id);
      if (id <= lastWordId) errors.push(`${fileName}: word id ${id} is not strictly increasing after ${lastWordId}`);
      lastWordId = id;
      continue;
    }

    if (tag === "sajda") {
      for (const req of REQUIRED_ATTRS.sajda) {
        if (!(req in attrs)) errors.push(`${fileName}: <sajda> missing required attr "${req}"`);
      }
      if (attrs.type && !["required", "optional"].includes(attrs.type)) {
        errors.push(`${fileName}: <sajda> invalid type "${attrs.type}"`);
      }
      continue;
    }

    if (!MILESTONE_TAGS.includes(tag)) {
      errors.push(`${fileName}: unexpected element <${tag}>`);
      continue;
    }

    const isOpen = "sid" in attrs;
    const isClose = "eid" in attrs && !isOpen;

    if (!isOpen && !isClose) {
      errors.push(`${fileName}: <${tag}> has neither sid nor eid`);
      continue;
    }

    if (isOpen) {
      for (const req of REQUIRED_ATTRS[tag]) {
        if (!(req in attrs)) errors.push(`${fileName}: <${tag} sid="${attrs.sid}"> missing required attr "${req}"`);
      }
      if (seenSids.has(attrs.sid)) {
        errors.push(`${fileName}: duplicate sid "${attrs.sid}"`);
      }
      seenSids.set(attrs.sid, tag);

      // each axis can only have one open range at a time (a new <ayah sid=...>
      // can't open before the previous ayah closed) — but different axes are
      // independent of each other, see file-level comment on overlap.
      const alreadyOpen = openPerAxis.get(tag);
      if (alreadyOpen) {
        errors.push(
          `${fileName}: <${tag} sid="${attrs.sid}"> opened while <${tag} sid="${alreadyOpen.sid}"> (same axis) was still open`
        );
      }
      openPerAxis.set(tag, { sid: attrs.sid });

      if (tag === "ayah") ayahNumbers.push(Number(attrs.number));
      continue;
    }

    if (isClose) {
      const open = openPerAxis.get(tag);
      if (!open) {
        errors.push(`${fileName}: <${tag} eid="${attrs.eid}"> has no matching open <${tag} sid="...">`);
      } else {
        if (open.sid !== attrs.eid) {
          errors.push(`${fileName}: <${tag} eid="${attrs.eid}"> does not match its own open sid "${open.sid}"`);
        }
        openPerAxis.delete(tag);
        closedSids.add(attrs.eid);
      }
    }
  }

  const stillOpen = [...openPerAxis.keys()];
  if (stillOpen.length > 0) {
    errors.push(`${fileName}: unclosed milestones at end of file: ${stillOpen.join(", ")}`);
  }

  for (const sid of seenSids.keys()) {
    if (!closedSids.has(sid)) errors.push(`${fileName}: sid "${sid}" was never closed`);
  }

  // ayah numbers should be exactly 1..ayahCount, each appearing once, in order
  const expected = Array.from({ length: declaredAyahCount }, (_, i) => i + 1);
  if (JSON.stringify(ayahNumbers) !== JSON.stringify(expected)) {
    errors.push(
      `${fileName}: ayah numbers ${JSON.stringify(ayahNumbers)} do not match expected 1..${declaredAyahCount}`
    );
  }

  return errors;
}

function main() {
  const args = process.argv.slice(2);
  let files;
  if (args.length === 0 || args[0] === "all") {
    files = fs
      .readdirSync(OUT)
      .filter((f) => f.endsWith(".xml"))
      .sort()
      .map((f) => path.join(OUT, f));
  } else {
    files = args.map((a) => path.join(OUT, a));
  }

  let totalErrors = 0;
  for (const f of files) {
    const errors = validateFile(f);
    totalErrors += errors.length;
    for (const e of errors) console.log("FAIL: " + e);
  }

  console.log(`\nChecked ${files.length} file(s), ${totalErrors} error(s).`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
