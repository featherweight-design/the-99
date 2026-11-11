// /about — the index of About's six pages (About visual build, plan `2026-10-27-about-visual.md`, PR 6a; handoff call 3,
// board Ways-In "Index"). Any query is ignored: the Reference tab (`?tab=reference`) and the Tools tab retired, and an
// old bookmark to either lands here. Auth-gated like every other route: the app is invite-only, so there
// is no public version of this page.

import { requireUserId } from "../../lib/auth";
import { feedbackEnabled } from "../../lib/feedback/flag";
import { requestFlags } from "../../lib/flags/request";
import { resolveTheme } from "../../lib/theme/server";
import { AboutIndex, type IndexTile } from "../../components/about/pages/about-index";
import { visibleSections } from "../../lib/about/pages-visible";
import { pageShotFor, type PageWidth } from "../../lib/about/page-shots";
import { ABOUT_AREAS, ABOUT_PAGE_STRINGS } from "../../lib/copy/about-pages";
import { LegalLinks } from "../../components/legal/legal-links";
import { ThemeRefresh } from "../../components/about/pages/theme-refresh";

/** The index's six tiles: each page's first capture at each width, and its count of what this reader is drawn. */
function indexTiles(env: NodeJS.ProcessEnv, theme: string): IndexTile[] {
  const visible = visibleSections(env);
  return ABOUT_AREAS.map((a) => {
    const sections = visible.filter((s) => s.area === a.id);
    const first = (width: PageWidth) => {
      const capture = sections[0]?.captures[width][0];
      const shot = capture ? pageShotFor(theme, width, capture) : null;
      return shot ? { src: shot.src, w: shot.w, h: shot.h } : null;
    };
    return {
      area: a.id,
      name: a.name,
      line: a.line,
      count: ABOUT_PAGE_STRINGS.indexCount(sections.length, sections.reduce((n, s) => n + s.rules.length, 0)),
      phone: first("phone"),
      desktop: first("desktop"),
    };
  });
}

export default async function AboutRoute() {
  const userId = await requireUserId();
  // The switches the proxy decided this request from: the index counts what this reader is drawn.
  const env = await requestFlags(userId);
  const theme = await resolveTheme();
  return (
    <div className="flex flex-col pb-[30px] md:pb-[64px]">
      {/* The tiles are captures chosen in `theme`: a theme picked from the account menu asks the server again. */}
      <ThemeRefresh drawnIn={theme} />
      <AboutIndex tiles={indexTiles(env, theme)} reportable={feedbackEnabled(env)} />
      {/* Launch A2: the same quiet line /credits and /sign-up carry. */}
      <LegalLinks className="mt-[32px] px-[16px] md:px-[30px]" />
    </div>
  );
}
