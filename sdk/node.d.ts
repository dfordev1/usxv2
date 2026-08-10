export * from "./index.mjs";
import type { ParseOptions, QusxDocument } from "./index.mjs";
export function readQusx(path: string | URL, options?: ParseOptions): Promise<QusxDocument>;
