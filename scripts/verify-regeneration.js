#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const NODE = process.execPath;
const LAYOUTS = ["madani-v2", "madani-v1", "madani-v4-tajweed", "qatar", "indopak-15", "indopak-9-gaba", "indopak-13-qudratullah", "indopak-13-taj", "indopak-16-taj", "nastaleeq"];
const TRADITIONS = ["warsh", "qalon", "douri", "shubah", "sousi"];

function run(script, args) {
  const result = spawnSync(NODE, [script, ...args], { cwd: ROOT, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`${path.relative(ROOT, script)} ${args.join(" ")} failed with exit ${result.status}\n${result.stderr || result.stdout}`);
  }
}

function xmlFiles(dir) {
  return fs.readdirSync(dir).filter((name) => name.endsWith(".qusx.xml")).sort();
}

function assertSameDirectory(expectedDir, actualDir, label) {
  const expected = xmlFiles(expectedDir);
  const actual = xmlFiles(actualDir);
  if (expected.length !== actual.length || expected.some((name, index) => name !== actual[index])) {
    throw new Error(`${label}: file list differs (expected ${expected.length}, got ${actual.length})`);
  }
  for (const name of expected) {
    const left = fs.readFileSync(path.join(expectedDir, name));
    const right = fs.readFileSync(path.join(actualDir, name));
    if (!left.equals(right)) throw new Error(`${label}: regenerated ${name} differs from committed output`);
  }
  console.log(`PASS: ${label} (${expected.length} byte-identical files)`);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "qusx-regeneration-"));
try {
  for (const layout of LAYOUTS) {
    run(path.join(ROOT, "src", "generate.js"), [`--layout=${layout}`, `--output-dir=${tempRoot}`, "all"]);
    assertSameDirectory(path.join(ROOT, "output", layout), path.join(tempRoot, layout), `layout ${layout}`);
  }

  const pilotRoot = path.join(tempRoot, "pilot");
  for (const tradition of TRADITIONS) {
    run(path.join(ROOT, "scripts", "generate_tradition_pilot.js"), [`--output-dir=${pilotRoot}`, tradition, "all"]);
    assertSameDirectory(path.join(ROOT, "output-pilot", tradition), path.join(pilotRoot, tradition), `pilot ${tradition}`);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
