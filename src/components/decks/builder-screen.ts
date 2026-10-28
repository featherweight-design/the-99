"use client";

import { createContext, useContext, useEffect } from "react";
import type { DeckView } from "../../lib/copy/about";
import type { BuilderView } from "../../lib/decks/builder-view";
import type { DeckPanel } from "./group-toggle";

// Which of a deck's About screens the reader is on, for the shell's ? (discovery R2·8, plan "The ?"). The builder
// changes its tab (`setView`), Shopping (`setFilter`) and Stats or Notes (`deckPanel`) in place and mirrors none of them
// to the address, so the ? cannot read the view from the URL: the builder publishes it here.
//
// A context whose value is the PUBLISHER, provided by the ?'s root in the shell. The shell wraps every page, so the
// provider is already above the builder, and only the ?'s root re-renders when the view moves (the builder never
// reads anything back). With the ? off there is no provider, and publishing does nothing.

/**
 * What the builder publishes: the About screen it shows (`view`), and the tab it is on (`tab`). The two differ on
 * Consider, which has no About screen of its own and reads as Your deck, but which "‹ Back to {deck}" must still return
 * to (`?tab=consider`).
 */
export type BuilderScreen = { view: DeckView; tab: BuilderView };

export const BuilderScreenContext = createContext<((screen: BuilderScreen | null) => void) | null>(null);

/** The deck view the builder's state shows. The Consider tab has no screen of its own, so it reads as Your deck. */
export function deckViewOf(view: BuilderView, filter: "all" | "shopping", panel: DeckPanel): DeckView {
  switch (view) {
    case "analysis":
    case "games":
    case "versions":
      return view;
    case "consider":
      return "your-deck";
    case "deck":
      if (panel === "stats" || panel === "notes") return panel;
      return filter === "shopping" ? "shopping" : "your-deck";
  }
}

/** Publishes the builder's view and tab while it is mounted, and takes them back when the builder leaves. */
export function usePublishBuilderScreen(view: DeckView, tab: BuilderView) {
  const publish = useContext(BuilderScreenContext);
  useEffect(() => {
    publish?.({ view, tab });
  }, [publish, view, tab]);
  useEffect(() => {
    if (!publish) return;
    return () => publish(null);
  }, [publish]);
}
