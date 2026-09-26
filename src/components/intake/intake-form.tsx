"use client";
// Help me choose's form (HANDOFF §2, screens 2a and 2b). Five optional inputs and one submit.
// NOTHING IS INTERPRETED HERE (§8.0, §8.1): no matching while typing, no count, no commander, no
// credit line. The submit is a navigation to `?…&v=submit`, where the server reads the words once
// and redirects to the results, so the results page never matches again.
//
// One component at both widths. The submit sits at the foot of the panel on desktop and in a
// dock over the tab bar on the phone (create-picker's dock), whose measured height the form
// reserves under itself. No motion anywhere (STATES invariant).

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { PRIMARY } from "../ui/button";
import { ColourControl } from "../commanders/rack/colour-control";
import { useIsDesktop } from "../ui/use-is-desktop";
import { colorNames } from "../../lib/copy/color-labels";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import { MAX_BUDGET_DOLLARS } from "../../lib/intake/answers";
import { READ_WORDS_MAX_CHARS, serializeChooseParams, type ChooseParams } from "../../lib/intake/params";
import type { Bracket } from "../../lib/intake/rank";
import type { VocabularyTheme } from "../../lib/intake/vocabulary";
import type { PrintedInSet } from "../../lib/sets/printed-in";
import { SetsField } from "./sets-field";
import { ThemeJoinControl } from "./theme-join";
import { ThemePicker } from "./theme-picker";

import { CHOOSE_PATH } from "../../lib/intake/submit";

/** What the budget box holds, as a whole-dollar answer: `$` and commas stripped, 1 to 100,000. */
export function parseBudget(raw: string): number | null {
  const s = raw.replace(/[$,\s]/g, "");
  if (!/^\d{1,6}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= MAX_BUDGET_DOLLARS ? n : null;
}

/**
 * The submit's address: the form's answers, then `v=submit` for the server to resolve. The card is
 * dropped: the form draws no card control, so its only card is one its words name, and the words
 * go with it. A card the player deleted from the words must not come back from the address.
 */
export function submitHref(p: ChooseParams): string {
  const qs = serializeChooseParams({ ...p, card: null, readId: null, deeper: [], notUsed: [], results: false });
  return `${CHOOSE_PATH}${qs ? `${qs}&` : "?"}v=submit`;
}

const BRACKETS: readonly Bracket[] = [1, 2, 3, 4, 5];

export function IntakeForm({
  themes,
  sets = [],
  initial,
}: {
  themes: readonly VocabularyTheme[];
  /** Every set that printed a commander, for the Sets answer. */
  sets?: readonly PrintedInSet[];
  initial: ChooseParams;
}) {
  const router = useRouter();
  const wide = useIsDesktop();
  const [words, setWords] = useState(initial.words);
  const [colors, setColors] = useState<string[]>(initial.colors);
  const [match, setMatch] = useState(initial.match);
  const [picked, setPicked] = useState<string[]>(initial.themes);
  const [themeJoin, setThemeJoin] = useState(initial.themeJoin);
  const [pickedSets, setPickedSets] = useState<string[]>(initial.sets);
  const [budget, setBudget] = useState(initial.budgetDollars === null ? "" : String(initial.budgetDollars));
  const [bracket, setBracket] = useState<Bracket | null>(initial.bracket);
  const themeLabelId = useId();
  const budgetId = useId();
  const wordsId = useId();

  // The dock is `fixed` and reserves nothing of its own; measured, as create-picker measures its
  // own, so the last field never sits under it.
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockHeight, setDockHeight] = useState(0);
  useLayoutEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const measure = () => setDockHeight(el.getBoundingClientRect().height);
    measure();
    // A browser with no ResizeObserver still gets a dock that clears the form: measured once, and
    // again whenever the window resizes, which is when the dock's own wrapping changes.
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const names = copy.intake.colorsJoin(colorNames(colors.map((c) => c.toUpperCase())));
  const colorsCaption =
    colors.length === 0
      ? copy.intake.colorsNone
      : match === "exactly"
        ? copy.intake.colorsExactly(names)
        : copy.intake.colorsAny(names);

  const submit = () =>
    router.push(
      submitHref({
        ...initial,
        words: words.trim(),
        colors,
        match,
        themes: picked,
        themeJoin,
        sets: pickedSets,
        budgetDollars: parseBudget(budget),
        bracket,
      }),
    );

  const submitClass = `${PRIMARY} font-sans font-semibold cursor-pointer rounded-[10px] text-[15px] px-[24px] border-0 whitespace-nowrap`;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="pb-[var(--dock-reserve)] md:pb-0"
      style={{ "--dock-reserve": `${dockHeight + 12}px` } as CSSProperties}
    >
      <div className="flex flex-col gap-[20px] p-[18px] md:gap-[22px] md:w-[680px] md:max-w-full md:mx-auto md:p-[24px_26px] md:rounded-[12px] md:border md:border-solid md:border-[color:var(--border)] md:bg-[color:var(--surface-rail)]">
        <Field label={copy.intake.words} htmlFor={wordsId} caption={copy.intake.wordsCaption} captionMono>
          <textarea
            id={wordsId}
            value={words}
            maxLength={READ_WORDS_MAX_CHARS}
            placeholder={copy.intake.wordsPlaceholder}
            onChange={(e) => setWords(e.target.value)}
            className={[
              "block w-full resize-y min-h-[96px] md:min-h-[84px] p-[12px_13px] md:p-[12px_14px] rounded-[9px] border border-solid",
              "bg-[color:var(--surface-sunken)] text-[16px] md:text-[14px] leading-[1.55] text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)] outline-none",
              words ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]",
            ].join(" ")}
          />
        </Field>

        <hr className="m-0 border-0 border-t border-solid border-[color:var(--border)]" />

        <Field label={copy.intake.colors} caption={colorsCaption}>
          <ColourControl
            colors={colors}
            match={match}
            onColorsChange={setColors}
            onMatchChange={setMatch}
            wide={wide}
          />
        </Field>

        <Field
          label={copy.intake.theme}
          labelId={themeLabelId}
          caption={picked.length < 2 ? copy.intake.themeCaption : themeJoin === "any" ? copy.intake.themeJoin.captionAny : copy.intake.themeJoin.captionAll}
          aside={<ThemeJoinControl value={themeJoin} onChange={setThemeJoin} live={picked.length >= 2} />}
        >
          <ThemePicker themes={themes} value={picked} onChange={setPicked} labelId={themeLabelId} />
        </Field>

        <Field label={copy.intake.sets} caption={copy.intake.setsCaption}>
          <SetsField sets={sets} value={pickedSets} onChange={setPickedSets} wide={wide} />
        </Field>

        <Field label={copy.intake.budget} htmlFor={budgetId} caption={copy.intake.budgetCaption}>
          <div className="flex items-center gap-[6px] min-h-[44px] md:min-h-[40px] px-[10px] py-[6px] rounded-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)]">
            <span aria-hidden className="font-mono text-[14px] text-[color:var(--fg-faint)]">$</span>
            <input
              id={budgetId}
              inputMode="numeric"
              autoComplete="off"
              value={budget}
              placeholder={copy.intake.budgetPlaceholder}
              // Whole dollars: a pasted `$1,500` reads as 1500, anything else is not a figure.
              onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              className="flex-1 min-w-0 h-[28px] bg-transparent border-0 outline-none font-mono text-[16px] md:text-[14px] text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)]"
            />
          </div>
        </Field>

        <Field
          label={copy.intake.bracket}
          labelId={`${themeLabelId}-bracket`}
          caption={bracket === null ? copy.intake.bracketNone : copy.intake.bracketCaption(bracket)}
        >
          <BracketRadios value={bracket} onChange={setBracket} labelId={`${themeLabelId}-bracket`} />
        </Field>

        {/* Desktop: the submit closes the panel, with no note beside it. Never disabled: a blank
            submit searches. */}
        <div className="hidden md:block pt-[20px] border-0 border-t border-solid border-[color:var(--border)]">
          <button type="submit" className={`${submitClass} h-[44px]`}>
            {copy.intake.submit}
          </button>
        </div>
      </div>

      <div
        ref={dockRef}
        data-testid="choose-dock"
        className="md:hidden fixed bottom-[var(--tabbar-h)] left-0 right-0 z-20 p-[10px_16px_12px] border-0 border-t border-solid border-[color:var(--border)] bg-[color:var(--bg)]"
      >
        <button type="submit" className={`${submitClass} w-full h-[48px]`}>
          {copy.intake.submit}
        </button>
      </div>
    </form>
  );
}

// Module scope, so a render never remounts a field's subtree.
function Field({
  label,
  htmlFor,
  labelId,
  caption,
  captionMono = false,
  aside,
  children,
}: {
  label: string;
  /** Drawn at the label's right, on its line: the Theme field's join. */
  aside?: ReactNode;
  htmlFor?: string;
  labelId?: string;
  caption: string;
  captionMono?: boolean;
  children: ReactNode;
}) {
  const labelClass = "font-mono text-[10px] tracking-[.14em] uppercase text-[color:var(--fg-faint)]";
  return (
    <div className="flex flex-col gap-[9px]">
      <div className={aside ? "flex items-center gap-[10px] min-h-[28px]" : "contents"}>
        {htmlFor ? (
          <label htmlFor={htmlFor} className={labelClass}>{label}</label>
        ) : (
          <span id={labelId} className={labelClass}>{label}</span>
        )}
        {aside}
      </div>
      {children}
      <p
        className={[
          "m-0 text-[color:var(--fg-faint)]",
          captionMono ? "font-mono text-[10.5px] leading-[1.5]" : "text-[12px] leading-[1.5]",
        ].join(" ")}
      >
        {caption}
      </p>
    </div>
  );
}

function BracketRadios({
  value,
  onChange,
  labelId,
}: {
  value: Bracket | null;
  onChange: (b: Bracket | null) => void;
  labelId: string;
}) {
  const options: (Bracket | null)[] = [null, ...BRACKETS];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = options.indexOf(value);
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex gap-[6px]">
      {options.map((b, i) => {
        const selected = b === value;
        return (
          <button
            key={b ?? "any"}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(b)}
            onKeyDown={(e) => {
              const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
              if (dir === 0) return;
              e.preventDefault();
              const next = (current + dir + options.length) % options.length;
              refs.current[next]?.focus();
              onChange(options[next]);
            }}
            className={[
              "flex items-center justify-center min-w-0 h-[44px] md:h-[34px] rounded-[7px] border border-solid text-[13px] cursor-pointer",
              b === null ? "flex-[1.6_1_0]" : "flex-[1_1_0] font-mono",
              selected
                ? "font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] border-[color:var(--accent)]"
                : "text-[color:var(--fg-muted)] bg-[color:var(--surface-sunken)] border-[color:var(--border)]",
            ].join(" ")}
          >
            {b === null ? copy.intake.bracketAny : b}
          </button>
        );
      })}
    </div>
  );
}
