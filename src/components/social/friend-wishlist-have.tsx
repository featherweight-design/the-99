"use client";
// You have it, PR 3b (handoff `design_handoff_the99_you_have_it`): the parts a friend's Wishlist tab draws over the cards
// the reader can spare. The tile's press (a sibling of the tile's own press, as the Wishlist tab's friend-spare press is),
// the call-out and its filter, the key, and the `You have this` sheet with Offer. Nothing here reads: the page's one read
// (`loadHaveIt`) arrives with the tab, and a write's reply moves one card's mark for the visit.

import { captureClientError } from "../../lib/sentry/capture-client";
import Link from "next/link";
import { useRef, useState } from "react";
import { offerSpareAction } from "../../app/friends/spare-actions";
import { haveItCopy as h } from "../../lib/copy/social";
import { PersonText, personAttrs, type ThirdPartyName } from "../../lib/person-name";
import { SPARE_REQUEST_DAYS } from "../../lib/social/spare-request-rules";
import type { HaveItCard } from "../../lib/social/spare-offers";
import { PendingReporter } from "../shell/pending-reporter";
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
import { ASK_INK, ASK_PRESS, ASK_SIZE, STATUS } from "./friend-spares";

export type HaveFilter = "all" | "spare";
export type HaveLine = { oracleId: string; name: string; imageUri: string | null; quantity: number };

/** The Spares section of Settings: its heading carries this id (`SparesSection`). */
const SETTINGS_SPARES = "/settings#settings-spares";

const glyphMark = (c: HaveItCard): SpareMark => (c.mark === "accepted" ? "accepted" : c.mark ? "requested" : null);

/** The tile's press: the 26px outlined box with the spare glyph and its mark, over the caption's lower right. */
export function HavePress({ line, have, open, onOpen }: { line: HaveLine; have: HaveItCard; open: boolean; onOpen: () => void }) {
  const base = have.under ? h.under.aria(line.name, have.under) : h.aria(line.name);
  return (
    <span className="absolute bottom-[8px] right-[6px] z-[1] flex md:bottom-[9px] md:right-[8px]">
      <button
        type="button"
        data-testid="have-press"
        aria-label={have.mark ? h.markAria(base, have.mark) : base}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onOpen}
        className={`${SPARE_PRESS_FADE} ${TOUCH_HIT} flex h-[26px] min-w-[26px] cursor-pointer items-center justify-center rounded-[6px] bg-transparent px-[5px] ${have.under ? "[border:1px_dashed_var(--border-dashed)]" : "[border:1px_solid_var(--border-strong)]"} ${open ? "ring-2 ring-[color:var(--accent)] ring-offset-2" : ""}`}
      >
        {have.under ? <UnderGlyph size={16} /> : <MarkedSpareGlyph mark={glyphMark(have)} size={16} testId="have-glyph" />}
      </button>
    </span>
  );
}

/** The spare glyph, unmarked, in the faint ink: a spare the reader's Offer threshold holds back. */
export function UnderGlyph({ size }: { size: number }) {
  return <span data-mark="under" data-testid="have-under-glyph" className="inline-flex text-[color:var(--fg-faint)]"><SpareGlyph size={size} /></span>;
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
  // A spare under the reader's threshold draws and is keyed, but is not offerable: the title, filter and count speak of the offerable ones.
  const offerable = haves.filter((c) => !c.under);
  const under = haves.filter((c) => c.under);
  const min = under[0]?.under ?? 0;
  const nameByCard = new Map(haves.map((c, i) => [c, names[i]] as const));
  const nameOf = (c: HaveItCard) => nameByCard.get(c)!;
  const marks = new Set(offerable.map((c) => c.mark));
  const key: Array<{ label: string; mark: SpareMark | "under" }> = [
    ...(offerable.length ? [{ label: h.key.spare, mark: null }] : []),
    ...(marks.has("asked") ? [{ label: h.key.asked, mark: "requested" as const }] : []),
    ...(marks.has("offered") ? [{ label: h.key.offered, mark: "requested" as const }] : []),
    ...(marks.has("accepted") ? [{ label: h.key.accepted, mark: "accepted" as const }] : []),
    ...(under.length ? [{ label: h.key.under, mark: "under" as const }] : []),
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
          title={offerable.length ? h.callout.title(offerable.length) : h.under.title(under.length)}
          body={offerable.length
            ? `${h.callout.body(h.callout.names(offerable.map(nameOf)))}${under.length ? ` ${h.under.more(under.length)}` : ""}`
            : h.under.body(h.callout.names(under.map(nameOf)), min)}
        />
      </div>
      <div className="flex flex-col items-start gap-[10px]">
        {offerable.length > 0 && <SegmentedSwitch<HaveFilter>
          kind="radio"
          size="compact"
          ariaLabel={h.callout.filterAria}
          value={filter}
          onChange={onFilter}
          segments={[
            { value: "all", label: h.callout.filterAll, count: total },
            { value: "spare", label: h.callout.filterSpare, count: offerable.length },
          ]}
        />}
        <ul data-testid="have-key" className="m-0 flex list-none flex-wrap items-center gap-x-[14px] gap-y-[4px] p-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {key.map((k) => (
            <li key={k.label} className="inline-flex items-center gap-[6px]">
              {k.mark === "under" ? <UnderGlyph size={14} /> : <MarkedSpareGlyph mark={k.mark} size={14} />}
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
    } catch (e) {
      captureClientError("spares.offer", e);
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

  const foot = have.under ? h.under.foot(have.under) : have.mark === "asked" ? h.foot.asked(friend) : have.mark === "offered" ? h.foot.offered(friend) : have.mark === "accepted" ? h.foot.accepted(friend) : h.foot.offer(friend);
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
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center gap-[12px]">
              <span className="inline-flex size-[30px] flex-none items-center justify-center rounded-[8px] bg-[color:var(--bg)] [border:1px_solid_var(--border)]">
                {have.under ? <UnderGlyph size={18} /> : <MarkedSpareGlyph mark={glyphMark(have)} size={18} />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="text-[15px] font-semibold leading-[normal] text-[color:var(--fg)]">
                  {have.mark === "asked" ? <PersonText text={h.asked(friend, have.copies ?? 1)} /> : h.spare(have.spare)}
                </span>
                <span className="font-mono text-[11.5px] leading-[1.45] text-[color:var(--fg-faint)]">
                  {have.under ? h.under.sub(have.under) : have.mark === "offered" && have.daysLeft !== null ? h.daysLeft(have.daysLeft) : have.mark === "asked" ? `${h.spare(have.spare)} · ${h.spareSub}` : h.spareSub}
                </span>
              </span>
              <span ref={cell} tabIndex={-1} className="flex flex-none items-center outline-none">
                {have.under ? null : have.mark === null ? (
                  <button
                    type="button"
                    data-testid="have-offer"
                    disabled={offering}
                    onClick={offer}
                    {...personAttrs(
                      { "aria-label": h.offerAria(friend, line.name) },
                      `${ASK_PRESS} ${ASK_SIZE.sheet} ${ASK_INK} disabled:opacity-60`,
                    )}
                  >
                    {h.offer}
                  </button>
                ) : have.mark === "offered" ? (
                  <span data-testid="have-offered" className={`${STATUS} text-[color:var(--fg-muted)]`}>
                    <MarkedSpareGlyph mark="requested" size={16} />
                    {h.offered}
                  </span>
                ) : have.mark === "accepted" ? (
                  <span data-testid="have-accepted" className={`${STATUS} text-[color:var(--success)]`}>
                    <MarkedSpareGlyph mark="accepted" size={16} />
                    {h.accepted}
                  </span>
                ) : null}
              </span>
            </div>
            {have.mark === "asked" ? (
              <div className="[&>span]:md:justify-start">
                <AnswerPresses
                  friend={friend}
                  card={line.name}
                  daysLeft={have.daysLeft ?? 0}
                  busy={busy?.answer ?? null}
                  locked={busy !== null}
                  onAnswer={(a) => void reply(a)}
                  size="row"
                />
              </div>
            ) : null}
          </div>
        </section>
        <p data-testid="have-foot" className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]"><PersonText text={foot} />
          {have.under ? (
            <>
              {" "}
              <Link href={SETTINGS_SPARES} data-testid="have-settings" className="font-medium text-[color:var(--accent-text)] no-underline">
                {h.under.settings}
                <PendingReporter href={SETTINGS_SPARES} />
              </Link>
            </>
          ) : null}
        </p>
      </div>
      {toast.node}
    </ModalChrome>
    </HoverPreviewProvider>
  );
}
