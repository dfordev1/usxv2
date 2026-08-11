export * from "./index.mjs";
import type { AlignmentClient, AyahMappingClient, ParseOptions, QusxDocument } from "./index.mjs";
export function readQusx(path: string | URL, options?: ParseOptions): Promise<QusxDocument>;
export function loadBundledAlignment(): Promise<AlignmentClient>;
export function loadBundledAyahMapping(): Promise<AyahMappingClient>;
export function validateQusxFile(path: string | URL, options?: ParseOptions): Promise<Readonly<{ valid: boolean; path: string; errors: readonly string[]; metadata?: QusxDocument["metadata"]; wordCount?: number }>>;
export function loadBundledSurahReview(surah: number): Promise<unknown>;
export interface EightRiwayahSlot {
  id: string;
  sequence: number;
  canonicalLocations: string[];
  canonicalSegment: number | null;
  classification: "identical" | "orthographic-presentation" | "substantive-candidate" | "split-join";
  splitJoinFlag: boolean;
  readings: Record<string, string[]>;
  provenance: { sheet: string; row: number };
}
export interface EightRiwayahDataset {
  format: string;
  version: string;
  status: string;
  traditions: string[];
  slotCount: number;
  candidateCount?: number;
  slots: EightRiwayahSlot[];
}
export function loadBundledEightRiwayah(options?: { candidatesOnly?: boolean }): Promise<EightRiwayahDataset>;
export function findBundledEightRiwayahSlots(reference: string, options?: { candidatesOnly?: boolean }): Promise<readonly EightRiwayahSlot[]>;
