// Lives apart from read.ts deliberately. read.ts imports the Drizzle client,
// which throws at module init without DATABASE_URL — so a "use client"
// component that value-imports from it pulls the db into the browser bundle
// and the page dies on hydration. Pure helpers a client component needs must
// not sit in a module that touches the database.

export type StatusPill = "Draft" | "Building" | "Playable" | "Complete";

export function statusPill(args: { built: number; ownedCount: number }): StatusPill {
  if (args.built === 0) return "Draft";
  if (args.built < 99) return "Building";
  return args.ownedCount === args.built ? "Complete" : "Playable";
}
