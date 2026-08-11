#!/usr/bin/env node
import { loadBundledAlignment, loadBundledAyahMapping, validateQusxFile } from "../sdk/node.mjs";

const aliases = Object.freeze({
  hafs: "hafs-kufi",
  shubah: "shubah-kfqc",
  warsh: "warsh-kfqc",
  qalon: "qalon-kfqc",
  douri: "douri-kfqc",
  sousi: "sousi-kfqc",
});

function usage() {
  return `QUSX command line

Usage:
  quran-usx compare <from> <to> <surah:ayah> [--json]
  quran-usx map <from> <to> <surah:ayah> [--json]
  quran-usx validate <file.qusx.xml> [--json]

Long form:
  quran-usx compare --from hafs --to warsh --ayah 57:24

Traditions: ${Object.keys(aliases).join(", ")}

Research notice: boundary mappings are algorithmically source-derived. Alignment
rules are source-authenticated prototypes unless explicitly marked otherwise.`;
}

function parseArgs(argv) {
  const json = argv.includes("--json");
  const args = argv.filter((arg) => arg !== "--json");
  const command = args.shift();
  const options = {};
  const positional = [];
  while (args.length) {
    const arg = args.shift();
    if (["--from", "--to", "--ayah"].includes(arg)) options[arg.slice(2)] = args.shift();
    else positional.push(arg);
  }
  return { command, json, positional, options };
}

function tradition(value) {
  const id = aliases[value] ?? value;
  if (!Object.values(aliases).includes(id)) throw new Error(`Unknown tradition: ${value}`);
  return id;
}

function print(value, json) {
  if (json) console.log(JSON.stringify(value, null, 2));
  else console.log(value);
}

async function compare(from, to, reference, json) {
  const source = tradition(from);
  const target = tradition(to);
  const [alignment, mapping] = await Promise.all([loadBundledAlignment(), loadBundledAyahMapping()]);
  const mappedAyahs = mapping.mapAyah(reference, target, source);
  const differences = alignment.compareAyah(reference, source, target);
  const result = { command: "compare", reference, source, target, mappedAyahs, reviewedDifferences: differences, status: alignment.alignment.status };
  if (json) return print(result, true);
  console.log(`${source} ${reference} → ${target} ${mappedAyahs.join(", ") || "∅"}`);
  if (!differences.length) {
    console.log("No reviewed alignment difference is published for this ayah.");
    console.log(`Dataset status: ${result.status}`);
    return;
  }
  for (const item of differences) {
    console.log(`\n${item.slotId} (${item.kind})`);
    console.log(`${source}: ${item.source.text || "∅ empty slot"}`);
    console.log(`${target}: ${item.target.text || "∅ empty slot"}`);
    console.log(`Status: ${item.authentication}`);
  }
}

async function map(from, to, reference, json) {
  const source = tradition(from);
  const target = tradition(to);
  const mapping = await loadBundledAyahMapping();
  const targets = mapping.mapAyah(reference, target, source);
  const result = { command: "map", reference, source, target, targets, status: mapping.mapping.status };
  if (json) return print(result, true);
  console.log(`${source} ${reference} → ${target} ${targets.join(", ") || "∅ unmapped"}`);
  console.log(`Status: ${result.status}`);
}

async function validate(path, json) {
  if (!path) throw new Error("validate requires a QUSX XML file path");
  const result = await validateQusxFile(path);
  if (json) print(result, true);
  else if (result.valid) console.log(`VALID ${path} (${result.wordCount} words)`);
  else console.error(`INVALID ${path}\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  if (!result.valid) process.exitCode = 1;
}

async function main() {
  const { command, json, positional, options } = parseArgs(process.argv.slice(2));
  if (!command || command === "help" || command === "--help" || command === "-h") return print(usage(), false);
  if (command === "compare" || command === "map") {
    const from = options.from ?? positional[0];
    const to = options.to ?? positional[1];
    const reference = options.ayah ?? positional[2];
    if (!from || !to || !reference) throw new Error(`${command} requires from, to, and surah:ayah`);
    return command === "compare" ? compare(from, to, reference, json) : map(from, to, reference, json);
  }
  if (command === "validate") return validate(positional[0], json);
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
