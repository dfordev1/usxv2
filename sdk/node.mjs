import { readFile } from "node:fs/promises";
import { parseQusx } from "./index.mjs";

export async function readQusx(path, options) {
  return parseQusx(await readFile(path, "utf8"), options);
}

export * from "./index.mjs";
