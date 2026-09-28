// Signed-in Home. The page authenticates and loads; this draws it.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md
// §HomeHeader. The mobile top bar the table draws above the kicker (mark +
// avatar) is the shell's, not this component's — see components/shell/nav.tsx.

import { GhostButton, PrimaryButton } from "@/components/ui/button";
import { refreshCopy } from "../../lib/copy/refresh";
import type { ReceiptCounts } from "../../lib/commanders/in-use";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";
import { formatWhen } from "../../lib/format/when";
import type { Commitments } from "../../lib/home/commitments";
import type { CommanderListItem } from "../../lib/recs/recommend";
import type { ReadySlice } from "../../lib/recs/ready-to-build";
import { CommitmentsCard } from "./commitments-card";
import { HomeDecksZero } from "./home-decks-zero";
import { ReadyToBuild } from "./ready-to-build";
import { ResumeDecks, resumeDecks } from "./resume-decks";

export type DashboardProps = {
  stats: { totalCards: number; uniqueCards: number };
  /** Null until a collection has been read — `formatWhen` names that state. */
  lastUpdated: Date | null;
  ready: ReadySlice<CommanderListItem>;
  /** Keyed by commander oracleId, and only for the commanders shown. */
  inUse: Map<string, ReceiptCounts>;
  decks: DeckListItem[];
  /** Null when the availability read failed. The card renders nothing, not a zero. */
  commitments: Commitments | null;
  shopping: ShoppingRollup;
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
  const cards = props.stats.totalCards.toLocaleString("en-US");
  const noDecks = props.decks.length === 0;
  const when = formatWhen(props.lastUpdated, new Date(props.now));

  return (
    <div className="flex min-h-0 min-w-0 flex-auto flex-col bg-[color:var(--bg)] font-sans text-[color:var(--fg)]">
      <header className="flex flex-col sm:flex-row sm:items-end sm:gap-[16px] sm:p-[22px_26px_0]">
        <div className="min-w-0 px-[16px] pt-[14px] pb-0 sm:flex-auto sm:p-0">
          {/* Kicker above the greeting: the greeting is a hello, and the claim
              the page is actually making is the collection's size and age. */}
          <p className="m-0 mb-[6px] font-mono text-[10px] tracking-[0.16em] text-[color:var(--fg-faint)] uppercase sm:mb-[7px] sm:tracking-[0.18em]">
            {refreshCopy.home.kicker(cards, when)}
          </p>
          <h1 className="m-0 font-display text-[23px] leading-[1.15] font-bold text-[color:var(--fg)] sm:text-[28px] sm:leading-[1]">
            {refreshCopy.home.greeting}
          </h1>
        </div>

        {/* `contents` at sm rather than a second copy of the pair: the desktop
            header is one flex row and these two are its last members, while the
            phone gets its own full-width row at the 44px touch floor. Reversed
            there so New deck leads, which is the order the Decks header uses.
            The 390px frame draws neither button; dropping them would cost a
            phone reader both of the page's actions (table §Ambiguities 1). */}
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
      </header>

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
      <div className="flex min-h-0 flex-auto flex-col gap-[12px] px-[16px] pt-[14px] pb-[16px] min-[1180px]:flex-row min-[1180px]:gap-[20px] min-[1180px]:p-[20px_26px_26px]">
        <div className="flex min-w-0 flex-col gap-[12px] min-[1180px]:flex-auto min-[1180px]:gap-[11px]">
          <ReadyToBuild ready={props.ready} inUse={props.inUse} />
          {/* Sliced here rather than inside the section, so the section draws
              what it is handed and the ordering stays testable without a DOM.
              `decks.length` rides alongside as the footer's total — the figure
              the deleted `Your decks · 17` heading used to carry. */}
          {/* At zero decks the resume slot holds the ways in instead (first-run R2): the
              same pair as `/decks`, through one shared component. */}
          {noDecks ? (
            <HomeDecksZero />
          ) : (
            <ResumeDecks
              decks={resumeDecks(props.decks)}
              shopping={props.shopping}
              total={props.decks.length}
              now={new Date(props.now)}
            />
          )}
        </div>

        {/* The column exists only when the card does. Null when the availability
            read failed — three zeroes after a failed query is a lie, so the card
            leaves rather than guessing — and an empty column reserving 316px
            would leave a blank rail squeezing the resume rows beside it for a
            block that is not there. */}
        {props.commitments !== null && (
          <div className="flex flex-col gap-[12px] min-[1180px]:w-[316px] min-[1180px]:flex-none min-[1180px]:gap-[11px]">
            <CommitmentsCard
              commitments={props.commitments}
              shopping={props.shopping}
              totalCards={props.stats.totalCards}
            />
          </div>
        )}
      </div>
    </div>
  );
}
