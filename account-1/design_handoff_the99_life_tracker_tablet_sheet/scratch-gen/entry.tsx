import * as React from "react";
import { createRoot } from "react-dom/client";
import { PlaySurface } from "<repo>/src/components/tracker/play-surface";
const P = (globalThis as any).FIX;
const seats = P.seats;
const game = { config: { tableId: "t1", startingLife: 40, seats: seats.map((s: any) => ({ seat: s.seat, commanders: s.partner ? 2 : 1 })), first: 1, layout: P.layout, startedAt: Date.now() - 41 * 60000, snapshot: { players: seats, roster: "r" } }, log: P.log };
localStorage.setItem("the99.tracker.t1", JSON.stringify({ v: 1, game, expiresAt: Date.now() + 3_600_000 }));
createRoot(document.getElementById("root")!).render(
  <div data-full-screen="" className="flex w-full flex-1 flex-col" style={{ height: "100dvh" }}>
    <PlaySurface tableId="t1" roster="r" expiresAt={Date.now() + 3_600_000} seats={seats} backHref="/friends/table/t1" logHref={null} podName="Thursday night" />
  </div>,
);
