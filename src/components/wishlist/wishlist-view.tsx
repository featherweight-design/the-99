"use client";
// Collection › Wishlist (Social R2 PR 4, boards W1–W5 and WP1–WP5): the search over the grid, the desktop sort, the
// one-time collected strip, the meta line and the tiles, or the empty state.
//
// The tiles are the server's, with what this visit's writes changed laid over them, so a card added from the search
// shows at once; every settled write also asks the router for the page again, and the fresh list then agrees.

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { wishlistCopy } from "../../lib/copy/wishlist";
import { CardDetailProvider, CardDetailTrigger, cardDetailCopy, type SiblingCard } from "../cards/card-detail-provider";
import { CARD_GRID_TRACKS } from "../ui/card-grid";
import { ArrivalDismiss } from "../decks/arrival-strip";
import { ToastFrame, useToastClock } from "../collection/edit-toast";
import { GRID_EAGER_TILES } from "../collection/grid-view";
import { dismissCollectedAction } from "../../app/collection/wishlist/actions";
import { WishlistSearch } from "./wishlist-search";
import { Parts, WISHLIST_TILE_SHELL, WishlistTileFace, wishlistCaptionText } from "./wishlist-tile";

const copy = wishlistCopy;

/** A tile as the page hands it over: plain and serializable, `addedAt` an ISO string. */
export type WishlistViewTile = { oracleId: string; name: string; imageUri: string | null; want: number; have: number; addedAt: string };
/** A collected notice as the strip draws it and sends it back: `collectedAt` exactly as it was read, an ISO string. */
export type WishlistViewNotice = { oracleId: string; name: string; collectedAt: string };

type Sort = "newest" | "name";

export function WishlistView({
  tiles: served,
  notices,
  hasFriend,
}: {
  tiles: WishlistViewTile[];
  notices: WishlistViewNotice[];
  hasFriend: boolean;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("newest");
  const [searching, setSearching] = useState(false);
  // The notices this visit's ✕ dismissed, by card and time, so a notice a later refresh brings is still drawn.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const noticeKey = (n: WishlistViewNotice) => `${n.oracleId}|${n.collectedAt}`;
  const shownNotices = notices.filter((n) => !dismissed.has(noticeKey(n)));
  const [toast, setToast] = useState<"add" | "set" | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  // Hover and focus hold the toast's window separately, as the other alert toasts do. The frame stays mounted while a
  // second failure replaces the first, so its holds stay true, and it only leaves once neither holds it.
  const [toastHover, setToastHover] = useState(false);
  const [toastFocus, setToastFocus] = useState(false);
  const { restart } = useToastClock(toastRef, toast !== null && !toastHover && !toastFocus, () => setToast(null));

  // The server's list is the only source of tiles: a settled write refreshes it, so a card collected elsewhere, or a
  // count moved elsewhere, is never held over by a copy this view kept.
  const tiles = useMemo(() => {
    if (sort === "name") return [...served].sort((a, b) => a.name.localeCompare(b.name));
    return [...served].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }, [served, sort]);

  const onWant = useCallback(() => router.refresh(), [router]);

  const onFailure = useCallback(
    (kind: "add" | "set") => {
      // A new failure gets the whole window, whatever the last one spent.
      restart();
      setToast(kind);
    },
    [restart],
  );

  function dismissStrip() {
    const drawn = shownNotices;
    setDismissed((prev) => new Set([...prev, ...drawn.map(noticeKey)]));
    void dismissCollectedAction(drawn.map((n) => ({ oracleId: n.oracleId, collectedAt: n.collectedAt }))).catch(() => {});
  }

  const siblings: SiblingCard[] = tiles.map((t) => ({ oracleId: t.oracleId, name: t.name, imageUri: t.imageUri }));
  const names = shownNotices.map((n) => n.name);
  const strongStrip = "font-medium text-[color:var(--fg)]";

  return (
    <CardDetailProvider onWishlistWrite={onWant}>
      <div className="flex flex-col">
        <div className="flex items-center gap-[12px] px-[14px] pt-[14px] md:px-[34px] md:pt-[18px]">
          <WishlistSearch onOpenChange={setSearching} onWant={onWant} onFailure={onFailure} />
          {tiles.length > 0 && (
            // The pill reads `Sort: Newest ▾`; the native select lies transparent over it and takes the press.
            <label className="relative ml-auto hidden h-[44px] flex-none cursor-pointer items-center gap-[10px] rounded-[9px] border border-solid border-[color:var(--surface-raised)] bg-[color:var(--surface-raised)] px-[16px] text-[14.5px] font-medium text-[color:var(--fg)] focus-within:border-[color:var(--accent)] md:inline-flex">
              <span aria-hidden>
                {copy.page.sort.lead} {sort === "name" ? copy.page.sort.name : copy.page.sort.newest}
              </span>
              <span aria-hidden>▾</span>
              <select
                aria-label={copy.page.sort.label}
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent opacity-0"
              >
                <option value="newest">{copy.page.sort.newest}</option>
                <option value="name">{copy.page.sort.name}</option>
              </select>
            </label>
          )}
        </div>

        <div>
          {shownNotices.length > 0 && (
            <div
              role="status"
              className="mx-[14px] mt-[12px] flex items-start gap-[12px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-[16px] py-[12px] text-[13.5px] text-[color:var(--fg-body)] md:mx-[34px] md:mt-[14px] md:items-center md:text-[14px]"
            >
              <span aria-hidden className="flex-none text-[16px] text-[color:var(--success)]">✓</span>
              <span className="min-w-0 flex-1">
                <span className="hidden md:inline">
                  <Parts parts={copy.page.collectedLeft(names)} strong={strongStrip} />
                </span>
                <span className="md:hidden">
                  <Parts parts={copy.page.collectedLeftShort(names)} strong={strongStrip} />
                </span>
              </span>
              <ArrivalDismiss onDismiss={dismissStrip} label={copy.page.dismiss} />
            </div>
          )}

          {tiles.length > 0 ? (
            <>
              {/* On a phone the open panel covers this row, so it is not drawn then (WP2). */}
              <div
                className={`${searching ? "hidden md:flex" : "flex"} flex-col px-[14px] pt-[12px] font-mono text-[11.5px] md:flex-row md:items-center md:justify-between md:px-[34px] md:pt-[14px] md:text-[12.5px]`}
              >
                <span className="text-[color:var(--fg-muted)]">{copy.page.meta(tiles.length)}</span>
                {hasFriend && <span className="pt-[6px] text-[color:var(--fg-faint)] md:pt-0">{copy.page.friendsLine}</span>}
              </div>
              <ul
                data-testid="wishlist-behind"
                className={`m-0 grid list-none ${CARD_GRID_TRACKS} gap-[8px] px-[14px] pb-[14px] pt-[12px] transition-opacity md:gap-[20px] md:px-[34px] md:pb-[34px] md:pt-[18px] ${searching ? "mt-[30px] opacity-[.35] md:mt-0 md:opacity-[.4]" : ""}`}
              >
                {tiles.map((t, i) => (
                  <WishlistTile key={t.oracleId} tile={t} eager={i < GRID_EAGER_TILES} siblings={siblings} />
                ))}
              </ul>
            </>
          ) : (
            !searching && <EmptyState />
          )}
        </div>

        {toast && (
          <ToastFrame
            frameRef={toastRef}
            role="alert"
            onHold={(kind, on) => (kind === "hover" ? setToastHover : setToastFocus)(on)}
            title={toast === "add" ? copy.details.failedAdd : copy.details.failedSet}
          />
        )}
      </div>
    </CardDetailProvider>
  );
}

function WishlistTile({ tile, eager, siblings }: { tile: WishlistViewTile; eager: boolean; siblings: SiblingCard[] }) {
  // The whole tile, art and caption, is the press that opens card details, so everything inside it is a span: a button
  // holds phrasing content only.
  return (
    <li className="flex flex-col" data-testid="wishlist-tile">
      <CardDetailTrigger
        oracleId={tile.oracleId}
        name={tile.name}
        siblings={siblings}
        imageUri={tile.imageUri}
        ariaLabel={`${cardDetailCopy.triggerAria(tile.name)}, ${wishlistCaptionText(tile)}`}
        className={`${WISHLIST_TILE_SHELL} art-lift-host md:hover:border-[color:var(--accent)] transition-colors`}
      >
        <WishlistTileFace tile={tile} eager={eager} />
      </CardDetailTrigger>
    </li>
  );
}

/** Nothing on the list yet (W4/WP4): two ghost cards, the title and what the list is for. */
function EmptyState() {
  const ghost =
    "h-[81px] w-[58px] md:h-[103px] md:w-[74px] flex-none rounded-[7px] border border-dashed border-[color:var(--border-dashed)] [background:repeating-linear-gradient(135deg,var(--surface)_0_3px,var(--surface-rail)_3px_6px)]";
  return (
    <div
      data-testid="wishlist-empty"
      className="mx-[14px] mt-[16px] block rounded-[12px] border border-dashed border-[color:var(--border-dashed)] px-[20px] py-[22px] md:mx-[34px] md:mt-[22px] md:flex md:items-center md:gap-[28px] md:px-[32px] md:py-[30px]"
    >
      <div aria-hidden className="mb-[16px] flex items-center gap-[10px] md:mb-0 md:flex-none">
        <span className={ghost} />
        <span className={`${ghost} rotate-[4deg]`} />
      </div>
      <div className="min-w-0">
        <h2 className="m-0 mb-[6px] font-display text-[18px] font-bold text-[color:var(--fg)] md:text-[19px]">{copy.page.emptyTitle}</h2>
        <p className="m-0 max-w-[600px] text-[14px] leading-[1.6] text-[color:var(--fg-muted)]">{copy.page.emptyBody}</p>
      </div>
    </div>
  );
}
