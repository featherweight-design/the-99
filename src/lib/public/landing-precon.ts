import { readPreconsWithOverview, readPublicPreconOverview, type PreconWithOverview, type PublicPreconOverview } from "./precon-overview";

/**
 * The ONE precon Overview the landing's Written for real section draws (public landing PR 4b): its lead, drawn WITHOUT a link
 * (READINESS-audit finding 9, call A: a precon's list is signed-in only, so a link would dead-end). CATALOG ONLY, through the
 * cached readers of `precon-overview.ts`.
 */
export type LandingPrecon = { name: string; overview: string };

/** The deck the board draws. When the catalog has no Overview for it today, the first by name stands in. */
export const LANDING_PRECON_NAME = "Mutant Menace";

/** Pure: the precon to feature from the list of those with an Overview, or null for none. */
export function pickLandingPrecon(list: readonly PreconWithOverview[]): PreconWithOverview | null {
  return list.find((p) => p.name === LANDING_PRECON_NAME) ?? list[0] ?? null;
}

/** An Overview's lead as plain words: a `[[Name]]` card mark is drawn as its name (the page links nothing). */
export function plainOverview(text: string): string {
  return text.replace(/\[\[([^\[\]]+)\]\]/g, "$1").replace(/\s+/g, " ").trim();
}

/** Pure: the Overview as the page draws it, or null when it holds no lead. */
export function shapeLandingPrecon(o: Pick<PublicPreconOverview, "name" | "content"> | null): LandingPrecon | null {
  const overview = plainOverview(o?.content.overview ?? "");
  return o && overview !== "" ? { name: o.name, overview } : null;
}

/** The featured precon, or null when none has an Overview to show or a read failed: the page draws its commanders alone. */
export async function readLandingPrecon(): Promise<LandingPrecon | null> {
  try {
    const pick = pickLandingPrecon(await readPreconsWithOverview());
    return pick ? shapeLandingPrecon(await readPublicPreconOverview(pick.fileName)) : null;
  } catch (error) {
    console.error("landing precon: the read failed", error);
    return null;
  }
}
