"use client";
// The Change commander sheet (handoff §2, §3, R3): the candidates who can lead these 99, and the
// confirm that makes one of them commander as a pending draft change.
//
// Read when it opens (`readChangeCandidates`), never shipped with the deck page. One `ModalChrome`
// body at 700; a card opened from any name or plate STACKS on it through the shared card modal,
// whose way back reads `← Change commander`.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalChrome } from "./receipt-modal";
import { BuyTag } from "./buy-tag";
import { SwapGlyph } from "./change-commander-glyph";
import { AvailabilityMarker } from "../ui/availability-marker";
import { CostPips } from "../ui/cost-pips";
import { GhostButton, PrimaryButton } from "../ui/button";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { cssUrl } from "../../lib/collection/browse";
import { guildLabel } from "../../lib/copy/color-labels";
import { changeCommanderCopy as copy } from "../../lib/copy/change-commander";
import { changeCommander, readChangeCandidates } from "../../lib/commander-change/actions";
import type { Candidate, CandidateHalf, ChangeCandidates } from "../../lib/commander-change/candidates";

/** Show more's step, and To buy's first screen (handoff §2.5). */
const STEP = 8;

/** The name a sentence uses: the part before a comma or a face separator. */
export function shortName(name: string): string {
  return name.split(" // ")[0].split(",")[0].trim();
}

function joinShort(names: readonly string[]): string {
  return names.map(shortName).join(" and ");
}

/** Whether choosing this candidate trades places with a card in the 99. */
export function isTrade(c: Candidate): boolean {
  return c.halves.some((h) => h.inDeck);
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
  // Back to the list restores it as it was: the list stays mounted behind the confirm (its open
  // row and Show more count survive), and the scroll offset is put back by hand, because the
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
      onClose={onClose}
      width={700}
    >
      <div ref={bodyRef} className="flex flex-col gap-[16px] px-[18px] pt-[16px] pb-[22px]">
        {phase.kind === "loading" ? <Loading pair={pair} /> : null}
        {phase.kind === "failed" ? (
          <Failed onRetry={() => { setPhase({ kind: "loading" }); setAttempt((n) => n + 1); }} />
        ) : null}
        {phase.kind === "ready" && chosen ? (
          <Confirm
            deckId={deckId}
            data={phase.data}
            candidate={chosen}
            pair={pair}
            hasVersion={hasVersion}
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
      <p className="text-[13.5px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
        {pair ? copy.sheet.lede.pair : copy.sheet.lede.single}
      </p>
      {counted !== undefined ? (
        <p className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
          {copy.sheet.counted(counted)}
        </p>
      ) : null}
    </div>
  );
}

function Loading({ pair }: { pair: boolean }) {
  return (
    <div role="status" className="flex flex-col gap-[16px]">
      <Lede pair={pair} />
      <span className="sr-only">{copy.sheet.loading}</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} aria-hidden="true" className="flex gap-[12px] py-[11px]" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="rounded-[6px]" style={{ width: 56, height: 41, background: "var(--elevated)" }} />
          <span className="flex flex-1 flex-col gap-[8px] pt-[4px]">
            <span className="rounded-[4px]" style={{ width: "55%", height: 12, background: "var(--elevated)" }} />
            <span className="rounded-[4px]" style={{ width: "35%", height: 10, background: "var(--elevated)" }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-[10px] py-[24px] text-center">
      <span style={{ color: "var(--fg)", opacity: 0.3 }}><SwapGlyph size={56} /></span>
      <h3 className="font-display text-[21px]" style={{ color: "var(--fg)" }}>{copy.sheet.failed.heading}</h3>
      <p className="text-[13.5px]" style={{ color: "var(--fg-body)" }}>{copy.sheet.failed.body}</p>
      <PrimaryButton className="min-h-[44px] px-[18px] text-[13px]" onClick={onRetry}>{copy.sheet.failed.cta}</PrimaryButton>
    </div>
  );
}

function List({ data, pair, onChoose }: { data: ChangeCandidates; pair: boolean; onChoose: (c: Candidate) => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [shown, setShown] = useState(STEP);
  const buyGroup = useRef<HTMLElement>(null);
  const focusFrom = useRef<number | null>(null);

  // Show more moves focus to the first row it added (handoff §2.5), onto that row's Choose.
  useEffect(() => {
    if (focusFrom.current === null) return;
    const rows = buyGroup.current?.querySelectorAll<HTMLElement>("[data-testid=change-commander-row]");
    rows?.[focusFrom.current]?.querySelector<HTMLButtonElement>("[data-choose]")?.focus();
    focusFrom.current = null;
  }, [shown]);

  const toBuy = data.toBuy.slice(0, shown);
  const left = data.toBuy.length - toBuy.length;
  const siblings = [...data.yours, ...toBuy].flatMap((c) => c.halves.map((h) => h.oracleId));
  const current = {
    cmc: data.current.reduce((n, c) => n + c.cmc, 0),
    name: joinShort(data.current.map((c) => c.name)),
  };

  if (data.yours.length === 0 && data.toBuy.length === 0) {
    const identity = data.identity.length === 0 ? "colorless" : guildLabel(data.identity);
    return (
      <div className="flex flex-col gap-[8px]">
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--fg)" }}>
          {pair
            ? copy.sheet.nonePair.head(["no", "one", "two", "three", "four", "five"][data.identity.length])
            : copy.sheet.none.head(identity)}
        </h3>
        <p className="text-[13.5px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
          {pair ? copy.sheet.nonePair.body : copy.sheet.none.body}
        </p>
      </div>
    );
  }

  const row = (c: Candidate, i: number) => (
    <Row
      key={c.key}
      candidate={c}
      pair={pair}
      current={current}
      newestAsOf={data.newestAsOf}
      siblings={siblings}
      open={openKey === c.key}
      onToggle={() => setOpenKey((k) => (k === c.key ? null : c.key))}
      onChoose={() => onChoose(c)}
      index={i}
    />
  );

  return (
    <>
      <Lede pair={pair} counted={data.counted} />
      {data.yours.length > 0 ? (
        <section>
          <GroupHeading label={copy.sheet.groupYours(data.yours.length)} />
          {data.yours.map((c, i) => row(c, i))}
        </section>
      ) : (
        <p className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{copy.sheet.ownsNone}</p>
      )}
      {data.toBuy.length > 0 ? (
        <section ref={buyGroup}>
          <GroupHeading label={copy.sheet.groupBuy(data.toBuy.length)} />
          {toBuy.map((c, i) => row(c, i))}
          {left > 0 ? (
            <div className="flex min-h-[44px] items-center gap-[10px]">
              <button
                type="button"
                className="min-h-[44px] font-mono text-[11px] text-[color:var(--accent)] underline decoration-dotted"
                onClick={() => { focusFrom.current = shown; setShown((n) => n + STEP); }}
              >
                {copy.sheet.more(Math.min(STEP, left))}
              </button>
              <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>{copy.sheet.moreLeft(left)}</span>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

function GroupHeading({ label }: { label: string }) {
  return (
    <h3
      className="pb-[6px] font-mono text-[10.5px] tracking-[0.16em] uppercase"
      style={{ color: "var(--fg-faint)", borderBottom: "1px solid var(--elevated)" }}
    >
      {label}
    </h3>
  );
}

function Mark({ half, newestAsOf }: { half: CandidateHalf; newestAsOf: Date | null }) {
  if (half.inDeck) {
    return <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-muted)" }}>{copy.sheet.inDeck}</span>;
  }
  if (!half.owned) return <BuyTag variant="row" price={half.price} newestAsOf={newestAsOf} />;
  // Owned, but the claim read failed: the group still says it is yours, and no mark is drawn.
  if (!half.availability) return null;
  if (half.availability.free > 0) {
    return (
      <span className="inline-flex items-center gap-[5px] font-mono text-[10.5px]" style={{ color: "var(--fg-body)" }}>
        <span aria-hidden="true" className="rounded-full" style={{ width: 6, height: 6, background: "var(--success)" }} />
        {copy.sheet.free}
      </span>
    );
  }
  return <AvailabilityMarker availability={half.availability} density="row" />;
}

function Thumb({ halves }: { halves: CandidateHalf[] }) {
  return (
    <span
      aria-hidden="true"
      className="flex flex-none overflow-hidden rounded-[6px] border border-[color:var(--border-strong)]"
      style={{ width: 56, height: 41, gap: halves.length > 1 ? 1 : 0, background: "var(--bg)" }}
    >
      {halves.map((h) => (
        <span
          key={h.oracleId}
          className="block h-full flex-1 bg-cover bg-center"
          style={{ backgroundColor: "var(--elevated)", backgroundImage: h.artCropUri ? cssUrl(h.artCropUri) : undefined }}
        />
      ))}
    </span>
  );
}

function ManaValue({ halves, current }: { halves: CandidateHalf[]; current: { cmc: number; name: string } }) {
  const mv = halves.reduce((n, h) => n + h.cmc, 0);
  return (
    <span className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px]">
      {halves.map((h, i) => (
        <span key={h.oracleId} className="inline-flex items-center gap-[6px]">
          {i > 0 ? <span style={{ color: "var(--fg-faint)" }}>+</span> : null}
          <CostPips cost={h.manaCost} size={13} />
        </span>
      ))}
      <span className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>
        {copy.sheet.manaValueRel(mv, current.cmc, current.name)}
      </span>
    </span>
  );
}

function Row({
  candidate, pair, current, newestAsOf, siblings, open, onToggle, onChoose, index,
}: {
  candidate: Candidate;
  pair: boolean;
  current: { cmc: number; name: string };
  newestAsOf: Date | null;
  siblings: string[];
  open: boolean;
  onToggle: () => void;
  onChoose: () => void;
  index: number;
}) {
  const lead = candidate.halves[0];
  const name = joinShort(candidate.halves.map((h) => h.name));
  const panelId = `change-commander-fit-${index}-${lead.oracleId}`;
  return (
    <div data-testid="change-commander-row" className="py-[11px]" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex gap-[12px]">
        <Thumb halves={candidate.halves} />
        <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
          {candidate.halves.map((h, i) => (
            <div key={h.oracleId} className="flex flex-wrap items-baseline gap-x-[9px] gap-y-[2px]">
              <span className="inline-flex items-baseline gap-[6px]">
                {i > 0 ? <span style={{ color: "var(--fg-faint)" }}>+</span> : null}
                <CardDetailTrigger
                  oracleId={h.oracleId}
                  name={h.name}
                  siblings={siblings}
                  className="text-left text-[14px] font-semibold"
                  style={{ color: "var(--fg)", borderBottom: "1px solid var(--border-strong)" }}
                >
                  {h.name}
                </CardDetailTrigger>
              </span>
              <Mark half={h} newestAsOf={newestAsOf} />
            </div>
          ))}
          <ManaValue halves={candidate.halves} current={current} />
          <div className="mt-[2px] flex flex-wrap items-center justify-between gap-[8px]">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={copy.sheet.figureAria(candidate.fit.n, candidate.fit.of, name)}
              onClick={onToggle}
              className="relative flex h-[36px] items-center gap-[5px] font-mono text-[12px] text-[color:var(--fg-body)] after:absolute after:-inset-y-[4px] after:inset-x-0"
            >
              <span className="underline decoration-dotted" style={{ textDecorationColor: "var(--fg-faint)" }}>
                {copy.sheet.figure(candidate.fit.n, candidate.fit.of, pair)}
              </span>
              <span aria-hidden="true" className="text-[10px]">{open ? "▴" : "▾"}</span>
            </button>
            <GhostButton
              data-choose=""
              aria-label={copy.sheet.chooseAria(name)}
              onClick={onChoose}
              className="relative h-[36px] px-[14px] text-[12.5px] font-semibold after:absolute after:-inset-y-[4px] after:inset-x-0"
            >
              {copy.sheet.choose}
            </GhostButton>
          </div>
        </div>
      </div>
      {open ? (
        <div
          id={panelId}
          className="mt-[8px] ml-[68px] rounded-[9px] border border-[color:var(--border)] px-[13px] pt-[11px] pb-[13px]"
          style={{ background: "var(--surface-sunken)" }}
        >
          <p className="mb-[8px] font-mono text-[10px] uppercase" style={{ color: "var(--fg-faint)" }}>
            {copy.sheet.expandCaption(candidate.fit.n, name)}
          </p>
          <div className="grid grid-cols-2 gap-x-[12px] gap-y-[4px] md:grid-cols-3">
            {candidate.matched.map((m) => (
              <CardDetailTrigger
                key={m.oracleId}
                oracleId={m.oracleId}
                name={m.name}
                siblings={candidate.matched.map((x) => x.oracleId)}
                className="text-left text-[12.5px]"
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
  cards, label, tone, compare,
}: {
  cards: { oracleId: string; name: string; imageUri: string | null; manaCost: string | null }[];
  label: string;
  tone: "out" | "in";
  compare?: string;
}) {
  const one = cards.length === 1;
  return (
    <div className="flex flex-col items-center gap-[8px]">
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
            siblings={cards.map((x) => x.oracleId)}
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
            <span className="text-center text-[11.5px] leading-[1.3]" style={{ color: "var(--fg-body)" }}>{c.name}</span>
          </CardDetailTrigger>
        ))}
      </div>
      <span className="flex flex-wrap items-center justify-center gap-[6px]">
        {cards.map((c) => <CostPips key={c.oracleId} cost={c.manaCost} size={13} />)}
      </span>
      {compare ? <span className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{compare}</span> : null}
    </div>
  );
}

function Confirm({
  deckId, data, candidate, pair, hasVersion, onBack, onDone,
}: {
  deckId: string;
  data: ChangeCandidates;
  candidate: Candidate;
  pair: boolean;
  hasVersion: boolean;
  onBack: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [writing, setWriting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [announced, setAnnounced] = useState("");
  const trade = isTrade(candidate);
  const body = pair ? 98 : 99;
  const olds = data.current;
  const nus = candidate.halves;
  const oldShort = joinShort(olds.map((c) => c.name));
  const nuShort = joinShort(nus.map((c) => c.name));
  const toBuy = nus.filter((h) => !h.inDeck && !h.owned);

  const sentence = trade
    ? copy.confirm.trade(nuShort, oldShort, body)
    : pair
      ? copy.confirm.sentencePair(shortName(nus[0].name), shortName(nus[1].name), shortName(olds[0].name), shortName(olds[1].name), body)
      : copy.confirm.sentence(nuShort, oldShort, body);
  const lands = !hasVersion ? copy.confirm.brew : trade ? copy.confirm.landsTrade : copy.confirm.lands(oldShort);
  const mv = nus.reduce((n, h) => n + h.cmc, 0);
  const oldMv = olds.reduce((n, c) => n + c.cmc, 0);

  const make = async () => {
    if (writing) return;
    setWriting(true);
    setFailed(false);
    try {
      const result = await changeCommander(deckId, {
        commanderOracleId: nus[0].oracleId,
        partnerOracleId: nus[1]?.oracleId ?? null,
      });
      if (!result.ok) {
        setFailed(true);
        return;
      }
      setAnnounced(copy.confirm.announced(nuShort));
      router.refresh();
      onDone();
    } catch {
      setFailed(true);
    } finally {
      setWriting(false);
    }
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[44px] self-start font-mono text-[11px] text-[color:var(--fg-faint)]"
      >
        {copy.confirm.back}
      </button>
      <div className="flex items-start justify-center gap-[14px]">
        <Plate
          cards={olds.map((c) => ({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri, manaCost: c.manaCost }))}
          label={trade ? copy.confirm.tradeOut : pair ? copy.confirm.outPair : copy.confirm.out}
          tone="out"
        />
        <span aria-hidden="true" className="self-center font-mono text-[18px]" style={{ color: "var(--fg-faint)" }}>
          {trade ? "⇄" : "→"}
        </span>
        <Plate
          cards={nus.map((h) => ({ oracleId: h.oracleId, name: h.name, imageUri: h.imageUri, manaCost: h.manaCost }))}
          label={trade ? copy.confirm.tradeIn : pair ? copy.confirm.inPair : copy.confirm.in}
          tone="in"
          compare={copy.sheet.manaValueRel(mv, oldMv, oldShort)}
        />
      </div>
      <p className="border-t border-[color:var(--border)] pt-[14px] text-[14px] leading-[1.6]" style={{ color: "var(--fg)" }}>
        {sentence}
      </p>
      {toBuy.length > 0 ? (
        <div className="flex flex-wrap items-center gap-[8px] text-[13px]" style={{ color: "var(--fg-body)" }}>
          <span>{copy.confirm.buy(joinShort(toBuy.map((h) => h.name)))}</span>
          {toBuy.map((h) => <BuyTag key={h.oracleId} variant="row" price={h.price} newestAsOf={data.newestAsOf} />)}
        </div>
      ) : null}
      <p className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{lands}</p>
      <div className="flex flex-col gap-[8px] md:flex-row">
        <PrimaryButton className="min-h-[44px] px-[18px] text-[13px]" onClick={make} aria-busy={writing}>
          <span style={{ opacity: writing ? 0.6 : 1 }}>
            {writing
              ? copy.confirm.pending
              : failed
                ? copy.confirm.failedRetry
                : pair
                  ? copy.confirm.ctaPair(shortName(nus[0].name), shortName(nus[1].name))
                  : copy.confirm.cta(nuShort)}
          </span>
        </PrimaryButton>
        <GhostButton className="min-h-[44px] px-[18px] text-[13px]" onClick={onBack}>{copy.confirm.backList}</GhostButton>
      </div>
      {failed ? (
        <p role="alert" className="font-mono text-[11px]" style={{ color: "var(--danger)" }}>
          {copy.confirm.failed(oldShort)}
        </p>
      ) : null}
      <span className="sr-only" aria-live="polite">{announced}</span>
    </div>
  );
}
