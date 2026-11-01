// Signed-in Home. The page authenticates and loads; this draws it.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md
// §HomeHeader. The mobile top bar the table draws above the kicker (mark +
// avatar) is the shell's, not this component's — see components/shell/nav.tsx.

import { GhostButton, PrimaryButton } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { countParts } from "../../lib/ui/count-parts";
import { refreshCopy } from "../../lib/copy/refresh";
import type { ReceiptCounts } from "../../lib/commanders/in-use";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";
import { formatWhen } from "../../lib/format/when";
import type { Commitments } from "../../lib/home/commitments";
import type { CommanderListItem } from "../../lib/recs/recommend";
import type { ReadySlice } from "../../lib/recs/ready-to-build";
import type { AboutLine } from "../../lib/about/notice";
import type { ArrivalsBannerData } from "../../lib/precons/banner";
import { ArrivalsBanner } from "./arrivals-banner";
import { HOME_HEADING_ID } from "./home-heading";
import { CommitmentsCard } from "./commitments-card";
import { HomeDecksZero } from "./home-decks-zero";
import { ReadyToBuild } from "./ready-to-build";
import { Lock } from "../ui/lock";
import { ResumeDecks, resumeDecks } from "./resume-decks";
import { FriendsSection, type FriendsSectionProps } from "./friends-section";
import { HomeTableCard } from "../rule-zero/home-table-card";
import type { OpenTable } from "../../lib/social/rule-zero";
import { Fragment } from "react";
import type { HomeFeed } from "../../lib/feed/home";
import { lockPageLine } from "../../lib/copy/refresh";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { LeadSlot } from "./lead-story";
import { HeldLeadProvider } from "./held-lead";
import { WhatsNew } from "./whats-new";
import { PushLanding } from "../push/push-landing";
import { TradeAskFrame } from "../social/trade-ask";
import type { TradeAskPayload } from "../../lib/social/trade-ask";

export type DashboardProps = {
  stats: { totalCards: number; uniqueCards: number };
  /** Null until a collection has been read — `formatWhen` names that state. */
  lastUpdated: Date | null;
  /** Null with the Home feed on: Ready to build leaves Home in direction B ("its job is For you's"), unread. */
  ready: ReadySlice<CommanderListItem> | null;
  /**
   * The Home feed (menu and Home PR 6), read per request outside the cached payload, or null when the read
   * failed (or absent, in tests). Present, Home is direction B: the lead story heads
   * the main column, What's new follows the resume block, and Ready to build is gone.
   */
  feed?: HomeFeed | null;
  /** the Commanders place (always on) for this reader: the lock's page line names only the slots the bar locks. */
  commandersPlace?: boolean;
  /**
   * PUSH_ENABLED is on for this reader and the feed was read (push PR 5): a push's landing opens its card here, through the
   * feed's provider, and the visit closes every delivered notification (D4). Absent, nothing of push runs.
   */
  /** This server visit's token while push is on for the reader (`PushLanding`); null otherwise. */
  pushVisit?: string | null;
  /** The feed's trade matches that open their spares sheet in place (product call 8); null or absent, the presses link. */
  tradeAsk?: TradeAskPayload | null;
  /** Keyed by commander oracleId, and only for the commanders shown. */
  inUse: Map<string, ReceiptCounts>;
  decks: DeckListItem[];
  /** Null when the availability read failed. The card renders nothing, not a zero. */
  commitments: Commitments | null;
  /** Friends on Home, read per request outside the cached payload. Null with a failed read. */
  friends?: (Omit<FriendsSectionProps, "className" | "now" | "head">) | null;
  /** Rule 0's open tables the reader sits at, read per request (plan decision 1); empty with a failed read. */
  tables?: OpenTable[];
  /** A precon pick's receipt (no-collection entry S5), or null: drawn under Rule 0's cards, above the strips. */
  receipt?: React.ReactNode;
  shopping: ShoppingRollup;
  /**
   * The arrivals banner (upcoming precons), or null: switch off, nothing to show, or the read failed. Part of the
   * cached payload; a ✕ moves the reader's stamp, which retires it.
   */
  arrivals?: ArrivalsBannerData | null;
  /**
   * About's lines on the same banner (About visual PR 6b), or null when nothing is new to the reader or their seen
   * state could not be read. Decided per request from the cached seen state, with the reader's switches and theme.
   */
  about?: AboutLine | null;
  /**
   * The welcome-credits strip (welcome credits D2), read per request outside the cached payload, or null. It heads the main
   * column, over Ready to build; the right column keeps Friends alone.
   */
  welcome?: React.ReactNode;
  /** Asking once for a signature card (avatar handoff 20, call 5), or null: the left column's first block. */
  signature?: React.ReactNode;
  /** `HELP_ME_CHOOSE_ENABLED`, resolved for this reader: `No decks yet` carries Help me choose's door (discovery R3 E1). */
  helpMeChoose?: boolean;
  /**
   * Decks and no cards (no-collection entry S12): the kicker counts the decks, the
   * header's one action is `Add your cards` (Update collection and New deck both need cards), the lock's page line
   * shows on desktop as it does on first run. Ready to build is absent at zero cards.
   */
  noCards?: boolean;
  /**
   * The server's clock, as an ISO string. A `Date` does not survive the
   * server/client boundary intact, and every relative date on this page has to
   * be measured against one instant or two of them will disagree.
   */
  now: string;
};

/** §Update collection — refresh icon. 14px, drawn on a 20px viewBox. */
function RefreshIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16.5 10a6.5 6.5 0 1 1-2.1-4.8" />
      <path d="M16.8 3.4v3.2h-3.2" />
    </svg>
  );
}

export function Dashboard(props: DashboardProps) {
  // Both arrive at the copy module pre-formatted: it formats no numbers by
  // contract, and the greeting's freshness figure is a word, not a date.
  const noDecks = props.decks.length === 0;
  // Rule 0's cards lead the body (revisions Home): soonest closing first, and nothing at all, no wrapper and no gap, without one.
  const tables = [...(props.tables ?? [])].sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime());
  const when = formatWhen(props.lastUpdated, new Date(props.now));
  const kicker = refreshCopy.home.kicker(props.stats.totalCards.toLocaleString("en-US"), when);
  const noCards = props.noCards === true;
  // Direction B, or null for Home as shipped. The lead leaves the list it heads (`splitLead`).
  const feed = props.feed ?? null;
  const lead = feed?.chosen ? feed.lead : null;
  // A friend's face for the feed, from the Friends section's own read: no second read of anyone's profile.
  const faces = new Map((props.friends?.friends ?? []).map((f) => [f.publicId, f.commander]));
  // Direction B's rows open the shipped card detail (a price drop's card, a combo's first piece): one provider over
  // the body, so the lead and the list share one modal. As shipped, none.
  const Frame = feed ? CardDetailProvider : Fragment;

  return (
    <div className="flex min-h-0 min-w-0 flex-auto flex-col bg-[color:var(--bg)] font-sans text-[color:var(--fg)]">
      <header className="flex flex-col sm:flex-row sm:items-end sm:gap-[16px] sm:p-[22px_26px_0]">
        <div className="min-w-0 px-[16px] pt-[14px] pb-0 sm:flex-auto sm:p-0">
          {/* Kicker above the greeting: the greeting is a hello, and the claim
              the page is actually making is the collection's size and age. */}
          <p className="m-0 mb-[6px] font-mono text-[10px] tracking-[0.16em] text-[color:var(--fg-faint)] uppercase sm:mb-[7px] sm:tracking-[0.18em]">
            {noCards ? (
              refreshCopy.home.kickerNoCards(props.decks.length)
            ) : (
              <CountUp value={props.stats.totalCards} {...countParts(kicker, props.stats.totalCards)} />
            )}
          </p>
          {/* Focusable by script only: the arrivals banner's ✕ moves focus here once it has closed (H8). */}
          <h1 id={HOME_HEADING_ID} tabIndex={-1} className="m-0 font-display outline-none text-[23px] leading-[1.15] font-bold text-[color:var(--fg)] sm:text-[28px] sm:leading-[1]">
            {refreshCopy.home.greeting}
          </h1>
        </div>

        {/* `contents` at sm rather than a second copy of the pair: the desktop
            header is one flex row and these two are its last members, while the
            phone gets its own full-width row at the 44px touch floor. Reversed
            there so New deck leads, which is the order the Decks header uses.
            The 390px frame draws neither button; dropping them would cost a
            phone reader both of the page's actions (table §Ambiguities 1). */}
        {noCards ? (
          <div className="flex gap-[8px] px-[16px] pt-[14px] pb-0 sm:contents">
            <PrimaryButton
              href="/collection"
              className="flex h-[44px] flex-auto items-center justify-center rounded-[10px] text-[14px] sm:h-[32px] sm:flex-none sm:justify-start sm:rounded-[8px] sm:px-[14px] sm:text-[12.5px]"
            >
              {refreshCopy.home.addYourCards}
            </PrimaryButton>
          </div>
        ) : (
        <div className="flex flex-row-reverse gap-[8px] px-[16px] pt-[12px] pb-0 sm:contents">
          <GhostButton
            href="/collection/replace"
            className="flex h-[44px] flex-auto items-center justify-center gap-[8px] rounded-[10px] text-[14px] font-normal text-[color:var(--fg)] sm:h-[32px] sm:flex-none sm:justify-start sm:rounded-[8px] sm:px-[12px] sm:text-[12.5px] sm:text-[color:var(--fg-body)]"
          >
            <RefreshIcon />
            {refreshCopy.home.updateCollection}
          </GhostButton>
          {/* Ruling 14: the page's one filled button, and bone rather than
              accent — accent means in use / to buy. EXCEPT at zero decks (Hugh's O7,
              option C, 2026-09-28): the "No decks yet" section's Browse commanders is the
              page's one fill then, so New deck is drawn as a ghost, and returns to the fill
              once a deck exists. The shared pair is untouched; only this button changes. */}
          {noDecks ? (
            <GhostButton
              href="/decks/new"
              className="flex h-[44px] flex-auto items-center justify-center rounded-[10px] text-[14px] sm:h-[32px] sm:flex-none sm:justify-start sm:rounded-[8px] sm:px-[14px] sm:text-[12.5px]"
            >
              {refreshCopy.home.newDeck}
            </GhostButton>
          ) : (
            <PrimaryButton
              href="/decks/new"
              className="flex h-[44px] flex-auto items-center justify-center rounded-[10px] text-[14px] sm:h-[32px] sm:flex-none sm:justify-start sm:rounded-[8px] sm:px-[14px] sm:text-[12.5px]"
            >
              {refreshCopy.home.newDeck}
            </PrimaryButton>
          )}
        </div>
        )}
      </header>

      {/* Rule 0's cards come first: under the page head, above the receipt, the strips and the lead. From `xl` each is one row. */}
      {tables.length > 0 && (
        <div data-home-tables className="px-[16px] pt-[14px] min-[1180px]:px-[26px] min-[1180px]:pt-[20px]">
          <div className="flex flex-col gap-[12px] sm:max-w-[392px] xl:max-w-none">
            {tables.map((t) => (
              <HomeTableCard key={t.tableId} table={t} now={new Date(props.now)} />
            ))}
          </div>
        </div>
      )}
      {props.receipt}

      {/* The lock's page line, as first run draws it (desktop only; the phone's bracket carries it): the three
          slots still locked while this account has decks and no cards. */}
      {noCards && (
        <p
          data-lock-page-line
          className="m-0 mt-[12px] hidden items-center gap-[8px] px-[26px] text-[12.5px] text-[color:var(--fg-muted)] md:flex"
        >
          <Lock size="lg" ink="var(--fg-locked)" className="flex-none" />
          {lockPageLine(props.commandersPlace === true)}
        </p>
      )}

      {/* Between the header and Ready to build, in the flow and spanning both columns (handoff call 4). */}
      {/* Keyed by what it draws, so a new batch is a new banner and never inherits an earlier one's dismissal. */}
      {(props.arrivals || props.about) && (
        <ArrivalsBanner
          key={[...(props.arrivals?.keys ?? []), ...(props.about?.ids.map((id) => `about:${id}`) ?? [])].join(",")}
          data={props.arrivals ?? null}
          about={props.about ?? null}
        />
      )}

      {/* §HomeBody. One row of two columns on desktop; on a phone the same two
          columns stack, and nothing drops at either width — that is the whole
          point of this round. The order is the same both ways: CTAs, Ready to
          build, the resume block, Commitments. On desktop Commitments IS the
          right rail now, the deck list that sat above it having left. */}
      {/* Two columns at 1180px, not at `sm` — the same threshold the resume rows
          pair at, because the rail is what takes the width away from them.
          Between 640 and 1179 the old `sm:flex-row` put Commitments in a 316px
          rail BESIDE the rows, so a reader at 900px met a different block order
          from a reader at either width the handoff draws. The PADDING moves with
          the split rather than staying at `sm`: left behind, it gave 640–1179 a
          third layout, one column wide with desktop padding. */}
      <Frame>
      {feed && props.pushVisit && <PushLanding visit={props.pushVisit} />}
      <TradeAskFrame payload={props.tradeAsk ?? null}>
      <HeldLeadProvider>
      <div className="flex min-h-0 flex-auto flex-col gap-[12px] px-[16px] pt-[14px] pb-[16px] min-[1180px]:flex-row min-[1180px]:gap-[20px] min-[1180px]:p-[20px_26px_26px]">
        {/* Below 1180 both columns are `display: contents`, so their blocks are one list and `order` places them: Ready to
            build, Friends, the resume block, Commitments (Friends on Home, R2b; readiness gap 3). Friends is drawn ONCE,
            in the right column, so there is one invite watch and one dialog. A screen reader reads the DOM order at
            every width, which this layout already accepts for Commitments. */}
        {/* The lead's ✕ hands focus on to What's new's first row (`nextDismiss`); the rows keep their own section's scope. */}
        <div data-dismiss-scope className="contents min-[1180px]:flex min-[1180px]:min-w-0 min-[1180px]:flex-auto min-[1180px]:flex-col min-[1180px]:gap-[11px]">
          {props.signature}
          {props.welcome}
          {/* Direction B: the lead story where Ready to build stood, which leaves Home. */}
          {feed ? (
            <LeadSlot lead={lead} now={props.now} face={lead?.friend ? faces.get(lead.friend.publicId) ?? null : null} />
          ) : (
            // At zero cards it ranks nothing and leaves on its own (S12: absent, not empty).
            props.ready && <ReadyToBuild ready={props.ready} inUse={props.inUse} />
          )}
          {/* Sliced here rather than inside the section, so the section draws
              what it is handed and the ordering stays testable without a DOM.
              `decks.length` rides alongside as the footer's total — the figure
              the deleted `Your decks · 17` heading used to carry. */}
          {/* At zero decks the resume slot holds the ways in instead (first-run R2): the
              same pair as `/decks`, through one shared component. */}
          <div className="order-2 flex min-w-0 flex-col min-[1180px]:order-none">
            {noDecks ? (
              <HomeDecksZero helpMeChoose={props.helpMeChoose} />
            ) : (
              <ResumeDecks
                decks={resumeDecks(props.decks)}
                shopping={props.shopping}
                total={props.decks.length}
                now={new Date(props.now)}
              />
            )}
          </div>
          {/* Direction B: What's new under the resume block, before Friends and Commitments on a phone. */}
          {feed && <WhatsNew feed={feed} now={props.now} faces={faces} className="order-3 min-[1180px]:order-none" />}
        </div>

        {/* The column exists only when a card in it does. Null when the availability
            read failed — three zeroes after a failed query is a lie, so the card
            leaves rather than guessing — and an empty column reserving 316px
            would leave a blank rail squeezing the resume rows beside it for a
            block that is not there. */}
        {/* It renders when Commitments or Friends does (G7): with Commitments absent, Friends tops the column. */}
        {(props.commitments !== null || props.friends) && (
          <div className="contents min-[1180px]:flex min-[1180px]:w-[316px] min-[1180px]:flex-none min-[1180px]:flex-col min-[1180px]:gap-[11px]">
            {props.commitments !== null && (
              <div className={`${feed ? "order-5" : "order-3"} flex flex-col min-[1180px]:order-none`}>
                <CommitmentsCard
                  commitments={props.commitments}
                  shopping={props.shopping}
                  totalCards={props.stats.totalCards}
                />
              </div>
            )}
            {props.friends ? (
              <FriendsSection
                {...props.friends}
                now={props.now}
                className={`${feed ? "order-4" : "order-1"} mt-[6px] min-[1180px]:order-none ${props.commitments ? "min-[1180px]:mt-[4px]" : "min-[1180px]:mt-0"}`}
              />
            ) : null}
          </div>
        )}
      </div>
            </HeldLeadProvider>
      </TradeAskFrame>
      </Frame>
    </div>
  );
}
