import type { CompatibleVerse } from "./adapters.mjs";
export type ProviderName = "quran.com" | "alquran.cloud";
export interface QuranProvider { readonly name: ProviderName; readonly tradition: string; getAyah(reference: string): Promise<CompatibleVerse>; getSurah(surah: number): Promise<readonly CompatibleVerse[]>; }
export function createProvider(name: ProviderName, options?: { fetch?: typeof fetch; baseUrl?: string; tradition?: string; edition?: string }): QuranProvider;
export function listProviders(): readonly ProviderName[];
