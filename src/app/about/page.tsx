// /about — the app's own reference, in its discovery shape (R2·6b; README-r2 C1 and C5, plan
// `2026-10-16-discovery-r2-r3.md` "About's shape"): Tools by default, the Reference at `?tab=reference`. Auth-gated
// like every other route: the app is invite-only, so there is no public version of this page.

import { count, eq } from "drizzle-orm";
import { requireUserId } from "../../lib/auth";
import { aboutSeen } from "../../lib/about/read";
import { aboutSheetEnabled } from "../../lib/about/flag";
import { safeNext } from "../../lib/about/gate";
import { howItWorksEnabled } from "../../lib/about/how-it-works-flag";
import { referenceScreens } from "../../lib/about/reference";
import { displayedId, switchedIds, unseenEntries, visibleEntries } from "../../lib/about/visible";
import { readSyncBase } from "../../lib/collection/sync-base";
import { ABOUT_VERSION, ALLOWANCE_SLOT, fillAllowance } from "../../lib/copy/about";
import { howItWorksRowsCopy } from "../../lib/copy/how-it-works";
import { HOW_IT_WORKS_ID } from "../../lib/copy/how-it-works-links";
import { DECK_TOOLS, loadToolFits, type DeckToolId } from "../../lib/discovery/fits";
import { showcaseGroups, writtenForYou } from "../../lib/discovery/showcase";
import { TOOLS } from "../../lib/discovery/tools";
import { dailyLimitFor } from "../../lib/model/allowance";
import { perfRoute } from "../../lib/perf/timing";
import { SWITCH_FLAGS } from "../../lib/switches/flags";
import type { SwitchName } from "../../lib/switches/registry";
import { requestSwitchEnv } from "../../lib/switches/request";
import { resolveTheme } from "../../lib/theme/server";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { AboutTabs } from "../../components/about/tools/about-tabs";
import { aboutTabOf } from "../../lib/about/tab";
import { ToolsTab } from "../../components/about/tools/tools-tab";
import { ReferenceTab } from "../../components/about/reference/reference-tab";
import { HowItWorks } from "../../components/about/how-it-works";
import { RecordVisit } from "../../components/about/record-visit";
import { GateDismiss } from "../../components/about/gate-dismiss";

/**
 * A repeated query key arrives as an array — `/about?next=/decks&next=/collection`
 * is a URL anyone can write. Typed as `string` it read as one, and `safeNext`
 * would have called `startsWith` on an array and thrown during render: a
 * crafted link crashing the page whose whole job is being reachable.
 *
 * An array is refused rather than reduced to its first value. Two destinations
 * is not a destination, and picking one would be guessing at which.
 */
function soleNext(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** The deck tools whose switches are on for this reader: the only ones `loadToolFits` is asked about. */
function deckToolsFor(isOn: (name: SwitchName) => boolean): DeckToolId[] {
  const deckTools: ReadonlySet<string> = new Set(DECK_TOOLS);
  return TOOLS.filter((t) => deckTools.has(t.id) && (t.switch === null || isOn(t.switch))).map((t) => t.id as DeckToolId);
}

async function deckCount(userId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(decks).where(eq(decks.userId, userId));
  return Number(row?.n ?? 0);
}

export default async function AboutRoute({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; tab?: string | string[] }>;
}) {
  const perf = perfRoute("/about");
  const [userId, params] = await Promise.all([requireUserId(), searchParams]);
  // The switches the proxy decided this request from: the page draws the entries its gate counted.
  const env = await requestSwitchEnv(userId);
  const isOn = (name: SwitchName) => SWITCH_FLAGS[name](env);
  const visible = visibleEntries(env);
  const visibleIds = new Set(visible.map((e) => e.id));
  const syncOn = isOn("COLLECTION_SYNC_ENABLED");
  const [seen, creditLimit, theme, fits, decksHeld, syncBase] = await Promise.all([
    aboutSeen(userId),
    // The reader's own daily credit limit, read once: the credits entry, Written for you and How it works state it.
    dailyLimitFor(db, userId),
    resolveTheme(),
    perf.timed("toolFits", () => loadToolFits(userId, env, deckToolsFor(isOn))),
    deckCount(userId),
    syncOn ? readSyncBase(userId) : null,
  ]);

  const groups = showcaseGroups({
    isOn,
    visibleEntryIds: visibleIds,
    fits,
    deckCount: decksHeld,
    hasSyncBase: syncBase !== null && "anchor" in syncBase,
  });
  const filled = visible.map((e) => ({ ...e, caption: fillAllowance(e.caption, creditLimit) }));
  const screens = referenceScreens(filled, groups, theme);

  // "New" is the one rule the banner and the gate read (`unseenEntries`): nothing for a first-run reader, whose
  // banner line introduces the page instead. Listed in the Reference's own order.
  const unseen = new Set(unseenEntries(visible, { version: seen.version, ids: seen.ids }).map((e) => e.id));
  const whatsNew = screens.flatMap((s) => s.entries).filter((e) => unseen.has(e.id)).map((e) => ({ id: e.id, title: e.title }));
  const behind = seen.version < ABOUT_VERSION || unseen.size > 0;

  const howItWorks = howItWorksEnabled(env);
  // What this render shows, by id, for the visit and the dismiss to acknowledge: nothing they did not draw, so an
  // entry switched on between this render and the write is still new afterwards.
  const shown = [...switchedIds(visible), ...(howItWorks ? [HOW_IT_WORKS_ID] : [])];

  const sheetMode = aboutSheetEnabled(env);
  // Sent here by the legacy gate (`?next=`, only with the sheet switch off) rather than come to look: owed a way back.
  const destination = safeNext(soleNext(params.next));
  const redirected = typeof params.next === "string" && params.next.length > 0;
  const offerDismiss = !sheetMode && behind && redirected;
  // The gate sends a reader because something is new, and what's new is drawn in the Reference.
  const initial = offerDismiss ? "reference" : aboutTabOf(params.tab);

  const credits = visible.find((e) => e.id === "credits");
  const written = writtenForYou(credits ? credits.caption : null);

  // The boards' `main` (ShowcasePhone, ReferencePhone `24px 0 104px`; the Desk boards `40px 56px 64px`). The phone's
  // 104px includes the 74px tab bar the shell already reserves (`--tabbar-h`), so 30px is the page's own.
  return (
    <div className="flex flex-col pb-[30px] pt-[24px] md:px-[56px] md:pb-[64px] md:pt-[40px]">
      <AboutTabs
        initial={initial}
        counts={{ tools: groups.reduce((n, g) => n + g.cards.length, 0), reference: screens.reduce((n, s) => n + s.entries.length, 0) }}
        helpHint={isOn("HELP_PANEL_ENABLED")}
        panels={{
          tools: <ToolsTab groups={groups} written={written} allowance={fillAllowance(ALLOWANCE_SLOT, creditLimit)} theme={theme} />,
          reference: (
            <ReferenceTab
              screens={screens}
              whatsNew={whatsNew}
              how={howItWorks ? <HowItWorks entries={visible} creditLimit={creditLimit} /> : null}
              howCount={howItWorksRowsCopy.rows.length}
            />
          ),
        }}
        // The visit is recorded when what's new is drawn, the Reference (or the banner's `?tab=reference#new`), never
        // on a load that stays on Tools (R2 gap 10). As shipped, only with the sheet switch on; with it off the gate's
        // dismiss records it. The appendix is recorded by the same visit, so a reader current on every entry who has
        // not seen it still owes the write.
        onceShown={
          sheetMode
            ? {
                reference: (
                  <RecordVisit
                    behind={behind || (howItWorks && !seen.ids.includes(HOW_IT_WORKS_ID))}
                    shown={shown}
                    drawn={visible.map(displayedId)}
                  />
                ),
              }
            : undefined
        }
      />
      {offerDismiss && <GateDismiss destination={destination} shown={shown} />}
    </div>
  );
}
