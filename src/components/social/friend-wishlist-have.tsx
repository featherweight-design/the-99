"use client";
// You have it, PR 3b (handoff `design_handoff_the99_you_have_it`): the parts a friend's Wishlist tab draws over the cards
// the reader can spare. The tile's press (a sibling of the tile's own press, as the Wishlist tab's friend-spare press is),
// the call-out and its filter, the key, and the `You have this` sheet with Offer. Nothing here reads: the page's one read
// (`loadHaveIt`) arrives with the tab, and a write's reply moves one card's mark for the visit.

import { useRef, useState } from "react";
import { offerSpareAction } from "../../app/friends/spare-actions";
import { haveItCopy as h } from "../../lib/copy/social";
import { PersonText, personAttrs, type ThirdPartyName } from "../../lib/person-name";
import { SPARE_REQUEST_DAYS } from "../../lib/social/spare-request-rules";
import type { HaveItCard } from "../../lib/social/spare-offers";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { ModalChrome } from "../decks/receipt-modal";
import { ReplacingLine, Thumb } from "../decks/stand-ins-sheet";
import { TodoRow } from "../decks/todo-card";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { TOUCH_HIT } from "../ui/touch-hit";
import { WishlistTileFace, type WishlistTileCard } from "../wishlist/wishlist-tile";
import { SPARE_PRESS_FADE } from "../wishlist/wishlist-spare-press";
import { AnswerPresses, useSpareAnswer, useSpareToast } from "./spare-answer";
import { MarkedSpareGlyph, SpareGlyph, type SpareMark } from "./spare-key-item";

export type HaveFilter = "all" | "spare";
export type HaveLine = { oracleId: string; name: string; imageUri: string | null; quantity: number };

const glyphMark = (c: HaveItCard): SpareMark => (c.mark === "accepted" ? "accepted" : c.mark ? "requested" : null);

/** The tile's press: the 26px outlined box with the spare glyph and its mark, over the caption's lower right. */
export function HavePress({ line, have, open, onOpen }: { line: HaveLine; have: HaveItCard; open: boolean; onOpen: () => void }) {
  const base = h.aria(line.name);
  return (
    <span className="absolute bottom-[8px] right-[6px] z-[1] flex md:bottom-[9px] md:right-[8px]">
      <button
        type="button"
        data-testid="have-press"
        aria-label={have.mark ? h.markAria(base, have.mark) : base}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onOpen}
        className={`${SPARE_PRESS_FADE} ${TOUCH_HIT} flex h-[26px] min-w-[26px] cursor-pointer items-center justify-center rounded-[6px] bg-transparent px-[5px] [border:1px_solid_var(--border-strong)] ${open ? "ring-2 ring-[color:var(--accent)] ring-offset-2" : ""}`}
      >
        <MarkedSpareGlyph mark={glyphMark(have)} size={16} testId="have-glyph" />
      </button>
    </span>
  );
}

/** A tile's face for the friend's list: its wants line takes the press's height once any tile draws a press. */
export function HaveTileFace({ tile, eager, press }: { tile: WishlistTileCard; eager: boolean; press: boolean }) {
  return <WishlistTileFace tile={tile} eager={eager} pressRoom={press ? 1 : 0} tall={press} />;
}

/** The statement (the deck page's to-do row, no press), then the filter under it and the key. Nothing when there is no spare. */
export function HaveCallout({ names, haves, total, filter, onFilter }: {
  names: readonly string[]; haves: readonly HaveItCard[]; total: number; filter: HaveFilter; onFilter: (f: HaveFilter) => void;
}) {
  if (haves.length === 0) return null;
  const marks = new Set(haves.map((c) => c.mark));
  const key: Array<{ label: string; mark: SpareMark }> = [
    { label: h.key.spare, mark: null },
    ...(marks.has("asked") ? [{ label: h.key.asked, mark: "requested" as const }] : []),
    ...(marks.has("offered") ? [{ label: h.key.offered, mark: "requested" as const }] : []),
    ...(marks.has("accepted") ? [{ label: h.key.accepted, mark: "accepted" as const }] : []),
  ];
  return (
    <div data-testid="have-callout" className={`${SPARE_PRESS_FADE} mt-[14px] flex flex-col gap-[10px]`}>
      <div className="overflow-hidden rounded-[10px] bg-[color:var(--surface-rail)] [border:1px_solid_var(--border)]">
        <p className="m-0 px-[14px] pb-[2px] pt-[9px] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)] md:px-[16px]">
          {h.callout.eyebrow}
        </p>
        <TodoRow
          tone="action"
          next={false}
          mark={<SpareGlyph size={16} />}
          title={h.callout.title(haves.length)}
          body={h.callout.body(h.callout.names(names))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[8px]">
        <SegmentedSwitch<HaveFilter>
          kind="radio"
          size="compact"
          ariaLabel={h.callout.filterAria}
          value={filter}
          onChange={onFilter}
          segments={[
            { value: "all", label: h.callout.filterAll, count: total },
            { value: "spare", label: h.callout.filterSpare, count: haves.length },
          ]}
        />
        <ul data-testid="have-key" className="m-0 flex list-none flex-wrap items-center gap-x-[14px] gap-y-[4px] p-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {key.map((k) => (
            <li key={k.label} className="inline-flex items-center gap-[6px]">
              <MarkedSpareGlyph mark={k.mark} size={14} />
              {k.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * `You have this`: the card, your spares and one row. Offer is one press (the copies are the server's); an open offer reads
 * `Offered`, the friend's open ask carries Yes and No, a yes reads `Accepted`. A write that fails is the shared toast and
 * the row unchanged. `onChange` moves this card's mark for the visit.
 */
export function HaveSheet({ line, have, friend, friendPublicId, onClose, onChange }: {
  line: HaveLine; have: HaveItCard; friend: ThirdPartyName; friendPublicId: string; onClose: () => void;
  onChange: (patch: Partial<HaveItCard>) => void;
}) {
  const toast = useSpareToast();
  const { busy, answer } = useSpareAnswer(toast);
  const [offering, setOffering] = useState(false);
  const cell = useRef<HTMLSpanElement>(null);
  const landed = () => requestAnimationFrame(() => cell.current?.focus());

  async function offer() {
    if (offering) return;
    setOffering(true);
    try {
      const r = await offerSpareAction({ friendPublicId, oracleId: line.oracleId });
      if (r.ok) {
        onChange({ mark: "offered", requestId: r.id, daysLeft: SPARE_REQUEST_DAYS });
        landed();
      } else toast.fail();
    } catch {
      toast.fail();
    } finally {
      setOffering(false);
    }
  }
  async function reply(a: "yes" | "no") {
    if (!have.requestId) return;
    if (await answer(have.requestId, a)) {
      onChange({ mark: a === "yes" ? "accepted" : null, requestId: null, daysLeft: null });
      landed();
    }
  }

  const foot = have.mark === "asked" ? h.foot.asked(friend) : have.mark === "offered" ? h.foot.offered(friend) : have.mark === "accepted" ? h.foot.accepted(friend) : h.foot.offer(friend);
  return (
    <HoverPreviewProvider waitForMove>
    <ModalChrome title={h.title} closeLabel={h.close} onClose={onClose} width={640}>
      <div data-testid="have-sheet" className="flex flex-col gap-[12px] px-[16px] pb-[24px] pt-[14px] md:gap-[14px] md:px-[18px] md:pb-[18px] md:pt-[16px]">
        <section className="flex flex-col gap-[6px] rounded-[10px] bg-[color:var(--bg)] px-[13px] pb-[12px] pt-[11px] [border:1px_solid_var(--border)]">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">
            <PersonText text={h.kicker(friend, line.quantity)} />
          </span>
          <ReplacingLine imageUri={line.imageUri}>
            <Thumb imageUri={line.imageUri} side="head" />
            <CardDetailTrigger
              oracleId={line.oracleId}
              name={line.name}
              className="cursor-pointer border-0 bg-transparent p-0 text-left text-[14px] font-semibold text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)]"
            >
              {line.name}
            </CardDetailTrigger>
          </ReplacingLine>
        </section>
        <section className="flex flex-col gap-[8px]">
          <h3 className="m-0 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{h.section(1)}</h3>
          <div className="flex items-center gap-[12px] rounded-[10px] px-[13px] py-[11px] [border:1px_solid_var(--border)]">
            <MarkedSpareGlyph mark={glyphMark(have)} size={20} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[13.5px] font-semibold text-[color:var(--fg)]">{h.spare(have.spare)}</span>
              <span className="text-[12px] text-[color:var(--fg-muted)]">{have.mark === "offered" && have.daysLeft !== null ? h.daysLeft(have.daysLeft) : h.spareSub}</span>
            </span>
            <span ref={cell} tabIndex={-1} className="flex flex-none items-center outline-none">
              {have.mark === null ? (
                <button
                  type="button"
                  data-testid="have-offer"
                  disabled={offering}
                  onClick={offer}
                  {...personAttrs(
                    { "aria-label": h.offerAria(friend, line.name) },
                    "h-[36px] cursor-pointer rounded-[8px] bg-[color:var(--fg)] px-[16px] font-sans text-[13px] font-medium text-[color:var(--bg)] [border:1px_solid_var(--fg)] disabled:cursor-default disabled:opacity-60",
                  )}
                >
                  {h.offer}
                </button>
              ) : have.mark === "offered" ? (
                <span data-testid="have-offered" className="font-mono text-[12px] text-[color:var(--fg-muted)]">{h.offered}</span>
              ) : have.mark === "accepted" ? (
                <span data-testid="have-accepted" className="font-mono text-[12px] text-[color:var(--success)]">{h.accepted}</span>
              ) : (
                <AnswerPresses
                  friend={friend}
                  card={line.name}
                  daysLeft={have.daysLeft ?? 0}
                  busy={busy?.answer ?? null}
                  locked={busy !== null}
                  onAnswer={(a) => void reply(a)}
                  size="row"
                />
              )}
            </span>
          </div>
        </section>
        <p data-testid="have-foot" className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]"><PersonText text={foot} /></p>
      </div>
      {toast.node}
    </ModalChrome>
    </HoverPreviewProvider>
  );
}
