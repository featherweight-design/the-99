// /about/[area]: one of About's six visual pages (About visual build, plan `2026-10-27-about-visual.md`, PR 3; handoff
// `design/design_handoff_the99_about_visual/`). DARK until PR 6a: nothing links here but the pages' own strip.
//
// The reader's switches decide what is drawn (`visibleSections`: a label switched off is gone, never greyed), and the
// reader's theme picks the captures (`pageShotFor` falls back to the default theme at the same width). An unknown area
// is a 404.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { visibleSections } from "../../../lib/about/pages-visible";
import { screenModel } from "../../../lib/about/pins";
import { ABOUT_AREA_IDS, type AboutArea } from "../../../lib/copy/about-pages";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { resolveTheme } from "../../../lib/theme/server";
import { AreaPage } from "../../../components/about/pages/area-page";

const isArea = (v: string): v is AboutArea => (ABOUT_AREA_IDS as readonly string[]).includes(v);

export default async function AboutAreaRoute({ params }: { params: Promise<{ area: string }> }) {
  const [userId, { area }] = await Promise.all([requireUserId(), params]);
  if (!isArea(area)) notFound();
  const [env, theme] = await Promise.all([requestSwitchEnv(userId), resolveTheme()]);
  const sections = visibleSections(env)
    .filter((s) => s.area === area)
    .map((s) => ({
      id: s.id,
      name: s.name,
      sub: s.sub,
      phone: screenModel(s, theme, "phone"),
      desktop: screenModel(s, theme, "desktop"),
    }));
  return <AreaPage area={area} sections={sections} />;
}
