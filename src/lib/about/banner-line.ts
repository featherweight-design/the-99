// About's line on Home's banner, the browser's half (About visual PR 6b): what the banner is handed, and the two pure
// rules it draws with. Client-safe: no catalog, no manifest. The server's half is `notice.ts`.

import type { NavHref } from "../../components/shell/nav-icons";

/** One launch line: what it names, where Show me lands, what its acknowledgement covers and the glyph that marks it. */
export type AboutLaunch = {
  /** The announce key (`UnseenUnit.key`): what the ✕ claims and a page visit acknowledges. */
  key: string;
  /** What acknowledging it writes, as the server RENDERED it (`UnseenUnit.ack`): the ✕ claims these keys, and the
   *  server writes only those of them it still announces, so a sentence switched on after the render stays new. */
  ack: readonly string[];
  /** "New on {page}:", drawn in `--fg` before the unit's words (`ABOUT_PAGE_STRINGS.bannerLead`). */
  lead: string;
  /** The unit's words as this reader is drawn them: a label's lead and rest, a rule's text, or a new sentence alone. */
  text: string;
  /** Show me: the unit's page, lit, scrolled to its section. */
  href: string;
  /** The nav glyph of the page Show me opens (Shopping uses Decks'), or null for a rule, which keeps the diamond mark. */
  icon: NavHref | null;
};

/**
 * What the browser is handed. `ids` is what a page visit in the same document acknowledges: first run, every unit's
 * key (the line stands for every page); behind, each launch's key. The ✕ claims the RENDERED ack keys: first run,
 * `ack`, the whole baseline a first visit writes; behind, each launch's `ack`.
 */
export type AboutLine =
  | { kind: "firstRun"; ids: string[]; ack: string[] }
  | { kind: "launches"; launches: AboutLaunch[]; ids: string[] };

/** The banner's cap, the shipped one: four lines show in full; past four, three show and "and N more". */
export function bannerCap(n: number): { shown: number; more: number } {
  return n <= 4 ? { shown: n, more: 0 } : { shown: 3, more: n - 3 };
}
