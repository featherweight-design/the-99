"use client";
// The trade sheet (handoff `design_handoff_the99_friend_trades`, STATES.md "The trade sheet" and "Picker"; boards S2 to
// S9, T5 to T9, D4): the one place a trade is made and read. The trade box (`TradeBox`) draws the state; while the reader
// composes (a draft, a counter, a revision of their own offer) the side switch and the spares to pick from follow it,
// three across, four from md. Send offer turns the body into its receipt. Every press goes through a trade action, then
// the sheet reloads the trade (`openTradeAction`) and the page refreshes; a refusal draws the shared toast and leaves
// the sheet as it was, reloading it when the trade moved underneath.
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalChrome } from "../decks/receipt-modal";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { GhostButton, PrimaryButton, ACTION_SIZE } from "../ui/button";
import { HydratedImg, useHydrated } from "../ui/hydrated-art";
import { PanelEmpty } from "./section-panel";
import { SpareGlyph } from "./spare-key-item";
import { useSpareToast, type Answer } from "./spare-answer";
import { PersonName, PersonText, type ThirdPartyName } from "../../lib/person-name";
import { TradePicture } from "./trade-rows";
import { tradeCopy as t } from "../../lib/copy/trades";
import { captureClientError } from "../../lib/sentry/capture-client";
import { tradeDay } from "../../lib/social/when";
import { TRADE_DAYS, TRADE_SIDE_MAX, roundDiff } from "../../lib/social/trade-rules";
import type { OfferedTo, TradeCard, TradePrices, TradeView } from "../../lib/social/trade-reads";
import type { FriendSpareLine } from "../../lib/social/spares";
import type { OtherSide } from "../../lib/social/spare-requests";
import {
  answerTradeAction, counterTradeAction, markTradedAction, openTradeAction, proposeTradeAction, rescindTradeAction,
  reviseTradeAction, withdrawTradeAction,
} from "../../app/friends/trade-actions";
import { COMPOSING, TradeBox, sideSum, type BoxBusy, type BoxCard, type BoxState } from "./trade-tab";

/** What the sheet opens on: a new trade (its first card from the friend, when a tile's Trade opened it), or a trade. */
export type TradeOpen = { kind: "new"; first?: string } | { kind: "trade"; id: string; view?: TradeView | null };

type Compose = { mode: "draft" | "counterDraft" | "revise"; theirs: string[]; yours: string[]; side: "them" | "you" };

const TILE_BOX = "relative block w-full overflow-hidden p-0 [aspect-ratio:63/88] [border-radius:4.5%/3.2%] [border:1px_solid_var(--border)] bg-[color:var(--surface-sunken)]";
const RING = "outline-solid outline-2 outline-offset-[3px] outline-[color:var(--accent)]";
const CHIP = "inline-flex h-[22px] min-w-0 items-center gap-[3px] rounded-[4px] px-[4px] font-sans text-[10.5px] min-[375px]:text-[11px] font-medium";
const MUTED = "text-[color:var(--fg-muted)] bg-[color-mix(in_oklab,var(--fg-muted)_12%,transparent)]";

export function TradeSheet({ friend, open, theirSpares, yourSpares, offered, prices, onClose, onOpen }: {
  friend: OtherSide;
  open: TradeOpen;
  theirSpares: readonly FriendSpareLine[];
  /** The reader's own spares as this friend sees them; `onWishlist` is the FRIEND's wishlist (`loadOwnSparesFor`). */
  yourSpares: readonly FriendSpareLine[];
  /** Q9: the reader's spares already in an open offer of theirs, by oracle id. */
  offered: Readonly<Record<string, readonly OfferedTo[]>>;
  /** Every spare's price at the reader's store, for the totals while composing. */
  prices: TradePrices;
  onClose: () => void;
  /** Open another trade with this friend in place (the receipt's Open the trade, an Offered popover's Open ›). */
  onOpen: (next: TradeOpen) => void;
}) {
  const router = useRouter();
  const toast = useSpareToast();
  const hydrated = useHydrated();
  const timeZone = hydrated ? undefined : "UTC";
  const name = friend.displayName;
  const tradeId = open.kind === "trade" ? open.id : null;
  const [view, setView] = useState<TradeView | null>(open.kind === "trade" ? open.view ?? null : null);
  const [loaded, setLoaded] = useState(open.kind === "new" || open.view != null);
  const [compose, setCompose] = useState<Compose | null>(
    open.kind === "new" ? { mode: "draft", theirs: open.first ? [open.first] : [], yours: [], side: open.first ? "you" : "them" } : null,
  );
  /** The receipt (D4): the new trade's id and both sides' first cards, kept from the press since the compose is gone. */
  const [sent, setSent] = useState<{ id: string; theirs: string | null; yours: string | null } | null>(null);
  const [busy, setBusy] = useState<BoxBusy>(null);

  // A trade opened without its view (a row press) reads it once; the sheet draws its pending state meanwhile.
  useEffect(() => {
    if (tradeId === null || loaded) return;
    let live = true;
    openTradeAction(tradeId).then((v) => { if (live) { setView(v); setLoaded(true); } }, (e) => {
      captureClientError("trades.open", e);
      if (live) { setLoaded(true); toast.fail(); }
    });
    return () => { live = false; };
  }, [tradeId, loaded, toast]);

  const cardsById = useMemo(() => {
    const m = new Map<string, TradeCard>();
    for (const l of [...theirSpares, ...yourSpares]) m.set(l.oracleId, { oracleId: l.oracleId, name: l.name, imageUri: l.imageUri });
    if (view) for (const c of [...view.cards.theirs, ...view.cards.yours, ...(view.cards.previous?.theirs ?? []), ...(view.cards.previous?.yours ?? [])]) m.set(c.oracleId, c);
    return m;
  }, [theirSpares, yourSpares, view]);
  const cents = useMemo(() => ({ ...prices.cents, ...(view?.prices.cents ?? {}) }), [prices, view]);
  const boxPrices: TradePrices = { store: view?.prices.store ?? prices.store, cents, dated: view?.prices.dated ?? prices.dated };

  async function reload(id: string) {
    try {
      setView(await openTradeAction(id));
    } catch (e) {
      captureClientError("trades.open", e);
    }
  }
  /** One press at a time: run it, and on ok reload the trade and refresh the page; a refusal toasts and reloads on `gone`. */
  async function press(which: Exclude<BoxBusy, null>, act: () => Promise<{ ok: boolean; reason?: string }>, done?: (out: { ok: true } & Record<string, unknown>) => void) {
    if (busy) return;
    setBusy(which);
    try {
      const out = await act();
      if (out.ok) {
        done?.(out as { ok: true });
        if (tradeId) await reload(tradeId);
        router.refresh();
      } else {
        toast.fail();
        if (tradeId && (out.reason === "gone" || out.reason === "not-spare")) await reload(tradeId);
      }
    } catch (e) {
      captureClientError(`trades.${which}`, e);
      toast.fail();
    } finally {
      setBusy(null);
    }
  }

  const send = () => {
    if (!compose) return;
    const sides = { theirs: compose.theirs, yours: compose.yours };
    if (compose.mode === "draft") {
      const art = (id: string | undefined) => (id ? cardsById.get(id)?.imageUri ?? null : null);
      const pictures = { theirs: art(sides.theirs[0]), yours: art(sides.yours[0]) };
      void press("send", () => proposeTradeAction(friend.publicId, sides), (out) => { setSent({ id: String(out.id), ...pictures }); setCompose(null); });
    } else if (view) {
      const act = compose.mode === "revise" ? reviseTradeAction : counterTradeAction;
      void press("send", () => act(view.id, view.round, view.offeredAt, sides), () => setCompose(null));
    }
  };
  const startCounter = (mode: "counterDraft" | "revise") => {
    if (!view) return;
    const ids = (cs: readonly TradeCard[]) => cs.map((c) => c.oracleId).filter((id) => !view.gone.includes(id));
    setCompose({ mode, theirs: ids(view.cards.theirs), yours: ids(view.cards.yours), side: "them" });
  };

  // The box's state and cards.
  const state: BoxState | null = compose ? compose.mode : view?.state ?? null;
  let fromThem: BoxCard[] = [];
  let fromYou: BoxCard[] = [];
  let was: { them: number | null; you: number | null; day: string } | null = null;
  const marks = (current: readonly string[], previous: readonly string[] | null, gone: readonly string[]): BoxCard[] => {
    const card = (id: string): TradeCard => cardsById.get(id) ?? { oracleId: id, name: "", imageUri: null };
    if (!previous) return current.map((id) => ({ ...card(id), gone: gone.includes(id) || undefined }));
    const { added, removed } = roundDiff(current, previous);
    return [
      ...current.map((id) => ({ ...card(id), change: added.includes(id) ? "added" as const : undefined, gone: gone.includes(id) || undefined })),
      ...removed.map((id) => ({ ...card(id), change: "removed" as const })),
    ];
  };
  const priced = (ids: readonly string[]) => {
    const s = sideSum(ids.map((id) => ({ oracleId: id, name: "", imageUri: null })), cents);
    return s.priced ? s.cents : null;
  };
  if (compose) {
    // A counter or a revision marks its changes against the offer it replaces; a draft has none.
    const base = compose.mode === "draft" || !view ? null : view.cards;
    fromThem = marks(compose.theirs, base ? base.theirs.map((c) => c.oracleId) : null, []);
    fromYou = marks(compose.yours, base ? base.yours.map((c) => c.oracleId) : null, []);
    if (base && view) was = { them: priced(base.theirs.map((c) => c.oracleId)), you: priced(base.yours.map((c) => c.oracleId)), day: tradeDay(new Date(view.offeredAt), timeZone) };
  } else if (view) {
    const prev = view.status === "open" ? view.cards.previous : null;
    fromThem = marks(view.cards.theirs.map((c) => c.oracleId), prev ? prev.theirs.map((c) => c.oracleId) : null, view.gone);
    fromYou = marks(view.cards.yours.map((c) => c.oracleId), prev ? prev.yours.map((c) => c.oracleId) : null, view.gone);
    if (prev) was = { them: priced(prev.theirs.map((c) => c.oracleId)), you: priced(prev.yours.map((c) => c.oracleId)), day: view.previousAt ? tradeDay(view.previousAt, timeZone) : "" };
  }
  const composing = state !== null && COMPOSING.has(state);
  const title = <PersonText text={t.sheet.title(name)} />;

  return (
    <ModalChrome title="" titleNode={title} pendingName={undefined} closeLabel={t.sheet.close} closeHeld={busy !== null} onClose={onClose} width={640}
      eyebrow={t.feed.kicker} stand={composing && !sent} fit={!composing || sent !== null}>
      <div data-testid="trade-sheet" className="flex flex-col px-[14px] pb-[22px] pt-[12px] md:px-[18px] md:pb-[18px]">
        {sent ? (
          <Sent friend={friend} theirs={sent.theirs} yours={sent.yours} onDone={onClose} onOpen={() => { const id = sent.id; setSent(null); onOpen({ kind: "trade", id }); }} />
        ) : state === null ? (
          loaded ? <p className="m-0 py-[18px] text-[13px] text-[color:var(--fg-muted)]">{t.row.nothingElse}</p> : <div aria-busy className="h-[220px]" />
        ) : (
          <>
            <TradeBox friend={name} state={state} status={view?.status} fromThem={fromThem} fromYou={fromYou} prices={boxPrices}
              daysLeft={view?.daysLeft ?? TRADE_DAYS} was={was} tradedDay={view?.tradedAt ? tradeDay(view.tradedAt, timeZone) : undefined} busy={busy}
              onSend={send}
              onKeepTheirs={() => setCompose(null)}
              onAnswer={(a: Answer) => view && void press(a, () => answerTradeAction(view.id, view.round, view.offeredAt, a))}
              onCounter={() => startCounter(view?.state === "lookYours" ? "revise" : "counterDraft")}
              onWithdraw={() => view && void press("withdraw", () => withdrawTradeAction(view.id, view.round))}
              onRescind={() => view && void press("rescind", () => rescindTradeAction(view.id))}
              onMark={() => view && void press("mark", () => markTradedAction(view.id))}
              onNewTrade={() => setCompose({ mode: "draft", theirs: [], yours: [], side: "them" })} />
            {compose ? (
              <Picker friend={friend} compose={compose} setCompose={setCompose} theirSpares={theirSpares} yourSpares={yourSpares}
                offered={offered} exclude={view?.id ?? null} onOpen={onOpen} />
            ) : null}
          </>
        )}
      </div>
      {toast.node}
    </ModalChrome>
  );
}

function Picker({ friend, compose, setCompose, theirSpares, yourSpares, offered, exclude, onOpen }: {
  friend: OtherSide; compose: Compose; setCompose: (c: Compose) => void;
  theirSpares: readonly FriendSpareLine[]; yourSpares: readonly FriendSpareLine[];
  offered: Readonly<Record<string, readonly OfferedTo[]>>; exclude: string | null; onOpen: (next: TradeOpen) => void;
}) {
  const name = friend.displayName;
  const [popOpen, setPopOpen] = useState<string | null>(null);
  const side = compose.side;
  // Own spares the friend wants come first (`loadOwnSparesFor` sorts them so; kept here should the order change).
  const mine = useMemo(() => [...yourSpares].sort((a, b) => Number(b.onWishlist) - Number(a.onWishlist)), [yourSpares]);
  const wanted = mine.filter((l) => l.onWishlist).length;
  // Q9: another open offer of the reader's carries the card; the trade being countered is not "another".
  const alsoIn = (id: string) => (offered[id] ?? []).filter((o) => o.tradeId !== exclude);
  const anyOffered = side === "you" && mine.some((l) => alsoIn(l.oracleId).length > 0);
  const lines = side === "them" ? theirSpares : mine;
  const picked = new Set(side === "them" ? compose.theirs : compose.yours);
  const toggle = (id: string) => {
    const key = side === "them" ? "theirs" : "yours";
    const now = compose[key];
    const next = now.includes(id) ? now.filter((x) => x !== id) : now.length >= TRADE_SIDE_MAX ? now : [...now, id];
    setCompose({ ...compose, [key]: next });
  };
  const count = (n: number) => <span className="ml-[6px] font-mono text-[11px] text-[color:var(--fg-faint)]">{n}</span>;
  return (
    <div data-testid="trade-picker" className="flex flex-col">
      <div className="mt-[18px] flex">
        <SegmentedSwitch kind="tabs" ariaLabel={t.pick.aria} fill value={side} onChange={(s) => { setPopOpen(null); setCompose({ ...compose, side: s }); }}
          segments={[
            { value: "them", label: <PersonText text={t.pick.theirs(name)} />, count: count(theirSpares.length), data: { "data-testid": "trade-pick-them" } },
            { value: "you", label: t.pick.yours, count: count(yourSpares.length), data: { "data-testid": "trade-pick-you" } },
          ]} />
      </div>
      {lines.length === 0 ? (
        side === "them"
          ? <PanelEmpty title={<PersonText text={t.empty.theirsTitle(name)} />} body={<PersonText text={t.empty.theirsBody(name)} />} />
          : <PanelEmpty title={t.empty.yoursTitle} body={t.empty.yoursBody} />
      ) : (
        <>
          <p className="m-0 mt-[10px] font-mono text-[11px] text-[color:var(--fg-faint)]">
            {side === "you" ? (wanted ? <PersonText text={t.wantsListed(name, wanted)} /> : t.pickYours) : <PersonText text={t.pickTheirs(name)} />}
          </p>
          {side === "you" && (wanted > 0 || anyOffered) ? (
            <ul data-testid="trade-pick-key" className="m-0 mt-[8px] flex list-none flex-wrap items-center gap-x-[14px] gap-y-[4px] p-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">
              {wanted ? <li className="inline-flex items-center gap-[6px]"><span className="inline-flex text-[color:var(--fact)]"><SpareGlyph size={13} /></span>{t.key.wants}</li> : null}
              {anyOffered ? <li className="inline-flex items-center gap-[6px]"><span className="inline-flex text-[color:var(--fg-muted)]"><OfferedGlyph /></span>{t.key.offered}</li> : null}
            </ul>
          ) : null}
          <ul className="m-0 mt-[12px] grid list-none grid-cols-3 gap-x-[8px] gap-y-[12px] p-0 md:grid-cols-4 md:gap-x-[12px]">
            {lines.map((line, i) => {
              const inTrade = picked.has(line.oracleId);
              const want = side === "you" && line.onWishlist;
              const also = side === "you" ? alsoIn(line.oracleId) : [];
              const chips = [
                want ? <WantsChip key="w" friend={name} squeeze={also.length > 0} /> : null,
                also.length ? (
                  <OfferedChip key="o" offered={also} open={popOpen === line.oracleId} solo={!want} friend={friend}
                    onToggle={() => setPopOpen(popOpen === line.oracleId ? null : line.oracleId)} onClose={() => setPopOpen(null)}
                    onOpen={(id) => { setPopOpen(null); onOpen({ kind: "trade", id }); }} />
                ) : null,
              ].filter(Boolean);
              return (
                <li key={line.oracleId} data-testid="trade-pick-tile" className="flex min-w-0 flex-col">
                  {/* Card, then the press 10px under it (clear of the picked ring), so every row's presses line up. */}
                  <span aria-hidden className={`${TILE_BOX} ${inTrade ? RING : ""}`}>
                    {line.imageUri ? <HydratedImg eager={i < 6} src={line.imageUri} alt="" className="absolute inset-0 block h-full w-full object-cover" /> : (
                      <span className="absolute inset-0 flex items-center justify-center p-[6px] text-center text-[11px] font-semibold leading-[1.25] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">{line.name}</span>
                    )}
                  </span>
                  <button type="button" data-testid="trade-pick-press" aria-pressed={inTrade} aria-label={inTrade ? t.inAria(line.name) : t.addAria(line.name)}
                    onClick={() => toggle(line.oracleId)}
                    className={`mt-[10px] inline-flex h-[32px] w-full cursor-pointer items-center justify-center gap-[5px] rounded-[7px] px-[6px] font-sans text-[12.5px] font-medium md:h-[28px] ${inTrade ? "bg-[color:color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)] [border:1px_solid_color-mix(in_oklab,var(--success)_40%,transparent)]" : "bg-transparent text-[color:var(--fg)] [border:1px_solid_var(--border-strong)]"}`}>
                    {inTrade ? <>✓ {t.inPress}</> : <>+ {t.addPress}</>}
                  </button>
                  {chips.length ? (
                    <div className="relative mt-[6px] flex min-w-0 gap-[4px]">
                      {chips}
                      {chips.length === 1 ? <span className="flex-1 basis-0" /> : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Sent({ friend, theirs, yours, onDone, onOpen }: {
  friend: OtherSide; theirs: string | null; yours: string | null; onDone: () => void; onOpen: () => void;
}) {
  const name = friend.displayName;
  return (
    <div data-testid="trade-sent" className="flex flex-col gap-[14px] pb-[6px] pt-[2px]">
      <div className="flex items-center gap-[16px] rounded-[10px] px-[14px] py-[14px] [border:1px_solid_color-mix(in_oklab,var(--success)_35%,var(--border))] bg-[color:color-mix(in_oklab,var(--success)_7%,var(--surface-inset))]">
        <TradePicture theirs={theirs} yours={yours} friend={friend} className="ml-[6px] flex-none" />
        <span className="flex min-w-0 flex-col gap-[4px]">
          <span className="font-mono text-[9.5px] font-medium uppercase tracking-[.12em] text-[color:var(--success)]">{t.row.kind.offered}</span>
          <b className="text-[15px] font-semibold text-[color:var(--fg)]"><PersonText text={t.sheet.sentTitle(name)} /></b>
          <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]"><PersonText text={t.sheet.sentBody(name)} /></span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-[10px]">
        <PrimaryButton data-testid="trade-sent-done" onClick={onDone} className={`${ACTION_SIZE} font-medium`}>{t.sheet.done}</PrimaryButton>
        <GhostButton data-testid="trade-sent-open" onClick={onOpen} className={`${ACTION_SIZE} font-medium`}>{t.sheet.openTrade}</GhostButton>
      </div>
    </div>
  );
}

/** The out-arrow: a spare already sent in another offer. */
function OfferedGlyph() {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7" /><path d="M9 7h8v8" />
    </svg>
  );
}

/** The Wants chip (half width; beside Offered, just its glyph, which the key names). */
function WantsChip({ friend, squeeze }: { friend: ThirdPartyName; squeeze: boolean }) {
  return (
    <span data-testid="trade-chip-wants" className={`${CHIP} flex-1 basis-0 text-[color:var(--fact)] bg-[color-mix(in_oklab,var(--fact)_14%,transparent)]`}>
      <span className="inline-flex flex-none"><SpareGlyph size={12} /></span>
      <span aria-hidden className={`min-w-0 truncate ${squeeze ? "hidden md:inline" : ""}`}><PersonName n={friend} /></span>
      <span className="sr-only"><PersonText text={t.onTheirWishlist(friend)} /></span>
    </span>
  );
}

/** Offered, a press: one name, or "N friends". Opens who, with each trade's days left and Open ›. */
function OfferedChip({ offered, open, solo, friend, onToggle, onClose, onOpen }: {
  offered: readonly OfferedTo[]; open: boolean; solo: boolean; friend: OtherSide;
  onToggle: () => void; onClose: () => void; onOpen: (tradeId: string) => void;
}) {
  const chip = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const names = offered.map((o) => o.friend.displayName);
  // The board anchors the popover to the chip's side (left alone, right beside Wants); on a tile at the sheet's edge that
  // side runs out of the sheet and is clipped, so it takes the other side when it would not fit.
  const [side, setSide] = useState<"left" | "right">(solo ? "left" : "right");
  useLayoutEffect(() => {
    if (!open || !pop.current) return;
    const sheet = pop.current.parentElement?.closest('[role="dialog"]')?.getBoundingClientRect();
    const box = pop.current.getBoundingClientRect();
    if (!sheet) return;
    if (box.left < sheet.left) setSide("left");
    else if (box.right > sheet.right) setSide("right");
  }, [open]);
  useEffect(() => {
    if (!open) return;
    pop.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // The popover closes first; the sheet stays.
      e.stopPropagation();
      onClose();
      chip.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!pop.current?.contains(e.target as Node) && !chip.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose]);
  return (
    <>
      <button ref={chip} type="button" data-testid="trade-chip-offered" aria-expanded={open} aria-haspopup="dialog" onClick={onToggle}
        className={`${CHIP} ${MUTED} flex-1 basis-0 cursor-pointer [border:0] ${open ? "ring-1 ring-[color:var(--border-strong)]" : ""}`}>
        <span className={`${names.length > 1 ? "hidden md:inline-flex" : "inline-flex"} flex-none`}><OfferedGlyph /></span>
        <span aria-hidden className="min-w-0 truncate">{names.length === 1 ? <PersonName n={names[0]} /> : t.offeredCount(names.length)}</span>
        <span className="sr-only"><PersonText text={t.alsoOffered(names)} /></span>
      </button>
      {open ? (
        <div ref={pop} role="dialog" aria-label={t.offeredPop.title} data-testid="trade-offered-pop"
          className={`absolute top-[28px] z-10 flex w-[232px] flex-col gap-[2px] rounded-[10px] bg-[color:var(--surface-raised)] p-[10px] shadow-[0_10px_28px_rgba(0,0,0,.5)] [border:1px_solid_var(--border-strong)] ${side === "left" ? "left-0" : "right-0"}`}>
          <p className="m-0 pb-[4px] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{t.offeredPop.title}</p>
          {offered.map((o) => (
            <div key={o.tradeId} className="flex items-center gap-[8px] py-[5px] [border-top:1px_solid_var(--border)] first-of-type:[border-top:0]">
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="truncate text-[13px] font-semibold text-[color:var(--fg)]"><PersonName n={o.friend.displayName} /></b>
                <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{t.offeredPop.line(o.daysLeft)}</span>
              </span>
              {/* This friend's trade opens in place; another friend's opens on their Spares tab. */}
              {o.friend.publicId === friend.publicId ? (
                <button type="button" onClick={() => onOpen(o.tradeId)} className="flex-none cursor-pointer border-0 bg-transparent p-0 font-sans text-[12.5px] font-medium text-[color:var(--accent-text)]">{t.offeredPop.open}</button>
              ) : (
                <Link href={`/friends/${o.friend.publicId}/spares?trade=${o.tradeId}`} className="flex-none text-[12.5px] font-medium text-[color:var(--accent-text)] no-underline">{t.offeredPop.open}</Link>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
