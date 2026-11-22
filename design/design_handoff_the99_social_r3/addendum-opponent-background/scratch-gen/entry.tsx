import * as React from "react";
import { createRoot } from "react-dom/client";
import { GameLogForm } from "<repo>/src/components/decks/game-log-form";
import { GameHistoryRow } from "<repo>/src/components/decks/game-history-row";
import { NavRail, TabBar, MobileHeader } from "<repo>/src/components/shell/nav";
import { PlaySurface } from "<repo>/src/components/tracker/play-surface";
const P = (globalThis as any).FIX;
(globalThis as any).__PATH = "/decks/d1";
function Shell({ children }: { children: React.ReactNode }) {
  const badges = { friends: 0, friendsWaiting: 0, friendsAt: new Date().toISOString() } as any;
  const door: any = { adminDoor: false, adminEnv: null, credits: null };
  return (
    <div className="flex min-h-dvh flex-1">
      <NavRail locked={false} openLock={null as any} theme="amonkhet" {...door} friendsMoment={false} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
        <MobileHeader theme="amonkhet" {...door} />
        <main className="flex min-w-0 flex-1 flex-col"><div className="mx-auto w-full max-w-[1040px] px-[16px] py-[18px] md:px-[32px] md:py-[28px]">{children}</div></main>
      </div>
      <TabBar locked={false} openLock={null as any} friendsMoment={false} badges={badges} />
    </div>
  );
}
const op = (o: any) => ({ seat: o.seat, friend: null, deckName: null, commander: o.c ?? null, partner: o.p ?? null, colorIdentity: o.ci ?? [], label: o.label ?? null, won: !!o.won });
function App() {
  if (P.scene === "tracker") {
    const seats = P.seats;
    const game = { config: { tableId: "t1", startingLife: 40, seats: seats.map((s: any) => ({ seat: s.seat, commanders: s.partner ? 2 : 1 })), first: 1, layout: P.layout, startedAt: Date.now() - 41 * 60000, snapshot: { players: seats, roster: "r" } }, log: P.log ?? [] };
    localStorage.setItem("the99.tracker.t1", JSON.stringify({ v: 1, game, expiresAt: Date.now() + 3_600_000 }));
    return (
      <div data-full-screen="" className="flex w-full flex-1 flex-col" style={{ height: "100dvh" }}>
        <PlaySurface tableId="t1" roster="r" expiresAt={Date.now() + 3_600_000} seats={seats} backHref="/friends/table/t1" logHref={null} podName="Thursday night" />
      </div>
    );
  }
  if (P.scene === "history") {
    return (
      <Shell>
        <ul className="m-0 list-none p-0">
          {P.games.map((g: any, i: number) => (
            <GameHistoryRow key={g.id} deckId="d1" game={{ ...g, playedAt: new Date(g.playedAt) }} isLast={false} onDeleted={() => {}} opponents={g.opponents.map(op)} />
          ))}
        </ul>
      </Shell>
    );
  }
  return (
    <Shell>
      <GameLogForm deckId="d1" onSaved={() => {}} onAnnounce={() => {}} isFirstGame={false} initialOpen opponents={{ you: { name: "Sai, Master Thopterist", deckName: "Sai Thopters", imageUri: "art/sai.jpg" } }} />
    </Shell>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
