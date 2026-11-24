"use client";

// Help me choose intro (handoff `design_handoff_the99_help_me_choose/addendum-intro`, READINESS Yellow):
// how the tool works and what costs a credit, above the form. Open until the reader has run the tool
// or pressed Hide (the account's mark, `user_prefs.choose_intro_seen_at`); folded to one line after.
// Opening it again is this visit's own state: the mark never clears.
import { useState, useTransition } from "react";
import { hideChooseIntro } from "../../app/decks/new/choose/actions";
import { helpMeChooseCopy } from "../../lib/copy/help-me-choose";
import { helpMeChooseIntroCopy as copy } from "../../lib/copy/help-me-choose-intro";
import type { IntroArt } from "../../lib/intake/intro-art";
import { noteAppScroll } from "../../lib/ui/reveal";
import { FadingImg } from "../ui/hydrated-art";

/** The form's *Anything else?* box. A fixed id, not `useId`, so the intro's jump link can name it. */
export const CHOOSE_WORDS_ID = "choose-words";

/** The panel's look is Home's search panel's (READINESS, Look). */
const PANEL =
  "relative rounded-[12px] border border-solid border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent)_10%,var(--surface)),var(--surface)_60%)]";

export function ChooseIntro({
  initiallyOpen,
  art,
  daily,
}: {
  /** No mark on the account (or the read failed): draw it open. */
  initiallyOpen: boolean;
  /** The example's art; null when the read failed, and the example draws without it. */
  art: IntroArt | null;
  /** The reader's own free credits a day; null with no standing (a failed read) or the model-call switch off, and the line is left out. */
  daily: number | null;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [, startHide] = useTransition();

  if (!open) {
    return (
      <div className="mx-[18px] mt-[16px] md:mx-0 md:mt-0 md:mb-[20px]">
        <button
          type="button"
          aria-expanded={false}
          aria-label={copy.foldedAria}
          onClick={() => setOpen(true)}
          data-choose-intro="folded"
          className={`${PANEL} flex w-full min-h-[44px] items-center gap-[12px] p-[10px_14px] text-left cursor-pointer md:p-[10px_18px]`}
        >
          <span aria-hidden className="flex h-[24px] w-[24px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--accent)] font-mono text-[12px] text-[color:var(--accent-text)]">
            ?
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[2px] md:flex-row md:items-baseline md:gap-[12px]">
            <span className="text-[15px] font-semibold text-[color:var(--fg)]">{copy.folded}</span>
            <span className="font-mono text-[11.5px] text-[color:var(--fg-muted)]">{copy.foldedTail}</span>
          </span>
          <span aria-hidden className="flex-none text-[16px] text-[color:var(--fg-muted)]">›</span>
        </button>
      </div>
    );
  }

  const hide = () => {
    setOpen(false);
    // The panel folds on the press; the mark is written behind it. A failed write folds it all the same.
    startHide(async () => {
      await hideChooseIntro().catch(() => null);
    });
  };

  const jump = () => {
    const box = document.getElementById(CHOOSE_WORDS_ID);
    if (!box) return;
    // Centered and instant (the form moves nothing: no motion anywhere), so neither the sticky header nor the phone's fixed dock covers it.
    // Marked as the app's, so quick return does not read it as the reader scrolling and bring the phone header back over the box.
    noteAppScroll();
    box.scrollIntoView({ block: "center" });
    box.focus({ preventScroll: true });
  };

  return (
    <section aria-labelledby="choose-intro-title" data-choose-intro="open" className={`${PANEL} mx-[18px] mt-[16px] p-[16px] md:mx-0 md:mt-0 md:mb-[20px] md:p-[20px_22px]`}>
      <button
        type="button"
        onClick={hide}
        className="absolute top-0 right-0 flex h-[44px] min-w-[44px] items-center justify-center px-[14px] font-mono text-[10.5px] text-[color:var(--fg-muted)] cursor-pointer bg-transparent border-0"
      >
        {copy.hide}
      </button>
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_248px] md:gap-x-[24px]">
        <div className="min-w-0">
          <p className="m-0 pr-[48px] font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--accent-text)]">{copy.kicker}</p>
          <h2 id="choose-intro-title" className="m-0 mt-[6px] font-display font-bold text-[19px] leading-[1.2] text-[color:var(--fg)] md:text-[21px]">
            {copy.title}
          </h2>
          <p className="m-0 mt-[8px] text-[15px] leading-[1.55] text-[color:var(--fg-muted)] md:text-[14.5px]">{copy.lead}</p>
          <div className="hidden md:block">
            <Steps />
          </div>
        </div>
        <Example art={art} />
        <div className="md:hidden">
          <Steps />
        </div>
      </div>
      <div className="mt-[16px] flex flex-col gap-[10px] md:mt-[20px] md:grid md:grid-cols-2 md:gap-[12px]">
        <div className="rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--bg)] p-[14px_16px]">
          <p className="m-0 flex items-center gap-[8px] text-[15px] font-semibold text-[color:var(--fg)]">
            <span aria-hidden className="flex h-[20px] w-[20px] flex-none items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--success)_22%,transparent)] text-[11px] text-[color:var(--success)]">
              ✓
            </span>
            {copy.free.title}
          </p>
          <p className="m-0 mt-[6px] text-[14px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.free.line}</p>
        </div>
        <div className="rounded-[10px] border border-solid border-[color:var(--accent)] bg-[color:var(--bg)] p-[14px_16px]">
          <p className="m-0 flex items-center gap-[8px] text-[15px] font-semibold text-[color:var(--fg)]">
            <span className="inline-flex h-[22px] flex-none items-center rounded-full border border-solid border-[color:var(--accent)] px-[8px] font-mono text-[11px] font-normal text-[color:var(--accent-text)]">
              {helpMeChooseCopy.read.cost}
            </span>
            {copy.paid.title}
          </p>
          <p className="m-0 mt-[6px] text-[14px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.paid.line}</p>
          {daily !== null && <p className="m-0 mt-[8px] font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.paid.daily(daily)}</p>}
          <button
            type="button"
            onClick={jump}
            data-choose-intro-jump=""
            className="-my-[11px] flex min-h-[44px] items-center bg-transparent border-0 p-0 font-mono text-[11.5px] text-[color:var(--accent-text)] cursor-pointer"
          >
            {copy.paid.jump} <span aria-hidden>&nbsp;↓</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  return (
    <ol className="m-0 mt-[16px] flex list-none flex-col gap-[12px] p-0">
      {copy.steps.map((s, i) => (
        <li key={s.title} className="flex items-start gap-[12px]">
          <span aria-hidden className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--accent)] font-mono text-[12px] text-[color:var(--accent-text)]">
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-[color:var(--fg)]">{s.title}</span>
            <span className="block text-[14px] leading-[1.5] text-[color:var(--fg-muted)]">{s.line}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Example({ art }: { art: IntroArt | null }) {
  return (
    <div className="mt-[14px] min-w-0 md:mt-[22px]">
      <p className="m-0 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--fg-muted)]">{copy.exampleAsk}</p>
      <div className="mt-[8px] overflow-hidden rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]">
        {art?.lead && <FadingImg src={art.lead} alt="" className="block h-[64px] w-full object-cover md:h-[88px]" />}
        <div className="p-[10px_12px_12px]">
          <p className="m-0 flex items-baseline gap-[8px]">
            <span className="font-mono text-[11px] text-[color:var(--accent-text)]">1</span>
            <span className="font-display font-bold text-[16px] text-[color:var(--fg)]">{copy.exampleName}</span>
          </p>
          <p className="m-0 mt-[4px] text-[14px] text-[color:var(--fg)]">
            <span className="font-semibold text-[color:var(--accent-text)]">{copy.exampleFitFigure}</span> {copy.exampleFit}
          </p>
          <p className="m-0 mt-[4px] font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.exampleOwn}</p>
        </div>
      </div>
      {/* Ranks 2 and 3 fade under the example, on desktop only. */}
      <div aria-hidden className="hidden md:mt-[10px] md:flex md:flex-col md:gap-[8px] md:[mask-image:linear-gradient(to_bottom,black,transparent)]">
        {(art?.rest ?? [null, null]).map((src, i) => (
          <div key={i} className="flex items-center gap-[8px]">
            <span className="w-[10px] font-mono text-[11px] text-[color:var(--fg-muted)]">{i + 2}</span>
            {src ? (
              <FadingImg src={src} alt="" className="h-[22px] w-[32px] flex-none rounded-[3px] object-cover" />
            ) : (
              <span className="h-[22px] w-[32px] flex-none rounded-[3px] bg-[color:var(--surface-raised)]" />
            )}
            <span className={`h-[6px] rounded-full bg-[color:var(--border-strong)] ${i === 0 ? "w-[78%]" : "w-[58%]"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
