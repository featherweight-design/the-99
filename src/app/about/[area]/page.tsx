// /about/[area]: one of About's six visual pages (About visual build, plan `2026-10-27-about-visual.md`, PR 3; handoff
// `design/design_handoff_the99_about_visual/`). DARK until PR 6a: nothing links here but the pages' own strip and
// their tool cards' Show me.
//
// The reader's switches decide what is drawn (`visibleSections`: a label switched off is gone, never greyed), and the
// reader's theme picks the captures (`pageShotFor` falls back to the default theme at the same width). An unknown area
// is a 404. Each section's Good to know rules are its visible rules, their switched sentences and diagram parts cut.
// Each section's Try it is its tools whose switch is on and whose label is drawn (`pageTools`), and a `?lit=` naming a
// label this page draws lands on it: lit, and, when the reader has not been told about it (`unseenUnits`), marked New
// with its tool card (PR 5, call 7). Nothing is written here: the visit's seen write is PR 6b's.

import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { aboutSeen } from "../../../lib/about/read";
import { pageToolCropFor } from "../../../lib/about/page-shots";
import { visibleSections } from "../../../lib/about/pages-visible";
import { screenModel } from "../../../lib/about/pins";
import { shotFor, toolShotId, type Shot } from "../../../lib/about/shots";
import { ABOUT_AREA_IDS, type AboutArea } from "../../../lib/copy/about-pages";
import { landingFor, pageTools, type PageCard, type PageToolCard } from "../../../lib/discovery/page-tools";
import { loadCardInput } from "../../../lib/discovery/showcase-input";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { resolveTheme } from "../../../lib/theme/server";
import { AreaPage } from "../../../components/about/pages/area-page";
import { LIT_PARAM } from "../../../components/discovery/label-landing";

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
  const [theme, cardInput, seen] = await Promise.all([resolveTheme(), loadCardInput(userId, env), aboutSeen(userId)]);
  const visible = visibleSections(env);
  const tools = pageTools(visible, cardInput);
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
  const lit = query[LIT_PARAM];
  const landing = landingFor(lit, area, visible, seen, sections.flatMap((s) => s.tools));
  return (
    <AreaPage
      area={area}
      sections={sections}
      theme={theme}
      landing={landing}
      landingRequest={lit === undefined ? null : randomUUID()}
    />
  );
}
