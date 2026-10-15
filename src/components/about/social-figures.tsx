"use client";
// The Social line's About specimens (Social R3 PR 5; the addendum `design_handoff_the99_about/addendum-social-line`).
// Each is a SHIPPED component drawn over a fixture, inert inside `Specimen`, with no-op callbacks: no new visuals, so the
// page can never describe a control the app does not draw. The fixtures name no real account.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PodCard } from "../social/pod-card";
import { GameMatchups } from "../decks/game-matchups";
import type { DeckGame } from "../../lib/decks/games";
import { summarizeMatchups } from "../../lib/decks/matchups";
import type { GameOpponent } from "../../lib/decks/game-opponents";
import type { Pod, PodMember } from "../../lib/social/access";

const member = (over: Partial<PodMember> & Pick<PodMember, "publicId" | "displayName">): PodMember => ({
  joinedAt: new Date("2026-09-01T12:00:00Z"),
  isOwner: false,
  isYou: false,
  isFriend: true,
  commander: null,
  ...over,
});

/** A pod of four around the table, the viewer its owner, sharing spares: the shipped card, as /friends draws it. */
const POD: Pod = {
  id: "about-pod",
  name: "Thursday",
  isOwner: true,
  members: [
    member({ publicId: "m-you", displayName: "You", isOwner: true, isYou: true, isFriend: false }),
    member({ publicId: "m-dave", displayName: "Dave" }),
    member({ publicId: "m-jo", displayName: "Jo" }),
    member({ publicId: "m-sam", displayName: "Samantha" }),
  ],
  nextOwner: { publicId: "m-dave", displayName: "Dave" },
};

/**
 * The shipped components switch to their wide layout on the VIEWPORT (`md`, `lg`), but a figure sits in the page's
 * article, which at a signed-in 1024px is 566px wide: the wide layout then clips a seat or collapses a name column.
 * Where the wide layout needs more than the figure has, the figure keeps its natural width and is scaled down to the
 * space it has; where the compact layout is drawn it already fits and the scale stays 1.
 */
function FitFigure({ wideAt, children }: { wideAt: string; children: ReactNode }) {
  const [fit, setFit] = useState({ scale: 1, height: null as number | null });
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const scale = Math.min(1, box.clientWidth / Math.max(1, content.scrollWidth));
      setFit({ scale, height: scale < 1 ? Math.ceil(content.offsetHeight * scale) : null });
    });
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={outer} style={{ height: fit.height ?? undefined, overflow: "hidden" }}>
      <div ref={inner} className={wideAt} style={{ transform: fit.scale < 1 ? `scale(${fit.scale})` : undefined, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

const noop = () => {};
const noopAsync = async () => true;

export function FriendsFigureBody() {
  return (
    // Five 116px seats and four 12px gaps, with the card's own padding, are about 660px.
    <FitFigure wideAt="md:min-w-[660px]">
      <PodCard
        pod={POD}
        shared
        onRemove={noop}
        onAdd={noop}
        onShare={noop}
        onRename={noop}
        onLeave={noopAsync}
        onDelete={noopAsync}
      />
    </FitFigure>
  );
}

const game = (id: string, result: DeckGame["result"], day: number): DeckGame => ({
  id, result, podSize: 4, playedAt: new Date(Date.UTC(2026, 8, day)), versionNumber: null, note: null, worked: [], hurt: [],
});
const GAMES: DeckGame[] = [game("g1", "loss", 2), game("g2", "win", 9), game("g3", "win", 16), game("g4", "draw", 23)];
const yuriko = { oracleId: "about-y", name: "Yuriko, the Tiger’s Shadow", imageUri: null };
const tymna = { oracleId: "about-t", name: "Tymna the Weaver", imageUri: null };
const seat = (over: Partial<GameOpponent>): GameOpponent => ({
  seat: 1, friend: null, deckName: null, commander: null, partner: null, colorIdentity: [], label: null, won: false, ...over,
});
const BY_GAME = new Map<string, GameOpponent[]>([
  ["g1", [seat({ friend: { key: "dave", name: "Dave" }, deckName: "Avengers Tempo", commander: yuriko, colorIdentity: ["U", "B"], won: true })]],
  ["g2", [seat({ friend: { key: "dave", name: "Dave" }, deckName: "Avengers Tempo", commander: yuriko, colorIdentity: ["U", "B"] }), seat({ seat: 2, commander: tymna, colorIdentity: ["W", "U", "B", "G"] })]],
  ["g3", [seat({ commander: tymna, colorIdentity: ["W", "U", "B", "G"] })]],
]);
const MATCHUPS = summarizeMatchups(GAMES, BY_GAME);

export function OpponentsFigureBody() {
  // The `lg` row's fixed tracks need 572px before the name column takes any.
  return (
    <FitFigure wideAt="lg:min-w-[780px]">
      <GameMatchups matchups={MATCHUPS} />
    </FitFigure>
  );
}
