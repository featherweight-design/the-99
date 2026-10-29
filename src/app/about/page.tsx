// /about — the index of About's six pages (About visual build, plan `2026-10-27-about-visual.md`, PR 6a; handoff call 3,
// board Ways-In "Index"), and `?tab=tools` with it now the Tools tab has retired. The Reference still draws at
// `?tab=reference` (discovery R2·6b) for old bookmarks until PR 7b retires it; no link the app builds names it
// (`legacyHref`). The legacy gate's `?next=` and its Got it retired with the gate (PR 6b): any `next` is ignored. Auth-gated like every other route: the app is invite-only, so there
// is no public version of this page.

import { requireUserId } from "../../lib/auth";
import { aboutSeen } from "../../lib/about/read";
import { howItWorksEnabled } from "../../lib/about/how-it-works-flag";
import { referenceScreens } from "../../lib/about/reference";
import { displayedId, isFirstRun, switchedIds, unseenEntries, visibleEntries, type SeenState } from "../../lib/about/visible";
import { ABOUT_VERSION, fillAllowance } from "../../lib/copy/about";
import { howItWorksRowsCopy } from "../../lib/copy/how-it-works";
import { HOW_IT_WORKS_ID } from "../../lib/copy/how-it-works-links";
import { showcaseGroups } from "../../lib/discovery/showcase";
import { loadCardInput } from "../../lib/discovery/showcase-input";
import { firstRunTourEnabled } from "../../lib/discovery/onboarding-flag";
import { dailyLimitFor } from "../../lib/model/allowance";
import { perfRoute } from "../../lib/perf/timing";
import { requestSwitchEnv } from "../../lib/switches/request";
import { resolveTheme } from "../../lib/theme/server";
import { db } from "../../db";
import { AboutTabs } from "../../components/about/tools/about-tabs";
import { aboutTabOf } from "../../lib/about/tab";
import { AboutIndex, type IndexTile } from "../../components/about/pages/about-index";
import { answeredKeys, visibleSections } from "../../lib/about/pages-visible";
import { pageShotFor, type PageWidth } from "../../lib/about/page-shots";
import { ABOUT_AREAS, ABOUT_PAGE_STRINGS } from "../../lib/copy/about-pages";
import { ReferenceTab } from "../../components/about/reference/reference-tab";
import { HowItWorks } from "../../components/about/how-it-works";
import { RecordVisit } from "../../components/about/record-visit";
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

export default async function AboutRoute({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const perf = perfRoute("/about");
  const [userId, params] = await Promise.all([requireUserId(), searchParams]);
  // The switches the proxy decided this request from: the page draws the entries its gate counted.
  const env = await requestSwitchEnv(userId);
  const visible = visibleEntries(env);
  const seen = await aboutSeen(userId);

  // The Reference's own "New" (`unseenEntries`): nothing for a first-run reader, whose banner line introduces About.
  const unseen = new Set(unseenEntries(visible, { version: seen.version, ids: seen.ids }).map((e) => e.id));
  const behind = seen.version < ABOUT_VERSION || unseen.size > 0;

  // Everyone but an old Reference bookmark gets the index, `?tab=tools` included.
  if (aboutTabOf(params.tab) !== "reference") {
    const theme = await resolveTheme();
    return (
      <div className="flex flex-col pb-[30px] md:pb-[64px]">
        {/* The tiles are captures chosen in `theme`: a theme picked from the account menu asks the server again. */}
        <ThemeRefresh drawnIn={theme} />
        <AboutIndex tiles={indexTiles(env, theme)} tour={firstRunTourEnabled(env)} />
        {/* Launch A2: the same quiet line /credits and /sign-up carry. */}
        <LegalLinks className="mt-[32px] px-[16px] md:px-[30px]" />
      </div>
    );
  }

  const visibleIds = new Set(visible.map((e) => e.id));
  const [creditLimit, theme, cardInput] = await Promise.all([
    // The reader's own daily credit limit, read once: the credits entry and How it works state it.
    dailyLimitFor(db, userId),
    resolveTheme(),
    loadCardInput(userId, env, perf),
  ]);

  const groups = showcaseGroups({ ...cardInput, visibleEntryIds: visibleIds });
  const filled = visible.map((e) => ({ ...e, caption: fillAllowance(e.caption, creditLimit) }));
  const screens = referenceScreens(filled, groups, theme);
  // Listed in the Reference's own order.
  const whatsNew = screens.flatMap((s) => s.entries).filter((e) => unseen.has(e.id)).map((e) => ({ id: e.id, title: e.title }));

  const howItWorks = howItWorksEnabled(env);
  // What this render shows, by id, for the visit to acknowledge: nothing it did not draw, so an entry switched on
  // between this render and the write is still new afterwards.
  const shown = [...switchedIds(visible), ...(howItWorks ? [HOW_IT_WORKS_ID] : [])];
  const owes = behind || (howItWorks && !seen.ids.includes(HOW_IT_WORKS_ID));
  // What Home's banner checks is the pages' unit keys, not these legacy ids: the units this visit's write leaves the
  // reader told about (`answeredKeys` of the state it writes, the floor and `shown`), which the visit acknowledges in
  // this document so Back to Home does not redraw their launches. A first-run reader's visit ends their first run.
  const written: SeenState = owes
    ? { version: Math.max(seen.version, ABOUT_VERSION), ids: [...new Set([...seen.ids, ...shown])] }
    : seen;
  const answered = answeredKeys(visibleSections(env), written);
  const endsFirstRun = isFirstRun(seen) && !isFirstRun(written);

  // The boards' `main` (ReferencePhone `24px 0 104px`; the Desk boards `40px 56px 64px`). The phone's 104px includes
  // the 74px tab bar the shell's main column already reserves (`--tabbar-h`), so 30px is the page's own.
  return (
    <div className="flex flex-col pb-[30px] pt-[24px] md:px-[56px] md:pb-[64px] md:pt-[40px]">
      {/* The Reference's entry shots are captures chosen in `theme` too. */}
      <ThemeRefresh drawnIn={theme} />
      <AboutTabs
        count={screens.reduce((n, s) => n + s.entries.length, 0)}
        tour={firstRunTourEnabled(env)}
        panel={
          <ReferenceTab
            screens={screens}
            whatsNew={whatsNew}
            how={howItWorks ? <HowItWorks entries={visible} creditLimit={creditLimit} /> : null}
            howCount={howItWorksRowsCopy.rows.length}
          />
        }
      />
      {/* The visit is recorded when what's new is drawn, the Reference (R2 gap 10), until PR 7b retires it: a reader
          who reads it here is not told those entries again. The appendix is recorded by the same visit, so a reader
          current on every entry who has not seen it still owes the write. */}
      <RecordVisit
        behind={owes}
        shown={shown}
        drawn={visible.map(displayedId)}
        answered={answered}
        endsFirstRun={endsFirstRun}
      />
      {/* Launch A2: the same quiet line /credits and /sign-up carry. */}
      <LegalLinks className="mt-[32px] px-[16px] md:px-0" />
    </div>
  );
}
