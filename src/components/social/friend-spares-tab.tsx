"use client";
// A friend's Spares tab (menu and Home PR 7; board `Friends`): the full cards the friend offers, each with its spare
// count, cards on the reader's wishlist first and marked under the count. View only: a press on the card opens card
// details, as every card does, and nothing asks for the card.
//
// With spare requests on (`asks`, signature card calls 8 and 9; handoff `design_handoff_the99_avatar`, board Spares), a
// tile press opens the shipped spares-only modal for that card instead, with Ask, the page's friend first and the box's
// kicker `on your wishlist` (or none); card details stay one press away, on the card's name in the box. The tile is
// ringed while its modal is open and when focus comes back to it, and its count line carries this friend's ask in the
// modal's words. `?spare={oracleId}` opens that card's modal on landing, or, the spare gone, draws the shared toast; the
// parameter is stripped either way.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FriendSpare, FriendSpareLine, FriendSpareList } from "../../lib/social/spares";
import type { ProfileCommander } from "../../lib/social/commander";
import { socialCopy, spareCopy } from "../../lib/copy/social";
import { mirrorUrl } from "../../lib/url/mirror";
import type { PriceFact } from "../../lib/decks/price";
import { CardDetailProvider, CardDetailTrigger, cardDetailCopy, type SiblingCard } from "../cards/card-detail-provider";
import { HydratedImg } from "../ui/hydrated-art";
import { FriendSparesProvider, SparesSheetHost, usePageSpares, type SpareCard } from "./spare-markers";
import { rowAsk } from "./friend-spares";
import { SocialToast, type SocialToastState } from "./social-toast";

/** Spare requests on this tab (`SPARE_REQUESTS_ENABLED` for the reader), decided by the page; absent, the tab is as shipped. */
export type FriendSparesAsks = {
  friend: { publicId: string; displayName: string; commander: ProfileCommander | null };
  /** `?spare=`'s card, a uuid, or null. */
  spare: string | null;
  /** The catalog's name for `spare` when the friend no longer offers it (the toast's card), else null. */
  goneName: string | null;
  /** Each spare's price as Shopping reads it (`loadPrices`), for the modal's buy tag; a card absent draws the bare tag. */
  prices: Record<string, PriceFact>;
  newestAsOf: Date | null;
};

const p = socialCopy.friendPage;
const EAGER_TILES = 4;

export function FriendSparesTab({ name, spares, asks }: { name: string; spares: FriendSpareList | null; asks?: FriendSparesAsks }) {
  const router = useRouter();
  // A wishlist write from a spare's details moves its mark and its place: refresh the page, as the Wishlist tab does.
  const onWishlistWrite = useCallback(() => router.refresh(), [router]);
  if (spares === null || spares.lines.length === 0) {
    const empty = spares === null
      ? <Empty title={p.spares.noneTitle(name)} body={p.spares.noneBody(name)} />
      : <Empty title={p.spares.emptyTitle(name)} body={p.spares.emptyBody(name)} />;
    return asks ? <>{empty}<SpareLanding asks={asks} find={() => null} /></> : empty;
  }
  const { lines } = spares;
  const siblings: SiblingCard[] = lines.map((l) => ({ oracleId: l.oracleId, name: l.name, imageUri: l.imageUri }));
  if (asks) return <AskTab spares={spares} asks={asks} onWishlistWrite={onWishlistWrite} />;
  return (
    <>
      <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-faint)]">{p.spares.line(spares.pods, spares.wishlist)}</p>
      <CardDetailProvider onWishlistWrite={onWishlistWrite}>
        {/* The board's grid: two columns on a phone, six from desktop. */}
        <ul className="m-0 mt-[12px] grid list-none grid-cols-2 gap-x-[8px] gap-y-[12px] p-0 md:grid-cols-6 md:gap-[20px]">
          {lines.map((line, i) => {
            const count = p.spares.count(line.spare);
            return (
              <li key={line.oracleId} data-testid="spare-tile" className="flex min-w-0 flex-col gap-[6px]">
                <CardDetailTrigger
                  oracleId={line.oracleId}
                  name={line.name}
                  siblings={siblings}
                  imageUri={line.imageUri}
                  ariaLabel={`${cardDetailCopy.triggerAria(line.name)}, ${count}${line.onWishlist ? `, ${p.spares.onWishlist}` : ""}`}
                  className="relative block w-full cursor-pointer overflow-hidden p-0 [aspect-ratio:63/88] [border-radius:4.5%/3.2%] [border:1px_solid_var(--border)] bg-[color:var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                >
                  {line.imageUri ? (
                    <HydratedImg
                      eager={i < EAGER_TILES}
                      src={line.imageUri}
                      alt=""
                      decoding="async"
                      className="absolute inset-0 block h-full w-full object-cover object-center"
                    />
                  ) : (
                    // No art: the name in the card's place, so the spare can be told apart without opening it.
                    <span aria-hidden data-testid="spare-name" className="absolute inset-0 flex items-center justify-center p-[10px] text-center text-[12px] font-semibold leading-[1.3] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">
                      {line.name}
                    </span>
                  )}
                </CardDetailTrigger>
                <span className="flex flex-col gap-[3px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">
                  <span>{count}</span>
                  {line.onWishlist && (
                    <span data-testid="spare-on-wishlist" className="inline-flex items-center gap-[4px] text-[color:var(--accent-text)]">
                      <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                        <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
                      </svg>
                      {p.spares.onWishlist}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </CardDetailProvider>
    </>
  );
}

const TILE_BOX = "relative block w-full cursor-pointer overflow-hidden p-0 [aspect-ratio:63/88] [border-radius:4.5%/3.2%] [border:1px_solid_var(--border)] bg-[color:var(--surface-sunken)]";
/** The board's `.ti.lit` (2px accent, 3px off): ringed while its modal is open, and when focus comes back to it. */
const RING = "outline-solid outline-2 outline-offset-[3px] outline-[color:var(--accent)]";
const RING_ON_FOCUS = "focus:outline-solid focus:outline-2 focus:outline-offset-[3px] focus:outline-[color:var(--accent)]";

function AskTab({ spares, asks, onWishlistWrite }: {
  spares: FriendSpareList; asks: FriendSparesAsks; onWishlistWrite: () => void;
}) {
  const { lines } = spares;
  const ids = useMemo(() => lines.map((l) => l.oracleId), [lines]);
  const byId = useMemo(() => new Map(lines.map((l) => [l.oracleId, l])), [lines]);
  const { friend } = asks;
  // What the page already knows of a card's spares (this friend's), drawn until the read of every friend's lands.
  const fallback = useCallback((id: string): FriendSpare[] => {
    const line = byId.get(id);
    return line ? [{ oracleId: id, friend: { ...friend, pods: spares.pods }, spare: line.spare }] : [];
  }, [byId, friend, spares.pods]);
  const kickerFor = useCallback((id: string) => (byId.get(id)?.onWishlist ? p.spares.onWishlist : null), [byId]);
  const tiles = useRef(new Map<string, HTMLButtonElement>());
  return (
    <>
      <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-faint)]">
        {p.spares.line(spares.pods, spares.wishlist)}{p.spares.pressToAsk}
      </p>
      <CardDetailProvider onWishlistWrite={onWishlistWrite}>
        <FriendSparesProvider oracleIds={ids} newestAsOf={asks.newestAsOf} requests deckId={null} standalone sparesOnOpen hostSheet={false}>
          <SparesSheetHost first={friend.publicId} kickerFor={kickerFor} fallback={fallback} />
          {/* Four columns until xl: at md's narrow end six leave a tile too narrow for its one-line Requested caption. */}
          <ul className="m-0 mt-[12px] grid list-none grid-cols-2 gap-x-[8px] gap-y-[12px] p-0 md:grid-cols-4 md:gap-[20px] xl:grid-cols-6">
            {lines.map((line, i) => (
              <AskTile key={line.oracleId} line={line} price={asks.prices[line.oracleId] ?? null} eager={i < EAGER_TILES} friend={friend.publicId}
                tileRef={(el) => { if (el) tiles.current.set(line.oracleId, el); else tiles.current.delete(line.oracleId); }} />
            ))}
          </ul>
          <SpareLanding asks={asks} find={(id) => {
            const line = byId.get(id);
            return line ? { card: asSpareCard(line, asks.prices[id] ?? null), tile: tiles.current.get(id) ?? null } : null;
          }} />
        </FriendSparesProvider>
      </CardDetailProvider>
    </>
  );
}

const asSpareCard = (line: FriendSpareLine, price: PriceFact | null): SpareCard => ({
  oracleId: line.oracleId, name: line.name, printedName: null, layout: null, imageUri: line.imageUri, price,
});

function AskTile({ line, price, eager, friend, tileRef }: {
  line: FriendSpareLine; price: PriceFact | null; eager: boolean; friend: string; tileRef: (el: HTMLButtonElement | null) => void;
}) {
  const ctx = usePageSpares();
  const open = ctx?.opened?.oracleId === line.oracleId;
  const count = p.spares.count(line.spare);
  // THIS friend's ask for the card, in the modal's words: Requested while open, Accepted after a yes, else nothing.
  const ask = ctx?.requests ? rowAsk(ctx.requests.asksFor(line.oracleId), friend).kind : null;
  const state = ask === "requested" ? spareCopy.request.requested : ask === "accepted" ? spareCopy.request.accepted : null;
  const aria = [spareCopy.markerAria(line.name), count, line.onWishlist ? p.spares.onWishlist : null, state].filter(Boolean).join(", ");
  return (
    <li data-testid="spare-tile" className="flex min-w-0 flex-col gap-[6px]">
      <button
        type="button"
        ref={tileRef}
        data-testid="spare-tile-press"
        data-open={open ? "" : undefined}
        aria-label={aria}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          // Safari does not focus a pressed button, and the sheet hands focus back to whatever held it at open: the tile
          // takes it first, so ✕ returns to the tile (and its ring) on every engine.
          e.currentTarget.focus();
          ctx?.open(asSpareCard(line, price));
        }}
        className={`${TILE_BOX} ${RING_ON_FOCUS} ${open ? RING : ""}`}
      >
        <TileArt line={line} eager={eager} />
      </button>
      <span className="flex flex-col gap-[3px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">
        <span data-testid="spare-count" className="flex items-center gap-[5px] whitespace-nowrap">
          <span>{count}</span>
          {state ? (
            <>
              <span aria-hidden>·</span>
              {ask === "requested" ? (
                <span data-testid="spare-ask" data-ask="requested" className="inline-flex items-center gap-[6px] text-[color:var(--accent-text)]">
                  <i aria-hidden className="size-[7px] rounded-full bg-[color:var(--accent)]" />
                  {state}
                </span>
              ) : (
                <span data-testid="spare-ask" data-ask="accepted" className="text-[color:var(--success)]">✓ {state}</span>
              )}
            </>
          ) : null}
        </span>
        {line.onWishlist && <WishlistMark />}
      </span>
    </li>
  );
}

function TileArt({ line, eager }: { line: FriendSpareLine; eager: boolean }) {
  return line.imageUri ? (
    <HydratedImg eager={eager} src={line.imageUri} alt="" decoding="async" className="absolute inset-0 block h-full w-full object-cover object-center" />
  ) : (
    <span aria-hidden data-testid="spare-name" className="absolute inset-0 flex items-center justify-center p-[10px] text-center text-[12px] font-semibold leading-[1.3] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">
      {line.name}
    </span>
  );
}

function WishlistMark() {
  return (
    <span data-testid="spare-on-wishlist" className="inline-flex items-center gap-[4px] text-[color:var(--accent-text)]">
      <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
      </svg>
      {p.spares.onWishlist}
    </span>
  );
}

/**
 * `?spare=` on landing (call 9), once: the parameter is stripped first (so the modal's own history entry carries the
 * clean address), then a card the friend still offers has its modal opened over its tile, focused first so ✕ hands
 * focus back to it; a spare gone since draws the shared toast and no modal.
 */
function SpareLanding({ asks, find }: {
  asks: FriendSparesAsks;
  /** The card and its tile when the card is on the tab, else null. */
  find: (oracleId: string) => { card: SpareCard; tile: HTMLButtonElement | null } | null;
}) {
  const ctx = usePageSpares();
  const done = useRef(false);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const url = new URL(window.location.href);
    // Only a parameter still in the address lands: Back can restore this payload and remount the tab after the strip,
    // and that remount must neither reopen the sheet nor replay the toast.
    if (!url.searchParams.has("spare")) return;
    url.searchParams.delete("spare");
    mirrorUrl(url);
    if (!asks.spare) return;
    const found = find(asks.spare);
    if (!found) {
      // A spare gone since: the toast, and no modal.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is read only after mount, and decides the toast
      if (asks.goneName) setToast({ id: 1, text: p.spares.gone(asks.friend.displayName, asks.goneName) });
      return;
    }
    found.tile?.focus();
    ctx?.open(found.card);
  }, [asks, find, ctx]);
  return <SocialToast toast={toast} onDone={() => setToast(null)} />;
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-[16px] flex flex-col gap-[6px] rounded-[12px] px-[20px] py-[22px] [border:1px_dashed_var(--border-dashed)] md:mt-[18px] md:px-[32px] md:py-[30px]">
      <p className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)] [overflow-wrap:anywhere] md:text-[19px]">{title}</p>
      <p className="m-0 max-w-[600px] text-[14px] leading-[1.6] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">{body}</p>
    </div>
  );
}
