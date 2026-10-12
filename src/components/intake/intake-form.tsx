"use client";
// Help me choose's form (HANDOFF §2, screens 2a and 2b; the read addendum R1, states 7a to 7c and
// 7n). Optional answers, then the one paid field, *Anything else?*, and one submit.
// NOTHING IS INTERPRETED HERE: no matching while typing, no commander. The box's text is never
// turned into answers (rework ruling 2). With text in it and a credit free, the press says it uses
// one; the submit is a Server Action that starts the read and lands on the results (F8).
//
// One component at both widths. The submit sits at the foot of the panel on desktop and in a
// dock over the tab bar on the phone (create-picker's dock), whose measured height the form
// reserves under itself. No motion anywhere (STATES invariant).

import { useId, useLayoutEffect, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";

import { PRIMARY } from "../ui/button";
import { ColourControl } from "../commanders/rack/colour-control";
import { useIsDesktop } from "../ui/use-is-desktop";
import { colorNames } from "../../lib/copy/color-labels";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import { MAX_BUDGET_DOLLARS } from "../../lib/intake/answers";
import { READ_WORDS_MAX_CHARS, serializeChooseParams, type ChooseParams } from "../../lib/intake/params";
import type { Bracket, Pool } from "../../lib/intake/rank";
import type { VocabularyTheme } from "../../lib/intake/vocabulary";
import type { PrintedInSet } from "../../lib/sets/printed-in";
import { useHydrated } from "../ui/hydrated-art";
import { SetsField } from "./sets-field";
import { ThemeJoinControl } from "./theme-join";
import { ThemePicker } from "./theme-picker";

import { closedBy, formLine, type Standing } from "../../lib/intake/standing";
import { submitChoose } from "../../app/decks/new/choose/actions";
import { AFFIX_FOCUS, AFFIX_INPUT } from "../ui/text-field";

/** What the budget box holds, as a whole-dollar answer: `$` and commas stripped, 1 to 100,000. */
export function parseBudget(raw: string): number | null {
  const s = raw.replace(/[$,\s]/g, "");
  if (!/^\d{1,6}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= MAX_BUDGET_DOLLARS ? n : null;
}

/**
 * The submit's answers, as the address they describe. The card is dropped: the form draws no card
 * control (F1), so a card a stale address carried must not come back.
 */
export function submitQuery(p: ChooseParams): string {
  return serializeChooseParams({ ...p, card: null, readId: null, deeper: [], notUsed: [], results: false });
}

const BRACKETS: readonly Bracket[] = [1, 2, 3, 4, 5];

export function IntakeForm({
  themes,
  sets = [],
  initial,
  standing = null,
}: {
  themes: readonly VocabularyTheme[];
  /** Every set that printed a commander, for the Sets answer. */
  sets?: readonly PrintedInSet[];
  initial: ChooseParams;
  /** The player's credits (F7); null when the read failed, and the press then draws plain. */
  standing?: Standing | null;
}) {
  const [submitting, startSubmit] = useTransition();
  // Synchronous, as commit-sheet's is: `submitting` is a transition update and is not visible to a
  // second press in the same tick, so a double click would begin two reads and land the second on
  // the unread results. This ref covers that window and nothing else.
  const inFlightRef = useRef(false);
  const wide = useIsDesktop();
  const [words, setWords] = useState(initial.words);
  const [colors, setColors] = useState<string[]>(initial.colors);
  const [match, setMatch] = useState(initial.match);
  const [picked, setPicked] = useState<string[]>(initial.themes);
  const [themeJoin, setThemeJoin] = useState(initial.themeJoin);
  const [pickedSets, setPickedSets] = useState<string[]>(initial.sets);
  const [pool, setPool] = useState<Pool>(initial.pool);
  const [budget, setBudget] = useState(initial.budgetDollars === null ? "" : String(initial.budgetDollars));
  const [bracket, setBracket] = useState<Bracket | null>(initial.bracket);
  const themeLabelId = useId();
  const budgetId = useId();
  // Each press is described by its own line, so a keyboard or screen-reader user hears that the
  // words will not be read before a free search runs.
  const lineDeskId = useId();
  const linePhoneId = useId();
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

  const submit = () => {
    if (submitting || inFlightRef.current) return;
    inFlightRef.current = true;
    const query = submitQuery({
      ...initial,
      words: words.trim(),
      colors,
      match,
      themes: picked,
      themeJoin,
      sets: pickedSets,
      pool,
      budgetDollars: parseBudget(budget),
      bracket,
    });
    // The action redirects; it returns only when it refused a malformed or over-long ask, which
    // this form cannot send (its box is capped, and the address bound is far past the cap).
    // A return or a failure releases the press; a redirect leaves the page.
    startSubmit(async () => {
      try { await submitChoose(query); } finally { inFlightRef.current = false; }
    });
  };

  // What the press does with the words (states 7a to 7c, 7n): with none, nothing is said; with a
  // credit free, the pill and the first-use line; with none, the line says they will not be read.
  const written = words.trim().length > 0;
  const closed = standing ? closedBy(standing) : null;
  const paid = written && standing !== null && closed === null;
  // The line can name a time in the reader's own zone, which the server cannot know: drawn only
  // after hydration, so the server's HTML and the first client render agree.
  const hydrated = useHydrated();
  const line = written && standing && hydrated ? formLine(standing) : null;
  const caption = !written ? copy.intake.extra.caption : standing && closed !== null ? copy.intake.extra.captionSpent : copy.intake.extra.captionFilled;

  const submitClass = `${PRIMARY} inline-flex items-center justify-center gap-[10px] font-sans font-semibold cursor-pointer rounded-[10px] text-[15px] border-0 whitespace-nowrap ${paid ? "pl-[8px] pr-[24px]" : "px-[24px]"}`;
  const press = (
    <>
      {paid && (
        <span aria-hidden className="inline-flex items-center h-[32px] md:h-[30px] px-[10px] rounded-[7px] font-mono text-[11px] font-semibold text-[color:var(--bg)] bg-[color:color-mix(in_oklab,var(--bg)_22%,transparent)]">
          {copy.read.cost}
        </span>
      )}
      {copy.intake.submit}
    </>
  );

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

        <Field
          label={copy.intake.pool}
          labelId={`${themeLabelId}-pool`}
          caption={pool === "own" ? copy.intake.poolCaptionOwn : copy.intake.poolCaptionAny}
        >
          <PoolRadios value={pool} onChange={setPool} labelId={`${themeLabelId}-pool`} />
        </Field>

        <Field
          label={copy.intake.budget}
          htmlFor={budgetId}
          caption={pool === "own" ? copy.intake.budgetCaptionOwn : copy.intake.budgetCaption}
        >
          <div className={`flex items-center gap-[6px] min-h-[44px] md:min-h-[40px] px-[10px] py-[6px] rounded-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] ${AFFIX_FOCUS}`}>
            <span aria-hidden className="font-mono text-[14px] text-[color:var(--fg-faint)]">$</span>
            <input
              id={budgetId}
              inputMode="numeric"
              autoComplete="off"
              value={budget}
              placeholder={copy.intake.budgetPlaceholder}
              // Whole dollars: a pasted `$1,500` reads as 1500, anything else is not a figure.
              onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              className={`flex-1 min-w-0 h-[28px] ${AFFIX_INPUT} font-mono text-[16px] md:text-[14px] text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)]`}
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

        <hr className="m-0 border-0 border-t border-solid border-[color:var(--border)]" />

        <Field
          label={copy.intake.extra.label}
          tag={copy.intake.extra.optional}
          htmlFor={wordsId}
          caption={caption}
          captionTone={written && closed !== null ? "muted" : "faint"}
          // Counted as `maxLength` counts (UTF-16 units), so the count and the box stop together.
          count={written ? copy.intake.extra.count(words.length, READ_WORDS_MAX_CHARS) : null}
        >
          <textarea
            id={wordsId}
            value={words}
            maxLength={READ_WORDS_MAX_CHARS}
            placeholder={copy.intake.extra.placeholder}
            onChange={(e) => setWords(e.target.value)}
            className={[
              "block w-full resize-y min-h-[96px] md:min-h-[84px] p-[12px_13px] md:p-[12px_14px] rounded-[9px] border border-solid",
              "bg-[color:var(--surface-sunken)] text-[16px] md:text-[14px] leading-[1.55] text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)] outline-none",
              // Accent while the words will be read: a credit free, or a standing that could not be
              // read (the press then draws plain, and the submit decides).
              written && closed === null ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]",
            ].join(" ")}
          />
        </Field>

        {/* Desktop: the submit closes the panel, its credit line beside it. Never disabled: a
            blank submit searches. */}
        <div className="hidden md:flex items-center gap-[18px] pt-[20px] border-0 border-t border-solid border-[color:var(--border)]">
          <button type="submit" aria-label={paid ? copy.read.pressAria : undefined} aria-describedby={line ? lineDeskId : undefined} className={`${submitClass} h-[44px]`}>
            {press}
          </button>
          {line && <p id={lineDeskId} className="m-0 max-w-[380px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{line}</p>}
        </div>
      </div>

      <div
        ref={dockRef}
        data-testid="choose-dock"
        className="md:hidden fixed bottom-[var(--tabbar-h)] left-0 right-0 z-20 p-[10px_16px_12px] border-0 border-t border-solid border-[color:var(--border)] bg-[color:var(--bg)]"
      >
        <button type="submit" aria-label={paid ? copy.read.pressAria : undefined} aria-describedby={line ? linePhoneId : undefined} className={`${submitClass} w-full h-[48px]`}>
          {press}
        </button>
        {line && <p id={linePhoneId} className="m-0 mt-[6px] text-center font-mono text-[10px] leading-[1.5] text-[color:var(--fg-faint)]">{line}</p>}
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
  captionTone = "faint",
  tag,
  count = null,
  aside,
  children,
}: {
  label: string;
  /** Beside the label: *optional* on the paid field. */
  tag?: string;
  captionTone?: "faint" | "muted";
  /** At the caption's right: the box's character count, while it has text. */
  count?: string | null;
  /** Drawn at the label's right, on its line: the Theme field's join. */
  aside?: ReactNode;
  htmlFor?: string;
  labelId?: string;
  caption: string;
  children: ReactNode;
}) {
  const labelClass = "font-mono text-[10px] tracking-[.14em] uppercase text-[color:var(--fg-faint)]";
  return (
    <div className="flex flex-col gap-[9px]">
      <div className={aside ? "flex items-center gap-[10px] min-h-[28px]" : "contents"}>
        {htmlFor ? (
          <label htmlFor={htmlFor} className={tag ? `${labelClass} inline-flex items-baseline gap-[8px]` : labelClass}>
            {label}
            {tag && <span className="font-mono text-[9.5px] tracking-[.06em] normal-case text-[color:var(--fg-locked)]">{tag}</span>}
          </label>
        ) : (
          <span id={labelId} className={labelClass}>{label}</span>
        )}
        {aside}
      </div>
      {children}
      <div className={count ? "flex items-start justify-between gap-[12px]" : "contents"}>
        <p className={`m-0 text-[12px] leading-[1.5] ${captionTone === "muted" ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg-faint)]"}`}>
          {caption}
        </p>
        {count && <span className="shrink-0 font-mono text-[10px] text-[color:var(--fg-faint)]">{count}</span>}
      </div>
    </div>
  );
}

/** Cards for the 99 (three answers §3): two segments, drawn as Bracket's are. */
function PoolRadios({ value, onChange, labelId }: { value: Pool; onChange: (p: Pool) => void; labelId: string }) {
  const options: readonly Pool[] = ["any", "own"];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = options.indexOf(value);
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex gap-[6px]">
      {options.map((o, i) => {
        const selected = o === value;
        return (
          <button
            key={o}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o)}
            onKeyDown={(e) => {
              const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
              if (dir === 0) return;
              e.preventDefault();
              const next = (current + dir + options.length) % options.length;
              refs.current[next]?.focus();
              onChange(options[next]);
            }}
            className={[
              "flex flex-[1_1_0] items-center justify-center min-w-0 h-[44px] md:h-[34px] rounded-[7px] border border-solid text-[13px] cursor-pointer",
              selected
                ? "font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] border-[color:var(--accent)]"
                : "text-[color:var(--fg-muted)] bg-[color:var(--surface-sunken)] border-[color:var(--border)]",
            ].join(" ")}
          >
            {o === "own" ? copy.intake.poolOwn : copy.intake.poolAny}
          </button>
        );
      })}
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
