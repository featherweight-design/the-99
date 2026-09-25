"use client";
// A commander change on the pending banner (handoff §4): its own line, first in the names density,
// and one sentence above the money line in the counts density. Drawn only when the draft's
// commander moved, which it never does with CHANGE_COMMANDER_ENABLED off.

import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import type { DraftState } from "../../lib/decks/draft-shape";
import { formatPriceFigure, priceState } from "../../lib/decks/price";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { changeCommanderCopy as copy } from "../../lib/copy/change-commander";
import { useChangeCommander } from "./change-commander-context";
import type { CommanderPair } from "../../lib/commander-change/pending";

const ids = (p: CommanderPair) => [p.commanderOracleId, p.partnerOracleId].filter((id): id is string => id !== null);

/** `{a} & {b}` for a pair, the name alone for a single, read off the draft's name map. */
function pairName(state: DraftState, pair: CommanderPair): string {
  const names = ids(pair).map((id) => state.names.get(id) ?? "");
  return names.length > 1 ? deckVersioningCopy.history.commanderPair(names[0], names[1]) : names[0];
}

/** The price tile for the new commander's halves to buy: one figure per half the feed prices. */
function buyFigures(state: DraftState): string[] {
  const rows = state.commanderRows;
  if (!rows) return [];
  return rows.rows
    .filter((r) => r.buy && r.price)
    .map((r) => formatPriceFigure(r.price!, priceState(r.price!, rows.newestAsOf)))
    .filter((f): f is string => f !== null);
}

/** The names density's commander line, first in the list. */
export function CommanderNameLine({ state, tileClass }: { state: DraftState; tileClass: string }) {
  const door = useChangeCommander();
  const ref = useRef<HTMLLIElement>(null);
  // After a change lands the page refreshes under the new commander; this line is where focus goes.
  useEffect(() => {
    if (door?.focusPending && ref.current) {
      ref.current.focus();
      door.focusTaken();
    }
  }, [door]);
  if (!state.commander) return null;
  const pair = state.commander.to.partnerOracleId !== null;
  return (
    <li ref={ref} tabIndex={-1} data-testid="banner-commander-line" data-commander-line="true" className="flex items-center gap-[9px] min-h-[34px] outline-none">
      <span aria-hidden="true" className="flex-none w-[13px] font-mono text-[12px] text-[color:var(--accent)]">⇄</span>
      <span className="flex-1 min-w-0 text-[13px] leading-[1.35] text-[color:var(--fg)]">
        {deckVersioningCopy.history.commanderChange(pairName(state, state.commander.from), pairName(state, state.commander.to))}
      </span>
      <span className="flex-none font-mono text-[10px] text-[color:var(--fg-locked)]">
        {pair ? copy.banner.hintPair : copy.banner.hint}
      </span>
      {buyFigures(state).map((f) => <span key={f} className={tileClass}>{f}</span>)}
    </li>
  );
}

/** The counts density's sentence, above the money line. */
export function CommanderSentence({ state, sentenceClass }: { state: DraftState; sentenceClass: string }) {
  if (!state.commander) return null;
  const from = ids(state.commander.from).map((id) => state.names.get(id) ?? "");
  const to = ids(state.commander.to).map((id) => state.names.get(id) ?? "");
  const short = (n: string) => n.split(" // ")[0].split(",")[0].trim();
  const text = to.length > 1
    ? copy.banner.replacesPair(short(to[0]), short(to[1]), short(from[0]), short(from[1]))
    : copy.banner.replaces(short(to[0]), short(from[0]));
  return (
    // The money sentence's type, on its own 6px foot (handoff §4): the money line sits directly under.
    <p data-testid="banner-commander-sentence" data-commander-line="true" className={twMerge(sentenceClass, "mb-[6px] md:mb-[6px]")}>
      <span aria-hidden="true" className="mr-[7px] font-mono text-[12px] text-[color:var(--accent)]">⇄</span>
      {text}
    </p>
  );
}

/**
 * The hint a traded card's line carries in place of its usual one: the old commander, added to the
 * 99, came `from the command zone`; the new one, cut from it, went `to the command zone`. Null for
 * every other line, and always with no commander move.
 */
export function commanderZoneHint(state: DraftState, oracleId: string, added: boolean): string | null {
  if (!state.commander) return null;
  if (added && ids(state.commander.from).includes(oracleId)) return copy.banner.fromZone;
  if (!added && ids(state.commander.to).includes(oracleId)) return copy.banner.toZone;
  return null;
}

/** Discard's extra clause when the draft moved its commander: the old one leads again. */
export function commanderBackClause(state: DraftState): string | null {
  if (!state.commander) return null;
  const old = ids(state.commander.from).map((id) => (state.names.get(id) ?? "").split(" // ")[0].split(",")[0].trim());
  // A pair takes the plural (audit F9): two names do not share "leads".
  return old.length > 1 ? copy.discard.commanderBackPair(old[0], old[1]) : copy.discard.commanderBack(old[0]);
}
