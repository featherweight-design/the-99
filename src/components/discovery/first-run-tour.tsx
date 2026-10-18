"use client";

// The first-run tour (discovery R3·1b; handoff R3 `STATES-tour-and-need.md`, `design-tables/discovery-r3.md`, boards
// `r3/Tour-*.dc.html` and `TourCard.dc.html`). Six stops over the first-run Home: a scrim with one cutout on the lit
// control, R1's halo ring around it, and `TourCard`, a modal dialog outside the app, which is `inert` while it runs.
//
// It opens once the page has settled, plus `ARRIVE_MS`, with nothing open over Home; a sheet open at load holds it
// until it closes. Opening takes the visit (no moment arrives the same visit) and spends the tour on the server, so a
// reload, a closed tab or Back never shows it again (R3 gap 4). ✕, Esc, Finish and `Read the note ›` end it.
//
// The scrim is one SVG mask, not a box shadow (plan decision 5): a hole per lit control. Every step lights one.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/nextjs";
import { spendTourAction } from "../../app/tour-actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useInertPage } from "../../lib/a11y/inert-page";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { creatorNoteCopy, tourCopy } from "../../lib/copy/discovery";
import { CARD_W, FRAME, PICTURE_FOCUS, phoneDock, cutoutFor, placeCard, stepsFor, tourPictureSrc, type Box, type Step, type TourMode } from "../../lib/discovery/tour-steps";
import { overPageCount, subscribeOverPage, useMomentHold } from "../../lib/moments/hold";
import { takeVisit, withVisitLock } from "../../lib/moments/visit";
import { DEFAULT_THEME } from "../../lib/theme/themes";
import { prefersReducedMotion } from "../../lib/ui/motion";
import { noteAppScroll } from "../../lib/ui/reveal";
import { NoteDialog } from "../about/reference/creator-note";
import { ARRIVE_MS } from "../moments/moments-provider";
import { ThemePicker, themeInForce } from "../shell/theme-picker";
import { useIsDesktop } from "../ui/use-is-desktop";
import { useNavLocked, useTargets } from "./targets-provider";

const c = tourCopy;
const SCRIM = "rgba(6,5,8,.66)";
/** Shipped names the card repeats: the ways group's `Precons I own`, and the note's own title. */
const collectionPrecons = collectionEditCopy.ways.precons;
const noteTitle = creatorNoteCopy.title;

/**
 * This tab spent the tour, for this account. Back can restore a Home whose payload still says the tour is due (the
 * router keeps it), and that remount must not run it again; a reload reads the server, which has the stamp. Keyed by
 * the account, so another account signed in in the same tab still gets its own tour.
 */
const spentKey = (account: string) => `the99.tour.spent:${account}`;
function spentHere(account: string | null | undefined): boolean {
  if (!account) return false;
  try {
    return sessionStorage.getItem(spentKey(account)) === "1";
  } catch {
    return false;
  }
}
function markSpentHere(account: string | null | undefined) {
  if (!account) return;
  try {
    sessionStorage.setItem(spentKey(account), "1");
  } catch {
    // not a fallback: without storage a restored Home can show the tour once more, as before this guard.
  }
}

/**
 * What a step's card says. The checklist's tour is the shipped copy. The tour taken again on a dashboard (R3·2, plan
 * decision 6) points step 1 at the Collection slot and drops the precon line, and its captions follow the shell's own
 * `locked`: a dashboard with decks and no cards still draws a locked nav, so it keeps the `once your cards are in`
 * captions, and only an unlocked nav takes the replay's.
 */
export function stepCopy(step: Step, mode: TourMode, navLocked: boolean | null) {
  const unlocked = navLocked === false;
  switch (step.key) {
    case "collection": {
      const s = c.steps.collection;
      return { place: s.place, title: s.title, body: unlocked ? s.replayBody : s.body, precons: mode === "first-run" };
    }
    case "commanders": {
      const s = c.steps.commanders;
      return unlocked ? { ...s, body: s.replayBody, picture: s.replayPicture } : s;
    }
    case "decks": {
      const s = c.steps.decks;
      return unlocked ? { ...s, picture: s.replayPicture } : s;
    }
    default:
      return c.steps[step.key];
  }
}

/**
 * Mounted on a first-run Home whose tour is due (`tourDue`), and on any Home asked for it again (`/?tour=1`, R3·2;
 * `HomeTour`). `precons`: step 1's precon line (`PRECONS_ENABLED`, with the ways group). `mode`: the checklist, or the
 * real app's dashboard. `again`: asked for (`?tour=1`), so this tab's spent mark does not hold it off.
 */
export function FirstRunTour({ precons, mode = "first-run", again = false }: { precons: boolean; mode?: TourMode; again?: boolean }) {
  const { userId: account } = useAuth();
  // A tour asked for again runs whatever this tab spent: only the unasked remount of a restored Home is held off.
  const [phase, setPhase] = useState<"waiting" | "claiming" | "running" | "done">(() => (!again && spentHere(account) ? "done" : "waiting"));
  const [note, setNote] = useState(false);
  // This tab holds the claim: anything that came over Home while the claim was asked waits it out, then the tour
  // opens without asking again.
  const claimed = useRef(false);
  // Moves on each landed claim, so the wait re-arms even when "claiming" and "waiting" commit in one batch.
  const [armed, setArmed] = useState(0);

  useEffect(() => {
    if (phase !== "waiting") return;
    let timer: number | undefined;
    // Clear means the page has settled (`load`), the tab is in front, and nothing stands over Home; every path into
    // `arm` checks all three, so a tour is never spent where nobody is looking.
    const clear = () =>
      document.readyState === "complete" && !document.hidden && overPageCount().locks === 0 && overPageCount().holds === 0;
    // Each time the page might be clear, start the wait again; anything opening over Home cancels it.
    const arm = () => {
      window.clearTimeout(timer);
      if (!clear()) return;
      timer = window.setTimeout(() => {
        if (!clear()) return;
        if (claimed.current) {
          // Under the lock every tab's moments share, so another tab's touch cannot write the visit back untaken.
          void withVisitLock(() => takeVisit());
          setPhase("running");
          return;
        }
        // Asked for again (`?tour=1`, R3·2): no claim, which only the tab that stamps a null `tour_seen_at` wins and a
        // replay never would. The spend still runs, and writes only while the stamp is null, so a replay moves none.
        if (again) {
          claimed.current = true;
          markSpentHere(account);
          void spendTourAction().catch(() => {});
          void withVisitLock(() => takeVisit());
          setPhase("running");
          return;
        }
        // The account may have loaded after the first render: its mark is read again at the moment of opening.
        if (spentHere(account)) {
          setPhase("done");
          return;
        }
        // The tour opens only for the one tab whose claim stamps it: two tabs waiting on one first-run Home both ask,
        // and the second gets nothing back. A claim that fails to answer opens it anyway: it may or may not have
        // written the stamp, and showing the tour once more is the better of the two ways to be wrong.
        setPhase("claiming");
        void spendTourAction()
          .then((answer) => answer.claimed, () => true)
          .then((took) => {
            markSpentHere(account);
            if (!took) {
              setPhase("done");
              return;
            }
            // Back to the wait, which this time opens at once, and only while the page is still clear: a sheet opened,
            // or the tab left, while the claim was asked holds it until that ends.
            claimed.current = true;
            setPhase("waiting");
            setArmed((n) => n + 1);
          });
      }, claimed.current ? 0 : ARRIVE_MS);
    };
    const settled = () => arm();
    arm();
    if (document.readyState !== "complete") window.addEventListener("load", settled, { once: true });
    const off = subscribeOverPage(arm);
    // Leaving the tab cancels the wait (`arm` clears the timer and finds the page not clear); coming back starts it again.
    document.addEventListener("visibilitychange", arm);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", settled);
      document.removeEventListener("visibilitychange", arm);
      off();
    };
  }, [phase, account, armed, again]);

  if (phase === "running")
    return (
      <TourRun
        precons={precons}
        mode={mode}
        onEnd={(withNote) => {
          setNote(withNote);
          setPhase("done");
        }}
      />
    );
  // `Read the note ›` ends the tour and opens the note; closing it lands on Home.
  if (phase === "done" && note) return <NoteDialog onClose={() => setNote(false)} />;
  return null;
}

const sameBox = (a: Box | null, b: Box | null) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

function TourRun({ precons, mode, onEnd }: { precons: boolean; mode: TourMode; onEnd: (withNote: boolean) => void }) {
  const targets = useTargets();
  const navLocked = useNavLocked();
  const dock = phoneDock(navLocked);
  const STEPS = stepsFor(mode);
  const desktop = useIsDesktop();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  // The card and the scrim live in their own host under <body>, so the app beside it can be inert as a whole.
  const [host] = useState(() => {
    const el = document.createElement("div");
    el.dataset.tour = "";
    return el;
  });
  useLayoutEffect(() => {
    document.body.appendChild(host);
    return () => host.remove();
  }, [host]);
  // Where focus was before the tour, read during the first render: the page goes inert in a layout effect, before the
  // dialog hook's own capture runs, and an inert control has already lost focus by then.
  const [returnTo] = useState<{ current: HTMLElement | null }>(() => ({
    current: document.activeElement instanceof HTMLElement ? document.activeElement : null,
  }));
  useInertPage(host, true);

  // The lit control's box, read every frame: the page scrolls, the rail settles, a theme changes the type.
  const [rect, setRect] = useState<Box | null>(null);
  const [frame, setFrame] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const r = targets?.targetRect(step.target) ?? null;
      const next = r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
      setRect((prev) => (sameBox(prev, next) ? prev : next));
      setFrame((prev) => (prev.w === window.innerWidth && prev.h === window.innerHeight ? prev : { w: window.innerWidth, h: window.innerHeight }));
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [targets, step.target]);

  const cardRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Esc skips. The tour scrolls the page itself, so the body is never locked.
  useDialogA11y(cardRef, () => onEnd(false), { initialFocusRef: nextRef, lockScroll: false, returnFocusRef: returnTo });

  // Null until the card has been measured once; it is hidden only until then.
  const [cardH, setCardH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCardH(el.offsetHeight));
    ro.observe(el);
    setCardH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // Focus stays in the card. It is hidden until measured, and a browser ignores focus on a hidden control, so the
  // dialog's own first focus can land while Next is still invisible; and Back pressed on step 2 is gone on step 1.
  // So once the card shows, and on every step, focus Next when focus is not in the card already.
  const shown = cardH !== null;
  useEffect(() => {
    if (shown && !cardRef.current?.contains(document.activeElement)) nextRef.current?.focus({ preventScroll: true });
  }, [shown, index]);
  // A card scrolled to its foot on a short screen opens the next step from its top.
  useLayoutEffect(() => {
    if (cardRef.current) cardRef.current.scrollTop = 0;
  }, [index]);
  // Focus stays on Next or Back as the step changes, so the new stop is announced: its place and title, once per
  // change (the dialog's own label covers the opening).
  const [announce, setAnnounce] = useState("");
  const opened = useRef(false);
  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      return;
    }
    setAnnounce(`${c.kicker(index + 1, STEPS.length, c.steps[STEPS[index].key].place)}. ${c.steps[STEPS[index].key].title}`);
    // `STEPS` is one of two module constants (`stepsFor`), fixed for the run: listed, it never fires the effect.
  }, [index, STEPS]);
  // While it runs, nothing else arrives over the page.
  useMomentHold(true);

  // At 390 the docked card covers the page's foot, so the page gets that much room to scroll under it while the tour
  // runs: a short first-run page could not otherwise bring step 1's controls clear of the card. Restored on the way out.
  useLayoutEffect(() => {
    if (desktop) return;
    const body = document.body;
    const was = body.style.paddingBottom;
    body.style.paddingBottom = `${dock + (cardH ?? 0)}px`;
    return () => {
      body.style.paddingBottom = was;
    };
  }, [desktop, cardH, dock]);

  // At 390 step 1 brings its controls to the top, the fan above the fold; every other step reads from the top, and so
  // does the dashboard's step 1, whose slot is in the fixed tab bar.
  useLayoutEffect(() => {
    const r = !desktop && step.target === "tour:step-one" ? targets?.targetRect(step.target) : null;
    noteAppScroll();
    window.scrollTo({ top: r ? window.scrollY + r.top - 14 : 0, behavior: "instant" });
  }, [desktop, step.key, step.target, targets, cardH]);

  // The card crossfades between steps; reduced motion cuts.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!prefersReducedMotion()) cardRef.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
  }, [index]);

  const maskId = useId();
  const titleId = useId();
  const bodyId = useId();
  const litId = useId();
  const cut = rect ? cutoutFor(rect, step.kind, !desktop) : null;
  // Step 6 with no line on Home to light (R3 gap 6): the card stands centred and drops the line's sentence.
  const fallback = !rect;
  const place = desktop ? placeCard(step.place, rect, { w: CARD_W, h: cardH ?? 0 }, frame) : null;
  const theme = themeInForce(DEFAULT_THEME);
  const picture = step.picture ? { src: tourPictureSrc(theme, step.picture) } : null;
  const copy = stepCopy(step, mode, navLocked);
  // The card never runs past the screen: on a short viewport (a phone on its side) its content scrolls inside it.
  const maxHeight = frame.h - FRAME * 2 - (!desktop && !fallback ? dock - FRAME : 0);
  const glide = "transition-[x,y,width,height,rx] duration-[240ms] ease-[var(--motion-ease-out)] motion-reduce:transition-none";

  return createPortal(
    <>
      <svg aria-hidden data-tour-scrim className="fixed inset-0 z-[70] h-full w-full">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {cut && <rect className={glide} style={{ x: cut.x, y: cut.y, width: cut.w, height: cut.h, rx: cut.r }} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill={SCRIM} mask={`url(#${maskId})`} />
      </svg>
      {cut && (
        <div
          aria-hidden
          data-tour-ring
          className="pointer-events-none fixed z-[70] shadow-[0_0_0_2px_color-mix(in_oklab,var(--accent)_75%,transparent),0_0_0_6px_color-mix(in_oklab,var(--accent)_20%,transparent)] transition-[left,top,width,height,border-radius] duration-[240ms] ease-[var(--motion-ease-out)] motion-reduce:transition-none"
          style={{ left: cut.x, top: cut.y, width: cut.w, height: cut.h, borderRadius: cut.r }}
        />
      )}
      <section
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={fallback ? undefined : `${bodyId} ${litId}`}
        data-tour-card={step.key}
        className="fixed z-[71] flex flex-col overflow-y-auto overscroll-contain rounded-[14px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-[14px_16px_16px] text-left text-[color:var(--fg-body)] shadow-[0_24px_60px_rgba(0,0,0,.55)] max-md:left-[16px] max-md:right-[16px] md:w-[340px] md:p-[14px_16px_14px_18px]"
        style={{
          maxHeight,
          ...(place
            ? { left: place.x, top: place.y, visibility: cardH === null ? "hidden" : "visible" }
            : // At 390 the card is docked above the tab bar, or centred when there is nothing to light (R3 gap 6).
              fallback
              ? { top: Math.max(FRAME, (frame.h - (cardH ?? 0)) / 2), visibility: cardH === null ? "hidden" : "visible" }
              : // 12px above the tab bar the shell draws: 100 with the locked bar (88), 86 open (`phoneDock`).
                { bottom: dock }),
        }}
      >
        <div className="flex items-center justify-between gap-[10px]">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--accent)]">
            {c.kicker(index + 1, STEPS.length, copy.place)}
          </span>
          <button
            type="button"
            aria-label={c.skip}
            onClick={() => onEnd(false)}
            className="-my-[10px] -mr-[12px] h-[44px] w-[44px] flex-none rounded-[8px] text-[15px] text-[color:var(--fg-faint)] focus-visible:text-[color:var(--fg)] focus-visible:shadow-[0_0_0_2px_var(--accent)] focus-visible:outline-none md:-my-[6px] md:-mr-[8px] md:h-[32px] md:w-[32px] md:text-[13px]"
          >
            ✕
          </button>
        </div>
        <h2 id={titleId} className="m-0 mt-[8px] font-display text-[20px] font-semibold leading-[1.2] text-[color:var(--fg)] md:mt-[6px] md:text-[19px]">
          {copy.title}
        </h2>
        {!(fallback && step.key === "whatsNew") && (
          <p id={bodyId} className="m-0 mt-[6px] text-pretty text-[14px] leading-[1.55] md:text-[13.5px]">
            {copy.body}
          </p>
        )}
        {!fallback && <span id={litId} className="sr-only">{c.litAria(c.lit[step.lit])}</span>}
        <span aria-live="polite" aria-atomic="true" className="sr-only" data-tour-announce>
          {announce}
        </span>

        {step.key === "collection" && (
          <>
            {precons && "precons" in copy && copy.precons && (
              <p className="m-0 mt-[8px] text-pretty text-[14px] leading-[1.55] md:text-[13.5px]">
                {c.steps.collection.precons.lead} <b className="font-semibold text-[color:var(--fg)]">{collectionPrecons}</b>{" "}
                {c.steps.collection.precons.rest}
              </p>
            )}
            <p className="m-0 mt-[10px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{c.steps.collection.foot}</p>
          </>
        )}

        {picture && "picture" in copy && (
          <>
            <div className="mt-[12px] h-[128px] shrink-0 overflow-hidden rounded-[9px] border border-solid border-[color:var(--border-strong)] md:h-[118px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- a checked-in capture, sized by its box */}
              <img src={picture.src} alt={copy.pictureAlt} className="block h-full w-full object-cover" style={{ objectPosition: step.picture ? PICTURE_FOCUS[step.picture] : undefined }} />
            </div>
            <span className="mt-[6px] font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.picture}</span>
          </>
        )}

        {step.key === "look" && <ThemePicker current={theme} panel="tour" />}

        {step.key === "whatsNew" && (
          <div className="mt-[14px] flex flex-col gap-[6px] border-0 border-t border-solid border-[color:var(--border)] pt-[12px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{noteTitle}</span>
            <p className="m-0 text-[14px] italic leading-[1.55] text-[color:var(--fg-muted)] md:text-[13px]">{c.steps.whatsNew.noteLead}</p>
            <button
              type="button"
              onClick={() => onEnd(true)}
              className="min-h-[44px] self-start border-0 bg-transparent p-0 text-[14px] text-[color:var(--accent)] underline decoration-[color-mix(in_oklab,var(--accent)_55%,transparent)] underline-offset-[3px] md:min-h-[24px] md:text-[13px]"
            >
              {c.steps.whatsNew.notePress}
            </button>
          </div>
        )}

        <div className="mt-[14px] flex items-center justify-between gap-[12px]">
          <span role="img" aria-label={c.progressAria(index + 1, STEPS.length)} className="flex items-center gap-[6px]">
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                aria-hidden
                className={`rotate-45 ${i === index ? "h-[8px] w-[8px] bg-[color:var(--accent)]" : i < index ? "h-[6px] w-[6px] bg-[color-mix(in_oklab,var(--accent)_45%,transparent)]" : "h-[6px] w-[6px] bg-[color:var(--border-strong)]"}`}
              />
            ))}
          </span>
          <span className="flex flex-none gap-[8px]">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex(index - 1)}
                className="h-[44px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] text-[14px] text-[color:var(--fg)] md:h-[32px] md:rounded-[8px] md:px-[12px] md:text-[12.5px]"
              >
                {c.back}
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={() => (last ? onEnd(false) : setIndex(index + 1))}
              className="h-[44px] rounded-[10px] border-0 bg-[color:var(--fg)] px-[20px] text-[14px] font-semibold text-[color:var(--bg)] md:h-[32px] md:rounded-[8px] md:px-[14px] md:text-[12.5px]"
            >
              {last ? c.finish : c.next}
            </button>
          </span>
        </div>
      </section>
    </>,
    host,
  );
}
