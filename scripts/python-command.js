const { spawnSync } = require("child_process");

function candidateCommands(platform = process.platform, env = process.env) {
  if (env.PYTHON) return [{ command: env.PYTHON, args: [] }];

  return platform === "win32"
    ? [
        { command: "python", args: [] },
        { command: "py", args: ["-3"] },
        { command: "python3", args: [] },
      ]
    : [
        { command: "python3", args: [] },
        { command: "python", args: [] },
      ];
}

function resolvePython() {
  const failures = [];
  for (const candidate of candidateCommands()) {
    const probe = spawnSync(candidate.command, [...candidate.args, "-c", "import lxml"], { encoding: "utf-8" });
    if (probe.status === 0) return candidate;
    failures.push(`${candidate.command} ${candidate.args.join(" ")}`.trim());
  }
  throw new Error(
    `No Python interpreter with lxml is available. Tried: ${failures.join(", ")}. ` +
      "Install requirements.txt or set PYTHON to the interpreter executable."
  );
}

module.exports = { candidateCommands, resolvePython };
