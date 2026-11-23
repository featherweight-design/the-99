"use client";
// Ask's client half (tool discovery D): which tools the typed question answers, their cards for this reader, and the
// starters this reader sees. Matching is `ask.ts` (pure, no model); the cards and the reader's switches come from two
// server actions read lazily, so the shell pays no read for a search that is never opened. Offline, or when a read
// fails, the tools still answer, from their registry landing and without the reader's own figures.

import { useEffect, useMemo, useRef, useState } from "react";
import { askStartAction, askToolsAction } from "../../app/ask-actions";
import { matchTools, startersFor } from "../../lib/discovery/ask";
import { toolCardOf, type ToolCardModel } from "../../lib/discovery/showcase";
import { TOOLS, type Tool, type ToolId } from "../../lib/discovery/tools";

// The card search's own debounce (`card-search.tsx`), restated so the two settle together without an import cycle.
const SEARCH_DEBOUNCE_MS = 150;

/** A tool's answer with nothing read: a route tool lands on its page, a deck tool on the deck list. */
function offlineModel(id: ToolId): ToolCardModel {
  const t = (TOOLS as readonly Tool[]).find((x) => x.id === id);
  if (!t) throw new Error(`unknown tool ${id}`);
  const m = toolCardOf(t, { isOn: () => true, fits: {}, deckCount: 1, hasSyncBase: true, place: true });
  // A deck tool with no deck read lands on the list of decks: the reader picks one there.
  return m.state.kind === "none" ? { ...m, state: { kind: "page", href: "/decks", label: m.copy.press ?? m.copy.name } } : m;
}

type Start = { hasDecks: boolean; off: ToolId[] };

export type Ask = {
  /** The tools the typed question answers, best first (up to three), as soon as it is typed. */
  ids: ToolId[];
  /** Their cards once read; empty while they are on the way. */
  tools: ToolCardModel[];
  /** The starters this reader sees (Y6). */
  starters: string[];
};

export function useAsk({ open, online, query, searching }: { open: boolean; online: boolean; query: string; searching: boolean }): Ask {
  const [start, setStart] = useState<Start | null>(null);
  useEffect(() => {
    if (!open || !online) return;
    let live = true;
    askStartAction()
      .then((s) => live && setStart(s))
      // Unread: every starter and every tool stay, as when offline.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, online]);

  const on = useMemo(() => {
    const off = new Set<ToolId>(start?.off ?? []);
    return (id: ToolId) => !off.has(id);
  }, [start]);
  const ids = useMemo(() => (searching ? matchTools(query, on) : []), [searching, query, on]);
  const key = ids.join(",");
  const [read, setRead] = useState<{ key: string; models: ToolCardModel[] }>({ key: "", models: [] });
  const seq = useRef(0);
  useEffect(() => {
    if (key === "") return;
    const wanted = key.split(",") as ToolId[];
    const n = ++seq.current;
    const fallback = () => setRead({ key, models: wanted.map(offlineModel) });
    if (!online) {
      fallback();
      return;
    }
    const timer = window.setTimeout(() => {
      askToolsAction(wanted)
        .then((models) => n === seq.current && setRead({ key, models }))
        .catch(() => n === seq.current && fallback());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [key, online]);

  const starters = useMemo(() => startersFor(on, start?.hasDecks ?? null), [on, start]);
  return { ids, tools: read.key === key ? read.models : [], starters };
}
