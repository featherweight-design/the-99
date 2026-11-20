// src/lib/copy/tracker.ts: the life tracker's strings (life tracker plan, PR 4: the play surface and its setup). Board
// references are to the handoff's F boards. Reused shipped strings are named, not copied.

import { personText, type PersonParts, type ThirdPartyName } from "../person-name";

type Name = string | ThirdPartyName;

export const trackerCopy = {
  setup: {
    title: "Start the game",
    table: "Table",
    life: "Starting life",
    lifeLess: "Lower starting life",
    lifeMore: "Raise starting life",
    first: "Who goes first",
    random: "Random",
    pick: "I’ll pick",
    pickHint: "Tap a seat",
    goesFirst: "Goes first",
    start: "Start",
    layoutAria: (label: string) => `${label} layout`,
  },
  panel: {
    aria: (name: Name): PersonParts => personText`${name}’s panel`,
    ariaYou: "Your panel",
    lifeLabel: "Life",
    lose: "Lose 1 life",
    gain: "Gain 1 life",
    pending: (delta: number) => `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`,
    endTurn: "End turn",
    turnOf: (name: Name): PersonParts => personText`${name}’s turn`,
    yourTurn: "Your turn",
    undo: "Undo",
    outLife: (round: number) => `Out · 0 life · round ${round}`,
    outPoison: (round: number) => `Out · 10 poison · round ${round}`,
    outCommander: (from: Name, round: number): PersonParts => personText`Out · 21 commander damage from ${from} · round ${round}`,
    outCommanderYou: (round: number) => `Out · 21 commander damage from your commander · round ${round}`,
  },
  strip: {
    round: (n: number) => `Round ${n}`,
    undo: "Undo",
    menu: "Menu",
    back: "Back to the table",
    close: "Close",
  },
  over: {
    title: "Game over",
    saved: "Result saved",
    notSaved: "Result not saved",
    back: "Back to the table",
  },
};
