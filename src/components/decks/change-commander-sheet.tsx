"use client";
// The Change commander sheet (handoff §2, §3, R3): the candidates who can lead these 99, and the
// confirm that makes one of them commander as a pending draft change.
//
// Read when it opens (`readChangeCandidates`), never shipped with the deck page. One `ModalChrome`
// body at 700; a card opened from any name or plate STACKS on it through the shared card modal,
// whose way back reads `← Change commander`.

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ModalChrome } from "./receipt-modal";
import { BuyTag } from "./buy-tag";
import { SwapGlyph } from "./change-commander-glyph";
import { AvailabilityMarker } from "../ui/availability-marker";
import { CostPips } from "../ui/cost-pips";
import { GhostButton, PrimaryButton } from "../ui/button";
import { CardDetailTrigger, type Sibling } from "../cards/card-detail-provider";
import { cssUrl } from "../../lib/collection/browse";
import { guildLabel } from "../../lib/copy/color-labels";
import { changeCommanderCopy as copy } from "../../lib/copy/change-commander";
import { changeCommander, readChangeCandidates } from "../../lib/commander-change/actions";
import type { Candidate, CandidateHalf, ChangeCandidates } from "../../lib/commander-change/candidates";
import type { PriceFact } from "../../lib/decks/price";
import { tradeShape, type TradeShape } from "../../lib/commander-change/pending";
import { useChangeCommander } from "./change-commander-context";
import { SheetGroupHeading, SheetGroupToggle } from "../ui/sheet-group";

/** Each group's first screen, the swap sheet's own (Hugh's staging walk, 2026-09-25). */
const GROUP_SHOWN = 5;

/** The name a sentence uses: the part before a comma or a face separator. */
export function shortName(name: string): string {
  return name.split(" // ")[0].split(",")[0].trim();
}

function joinShort(names: readonly string[]): string {
  return names.map(shortName).join(" and ");
}

/** How choosing this candidate moves cards between the 99 and the command zone. */
export function shapeOf(c: Candidate, current: readonly { oracleId: string }[]): TradeShape | null {
  return tradeShape(
    c.halves.map((h) => h.oracleId),
    current.map((x) => x.oracleId),
    new Set(c.halves.filter((h) => h.inDeck).map((h) => h.oracleId)),
  );
}

type Phase =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ready"; data: ChangeCandidates };

export function ChangeCommanderSheet({
  deckId, deckName, pair, hasVersion, onClose,
}: {
  deckId: string;
  deckName: string;
  pair: boolean;
  hasVersion: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState<Candidate | null>(null);
  // A half-trade's answer to "which one stays", per candidate, so Back and Choose again keep it.
  const [staysBy, setStaysBy] = useState<Record<string, string>>({});
  // Back to the list restores it as it was: the list stays mounted behind the confirm (its open
  // row and each group's Show all survive), and the scroll offset is put back by hand, because the
  // confirm's height moved it.
  const listScroll = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scroller = () => {
    let el = bodyRef.current?.parentElement ?? null;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    return el;
  };
  useEffect(() => {
    if (chosen === null && listScroll.current !== null) {
      const el = scroller();
      if (el) el.scrollTop = listScroll.current;
      listScroll.current = null;
    }
  }, [chosen]);

  useEffect(() => {
    let live = true;
    readChangeCandidates(deckId)
      .then((data) => { if (live) setPhase(data ? { kind: "ready", data } : { kind: "failed" }); })
      .catch(() => { if (live) setPhase({ kind: "failed" }); });
    return () => { live = false; };
  }, [deckId, attempt]);

  const title = pair ? copy.sheet.title.pair : copy.sheet.title.single;

  const choose = (c: Candidate) => {
    listScroll.current = scroller()?.scrollTop ?? 0;
    setChosen(c);
  };

  return (
    <ModalChrome
      title={title}
      // Desktop only: the phone's 43px header cannot hold the deck's name beside the title without
      // cutting the title, the same call the verdict lean's qualifier made.
      aside={<span className="hidden md:inline">{deckName}</span>}
      closeLabel={pair ? copy.sheet.close.pair : copy.sheet.close.single}
      // A stacked card's way back is `← Change commander` for a pair too (handoff §3), never the
      // pair's title, which is what ModalChrome falls back to.
      backLabel={copy.sheet.title.single}
      onClose={onClose}
      width={700}
    >
      <div ref={bodyRef} className="flex flex-col gap-[16px] px-[18px] pt-[16px] pb-[22px]">
        {phase.kind === "loading" ? <Loading pair={pair} /> : null}
        {phase.kind === "failed" ? (
          <Failed pair={pair} onRetry={() => { setPhase({ kind: "loading" }); setAttempt((n) => n + 1); }} />
        ) : null}
        {phase.kind === "ready" && chosen ? (
          <Confirm
            deckId={deckId}
            data={phase.data}
            candidate={chosen}
            pair={pair}
            hasVersion={hasVersion}
            stays={staysBy[chosen.key] ?? null}
            onStays={(id) => setStaysBy((m) => ({ ...m, [chosen.key]: id }))}
            onBack={() => setChosen(null)}
            onDone={onClose}
          />
        ) : null}
        {phase.kind === "ready" ? (
          <div hidden={chosen !== null} className="flex flex-col gap-[16px]">
            <List data={phase.data} pair={pair} onChoose={choose} />
          </div>
        ) : null}
      </div>
    </ModalChrome>
  );
}

function Lede({ pair, counted }: { pair: boolean; counted?: number }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <p className="text-[13.5px] leading-[1.55] text-pretty" style={{ color: "var(--fg-body)" }}>
        {pair ? copy.sheet.lede.pair : copy.sheet.lede.single}
      </p>
      {counted !== undefined ? (
        <p className="font-mono text-[10.5px] leading-[1.55] text-pretty" style={{ color: "var(--fg-faint)" }}>
          {copy.sheet.counted(counted)}
        </p>
      ) : null}
    </div>
  );
}

function Loading({ pair }: { pair: boolean }) {
  return (
    <div role="status" className="flex flex-col">
      <Lede pair={pair} />
      <p
        // Its rule sits where the group heading's will, so it takes that rule: 6px and `--border`.
        className="mt-[16px] pb-[6px] font-mono text-[10.5px] border-b border-b-[color:var(--border)] border-[color:var(--border)]"
        style={{ color: "var(--fg-faint)" }}
      >
        {copy.sheet.loading}
      </p>
      {[1, 0.8, 0.6, 0.4].map((opacity) => (
        <div
          key={opacity}
          aria-hidden="true"
          className="flex items-start gap-[12px] py-[12px]"
          style={{ borderBottom: "1px solid var(--border)", opacity }}
        >
          <span className="flex-none rounded-[6px]" style={{ width: 56, height: 41, background: "var(--elevated)" }} />
          <span className="flex flex-1 flex-col gap-[9px] pt-[3px]">
            <span className="rounded-[3px]" style={{ width: "52%", height: 11, background: "var(--elevated)" }} />
            <span className="rounded-[3px]" style={{ width: "34%", height: 9, background: "var(--elevated)" }} />
          </span>
          <span className="flex-none rounded-[8px]" style={{ width: 76, height: 36, border: "1px solid var(--border)" }} />
        </div>
      ))}
    </div>
  );
}

function Failed({ pair, onRetry }: { pair: boolean; onRetry: () => void }) {
  return (
    <>
      <Lede pair={pair} />
      <div role="alert" className="flex flex-col items-center px-[8px] pt-[30px] pb-[10px] text-center">
        <span style={{ color: "var(--fg-muted)", opacity: 0.3 }}><SwapGlyph size={56} strokeWidth={1.4} /></span>
        <h3 className="mt-[22px] font-display text-[21px] leading-[1.25] font-bold text-balance" style={{ color: "var(--fg)" }}>
          {copy.sheet.failed.heading}
        </h3>
        <p className="mt-[11px] max-w-[460px] text-[13.5px] leading-[1.6]" style={{ color: "var(--fg-body)" }}>
          {copy.sheet.failed.body}
        </p>
        <PrimaryButton className="mt-[20px] min-h-[44px] rounded-[8px] px-[22px] text-[14.5px]" onClick={onRetry}>
          {copy.sheet.failed.cta}
        </PrimaryButton>
      </div>
    </>
  );
}

function List({ data, pair, onChoose }: { data: ChangeCandidates; pair: boolean; onChoose: (c: Candidate) => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [allYours, setAllYours] = useState(false);
  const [allBuy, setAllBuy] = useState(false);
  const firstScreen = (rows: Candidate[], all: boolean) => (all ? rows : rows.slice(0, GROUP_SHOWN));
  const yours = firstScreen(data.yours, allYours);
  const toBuy = firstScreen(data.toBuy, allBuy);
  // The card modal's Prev/Next walks every candidate, folded or not, as the swap sheet's does.
  const siblings = [...data.yours, ...data.toBuy].flatMap((c) => c.halves.map((h) => ({ oracleId: h.oracleId, name: h.name, imageUri: h.imageUri })));
  const current = {
    cmc: data.current.reduce((n, c) => n + c.cmc, 0),
    name: joinShort(data.current.map((c) => c.name)),
  };

  if (data.yours.length === 0 && data.toBuy.length === 0) {
    const identity = data.identity.length === 0 ? "colorless" : guildLabel(data.identity);
    return (
      <div className="flex flex-col gap-[10px] pt-[18px] pb-[6px]">
        <h3 className="font-display text-[18px] leading-[1.3] font-bold" style={{ color: "var(--fg)" }}>
          {pair
            ? copy.sheet.nonePair.head(["no", "one", "two", "three", "four", "five"][data.identity.length])
            : copy.sheet.none.head(identity)}
        </h3>
        <p className="text-[13.5px] leading-[1.6]" style={{ color: "var(--fg-muted)" }}>
          {pair ? copy.sheet.nonePair.body : copy.sheet.none.body}
        </p>
      </div>
    );
  }

  const row = (c: Candidate) => (
    <CandidateRow
      key={c.key}
      candidate={c}
      pair={pair}
      current={current}
      newestAsOf={data.newestAsOf}
      siblings={siblings}
      open={openKey === c.key}
      onToggle={() => setOpenKey((k) => (k === c.key ? null : c.key))}
      onChoose={() => onChoose(c)}
    />
  );

  return (
    <>
      <Lede pair={pair} counted={data.counted} />
      {data.yours.length > 0 ? (
        <section className="flex flex-col" aria-label={copy.sheet.groupYours(data.yours.length)}>
          <CandidateGroupHeading label={copy.sheet.groupYours(data.yours.length)} note={copy.sheet.groupNote} />
          {yours.map(row)}
          <GroupToggle total={data.yours.length} all={allYours} onToggle={() => setAllYours((v) => !v)} />
        </section>
      ) : (
        <p className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{copy.sheet.ownsNone}</p>
      )}
      {data.toBuy.length > 0 ? (
        <section className="flex flex-col" aria-label={copy.sheet.groupBuy(data.toBuy.length)}>
          <CandidateGroupHeading
            label={copy.sheet.groupBuy(data.toBuy.length)}
            note={pair ? copy.sheet.groupNotePairBuy : copy.sheet.groupNote}
          />
          {toBuy.map(row)}
          <GroupToggle total={data.toBuy.length} all={allBuy} onToggle={() => setAllBuy((v) => !v)} />
        </section>
      ) : null}
    </>
  );
}

/** The swap sheet's toggle, indented to the rows' name column: the 56px thumb plus the row's 12px gap. */
function GroupToggle({ total, all, onToggle }: { total: number; all: boolean; onToggle: () => void }) {
  if (total <= GROUP_SHOWN) return null;
  return (
    <SheetGroupToggle
      all={all}
      onToggle={onToggle}
      label={copy.sheet.showAll(total)}
      fewer={copy.sheet.showFewer}
      className="pl-[68px]"
    />
  );
}

// Exported for the About page's Change commander figure (E2), which mounts it without the sheet's read.
export function CandidateGroupHeading({ label, note }: { label: string; note: string }) {
  return <SheetGroupHeading as="h3" label={label} note={note} />;
}

function Mark({ half, newestAsOf }: { half: CandidateHalf; newestAsOf: Date | null }) {
  if (half.inDeck) {
    // `in this deck · trades places`, its separator in `--border-strong` as the handoff draws it.
    const [where, what] = copy.sheet.inDeck.split(" · ");
    return (
      <span className="flex-none font-mono text-[10.5px]" style={{ color: "var(--fg-muted)" }}>
        {where}
        <span className="px-[4px]" style={{ color: "var(--border-strong)" }}>·</span>
        {what}
      </span>
    );
  }
  if (!half.owned) return <BuyTag variant="row" price={half.price} newestAsOf={newestAsOf} />;
  // Owned, but the claim read failed: the group still says it is yours, and no mark is drawn.
  if (!half.availability) return null;
  if (half.availability.free > 0) {
    return (
      <span className="inline-flex flex-none items-center gap-[6px] font-mono text-[10.5px]" style={{ color: "var(--fg-body)" }}>
        <span aria-hidden="true" className="rounded-full" style={{ width: 6, height: 6, background: "var(--success)" }} />
        {copy.sheet.free}
      </span>
    );
  }
  // Row density sets no type of its own and rides its host; here the host is the row's sans, so the
  // marker is given the mono 10.5px every other mark on this line carries (table §4.4).
  return <AvailabilityMarker bareOne availability={half.availability} density="row" className="flex-none font-mono text-[10.5px]" />;
}

function Thumb({ halves }: { halves: CandidateHalf[] }) {
  return (
    <span
      aria-hidden="true"
      className="mt-[1px] flex flex-none overflow-hidden rounded-[6px] border border-[color:var(--border-strong)]"
      style={{ width: 56, height: 41 }}
    >
      {halves.map((h, i) => (
        <span
          key={h.oracleId}
          className="block h-full bg-cover bg-center"
          style={{
            // A pair splits the thumb 28/28, the seam a 1px `--bg` rule on the second half.
            width: halves.length > 1 ? 28 : "100%",
            borderLeft: i > 0 ? "1px solid var(--bg)" : undefined,
            backgroundColor: "var(--elevated)",
            backgroundImage: h.artCropUri ? cssUrl(h.artCropUri) : undefined,
          }}
        />
      ))}
    </span>
  );
}

function ManaValue({ halves, current }: { halves: CandidateHalf[]; current: { cmc: number; name: string } }) {
  const mv = halves.reduce((n, h) => n + h.cmc, 0);
  return (
    <span className="flex min-h-[16px] flex-wrap items-center gap-x-[8px] gap-y-[3px]">
      {halves.map((h, i) => (
        <span key={h.oracleId} className="inline-flex items-center">
          {i > 0 ? (
            <span className="px-[3px] font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>+</span>
          ) : null}
          <CostPips cost={h.manaCost} size={13} className="flex flex-none items-center gap-[3px]" />
        </span>
      ))}
      <span className="font-mono text-[11px] leading-[1.4]" style={{ color: "var(--fg-muted)" }}>
        {copy.sheet.manaValueRel(mv, current.cmc, current.name)}
      </span>
    </span>
  );
}

// Exported for the About page's Change commander figure (E2). A pure export: the sheet draws it unchanged.
export function CandidateRow({
  candidate, pair, current, newestAsOf, siblings, open, onToggle, onChoose,
}: {
  candidate: Candidate;
  pair: boolean;
  current: { cmc: number; name: string };
  newestAsOf: Date | null;
  siblings: readonly Sibling[];
  open: boolean;
  onToggle: () => void;
  onChoose: () => void;
}) {
  const name = joinShort(candidate.halves.map((h) => h.name));
  // The candidate's own key, unique across both groups: two pairs can share a first half, one
  // owned and one to buy, and an index restarts in each group.
  const panelId = `change-commander-fit-${candidate.key}`;
  return (
    <div data-testid="change-commander-row" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-start gap-[12px] py-[11px]">
        <Thumb halves={candidate.halves} />
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          {candidate.halves.map((h, i) => (
            <div key={h.oracleId} className="flex min-w-0 flex-wrap items-baseline gap-x-[9px] gap-y-[3px]">
              {i > 0 ? (
                <span aria-hidden="true" className="mr-[-4px] text-[13px]" style={{ color: "var(--fg-faint)" }}>+</span>
              ) : null}
              <CardDetailTrigger
                oracleId={h.oracleId}
                name={h.name}
                siblings={siblings}
                className="min-w-0 text-left text-[14px] leading-[1.3] font-semibold"
                style={{ color: "var(--fg)", borderBottom: "1px solid var(--border-strong)" }}
              >
                {h.name}
              </CardDetailTrigger>
              <Mark half={h} newestAsOf={newestAsOf} />
            </div>
          ))}
          <ManaValue halves={candidate.halves} current={current} />
          <div className="mt-[2px] flex flex-wrap items-center justify-between gap-x-[12px] gap-y-[6px]">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={copy.sheet.figureAria(candidate.fit.n, candidate.fit.of, name)}
              onClick={onToggle}
              className="relative inline-flex h-[36px] cursor-pointer items-center gap-[7px] font-mono text-[12px] text-[color:var(--fg-body)] after:absolute after:-inset-y-[4px] after:inset-x-0"
            >
              <span style={{ borderBottom: "1px dotted var(--fg-faint)" }}>
                {copy.sheet.figure(candidate.fit.n, candidate.fit.of, pair)}
              </span>
              <span aria-hidden="true" className="text-[10px]" style={{ color: "var(--fg-faint)" }}>{open ? "▴" : "▾"}</span>
            </button>
            <GhostButton
              data-choose=""
              aria-label={copy.sheet.chooseAria(name)}
              onClick={onChoose}
              className="relative ml-auto h-[36px] px-[14px] text-[12.5px] font-semibold after:absolute after:-inset-y-[4px] after:inset-x-0"
            >
              {copy.sheet.choose}
            </GhostButton>
          </div>
        </div>
      </div>
      {open ? (
        <div
          id={panelId}
          className="mb-[12px] ml-[68px] flex flex-col gap-[9px] rounded-[9px] border border-[color:var(--border)] px-[13px] pt-[11px] pb-[13px]"
          style={{ background: "var(--surface-sunken)" }}
        >
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: "var(--fg-faint)" }}>
            {copy.sheet.expandCaption(candidate.fit.n, name)}
          </p>
          <div className="grid grid-cols-2 gap-x-[14px] md:grid-cols-3">
            {candidate.matched.map((m) => (
              <CardDetailTrigger
                key={m.oracleId}
                oracleId={m.oracleId}
                name={m.name}
                siblings={candidate.matched.map((x) => x.oracleId)}
                className="min-w-0 truncate py-[3px] text-left text-[12.5px] leading-[1.35]"
                style={{ color: "var(--fg-body)" }}
              >
                {m.name}
              </CardDetailTrigger>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Plate({
  cards, label, tone, compare, pair, fates,
}: {
  cards: { oracleId: string; name: string; imageUri: string | null; manaCost: string | null }[];
  label: string;
  tone: "out" | "in";
  compare?: string;
  pair: boolean;
  /** A half-trade's line under each card, saying where it goes (addendum §1). */
  fates?: ReactNode[];
}) {
  const one = cards.length === 1;
  return (
    <div className="flex min-w-0 flex-col items-center gap-[8px]">
      <span
        className="font-mono text-[10px] tracking-[0.12em] uppercase"
        style={{ color: tone === "out" ? "var(--warning)" : "var(--success)" }}
      >
        {label}
      </span>
      <div className="flex gap-[6px]">
        {cards.map((c) => (
          <CardDetailTrigger
            key={c.oracleId}
            oracleId={c.oracleId}
            name={c.name}
            siblings={cards.map((x) => ({ oracleId: x.oracleId, name: x.name, imageUri: x.imageUri }))}
            className={"flex flex-col items-center gap-[6px] " + (one ? "w-[104px] md:w-[120px]" : "w-[68px] md:w-[84px]")}
          >
            <span
              className="block w-full rounded-[8px] border border-[color:var(--border-strong)] bg-cover bg-center"
              style={{
                aspectRatio: "63 / 88",
                backgroundColor: "var(--elevated)",
                backgroundImage: c.imageUri ? cssUrl(c.imageUri) : undefined,
              }}
            />
            <span className="text-center text-[11.5px] leading-[1.3]" style={{ color: "var(--fg-body)" }}>
              {pair ? shortName(c.name) : c.name}
            </span>
          </CardDetailTrigger>
        ))}
      </div>
      {fates ? (
        // 6px under the name, as the tile draws it: the column's 8px gap, less 2.
        <div className="mt-[-2px] flex gap-[6px]" data-testid="half-trade-fates">
          {cards.map((c, i) => (
            <span
              key={c.oracleId}
              className={"flex justify-center text-center font-mono text-[10px] leading-[1.35] " + (cards.length === 1 ? "w-[104px] md:w-[120px]" : "w-[68px] md:w-[84px]")}
              style={{ color: "var(--fg-muted)" }}
            >
              {fates[i]}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-[4px] self-stretch">
        <span className="flex flex-wrap items-center justify-center">
          {cards.map((c, i) => (
            <span key={c.oracleId} className="inline-flex items-center">
              {i > 0 ? (
                <span className="px-[3px] font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>+</span>
              ) : null}
              <CostPips cost={c.manaCost} size={13} className="flex flex-none items-center gap-[3px]" />
            </span>
          ))}
        </span>
        {compare ? (
          // `w-0 min-w-full`: the line wraps inside the tiles' width rather than widening the column,
          // which with a long pair's names pushed the plates past a phone's edge.
          <span className="w-0 min-w-full text-center font-mono text-[11px] leading-[1.4]" style={{ color: "var(--fg-muted)" }}>{compare}</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The buy line's one price: the halves to buy summed (handoff §3). Summed only when every half
 * carries a live price for its normal printing; a sold-out, foil-only or unpriced half has no
 * figure to add, and a sum over it would quote a price the feed never gave. Null then, and the
 * line draws a tag per half instead.
 */
export function summedPrice(halves: CandidateHalf[], newestAsOf: Date | null): PriceFact | null {
  if (halves.length < 2 || newestAsOf === null) return null;
  const live = halves.every((h) => h.price !== null && h.price.cents !== null && h.price.asOf.getTime() === newestAsOf.getTime());
  if (!live) return null;
  return {
    cents: halves.reduce((n, h) => n + (h.price!.cents ?? 0), 0),
    foilCents: null,
    etchedCents: null,
    asOf: newestAsOf,
  };
}

/**
 * "Which one stays in the 98?" (addendum §1): a radiogroup labelled by its question, one option per
 * old half. Arrow keys move the choice and the focus together (roving tabindex), as a native radio
 * group does. 34px options on desktop; full width with 44px options on a phone.
 */
function StaysChoice({
  options, value, onChange, body,
}: {
  options: { oracleId: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  body: number;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    onChange(options[next].oracleId);
    refs.current[next]?.focus();
  };
  return (
    <div data-stays="true" className="flex flex-col items-center gap-[8px]">
      <span id="change-commander-stays" className="font-mono text-[10.5px]" style={{ color: "var(--fg-muted)" }}>
        {copy.confirm.staysQuestion(body)}
      </span>
      <div
        role="radiogroup"
        aria-labelledby="change-commander-stays"
        className="flex w-full gap-[4px] rounded-[10px] border border-[color:var(--border-strong)] p-[3px] md:w-auto"
        style={{ background: "var(--bg)" }}
      >
        {options.map((o, i) => {
          const on = o.oracleId === value;
          return (
            <button
              key={o.oracleId}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(o.oracleId)}
              onKeyDown={(e) => onKey(e, i)}
              className={
                "flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-[8px] rounded-[7px] px-[14px] text-[13px] md:min-h-[34px] md:flex-none "
                + (on
                  ? "bg-[color:var(--elevated)] font-semibold text-[color:var(--fg)]"
                  : "bg-transparent font-medium text-[color:var(--fg-muted)]")
              }
            >
              <span
                aria-hidden="true"
                className="flex-none rounded-full"
                style={{
                  width: 8, height: 8,
                  border: on ? "none" : "1.5px solid var(--fg-faint)",
                  background: on ? "var(--accent)" : "transparent",
                }}
              />
              {shortName(o.name)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** An incoming half's fate line: out of the 98, to buy (the shipped tag), or free. */
function InFate({ half, body, newestAsOf }: { half: CandidateHalf; body: number; newestAsOf: Date | null }) {
  if (half.inDeck) return <>{copy.confirm.cardFromBody(body)}</>;
  if (!half.owned) return <BuyTag variant="row" price={half.price} newestAsOf={newestAsOf} />;
  // Owned but every copy held elsewhere: the list row's held marker, so the confirm still says so.
  if (!half.availability) return null;
  return half.availability.free > 0
    ? <>{copy.sheet.free}</>
    : <AvailabilityMarker bareOne availability={half.availability} density="row" />;
}

function Confirm({
  deckId, data, candidate, pair, hasVersion, stays: staysChosen, onStays, onBack, onDone,
}: {
  deckId: string;
  data: ChangeCandidates;
  candidate: Candidate;
  pair: boolean;
  hasVersion: boolean;
  /** The half-trade's choice, held by the sheet; null until the reader picks. */
  stays: string | null;
  onStays: (oracleId: string) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const door = useChangeCommander();
  const [writing, setWriting] = useState(false);
  const [failed, setFailed] = useState(false);
  const body = pair ? 98 : 99;
  const olds = data.current;
  const nus = candidate.halves;
  const shape = shapeOf(candidate, olds);
  const trade = shape === "trade";
  const halfTrade = shape === "halfTrade";
  // The half-trade's three fates. The default is the first commander (Hugh, A-H1); the write
  // receives the choice and gives that half the freed slot.
  const stays = staysChosen ?? olds[0].oracleId;
  const staying = olds.find((c) => c.oracleId === stays) ?? olds[0];
  const released = olds.find((c) => c.oracleId !== staying.oracleId) ?? olds[0];
  const arriving = nus.find((h) => h.inDeck) ?? nus[0];
  const joining = nus.find((h) => h.oracleId !== arriving.oracleId) ?? nus[0];
  const oldShort = joinShort(olds.map((c) => c.name));
  const nuShort = joinShort(nus.map((c) => c.name));
  const toBuy = nus.filter((h) => !h.inDeck && !h.owned);
  const summed = summedPrice(toBuy, data.newestAsOf);

  const sentence = halfTrade
    ? copy.confirm.halfTrade(shortName(arriving.name), shortName(joining.name), shortName(staying.name), shortName(released.name), body)
    : trade
    ? copy.confirm.trade(nuShort, oldShort, body)
    : pair
      ? copy.confirm.sentencePair(shortName(nus[0].name), shortName(nus[1].name), shortName(olds[0].name), shortName(olds[1].name), body)
      : copy.confirm.sentence(nuShort, oldShort, body);
  const lands = !hasVersion
    ? copy.confirm.brew
    : halfTrade ? copy.confirm.landsHalfTrade : trade ? copy.confirm.landsTrade : copy.confirm.lands(oldShort);
  const mv = nus.reduce((n, h) => n + h.cmc, 0);
  const oldMv = olds.reduce((n, c) => n + c.cmc, 0);

  const make = async () => {
    if (writing) return;
    setWriting(true);
    setFailed(false);
    try {
      const to = { commanderOracleId: nus[0].oracleId, partnerOracleId: nus[1]?.oracleId ?? null };
      const result = halfTrade ? await changeCommander(deckId, to, stays) : await changeCommander(deckId, to);
      if (!result.ok) {
        setFailed(true);
        return;
      }
      // Announced from the provider: this sheet is gone by the time a reader would hear it.
      door?.announce((pair ? copy.confirm.announcedPair : copy.confirm.announced)(nuShort));
      onDone();
    } catch {
      setFailed(true);
    } finally {
      setWriting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-[16px]">
      <button
        type="button"
        onClick={onBack}
        // 44px rather than the canvas's 32: the touch floor every control in the app keeps.
        className="inline-flex min-h-[44px] items-center gap-[7px] self-start font-mono text-[11px] text-[color:var(--fg-faint)]"
      >
        {copy.confirm.back}
      </button>
      <div className="flex items-start justify-center gap-[14px] pt-[4px] pb-[2px]">
        <Plate
          cards={olds.map((c) => ({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri, manaCost: c.manaCost }))}
          label={halfTrade ? copy.confirm.outHalfTrade : trade ? copy.confirm.tradeOut : pair ? copy.confirm.outPair : copy.confirm.out}
          tone="out"
          pair={pair}
          fates={halfTrade
            ? olds.map((c) => (c.oracleId === staying.oracleId ? copy.confirm.cardStays(body) : copy.confirm.cardReleased))
            : undefined}
        />
        <span aria-hidden="true" className="mt-[-30px] flex-none self-center font-mono text-[18px]" style={{ color: "var(--fg-faint)" }}>
          {trade ? "⇄" : "→"}
        </span>
        <Plate
          cards={nus.map((h) => ({ oracleId: h.oracleId, name: h.name, imageUri: h.imageUri, manaCost: h.manaCost }))}
          label={trade ? copy.confirm.tradeIn : pair ? copy.confirm.inPair : copy.confirm.in}
          tone="in"
          compare={copy.sheet.manaValueRel(mv, oldMv, oldShort)}
          pair={pair}
          fates={halfTrade ? nus.map((h) => <InFate key={h.oracleId} half={h} body={body} newestAsOf={data.newestAsOf} />) : undefined}
        />
      </div>
      {halfTrade ? (
        <StaysChoice
          options={olds.map((c) => ({ oracleId: c.oracleId, name: c.name }))}
          value={staying.oracleId}
          onChange={onStays}
          body={body}
        />
      ) : null}
      <div className="flex flex-col gap-[9px] pt-[12px]" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-[14px] leading-[1.6] text-pretty" style={{ color: "var(--fg)" }}>{sentence}</p>
        {toBuy.length > 0 ? (
          <div className="flex flex-wrap items-center gap-[8px] text-[13px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
            <span>{copy.confirm.buy(joinShort(toBuy.map((h) => h.name)))}</span>
            {summed ? (
              <BuyTag variant="row" price={summed} newestAsOf={data.newestAsOf} />
            ) : (
              toBuy.map((h) => <BuyTag key={h.oracleId} variant="row" price={h.price} newestAsOf={data.newestAsOf} />)
            )}
          </div>
        ) : null}
        <p className="font-mono text-[10.5px] leading-[1.6] text-pretty" style={{ color: "var(--fg-faint)" }}>{lands}</p>
      </div>
      <div className="mt-auto flex flex-col gap-[8px] md:mt-0 md:flex-row md:items-center md:gap-[10px] md:pt-[4px]">
        <PrimaryButton
          // The whole button dims while it writes, and is never disabled (STATES 17).
          className={"min-h-[44px] rounded-[8px] px-[20px] text-[14px]" + (writing ? " opacity-60" : "")}
          onClick={make}
          aria-busy={writing}
        >
          {writing
            ? copy.confirm.pending
            : failed
              ? copy.confirm.failedRetry
              : pair
                ? copy.confirm.ctaPair(shortName(nus[0].name), shortName(nus[1].name))
                : copy.confirm.cta(nuShort)}
        </PrimaryButton>
        <GhostButton
          className="min-h-[44px] rounded-[8px] px-[18px] text-[13.5px] font-medium text-[color:var(--fg-muted)]"
          onClick={onBack}
        >
          {copy.confirm.backList}
        </GhostButton>
      </div>
      {failed ? (
        <p role="alert" className="font-mono text-[11px] leading-[1.55]" style={{ color: "var(--danger)" }}>
          {(pair ? copy.confirm.failedPair : copy.confirm.failed)(oldShort)}
        </p>
      ) : null}
    </div>
  );
}
