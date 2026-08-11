export const QUSX_NAMESPACE: "https://dfordev1.github.io/usxv2/ns/v1";
export const QUSX_VERSION: "0.1";
export type QusxAxis = "ayah" | "page" | "line" | "juz" | "hizb" | "rub" | "manzil" | "ruku";
export interface QusxWord { readonly kind: "word"; readonly type?: "number"; readonly id: number; readonly position: number; readonly text: string; readonly root?: string; readonly stem?: string; readonly lemma?: string; readonly axes: Readonly<Record<string, { axis: QusxAxis; number: number; sid: string }>>; }
export interface QusxSlice { readonly axis: QusxAxis; readonly number: number; readonly sid: string; readonly words: readonly QusxWord[]; readonly events: readonly unknown[]; readonly text: string; readonly recitationText: string; }
export interface ParseOptions { version?: string | false; }
export interface LoadOptions extends ParseOptions { fetch?: typeof fetch; signal?: AbortSignal; }
export class QusxError extends Error { readonly code: string; constructor(message: string, code?: string); }
export class QusxDocument {
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
  readonly events: readonly unknown[];
  readonly words: readonly QusxWord[];
  readonly sajdas: readonly unknown[];
  getWord(id: number | string): QusxWord | undefined;
  get(axis: QusxAxis, number: number): QusxSlice | undefined;
  getAyah(number: number): QusxSlice | undefined;
  getPage(number: number): QusxSlice | undefined;
  getLine(line: number): QusxSlice | undefined;
  getLine(page: number, line: number): QusxSlice | undefined;
  getJuz(number: number): QusxSlice | undefined;
  getHizb(number: number): QusxSlice | undefined;
  getRub(number: number): QusxSlice | undefined;
  getManzil(number: number): QusxSlice | undefined;
  getRuku(number: number): QusxSlice | undefined;
}
export function parseQusx(xml: string, options?: ParseOptions): QusxDocument;
export function loadQusx(url: string | URL, options?: LoadOptions): Promise<QusxDocument>;
export function createQusxClient(options?: { baseUrl?: string; layout?: string; fetch?: typeof fetch }): Readonly<{ url(surah: number): string; load(surah: number, options?: LoadOptions): Promise<QusxDocument> }>;
export interface AlignmentReadingInput { ayah: string; tokens: string[]; }
export interface AlignmentRuleInput { id: string; slotId: string; kind: "reading-variant" | "presence-absence"; authentication: "source-authenticated" | "scholarly-certified"; readings: Record<string, AlignmentReadingInput>; evidence: string[]; }
export interface AlignmentInput { format: "qusx-alignment"; version: string; status: string; canonicalTradition: string; traditions: string[]; rules: AlignmentRuleInput[]; }
export interface AlignmentReading { readonly ayah: string; readonly tokens: readonly string[]; readonly text: string; }
export interface AlignmentRule extends Omit<AlignmentRuleInput, "readings" | "evidence"> { readonly readings: Readonly<Record<string, AlignmentReading>>; readonly evidence: readonly string[]; }
export interface AlignmentDocument extends Omit<AlignmentInput, "traditions" | "rules"> { readonly traditions: readonly string[]; readonly rules: readonly AlignmentRule[]; }
export interface AlignmentClient {
  readonly alignment: AlignmentDocument;
  listAlignmentRules(): readonly AlignmentRule[];
  getReading(identifier: string, tradition: string): Readonly<AlignmentReading & { ruleId: string; slotId: string; tradition: string }>;
  compareReadings(identifier: string): Readonly<{ ruleId: string; slotId: string; kind: string; readings: Readonly<Record<string, AlignmentReading>> }>;
  compareAyah(reference: string, sourceTradition: string, targetTradition: string): readonly Readonly<{ ruleId: string; slotId: string; kind: string; authentication: string; source: Readonly<AlignmentReading & { tradition: string }>; target: Readonly<AlignmentReading & { tradition: string }>; evidence: readonly string[] }>[];
  getAlignmentEvidence(identifier: string): Readonly<{ authentication: string; evidence: readonly string[] }>;
}
export function parseAlignment(value: string | AlignmentInput): AlignmentDocument;
export function createAlignmentClient(value: string | AlignmentInput): AlignmentClient;
export interface AyahMappingRow { source: string; targets: string[]; }
export interface AyahMappingInput { format: "qusx-ayah-mapping"; version: string; status: string; hubTradition: string; traditions: string[]; method: string; mappings: Record<string, AyahMappingRow[]>; unmappedHubAyahs?: Record<string, string[]>; }
export interface AyahMappingDocument extends Omit<AyahMappingInput, "traditions" | "mappings"> { readonly traditions: readonly string[]; readonly mappings: Readonly<Record<string, readonly Readonly<{ source: string; targets: readonly string[] }>[]>>; }
export interface AyahMappingClient { readonly mapping: AyahMappingDocument; mapAyah(reference: string, targetTradition: string, sourceTradition?: string): readonly string[]; }
export function parseAyahMapping(value: string | AyahMappingInput): AyahMappingDocument;
export function createAyahMappingClient(value: string | AyahMappingInput): AyahMappingClient;
