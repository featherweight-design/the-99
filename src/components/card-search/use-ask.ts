"use client";
// Ask's client half (tool discovery D): which tools the typed question answers, their cards for this reader, and the
// starters this reader sees. Matching is `ask.ts` (pure, no model); the cards and the reader's switches come from two
// server actions read lazily, so the shell pays no read for a search that is never opened. Offline, or when a read
// fails, the tools still answer, from their registry landing and without the reader's own figures.

import { useEffect, useMemo, useRef, useState } from "react";
import { askStartAction, askToolsAction } from "../../app/ask-actions";
import type { ToolCardModel } from "../../lib/discovery/showcase";
import type { ToolId } from "../../lib/discovery/tools";

type Engine = typeof import("./ask-engine");

// The card search's own debounce (`card-search.tsx`), restated so the two settle together without an import cycle.
const SEARCH_DEBOUNCE_MS = 150;

type Start = { hasDecks: boolean; off: ToolId[] };

export type Ask = {
  /** The tools the typed question answers, best first (up to three), as soon as it is typed. */
  ids: ToolId[];
  /** Their cards once read; empty while they are on the way. */
  tools: ToolCardModel[];
  /** The starters this reader sees (Y6). */
  starters: string[];
  /** How many words the typed question has (for the events), 0 until the matcher has loaded. */
  words: number;
};

export function useAsk({ open, online, query, searching }: { open: boolean; online: boolean; query: string; searching: boolean }): Ask {
  // The registry and matcher load when the search first opens, not with the shell (see `ask-engine.ts`).
  const [engine, setEngine] = useState<Engine | null>(null);
  useEffect(() => {
    if (!open || engine) return;
    let live = true;
    import("./ask-engine").then((m) => live && setEngine(m)).catch(() => {});
    return () => {
      live = false;
    };
  }, [open, engine]);
  const [start, setStart] = useState<Start | null>(null);
  const [startFailed, setStartFailed] = useState(false);
  useEffect(() => {
    if (!open || !online) return;
    let live = true;
    askStartAction()
      .then((s) => live && setStart(s))
      // Unread: every starter and every tool stay, as when offline.
      .catch(() => live && setStartFailed(true));
    return () => {
      live = false;
    };
  }, [open, online]);

  const on = useMemo(() => {
    const off = new Set<ToolId>(start?.off ?? []);
    return (id: ToolId) => !off.has(id);
  }, [start]);
  // Online, a switch-off tool must not flash before the reader's switches arrive, so nothing matches until they have; offline (or
  // unread) every tool answers from the registry, as the fallback cards do.
  const waiting = engine === null || (online && start === null && !startFailed);
  const ids = useMemo(() => (engine && searching && !waiting ? engine.matchTools(query, on) : []), [engine, searching, waiting, query, on]);
  const key = ids.join(",");
  const [read, setRead] = useState<{ key: string; models: ToolCardModel[] }>({ key: "", models: [] });
  const seq = useRef(0);
  useEffect(() => {
    if (key === "" || !engine) return;
    const wanted = key.split(",") as ToolId[];
    const n = ++seq.current;
    const fallback = () => setRead({ key, models: wanted.map(engine.offlineModel) });
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
  }, [key, online, engine]);

  const starters = useMemo(() => (engine ? engine.startersFor(on, start?.hasDecks ?? null) : []), [engine, on, start]);
  const words = useMemo(() => (engine ? engine.askWords(query).length : 0), [engine, query]);
  return { ids, tools: read.key === key ? read.models : [], starters, words };
}
