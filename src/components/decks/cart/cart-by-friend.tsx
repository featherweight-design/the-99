"use client";

// By friend — the cart's third view (spare requests PR 3c; handoff `design_handoff_the99_spare_requests`, call 1 and
// board `Cart-By-Friend`). The same selected lines, grouped under each friend who holds a spare of them, most spares
// first; a card two friends hold sits under both. In this view the spare glyph would say nothing, so the line's press
// is the Ask itself: the modal's own state rule (`rowAsk`) and its one way to ask (`SpareRequestsContext`'s `ask`), so
// the modal and this view always agree. One open ask per card holds here too: a second friend's line reads Ask
// instead, which moves it.
//
// v2 (PR 6): each line is the cart's fact row in By friend's grid, the Ask over the tag; each panel folds from its
// header, and on desktop that header sticks to the top of the list box while its rows scroll (addendum R2, B3).

import { useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { spareCopy } from "../../../lib/copy/social";
import type { OwnFact, SelectedLine } from "../../../lib/decks/cart";
import type { FriendSpare, SpareFriend } from "../../../lib/social/spares";
import { frontFaceName } from "../../../lib/cards/faces";
import { usePageSpares } from "../../social/spare-markers";
import { RowEnd, SpareRequestsContext, rowAsk, type RequestsCtx } from "../../social/friend-spares";
import { Face } from "../../social/face";
import { SocialToast, type SocialToastState } from "../../social/social-toast";
import { Chevron } from "../../ui/chevron";
import { CartFriendLine, CartHeldSlot } from "./cart-line";
import { NameFitProvider } from "./cart-facts";

/** One friend's panel: who they are, the spares they hold of the drawn lines, and those lines in the cart's order. */
/** `spareOf`: this friend's spare copies of each line's card, so the line can say how many before an Ask (Hugh, 2026-10-27). */
export type FriendGroup = { friend: SpareFriend; spares: number; lines: SelectedLine[]; spareOf: Map<string, number> };

/** Lines bought this visit that the read no longer lists, by card, with the copies the press added (S3's held slot). */
export type HeldLines = ReadonlyMap<string, number>;
const NO_HELD: HeldLines = new Map();

/**
 * The panels for these lines (already in the by-card order), most spares first, then by name (R1 decision 16's order
 * for people). A spare is counted in copies, as the modal's friend row counts it.
 */
export function groupByFriend(
  lines: readonly SelectedLine[], byCard: ReadonlyMap<string, readonly FriendSpare[]>,
  held: HeldLines = NO_HELD, seen: ReadonlyMap<string, readonly FriendSpare[]> = byCard,
): FriendGroup[] {
  const groups = new Map<string, FriendGroup>();
  for (const line of lines) {
    // A held line has left the list, so its spares are the ones read for it this visit: it keeps its place under them.
    for (const s of byCard.get(line.oracleId) ?? (held.has(line.oracleId) ? seen.get(line.oracleId) : undefined) ?? []) {
      const g: FriendGroup = groups.get(s.friend.publicId) ?? { friend: s.friend, spares: 0, lines: [], spareOf: new Map() };
      if (!g.lines.includes(line)) g.lines.push(line);
      g.spares += s.spare;
      g.spareOf.set(line.oracleId, s.spare);
      groups.set(s.friend.publicId, g);
    }
  }
  return [...groups.values()].sort((a, b) =>
    b.spares - a.spares
    || a.friend.displayName.localeCompare(b.friend.displayName, "en-US", { sensitivity: "base" })
    || (a.friend.publicId < b.friend.publicId ? -1 : 1));
}

/**
 * What By friend can say about these lines (v2 G2, G5), or null with spare requests off (no Ask to offer):
 *   - `groups`: a drawn line has a friend's spare, so the panels draw;
 *   - `reading`: none yet, and a drawn line's spares have not landed;
 *   - `failed`: none, every read landed, and one of them failed, so nothing may say there is none;
 *   - `none`: every read landed and no friend has a spare of any drawn line.
 * Only `groups` draws the view today; the other three are v2's reading and empty states (plan PR 7).
 */
export type ByFriend =
  | { status: "groups"; groups: FriendGroup[]; requests: RequestsCtx }
  | { status: "reading" | "failed" | "none" };

export function byFriendStatus(
  groups: readonly FriendGroup[], lines: readonly SelectedLine[], loaded: ReadonlySet<string>, failed: ReadonlySet<string>,
): "groups" | "reading" | "failed" | "none" {
  if (groups.length > 0) return "groups";
  if (lines.some((l) => !loaded.has(l.oracleId))) return "reading";
  return lines.some((l) => failed.has(l.oracleId)) ? "failed" : "none";
}

export function useByFriend(lines: readonly SelectedLine[], held: HeldLines = NO_HELD): ByFriend | null {
  const spares = usePageSpares();
  const requests = useContext(SpareRequestsContext);
  const groups = useMemo(() => (spares ? groupByFriend(lines, spares.byCard, held, spares.seen) : []), [lines, spares, held]);
  if (!spares || !requests) return null;
  const status = byFriendStatus(groups, lines, spares.loaded, spares.failed);
  return status === "groups" ? { status, groups, requests } : { status };
}

/** By friend's panels, while it has some: what the switch's segment and a `?view=friend` arrival wait for today. */
export const friendGroups = (b: ByFriend | null) => (b?.status === "groups" ? b : null);

const lineKey = (publicId: string, oracleId: string) => `${publicId}:${oracleId}`;

export function ByFriendList({
  groups,
  requests,
  held = NO_HELD,
  deckNames,
  ownOf,
  shut,
  onFold,
  newestAsOf,
}: {
  groups: readonly FriendGroup[];
  requests: RequestsCtx;
  /** Lines bought this visit and gone from the read: drawn as By card draws them, a held slot where the line was. */
  held?: HeldLines;
  deckNames: Map<string, string>;
  /** The own fact of a line (`ownFact`), as By card reads it. */
  ownOf: (line: SelectedLine) => OwnFact | null;
  /** The friends whose panels are folded (by public id): kept by the cart for the visit, so a view switch keeps them. */
  shut: ReadonlySet<string>;
  onFold: (publicId: string) => void;
  newestAsOf: Date | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const seq = useRef(0);
  // FOCUS AFTER AN ASK, as the modal does: the pressed Ask gives way to the line's Requested, so the focused control
  // leaves the document. Focus lands on that status, unless the reader has moved on.
  const listRef = useRef<HTMLDivElement | null>(null);
  const landOn = useRef<string | null>(null);
  useEffect(() => {
    const key = landOn.current;
    if (!key) return;
    landOn.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const li = [...(listRef.current?.querySelectorAll<HTMLElement>("li[data-friend-line]") ?? [])].find((el) => el.dataset.friendLine === key);
    li?.querySelector<HTMLElement>('[data-testid="friend-spare-status"]')?.focus();
  });
  async function press(friend: SpareFriend, line: SelectedLine, fromRequestId?: string) {
    if (busy) return;
    const key = lineKey(friend.publicId, line.oracleId);
    setBusy(key);
    // The copies the line needs (G2), for no one deck: the cart's provider sends a null deck.
    const ok = await requests.ask({
      friend: { publicId: friend.publicId, displayName: friend.displayName },
      oracleId: line.oracleId,
      copies: Math.max(1, line.copies),
      fromRequestId,
    });
    setBusy(null);
    if (!ok) setToast({ id: ++seq.current, text: spareCopy.request.failed });
    else landOn.current = key;
  }
  return (
    <NameFitProvider>
    {/* 12px between panels (`.fpn + .fpn`); on desktop 10 under the column header's rule, which sits above the box. */}
    <div ref={listRef} data-testid="cart-by-friend" className="flex flex-col gap-[12px] pt-[2px] xl:pt-[10px]">
      {groups.map((g) => (
        <FriendPanel key={g.friend.publicId} group={g} open={!shut.has(g.friend.publicId)} onFold={() => onFold(g.friend.publicId)}>
          {g.lines.map((line) => {
            const added = held.get(line.oracleId);
            if (added !== undefined) return <CartHeldSlot key={line.oracleId} name={line.name} added={added} />;
            const key = lineKey(g.friend.publicId, line.oracleId);
            const ask = rowAsk(requests.asksFor(line.oracleId), g.friend.publicId);
            return (
              <CartFriendLine
                key={line.oracleId}
                data={{ "data-friend-line": key, "data-ask": ask.kind }}
                line={line}
                deckNames={deckNames}
                own={ownOf(line)}
                spare={g.spareOf.get(line.oracleId) ?? 0}
                newestAsOf={newestAsOf}
                ask={
                  <RowEnd
                    size="cart"
                    ask={ask}
                    friend={g.friend.displayName}
                    card={frontFaceName(line.name, line.layout)}
                    busy={busy === key}
                    locked={busy !== null}
                    onAsk={() => void press(g.friend, line, ask.kind === "askInstead" ? ask.fromRequestId : undefined)}
                  />
                }
              />
            );
          })}
        </FriendPanel>
      ))}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </div>
    </NameFitProvider>
  );
}

/**
 * One friend's panel (`.fpn`): its header is the fold press (call 7, the By deck group's shape), and open, its rows.
 *
 * Desktop (from `md`, where the list scrolls in its own box): the header is `position: sticky; top: 0` in that box, and
 * stuck it looks exactly as at rest, its `--elevated` fill and its own `--border-strong` rule, nothing added (addendum R2,
 * B3). The panel is its containing block, so the next panel's header pushes it out. The panel clips its corners with
 * `overflow: clip`, never `hidden`, which would make it a scroll container and stop the header sticking. Phone: the page
 * scrolls under the pinned controls, and the header scrolls with its rows.
 */
function FriendPanel({ group: g, open, onFold, children }: { group: FriendGroup; open: boolean; onFold: () => void; children: React.ReactNode }) {
  const bodyId = useId();
  const figureId = useId();
  return (
    <section
      data-testid="friend-panel"
      data-friend={g.friend.publicId}
      aria-label={copy.byFriend.panelAria(g.friend.displayName)}
      className="overflow-clip rounded-[12px] border border-[color:var(--border-strong)] bg-[color:var(--bg)]"
    >
      <h3 data-panel-head className="m-0 md:sticky md:top-0 md:z-[1]">
        <button
          type="button"
          onClick={onFold}
          aria-expanded={open}
          aria-controls={open ? bodyId : undefined}
          aria-label={copy.byFriend.foldAria(g.friend.displayName, open)}
          aria-describedby={figureId}
          className={`flex min-h-[52px] w-full cursor-pointer items-center focus-visible:-outline-offset-2 gap-[11px] bg-[color:var(--elevated)] py-[9px] pl-[14px] pr-[8px] text-left font-[inherit] ${
            open ? "border-b border-b-[color:var(--border-strong)]" : ""
          }`}
        >
          <Face name={g.friend.displayName} commander={g.friend.commander} size={30} />
          <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
            <b className="truncate text-[15px] font-semibold text-[color:var(--fg)]">{g.friend.displayName}</b>
            {g.friend.pods.length > 0 ? (
              <span className="truncate font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.byFriend.via(g.friend.pods)}</span>
            ) : null}
          </span>
          <small id={figureId} data-testid="friend-panel-figure" className="flex-none whitespace-nowrap font-mono text-[11px] text-[color:var(--fg-muted)]">
            {copy.byFriend.figure(g.lines.length, g.spares)}
          </small>
          <span aria-hidden className="flex size-[36px] flex-none items-center justify-center text-[color:var(--fg-muted)]">
            <Chevron kind="disclosure" open={open} />
          </span>
        </button>
      </h3>
      {open ? <ul id={bodyId} className="m-0 list-none p-0">{children}</ul> : null}
    </section>
  );
}
