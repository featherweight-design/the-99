import { publicPagesCopy } from "../../lib/copy/public-pages";
import type { PublicCommander } from "../../lib/public/commander";
import { cutAtWord } from "../../lib/public/preview";

/**
 * The commander page's link preview (launch epic F3 PR 3b; handoff C2, README call 8): its description and the image's
 * figures line. Pure. Here, not beside the card's in `lib/public/preview.ts`, because it draws on the copy module and the
 * public loaders' guard reads every file under `src/lib/public` for table names.
 */
/** A figure as the commander page draws it (`11,687`). */
const figure = (n: number) => n.toLocaleString("en-US");

/** The commander's three most-tagged themes as one list (`Artifacts, Thopters, and Tokens`), or null with none. */
export function topThemes(tags: PublicCommander["tags"]): string | null {
  const labels = [...tags].sort((a, b) => b.count - a.count).slice(0, 3).map((t) => t.label);
  return labels.length > 0 ? new Intl.ListFormat("en-US", { type: "conjunction" }).format(labels) : null;
}

type PreviewCommander = Pick<PublicCommander, "state" | "prose" | "rank" | "deckCount" | "tags" | "typeLine">;

/**
 * The commander's description (C2's tag table): the prose sentence; with none, `#{rank} on EDHREC across {decks} decks.
 * {top three themes}.`; absent or degraded (every figure blank, `loadPublicCommander`), or with either figure blank, the
 * type line. Cut at a word near 155 characters, as the card's is.
 */
export function commanderDescription(c: PreviewCommander): string {
  if (c.prose) return cutAtWord(c.prose);
  if (c.state === "ok" && c.rank !== null && c.deckCount !== null) {
    return cutAtWord(publicPagesCopy.linkPreview.commanderFallback(figure(c.rank), figure(c.deckCount), topThemes(c.tags)));
  }
  return cutAtWord(c.typeLine);
}

/** The image's figures line (`#203 on EDHREC · 11,687 decks`), or null when both figures are blank. */
export function commanderFigures(c: Pick<PublicCommander, "rank" | "deckCount">): string | null {
  if (c.rank === null && c.deckCount === null) return null;
  return publicPagesCopy.linkPreview.ogCommanderFigures(c.rank === null ? null : figure(c.rank), c.deckCount === null ? null : figure(c.deckCount));
}
