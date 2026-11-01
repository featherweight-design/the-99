"use client";

// Hide a commander, on the commander's own page (design_handoff_the99_hide_commander README §4, the
// Page board). One state for the whole page, so the band's kicker, the hero's rank clause, the note
// and the Hide line all flip together the moment the player presses, at both widths.
//
// OPTIMISTIC: the press changes the page at once and the action confirms it. A refusal (the action
// answers false, or throws) puts the page back and says so in the shared toast. Both writes are
// idempotent, so only the newest press is allowed to put anything back: an Unhide racing the Hide it
// undoes must land on the state the player last asked for.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { hideCommanderAction, unhideCommanderAction } from "../../app/commanders/actions";
import { explainedCopy, hideCommanderCopy } from "../../lib/copy/commander-explained";
import { ToastFrame, useToastClock } from "../collection/edit-toast";

type Control = "hide" | "unhide";

type HideState = {
  hidden: boolean;
  toggle: () => void;
  name: string;
  /** Each drawn control registers here, so focus can move to the one the press reveals. */
  register: (kind: Control, el: HTMLButtonElement | null) => (() => void) | undefined;
};

const HideContext = createContext<HideState | null>(null);

function useHide(): HideState {
  const state = useContext(HideContext);
  if (!state) throw new Error("A hide control is drawn outside CommanderHideProvider");
  return state;
}

export function CommanderHideProvider({
  oracleId,
  name,
  hidden: served,
  children,
}: {
  oracleId: string;
  /** The name the page heads with, for the controls' labels and the refusal. */
  name: string;
  /** What the server read. */
  hidden: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  // The server's answer seeds the page; from then on the player's presses own it. A refresh (after
  // an Unhide, below) brings a new `served` that agrees with the confirmed write, and adopting it would
  // only clobber a press made while the refresh was in flight.
  const [hidden, setHidden] = useState(served);
  const [toast, setToast] = useState<string | null>(null);
  // Which control takes focus once the press has drawn it. A ref, not state: it only says where focus
  // goes after a render the press already causes.
  const focusTo = useRef<Control | null>(null);
  const latest = useRef(0);
  const controls = useRef({ hide: new Set<HTMLButtonElement>(), unhide: new Set<HTMLButtonElement>() });

  // A ref callback: registers the drawn control and hands React 19 the cleanup that removes it.
  const register = useCallback((kind: Control, el: HTMLButtonElement | null) => {
    if (!el) return undefined;
    controls.current[kind].add(el);
    return () => {
      controls.current[kind].delete(el);
    };
  }, []);

  // The control a press reveals takes focus: Unhide after Hide, the Hide line after Unhide. The page
  // draws each control twice (phone and desktop, one `display: none`), so the one that has a box wins.
  useEffect(() => {
    const target = focusTo.current;
    if (!target) return;
    focusTo.current = null;
    const drawn = [...controls.current[target]];
    // Without scrolling: on desktop the revealed control sits in the other column, and a scroll to it
    // would move the page out from under the press.
    (drawn.find((el) => el.getClientRects().length > 0) ?? drawn[0])?.focus({ preventScroll: true });
  }, [hidden]);

  const toggle = useCallback(() => {
    const was = hidden;
    const next = !was;
    const ask = ++latest.current;
    setHidden(next);
    setToast(null);
    focusTo.current = next ? "unhide" : "hide";
    const refuse = () => {
      if (ask !== latest.current) return;
      setHidden(was);
      focusTo.current = was ? "unhide" : "hide";
      setToast(next ? hideCommanderCopy.hideRefused(name) : hideCommanderCopy.unhideRefused(name));
    };
    (next ? hideCommanderAction(oracleId) : unhideCommanderAction(oracleId)).then(
      (ok) => {
        if (!ok) return refuse();
        // A page served hidden carries no rank. Brought back, it has one again, which only the server can
        // count; the refresh re-reads this page alone. A Hide needs none: the rank it covers is still the
        // rank, should the player take the Hide back.
        if (!next || ask !== latest.current) return;
        if (served) router.refresh();
      },
      refuse,
    );
  }, [hidden, name, oracleId, router, served]);

  return (
    <HideContext.Provider value={{ hidden, toggle, name, register }}>
      {children}
      {toast ? <RefusalToast key={toast} title={toast} onDone={() => setToast(null)} /> : null}
    </HideContext.Provider>
  );
}

function RefusalToast({ title, onDone }: { title: string; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  useToastClock(ref, !hover && !focus, onDone);
  return (
    <ToastFrame
      frameRef={ref}
      role="alert"
      placement="center"
      kind="hide-refused"
      title={title}
      onHold={(which, on) => (which === "hover" ? setHover : setFocus)(on)}
    />
  );
}

/** The eye with a slash through it: the Page board's glyph, drawn by the note and by the Hide line. */
function EyeOff({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none", ...style }}
    >
      <path d="M10.7 5.1A10.7 10.7 0 0 1 21.9 11.7a1 1 0 0 1 0 .7 10.7 10.7 0 0 1-1.4 2.5" />
      <path d="M14.1 14.2a3 3 0 0 1-4.2-4.2" />
      <path d="M17.5 17.5A10.8 10.8 0 0 1 2.1 12.3a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.4-5.1" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

/** The phone band's kicker: the rank, or *Hidden* in its place. */
export function BandKicker({ rank, isBestFit }: { rank: number | null; isBestFit: boolean }) {
  const { hidden } = useHide();
  if (hidden) return <>{hideCommanderCopy.kicker}</>;
  // Served hidden and just brought back: the rank arrives with the refresh. A no-break space holds the
  // line, since the band's label block is measured with it in.
  if (rank === null) return <>{" "}</>;
  return (
    <>
      Rank {rank}
      {isBestFit ? " · your best fit" : ""}
    </>
  );
}

/** The hero's rank clause: the rank, *Best in your pool*, or *Not ranked while hidden*. */
export function HeroRankClause({
  rank,
  isBestFit,
  isPhone,
}: {
  rank: number | null;
  isBestFit: boolean;
  isPhone: boolean;
}) {
  const { hidden } = useHide();
  if (hidden) {
    return (
      <span
        className="font-mono"
        style={{ fontSize: 13, color: "var(--fg-locked)", marginLeft: isPhone ? 0 : 6 }}
      >
        {hideCommanderCopy.notRanked}
      </span>
    );
  }
  if (rank === null) return null;
  return isBestFit ? (
    <span
      className="font-sans font-[600]"
      style={{ fontSize: 13, color: "var(--success)", marginLeft: isPhone ? 0 : 6 }}
    >
      {explainedCopy.score.bestInPool}
    </span>
  ) : (
    <span className="font-mono" style={{ fontSize: 13, color: "var(--fg-faint)" }}>
      Rank #{rank}
    </span>
  );
}

/**
 * The note a hidden commander's page leads with: the hero's shipped synergy-note shape (`FitHero`'s
 * `--elevated-hover` ground, `--border-strong` edge and 2px `--fg-faint` left edge), the glyph, the
 * sentence and **Unhide**. Nothing while the commander is not hidden.
 */
export function HiddenNote() {
  const { hidden, toggle, name, register } = useHide();
  if (!hidden) return null;
  return (
    <div
      data-hidden-note
      className="flex items-start gap-[10px] rounded-[8px]"
      style={{
        background: "var(--elevated-hover)",
        border: "1px solid var(--border-strong)",
        borderLeft: "2px solid var(--fg-faint)",
        padding: "9px 8px 9px 13px",
      }}
    >
      <EyeOff size={15} style={{ color: "var(--fg-faint)", marginTop: 2 }} />
      <p
        className="m-0 min-w-0 flex-1"
        style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-muted)", paddingTop: 1 }}
      >
        <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>{hideCommanderCopy.note.heading}</strong>{" "}
        {hideCommanderCopy.note.body}
      </p>
      <button
        type="button"
        ref={(el) => register("unhide", el)}
        onClick={toggle}
        aria-label={hideCommanderCopy.unhideAria(name)}
        className="flex-none inline-flex cursor-pointer items-center border-0 bg-transparent font-sans font-semibold text-[color:var(--accent-text)]"
        style={{ minHeight: 44, margin: "-12px 0", padding: "0 6px", fontSize: 12.5, lineHeight: 1.4 }}
      >
        <span style={{ borderBottom: "1px solid var(--accent-shadow)" }}>{hideCommanderCopy.unhide}</span>
      </button>
    </div>
  );
}

/**
 * The quiet *Hide from lists* line the page offers while the commander is not hidden: under the hero
 * on the phone, under the build note on desktop. Nothing over the band or the card face.
 */
export function HideLine({ width }: { width: "phone" | "desktop" }) {
  const { hidden, toggle, register } = useHide();
  if (hidden) return null;
  const isPhone = width === "phone";
  return (
    <button
      type="button"
      ref={(el) => register("hide", el)}
      onClick={toggle}
      className={`flex cursor-pointer items-center gap-[8px] border-0 bg-transparent p-0 font-sans font-medium text-[color:var(--fg-muted)] transition-colors hover:text-[color:var(--fg-body)] ${isPhone ? "justify-start self-start" : "justify-center"}`}
      // The phone line sits in a 16px-gap column; its negative margins pull the 44px target's slack back
      // into the gaps, as the board draws it.
      style={{ minHeight: 44, fontSize: 13, ...(isPhone ? { margin: "-8px 0 -8px 2px" } : {}) }}
    >
      <EyeOff size={15} />
      {hideCommanderCopy.hide}
    </button>
  );
}
