"use client";

// The first-run tour (discovery R3·1b; handoff R3 `STATES-tour-and-need.md`, `design-tables/discovery-r3.md`, boards
// `r3/Tour-*.dc.html` and `TourCard.dc.html`). Six stops over the first-run Home: a scrim with one cutout on the lit
// control, R1's halo ring around it, and `TourCard`, a modal dialog outside the app, which is `inert` while it runs.
//
// It opens once the page has settled, plus `ARRIVE_MS`, with nothing open over Home; a sheet open at load holds it
// until it closes. Opening takes the visit (no moment arrives the same visit) and spends the tour on the server, so a
// reload, a closed tab or Back never shows it again (R3 gap 4). ✕, Esc, Finish and `Read the note ›` end it.
//
// The scrim is one SVG mask, not a box shadow (plan decision 5), so R3·3's second light on step 6 is one more hole.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { spendTourAction } from "../../app/tour-actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useInertPage } from "../../lib/a11y/inert-page";
import { shotFor } from "../../lib/about/shots";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { creatorNoteCopy, tourCopy } from "../../lib/copy/discovery";
import { CARD_W, PHONE_DOCK, STEPS, cutoutFor, placeCard, type Box } from "../../lib/discovery/tour-steps";
import { overPageCount, subscribeOverPage } from "../../lib/moments/hold";
import { takeVisit } from "../../lib/moments/visit";
import { DEFAULT_THEME } from "../../lib/theme/themes";
import { prefersReducedMotion } from "../../lib/ui/motion";
import { NoteDialog } from "../about/reference/creator-note";
import { ARRIVE_MS } from "../moments/moments-provider";
import { ThemePicker, themeInForce } from "../shell/theme-picker";
import { useIsDesktop } from "../ui/use-is-desktop";
import { useTargets } from "./targets-provider";

const c = tourCopy;
const SCRIM = "rgba(6,5,8,.66)";
/** Shipped names the card repeats: the ways group's `Precons I own`, and the note's own title. */
const collectionPrecons = collectionEditCopy.ways.precons;
const noteTitle = creatorNoteCopy.title;

/** Mounted on a first-run Home whose tour is due (`tourDue`). `precons`: step 1's precon line (`PRECONS_ENABLED`, with the ways group). */
export function FirstRunTour({ precons }: { precons: boolean }) {
  const [phase, setPhase] = useState<"waiting" | "running" | "done">("waiting");
  const [note, setNote] = useState(false);

  useEffect(() => {
    if (phase !== "waiting") return;
    let timer: number | undefined;
    const clear = () => overPageCount().locks === 0 && overPageCount().holds === 0;
    // Each time the page might be clear, start the wait again; anything opening over Home cancels it.
    const arm = () => {
      window.clearTimeout(timer);
      if (!clear()) return;
      timer = window.setTimeout(() => {
        if (!clear()) return;
        takeVisit();
        // The tour is spent as step 1 appears; a failed write shows it again on the next Home, which is the safe side.
        void spendTourAction().catch(() => {});
        setPhase("running");
      }, ARRIVE_MS);
    };
    const settled = () => arm();
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", settled, { once: true });
    const off = subscribeOverPage(arm);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", settled);
      off();
    };
  }, [phase]);

  if (phase === "running")
    return (
      <TourRun
        precons={precons}
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

function TourRun({ precons, onEnd }: { precons: boolean; onEnd: (withNote: boolean) => void }) {
  const targets = useTargets();
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

  // At 390 step 1 brings its controls to the top, the fan above the fold; every other step reads from the top.
  useLayoutEffect(() => {
    const r = !desktop && step.key === "collection" ? targets?.targetRect(step.target) : null;
    window.scrollTo({ top: r ? window.scrollY + r.top - 14 : 0, behavior: "instant" });
  }, [desktop, step.key, step.target, targets]);

  const cardRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Esc skips. The tour scrolls the page itself, so the body is never locked.
  useDialogA11y(cardRef, () => onEnd(false), { initialFocusRef: nextRef, lockScroll: false });

  const [cardH, setCardH] = useState(0);
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCardH(el.offsetHeight));
    ro.observe(el);
    setCardH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

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
  const cut = rect ? cutoutFor(rect, step.kind) : null;
  // Step 6 with no line on Home to light (R3 gap 6): the card stands centred and drops the line's sentence.
  const fallback = !rect;
  const place = desktop ? placeCard(step.place, rect, { w: CARD_W, h: cardH }, frame) : null;
  const theme = themeInForce(DEFAULT_THEME);
  const picture = step.picture ? shotFor(theme, step.picture) : null;
  const copy = c.steps[step.key];
  const glide = "transition-[x,y,width,height] duration-[240ms] ease-[var(--motion-ease-out)] motion-reduce:transition-none";

  return createPortal(
    <>
      <svg aria-hidden data-tour-scrim className="fixed inset-0 z-[70] h-full w-full">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {cut && <rect className={glide} style={{ x: cut.x, y: cut.y, width: cut.w, height: cut.h }} rx={cut.r} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill={SCRIM} mask={`url(#${maskId})`} />
      </svg>
      {cut && (
        <div
          aria-hidden
          data-tour-ring
          className="pointer-events-none fixed z-[70] shadow-[0_0_0_2px_color-mix(in_oklab,var(--accent)_75%,transparent),0_0_0_6px_color-mix(in_oklab,var(--accent)_20%,transparent)] transition-[left,top,width,height] duration-[240ms] ease-[var(--motion-ease-out)] motion-reduce:transition-none"
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
        className="fixed z-[71] flex flex-col rounded-[14px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-[14px_16px_16px] text-left text-[color:var(--fg-body)] shadow-[0_24px_60px_rgba(0,0,0,.55)] max-md:bottom-[var(--tour-dock)] max-md:left-[16px] max-md:right-[16px] md:w-[340px] md:p-[14px_16px_14px_18px]"
        style={{
          ["--tour-dock" as string]: `${PHONE_DOCK}px`,
          ...(place ? { left: place.x, top: place.y, visibility: cardH ? "visible" : "hidden" } : {}),
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

        {step.key === "collection" && (
          <>
            {precons && (
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
            <div className="mt-[12px] h-[128px] overflow-hidden rounded-[9px] border border-solid border-[color:var(--border-strong)] md:h-[118px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- a checked-in capture, sized by its box */}
              <img src={picture.src} alt={copy.pictureAlt} className="block h-full w-full object-cover" />
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
