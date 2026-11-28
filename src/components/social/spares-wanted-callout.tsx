"use client";
// Friend trades (handoff `design_handoff_the99_friend_trades`, board Spares S0 and S4): the Spares tab's Wanted call-out,
// both directions in the deck page's to-do rows, then the `All / You want` switch and its key line. Row A (bookmark,
// accent): the friend's spares the reader wants. Row B (two people, fact ink): the reader's spares on the friend's
// wishlist, with the Trade press. Neither: one row that invites a trade. The Trade press opens a blank new trade, and is
// not drawn while a trade with this friend is live (S4) or the reader's offer waits unanswered (Q10, S9).
//
// The switch IS the address's `?wanted=wishlist,deck`: You want is both wanted values on, and any other Wanted choice
// (the Filters panel's: one reason alone) chooses neither segment. Pressing it writes the address through the tab's own `update`.

import { haveItCopy } from "../../lib/copy/social";
import { tradeCopy } from "../../lib/copy/trades";
import { PersonText } from "../../lib/person-name";
import { SPARE_WANTED, sortSpares, type SpareBrowseLine, type SpareWanted } from "../../lib/social/spare-browse";
import type { FriendSpareLine } from "../../lib/social/spares";
import { TodoRow } from "../decks/todo-card";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { SpareGlyph, WishGlyph } from "./spare-key-item";
import { useOpenTrade, type TabTrades } from "./trades-on-tab";

const c = tradeCopy.callout;
const names = haveItCopy.callout.names;

type Want = "all" | "want";

/** True when the Wanted filter is exactly the switch's You want (both reasons on). */
export const isYouWant = (wanted: readonly SpareWanted[]) => SPARE_WANTED.every((w) => wanted.includes(w));
export const wantsIt = (l: SpareBrowseLine) => l.onWishlist || l.deckNeed > 0;

export function SparesWantedCallout({ all, yours, trades, wanted, onWanted }: {
  /** Every spare the friend offers, joined to the reader's deck need. */
  all: readonly SpareBrowseLine[];
  /** The reader's own spares as this friend sees them; `onWishlist` is the FRIEND's wishlist. */
  yours: readonly FriendSpareLine[];
  trades: TabTrades;
  wanted: readonly SpareWanted[];
  onWanted: (next: SpareWanted[]) => void;
}) {
  const open = useOpenTrade();
  const friend = trades.friend.displayName;
  const youWant = sortSpares(all.filter(wantsIt), "wanted");
  const theyWant = yours.filter((l) => l.onWishlist);
  const live = trades.rows.some((r) => r.status === "open" || r.status === "accepted");
  const press = open && !live && !trades.held
    ? { label: tradeCopy.sheet.press, name: tradeCopy.sheet.press, onPress: () => open({ kind: "new" }) }
    : undefined;
  // A Wanted choice from the Filters panel that is neither (one reason alone) chooses no segment, so All never reads
  // as chosen over a filtered grid.
  const value: Want | null = isYouWant(wanted) ? "want" : wanted.length === 0 ? "all" : null;
  return (
    <div data-testid="wanted-callout" className="mt-[14px] flex flex-col gap-[10px]">
      <div className="overflow-hidden rounded-[10px] bg-[color:var(--surface-rail)] [border:1px_solid_var(--border)]">
        <p className="m-0 px-[14px] pb-[2px] pt-[9px] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)] md:px-[16px]">
          {c.eyebrow}
        </p>
        {youWant.length > 0 && (
          <TodoRow
            tone="action"
            next={false}
            mark={<WishGlyph size={16} />}
            title={<PersonText text={c.youWantTitle(friend, youWant.length)} />}
            body={c.youWantBody(names(youWant.map((l) => l.name)))}
          />
        )}
        {theyWant.length > 0 && (
          <TodoRow
            tone="action"
            markTone="fact"
            next={false}
            mark={<SpareGlyph size={16} />}
            title={<PersonText text={c.theyWantTitle(friend, theyWant.length)} />}
            body={c.theyWantBody(names(theyWant.map((l) => l.name)))}
            press={press}
          />
        )}
        {youWant.length === 0 && theyWant.length === 0 && (
          <TodoRow tone="action" markTone="fact" next={false} mark={<SpareGlyph size={16} />} title={c.noneTitle} body={c.noneBody} press={press} />
        )}
      </div>
      {youWant.length > 0 && (
        <div className="flex flex-col items-start gap-[10px]">
          <SegmentedSwitch<Want>
            kind="radio"
            size="compact"
            ariaLabel={c.filterAria}
            value={value}
            onChange={(v) => onWanted(v === "want" ? [...SPARE_WANTED] : [])}
            segments={[
              { value: "all", label: c.filterAll, count: all.length },
              { value: "want", label: c.filterWant, count: youWant.length },
            ]}
          />
          <ul data-testid="wanted-key" className="m-0 flex list-none flex-wrap items-center gap-x-[14px] gap-y-[4px] p-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">
            <li className="inline-flex items-center gap-[6px] [&>svg]:text-[color:var(--accent)]"><WishGlyph size={12} />{c.keyWish}</li>
            <li className="inline-flex items-center gap-[6px]"><DeckDot />{c.keyDeck}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** The shopping list's "missing" mark: a dashed circle, a deck of the reader's still needs the card. */
export function DeckDot({ size = 8 }: { size?: number }) {
  return <i aria-hidden style={{ width: size, height: size }} className="block shrink-0 rounded-full border border-dashed border-current" />;
}
