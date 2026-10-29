// /about/[area]: one of About's six visual pages (About visual build, plan `2026-10-27-about-visual.md`, PR 3; handoff
// `design/design_handoff_the99_about_visual/`). Reached from the `/about` index, the ? on every screen, the pages' own
// strip and their tool cards' Show me (PR 6a).
//
// The reader's switches decide what is drawn (`visibleSections`: a label switched off is gone, never greyed), and the
// reader's theme picks the captures (`pageShotFor` falls back to the default theme at the same width). An unknown area
// is a 404. Each section's Good to know rules are its visible rules, their switched sentences and diagram parts cut.
// Each section's Try it is its tools whose switch is on and whose label is drawn (`pageTools`), and a `?lit=` naming a
// label this page draws lands on it: lit, and, when the reader has not been told about it (`unseenUnits`), marked New
// with its tool card (PR 5, call 7). The server hands over which labels can land (`landableIn`); the client lands.
// The visit is recorded once the page is open (`RecordPageVisit`, PR 6b): this page's announce keys, or a first-run
// reader's whole baseline (`afterVisit`). A Show me landing is a visit like any other.
//
// The ? lands here too (PR 6a, call 5, Addendum A1) with `from`, the screen it was pressed on: validated here
// (`safeFrom`, a same-origin path or nothing) and named (`backScreenName`; a deck by its own name, read for the
// reader's own deck only), it draws the back bar. A `?lit=` naming a label or rule switched off for the reader is not
// landable, so it lands on the section with nothing lit.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { aboutSeen } from "../../../lib/about/read";
import { backScreenName, deckIdOf, safeFrom } from "../../../lib/about/back";
import { ownDeckName } from "../../../lib/about/back-read";
import { pageToolCropFor } from "../../../lib/about/page-shots";
import { afterVisit, seenKeysOf, visibleSections } from "../../../lib/about/pages-visible";
import { screenModel } from "../../../lib/about/pins";
import { shotFor, toolShotId, type Shot } from "../../../lib/about/shots";
import { ABOUT_AREA_IDS, type AboutArea } from "../../../lib/copy/about-pages";
import { FROM_PARAM, LIT_PARAM, landableIn, pageTools, toolIdsIn, type PageCard, type PageToolCard } from "../../../lib/discovery/page-tools";
import { loadCardInput, switchesOn } from "../../../lib/discovery/showcase-input";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { resolveTheme } from "../../../lib/theme/server";
import { AreaPage } from "../../../components/about/pages/area-page";
import { RecordPageVisit } from "../../../components/about/pages/record-page-visit";

const isArea = (v: string): v is AboutArea => (ABOUT_AREA_IDS as readonly string[]).includes(v);

/** A tool card's desktop crop as the card draws a picture. */
function desktopShot(theme: string, tool: string): Shot | null {
  const crop = pageToolCropFor(theme, tool);
  if (!crop) return null;
  const [x, y, w, h] = crop.halo;
  return { src: crop.src, width: crop.w, height: crop.h, halo: { x, y, w, h } };
}

export default async function AboutAreaRoute({
  params, searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [userId, { area }, query] = await Promise.all([requireUserId(), params, searchParams]);
  if (!isArea(area)) notFound();
  const env = await requestSwitchEnv(userId);
  const visible = visibleSections(env);
  // Fits are read for the tools this area draws alone; an area with none reads none.
  const here = toolIdsIn(visible, switchesOn(env), area);
  const from = safeFrom(query[FROM_PARAM]);
  const deckId = from === null ? null : deckIdOf(from);
  const [theme, cardInput, seen, deckName] = await Promise.all([
    resolveTheme(),
    here.length > 0 ? loadCardInput(userId, env, undefined, here) : null,
    aboutSeen(userId),
    deckId === null ? null : ownDeckName(userId, deckId),
  ]);
  const screen = from === null ? null : backScreenName(from, deckName);
  const back = from !== null && screen !== null ? { from, screen } : null;
  const tools = cardInput ? pageTools(visible, cardInput, area) : new Map<string, PageToolCard[]>();
  const cardOf = (card: PageToolCard): PageCard => ({
    card,
    phone: shotFor(theme, toolShotId(card.id)),
    desktop: desktopShot(theme, card.id),
  });
  const sections = visible
    .filter((s) => s.area === area)
    .map((s) => ({
      id: s.id,
      name: s.name,
      sub: s.sub,
      phone: screenModel(s, theme, "phone"),
      desktop: screenModel(s, theme, "desktop"),
      rules: s.rules.flatMap((r) => (r.diagram ? [{ key: r.key, text: r.text, diagram: r.diagram }] : [])),
      tools: (tools.get(`${s.area}/${s.id}`) ?? []).map(cardOf),
    }));
  // The server decides only what a landing needs to know about the reader: which labels this page can land on and
  // whether each is New to them. The landing itself follows the LIVE address on the client (`LabelLanding`), because a
  // second Show me to this page is served from the router's cache with no render here. `initialLit` lights the first
  // paint when the request itself carried a label this page can land on.
  const landable = landableIn(area, visible, seen);
  const lit = query[LIT_PARAM];
  const initialLit = typeof lit === "string" && Object.hasOwn(landable, lit) ? lit : null;
  // Whether opening the page writes anything: decided from the same pre-visit state the New marks were.
  const after = afterVisit(visible, area, seen);
  const held = new Set(seen.ids);
  // What the visit writes, as this render names it: sent back with the visit, which writes only those of them the
  // reader's switches still draw then, so a unit switched on after this render stays new.
  const claimed = after.ids.filter((id) => !held.has(id));
  const owed = after.version > seen.version || claimed.length > 0;
  return (
    <>
      <AreaPage area={area} sections={sections} theme={theme} landable={landable} initialLit={initialLit} back={back} />
      <RecordPageVisit area={area} owed={owed} keys={seenKeysOf(visible, area)} claimed={claimed} />
    </>
  );
}
