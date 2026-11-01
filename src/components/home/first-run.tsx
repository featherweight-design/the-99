// First run — collection unread, no decks. The three-step checklist is the
// whole page: step 1 live, steps 2 and 3 stated and locked. The import foot
// that once sat under them is gone (first-run ruling 1, 2026-09-28); step 1's
// ways group is how a player with no file
// reaches Precons I own, Import a deck and Add cards by hand. An unnumbered
// Friends row sits last, under step 3.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md
// §HomeFirstRun. Where the plan and that table disagree on a value the table
// wins, which is why the locked cards are --surface-rail on --border and the
// step-1 card is --surface-inset.

import { ArrivalsBanner } from "./arrivals-banner";
import { HOME_HEADING_ID } from "./home-heading";
import type { AboutLine } from "../../lib/about/notice";
import { FirstRunStepOne } from "./first-run-step-one";
import { HomeTour } from "../discovery/home-tour";
import Link from "next/link";
import { feedCopy } from "../../lib/copy/feed";
import { lockPageLine, refreshCopy } from "../../lib/copy/refresh";
import { PendingReporter } from "../shell/pending-reporter";
import { Lock } from "../ui/lock";
import { FirstRunFriendsRow, type FirstRunFriendsProps } from "./first-run-friends";

/**
 * Three overlapping cards, the front one carrying the numeral. Decorative:
 * it says nothing the heading does not, and a reader walking three empty
 * rectangles and a bare "99" gets noise instead of the step they are on.
 */
function CardFan() {
  return (
    <div
      aria-hidden="true"
      className="relative h-[92px] w-[88px] sm:h-[82px] sm:w-[74px] sm:flex-none"
    >
      <span
        // The one fill here with no token of its own: the fan needs three
        // separated planes and the surface scale has only two steps between
        // --surface-inset and --elevated, so the third is mixed from the pair.
        className="absolute top-[14px] left-[8px] h-[68px] w-[50px] -rotate-[14deg] rounded-[6px] border border-[color:var(--border-strong)] bg-[color-mix(in_srgb,var(--surface-inset)_50%,var(--elevated))] sm:top-[12px] sm:left-[6px] sm:h-[60px] sm:w-[44px] sm:rounded-[5px]"
      />
      <span className="absolute top-[10px] left-[18px] h-[68px] w-[50px] rounded-[6px] border border-[color:var(--border-strong)] bg-[color:var(--elevated)] sm:top-[9px] sm:left-[14px] sm:h-[60px] sm:w-[44px] sm:rounded-[5px]" />
      <span className="absolute top-[14px] left-[30px] flex h-[68px] w-[50px] rotate-[13deg] items-center justify-center rounded-[6px] border border-[color:var(--accent)] bg-[color:var(--surface)] font-display text-[17px] font-bold text-[color:var(--accent-text)] sm:top-[12px] sm:left-[24px] sm:h-[60px] sm:w-[44px] sm:rounded-[5px] sm:text-[15px]">
        99
      </span>
    </div>
  );
}

function LockedStep({ n, title, reason }: { n: number; title: string; reason: string }) {
  // Derived from `n` rather than `useId`, which would make this a client
  // component for two strings. The checklist is the whole page when it renders
  // at all, so the step number is unique in the document.
  const titleId = `first-run-step-${n}-title`;
  const reasonId = `first-run-step-${n}-reason`;
  return (
    // No opacity wrapper over the locked colours: the table states them
    // outright, and an opacity stacked on top would make the result depend on
    // whatever surface each theme puts behind the card.
    // `role="group"` so the label is actually announced: `aria-label` on a
    // generic div names nothing, and the reason is what tells a screen-reader
    // user the step is locked rather than merely dim.
    //
    // Named from its own two visible strings rather than
    // `firstRun.lockedItemAria`, which names a nav slot ("{label}, locked") and
    // leaves the reason to the note it describes. A step card has no note, so its
    // name carries its own reason: step 3 waits on a commander, not the
    // collection, and a borrowed reason would be wrong out loud.
    <div
      role="group"
      aria-labelledby={`${titleId} ${reasonId}`}
      className="flex min-h-[56px] flex-none items-center gap-[12px] rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface-rail)] p-[14px_15px] sm:min-h-0 sm:gap-[14px] sm:p-[15px_18px]"
    >
      <span
        aria-hidden="true"
        className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px] border border-[color:var(--border)] font-mono text-[11px] text-[color:var(--fg-disabled)]"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-auto flex-col gap-[3px]">
        <span
          id={titleId}
          className="font-display text-[15px] font-semibold text-[color:var(--fg-locked)] sm:text-[16px]"
        >
          {title}
        </span>
        {/* `--fg-locked`, not the `--fg-disabled` the design note names: this
            line is the only place a sighted reader learns what the step waits
            on, and that token sits under the 3:1 floor on purpose. The numeral
            above keeps it — it is `aria-hidden` and its ordinal is already
            carried by document order. */}
        <span id={reasonId} className="text-[12px] text-[color:var(--fg-locked)] sm:text-[12.5px]">
          {reason}
        </span>
      </div>
      {/* The lock glyph, shared with the rail's well and the page line, in the card's own locked ink. */}
      <Lock size="lg" ink="var(--fg-locked)" className="flex-none" />
    </div>
  );
}

/**
 * "Choose your news" (menu and Home handoff, `.frw.new`): last in the checklist, to Settings' Notifications. No feed
 * before cards, since nothing in it would be about the reader yet; this row is where its choices start. Always on
 * (`HOME_FEED_ENABLED` is retired).
 */
function FirstRunNewsRow() {
  const n = feedCopy.firstRun;
  return (
    <Link
      href="/settings"
      data-first-run-news
      className="flex min-h-[56px] items-center gap-[12px] rounded-[14px] [border:1px_solid_var(--border-strong)] bg-[color:var(--surface-rail)] p-[12px_15px] font-sans no-underline"
    >
      <span aria-hidden className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px] [border:1.5px_solid_var(--accent-shadow)]">
        <span className="h-[6px] w-[6px] rotate-45 bg-[color:var(--accent)]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <b className="font-display text-[15px] font-semibold text-[color:var(--fg)]">{n.title}</b>
        <span className="text-[12px] text-[color:var(--fg-muted)]">{n.line}</span>
      </span>
      <span aria-hidden className="text-[color:var(--fg-faint)]">›</span>
      <PendingReporter href="/settings" />
    </Link>
  );
}

export function FirstRunChecklist({
  about = null,
  welcome = null,
  friends = null,
  signature = null,
  tables = null,
  tour = false,
  news = false,
  commandersPlace = false,
}: {
  /** The Choose your news row, last (always on now). */
  news?: boolean;
  /** the Commanders place (always on) for the reader: the lock's page line names only the slots the bar locks. */
  commandersPlace?: boolean;
  /** `tourDue`: the first-run tour runs over this page once (discovery R3·1b). */
  tour?: boolean;
  about?: AboutLine | null;
  /** The welcome-credits strip (welcome credits D2), read per request, or null: drawn under About's line. */
  welcome?: React.ReactNode;
  /** The Friends row after step 3 (Discovery R3·3), read per request. Null (a failed read): no row. */
  friends?: FirstRunFriendsProps | null;
  /** The signature card row (avatar handoff 20, call 4), or null: unnumbered, after step 3 and before Add your friends. */
  signature?: React.ReactNode;
  /** Rule 0's `Tonight's table` cards: a reader with no cards and no decks can still be seated (their seat waits). */
  tables?: React.ReactNode;
}) {
  const c = refreshCopy.firstRun;

  return (
    // The accent wash is a desktop figure: 640×340 at 40% of a 390px frame is
    // the whole screen, which is a tint over the page rather than the light
    // behind the fan the frame draws. Phone gets `--bg` alone.
    <div className="group/first-run flex min-w-0 flex-auto flex-col sm:bg-[radial-gradient(640px_340px_at_40%_-40px,color-mix(in_oklab,var(--accent)_7%,transparent),transparent_70%)]">
      {tables ? <div className="flex flex-col gap-[12px] p-[16px_16px_0] sm:max-w-[392px] sm:p-[26px_28px_0] xl:max-w-none">{tables}</div> : null}
      {/* While step 1's review is open on the phone (5a), the page keeps the kicker and gives the
          heading's room to the review: the card's `data-reviewing` reaches these through `:has`,
          since the heading is drawn here and the review state lives in the step card. Stops at
          `md`, with every other reviewing override. Visually hidden rather than removed: the
          review draws no heading of its own on the phone, so this stays the page's one heading. */}
      <div className="p-[16px_16px_0] sm:p-[26px_28px_0] max-md:group-has-[[data-reviewing]]/first-run:pt-[10px]">
        {/* The kicker replaces the shipped "Three steps to your first
            recommendations." — it says the same thing in four words, and the
            copy file has no string for the sentence. */}
        <p className="m-0 mb-[6px] max-md:group-has-[[data-reviewing]]/first-run:mb-0 font-mono text-[10px] tracking-[0.16em] text-[color:var(--fg-faint)] uppercase sm:mb-[7px] sm:tracking-[0.18em]">
          {c.step(1, 3)}
        </p>
        {/* No Crown above this: the card fan is the brand moment now, and two
            marks stacked over one heading is one too many. */}
        {/* Focusable by script only: the welcome strip's ✕ moves focus here once it has closed. */}
        <h1 id={HOME_HEADING_ID} tabIndex={-1} className="m-0 outline-none max-md:group-has-[[data-reviewing]]/first-run:sr-only font-display text-[23px] font-bold leading-[1.15] text-[color:var(--fg)] sm:text-[27px] sm:leading-none">
          {c.heading}
        </h1>
        {/* The lock's page line (first-run-locked-nav 2.x): desktop only, where
            the rail shows (`md`), since the phone's tab-bar bracket carries the
            same reason. On first run only: an account with decks and no
            collection sees the dashboard, and no line. */}
        <p
          data-lock-page-line
          className="m-0 mt-[12px] hidden items-center gap-[8px] text-[12.5px] text-[color:var(--fg-muted)] md:flex"
        >
          <Lock size="lg" ink="var(--fg-locked)" className="flex-none" />
          {/* Three names while Collection is open at zero cards (no-collection entry, call 6). */}
          {lockPageLine(commandersPlace)}
        </p>
      </div>

      {/* About's line (A3, or the launches for an account that read About and then cleared its collection), between
          the heading and the steps. No arrival lines here (H7), and no ✕: the checklist is the first-run surface
          itself, and the line goes once an About page is opened. */}
      {about && <ArrivalsBanner data={null} about={about} closable={false} gutter="checklist" />}
      {welcome}

      <div className="flex min-h-0 flex-auto flex-col gap-[11px] p-[16px_16px_20px] sm:gap-[12px] sm:p-[20px_28px_26px] max-md:group-has-[[data-reviewing]]/first-run:pt-[8px]">
        {/* Step 1 — live. A client component, because the card changes while its review is
            open (D11, 5a); the fan is drawn here and handed in. */}
        <FirstRunStepOne fan={<CardFan />} />

        <LockedStep n={2} title={c.step2Title} reason={c.step2Locked} />
        <LockedStep n={3} title={c.step3Title} reason={c.step3Locked} />
        {/* Friends (Discovery R3·3, addendum-friends-home §3): last, under step 3, and never numbered, so the kicker
            stays Step 1 of 3. Live from the first visit while the steps above it are locked, and it stays once done. */}
        {signature}
        {friends && <FirstRunFriendsRow {...friends} />}
        {news && <FirstRunNewsRow />}
        {/* The tour's precon line follows step 1's ways group, which always offers Precons I own. */}
        {/* Mounted always: `/?tour=1` runs the tour again (discovery R3·2), here the first-run tour itself. */}
        <HomeTour due={tour} mode="first-run" precons />
        {/* No foot. Step 1 is the collection alone (first-run ruling 1, 2026-09-28): the
            "Already have a deck elsewhere?" row and its `mt-auto` are deleted rather than
            replaced, so the stack closes up and the space below it stays page. Import is
            named by step 2 instead, and reached from Home once the collection is read. */}
      </div>
    </div>
  );
}
