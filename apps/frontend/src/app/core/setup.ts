import {
  CARD_TYPES,
  defaultRules,
  rulesError,
  type Difficulty,
  type GameView,
  type Risk,
  type Rules,
  type SeatView,
} from 'game-rules';

export const MAX_PRESETS = 10;
export const MAX_PRESET_NAME = 30;
export const DEFAULT_SPEED = 3;

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'random'];
const RISKS: readonly Risk[] = ['none', 'medium', 'high', 'random'];

export interface ComputerSeat {
  /** Index in the room; the host sits on 0. */
  seat: number;
  difficulty: Difficulty;
  risk: Risk;
}

/** How a game is set up on this device. Never holds the game name, the password or computer names. */
export interface Setup {
  seats: number;
  rules: Rules;
  computers: ComputerSeat[];
  speed: number;
}

export interface Preset {
  name: string;
  setup: Setup;
}

export function defaultSetup(): Setup {
  return { seats: 4, rules: defaultRules(), computers: [], speed: DEFAULT_SPEED };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const int = (v: unknown, min: number, max: number): number | null =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : null;

function sanitizeRules(value: unknown): Rules {
  const defaults = defaultRules();
  if (!isObject(value)) return defaults;
  const counts = isObject(value['cardCounts']) ? value['cardCounts'] : {};
  const rules: Rules = {
    targetScore: int(value['targetScore'], 1, Number.MAX_SAFE_INTEGER) ?? defaults.targetScore,
    minimumPoints:
      int(value['minimumPoints'], 0, Number.MAX_SAFE_INTEGER) ?? defaults.minimumPoints,
    fourOfAKindDoubling:
      typeof value['fourOfAKindDoubling'] === 'boolean'
        ? value['fourOfAKindDoubling']
        : defaults.fourOfAKindDoubling,
    cardCounts: Object.fromEntries(
      CARD_TYPES.map((c) => [
        c,
        int(counts[c], 0, Number.MAX_SAFE_INTEGER) ?? defaults.cardCounts[c],
      ]),
    ) as Rules['cardCounts'],
  };
  return rulesError(rules) ? defaults : rules;
}

function sanitizeComputers(value: unknown, seats: number): ComputerSeat[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<number>();
  const result: ComputerSeat[] = [];
  for (const c of value) {
    if (!isObject(c)) continue;
    const seat = int(c['seat'], 1, seats - 1);
    const { difficulty, risk } = c;
    if (seat === null || used.has(seat)) continue;
    if (!DIFFICULTIES.includes(difficulty as Difficulty) || !RISKS.includes(risk as Risk)) continue;
    used.add(seat);
    result.push({ seat, difficulty: difficulty as Difficulty, risk: risk as Risk });
  }
  return result.sort((a, b) => a.seat - b.seat);
}

/** A valid setup from anything: every invalid value falls back to its default, valid ones are kept. */
export function sanitizeSetup(value: unknown): Setup {
  const v = isObject(value) ? value : {};
  const seats = int(v['seats'], 2, 8) ?? defaultSetup().seats;
  return {
    seats,
    rules: sanitizeRules(v['rules']),
    computers: sanitizeComputers(v['computers'], seats),
    speed: int(v['speed'], 1, 5) ?? DEFAULT_SPEED,
  };
}

/** Same setup, ignoring computer names and the order of the computers. */
export function setupsEqual(a: Setup | null, b: Setup | null): boolean {
  if (!a || !b) return false;
  if (a.seats !== b.seats || a.speed !== b.speed) return false;
  if (
    a.rules.targetScore !== b.rules.targetScore ||
    a.rules.minimumPoints !== b.rules.minimumPoints ||
    a.rules.fourOfAKindDoubling !== b.rules.fourOfAKindDoubling ||
    CARD_TYPES.some((c) => a.rules.cardCounts[c] !== b.rules.cardCounts[c])
  )
    return false;
  if (a.computers.length !== b.computers.length) return false;
  const sorted = (s: Setup) => [...s.computers].sort((x, y) => x.seat - y.seat);
  const [x, y] = [sorted(a), sorted(b)];
  return x.every(
    (c, i) => c.seat === y[i].seat && c.difficulty === y[i].difficulty && c.risk === y[i].risk,
  );
}

/** The setup a room has right now. */
export function setupFromGame(game: GameView): Setup {
  const computers: ComputerSeat[] = [];
  game.seats.forEach((s, seat) => {
    if (s.state === 'computer')
      computers.push({ seat, difficulty: s.difficulty ?? 'medium', risk: s.risk ?? 'medium' });
  });
  return {
    // a room always has 8 seats; the seats a game was created with (or the host unlocked) are the unlocked ones
    seats: Math.max(2, game.seats.filter((s) => s.state !== 'locked').length),
    rules: game.rules,
    computers,
    speed: game.computerSpeed,
  };
}

/** The numbers shown in a one-line summary of a setup. */
export function describeSetup(setup: Setup) {
  return {
    seats: setup.seats,
    target: setup.rules.targetScore,
    computers: setup.computers.length,
    speed: setup.speed,
  };
}

export interface ComputerPlan {
  /** Seats whose computers are removed first. */
  clear: number[];
  place: ComputerSeat[];
  skipped: number;
}

/**
 * Replaces the computers of a room by `computers`: each goes to its own seat if that seat is free, else to the
 * first free seat. Humans, reserved and locked seats and the host seat are never touched.
 */
export function planComputers(
  seats: readonly SeatView[],
  computers: readonly ComputerSeat[],
): ComputerPlan {
  const clear = seats.flatMap((s, i) => (s.state === 'computer' ? [i] : []));
  const free = new Set(
    seats.flatMap((s, i) => (i > 0 && (s.state === 'open' || s.state === 'computer') ? [i] : [])),
  );
  const place: ComputerSeat[] = [];
  let skipped = 0;
  const ordered = [...computers].sort((a, b) => a.seat - b.seat);
  const later: ComputerSeat[] = [];
  for (const c of ordered) {
    if (free.has(c.seat)) {
      free.delete(c.seat);
      place.push(c);
    } else later.push(c);
  }
  for (const c of later) {
    const [seat] = [...free].sort((a, b) => a - b);
    if (seat === undefined) skipped++;
    else {
      free.delete(seat);
      place.push({ ...c, seat });
    }
  }
  return { clear, place: place.sort((a, b) => a.seat - b.seat), skipped };
}
