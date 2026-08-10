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
