"use client";

// The Games view's filter controls (design handoff `design_handoff_the99_game_history`, build PR 4; Small items 9, A1 and
// B1). Deck, Result and Played against, drawn twice from one state: on the phone the deck picker sits in the shelf
// picker's slot and Result and Played against live in the shared Sheet behind `Filter games`; from the chassis's wide form
// the three are dropdowns on the view row, Played against in the app's anchored panel. Neither reads or writes the URL: the
// view hands a whole new filter back and the hook that holds it does that (`useGamesFilters`).
//
// The two native selects (deck, result) draw their closed state themselves and lay the real `<select>` over it, invisible:
// the platform owns the list and its keyboard, as `DeckSelect` does, and the trigger still wears the board's chip.

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { gameHistoryCopy } from "../../lib/copy/game-history";
import { playedAgainstOf, withGamesFilter } from "../../lib/games/history-filter";
import type { GameHistoryFilter, GameResult } from "../../lib/games/history-rules";
import type { GamesPayload } from "../../lib/games/history-wire";
import { nameIncludes, PersonName, type ThirdPartyName } from "../../lib/person-name";
import { Face } from "../social/face";
import { ANCHORED_PANEL_CLASS, useAnchoredPanel } from "../ui/anchored-panel";
import { Chevron } from "../ui/chevron";
import { GhostButton } from "../ui/button";
import { Sheet, SheetHeader } from "../ui/sheet";
import { SearchField } from "../ui/text-field";

const copy = gameHistoryCopy.filter;
const RESULTS: GameResult[] = ["win", "loss", "draw"];
const PANEL_WIDTH = 288;

export type DeckChoice = { id: string; name: string; identity: string[] };

/** One row of the Played against list: a friend (by `public_id`) or a commander (by oracle id). */
export type AgainstOption = {
  kind: "friend" | "commander";
  id: string;
  /** A friend's name is a `ThirdPartyName` and is drawn by `PersonName` only. */
  name: ThirdPartyName | string;
  games: number;
  artCropUri: string | null;
};

/** The options as the first window carries them: friends first, then commanders, each in the read's order. */
export function againstOptions(data: GamesPayload): AgainstOption[] {
  const { friends, commanders } = data.aggregates.playedAgainst;
  return [
    ...friends.map((f): AgainstOption => ({ kind: "friend", id: f.publicId, name: f.name, games: f.games, artCropUri: f.commander?.artCropUri ?? null })),
    ...commanders.map((c): AgainstOption => ({ kind: "commander", id: c.oracleId, name: c.name, games: c.games, artCropUri: c.artCropUri })),
  ];
}

/** The option the filter names, if the list still has it. */
export const chosenAgainst = (options: readonly AgainstOption[], filter: GameHistoryFilter): AgainstOption | null => {
  const at = playedAgainstOf(filter);
  return at ? options.find((o) => o.kind === at.kind && o.id === at.id) ?? null : null;
};

/** Picking an option takes the other kind off; picking the chosen one again clears it. */
export function pickAgainst(filter: GameHistoryFilter, option: AgainstOption): GameHistoryFilter {
  const on = playedAgainstOf(filter);
  const same = on !== null && on.kind === option.kind && on.id === option.id;
  return withGamesFilter(filter, {
    friend: option.kind === "friend" && !same ? option.id : undefined,
    commander: option.kind === "commander" && !same ? option.id : undefined,
  });
}

// The wide form's dropdown trigger, the filter panel's chip: 13px, 8px corners, the accent edge while a filter is on.
const TRIGGER =
  "relative inline-flex min-h-0 items-center gap-[8px] whitespace-nowrap rounded-lg border border-solid px-[14px] py-[9px] font-sans text-[13px] font-medium text-[color:var(--fg)] transition-colors";
const triggerLook = (on: boolean) =>
  `${TRIGGER} ${on ? "border-[color:var(--accent)] bg-[color:var(--elevated)]" : "border-[color:var(--border-strong)] bg-[color:var(--elevated)] hover:bg-[color:var(--border-strong)]"}`;

/**
 * A closed select drawn as the board's trigger. `children` is what it reads; the `<select>` is the real control, laid
 * over it at no opacity, 16px below `md` on a touch screen so iOS does not zoom (the shared deck select's rule).
 */
function SelectTrigger({ label, value, onChange, className, children, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className: string;
  children: ReactNode;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className={`${className} focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--accent)]`}>
      {children}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 text-[16px]"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** The deck picker, in the shelf picker's slot on the phone: the deck's name, how many games it has under the others, a chevron. */
export function DeckPhonePicker({ decks, filter, counts, onChange }: {
  decks: readonly DeckChoice[];
  filter: GameHistoryFilter;
  /** Games per deck under the other filters. */
  counts: ReadonlyMap<string, number>;
  onChange: (next: GameHistoryFilter) => void;
}) {
  const chosen = decks.find((d) => d.id === filter.deckId);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const count = chosen ? counts.get(chosen.id) ?? 0 : total;
  return (
    <SelectTrigger
      label={copy.deck}
      value={filter.deckId ?? ""}
      onChange={(id) => onChange(withGamesFilter(filter, { deckId: id || undefined }))}
      options={[{ value: "", label: copy.allDecks }, ...decks.map((d) => ({ value: d.id, label: `${d.name} · ${counts.get(d.id) ?? 0}` }))]}
      className="relative flex h-[44px] min-w-0 cursor-pointer items-center gap-[8px] font-sans text-[15px] font-semibold text-[color:var(--fg)]"
    >
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{chosen ? chosen.name : copy.allDecks}</span>
      <span className="font-mono text-[11px] font-normal text-[color:var(--fg-faint)]">{count}</span>
      <Chevron className="text-[color:var(--fg-faint)]" />
    </SelectTrigger>
  );
}

/** The wide form's Deck dropdown. */
export function DeckWideTrigger({ decks, filter, onChange }: {
  decks: readonly DeckChoice[];
  filter: GameHistoryFilter;
  onChange: (next: GameHistoryFilter) => void;
}) {
  const chosen = decks.find((d) => d.id === filter.deckId);
  return (
    <SelectTrigger
      label={copy.deck}
      value={filter.deckId ?? ""}
      onChange={(id) => onChange(withGamesFilter(filter, { deckId: id || undefined }))}
      options={[{ value: "", label: copy.allDecks }, ...decks.map((d) => ({ value: d.id, label: d.name }))]}
      className={`${triggerLook(chosen !== undefined)} max-w-[240px] cursor-pointer`}
    >
      <span className="min-w-0 overflow-hidden text-ellipsis">{chosen ? chosen.name : copy.allDecks}</span>
      <Chevron />
    </SelectTrigger>
  );
}

/** The wide form's Result dropdown. */
export function ResultWideTrigger({ filter, onChange }: { filter: GameHistoryFilter; onChange: (next: GameHistoryFilter) => void }) {
  const on = RESULTS.find((r) => r === filter.result);
  return (
    <SelectTrigger
      label={copy.result}
      value={on ?? ""}
      onChange={(r) => onChange(withGamesFilter(filter, { result: r || undefined }))}
      options={[{ value: "", label: copy.anyResult }, ...RESULTS.map((r) => ({ value: r, label: copy.results[r] }))]}
      className={`${triggerLook(filter.result !== undefined)} cursor-pointer`}
    >
      <span>{on ? copy.results[on] : copy.anyResult}</span>
      <Chevron />
    </SelectTrigger>
  );
}

/** The option's face: a friend's signature commander, or the commander's own art; initials when there is none. */
function OptionFace({ option, size }: { option: AgainstOption; size: 22 | 30 }) {
  return <Face name={option.name} commander={option.artCropUri ? { artCropUri: option.artCropUri } : null} size={size} />;
}

export function OptionName({ option }: { option: AgainstOption }) {
  return typeof option.name === "string" ? <>{option.name}</> : <PersonName n={option.name} />;
}

/**
 * The searchable list: a field, then Friends and Commanders, each row a face, a name, the reader's count of games against
 * them and a box. Search reads both kinds. A press picks the row (or takes it off); the list never reorders under a press.
 */
function AgainstList({ options, chosen, onPick, inputRef, faceSize, describedBy }: {
  options: readonly AgainstOption[];
  chosen: AgainstOption | null;
  onPick: (o: AgainstOption) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  faceSize: 22 | 30;
  describedBy?: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const shown = useMemo(() => (q === "" ? options : options.filter((o) => nameIncludes(o.name, q))), [options, q]);
  const groups = [
    { key: "friend" as const, label: copy.friends, rows: shown.filter((o) => o.kind === "friend") },
    { key: "commander" as const, label: copy.commanders, rows: shown.filter((o) => o.kind === "commander") },
  ].filter((g) => g.rows.length > 0);
  return (
    <>
      <div className="shrink-0">
        <SearchField
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder={copy.search}
          aria-label={copy.search}
          aria-describedby={describedBy}
          autoComplete="off"
          // 16px on a touch screen, or iOS zooms the page when the field takes focus.
          className="h-[44px] text-[16px] md:h-[38px] [@media(pointer:fine)]:md:text-[13.5px]"
        />
      </div>
      <div className="mt-[10px] min-h-0 overflow-y-auto rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)]">
        {groups.length === 0 ? (
          <p className="m-0 px-[14px] py-[12px] text-[13px] text-[color:var(--fg-muted)]">{copy.noOption}</p>
        ) : (
          groups.map((g) => (
            <div key={g.key} role="group" aria-label={g.label}>
              <p className="m-0 border-0 border-b border-solid border-b-[color:var(--border)] bg-[color:var(--surface-raised)] px-[12px] py-[7px] font-mono text-[10px] uppercase leading-[normal] tracking-[0.14em] text-[color:var(--fg-faint)]">{g.label}</p>
              {g.rows.map((o) => {
                const on = chosen !== null && chosen.kind === o.kind && chosen.id === o.id;
                return (
                  <button
                    key={`${o.kind}:${o.id}`}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onPick(o)}
                    className="flex min-h-[44px] w-full cursor-pointer items-center gap-[10px] border-0 border-b border-solid border-b-[color:var(--border)] bg-transparent px-[12px] py-[6px] text-left text-[13.5px] text-[color:var(--fg)] last:border-b-0 hover:bg-[color:var(--surface-raised)]"
                  >
                    <OptionFace option={o} size={faceSize} />
                    <span className="min-w-0 flex-1 truncate"><OptionName option={o} /></span>
                    <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.optionCount(o.games)}</span>
                    <span
                      aria-hidden
                      className={`flex h-[16px] w-[16px] flex-none items-center justify-center rounded-[4px] border border-solid text-[11px] leading-none ${on ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--bg)]" : "border-[color:var(--border-strong)]"}`}
                    >
                      {on ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </>
  );
}

/** The wide form's Played against: the trigger and, open, the anchored panel under it. */
export function AgainstWideTrigger({ options, filter, onChange }: {
  options: readonly AgainstOption[];
  filter: GameHistoryFilter;
  onChange: (next: GameHistoryFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const chosen = chosenAgainst(options, filter);
  const on = playedAgainstOf(filter) !== null;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { at, panelRef, triggerRef } = useAnchoredPanel<HTMLButtonElement>({ open, width: PANEL_WIDTH });
  // The panel is hidden until it is placed, and a hidden field takes no focus: focus the search once it is visible.
  const focused = useRef(false);
  useEffect(() => {
    if (!open) { focused.current = false; return; }
    if (!at || focused.current) return;
    focused.current = true;
    inputRef.current?.focus();
  }, [open, at]);
  // A non-modal panel (the page beside it stays usable): Escape and focus-return, no trap and no scroll lock.
  useDialogA11y(panelRef, () => setOpen(false), { initialFocusRef: inputRef, returnFocusRef: triggerRef, lockScroll: false, trapTab: false });
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      const node = e.target as Node;
      if (panelRef.current?.contains(node) || triggerRef.current?.contains(node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open, panelRef, triggerRef]);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={copy.playedAgainst}
        onClick={() => setOpen((o) => !o)}
        className={`${triggerLook(on)} cursor-pointer ${open ? "border-[color:var(--accent)]" : ""}`}
      >
        <span className="max-w-[170px] truncate">{chosen ? <OptionName option={chosen} /> : copy.playedAgainst}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div
          id={id}
          ref={panelRef}
          role="dialog"
          aria-label={copy.playedAgainst}
          className={`${ANCHORED_PANEL_CLASS} fixed flex flex-col p-[10px]`}
          style={{ width: PANEL_WIDTH, maxHeight: at?.maxHeight, top: at?.top ?? 0, left: at?.left ?? 0, visibility: at ? "visible" : "hidden" }}
        >
          <AgainstList
            options={options}
            chosen={chosen}
            faceSize={22}
            inputRef={inputRef}
            onPick={(o) => { onChange(pickAgainst(filter, o)); setOpen(false); }}
          />
        </div>
      ) : null}
    </>
  );
}

/**
 * `Filter games` on the phone: the shared Sheet (Small items 9, B1), Result as three toggles with the reader's counts
 * under the OTHER filters, Played against as the searchable list, and a button that says what it would show. Filters apply
 * as they are touched, as the deck filter sheet's do; the button only closes. Nothing is ever disabled: a zero option stays
 * pressable and `Show 0 games` lands on the no-match frame.
 */
export function GamesFilterSheet({ open, onDismiss, filter, onChange, options, byResult, shown }: {
  open: boolean;
  onDismiss: () => void;
  filter: GameHistoryFilter;
  onChange: (next: GameHistoryFilter) => void;
  options: readonly AgainstOption[];
  byResult: { wins: number; losses: number; draws: number };
  /** Games the list holds under the filter as it stands. */
  shown: number;
}) {
  // Mounted only while open: its trap and scroll lock follow the dialog, not this component's lifetime.
  return open ? <SheetBody onDismiss={onDismiss} filter={filter} onChange={onChange} options={options} byResult={byResult} shown={shown} /> : null;
}

function SheetBody({ onDismiss, filter, onChange, options, byResult, shown }: Omit<Parameters<typeof GamesFilterSheet>[0], "open">) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useDialogA11y(panelRef, onDismiss);
  const counts: Record<GameResult, number> = { win: byResult.wins, loss: byResult.losses, draw: byResult.draws };
  const chosen = chosenAgainst(options, filter);
  const none = filter.result === undefined && playedAgainstOf(filter) === null;
  return (
    <Sheet
      open
      portal
      onDismiss={onDismiss}
      ariaLabel={copy.open}
      panelRef={panelRef}
      header={<SheetHeader title={copy.open} closeLabel={copy.close} onDismiss={onDismiss} />}
      footer={
        <div className="flex items-center gap-[10px] border-0 border-t border-solid border-t-[color:var(--border)] px-[16px] py-[12px]">
          <GhostButton
            onClick={() => onChange(withGamesFilter(filter, { result: undefined, friend: undefined, commander: undefined }))}
            disabled={none}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] px-[14px] text-[14px]"
          >
            {copy.clearAll}
          </GhostButton>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-[44px] flex-auto cursor-pointer items-center justify-center rounded-[10px] border-none bg-[color:var(--fg)] text-[14px] font-semibold text-[color:var(--bg)]"
          >
            {copy.show(shown)}
          </button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-col gap-[16px] overflow-y-auto px-[16px] pb-[14px]">
        <fieldset role="group" aria-label={copy.result} className="m-0 border-none p-0">
          <legend className="mx-0 mt-0 mb-[9px] p-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.result}</legend>
          <div className="flex flex-wrap gap-[8px]">
            {RESULTS.map((r) => {
              const on = filter.result === r;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(withGamesFilter(filter, { result: on ? undefined : r }))}
                  className={`flex h-[44px] cursor-pointer items-center gap-[7px] rounded-[10px] border border-solid bg-transparent px-[12px] font-sans text-[13px] text-[color:var(--fg)] ${on ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]"}`}
                >
                  {copy.results[r]}
                  <small className="font-mono text-[10px] text-[color:var(--fg-faint)]">{counts[r]}</small>
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset role="group" aria-label={copy.playedAgainst} className="m-0 flex min-h-0 flex-col border-none p-0">
          <legend className="mx-0 mt-0 mb-[9px] p-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.playedAgainst}</legend>
          <AgainstList
            options={options}
            chosen={chosen}
            faceSize={30}
            inputRef={inputRef}
            onPick={(o) => onChange(pickAgainst(filter, o))}
          />
        </fieldset>
      </div>
    </Sheet>
  );
}
