import { FLYER_ALPHABET, FLYER_CODE_LENGTH } from "./rules";

/**
 * The flyer-code admin writes as arithmetic (flyer trial PR 4b), pure: what a store label may be, the group name a store
 * gives a new group, and how a code is drawn. The writes are `admin.ts`.
 */

/** A store label is Hugh's own note and never reaches a player; it only has to fit a row. */
export const STORE_MAX = 60;
/** The daily credits a flyer group is made with (handoff: "daily credits 3"). */
export const FLYER_GROUP_ALLOWANCE = 3;
/** How many codes are drawn before a make gives up: the alphabet holds 32^6, so one retry is already rare. */
export const MAKE_ATTEMPTS = 8;

/** The trimmed label, or null when it is empty, too long, carries a control character or leaves no group name. */
export function parseStore(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const store = raw.trim();
  if (store === "" || store.length > STORE_MAX) return null;
  if (/[\u0000-\u001f\u007f]/.test(store)) return null;
  // A label that names no group (`!!!`) is refused with it: the form's default is a group named from the store.
  if (flyerGroupName(store) === null) return null;
  return store;
}

/**
 * The group a store defaults to (`Mox Boston` is `mox-boston`): lower case, runs of anything else one hyphen, within
 * the group name rule (`GROUP_NAME`, 40 characters). Null when nothing is left to name it. `n` above 1 appends `-n`, for
 * a name another group already holds.
 */
export function flyerGroupName(store: string, n = 1): string | null {
  const slug = store.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug === "") return null;
  const suffix = n > 1 ? `-${n}` : "";
  return `${slug.slice(0, 40 - suffix.length).replace(/-+$/, "")}${suffix}`;
}

/** A code drawn from the unambiguous alphabet; `pick(n)` is a uniform integer below `n`. */
export function drawFlyerCode(pick: (n: number) => number): string {
  let out = "";
  for (let i = 0; i < FLYER_CODE_LENGTH; i++) out += FLYER_ALPHABET[pick(FLYER_ALPHABET.length)];
  return out;
}
