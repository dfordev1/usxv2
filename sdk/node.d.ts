export * from "./index.mjs";
import type { AlignmentClient, AyahMappingClient, ParseOptions, QusxDocument } from "./index.mjs";
export function readQusx(path: string | URL, options?: ParseOptions): Promise<QusxDocument>;
export function loadBundledAlignment(): Promise<AlignmentClient>;
export function loadBundledAyahMapping(): Promise<AyahMappingClient>;
export function validateQusxFile(path: string | URL, options?: ParseOptions): Promise<Readonly<{ valid: boolean; path: string; errors: readonly string[]; metadata?: QusxDocument["metadata"]; wordCount?: number }>>;
export function loadBundledSurahReview(surah: number): Promise<unknown>;
