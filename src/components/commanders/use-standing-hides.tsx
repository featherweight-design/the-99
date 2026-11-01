"use client";

// The rows a reader has hidden from a list in this visit, and the in-place Undo each one leaves
// (design_handoff_the99_hide_commander README §1-2, the Rows and Undo boards). Shared by For you and Discover.
//
// OPTIMISTIC, and it has to outlive the payload. The hide's server action drops the reader's list cache, so the
// route's next payload (often the action's own response) no longer carries the row. The Undo row stands until the
// reader leaves the tab, though, and rows below keep their numbers while it does, so each hide keeps a snapshot of
// the row and where it stood in every list it was pressed against, and `restore` puts it back into any payload that
// lacks it. A row is keyed by its slug, which a hide never moves (the filter sits after slug assignment).
//
// Refusals, as the board draws them. Hide refused: the row comes back where it was and the shared toast says so,
// with Try again. Undo refused: the button goes and one line under the row says the Hidden tab is the way back.
// Only the newest press on a row may put anything back: an Undo racing the Hide it undoes lands on what the reader
// last asked for. Server actions run one at a time per client, so the writes themselves land in order.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { unhideCommanderAction } from "../../app/commanders/actions";
import { hideCommanderCopy } from "../../lib/copy/commander-explained";
import { announceCommanderCountsStale } from "./counts-event";
import { RefusalToast } from "./hide-commander";

/** `hidden`: the Undo row stands. `refused`: it stands with no button, its undo refused. `back`: undone, drawn as a row. */
export type StandingState = "hidden" | "refused" | "back";

type Placed<T> = { row: T; index: number };

type Entry<T> = {
  slug: string;
  name: string;
  state: StandingState;
  /** Per list (a ranking, a sort), the row as it was drawn and where it stood. */
  placed: ReadonlyMap<string, Placed<T>>;
  /** The hide's answer: the oracle id it hid (what Undo unhides), or null when it was refused. */
  settled: Promise<string | null>;
};

export type HidePress<T> = {
  slug: string;
  /** The name the row draws, for the Undo row, the toast and the labels. */
  name: string;
  /** Every list the row stands in now, keyed as `restore` will be asked for them. */
  lists: readonly (readonly [key: string, rows: readonly T[]])[];
  /** The row as drawn, where the lists hold a slimmer copy of it (Discover's withheld fields). */
  snapshot?: T;
  /** The write. Answers the oracle id it hid, or null when it was refused; a throw is a refusal too. */
  act: () => Promise<string | null>;
};

type Focus = "hide" | "undo" | "line";

/** A new press on `slug`: the ticket only its own answer may act on. */
function bump(tickets: Map<string, number>, slug: string): number {
  const ticket = (tickets.get(slug) ?? 0) + 1;
  tickets.set(slug, ticket);
  return ticket;
}

const isLatest = (tickets: Map<string, number>, slug: string, ticket: number) => tickets.get(slug) === ticket;

export function useStandingHides<T extends { slug: string }>() {
  const [entries, setEntries] = useState<ReadonlyMap<string, Entry<T>>>(() => new Map());
  const [refusal, setRefusal] = useState<{ press: HidePress<T>; text: string } | null>(null);
  const tickets = useRef(new Map<string, number>());
  // Where focus goes once the press has drawn what it reveals. A ref, not state: it only says where focus goes after
  // a render the press already causes.
  const focusTo = useRef<{ slug: string; kind: Focus } | null>(null);
  const controls = useRef(new Map<string, HTMLElement>());

  /** A ref callback for a control the reader's focus may be sent to, with React 19's cleanup. */
  const register = useCallback(
    (kind: Focus, slug: string) => (el: HTMLElement | null) => {
      if (!el) return undefined;
      const key = `${kind}:${slug}`;
      controls.current.set(key, el);
      return () => {
        if (controls.current.get(key) === el) controls.current.delete(key);
      };
    },
    [],
  );

  // The pressed control is replaced by the one the press reveals (Hide by Undo, Undo by the row's Hide), so focus moves
  // to it. Without scrolling: the reader's place stays where they pressed.
  useEffect(() => {
    const target = focusTo.current;
    if (!target) return;
    focusTo.current = null;
    controls.current.get(`${target.kind}:${target.slug}`)?.focus({ preventScroll: true });
  }, [entries]);

  const drop = useCallback((slug: string) => {
    setEntries((m) => {
      if (!m.has(slug)) return m;
      const next = new Map(m);
      next.delete(slug);
      return next;
    });
  }, []);

  const mark = useCallback((slug: string, state: StandingState) => {
    setEntries((m) => {
      const entry = m.get(slug);
      return entry ? new Map(m).set(slug, { ...entry, state }) : m;
    });
  }, []);

  const hide = useCallback(
    (press: HidePress<T>) => {
      const { slug, name } = press;
      const ticket = bump(tickets.current, slug);
      const placed = new Map<string, Placed<T>>();
      for (const [key, rows] of press.lists) {
        const index = rows.findIndex((r) => r.slug === slug);
        if (index !== -1) placed.set(key, { row: press.snapshot ?? rows[index], index });
      }
      const settled = press.act().then(
        (id) => id,
        () => null,
      );
      setEntries((m) => new Map(m).set(slug, { slug, name, state: "hidden", placed, settled }));
      setRefusal(null);
      focusTo.current = { slug, kind: "undo" };
      void settled.then((id) => {
        if (!isLatest(tickets.current, slug, ticket)) return;
        if (id === null) {
          drop(slug);
          focusTo.current = { slug, kind: "hide" };
          setRefusal({ press, text: hideCommanderCopy.rowHideRefused(name) });
          return;
        }
        announceCommanderCountsStale();
      });
    },
    [drop],
  );

  const undo = useCallback(
    (slug: string) => {
      const entry = entries.get(slug);
      if (!entry || entry.state !== "hidden") return;
      const ticket = bump(tickets.current, slug);
      mark(slug, "back");
      focusTo.current = { slug, kind: "hide" };
      const refuse = () => {
        if (!isLatest(tickets.current, slug, ticket)) return;
        mark(slug, "refused");
        focusTo.current = { slug, kind: "line" };
      };
      // A hide still in flight is waited on: its answer is the id to unhide. A refused one hid nothing, so there is
      // nothing to undo, and the row is already back.
      void entry.settled
        .then((id) => (id === null ? true : unhideCommanderAction(id)))
        .then((ok) => {
          if (!ok) return refuse();
          if (isLatest(tickets.current, slug, ticket)) announceCommanderCountsStale();
        }, refuse);
    },
    [entries, mark],
  );

  /**
   * `list` with every row hidden from it this visit put back where it stood, for a payload that no longer carries
   * it. The same array when there is nothing to put back, so a memo over it holds still.
   */
  const restore = useCallback(
    (list: T[], key: string): T[] => {
      let present: Set<string> | null = null;
      let adds: Placed<T>[] | null = null;
      for (const entry of entries.values()) {
        const at = entry.placed.get(key);
        if (!at) continue;
        present ??= new Set(list.map((r) => r.slug));
        if (present.has(entry.slug)) continue;
        (adds ??= []).push(at);
      }
      if (!adds) return list;
      // In ascending order of where each stood: every index was read off a list that still held the rows hidden
      // before it, so inserting the earliest first rebuilds that list.
      adds.sort((a, b) => a.index - b.index);
      const out = [...list];
      for (const add of adds) out.splice(Math.min(add.index, out.length), 0, add.row);
      return out;
    },
    [entries],
  );

  /** The Undo row's state for this slug, or null while the row is drawn as itself. */
  const standing = useCallback(
    (slug: string): Exclude<StandingState, "back"> | null => {
      const state = entries.get(slug)?.state;
      return state === "hidden" || state === "refused" ? state : null;
    },
    [entries],
  );

  const toast: ReactNode = refusal ? (
    <RefusalToast
      key={refusal.text}
      title={refusal.text}
      onDone={() => setRefusal(null)}
      onRetry={() => hide(refusal.press)}
    />
  ) : null;

  return { hide, undo, restore, standing, register, toast };
}
