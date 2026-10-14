"use client";

// The Announced group on `/decks/precons` (handoff `design_handoff_the99_upcoming_precons`, R2 C1–C3 over R1's
// T and L rows; design table: Announced group, Set block, Revealed card, None plate, `new` tag, Jump). Commander
// sets on the way, above the newest year, in Newest order only. An announced set is never a precon (STATES
// rule 1): a dashed block with no tile shell, no figure, no link and no Start.
//
// The head is a disclosure, CLOSED by default (rule 9: the group never pushes the decklists down unasked). It
// opens by itself when it holds a set this reader has not been shown, or when the address names `#announced`
// (the banner's link), or while a filter is on and a set matches it (the reader asked); otherwise this browser's
// last press holds (`the99:precons:announced`, mirrored into a cookie so the server draws it).

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { preconDay, preconsCopy } from "../../../lib/copy/precons";
import type { AnnouncedMatch } from "../../../lib/precons/arrivals";
import type { PreconView } from "../../../lib/precons/list";
import { useStoredView } from "../../ui/use-stored-view";
import { PRECONS_ANNOUNCED_COOKIE } from "../../ui/view-cookie";
import { AnnouncedSet, FOCUS_RING, NEW_TAG, setIdentity, type ListedJump } from "./announced-parts";
import { AnnouncedRow } from "./announced-row";

const copy = preconsCopy.upcoming;

/** Where this browser keeps its last press on the head: `open` or `closed`. */
export const ANNOUNCED_KEY = "the99:precons:announced";
/** The hash the banner's link carries; the group's own id. */
export const ANNOUNCED_HASH = "#announced";

type Press = "open" | "closed";
const isPress = (v: string): v is Press => v === "open" || v === "closed";

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

/**
 * The group's state for one VISIT: whether the reader arrived by the banner's `#announced` link (latched, since a
 * search's mirror drops the fragment and the decklist jump replaces it) and their own press, if any. Held by the
 * list view, which stays mounted, because the group itself unmounts while a filter leaves no set or Most owned
 * hides it, and coming back must not forget either.
 */
export type AnnouncedVisit = { arrivedByLink: boolean; pressed: boolean | null; press: (open: boolean) => void };

export function useAnnouncedVisit(): AnnouncedVisit {
  const onLink = useSyncExternalStore(subscribeHash, () => window.location.hash === ANNOUNCED_HASH, () => false);
  const [arrivedByLink, setArrivedByLink] = useState(false);
  if (onLink && !arrivedByLink) setArrivedByLink(true);
  const [pressed, setPressed] = useState<boolean | null>(null);
  return { arrivedByLink: arrivedByLink || onLink, pressed, press: setPressed };
}

export type AnnouncedGroupProps = {
  /** This visit's link arrival and press, from `useAnnouncedVisit` in the list view. */
  visit: AnnouncedVisit;
  /** The sets after the list's filters (`filterAnnounced`), soonest first; empty draws nothing. */
  matches: AnnouncedMatch[];
  /** `YYYY-MM-DD`, the UTC day the server counted from. */
  today: string;
  newCodes: readonly string[];
  opensByItself: boolean;
  view: PreconView;
  /** Each set's listed decklists among the list's shown rows, and the year they lead (L2). */
  listed: Readonly<Record<string, ListedJump>>;
  /** A search or a color is on: with sets matching it, the group is open unless the reader pressed it shut. */
  filtering?: boolean;
  /** The press the page read from `PRECONS_ANNOUNCED_COOKIE`: the server's (and the hydration pass's) stored state. */
  serverPress?: Press | null;
};

export function AnnouncedGroup({
  visit, matches, today, newCodes, opensByItself, view, listed, filtering = false, serverPress = null,
}: AnnouncedGroupProps) {
  const [stored, store] = useStoredView(ANNOUNCED_KEY, isPress, { cookie: PRECONS_ANNOUNCED_COOKIE, serverValue: serverPress });
  // No transition until the page has settled: a state only the browser can know (`#announced`, a press stored
  // before the cookie existed) is drawn at once, never animated open after hydration.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setSettled(true)); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, []);
  const { arrivedByLink, pressed, press: setPressed } = visit;
  // This visit's own press wins over everything; before one, news, the link or a filter it matches opens it
  // (derived, never stored), else the stored press.
  const open = pressed ?? (opensByItself || arrivedByLink || (filtering && matches.length > 0) ? true : stored === "open");
  const toggle = useCallback(() => {
    const next = !open;
    setPressed(next);
    store(next ? "open" : "closed");
  }, [open, store, setPressed]);

  if (matches.length === 0) return null;
  const hasNew = matches.some((m) => newCodes.includes(m.set.code));
  const next = matches.find((m) => !m.set.released);
  const count = open || !next ? copy.count(matches.length) : copy.countNext(matches.length, preconDay(next.set.releasesOn));

  return (
    <section id="announced" aria-labelledby="announced-head" className="flex flex-col" data-testid="announced-group">
      <h2 id="announced-head" className="m-0 font-normal">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="announced-sets"
          onClick={toggle}
          className={`flex min-h-[44px] w-full cursor-pointer items-center gap-[8px] border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)] bg-transparent p-0 text-left font-display text-[17px] font-normal text-[color:var(--fg)] md:min-h-[34px] md:pb-[7px] focus-visible:rounded-[4px] ${FOCUS_RING}`}
        >
          {copy.heading}
          <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{count}</span>
          {hasNew && <span className={NEW_TAG}>{copy.newTag}</span>}
          <span aria-hidden className="ml-auto font-mono text-[12px] text-[color:var(--fg-muted)]">{open ? "▾" : "▸"}</span>
        </button>
      </h2>
      {/* The controlled region. Closed, it keeps no height, no focus and no reading order (`inert`); the
          160ms is a row-track transition, none under reduced motion. */}
      <div
        id="announced-sets"
        inert={!open}
        data-open={open ? "true" : "false"}
        data-settled={settled ? "true" : "false"}
        className={`grid ${settled ? "transition-[grid-template-rows,visibility] duration-[160ms] ease-out motion-reduce:transition-none" : ""} ${open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"}`}
      >
        {/* The clip the collapse needs, widened 4px past the rows on each side and below (padding, taken back by a
            matching negative margin), so a row's 2px ring at its 2px offset draws whole. */}
        <div className={`-mx-[4px] min-h-0 overflow-hidden px-[4px] ${open ? "-mb-[4px] pb-[4px]" : ""}`}>
          {view === "tiles" ? (
            <ul className="m-0 flex list-none flex-col gap-[10px] p-0 pt-[10px]">
              {matches.map((m) => (
                <AnnouncedSet key={m.set.code} match={m} today={today} isNew={newCodes.includes(m.set.code)} listed={listed[m.set.code] ?? null} />
              ))}
            </ul>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-[8px] p-0 pt-[10px]">
              {matches.map((m) => (
                <AnnouncedRow key={m.set.code} match={m} today={today} isNew={newCodes.includes(m.set.code)} identity={setIdentity(m.commanders)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
