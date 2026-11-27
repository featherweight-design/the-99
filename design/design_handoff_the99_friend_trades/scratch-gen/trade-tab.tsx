"use client";
// Friend trades R1 (proposal; brief 2026-11-27-friend-trades.md): a friend page's Trade tab, the fourth in the strip
// (`FriendStrip`). One live trade per friend at a time, so the tab IS that trade: composed when there is none, else the
// trade in its state. Built from shipped parts only:
// - the box is `DeckBox` with the To buy box's cells (`price-strip.tsx`): a mono label, the 17px figure, the mono notes;
// - card pictures are the Spares tab's tiles (63/88, `TILE_BOX`), each opening card details;
// - Yes and No are `AnswerPresses` (`spare-answer.tsx`), with the days left beside them, as every ask answers;
// - the picker's band is the Requests box's `SegmentedSwitch` band; its body is the Spares tab's chassis and grid.
// Totals are each side's own figure at the price the app already draws (`summarisePrices`), never a comparison.
import type { ReactNode } from "react";
import { DeckBox, DeckBoxBand, DeckBoxFoot } from "../decks/deck-box";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { GhostButton, PrimaryButton, ACTION_SIZE } from "../ui/button";
import { HydratedImg } from "../ui/hydrated-art";
import { PersonText, type ThirdPartyName } from "../../lib/person-name";
import { formatCents } from "../../lib/decks/price";
import { priceCopy } from "../../lib/copy/price";
import { socialCopy } from "../../lib/copy/social";
import { tradeCopy as t } from "../../lib/copy/trades";
import { AnswerPresses } from "./spare-answer";
import { PanelEmpty } from "./section-panel";
import { SparesChassis } from "./spares-chassis";
import { NO_SPARE_FILTERS, type SpareBrowseLine } from "../../lib/social/spare-browse";

export type TradeCard = {
  oracleId: string; name: string; imageUri: string | null; spare: number; cents: number | null;
  /** In a counter, against the offer it replaces. */
  change?: "added" | "removed";
  /** Stopped being spare since it was put in (D6). */
  gone?: boolean;
  /** Ask back: the card the reader already said yes to. */
  agreed?: boolean;
};

export type TradeState =
  | "draft" | "askBack" | "theirs" | "yours" | "counterDraft" | "theirCounter"
  | "accepted" | "themMarked" | "youMarked" | "traded" | "look" | "lookYours";

export type TradeTabProps = {
  friend: string | ThirdPartyName;
  state: TradeState;
  fromThem: TradeCard[];
  fromYou: TradeCard[];
  daysLeft: number;
  /** A counter's totals in the offer it replaces, and that offer's day. */
  was?: { them: number; you: number; day: string };
  /** The picker, open on this side, with these spares; null hides it. */
  picker?: { side: "them" | "you"; theirs: SpareBrowseLine[]; yours: SpareBrowseLine[]; picked: Set<string> } | null;
  tradedDay?: string;
};

const LABEL = "font-mono text-[10px] font-medium uppercase tracking-[.12em]";
const NOTE = "m-0 font-mono text-[11px] leading-[1.5]";
const CELL = "flex min-w-0 flex-col gap-[8px] px-[14px] py-[14px] md:px-[16px] [border-left:1px_solid_var(--border)] first:[border-left:0]";
const TILE_BOX = "relative block w-full cursor-pointer overflow-hidden p-0 [aspect-ratio:63/88] [border-radius:4.5%/3.2%] [border:1px_solid_var(--border)] bg-[color:var(--surface-sunken)]";
const RING = "outline-solid outline-2 outline-offset-[3px] outline-[color:var(--accent)]";

function sum(cards: TradeCard[]) {
  const live = cards.filter((c) => c.change !== "removed");
  const priced = live.filter((c) => c.cents !== null);
  return { n: live.length, priced: priced.length, cents: priced.reduce((s, c) => s + (c.cents ?? 0), 0) };
}

/** One card in the box: the tile at card shape, its caption when the trade marks it. Opens card details. */
function BoxCard({ card }: { card: TradeCard }) {
  const out = card.change === "removed" || card.gone;
  const note = card.gone ? t.gone : card.change === "added" ? t.added : card.change === "removed" ? t.removed : card.agreed ? t.agreed : null;
  const ink = card.gone ? "text-[color:var(--warning)]" : card.change === "added" ? "text-[color:var(--accent-text)]" : card.agreed ? "text-[color:var(--success)]" : "text-[color:var(--fg-faint)]";
  return (
    <li className="flex w-[64px] min-w-0 flex-col gap-[5px] md:w-[78px]">
      <button type="button" aria-label={card.name} className={`${TILE_BOX} ${card.change === "added" ? RING : ""} ${out ? "opacity-45" : ""}`}>
        {card.imageUri ? <HydratedImg eager src={card.imageUri} alt="" className="absolute inset-0 block h-full w-full object-cover" /> : null}
      </button>
      {note ? <span className={`font-mono text-[9.5px] uppercase leading-[1.3] tracking-[.08em] ${ink}`}>{note}</span> : null}
    </li>
  );
}

function Side({ label, cards, empty, was }: { label: ReactNode; cards: TradeCard[]; empty: ReactNode; was?: number }) {
  const s = sum(cards);
  return (
    <div className={CELL}>
      <span className={LABEL} style={{ color: "var(--fg-faint)" }}>{label}</span>
      {cards.length ? (
        <ul className="m-0 flex list-none flex-wrap gap-[8px] p-0 md:gap-[10px]">{cards.map((c) => <BoxCard key={c.oracleId + (c.change ?? "")} card={c} />)}</ul>
      ) : (
        <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{empty}</p>
      )}
      {s.n === 0 && !cards.length ? null : <div className="mt-[2px] flex flex-col gap-[3px]">
        <span className="flex items-baseline gap-[8px]">
          <span className="text-[17px] font-semibold" style={{ color: "var(--fg)" }}>{s.priced ? formatCents(s.cents) : s.n ? priceCopy.strip.box.unpriced : "—"}</span>
          <span className={NOTE} style={{ color: "var(--fg-faint)" }}>{t.cards(s.n)}</span>
        </span>
        {s.priced > 0 && s.priced < s.n ? <span className={NOTE} style={{ color: "var(--fg-faint)" }}>{priceCopy.strip.pricedClause(s.priced, s.n)}</span> : null}
        {was !== undefined ? <span className={NOTE} style={{ color: "var(--fg-muted)" }}>{t.was(formatCents(was))}</span> : null}
      </div>}
    </div>
  );
}

const LINK = "inline-flex min-h-[44px] items-center border-0 bg-transparent p-0 font-sans text-[13px] font-medium cursor-pointer md:min-h-[36px]";

export function TradeTab(props: TradeTabProps) {
  const { friend, state, fromThem, fromYou, daysLeft, was, picker } = props;
  const both = sum(fromThem).n > 0 && sum(fromYou).n > 0;
  const band =
    state === "draft" ? t.band.draft(friend)
    : state === "askBack" ? t.band.askBack(friend)
    : state === "theirs" ? t.band.theirs(friend)
    : state === "yours" ? t.band.yours
    : state === "counterDraft" ? t.band.counterDraft
    : state === "theirCounter" ? t.band.theirCounter(friend)
    : state === "accepted" || state === "themMarked" || state === "youMarked" ? t.band.accepted
    : state === "traded" ? t.band.traded
    : t.band.look;
  // The band's end says the days only where nothing below says them: Yes and No carry them, as every ask does.
  const aside = state === "yours" ? t.daysLeft(daysLeft) : null;
  const lookCard = [...fromThem, ...fromYou].find((c) => c.gone);
  const pressRow = "flex flex-wrap items-center gap-x-[14px] gap-y-[6px]";
  let foot: ReactNode = null;
  switch (state) {
    case "draft":
    case "askBack":
    case "counterDraft":
      foot = (
        <div className={pressRow}>
          {/* No dead press (Hugh 2026-11-17): Send appears once each side has a card; until then the line says what it waits on. */}
          {both ? <PrimaryButton className={`${ACTION_SIZE} font-medium`}>{state === "counterDraft" ? t.sendCounter : state === "askBack" ? t.sendAskBack : t.send}</PrimaryButton> : null}
          {state === "counterDraft" ? <button type="button" className={`${LINK} text-[color:var(--fg-muted)]`}>{t.cancelCounter}</button> : null}
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">
            <PersonText text={!both ? t.needsBoth(friend) : state === "askBack" ? t.askBackFoot(friend, fromYou[0]?.name.split(",")[0] ?? "") : state === "counterDraft" ? t.counterFoot(friend) : t.answerBy(friend, 14)} />
          </p>
        </div>
      );
      break;
    case "theirs":
    case "theirCounter":
      foot = (
        <div className={pressRow}>
          <AnswerPresses friend={friend} card="" daysLeft={daysLeft} busy={null} locked={false} onAnswer={() => {}} size="row" />
          <button type="button" className={`${LINK} text-[color:var(--accent-text)]`}>{t.counter}</button>
          {state === "theirCounter" && was ? <p className="m-0 basis-full text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{t.replacesYours(was.day)}.</p> : null}
        </div>
      );
      break;
    case "yours":
      foot = (
        <div className={pressRow}>
          <GhostButton className={`${ACTION_SIZE} font-medium`}>{t.withdraw}</GhostButton>
          <p className="m-0 text-[12.5px] text-[color:var(--fg-muted)]"><PersonText text={t.waiting(friend)} /></p>
        </div>
      );
      break;
    case "accepted":
    case "themMarked":
      foot = (
        <div className={pressRow}>
          <PrimaryButton className={`${ACTION_SIZE} font-medium`}>{t.markTraded}</PrimaryButton>
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]"><PersonText text={state === "accepted" ? t.acceptedFoot : t.themMarked(friend)} /></p>
          <button type="button" className={`${LINK} ml-auto text-[color:var(--fg-muted)]`}>{t.callOff}</button>
        </div>
      );
      break;
    case "youMarked":
      foot = <p className="m-0 py-[10px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]"><PersonText text={t.youMarked(friend)} /></p>;
      break;
    case "traded":
      foot = (
        <div className={pressRow}>
          <p className="m-0 py-[8px] text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{t.tradedFoot(props.tradedDay ?? "")}</p>
          <button type="button" className={`${LINK} md:ml-auto text-[color:var(--accent-text)]`}>{t.newTrade}</button>
        </div>
      );
      break;
    case "look":
    case "lookYours":
      foot = (
        <div className="flex flex-col gap-[6px]">
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">
            <PersonText text={state === "look" ? t.lookLine(lookCard?.name.split(",")[0] ?? "", friend) : t.lookLineYours(lookCard?.name.split(",")[0] ?? "")} />
          </p>
          <div className={pressRow}>
            <PrimaryButton className={`${ACTION_SIZE} font-medium`}>{t.counter}</PrimaryButton>
            <GhostButton className={`${ACTION_SIZE} font-medium`}>{t.withdraw}</GhostButton>
            <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{t.daysLeft(daysLeft)}</span>
          </div>
        </div>
      );
      break;
  }
  const received = state === "theirs" || state === "theirCounter";
  const wash = state === "traded" ? "bg-[color:color-mix(in_oklab,var(--success)_6%,var(--surface-inset))]" : "";
  return (
    <div className="mt-[18px] md:mt-[22px]">
      <DeckBox className={`!mt-0 md:!mt-0 ${wash}`} data-trade-state={state}>
        <DeckBoxBand title={<PersonText text={band} />} aside={aside ? <span className="min-w-0 truncate font-mono text-[11px] font-normal text-[color:var(--fg-muted)]"><PersonText text={aside} /></span> : null} />
        <div className="grid grid-cols-2">
          <Side label={<PersonText text={t.side.them(friend)} />} cards={fromThem} was={was?.them} empty={<PersonText text={t.pickTheirs(friend)} />} />
          <Side label={t.side.you} cards={fromYou} was={was?.you} empty={t.pickYours} />
        </div>
        <p className={`${NOTE} px-[14px] pb-[12px] md:px-[16px]`} style={{ color: "var(--fg-locked)" }}>
          {priceCopy.strip.provenance} · {priceCopy.strip.lastChecked("Monday")}
        </p>
        {foot ? <DeckBoxFoot className={received ? "!py-[10px]" : ""}>{foot}</DeckBoxFoot> : null}
      </DeckBox>
      {picker ? <Picker friend={friend} picker={picker} /> : null}
    </div>
  );
}

function Picker({ friend, picker }: { friend: string | ThirdPartyName; picker: NonNullable<TradeTabProps["picker"]> }) {
  const lines = picker.side === "them" ? picker.theirs : picker.yours;
  const count = (n: number) => <span className="ml-[6px] font-mono text-[11px] text-[color:var(--fg-faint)]">{n}</span>;
  return (
    <DeckBox className="!mt-[14px] md:!mt-[18px]">
      <div className="flex bg-[color:var(--surface-rail)] p-[6px] [border-bottom:1px_solid_var(--border)]">
        <SegmentedSwitch kind="tabs" ariaLabel="Spares" size="compact" fill value={picker.side} onChange={() => {}}
          segments={[
            { value: "them", label: <PersonText text={t.pick.theirs(friend)} />, count: count(picker.theirs.length) },
            { value: "you", label: t.pick.yours, count: count(picker.yours.length) },
          ]} />
      </div>
      {lines.length === 0 ? (
        picker.side === "you"
          ? <PanelEmpty title={t.empty.yoursTitle} body={t.empty.yoursBody} action={<a className="mt-[6px] inline-flex min-h-[44px] items-center text-[13px] font-medium text-[color:var(--accent-text)] no-underline"><PersonText text={t.empty.yoursAction(friend)} />&nbsp;›</a>} />
          : <PanelEmpty title={(<PersonText text={t.empty.theirsTitle(friend)} />) as unknown as string} body={(<PersonText text={t.empty.theirsBody(friend)} />) as unknown as string} />
      ) : (
        <div className="px-[12px] pb-[16px] pt-[4px] md:px-[16px] md:pb-[20px]">
          <SparesChassis lines={lines} shown={lines.length} filters={NO_SPARE_FILTERS} onFilters={() => {}} sort="wanted" onSort={() => {}} />
          <ul className="m-0 mt-[14px] grid list-none grid-cols-2 gap-x-[8px] gap-y-[14px] p-0 md:grid-cols-4 md:gap-[20px] xl:grid-cols-6">
            {lines.map((line) => {
              const inTrade = picker.picked.has(line.oracleId);
              return (
                <li key={line.oracleId} className="flex min-w-0 flex-col gap-[6px]">
                  <button type="button" aria-label={line.name} className={`${TILE_BOX} ${inTrade ? RING : ""}`}>
                    {line.imageUri ? <HydratedImg eager src={line.imageUri} alt="" className="absolute inset-0 block h-full w-full object-cover" /> : null}
                  </button>
                  <span className="flex items-center justify-between gap-[6px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">
                    <span className="truncate">{socialCopy.friendPage.spares.count(line.spare)}</span>
                    <button type="button" aria-pressed={inTrade} aria-label={inTrade ? t.inAria(line.name) : t.addAria(line.name)}
                      className={`inline-flex h-[32px] flex-none cursor-pointer items-center gap-[5px] rounded-[7px] px-[10px] font-sans text-[12.5px] font-medium md:h-[28px] ${inTrade ? "bg-[color:color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)] [border:1px_solid_color-mix(in_oklab,var(--success)_40%,transparent)]" : "bg-transparent text-[color:var(--fg)] [border:1px_solid_var(--border-strong)]"}`}>
                      {inTrade ? <>✓ {t.inPress}</> : <>+ {t.addPress}</>}
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </DeckBox>
  );
}
