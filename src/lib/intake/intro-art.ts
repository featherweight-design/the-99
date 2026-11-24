import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";

/**
 * The intro's worked example draws real art (READINESS G2): Ghalta's crop leads, and two other
 * Dinosaur commanders stand behind it as ranks 2 and 3 on desktop. Read by name from the catalog,
 * never from `design/art`.
 */
export const INTRO_ART_NAMES = ["Ghalta, Primal Hunger", "Gishath, Sun's Avatar", "Pantlaza, Sun-Favored"] as const;

export type IntroArt = { lead: string | null; rest: [string | null, string | null] };

/** A failed read throws; the caller draws the example without art. */
export async function loadChooseIntroArt(): Promise<IntroArt> {
  const rows = await db
    .select({ name: cards.name, art: cards.artCropUri })
    .from(cards)
    .where(inArray(cards.name, [...INTRO_ART_NAMES]));
  const art = (name: string) => rows.find((r) => r.name === name)?.art ?? null;
  return { lead: art(INTRO_ART_NAMES[0]), rest: [art(INTRO_ART_NAMES[1]), art(INTRO_ART_NAMES[2])] };
}
