// Lives apart from read.ts deliberately. read.ts imports the Drizzle client,
// which throws at module init without DATABASE_URL — so a "use client"
// component that value-imports from it pulls the db into the browser bundle
// and the page dies on hydration. Pure helpers a client component needs must
// not sit in a module that touches the database.

export type StatusPill = "Draft" | "Building" | "Playable" | "Complete" | "Over";

/**
 * `unresolvedCount` blocks `Complete` and nothing else. A deck short of 99
 * already reads `Draft` or `Building` on the arithmetic alone, so the guard only
 * bites on the deck that reaches 99 matched cards while still carrying lines we
 * cannot name — which is not a finished deck.
 *
 * `Over` is tested before both, so neither the unresolved guard nor the
 * ownership test runs on a deck past 99. A 104-card deck whose every card is
 * owned is still not `Complete`: the count is the thing standing between it and
 * a legal list, and that is what the pill has to say.
 */
export function statusPill(args: {
  built: number;
  ownedCount: number;
  unresolvedCount?: number;
}): StatusPill {
  if (args.built === 0) return "Draft";
  if (args.built < 99) return "Building";
  if (args.built > 99) return "Over";
  if ((args.unresolvedCount ?? 0) > 0) return "Playable";
  return args.ownedCount === args.built ? "Complete" : "Playable";
}
