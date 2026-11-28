"use client";
// The head of a friend's Spares tab (handoff `design_handoff_the99_friend_trades`, Spares S0/S0w/S9): the trades with
// this friend, in the Trades rows' form, inside a deck box. Several may be open with one friend; one unanswered offer of
// the reader's at a time (Q10), so while one waits the foot says so and Propose another trade is held. The Wanted
// call-out, its filter and key under the box are PR 6's.
import { DeckBox, DeckBoxBand, DeckBoxFoot } from "../decks/deck-box";
import { GhostButton, ACTION_SIZE } from "../ui/button";
import { PersonText, type ThirdPartyName } from "../../lib/person-name";
import { tradeCopy as t } from "../../lib/copy/trades";
import type { TradeListRow } from "../../lib/social/trade-reads";
import { TradeRows } from "./trade-rows";

export function TradesHead({ friend, rows, held, now, timeZone, onOpen, onPropose }: {
  friend: ThirdPartyName;
  rows: readonly TradeListRow[];
  /** Q10: an offer of the reader's to this friend is unanswered, so another waits. */
  held: boolean;
  now: Date;
  timeZone?: string;
  onOpen: (id: string, from: HTMLElement) => void;
  onPropose: (from: HTMLElement) => void;
}) {
  if (rows.length === 0) return null;
  const live = rows.filter((r) => r.status === "open" || r.status === "accepted").length;
  return (
    <DeckBox className="!mt-[18px] md:!mt-[22px]" data-testid="trades-head">
      <DeckBoxBand
        title={<PersonText text={t.liveTitle(friend)} />}
        aside={live > 0 ? <span className="font-mono text-[11px] font-normal text-[color:var(--fg-muted)]">{t.openCount(live)}</span> : undefined}
      />
      <TradeRows rows={rows} now={now} timeZone={timeZone} onOpen={onOpen} />
      <DeckBoxFoot>
        <div className="flex flex-col gap-[8px] md:flex-row md:items-center md:justify-end md:gap-[14px]">
          {held ? <span data-testid="trades-cap" className="text-[12px] leading-[1.45] text-[color:var(--fg-muted)] md:order-first md:mr-auto">{t.capLine}</span> : null}
          <GhostButton
            data-testid="trades-propose"
            disabled={held}
            aria-haspopup="dialog"
            onClick={(e) => onPropose(e.currentTarget)}
            className={`${ACTION_SIZE} flex-none self-start font-medium md:self-auto ${held ? "opacity-45" : ""}`}
          >
            {t.proposeAnother}
          </GhostButton>
        </div>
      </DeckBoxFoot>
    </DeckBox>
  );
}
