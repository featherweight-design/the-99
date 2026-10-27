"use client";
// Friends' spares on a deck's rows (Social R2 PR A; handoff R3 `Spares` S1 to S4, foil addendum #1875): one read of every
// card the deck is buying, the row's one other-ways press (⇄ and the spare glyph) on line 2 at both widths, the Shopping
// key's item, and the spares-only modal the press opens when the swap tools are off.
//
// Spares land after the page, so a row draws the glyph only once the read arrives; the press keeps no slot (#1875: neither
// is no press). Off, the provider is not mounted and every piece here draws nothing.

import { TOUCH_HIT } from "../ui/touch-hit";
import { useMergedRef } from "../ui/use-merged-ref";
import { momentsCopy } from "../../lib/copy/moments";
import { useMomentAnchor } from "../moments/moments-provider";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { FriendSpare } from "../../lib/social/spares";
import type { AskStateLine } from "../../lib/social/spare-requests";
import type { DeckDetailCard } from "../../lib/decks/grouping";

/**
 * What the press and the spares-only modal draw of a card: a deck row's card, or a cart line mapped to it. `quantity`
 * is the copies the row is short (a Shopping row buys its whole line; a cart line its line count): what an Ask names.
 */
export type SpareCard = Pick<DeckDetailCard, "oracleId" | "name" | "printedName" | "layout" | "imageUri" | "price"> & { quantity?: number };
import { printedFaceName } from "../../lib/collection/browse";
import { spareCopy } from "../../lib/copy/social";
import { MAX_SPARES_BATCH } from "../../lib/social/client-rules";
import { useSwapTools } from "../../lib/swaps/context";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { BuyTag } from "../decks/buy-tag";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { ModalChrome } from "../decks/receipt-modal";
import { ReplacingLine, Thumb } from "../decks/stand-ins-sheet";
import { askInsteadAction, askSpareAction } from "../../app/friends/spare-actions";
import { SPARE_REQUEST_DAYS } from "../../lib/social/spare-request-rules";
import {
  FriendSpareSection, MarkedSpareGlyph, SpareRequestsContext, cardMark, type AskPress, type RequestsCtx, type SpareMark,
} from "./friend-spares";

/** The route's own batch cap: a longer list is read in pieces, never cut. One constant, so the two cannot part. */
export const SPARES_PAGE_BATCH = MAX_SPARES_BATCH;

/**
 * Every asked card's spares, read in batches after the page. A batch that fails reads as none (G3): the marker is
 * absent on failure, never an error a row has to draw.
 */
export async function fetchSpares(oracleIds: readonly string[]): Promise<FriendSpare[]> {
  const out: FriendSpare[] = [];
  for (let i = 0; i < oracleIds.length; i += SPARES_PAGE_BATCH) {
    const ids = oracleIds.slice(i, i + SPARES_PAGE_BATCH);
    try {
      const res = await fetch(`/api/friend-spares?ids=${ids.map(encodeURIComponent).join(",")}`, { cache: "no-store" });
      if (!res.ok) continue;
      const body = (await res.json()) as { spares?: FriendSpare[] } | null;
      if (Array.isArray(body?.spares)) out.push(...body.spares);
    } catch {
      // Absent on failure: the next batch still reads.
    }
  }
  return out;
}

/**
 * The reader's shown asks for the cards (`GET /api/spare-requests`), read in the same batches. A batch that fails reads
 * as none: the row draws the plain glyph and the modal its Ask, and the action re-checks every ask on the server.
 */
export async function fetchAsks(oracleIds: readonly string[]): Promise<AskStateLine[]> {
  const out: AskStateLine[] = [];
  for (let i = 0; i < oracleIds.length; i += SPARES_PAGE_BATCH) {
    const ids = oracleIds.slice(i, i + SPARES_PAGE_BATCH);
    try {
      const res = await fetch(`/api/spare-requests?ids=${ids.map(encodeURIComponent).join(",")}`, { cache: "no-store" });
      if (!res.ok) continue;
      const body = (await res.json()) as { asks?: AskStateLine[] } | null;
      if (Array.isArray(body?.asks)) out.push(...body.asks);
    } catch {
      // Absent on failure: the next batch still reads.
    }
  }
  return out;
}

type Ctx = {
  /** The cards with a spare, and their friends: the cards on the list NOW only. */
  byCard: ReadonlyMap<string, FriendSpare[]>;
  /** Every card's spares read this visit, a card that left the list included (the cart keeps a line bought this
   *  visit as a held slot, and By friend draws it under the friends it sat under). */
  seen: ReadonlyMap<string, FriendSpare[]>;
  /** The card whose spares-only modal is open (swap tools off), or null. */
  opened: SpareCard | null;
  open: (card: SpareCard) => void;
  close: () => void;
  newestAsOf: Date | null;
  requests: RequestsCtx | null;
  /** The cards whose spares read has landed this visit: a card here with no row has no spare now. */
  loaded: ReadonlySet<string>;
};

/** The asks after an ask landed: Ask instead's withdrawn ask leaves (a withdrawn ask is never shown), the new one leads. */
export function afterAsk(asks: readonly AskStateLine[], press: AskPress, id: string, now: Date): AskStateLine[] {
  const kept = press.fromRequestId ? asks.filter((a) => a.id !== press.fromRequestId) : [...asks];
  return [
    {
      id, oracleId: press.oracleId, holder: { publicId: press.friend.publicId, displayName: press.friend.displayName },
      state: "open", daysLeft: SPARE_REQUEST_DAYS, createdAt: now.toISOString(), answeredAt: null,
    },
    ...kept,
  ];
}

/** An ask still open to its holder: the press's own when the card was pressed since the read was sent. */
const isOpenAsk = (a: AskStateLine) => a.state === "open" || a.state === "unavailable" || a.state === "unneeded";

/**
 * A read landing over the asks held now. It answers only for the cards it `queried`: every other card keeps what is
 * held (a sheet left open on a card that left the list keeps its Requested while the next read asks only for the rest).
 * A queried card no press moved since the read was sent takes the read whole. A pressed one keeps what the press left
 * and adds the read's answered and expired asks it does not hold, never an open one: the read was sent before the
 * press, so its open ask is the one an Ask instead withdrew.
 */
export function mergeRead(
  now: readonly AskStateLine[], read: readonly AskStateLine[], pressed: ReadonlySet<string>, queried: ReadonlySet<string>,
): AskStateLine[] {
  const held = new Set(now.map((a) => a.id));
  return [
    ...now.filter((a) => !queried.has(a.oracleId) || pressed.has(a.oracleId)),
    ...read.filter((a) => queried.has(a.oracleId) && (!pressed.has(a.oracleId) || (!isOpenAsk(a) && !held.has(a.id)))),
  ];
}

const SparesContext = createContext<Ctx | null>(null);

/** Null outside the provider: the switch is off, and no row reserves the column. */
export function usePageSpares(): Ctx | null {
  return useContext(SparesContext);
}

export function FriendSparesProvider({
  oracleIds,
  newestAsOf,
  hostSheet = true,
  requests = false,
  deckId = null,
  standalone = false,
  children,
}: {
  /** The cards the deck is buying: one read covers every row that can carry a marker. */
  oracleIds: readonly string[];
  newestAsOf: Date | null;
  /** `SPARE_REQUESTS_ENABLED` for the reader, decided by the page: the asks are read beside the spares, and the modal
   *  offers Ask. Off, nothing reads them and the modal is as shipped. */
  requests?: boolean;
  /** The deck an Ask is for: the deck page's Shopping names it, the cart sends null (G2). */
  deckId?: string | null;
  /** An Ask here is for no list (a friend's Spares tab), so Your requests never reads it as no longer needed. */
  standalone?: boolean;
  /** Draw the spares-only modal here. False where it must sit inside a card-detail provider mounted lower (the cart),
   *  which then renders `SparesSheetHost` itself. */
  hostSheet?: boolean;
  children: React.ReactNode;
}) {
  const key = useMemo(() => [...new Set(oracleIds)].sort().join(","), [oracleIds]);
  const [spares, setSpares] = useState<FriendSpare[]>([]);
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const [opened, setOpened] = useState<SpareCard | null>(null);
  const [asks, setAsks] = useState<AskStateLine[]>([]);
  useEffect(() => {
    if (!key) return;
    let live = true;
    const ids = new Set(key.split(","));
    void fetchSpares([...ids]).then((rows) => {
      // A read replaces only the cards it asked about: a card that left the list keeps what was read for it.
      if (!live) return;
      setSpares((prev) => [...prev.filter((s) => !ids.has(s.oracleId)), ...rows]);
      setLoaded((prev) => new Set([...prev, ...ids]));
    });
    return () => {
      live = false;
    };
  }, [key]);
  // The asks land after the page, as the spares do. Each card is read ONCE per visit, when it first joins the list, and
  // no read is ever thrown away: a card leaving the list (a stand-in taken, its sheet left open) neither cancels its
  // read nor drops what it held, so its sheet keeps Requested or Declined. After that read, a card's state is moved by
  // this visit's own presses. A press that answers before its card's read lands wins for that card (`mergeRead`): each
  // press bumps its card's count, and a read takes as pressed every card whose count moved since it was sent.
  const read = useRef(new Set<string>());
  const presses = useRef(new Map<string, number>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!requests || !key) return;
    const ids = key.split(",").filter((id) => !read.current.has(id));
    if (ids.length === 0) return;
    for (const id of ids) read.current.add(id);
    const sentAt = new Map(ids.map((id) => [id, presses.current.get(id) ?? 0]));
    void fetchAsks(ids).then((rows) => {
      if (!mounted.current) return;
      const pressed = new Set(ids.filter((id) => (presses.current.get(id) ?? 0) !== sentAt.get(id)));
      setAsks((now) => mergeRead(now, rows, pressed, new Set(ids)));
    });
  }, [key, requests]);
  const ask = useCallback(
    async (press: AskPress): Promise<boolean> => {
      const input = { friendPublicId: press.friend.publicId, oracleId: press.oracleId, copies: press.copies, deckId, standalone };
      let out: Awaited<ReturnType<typeof askSpareAction>>;
      try {
        out = press.fromRequestId ? await askInsteadAction({ ...input, fromRequestId: press.fromRequestId }) : await askSpareAction(input);
      } catch {
        return false;
      }
      if (!out.ok) return false;
      presses.current.set(press.oracleId, (presses.current.get(press.oracleId) ?? 0) + 1);
      const now = new Date();
      setAsks((prev) => [...afterAsk(prev.filter((a) => a.oracleId === press.oracleId), press, out.id, now), ...prev.filter((a) => a.oracleId !== press.oracleId)]);
      return true;
    },
    [deckId, standalone],
  );
  const value = useMemo<Ctx>(() => {
    // Only the cards asked for NOW: a card that left the list (bought, cut, proxied) drops its spare at once, the
    // empty list included, rather than when a later read lands.
    const asked = new Set(key ? key.split(",") : []);
    const byCard = new Map<string, FriendSpare[]>();
    const seen = new Map<string, FriendSpare[]>();
    for (const s of spares) {
      seen.set(s.oracleId, [...(seen.get(s.oracleId) ?? []), s]);
      if (asked.has(s.oracleId)) byCard.set(s.oracleId, [...(byCard.get(s.oracleId) ?? []), s]);
    }
    // The asks are NOT cut to the cards asked for now: a row only draws its own card's, and a sheet left open on a card
    // that just left the list (a stand-in taken) must still draw Requested, not offer an Ask the write would refuse.
    const asksByCard = new Map<string, AskStateLine[]>();
    for (const a of asks) asksByCard.set(a.oracleId, [...(asksByCard.get(a.oracleId) ?? []), a]);
    const req: RequestsCtx | null = requests ? { asksFor: (id) => asksByCard.get(id) ?? [], ask } : null;
    return { byCard, seen, opened, open: setOpened, close: () => setOpened(null), newestAsOf, requests: req, loaded };
  }, [spares, asks, opened, key, newestAsOf, requests, ask, loaded]);
  return (
    <SparesContext.Provider value={value}>
      <SpareRequestsContext.Provider value={value.requests}>
        {children}
        {hostSheet ? <SparesSheetHost /> : null}
      </SpareRequestsContext.Provider>
    </SparesContext.Provider>
  );
}

/**
 * The spares-only modal for the card the press opened, where it is mounted; nothing while none is open. A friend's
 * Spares tab (signature card call 8) passes its friend `first`, the box's kicker per card, and `fallback`: what the page
 * already knows of the card's spares, drawn until the read lands (a read that lands empty replaces it). Shopping and the cart pass none of them.
 */
export function SparesSheetHost({
  first,
  kickerFor,
  fallback,
}: {
  first?: string;
  kickerFor?: (oracleId: string) => string | null;
  fallback?: (oracleId: string) => FriendSpare[];
} = {}) {
  const ctx = usePageSpares();
  if (!ctx?.opened) return null;
  const id = ctx.opened.oracleId;
  return (
    <SparesSheet
      card={ctx.opened}
      spares={ctx.byCard.get(id) ?? (ctx.loaded.has(id) ? [] : fallback?.(id) ?? [])}
      newestAsOf={ctx.newestAsOf}
      onClose={ctx.close}
      {...(kickerFor ? { kicker: kickerFor(id) } : {})}
      {...(first ? { first } : {})}
    />
  );
}

/**
 * The provider's value over spares already in hand: no read and no modal, and a press opens nothing. For a figure that
 * draws the rows' spare glyph over fixtures (the About entry for friends' spares), where the page reads no friend.
 */
export function StaticSparesProvider({
  spares,
  newestAsOf,
  children,
}: {
  spares: readonly FriendSpare[];
  newestAsOf: Date | null;
  children: React.ReactNode;
}) {
  const value = useMemo<Ctx>(() => {
    const byCard = new Map<string, FriendSpare[]>();
    for (const s of spares) byCard.set(s.oracleId, [...(byCard.get(s.oracleId) ?? []), s]);
    return { byCard, seen: byCard, opened: null, open: () => {}, close: () => {}, newestAsOf, requests: null, loaded: new Set(byCard.keys()) };
  }, [spares, newestAsOf]);
  return <SparesContext.Provider value={value}>{children}</SparesContext.Provider>;
}

/**
 * The row's one other-ways press (#1875: a single press on the card row's second line, at both widths): ⇄ when a
 * cheaper stand-in can be looked for, the spare glyph when a friend holds a spare, both in that order, and nothing at
 * all when neither (no slot is kept: the buy tag sits at the right). It opens the stand-ins modal, which names the
 * friends too (PR 8a), or with the swap tools off the spares-only modal.
 */
export function OtherWaysPress({
  card,
  openStandIns,
  standIn,
  standInAria,
  limitFigure,
  className = "",
  oneLine = false,
}: {
  card: SpareCard;
  /** Opens the row's stand-ins modal: a deck row with the swap tools on whose card may be cut (never a locked one).
   *  Absent (a locked row, the cart), the press opens the spares-only modal. */
  openStandIns?: () => void;
  /** The row may look for cheaper stand-ins (the swap tools' over-limit rule, decided by the row). */
  standIn: boolean;
  /** The row's shipped name for ⇄ alone. */
  standInAria: string;
  /** The limit `over` names, for the press's name when it holds both. */
  limitFigure: string;
  /** The row's placement classes. */
  className?: string;
  /**
   * The deck row's one-line press: the 26px box at every width, with a coarse pointer's 44px hit drawn past it
   * (`TOUCH_HIT`) so the row stays 34px. Off (the cart's lines), the phone keeps its 36px press in a 44px hit.
   */
  oneLine?: boolean;
}) {
  const ctx = usePageSpares();
  const tools = useSwapTools();
  const spare = ctx?.byCard.has(card.oracleId) ?? false;
  const swap = standIn && tools !== null && openStandIns !== undefined;
  // M5 and M6 (discovery R1) share this one press: Cheaper stand-ins while it holds ⇄, a friend's spare while it holds
  // the spare glyph. Many rows register; the provider shows the first on screen, and at most one shows at a time.
  const standInMoment = useMomentAnchor("stand-ins", { eligible: swap, copy: momentsCopy.standIns(limitFigure) });
  const spareMoment = useMomentAnchor("friend-spares", { eligible: spare, copy: momentsCopy.friendSpares });
  const ref = useMergedRef(standInMoment.ref, spareMoment.ref);
  const describedBy = standInMoment["aria-describedby"] ?? spareMoment["aria-describedby"];
  if (!swap && !spare) return null;
  const name = printedFaceName(card);
  // The spare glyph's mark (call 4): requested or accepted while the reader's ask says so, plain otherwise.
  const mark: SpareMark = spare && ctx?.requests ? cardMark(ctx.requests.asksFor(card.oracleId)) : null;
  const base = swap && spare ? spareCopy.pressBothAria(name, limitFigure) : swap ? standInAria : spareCopy.markerAria(name);
  const label = mark ? spareCopy.request.markAria(base, mark) : base;
  const on = tools && openStandIns ? tools.standIns?.oracleId === card.oracleId : ctx?.opened?.oracleId === card.oracleId;
  return (
    <button
      type="button"
      ref={ref}
      data-testid="other-ways"
      aria-label={label}
      aria-describedby={describedBy}
      aria-haspopup="dialog"
      aria-expanded={on}
      onClick={() => (tools && openStandIns ? openStandIns() : ctx?.open(card))}
      // Off the one-line row (the cart), the phone keeps the shipped 44px-tall hit around the 36px press it draws, as wide as the
      // press (#1875 sets it flush beside the tag); from md the hit is the press.
      className={`flex flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 ${oneLine ? TOUCH_HIT : "h-[44px] md:h-auto"} ${className}`}
    >
      <span
        aria-hidden="true"
        // No pressed fill (#1875 draws none): the open modal is the state, and aria-expanded says it.
        className={`flex items-center bg-transparent [border:1px_solid_var(--border-strong)] ${oneLine ? "h-[26px] gap-[6px] rounded-[6px] px-[7px]" : "h-[36px] gap-[8px] rounded-[9px] px-[10px] md:h-[26px] md:gap-[6px] md:rounded-[6px] md:px-[7px]"}`}
      >
        {swap ? <span data-testid="standin-glyph" className={`font-mono leading-none text-[color:var(--warning)] ${oneLine ? "text-[14px]" : "text-[16px] md:text-[14px]"}`}>⇄</span> : null}
        {spare ? (
          <MarkedSpareGlyph mark={mark} size={16} testId="spare-glyph" />
        ) : null}
      </span>
    </button>
  );
}

/**
 * The key's item, drawn only while a spare is (S2: none in S1): among `among` when given, the cards a view draws. Then
 * `requested` and `accepted`, each only while a row draws that mark (E1: after the spare item, in the shipped order).
 */
export function SpareKeyItem({ className, among }: { className: string; among?: ReadonlySet<string> }) {
  const ctx = usePageSpares();
  if (!ctx || ctx.byCard.size === 0) return null;
  const drawn = [...ctx.byCard.keys()].filter((id) => !among || among.has(id));
  if (drawn.length === 0) return null;
  const marks = new Set(ctx.requests ? drawn.map((id) => cardMark(ctx.requests!.asksFor(id))) : []);
  return (
    <>
      <span className={className} data-testid="spare-key">
        <span className="flex w-[18px] justify-center">
          <MarkedSpareGlyph mark={null} size={16} />
        </span>
        {spareCopy.key}
      </span>
      {marks.has("requested") ? (
        <span className={className} data-testid="spare-key-requested">
          <span className="flex w-[18px] justify-center">
            <MarkedSpareGlyph mark="requested" size={16} />
          </span>
          {spareCopy.request.keyRequested}
        </span>
      ) : null}
      {marks.has("accepted") ? (
        <span className={className} data-testid="spare-key-accepted">
          <span className="flex w-[18px] justify-center">
            <MarkedSpareGlyph mark="accepted" size={16} />
          </span>
          {spareCopy.request.keyAccepted}
        </span>
      ) : null}
    </>
  );
}

/**
 * The spares-only modal (plan, "Stand-ins modal"): opened by the press where no stand-ins can be read (the swap tools
 * off here; the cart in PR B). The stand-ins modal's shell and Replacing box, with no deck line and no job line,
 * since both come from the stand-ins read; then the friends.
 */
export function SparesSheet({
  card,
  spares,
  newestAsOf,
  onClose,
  kicker,
  first,
}: {
  card: SpareCard;
  spares: readonly FriendSpare[];
  newestAsOf: Date | null;
  onClose: () => void;
  /** The box's kicker: the shipped `replacing` when absent, none when null (a friend's tab: `on your wishlist` or nothing). */
  kicker?: string | null;
  /** A friend's public id listed first, then the shipped order (the friend whose page the modal opened on). */
  first?: string;
}) {
  return (
    <HoverPreviewProvider waitForMove>
      <ModalChrome title={spareCopy.modalTitleSpares} closeLabel={spareCopy.close} onClose={onClose} width={640}>
        <SparesSheetBody card={card} spares={spares} newestAsOf={newestAsOf} kicker={kicker} first={first} />
      </ModalChrome>
    </HoverPreviewProvider>
  );
}

/**
 * The spares-only modal's body: the Replacing box and the friends. Its own component so the About entry for friends'
 * spares draws the modal's own parts in place over a fixture (inside `ModalPanel`), with no overlay and no read.
 */
export function SparesSheetBody({
  card,
  spares,
  newestAsOf,
  kicker = spareCopy.replacing,
  first,
}: {
  card: SpareCard;
  spares: readonly FriendSpare[];
  newestAsOf: Date | null;
  kicker?: string | null;
  first?: string;
}) {
  const name = printedFaceName(card);
  return (
    <div data-testid="spares-sheet" className="flex flex-col gap-[12px] px-[16px] pb-[24px] pt-[14px] md:gap-[14px] md:px-[18px] md:pb-[18px] md:pt-[16px]">
      <section
        className="flex flex-col gap-[6px] rounded-[10px] border border-[color:var(--border)] px-[13px] pb-[12px] pt-[11px]"
        style={{ background: "var(--bg)" }}
      >
        {kicker === null ? null : (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color: "var(--fg-faint)" }}>
            {kicker}
          </span>
        )}
        <ReplacingLine imageUri={card.imageUri ?? null}>
          <Thumb imageUri={card.imageUri ?? null} side="head" />
          <span aria-hidden="true" className="h-[7px] w-[7px] flex-none rounded-full" style={{ border: "1px dashed var(--fg-faint)" }} />
          <CardDetailTrigger
            oracleId={card.oracleId}
            name={name}
            className="cursor-pointer border-0 bg-transparent p-0 text-left text-[14px] font-semibold"
            style={{ color: "var(--fg)", borderBottom: "1px dotted var(--accent)" }}
          >
            {name}
          </CardDetailTrigger>
          <BuyTag variant="row" price={card.price ?? null} newestAsOf={newestAsOf} />
        </ReplacingLine>
      </section>
      <FriendSpareSection spares={spares} card={card} first={first} />
    </div>
  );
}
