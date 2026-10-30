"use client";

// The Announced group on `/decks/precons` (handoff `design_handoff_the99_upcoming_precons`, R2 C1–C3 over R1's
// T and L rows; design table: Announced group, Set block, Revealed card, None plate, `new` tag, Jump). Commander
// sets on the way, above the newest year, in Newest order only. An announced set is never a precon (STATES
// rule 1): a dashed block with no figure, no link and no Start. Its revealed commanders are cards, and open their
// card details (Hugh, 2026-10-15): in tiles they are drawn in the decklists' own tile shell and grid.
//
// The head is a disclosure, CLOSED by default (rule 9: the group never pushes the decklists down unasked). It
// opens by itself when it holds a set this reader has not been shown, or when the address names `#announced`
// (the banner's link) or one set's block (`#announced-<code>`, Home's See the lists, which it then scrolls to), or
// while a filter is on and a set matches it (the reader asked); otherwise this browser's last press holds
// (`the99:precons:announced`, mirrored into a cookie so the server draws it).

import { Chevron } from "../../ui/chevron";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { preconDay, preconsCopy } from "../../../lib/copy/precons";
import type { AnnouncedMatch } from "../../../lib/precons/arrivals";
import type { PreconView } from "../../../lib/precons/list";
import { CardDetailProvider, type ViewPrinting } from "../../cards/card-detail-provider";
import { HoverPreviewProvider } from "../hover-preview";
import { useStoredView } from "../../ui/use-stored-view";
import { PRECONS_ANNOUNCED_COOKIE } from "../../ui/view-cookie";
import { noteAppScroll } from "../../../lib/ui/reveal";
import { AnnouncedSet, FOCUS_RING, NEW_TAG, setIdentity, type ListedJump } from "./announced-parts";
import { AnnouncedRow } from "./announced-row";

const copy = preconsCopy.upcoming;

/** Where this browser keeps its last press on the head: `open` or `closed`. */
export const ANNOUNCED_KEY = "the99:precons:announced";
/** The hash the banner's link carries; the group's own id. */
export const ANNOUNCED_HASH = "#announced";

/**
 * Whether an address's hash opens the group: the banner's `#announced`, or one set's block, `#announced-<code>`
 * (`announcedSetAnchor`; Home's See the lists, Announcements UI 6b). Pure, for a test.
 */
export function opensOnHash(hash: string): boolean {
  return hash === ANNOUNCED_HASH || setAnchorOf(hash) !== null;
}

/** The group's own ids under the same prefix, which name no set. */
const OWN_IDS = new Set(["announced-sets", "announced-head"]);

/** The set block a hash names (`#announced-<code>`, its element id), or null on any other hash. */
export function setAnchorOf(hash: string): string | null {
  const id = hash.slice(1);
  return /^#announced-[a-z0-9]+$/.test(hash) && !OWN_IDS.has(id) ? id : null;
}

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
export type AnnouncedVisit = {
  arrivedByLink: boolean;
  pressed: boolean | null;
  press: (open: boolean) => void;
  /** The set codes a reader pressed Show all on this visit (addendum A1): held here for the same reason, and never stored. */
  openSets: ReadonlySet<string>;
  toggleSet: (code: string) => void;
  /** The set block the arrival named (`#announced-<code>`), latched as the arrival is, so the open group can scroll to it once;
   * null once it has been landed on, for the whole visit, so a group that unmounts and mounts again never jumps back. */
  landOn: string | null;
  landed: (anchor: string) => void;
};

export function useAnnouncedVisit(): AnnouncedVisit {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const onLink = opensOnHash(hash);
  const [arrivedByLink, setArrivedByLink] = useState(false);
  if (onLink && !arrivedByLink) setArrivedByLink(true);
  // A set's anchor, latched: the server drew the group closed, so the browser's own jump to the fragment found a
  // block with no height; the group scrolls to it once it is open (`AnnouncedGroup`).
  const anchor = setAnchorOf(hash);
  const [landOn, setLandOn] = useState<string | null>(null);
  if (anchor && anchor !== landOn) setLandOn(anchor);
  const [landedOn, setLandedOn] = useState<string | null>(null);
  const target = landOn ?? anchor;
  const [pressed, setPressed] = useState<boolean | null>(null);
  const [openSets, setOpenSets] = useState<ReadonlySet<string>>(() => new Set());
  const toggleSet = useCallback((code: string) => {
    setOpenSets((prev) => {
      const next = new Set(prev);
      if (!next.delete(code)) next.add(code);
      return next;
    });
  }, []);
  return { arrivedByLink: arrivedByLink || onLink, pressed, press: setPressed, openSets, toggleSet, landOn: target === landedOn ? null : target, landed: setLandedOn };
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

/**
 * The printing card details views each revealed commander at, on a press and on Prev/Next: the announced set's own,
 * whatever the reader holds, so the modal pictures the card the tile does. One provider serves every set, so a card
 * revealed in two announced sets views the first set's printing (the sooner release, in `matches` order).
 */
export function announcedPrintings(matches: readonly AnnouncedMatch[]): Record<string, ViewPrinting> {
  const out: Record<string, ViewPrinting> = {};
  for (const m of matches) {
    for (const c of m.commanders) {
      // Upper case, as card details' printings carry it (`matchesPreference` compares exactly; `sets.code` is lower),
      // and the printing's own id and back face, so an unowned announced printing is drawn whole, never paired
      // with another printing's back.
      out[c.oracleId] ??= {
        setCode: m.set.code.toUpperCase(), collectorNumber: c.collectorNumber, scryfallId: c.scryfallId,
        imageUri: c.imageUri ?? c.imageUriSmall, backImageUri: c.backImageUri,
      };
    }
  }
  return out;
}

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

  // Arrived on one set's block (`#announced-<code>`): once the group is open, that block is scrolled to, once per anchor.
  const { landOn, landed } = visit;
  useEffect(() => {
    if (!open || !landOn) return;
    const el = document.getElementById(landOn);
    if (!el) return;
    landed(landOn);
    noteAppScroll();
    el.scrollIntoView({ block: "start" });
  }, [open, landOn, landed, matches]);

  const viewPrintings = useMemo(() => announcedPrintings(matches), [matches]);
  if (matches.length === 0) return null;
  const hasNew = matches.some((m) => newCodes.includes(m.set.code));
  const next = matches.find((m) => !m.set.released);
  const count = open || !next ? copy.count(matches.length) : copy.countNext(matches.length, preconDay(next.set.releasesOn));

  return (
    // Card details and the hover preview sit OUTSIDE the collapsible region: a details read that lands after the
    // reader closed the group would otherwise draw its dialog inside a hidden, inert region while it locks the page's
    // scroll, a dialog nobody can see or leave.
    <CardDetailProvider viewPrintings={viewPrintings}>
    <HoverPreviewProvider>
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
          <Chevron kind="disclosure" open={open} className="ml-auto text-[color:var(--fg-muted)]" />
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
                <AnnouncedSet
                  key={m.set.code}
                  match={m}
                  today={today}
                  isNew={newCodes.includes(m.set.code)}
                  listed={listed[m.set.code] ?? null}
                  filtering={filtering}
                  expanded={visit.openSets.has(m.set.code)}
                  onToggleExpanded={() => visit.toggleSet(m.set.code)}
                />
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
    </HoverPreviewProvider>
    </CardDetailProvider>
  );
}
