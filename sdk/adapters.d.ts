export interface CompatibleWord { readonly position: number; readonly text: string; readonly providerId?: number | string; readonly location?: string; }
export interface CompatibleVerse { readonly format: "qusx-compatible-verse"; readonly version: "1.0.0"; readonly source: string; readonly tradition: string; readonly surah: number; readonly ayah: number; readonly reference: string; readonly words: readonly CompatibleWord[]; readonly text: string; readonly providerRecord: unknown; }
export function normalizeQuranComVerse(input: unknown, options?: { tradition?: string }): CompatibleVerse;
export function normalizeKfgqpcAyah(input: unknown, options?: { tradition?: string }): CompatibleVerse;
