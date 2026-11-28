"use client";
// The trade box (handoff `design_handoff_the99_friend_trades`, Propose S2/S3, Answer S5/T5/S8/S7, Waiting T6/S6/T8/T8b/T9,
// MakeTrade A3; STATES.md, the sheet table): the band names the state, the two sides each draw their cards, their own
// total and `N cards`, the store's provenance once under them, then the foot's presses for the state. Built from shipped
// parts only: `DeckBox` with the To buy box's cells (a mono label, the 17px figure, the mono notes), the Spares tab's
// tile shape, and Yes and No as `AnswerPresses` with Counter after No. Totals are each side's own figure at the reader's
// store, never a comparison. Presentational: `TradeSheet` owns the reads and the presses.
import type { ReactNode } from "react";
import { DeckBox, DeckBoxBand, DeckBoxFoot } from "../decks/deck-box";
import { GhostButton, PrimaryButton, ACTION_SIZE } from "../ui/button";
import { HydratedImg } from "../ui/hydrated-art";
import { CopyLines } from "../copy-lines";
import { PersonText, type ThirdPartyName } from "../../lib/person-name";
import { formatCents } from "../../lib/decks/price";
import { priceCopy } from "../../lib/copy/price";
import { storeCopy } from "../../lib/copy/store";
import { STORE_INFO } from "../../lib/stores/info";
import { tradeCopy as t } from "../../lib/copy/trades";
import type { SheetState, TradeStatus } from "../../lib/social/trade-rules";
import type { TradeCard, TradePrices } from "../../lib/social/trade-reads";
import { AnswerPresses, type Answer } from "./spare-answer";

/** A card as the box draws it: its counter mark, whether it stopped being spare, and Make it a trade's agreed card. */
export type BoxCard = TradeCard & {
  /** In a counter, against the offer it replaces: new to the side (ringed), or taken out (faded, still drawn). */
  change?: "added" | "removed";
  /** No longer spare (the danger ⊘ badge). */
  gone?: boolean;
  /** Make it a trade: the card the reader already said yes to. */
  agreed?: boolean;
};

/** The sheet's states (`sheetState`), and the three a press opens while the reader composes. */
export type BoxState = SheetState | "draft" | "askBack" | "counterDraft" | "revise";
/** `revise`: Counter on the reader's own offer while a card on it needs a look (lookYours), changing it in place. */
export const COMPOSING: ReadonlySet<BoxState> = new Set(["draft", "askBack", "counterDraft", "revise"]);

/** Which press is in flight, so it alone reads busy and every other press holds. */
export type BoxBusy = "send" | "yes" | "no" | "withdraw" | "rescind" | "mark" | null;

export type TradeBoxProps = {
  friend: ThirdPartyName;
  state: BoxState;
  /** An ended trade's status, for its band. */
  status?: TradeStatus;
  fromThem: readonly BoxCard[];
  fromYou: readonly BoxCard[];
  prices: TradePrices;
  daysLeft: number;
  /** A counter's totals in the offer it replaces (null where that side had no priced card), and that offer's day. */
  was?: { them: number | null; you: number | null; day: string } | null;
  tradedDay?: string;
  busy: BoxBusy;
  onSend?: () => void;
  onKeepTheirs?: () => void;
  onAnswer?: (a: Answer, from: Element) => void;
  onCounter?: () => void;
  onWithdraw?: () => void;
  onRescind?: () => void;
  onMark?: () => void;
  onNewTrade?: () => void;
};

const LABEL = "font-mono text-[10px] font-medium uppercase tracking-[.12em] text-[color:var(--fg-faint)]";
const NOTE = "m-0 font-mono text-[11px] leading-[1.5]";
const CELL = "flex min-w-0 flex-col gap-[8px] px-[14px] py-[14px] md:px-[16px] [border-left:1px_solid_var(--border)] first:[border-left:0]";
const TILE = "relative block w-full overflow-hidden [aspect-ratio:63/88] [border-radius:4.5%/3.2%] [border:1px_solid_var(--border)] bg-[color:var(--surface-sunken)]";
const RING = "outline-solid outline-2 outline-offset-[3px] outline-[color:var(--accent)]";
const LINE = "m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]";
const LINK = "inline-flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent p-0 font-sans text-[13px] font-medium md:min-h-[36px]";
const PRESS_ROW = "flex flex-wrap items-center gap-x-[14px] gap-y-[6px]";

/** A card's name in a sentence: the front face's. */
export const shortName = (name: string) => name.split(" // ")[0].split(",")[0];

/** A side's figures: the cards still on it, how many have a price, and their sum. */
export function sideSum(cards: readonly TradeCard[], cents: TradePrices["cents"]) {
  const priced = cards.map((c) => cents[c.oracleId] ?? null).filter((c): c is number => c !== null);
  return { n: cards.length, priced: priced.length, cents: priced.reduce((s, c) => s + c, 0) };
}

function Card({ card }: { card: BoxCard }) {
  const out = card.change === "removed" || card.gone;
  // A gone card is marked on the card (faded, the ⊘ badge), not by a caption under it.
  const note = card.gone ? null : card.change === "added" ? t.added : card.change === "removed" ? t.removed : card.agreed ? t.agreed : null;
  const ink = card.change === "added" ? "text-[color:var(--accent-text)]" : card.agreed ? "text-[color:var(--success)]" : "text-[color:var(--fg-faint)]";
  const aria = [card.name, card.gone ? t.gone : note].filter(Boolean).join(", ");
  return (
    <li data-testid="trade-card" data-change={card.change} data-gone={card.gone ? "" : undefined} className="flex w-[64px] min-w-0 flex-col gap-[5px] md:w-[78px]">
      <span className="relative block">
        <span role="img" aria-label={aria} className={`${TILE} ${card.change === "added" ? RING : ""} ${out ? "opacity-45" : ""}`}>
          {card.imageUri ? <HydratedImg eager src={card.imageUri} alt="" className="absolute inset-0 block h-full w-full object-cover" /> : (
            <span aria-hidden className="absolute inset-0 flex items-center justify-center p-[6px] text-center text-[10px] font-semibold leading-[1.25] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">{card.name}</span>
          )}
        </span>
        {card.gone ? (
          <span aria-hidden className="absolute right-[-6px] top-[-6px] grid h-[22px] w-[22px] place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--danger)_16%,var(--bg))] text-[color:var(--danger)] [border:1px_solid_color-mix(in_srgb,var(--danger)_45%,transparent)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M6 18 18 6" /></svg>
          </span>
        ) : null}
      </span>
      {note ? <span aria-hidden className={`font-mono text-[9.5px] uppercase leading-[1.3] tracking-[.08em] ${ink}`}>{note}</span> : null}
    </li>
  );
}

function Side({ testid, label, cards, empty, was, cents }: {
  testid: string; label: ReactNode; cards: readonly BoxCard[]; empty: ReactNode; was: number | null | undefined; cents: TradePrices["cents"];
}) {
  // A taken-out card is drawn but no longer counts.
  const s = sideSum(cards.filter((c) => c.change !== "removed"), cents);
  return (
    <div data-testid={testid} className={CELL}>
      <span className={LABEL}>{label}</span>
      {cards.length ? (
        <ul className="m-0 flex list-none flex-wrap gap-[8px] p-0 md:gap-[10px]">{cards.map((c) => <Card key={`${c.oracleId}${c.change ?? ""}`} card={c} />)}</ul>
      ) : (
        // An empty side draws the card's own place, dashed, so the box keeps the filled side's height.
        <div className="flex flex-col gap-[8px]">
          <span aria-hidden className="flex w-[64px] items-center justify-center [aspect-ratio:63/88] [border-radius:4.5%/3.2%] [border:1.5px_dashed_var(--border-dashed)] bg-[color:color-mix(in_oklab,var(--accent)_4%,transparent)] md:w-[78px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fg-faint)" strokeWidth="1.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <p className={LINE}>{empty}</p>
        </div>
      )}
      {s.n > 0 ? (
        <div className="mt-[2px] flex flex-col gap-[3px]">
          <span className="flex items-baseline gap-[8px]">
            <span data-testid="trade-total" className="text-[17px] font-semibold tabular-nums text-[color:var(--fg)]">{s.priced ? formatCents(s.cents) : priceCopy.strip.box.unpriced}</span>
            <span className={`${NOTE} text-[color:var(--fg-faint)]`}>{t.cards(s.n)}</span>
          </span>
          {s.priced > 0 && s.priced < s.n ? <span className={`${NOTE} text-[color:var(--fg-faint)]`}>{priceCopy.strip.pricedClause(s.priced, s.n)}</span> : null}
          {was != null ? <span data-testid="trade-was" className={`${NOTE} text-[color:var(--fg-muted)]`}>{t.was(formatCents(was))}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/** The store line, once under both sides: the store, the market note beside a figure, when it was read, and behind. */
function provenance(prices: TradePrices, anyPriced: boolean): string[] | null {
  if (!prices.dated) return null;
  const info = STORE_INFO[prices.store];
  return [
    anyPriced ? storeCopy.provenance(info) : storeCopy.provenanceUnpriced(info),
    ...(anyPriced && info.figure === "market" ? [storeCopy.marketNote] : []),
    priceCopy.strip.lastChecked(prices.dated.when),
    ...(prices.dated.behind ? [priceCopy.strip.behind] : []),
  ];
}

function band(state: BoxState, status: TradeStatus | undefined, friend: ThirdPartyName) {
  switch (state) {
    case "draft": return t.band.draft(friend);
    case "askBack": return t.band.askBack(friend);
    case "theirs": return t.band.theirs(friend);
    case "yours": case "revise": return t.band.yours;
    case "counterDraft": return t.band.counterDraft;
    case "theirCounter": return t.band.theirCounter(friend);
    case "accepted": case "themMarked": case "youMarked": return t.band.accepted;
    case "traded": return t.band.traded;
    case "look": case "lookYours": return t.band.look;
    // An ended trade's band is the Trades row's kicker for its end (no band of its own on the boards).
    case "ended": return status === "declined" ? t.row.kind.declined : status === "expired" ? t.row.kind.expired : t.row.kind.withdrawn;
  }
}

export function TradeBox(props: TradeBoxProps) {
  const { friend, state, fromThem, fromYou, prices, daysLeft, was, busy } = props;
  const liveThem = fromThem.filter((c) => c.change !== "removed");
  const liveYou = fromYou.filter((c) => c.change !== "removed");
  const both = liveThem.length > 0 && liveYou.length > 0;
  const held = busy !== null;
  // The band's end says the days only where nothing below says them: Yes and No carry them, as every ask does.
  const aside = state === "yours" ? t.daysLeft(daysLeft) : null;
  const goneCard = [...fromThem, ...fromYou].find((c) => c.gone);
  const agreed = fromYou.find((c) => c.agreed);
  const counterPress = (
    <button type="button" data-testid="trade-counter" disabled={held} onClick={props.onCounter} {...{ "aria-label": undefined }}
      className="inline-flex h-[36px] flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-[8px] bg-transparent px-[16px] font-sans text-[13px] font-medium text-[color:var(--accent-text)] [border:1px_solid_color-mix(in_oklab,var(--accent)_55%,transparent)] disabled:cursor-default">
      {t.counter}
    </button>
  );
  const answer = (yesWaits: boolean) => (
    <AnswerPresses friend={friend} card="" daysLeft={daysLeft} busy={busy === "yes" || busy === "no" ? busy : null} locked={held}
      onAnswer={(a, from) => props.onAnswer?.(a, from)} size="row" roomy extra={counterPress} yesWaits={yesWaits}
      labels={{ yes: t.yesAria(friend), no: t.noAria(friend) }} />
  );
  let foot: ReactNode = null;
  switch (state) {
    case "draft":
    case "askBack":
    case "counterDraft":
    case "revise": {
      // No dead press: Send appears once each side has a card; until then the line says what it waits on.
      const line = !both ? t.needsBoth(friend)
        : state === "askBack" ? t.askBackFoot(friend, shortName(agreed?.name ?? liveYou[0]?.name ?? ""))
        : state === "counterDraft" ? t.counterFoot(friend)
        : t.answerBy(friend, daysLeft);
      foot = (
        <div className={PRESS_ROW}>
          {both ? (
            <PrimaryButton data-testid="trade-send" disabled={held} aria-busy={busy === "send" || undefined} onClick={props.onSend} className={`${ACTION_SIZE} font-medium`}>
              {state === "counterDraft" ? t.sendCounter : state === "askBack" ? t.sendAskBack : t.send}
            </PrimaryButton>
          ) : null}
          {state === "counterDraft" ? (
            <button type="button" data-testid="trade-keep" disabled={held} onClick={props.onKeepTheirs} className={`${LINK} text-[color:var(--fg-muted)]`}>{t.keepTheirs}</button>
          ) : null}
          <p data-testid="trade-foot-line" className={LINE}><PersonText text={line} /></p>
        </div>
      );
      break;
    }
    case "theirs":
    case "theirCounter":
      foot = (
        <div className={PRESS_ROW}>
          {answer(false)}
          {state === "theirCounter" && was ? <p data-testid="trade-replaces" className={`${LINE} basis-full`}>{t.replacesYours(was.day)}</p> : null}
        </div>
      );
      break;
    case "yours":
      foot = (
        <div className={PRESS_ROW}>
          <GhostButton data-testid="trade-withdraw" disabled={held} aria-busy={busy === "withdraw" || undefined} onClick={props.onWithdraw} className={`${ACTION_SIZE} font-medium`}>{t.withdraw}</GhostButton>
          <p className={LINE}><PersonText text={t.waiting(friend)} /></p>
        </div>
      );
      break;
    case "accepted":
    case "themMarked":
      // Mark traded and Rescind trade side by side at every width; the line goes under them.
      foot = (
        <div className="flex flex-col gap-[8px]">
          <div className="flex flex-nowrap items-center gap-[10px]">
            <PrimaryButton data-testid="trade-mark" disabled={held} aria-busy={busy === "mark" || undefined} onClick={props.onMark} className={`${ACTION_SIZE} font-medium`}>{t.markTraded}</PrimaryButton>
            <GhostButton data-testid="trade-rescind" disabled={held} aria-busy={busy === "rescind" || undefined} onClick={props.onRescind} className={`${ACTION_SIZE} font-medium`}>{t.rescind}</GhostButton>
          </div>
          <p className={LINE}><PersonText text={state === "accepted" ? t.acceptedFoot : t.themMarked(friend)} /></p>
        </div>
      );
      break;
    case "youMarked":
      foot = <p className={`${LINE} py-[10px]`}><PersonText text={t.youMarked(friend)} /></p>;
      break;
    case "traded":
      foot = (
        <div className={PRESS_ROW}>
          <p className={`${LINE} py-[8px] !text-[color:var(--fg-body)]`}>{t.tradedFoot(props.tradedDay ?? "")}</p>
          {props.onNewTrade ? <button type="button" data-testid="trade-new" onClick={props.onNewTrade} className={`${LINK} text-[color:var(--accent-text)] md:ml-auto`}>{t.newTrade}</button> : null}
        </div>
      );
      break;
    case "look":
      // Their offer with a card gone: Yes is drawn but held; No and Counter in the same row.
      foot = (
        <div className="flex flex-col gap-[8px]">
          <p className={`${LINE} !text-[color:var(--fg-body)]`}><PersonText text={t.lookLine(shortName(goneCard?.name ?? ""), friend)} /></p>
          {answer(true)}
        </div>
      );
      break;
    case "lookYours":
      foot = (
        <div className="flex flex-col gap-[6px]">
          <p className={`${LINE} !text-[color:var(--fg-body)]`}>{t.lookLineYours(shortName(goneCard?.name ?? ""))}</p>
          <div className={PRESS_ROW}>
            <PrimaryButton data-testid="trade-counter" disabled={held} onClick={props.onCounter} className={`${ACTION_SIZE} font-medium`}>{t.counter}</PrimaryButton>
            <GhostButton data-testid="trade-withdraw" disabled={held} aria-busy={busy === "withdraw" || undefined} onClick={props.onWithdraw} className={`${ACTION_SIZE} font-medium`}>{t.withdraw}</GhostButton>
            <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{t.daysLeft(daysLeft)}</span>
          </div>
        </div>
      );
      break;
    case "ended":
      foot = <p className={`${LINE} py-[8px]`}>{t.row.nothingElse}</p>;
      break;
  }
  const anyPriced = [...liveThem, ...liveYou].some((c) => prices.cents[c.oracleId] != null);
  const store = liveThem.length + liveYou.length > 0 ? provenance(prices, anyPriced) : null;
  const received = state === "theirs" || state === "theirCounter";
  const wash = state === "traded" ? "bg-[color:color-mix(in_oklab,var(--success)_6%,var(--surface-inset))]" : "";
  return (
    <DeckBox className={`!mt-0 md:!mt-0 ${wash}`} data-testid="trade-box" data-trade-state={state}>
      <DeckBoxBand title={<PersonText text={band(state, props.status, friend)} />}
        aside={aside ? <span className="min-w-0 truncate font-mono text-[11px] font-normal text-[color:var(--fg-muted)]">{aside}</span> : undefined} />
      <div className="grid grid-cols-2">
        <Side testid="trade-side-them" label={<PersonText text={t.side.them(friend)} />} cards={fromThem} was={was?.them} cents={prices.cents} empty={<PersonText text={t.pickTheirs(friend)} />} />
        <Side testid="trade-side-you" label={t.side.you} cards={fromYou} was={was?.you} cents={prices.cents} empty={t.pickYours} />
      </div>
      {state === "askBack" && agreed ? (
        <p className="m-0 px-[14px] pb-[8px] text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] md:px-[16px]">
          <PersonText text={t.askBackWhy(friend, shortName(agreed.name))} />
        </p>
      ) : null}
      {store ? (
        // `--fg-faint`, not the board's `--fg-locked`: locked measures near 3.3:1 on the themes' grounds, and this line
        // names the store the totals are from, so it has to be read (the upgrade line's own call).
        <p data-testid="trade-store" className={`${NOTE} px-[14px] pb-[12px] text-[color:var(--fg-faint)] md:px-[16px]`}>
          <CopyLines lines={store} sep=" · " />
        </p>
      ) : null}
      {foot ? <DeckBoxFoot className={received ? "!py-[10px]" : ""}>{foot}</DeckBoxFoot> : null}
    </DeckBox>
  );
}
