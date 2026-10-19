import { ENGLISH_ADJECTIVES, ENGLISH_NOUNS } from './english.js';
import { GERMAN_ADJECTIVES, GERMAN_NOUNS } from './german.js';

export type NameLanguage = 'en' | 'de';
/** Returns an integer in [0, n). */
export type RandomIndex = (n: number) => number;

const MAX_RANDOM_TRIES = 20;

function sizes(language: NameLanguage): { adjectives: number; nouns: number } {
  return language === 'de'
    ? { adjectives: GERMAN_ADJECTIVES.length, nouns: GERMAN_NOUNS.length }
    : { adjectives: ENGLISH_ADJECTIVES.length, nouns: ENGLISH_NOUNS.length };
}

/** Number of distinct names the language offers. */
export function nameCount(language: NameLanguage): number {
  const { adjectives, nouns } = sizes(language);
  return adjectives * nouns;
}

/** The name at `index` (0 to `nameCount - 1`), enumerating every adjective and noun combination. */
export function nameAt(language: NameLanguage, index: number): string {
  const { nouns } = sizes(language);
  const noun = index % nouns;
  const adjective = Math.floor(index / nouns);
  if (language === 'de') {
    const word = GERMAN_NOUNS[noun];
    return `${GERMAN_ADJECTIVES[adjective][word.gender]} ${word.text}`;
  }
  return `${ENGLISH_ADJECTIVES[adjective]} ${ENGLISH_NOUNS[noun]}`;
}

/** A random "Adjective Noun" name; German adjectives take the ending of the noun's gender. */
export function generateName(language: NameLanguage, randomIndex: RandomIndex): string {
  const { adjectives, nouns } = sizes(language);
  const adjective = randomIndex(adjectives);
  const noun = randomIndex(nouns);
  return nameAt(language, adjective * nouns + noun);
}

/**
 * A random name whose lower-case form is not in `taken`. Falls back to walking all combinations and,
 * only if every one is taken, to a numbered name, so it never returns a duplicate.
 */
export function uniqueName(
  language: NameLanguage,
  taken: ReadonlySet<string>,
  randomIndex: RandomIndex,
): string {
  for (let i = 0; i < MAX_RANDOM_TRIES; i++) {
    const name = generateName(language, randomIndex);
    if (!taken.has(name.toLowerCase())) return name;
  }
  const count = nameCount(language);
  const start = randomIndex(count);
  for (let i = 0; i < count; i++) {
    const name = nameAt(language, (start + i) % count);
    if (!taken.has(name.toLowerCase())) return name;
  }
  const base = nameAt(language, start);
  let suffix = 2;
  while (taken.has(`${base} ${suffix}`.toLowerCase())) suffix++;
  return `${base} ${suffix}`;
}
