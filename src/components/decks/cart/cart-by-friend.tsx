"use client";

// By friend — the cart's third view (spare requests PR 3c; handoff `design_handoff_the99_spare_requests`, call 1 and
// board `Cart-By-Friend`). The same selected lines, grouped under each friend who holds a spare of them, most spares
// first; a card two friends hold sits under both. In this view the spare glyph would say nothing, so the line's press
// is the Ask itself: the modal's own state rule (`rowAsk`) and its one way to ask (`SpareRequestsContext`'s `ask`), so
// the modal and this view always agree. One open ask per card holds here too: a second friend's line reads Ask
// instead, which moves it.

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { spareCopy } from "../../../lib/copy/social";
import type { SelectedLine } from "../../../lib/decks/cart";
import type { FriendSpare, SpareFriend } from "../../../lib/social/spares";
import { frontFaceName } from "../../../lib/cards/faces";
import { usePageSpares } from "../../social/spare-markers";
import { RowEnd, SpareRequestsContext, rowAsk, type RequestsCtx } from "../../social/friend-spares";
import { Face } from "../../social/face";
import { SocialToast, type SocialToastState } from "../../social/social-toast";
import { CartLine } from "./cart-line";

/** One friend's panel: who they are, the spares they hold of the drawn lines, and those lines in the cart's order. */
export type FriendGroup = { friend: SpareFriend; spares: number; lines: SelectedLine[] };

/**
 * The panels for these lines (already in the by-card order), most spares first, then by name (R1 decision 16's order
 * for people). A spare is counted in copies, as the modal's friend row counts it.
 */
export function groupByFriend(lines: readonly SelectedLine[], byCard: ReadonlyMap<string, readonly FriendSpare[]>): FriendGroup[] {
  const groups = new Map<string, FriendGroup>();
  for (const line of lines) {
    for (const s of byCard.get(line.oracleId) ?? []) {
      const g = groups.get(s.friend.publicId) ?? { friend: s.friend, spares: 0, lines: [] };
      if (!g.lines.includes(line)) g.lines.push(line);
      g.spares += s.spare;
      groups.set(s.friend.publicId, g);
    }
  }
  return [...groups.values()].sort((a, b) =>
    b.spares - a.spares
    || a.friend.displayName.localeCompare(b.friend.displayName, "en-US", { sensitivity: "base" })
    || (a.friend.publicId < b.friend.publicId ? -1 : 1));
}

/**
 * By friend for these lines, or null when the view has nothing to draw: spare requests off (no Ask to offer), the
 * spares not read yet, or no drawn line with a friend's spare. Null is what hides the switch's segment, and what
 * sends a `?view=friend` arrival to By card until the read lands.
 */
export function useByFriend(lines: readonly SelectedLine[]): { groups: FriendGroup[]; requests: RequestsCtx } | null {
  const spares = usePageSpares();
  const requests = useContext(SpareRequestsContext);
  const groups = useMemo(() => (spares ? groupByFriend(lines, spares.byCard) : []), [lines, spares]);
  if (!requests || groups.length === 0) return null;
  return { groups, requests };
}

/** The list head: `4 friends · 5 spares · most first`. */
export function byFriendHead(groups: readonly FriendGroup[]): string {
  return copy.list.headByFriend(groups.length, groups.reduce((n, g) => n + g.spares, 0));
}

const lineKey = (publicId: string, oracleId: string) => `${publicId}:${oracleId}`;

export function ByFriendList({
  groups,
  requests,
  deckNames,
  newestAsOf,
}: {
  groups: readonly FriendGroup[];
  requests: RequestsCtx;
  deckNames: Map<string, string>;
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
    <div ref={listRef} data-testid="cart-by-friend" className="flex flex-col gap-[14px] pt-[2px]">
      {groups.map((g) => (
        <section
          key={g.friend.publicId}
          data-testid="friend-panel"
          data-friend={g.friend.publicId}
          aria-label={copy.byFriend.panelAria(g.friend.displayName)}
          className="overflow-hidden rounded-[12px] border border-[color:var(--border-strong)] bg-[color:var(--bg)]"
        >
          <header className="flex items-center gap-[11px] border-b border-b-[color:var(--border-strong)] bg-[color:var(--elevated)] px-[14px] py-[10px]">
            <Face name={g.friend.displayName} commander={g.friend.commander} size={30} />
            <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
              <b className="truncate text-[15px] font-semibold text-[color:var(--fg)]">{g.friend.displayName}</b>
              {g.friend.pods.length > 0 ? (
                <span className="truncate font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.byFriend.via(g.friend.pods)}</span>
              ) : null}
            </span>
            <small data-testid="friend-panel-spares" className="flex-none font-mono text-[11px] text-[color:var(--fg-muted)]">
              {copy.byFriend.spares(g.spares)}
            </small>
          </header>
          <ul className="m-0 list-none p-0">
            {g.lines.map((line) => {
              const key = lineKey(g.friend.publicId, line.oracleId);
              const ask = rowAsk(requests.asksFor(line.oracleId), g.friend.publicId);
              return (
                  <CartLine
                    key={line.oracleId}
                    data={{ "data-friend-line": key, "data-ask": ask.kind }}
                    line={line}
                    deckNames={deckNames}
                    newestAsOf={newestAsOf}
                    inPanel
                    end={
                      <RowEnd
                        size="line"
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
          </ul>
        </section>
      ))}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

