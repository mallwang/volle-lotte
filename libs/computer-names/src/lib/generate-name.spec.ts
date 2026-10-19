import {
  ENGLISH_ADJECTIVES,
  ENGLISH_NOUNS,
  GERMAN_ADJECTIVES,
  GERMAN_NOUNS,
  generateName,
  nameAt,
  nameCount,
  uniqueName,
  type NameLanguage,
} from '../index.js';

const seeded = (seed: number) => {
  let s = seed;
  return (n: number) => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return Math.floor((s / 4294967296) * n);
  };
};

const germanNames = () => {
  const all = new Map<string, string>();
  for (const noun of GERMAN_NOUNS)
    for (const adjective of GERMAN_ADJECTIVES)
      all.set(`${adjective[noun.gender]} ${noun.text}`, noun.gender);
  return all;
};

describe('generateName', () => {
  it('builds English names from the English word lists', () => {
    const rng = seeded(1);
    for (let i = 0; i < 1000; i++) {
      const [adjective, noun, ...rest] = generateName('en', rng).split(' ');
      expect(rest).toEqual([]);
      expect(ENGLISH_ADJECTIVES).toContain(adjective);
      expect(ENGLISH_NOUNS).toContain(noun);
    }
  });

  it('builds German names whose adjective agrees with the noun gender', () => {
    const valid = germanNames();
    const rng = seeded(2);
    for (let i = 0; i < 1000; i++) expect(valid.has(generateName('de', rng))).toBe(true);
  });

  it('uses the injected indices: first adjective, then noun', () => {
    const picks = [2, 3];
    expect(generateName('en', () => picks.shift() as number)).toBe(
      `${ENGLISH_ADJECTIVES[2]} ${ENGLISH_NOUNS[3]}`,
    );
  });

  it('is deterministic for a deterministic source', () => {
    expect(generateName('de', seeded(7))).toBe(generateName('de', seeded(7)));
  });

  it('gives every German noun gender its own adjective ending', () => {
    const nounOf = (gender: string) => GERMAN_NOUNS.findIndex((n) => n.gender === gender);
    const name = (gender: string) => {
      const picks = [GERMAN_ADJECTIVES.findIndex((a) => a.masculine === 'Mutiger'), nounOf(gender)];
      return generateName('de', () => picks.shift() as number);
    };
    expect(name('masculine')).toMatch(/^Mutiger /);
    expect(name('feminine')).toMatch(/^Mutige /);
    expect(name('neuter')).toMatch(/^Mutiges /);
  });
});

describe('nameAt', () => {
  it.each<NameLanguage>(['en', 'de'])('visits every %s combination exactly once', (language) => {
    const seen = new Set<string>();
    for (let i = 0; i < nameCount(language); i++) seen.add(nameAt(language, i));
    expect(seen.size).toBe(nameCount(language));
  });

  it('keeps umlauts in German names', () => {
    expect([...germanNames().keys()].some((n) => /[äöüß]/.test(n))).toBe(true);
  });
});

describe('uniqueName', () => {
  it('skips taken names, ignoring case', () => {
    const taken = new Set([nameAt('en', 0).toLowerCase()]);
    const picks = [0, 0, 0, 1];
    expect(uniqueName('en', taken, () => picks.shift() as number)).toBe(nameAt('en', 1));
  });

  it('walks all combinations when random picks keep colliding', () => {
    const taken = new Set([nameAt('en', 5).toLowerCase()]);
    expect(uniqueName('en', taken, () => 5 % ENGLISH_NOUNS.length)).not.toBe(nameAt('en', 5));
  });

  it('adds a number only when every combination is taken', () => {
    const taken = new Set<string>();
    for (let i = 0; i < nameCount('en'); i++) taken.add(nameAt('en', i).toLowerCase());
    const name = uniqueName('en', taken, () => 0);
    expect(name).toBe(`${nameAt('en', 0)} 2`);
    taken.add(name.toLowerCase());
    expect(uniqueName('en', taken, () => 0)).toBe(`${nameAt('en', 0)} 3`);
  });
});
