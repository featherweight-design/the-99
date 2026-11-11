"use client";
// Try it, the live dummy app (public landing, 5l; addendum A2 `A2-Demo-*`): the section keeps ONE card, the start card (with
// Carry on from step N and Start over after a close), and Start opens the demo as a FULL-SCREEN DIALOG at every width. The
// dialog is a pinned top bar (Step N of 8, the bar, Skip to the end, a bare close), then: below 1024px one column that scrolls
// (the step's words and the app) between the bar and a pinned Back/Next bar, centred at 680px from 768; from 1024px two
// columns, the words at the left (320px, 360px from 1200) with Back and Next directly under them and never scrolling, and
// only the app side scrolling, its content capped at 1080px. ONE component at every width, laid out by CSS alone. The app is
// the signed-in drawing halves fed by the committed fixture data and wrapped in the demo's inert providers; nothing typed or
// pressed here reaches any account. The end draws inside the dialog and carries the real launch form. The dialog reuses the
// shipped parts: `useDialogA11y` (scroll lock, focus trap, Escape, the browser's Back closes it) and `useInertWhileOpen`.
//
// The page hands this only the start and end cards' art. The fixture (~650 KB) and the steps that draw it (`demo-steps`, which
// pulls in the signed-in tools and their copy) are two chunks: Start loads both with a dynamic `import()`, shows the button
// pending meanwhile, and a failed load of either says so and leaves Start to press again. Nothing here imports them statically,
// so the landing's first load carries neither (`scripts/lib/client-graph.test.mts` pins the deck tools' copy out of it).
//
// The card details are more chunks (`lib/demo/card-details.ts`, the loader the steps chunk re-exports), one per step's cards: on
// entering a step the frame fetches that step's chunks (`cardStepsFor`) when the browser is idle, so the first press finds them
// loaded, and once they have landed it fetches the next step's the same way (not on a data-saving connection), so the step after opens
// its cards at the first press too. A press that comes first (or after a failed fetch) fetches the step's chunks and opens the card on arrival. What has landed
// stays in memory, merged: a step's chunks are never fetched twice. Until a step's are in hand no press opens a card, so no ring
// and no sentence promises one; the frame draws them when they land.

import { useDialogA11y } from "../../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../../lib/a11y/inert-page";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { landingCopy } from "../../../lib/copy/landing";
import { DEMO_PLAYER } from "../../../lib/demo/player";
import { fanOf, type DemoArtCard } from "../../../lib/demo/art";
import type { DemoCardData, DemoCardStep } from "../../../lib/demo/project-cards";
import type { Projected } from "../../../lib/demo/projected";
import type { DemoCardHost as DemoCardHostComponent, StepBody as StepBodyComponent, cardStepsOf as CardStepsOfFn, detailFor as DetailForFn, loadDemoCardDetails as LoadCardsFn, mergeCardChunks as MergeFn } from "./demo-steps";
import type { DemoOpened } from "./demo-card-host";
import type { DemoDeckRole } from "./demo-detail";
import { FadingImg } from "../../ui/hydrated-art";
import { LaunchPanel } from "../launch-panel";
import { Lead, Section } from "../section";
import { PressRing } from "./demo-ring";
import { DemoProviders } from "./demo-providers";
import { ringPlace, ringTarget, stepOpensCards } from "./demo-rings";

const c = landingCopy.demo;
const STEPS = c.steps.length;

type Phase = { kind: "start" } | { kind: "step"; index: number } | { kind: "end"; skippedFrom: number | null };

const phaseKey = (p: Phase) => (p.kind === "step" ? `step-${p.index}` : p.kind === "end" ? `end-${p.skippedFrom ?? "none"}` : "start");

/** The section's one card: the start card (and its resume state). */
const FRAME = "mt-[24px] overflow-hidden rounded-[16px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)]";
const BUTTON = "inline-flex h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] px-[18px] text-[14px]";
/** Start and Next: the main button, ink on the page's ground. */
const BTN_L = `${BUTTON} border-0 bg-[color:var(--fg)] font-medium text-[color:var(--bg)]`;
/** Back and Start over: the quiet one, bordered. */
const BTN_Q = `${BUTTON} border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] font-normal text-[color:var(--fg)]`;
const HEADING = "m-0 font-display font-bold leading-[1.25] text-[color:var(--fg)] focus:outline-none";
const CHIP = "inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-[6px] border border-solid px-[8px] font-mono text-[10.5px] font-medium tracking-[0.04em]";
const CHIP_FREE = `${CHIP} border-[color:color-mix(in_oklab,var(--success)_45%,transparent)] text-[color:var(--success)]`;
const CHIP_CREDIT = `${CHIP} border-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] text-[color:var(--accent-text)]`;
const LINK = "cursor-pointer border-0 bg-transparent p-0 underline underline-offset-[3px]";

/** The eight-segment bar: a segment is lit through the step shown (all of them on the end). */
function Bar({ lit }: { lit: number }) {
  return (
    <span aria-hidden className="flex flex-1 gap-[4px]">
      {c.steps.map((s, i) => (
        <span key={s.id} data-on={i < lit || undefined} className="block h-[4px] flex-1 rounded-[2px] bg-[color:var(--border-strong)] data-[on]:bg-[color:var(--accent)]" />
      ))}
    </span>
  );
}

const LABEL = "whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-[color:var(--fg-muted)]";

/** Three cards of the player's own binder, fanned (-8, -1 and 7 degrees): the start and the end cards' picture. */
function Fan({ images }: { images: readonly DemoArtCard[] }) {
  if (images.length === 0) return null;
  const spots = [
    "left-0 top-[26px] rotate-[-8deg]",
    "left-[56px] top-[6px] z-[2] rotate-[-1deg] md:left-[84px]",
    "left-[112px] top-[28px] rotate-[7deg] md:left-[168px]",
  ];
  return (
    <div aria-hidden data-testid="demo-fan" className="relative h-[204px] w-[240px] flex-none self-center md:h-[250px] md:w-[330px]">
      {images.slice(0, 3).map(({ src, name }, i) => (
        <span key={i} className={`absolute block aspect-[488/680] w-[118px] overflow-hidden rounded-[14px] border border-solid border-[color:var(--border-strong)] shadow-[0_10px_24px_rgba(0,0,0,0.45)] md:w-[150px] ${spots[i]}`}>
          <FadingImg src={src} alt={name} loading="lazy" className="block h-full w-full object-cover" />
        </span>
      ))}
    </div>
  );
}

type Load = "idle" | "loading" | "failed";

/** What Start loads: the fixture, the steps' component, the card dialog's host, and the card details' loader with the lookup a press opens by and the chunks a step needs. */
type LoadedApp = {
  data: Projected;
  Body: typeof StepBodyComponent;
  Host: typeof DemoCardHostComponent;
  cards: { load: typeof LoadCardsFn; detailFor: typeof DetailForFn; stepsOf: typeof CardStepsOfFn; merge: typeof MergeFn };
};

/** Run `task` when the browser is idle (Safari has no idle callback: a short timer stands in). */
function whenIdle(task: () => void) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(task, { timeout: 2000 });
  else setTimeout(task, 200);
}

/**
 * The app's pending mark (`PendingTrack`: a segment sweeping along the bottom edge), drawn inside a button that holds no link.
 * The strip sits in a layer the size of the button, clipped to the button's own radius (`clip-path`, because a rounded
 * `overflow: hidden` does not clip a child that animates its opacity and transform): a strip clipped on its own would have
 * square ends that poke out past the button's rounded bottom corners.
 */
function PendingSweep() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[10px] [clip-path:inset(0_round_10px)]">
      <span data-pending className="anim-pending-in pending-track absolute inset-x-0 bottom-0 overflow-hidden">
        <span className="anim-pending-sweep block h-full w-[40%] bg-[color:var(--bg)]" />
      </span>
    </span>
  );
}

/**
 * The full-screen dialog: scroll-locked, focus-trapped, inert page behind it, closed by the bare close, Escape or the browser's
 * Back (`useDialogA11y`); focus lands on the step's heading and returns to the section's main button. The pinned top bar is
 * `--surface-raised` over `--border-strong`: the label (Step N of 8, or The end), the bar, Skip to the end (steps only) and the close.
 */
function DemoDialog({ onClose, returnFocusRef, headingRef, label, lit, onSkip, children }: {
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  headingRef: RefObject<HTMLElement | null>;
  label: ReactNode;
  lit: number;
  onSkip: (() => void) | null;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, onClose, { initialFocusRef: headingRef, returnFocusRef });
  const inertRef = useInertWhileOpen(true);
  return (
    <div ref={inertRef} role="presentation" className="fixed inset-0 z-50 flex flex-col bg-[color:var(--bg)]">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={c.title} tabIndex={-1} data-testid="demo-dialog" className="flex min-h-0 flex-1 flex-col focus:outline-none">
        <div className="flex flex-none items-center gap-[12px] border-b border-solid border-b-[color:var(--border-strong)] bg-[color:var(--surface-raised)] py-[4px] pl-[16px] pr-[4px] md:pl-[24px] md:pr-[12px]">
          {label}
          <Bar lit={lit} />
          {onSkip ? (
            <button type="button" onClick={onSkip} className={`${LINK} flex min-h-[44px] items-center whitespace-nowrap text-[13px] text-[color:var(--fg-muted)] decoration-[color:var(--fg-faint)]`}>
              {c.skip}
            </button>
          ) : null}
          <button
            type="button"
            aria-label={c.closeAria}
            onClick={onClose}
            className="inline-flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[16px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[color:var(--accent)]"
          >
            <span aria-hidden="true">{"\u2715"}</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Demo({ art, publicPages }: { art: readonly DemoArtCard[]; publicPages: boolean }) {
  const [phase, setPhase] = useState<Phase>({ kind: "start" });
  // The fixture and the steps' component, set together once both chunks have landed (`Start`); a step is drawn only with both.
  const [loadedApp, setLoadedApp] = useState<LoadedApp | null>(null);
  const [load, setLoad] = useState<Load>("idle");
  // The card details landed so far (their own chunks, fetched for the step on screen and the one after, merged): null until the
  // first lands, and for good in a file with none. A step's cards are in it once its chunks are (`loadedSteps`).
  const [cardData, setCardData] = useState<DemoCardData | null>(null);
  // The card details open (read-only, from `cardData`): the card, the list it pages, the control to give focus back to and the
  // deck it was pressed in. A press on a card the data holds no details for opens nothing.
  const [opened, setOpened] = useState<DemoOpened | null>(null);
  const appRef = useRef<LoadedApp | null>(null);
  const cardDataRef = useRef<DemoCardData | null>(null);
  const loadedSteps = useRef(new Set<DemoCardStep>());
  // The phase as `go` last set it, and whether the card is still mounted: a promise's callback outlives the render that
  // started it, so it reads these instead of a stale closure.
  const mainButton = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  // The dialog's two scrollers (below 1024px the column, from 1024px the app side): Next and Back put both at the top.
  const columnScroll = useRef<HTMLDivElement | null>(null);
  const appScroll = useRef<HTMLDivElement | null>(null);
  // Whether the full-screen dialog is up. The phase outlives it: a close mid-way leaves the step to carry on from.
  const [dialogOpen, setDialogOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const handled = useRef(phaseKey(phase));
  const phaseNow = useRef<Phase>(phase);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // The chunks of `steps`, fetched (the loader fetches each once and keeps the object; a failed fetch is not kept, so asking again
  // retries) and merged into what has landed. Rejects with the fetch; resolves null unless every chunk had data (a file with none).
  const fetchSteps = useCallback((steps: readonly DemoCardStep[]): Promise<DemoCardData | null> => {
    const app = appRef.current;
    if (!app) return Promise.resolve(null);
    return Promise.all(steps.map((step) => app.cards.load(step))).then((read) => {
      const got = read.flatMap((cards, i) => (cards ? [{ step: steps[i], cards }] : []));
      if (!mounted.current) return null;
      if (got.some((g) => !loadedSteps.current.has(g.step))) {
        const merged = app.cards.merge([...(cardDataRef.current ? [cardDataRef.current] : []), ...got.map((g) => g.cards)]);
        if (merged) {
          for (const g of got) loadedSteps.current.add(g.step);
          cardDataRef.current = merged;
          setCardData(merged);
        }
      }
      return got.length === steps.length ? cardDataRef.current : null;
    });
  }, []);
  const openCard = useCallback(
    (oracleId: string, siblings: DemoOpened["siblings"], opener: HTMLElement | null, role: DemoDeckRole | null) => {
      // Every opener in the demo names its control; what holds focus now is only the last resort (it is the body after a press in Safari and on touch).
      const from = opener ?? (document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
      const show = (cards: DemoCardData) => {
        if (!appRef.current?.cards.detailFor(cards, oracleId, role)) return;
        setOpened({ oracleId, siblings, opener: from, role });
      };
      const app = appRef.current;
      const now = phaseNow.current;
      const cards = cardDataRef.current;
      // The details in hand: open. (Cards of an earlier step stay in memory, so a card the step shares with one opens at once.)
      if (cards && app?.cards.detailFor(cards, oracleId, role)) return show(cards);
      // The step's own chunks all landed and the card is not in them: it opens nothing.
      const steps = app && now.kind === "step" ? app.cards.stepsOf(app.data, now.index) : [];
      if (cards && steps.every((s) => loadedSteps.current.has(s))) return;
      // A press before the step's details landed, or after a failed fetch: fetch them now and open the card on arrival, if the reader is still on the step.
      const at = phaseKey(now);
      fetchSteps(steps)
        .then((late) => {
          if (late && mounted.current && phaseKey(phaseNow.current) === at) show(late);
        })
        .catch(() => {});
    },
    [fetchSteps],
  );
  const closeCard = useCallback(() => setOpened(null), []);
  const pageCard = useCallback((oracleId: string) => setOpened((o) => (o ? { ...o, oracleId } : o)), []);
  // A press that names only the card (the collection's tiles, Which deck's rows): no deck, no list, but the control pressed.
  const openPlain = useCallback((oracleId: string, opener: HTMLElement | null) => openCard(oracleId, [], opener, null), [openCard]);
  const go = (next: Phase) => {
    phaseNow.current = next;
    setOpened(null);
    setPhase(next);
  };
  /** Close the dialog (the close, Escape, the browser's Back): a close from the end starts the section over, a close mid-way keeps the step. */
  const closeDialog = useCallback(() => {
    setOpened(null);
    setDialogOpen(false);
    if (phaseNow.current.kind === "end") {
      phaseNow.current = { kind: "start" };
      setPhase({ kind: "start" });
    }
  }, []);

  // Start: the data's chunk and the steps' chunk, fetched together once (the data module memoises the decode, and `loadedApp`
  // keeps both across Start over). A rejected import of either and a file with no data all land on "failed"; pressing Start
  // again retries. The press moves to step 1 only if the card is still the start card and still mounted when the chunks land.
  const start = () => {
    if (load === "loading") return;
    if (loadedApp) {
      go({ kind: "step", index: 0 });
      return setDialogOpen(true);
    }
    setLoad("loading");
    Promise.all([import("../../../lib/demo/projected"), import("./demo-steps")])
      .then(([m, steps]) => {
        const loaded = m.projected();
        if (!loaded) throw new Error("no demo data");
        if (!mounted.current) return;
        const app: LoadedApp = { data: loaded, Body: steps.StepBody, Host: steps.DemoCardHost, cards: { load: steps.loadDemoCardDetails, detailFor: steps.detailFor, stepsOf: steps.cardStepsOf, merge: steps.mergeCardChunks } };
        appRef.current = app;
        setLoadedApp(app);
        setLoad("idle");
        // The card details come after, off the press's path: the effect below fetches the step on screen's chunks when idle. A
        // failure there is not Start's (the steps draw without them): the first press retries.
        // Only the start card moves on: a card that has been left meanwhile keeps the data loaded and stays where it is.
        if (phaseNow.current.kind === "start") {
          go({ kind: "step", index: 0 });
          setDialogOpen(true);
        }
      })
      .catch(() => {
        if (mounted.current) setLoad("failed");
      });
  };

  // A press that swaps the step moves focus to its new heading (the control just pressed is gone or changed) and puts both of the
  // dialog's scrollers back at the top. Not on load: nothing has moved yet. A layout effect, so focus lands in the same commit
  // that draws the new step: Start's swap runs from a promise, outside any press's batch, and a passive effect there can run after
  // the step is already on screen (a frame with focus nowhere).
  const key = phaseKey(phase);
  useLayoutEffect(() => {
    if (handled.current === key) return;
    handled.current = key;
    heading.current?.focus({ preventScroll: true });
    if (columnScroll.current) columnScroll.current.scrollTop = 0;
    if (appScroll.current) appScroll.current.scrollTop = 0;
  }, [key]);

  // The card details for the step on screen: its chunks, on idle after entering it, then (once they have landed, and not on a
  // data-saving connection) the next step's, so the step after opens its cards at the first press. A step left before the idle
  // callback runs is not fetched; a failed fetch is not kept, and a press on the step fetches again.
  const stepIndex = phase.kind === "step" ? phase.index : null;
  useEffect(() => {
    const app = loadedApp;
    if (!app || stepIndex === null) return;
    let live = true;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    whenIdle(() => {
      if (!live || !mounted.current) return;
      fetchSteps(app.cards.stepsOf(app.data, stepIndex))
        .then((landed) => {
          // Nothing landed (a file with none): nothing to build on, and the next step would read none too.
          if (!landed || !live || saveData || stepIndex + 1 >= STEPS) return;
          whenIdle(() => {
            if (live && mounted.current) void fetchSteps(app.cards.stepsOf(app.data, stepIndex + 1)).catch(() => {});
          });
        })
        .catch(() => {});
    });
    return () => {
      live = false;
    };
  }, [loadedApp, stepIndex, fetchSteps]);


  const header = { id: "landing-demo", testId: "demo", eyebrow: c.eyebrow, title: c.title, lead: <Lead>{c.lead}</Lead> };
  // The section after a close mid-way: the step to carry on from, and a quiet Start over.
  const resumeAt = phase.kind === "step" && loadedApp && !dialogOpen ? phase.index : null;
  const openFromStart = () => {
    go({ kind: "step", index: 0 });
    setDialogOpen(true);
  };

  const card = (
    <Section {...header}>
      <div className={FRAME}>
        <div className="flex flex-col items-start gap-[14px] px-[20px] py-[26px] md:flex-row md:items-center md:gap-[34px] md:p-[30px]">
          <Fan images={fanOf(art, "start")} />
          <div className="flex flex-col items-start gap-[12px]">
            <h3 className={`${HEADING} text-[21px]`}>{c.startTitle(DEMO_PLAYER)}</h3>
            <p className="m-0 text-[14.5px] leading-[1.6] text-[color:var(--fg-body)]">{c.startBody(DEMO_PLAYER)}</p>
            <div className="flex flex-wrap items-center gap-[10px]">
              <button
                ref={mainButton}
                type="button"
                data-testid="demo-start"
                onClick={resumeAt !== null ? () => setDialogOpen(true) : start}
                aria-busy={load === "loading" || undefined}
                aria-disabled={load === "loading" || undefined}
                className={`${BTN_L} relative overflow-hidden aria-disabled:cursor-progress aria-disabled:opacity-80`}
              >
                {resumeAt !== null ? c.carryOn(resumeAt + 1) : load === "loading" ? c.loading : c.start}
                {load === "loading" ? <PendingSweep /> : null}
              </button>
              {resumeAt !== null ? (
                <button type="button" data-testid="demo-start-over" onClick={openFromStart} className={BTN_Q}>
                  {c.end.startOver}
                </button>
              ) : null}
            </div>
            {load === "failed" ? (
              <p role="alert" data-testid="demo-load-failed" className="m-0 text-[13px] text-[color:var(--danger)]">
                {c.loadFailed}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Section>
  );

  if (!dialogOpen || !loadedApp || phase.kind === "start") return card;

  if (phase.kind === "end") {
    const skipped = phase.skippedFrom;
    return (
      <>
        {card}
        {createPortal(
          <DemoDialog onClose={closeDialog} returnFocusRef={mainButton} headingRef={heading} label={<span aria-live="polite" className={LABEL}>{c.end.label}</span>} lit={STEPS} onSkip={null}>
            <div ref={columnScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="mx-auto flex w-full max-w-[920px] flex-col items-start gap-[14px] px-[20px] py-[26px] md:flex-row md:items-center md:gap-[34px] md:px-[30px] md:py-[40px]">
                <Fan images={fanOf(art, "end")} />
                <div className="flex min-w-0 flex-1 flex-col items-stretch gap-[12px] self-stretch md:self-auto">
                  <h3 ref={heading} tabIndex={-1} className={`${HEADING} text-[21px]`}>{c.end.title(DEMO_PLAYER)}</h3>
                  <p className="m-0 text-[14.5px] leading-[1.6] text-[color:var(--fg-body)]">{c.end.lead}</p>
                  {skipped !== null ? (
                    <p className="m-0 text-[13px] text-[color:var(--fg-muted)]" data-testid="demo-skipped">
                      {c.end.skipped(skipped + 1, STEPS)}{" "}
                      <button type="button" onClick={() => go({ kind: "step", index: skipped })} className={`${LINK} text-[13px] text-[color:var(--fg-muted)]`}>
                        {c.end.goBack(skipped + 1)}
                      </button>
                    </p>
                  ) : null}
                  <LaunchPanel />
                  <div className="flex items-center gap-[10px]">
                    <button type="button" onClick={openFromStart} className={BTN_Q}>
                      {c.end.startOver}
                    </button>
                    <button type="button" data-testid="demo-end-close" onClick={closeDialog} className={`${LINK} inline-flex min-h-[44px] items-center px-[8px] text-[13.5px] text-[color:var(--fg-muted)] decoration-[color:var(--fg-faint)]`}>
                      {c.close}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </DemoDialog>,
          document.body,
        )}
      </>
    );
  }

  const { data, Body, Host } = loadedApp;
  const { index } = phase;
  const step = c.steps[index];
  const title = step.title(DEMO_PLAYER);
  // A ring and a sentence promise a press only where the press opens a card (`stepOpensCards`).
  const cardsOpen = stepOpensCards(data, cardData, index);
  const line = index === 0 ? step.line(DEMO_PLAYER, `${data.collection.totalCards.toLocaleString("en-US")} cards`, cardsOpen) : step.line(DEMO_PLAYER, "");
  const last = index === STEPS - 1;
  // Skip to the end from the last step skips nothing, so the end says nothing was skipped.
  const toEnd = () => go({ kind: "end", skippedFrom: last ? null : index });
  return (
    <>
      {card}
      {createPortal(
        <DemoDialog
          onClose={closeDialog}
          returnFocusRef={mainButton}
          headingRef={heading}
          label={<span data-testid="demo-step" aria-live="polite" className={LABEL}>{c.step(index + 1, STEPS)}</span>}
          lit={index + 1}
          onSkip={toEnd}
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
            {/* Below 1024px this column is the one scroller (the words, then the app); from 1024px it dissolves and the words and the app are the grid's own cells. */}
            <div ref={columnScroll} className="min-h-0 overflow-y-auto overscroll-contain lg:contents">
              <div className="mx-auto flex w-full max-w-[680px] flex-col gap-[10px] px-[16px] pb-[14px] pt-[16px] lg:col-start-1 lg:row-start-1 lg:mx-0 lg:max-w-none lg:px-[28px] lg:pb-[8px] lg:pt-[28px]">
                <div className="flex flex-wrap gap-[6px]">
                  {step.tags.map((tag) => (
                    <span key={tag.label} data-testid="demo-tag" className={tag.kind === "free" ? CHIP_FREE : CHIP_CREDIT}>
                      {tag.kind === "free" ? null : <span aria-hidden className="block h-[6px] w-[6px] rotate-45 bg-[color:var(--accent)]" />}
                      {tag.label}
                    </span>
                  ))}
                </div>
                <h3 ref={heading} tabIndex={-1} className={`${HEADING} text-[19px] lg:text-[23px]`}>{title}</h3>
                <p className="m-0 text-[14px] leading-[1.6] text-[color:var(--fg-body)]">{line}</p>
              </div>
              <div ref={appScroll} className="min-w-0 border-t border-solid border-t-[color:var(--border)] bg-[color:var(--bg)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0 lg:border-l-[color:var(--border)]">
                <div className="mx-auto w-full max-w-[680px] lg:max-w-[1080px]">
                  <div ref={panel} className="relative p-[16px] lg:px-[28px] lg:py-[24px]">
                    <span className="absolute right-[12px] top-[8px] font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{c.stage(DEMO_PLAYER)}</span>
                    <div data-testid="demo-app" className="pt-[10px]">
                      <DemoProviders onOpen={openCard} onClose={closeCard} openOracleId={opened?.oracleId ?? null}>
                        <Body index={index} data={data} publicPages={publicPages} onOpenCard={openPlain} />
                      </DemoProviders>
                      {opened && cardData ? <Host data={cardData} opened={opened} onPage={pageCard} onClose={closeCard} /> : null}
                    </div>
                    <PressRing panel={panel} selector={ringTarget(index, cardsOpen)} label={step.press ?? ""} place={ringPlace(index)} />
                  </div>
                </div>
              </div>
            </div>
            {/* Back and Next: pinned under the column below 1024px (Back, then Next filling the row; from 768px right-aligned, Next 180px), directly under the words from 1024px. */}
            <div className="row-start-2 border-t border-solid border-t-[color:var(--border-strong)] bg-[color:var(--surface-raised)] lg:col-start-1 lg:row-start-2 lg:border-t-0 lg:bg-transparent">
              <div className="mx-auto flex w-full max-w-[680px] items-center gap-[10px] px-[16px] py-[12px] md:justify-end lg:mx-0 lg:max-w-none lg:justify-start lg:px-[28px] lg:pb-[24px] lg:pt-[8px]">
                {index === 0 ? null : (
                  <button type="button" onClick={() => go({ kind: "step", index: index - 1 })} className={BTN_Q}>
                    {c.back}
                  </button>
                )}
                <button type="button" data-testid="demo-next" onClick={() => go(last ? { kind: "end", skippedFrom: null } : { kind: "step", index: index + 1 })} className={`${BTN_L} flex-1 md:w-[180px] md:flex-none`}>
                  {last ? c.seeEnd : c.next}
                </button>
              </div>
            </div>
          </div>
        </DemoDialog>,
        document.body,
      )}
    </>
  );
}
