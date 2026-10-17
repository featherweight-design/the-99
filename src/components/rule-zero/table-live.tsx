"use client";

// The table, live (plan `2026-10-16-rule-zero.md` PR 4; readiness G5; boards S4, S5, W4, W5): the page draws the
// server's snapshot, and this asks `GET /api/rule-zero/tables/[id]` again every 20 seconds while the page is
// visible, at once when it comes back into view or the window takes focus, and hands each answer to the same body.
// Nothing is promised live: a change arrives on the next check.
//
// Since you looked: the changed dot and the read's line compare each seat with the viewer's `seenAt` AS THE VISIT
// FOUND IT, held for the whole visit, so a change that arrives mid-visit keeps its dot until the reader leaves.
// After every draw the page records the drawn snapshot's `revision` (`markTableSeen`), so the next visit starts
// from what this one showed and a refresh does not lose it.
//
// A closed table's answer swaps the body for the closed page in place (L4). A 404 (the reader left the pod, or
// their seat went) refreshes the route, whose page then answers not found.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { TablePoll } from "../../app/api/rule-zero/tables/[id]/route";
import { markTableSeen } from "../../app/friends/table/actions";
import { reviveTableView } from "../../lib/rule-zero/live";
import type { TableView } from "../../lib/rule-zero/table-view";
import { TableBody } from "./table-body";
import { TableClosed } from "./table-closed";

export const POLL_MS = 20_000;

type Closed = Extract<TablePoll, { kind: "closed" }>["closed"];

const clock = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d).toLowerCase();

export function TableLive({
  initial,
  gamesEnabled,
  now: serverNow,
}: {
  initial: TableView;
  gamesEnabled: boolean;
  /** The server's clock at the page's draw; each answered check moves it to the reader's. */
  now: Date;
}) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [closed, setClosed] = useState<Closed | null>(null);
  const [updated, setUpdated] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(serverNow);
  // The visit's own `seenAt`, never moved by this visit's writes.
  const lookedAt = useRef(initial.seenAt);
  const tableId = initial.tableId;

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    const check = async () => {
      if (stopped || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const res = await fetch(`/api/rule-zero/tables/${tableId}`, { cache: "no-store" });
        if (stopped) return;
        if (res.status === 404) {
          router.refresh();
          return;
        }
        if (!res.ok) return;
        const poll = (await res.json()) as TablePoll;
        if (stopped) return;
        if (poll.kind === "closed") setClosed(poll.closed);
        else setView(reviveTableView(poll.view));
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
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [tableId, router]);

  const revision = view.revision.getTime();
  useEffect(() => {
    if (closed) return;
    // Best effort: a lost write costs one visit's dots, never the table.
    markTableSeen(tableId, new Date(revision).toISOString()).catch(() => {});
  }, [tableId, revision, closed]);

  if (closed) return <TableClosed podName={closed.podName} setBy={closed.setBy} faces={closed.faces} />;
  return <TableBody view={{ ...view, seenAt: lookedAt.current }} gamesEnabled={gamesEnabled} now={now} updated={updated} />;
}
