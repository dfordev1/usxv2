#!/usr/bin/env node

const { spawnSync } = require("child_process");
const { resolvePython } = require("./python-command.js");

const scriptArgs = process.argv.slice(2);
if (scriptArgs.length === 0) {
  console.error("Usage: node scripts/run-python.js <script.py> [args ...]");
  process.exit(2);
}

const { command, args } = resolvePython();
const result = spawnSync(command, [...args, ...scriptArgs], { stdio: "inherit" });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
