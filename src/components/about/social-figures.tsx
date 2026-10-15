"use client";
// The Social line's About specimens (Social R3 PR 5; the addendum `design_handoff_the99_about/addendum-social-line`).
// Each is a SHIPPED component drawn over a fixture, inert inside `Specimen`, with no-op callbacks: no new visuals, so the
// page can never describe a control the app does not draw. The fixtures name no real account.

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

const noop = () => {};
const noopAsync = async () => true;

export function FriendsFigureBody() {
  return (
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
  return <GameMatchups matchups={MATCHUPS} />;
}
