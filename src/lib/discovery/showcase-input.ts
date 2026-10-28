import { count, eq } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { commandersPlaceEnabled } from "../commanders/place-flag";
import { hasSyncAnchor } from "../collection/sync-base";
import { SWITCH_FLAGS } from "../switches/flags";
import type { Perf } from "../perf/timing";
import type { SwitchName } from "../switches/registry";
import { DECK_TOOLS, loadToolFits, type DeckToolId } from "./fits";
import type { CardInput } from "./showcase";
import { TOOLS } from "./tools";

/**
 * What a tool card needs to know about its reader, read once per render: the Tools tab (`/about`) and the About pages'
 * Try it (`/about/[area]`) both read it here, so a card says the same thing in both places.
 */

/** The deck tools whose switches are on for this reader (and, with `only`, among those): the only ones `loadToolFits`
 * is asked about. */
function deckToolsFor(isOn: (name: SwitchName) => boolean, only?: readonly string[]): DeckToolId[] {
  const deckTools: ReadonlySet<string> = new Set(DECK_TOOLS);
  return TOOLS.filter(
    (t) => deckTools.has(t.id) && (t.switch === null || isOn(t.switch)) && (only === undefined || only.includes(t.id)),
  ).map((t) => t.id as DeckToolId);
}

/** A switch, as `env` (the reader's resolved switches) decides it. */
export const switchesOn = (env: NodeJS.ProcessEnv) => (name: SwitchName) => SWITCH_FLAGS[name](env);

async function deckCount(userId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(decks).where(eq(decks.userId, userId));
  return Number(row?.n ?? 0);
}

/**
 * The card input for `userId` under `env`, the reader's resolved switches (`requestSwitchEnv`). `perf` times the fits
 * read for a route's perf log.
 */
export async function loadCardInput(
  userId: string, env: NodeJS.ProcessEnv, perf?: Perf, only?: readonly string[],
): Promise<CardInput> {
  const isOn = switchesOn(env);
  const asked = deckToolsFor(isOn, only);
  const [fits, decksHeld, syncAnchored] = await Promise.all([
    perf ? perf.timed("toolFits", () => loadToolFits(userId, env, asked)) : loadToolFits(userId, env, asked),
    deckCount(userId),
    isOn("COLLECTION_SYNC_ENABLED") ? hasSyncAnchor(userId) : false,
  ]);
  return { isOn, fits, deckCount: decksHeld, hasSyncBase: syncAnchored, place: commandersPlaceEnabled(env) };
}
