export type Gender = 'masculine' | 'feminine' | 'neuter';

export interface GermanNoun {
  text: string;
  gender: Gender;
}

/** Nominative forms of an adjective without article, one per noun gender. */
export type GermanAdjective = Record<Gender, string>;

const adjective = (stem: string): GermanAdjective => ({
  masculine: `${stem}er`,
  feminine: `${stem}e`,
  neuter: `${stem}es`,
});

const m = (text: string): GermanNoun => ({ text, gender: 'masculine' });
const f = (text: string): GermanNoun => ({ text, gender: 'feminine' });
const n = (text: string): GermanNoun => ({ text, gender: 'neuter' });

export const GERMAN_ADJECTIVES: readonly GermanAdjective[] = [
  'Brav',
  'Eifrig',
  'Flauschig',
  'Fleißig',
  'Flink',
  'Fröhlich',
  'Frech',
  'Gelassen',
  'Gemütlich',
  'Geschickt',
  'Glücklich',
  'Heiter',
  'Kühn',
  'Klug',
  'Laut',
  'Leis',
  'Listig',
  'Lustig',
  'Mächtig',
  'Müd',
  'Munter',
  'Mutig',
  'Neugierig',
  'Pfiffig',
  'Sanft',
  'Schlau',
  'Schnell',
  'Schüchtern',
  'Stolz',
  'Tapfer',
  'Verspielt',
  'Wendig',
  'Wild',
  'Zäh',
  'Zahm',
].map(adjective);

export const GERMAN_NOUNS: readonly GermanNoun[] = [
  m('Adler'),
  m('Bär'),
  m('Biber'),
  m('Dachs'),
  m('Delfin'),
  m('Elch'),
  m('Esel'),
  m('Falke'),
  m('Frosch'),
  m('Fuchs'),
  m('Hamster'),
  m('Hase'),
  m('Hirsch'),
  m('Igel'),
  m('Löwe'),
  m('Luchs'),
  m('Marder'),
  m('Otter'),
  m('Panda'),
  m('Pinguin'),
  m('Rabe'),
  m('Specht'),
  m('Tiger'),
  m('Waschbär'),
  m('Wolf'),
  f('Amsel'),
  f('Ente'),
  f('Eule'),
  f('Giraffe'),
  f('Katze'),
  f('Krähe'),
  f('Maus'),
  f('Möwe'),
  f('Robbe'),
  f('Schildkröte'),
  f('Ziege'),
  n('Alpaka'),
  n('Eichhörnchen'),
  n('Erdmännchen'),
  n('Faultier'),
  n('Kaninchen'),
  n('Känguru'),
  n('Krokodil'),
  n('Lama'),
  n('Murmeltier'),
  n('Nashorn'),
  n('Pferd'),
  n('Reh'),
  n('Wiesel'),
  n('Zebra'),
];
