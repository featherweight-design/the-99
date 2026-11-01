"use client";

// The table, live (plan `2026-10-16-rule-zero.md` PR 4; readiness G5; boards S4, S5, W4, W5): the page draws the
// server's snapshot, and this asks `GET /api/rule-zero/tables/[id]` again every 20 seconds while the page is
// visible, at once when it comes back into view or the window takes focus, and hands each answer to the same body.
// Nothing is promised live: a change arrives on the next check.
//
// Since you looked: the changed dot and the read's line compare each seat with the viewer's `seenAt` AS THE VISIT
// FOUND IT, held for the whole visit, so a change that arrives mid-visit keeps its dot until the reader leaves. The
// visit's `seenAt` is the one its FIRST check answers, asked at once on arrival and before this visit records
// anything: a Back or Forward can restore the page's earlier payload from the router's cache, whose `seenAt` is the
// one an earlier visit arrived with. Until that check lands the page's own `seenAt` stands in.
//
// The page records the drawn snapshot's `revision` (`markTableSeen`) once the visit's `seenAt` is known, and only
// while the page is visible: an answer that lands in a hidden tab has not been seen, so it is recorded when the
// page comes back into view, and never if the reader leaves first. So the next visit starts from what this one
// actually showed, and a refresh does not lose it.
//
// The setter's `Close the table` (revisions 5): once the action answers ok the page asks the poll's route at once and
// draws the closed table from its answer, so the host's page closes in the press rather than at the next check; a lost
// follow-up refreshes the route, whose page draws the closed table itself. A refused close is the shared toast, with Try again.
//
// A closed table's answer swaps the body for the closed page in place (L4). A 404 (the reader left the pod, or
// their seat went) refreshes the route, whose page then answers not found.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { TablePoll } from "../../app/api/rule-zero/tables/[id]/route";
import { markTableSeen, swapSeatDeckAction } from "../../app/friends/table/actions";
import { closeTableAction } from "../../app/friends/table/setup-actions";
import { bracketPhrase } from "../../lib/copy/deck-analysis";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { middleBrackets } from "../../lib/rule-zero/table-view";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { SwapContext } from "./swap";
import { reviveClosedTable, reviveTableView } from "../../lib/rule-zero/live";
import type { TableView } from "../../lib/rule-zero/table-view";
import { TableBody } from "./table-body";
import { TableClosed } from "./table-closed";

export const POLL_MS = 20_000;

const swapCopy = ruleZeroCopy.swap;
const closeCopy = ruleZeroCopy.close;

type Closed = ReturnType<typeof reviveClosedTable>;

const clock = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d).toLowerCase();

/** Record what the page shows, once the visit's `seenAt` is known and while the page is visible. */
function recordSeen(tableId: string, shown: { revision: number; live: boolean }, recorded: { current: number }) {
  if (!shown.live || document.visibilityState !== "visible" || shown.revision <= recorded.current) return;
  recorded.current = shown.revision;
  // Best effort: a lost write costs one visit's dots, never the table.
  markTableSeen(tableId, new Date(shown.revision).toISOString()).catch(() => {});
}

export function TableLive({
  initial,
  now: serverNow,
}: {
  initial: TableView;
  /** The server's clock at the page's draw; each answered check moves it to the reader's. */
  now: Date;
}) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  // Every answer, a check's or a swap's, is adopted only if it is no older than what the page shows: the two race,
  // and either can land second with the earlier snapshot.
  const adopt = (next: TableView) => setView((cur) => (next.revision.getTime() < cur.revision.getTime() ? cur : next));
  // A fresh server draw (the router's refresh after `Seats` saves) wins over what the page shows, adopted during
  // render so the old seats never paint once more. The visit's `seenAt` stays its first check's.
  const [drawn, setDrawn] = useState(initial);
  if (initial !== drawn) {
    setDrawn(initial);
    setView(initial);
  }
  const [closed, setClosed] = useState<Closed | null>(null);
  const [updated, setUpdated] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(serverNow);
  // The visit's own `seenAt`: the first check's, never moved by this visit's writes.
  const [lookedAt, setLookedAt] = useState(initial.seenAt);
  const [arrived, setArrived] = useState(false);
  const tableId = initial.tableId;
  // What the page shows now, and the newest revision it has recorded, for the handlers below.
  const shown = useRef({ revision: initial.revision.getTime(), live: false });
  const recorded = useRef(0);
  // Whether the visit's first check has answered: held across re-runs of the checking effect.
  const firstAnswered = useRef(false);
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  });
  // The swap (PR 7). `swaps` counts the swaps answered this visit: a check that started before one lands is dropped,
  // so a poll in flight never draws the seat as it was before the swap.
  const swaps = useRef(0);
  const [swapping, setSwapping] = useState(false);
  // The deck this visit's own swap seated; an Undo clears it.
  const [swappedTo, setSwappedTo] = useState<string | null>(null);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastId = useRef(0);
  // One write at a time, for every caller: a toast's Undo holds the `seat` of an older render, so the guard is a ref.
  const writing = useRef(false);
  async function seat(deckId: string | null, undoTo: { deckId: string | null } | null) {
    if (writing.current) return;
    writing.current = true;
    setSwapping(true);
    const before = view.viewerDeckId;
    try {
      const out = await swapSeatDeckAction(tableId, deckId);
      if (!out.ok) {
        setToast({ id: ++toastId.current, text: swapCopy.failed });
        return;
      }
      swaps.current += 1;
      adopt(out.view);
      // The answer is the table as it reads now, so it moves the `updated` stamp as a check does.
      const at = new Date();
      setNow(at);
      setUpdated(clock(at));
      // A swap answered before the visit's first check stands in for it: the check it drops would have set the
      // visit's baseline, and `recordSeen` waits on `arrived`.
      if (!firstAnswered.current) {
        firstAnswered.current = true;
        setLookedAt(out.view.seenAt);
        setArrived(true);
      }
      setSwappedTo(undoTo === null ? deckId : null);
      // The viewer's own deck, so a plain string; nothing here is another reader's.
      const own = out.view.seats.find((x) => x.you)?.deck?.name ?? null;
      const name = typeof own === "string" ? own : null;
      // An Undo answers with no toast of its own: it put back what the reader had.
      if (undoTo === null && name !== null) {
        setToast({ id: ++toastId.current, text: swapCopy.toast(name), retry: { label: swapCopy.undo, run: () => void seat(before, { deckId: before }) } });
      } else setToast(null);
    } catch {
      setToast({ id: ++toastId.current, text: swapCopy.failed });
    } finally {
      writing.current = false;
      setSwapping(false);
    }
  }

  // The setter's close. True when the table closed (the page then shows it closed, or is about to); a refusal and a throw
  // are the toast, and the confirm leaves its place to it.
  async function closeNow(): Promise<boolean> {
    try {
      const out = await closeTableAction(tableId);
      if (!out.ok) throw new Error("refused");
    } catch {
      setToast({ id: ++toastId.current, text: closeCopy.failed, retry: { label: closeCopy.retry, run: () => void closeNow() } });
      return false;
    }
    setToast(null);
    try {
      const res = await fetch(`/api/rule-zero/tables/${tableId}`, { cache: "no-store" });
      const poll = res.ok ? ((await res.json()) as TablePoll) : null;
      if (poll?.kind === "closed") {
        setClosed(reviveClosedTable(poll.closed));
        return true;
      }
    } catch {
      // Falls through to the refresh below.
    }
    routerRef.current.refresh();
    return true;
  }

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    const check = async () => {
      if (stopped || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      const swapsAtStart = swaps.current;
      try {
        const res = await fetch(`/api/rule-zero/tables/${tableId}`, { cache: "no-store" });
        if (stopped) return;
        if (res.status === 404) {
          routerRef.current.refresh();
          return;
        }
        if (!res.ok) return;
        const poll = (await res.json()) as TablePoll;
        if (stopped || swaps.current !== swapsAtStart) return;
        if (poll.kind === "closed") setClosed(reviveClosedTable(poll.closed));
        else {
          const next = reviveTableView(poll.view);
          adopt(next);
          if (!firstAnswered.current) {
            firstAnswered.current = true;
            setLookedAt(next.seenAt);
            setArrived(true);
          }
        }
        const at = new Date();
        setNow(at);
        setUpdated(clock(at));
      } catch {
        // A failed check is the next check's to make; nothing the reader sees changes.
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(check, POLL_MS);
    void check();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      recordSeen(tableId, shown.current, recorded);
      void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [tableId]);

  const revision = view.revision.getTime();
  useEffect(() => {
    shown.current = { revision, live: arrived && !closed };
    recordSeen(tableId, shown.current, recorded);
  });

  if (closed) return <TableClosed closed={closed} />;
  const middle = view.read.kind === "read" ? bracketPhrase(middleBrackets(view.read.middle)) : null;
  return (
    <SwapContext.Provider value={{ offer: view.offer, middle, busy: swapping, swap: (deckId) => void seat(deckId, null) }}>
      <TableBody view={{ ...view, seenAt: lookedAt }} now={now} updated={updated} swappedTo={swappedTo} onClose={closeNow} />
      <SocialToast toast={toast} onDone={() => setToast(null)} role={toast?.retry ? "status" : "alert"} />
    </SwapContext.Provider>
  );
}
