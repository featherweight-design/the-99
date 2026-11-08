// The fictional fixture's source of chance: a seeded PRNG and name-based ids, so a rerun makes the same account.
// Nothing here reads a clock, a database or the environment.
import { createHash } from "node:crypto";

/** The one seed. Changing it makes a different (equally fictional) account and different collection. */
export const FIXTURE_SEED = "wren-calloway-v1";

/** A fixed namespace for every id the fixture names (a random v4 minted once, never regenerated). */
export const FIXTURE_NAMESPACE = "5b0d3c1e-7a4f-4e8b-9c26-3f1a8d2e6b47";

export type Rng = () => number;

/** 32-bit string hash (FNV-1a), the seed's number. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a number in [0, 1) per call, fully determined by the seed. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An independent stream per purpose, so adding a draw in one stage never shifts another's. */
export function streamFor(purpose: string, seed: string = FIXTURE_SEED): Rng {
  return mulberry32(hashSeed(`${seed}:${purpose}`));
}

/** RFC 4122 version 5: SHA-1 of the namespace bytes and the name, with the version and variant bits set. */
export function uuidV5(name: string, namespace: string = FIXTURE_NAMESPACE): string {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  if (ns.length !== 16) throw new Error("uuidV5: namespace is not a uuid");
  const h = createHash("sha1").update(ns).update(name, "utf8").digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = b.toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

export const DECK_ROLES = ["under", "over", "played", "fresh", "versioned"] as const;
export type DeckRole = (typeof DECK_ROLES)[number];

/** The decks' ids: stable across runs, branches and machines. */
export const ABOUT_DECK_IDS: Readonly<Record<DeckRole, string>> = Object.freeze(
  Object.fromEntries(DECK_ROLES.map((r) => [r, uuidV5(`deck:${r}`)])) as Record<DeckRole, string>,
);

/** Fisher-Yates on a copy. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error("pickOne: nothing to pick from");
  return items[Math.floor(rng() * items.length)];
}
