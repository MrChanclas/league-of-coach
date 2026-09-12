// A coarse "archetype" used only to power the pool recommendation's "TU
// ESTILO" slot (see handoff_loc/07-pool-champ.md: "empezá con algo
// defendible y simple"). champion-guides' manual-guides data already tags
// every champion with a Spanish class string like "Luchador / Iniciador" or
// "Maga de control de zona" — this takes the first archetype word before the
// "/" and normalizes the handful of gendered forms (Luchador/Luchadora,
// Mago/Maga, etc.) so "Luchador" and "Luchadora" count as the same style.
// It's intentionally rough: a real taste model is future work, not this.
const GENDERED_TO_MASCULINE: Record<string, string> = {
  luchadora: 'luchador',
  maga: 'mago',
  asesina: 'asesino',
  tiradora: 'tirador',
  soporte: 'support',
};

export function primaryArchetype(
  championClass: string | null | undefined,
): string | null {
  if (!championClass) return null;
  const firstSegment = championClass.split('/')[0]?.trim().toLowerCase();
  const firstWord = firstSegment?.split(' ')[0];
  if (!firstWord) return null;
  return GENDERED_TO_MASCULINE[firstWord] ?? firstWord;
}
