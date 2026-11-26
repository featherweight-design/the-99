"use client";

// The Games view's filter controls (design handoff `design_handoff_the99_game_history`, build PR 4; Small items 9, A1 and
// B1). Deck, Result and Played against, drawn twice from one state: on the phone the deck picker sits in the shelf
// picker's slot and Result and Played against live in the shared Sheet behind `Filter games`; from the chassis's wide form
// the three are dropdowns on the view row, Played against in the app's anchored panel. Neither reads or writes the URL: the
// view hands a whole new filter back and the hook that holds it does that (`useGamesFilters`).
//
// Deck is a custom trigger opening an anchored panel (wide) or a Sheet (phone); Result is an inline SegmentedSwitch (on the
// phone inside the sheet); Played against is the anchored panel with the picked face and a ✕ (games tabs redesign, PR 4).

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { gameHistoryCopy } from "../../lib/copy/game-history";
import { playedAgainstOf, withGamesFilter } from "../../lib/games/history-filter";
import type { GameHistoryFilter, GameResult } from "../../lib/games/history-rules";
import type { GamesPayload } from "../../lib/games/history-wire";
import { nameIncludes, PersonName, type ThirdPartyName } from "../../lib/person-name";
import { Face } from "../social/face";
import { ArtLayer } from "../ui/art-layer";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { ANCHORED_PANEL_CLASS, useAnchoredPanel } from "../ui/anchored-panel";
import { Chevron } from "../ui/chevron";
import { GhostButton } from "../ui/button";
import { Sheet, SheetHeader } from "../ui/sheet";
import { SearchField } from "../ui/text-field";

const copy = gameHistoryCopy.filter;
const RESULTS: GameResult[] = ["win", "loss", "draw"];
const PANEL_WIDTH = 300;

export type DeckChoice = { id: string; name: string; identity: string[]; /** The commander's art crop, for the Most played cell. */ artUri?: string | null };

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

/** A deck's art crop as a small tile; blank until the art lands or when the deck has none. */
function DeckTile({ deck, size }: { deck: DeckChoice | null; size: 22 | 28 }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="relative inline-block flex-none overflow-hidden rounded-[6px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)]"
    >
      {deck?.artUri ? <ArtLayer src={deck.artUri} /> : null}
    </span>
  );
}

/** The one-of-the-list mark: only the chosen row carries it, so a single-value list does not read as multi-select. */
function ChosenMark({ on }: { on: boolean }) {
  return on ? (
    <span aria-hidden className="relative h-[18px] w-[18px] flex-none rounded-[5px] border border-solid border-[color:var(--accent)] bg-[color:var(--accent)]">
      <span className="absolute left-[5px] top-[2px] h-[9px] w-[5px] rotate-45 border-0 border-b-2 border-r-2 border-solid border-[color:var(--bg)]" />
    </span>
  ) : (
    // The slot stays so the counts keep one column whichever row is chosen.
    <span aria-hidden className="h-[18px] w-[18px] flex-none" />
  );
}

/** The decks the list draws: those with a game under the other filters, and the chosen one whatever its count. */
function listedDecks(decks: readonly DeckChoice[], counts: ReadonlyMap<string, number>, chosenId: string | undefined) {
  const listed = decks.filter((d) => (counts.get(d.id) ?? 0) > 0 || d.id === chosenId);
  return { listed, leftOut: decks.length - listed.length };
}

/**
 * The Deck list: a field, an `All decks` row, then a row per deck with games (art, name, count, mark), and a foot that
 * says how many decks are left out and why. 56px rows in the phone sheet, 38px in the desktop panel.
 */
function DeckList({ decks, counts, chosenId, onPick, inputRef, panel }: {
  decks: readonly DeckChoice[];
  counts: ReadonlyMap<string, number>;
  chosenId: string | undefined;
  onPick: (id: string | undefined) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  panel: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const { listed, leftOut } = listedDecks(decks, counts, chosenId);
  const shown = q === "" ? listed : listed.filter((d) => d.name.toLowerCase().includes(q));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const row = `flex w-full cursor-pointer items-center gap-[10px] border-0 border-t border-solid border-t-[color:var(--border)] bg-transparent px-[12px] text-left text-[color:var(--fg)] hover:bg-[color:var(--surface-raised)] ${panel ? "min-h-[38px] text-[13px]" : "min-h-[56px] text-[14px]"}`;
  return (
    <>
      <div className="shrink-0">
        <SearchField
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder={copy.deckSearch}
          aria-label={copy.deckSearch}
          autoComplete="off"
          className={panel ? "h-[34px] text-[16px] [@media(pointer:fine)]:text-[13px]" : "h-[44px] text-[16px]"}
        />
      </div>
      <div className={`min-h-0 overflow-y-auto rounded-[10px] border border-solid border-[color:var(--border)] ${panel ? "" : "mt-[9px]"}`}>
        {q === "" ? (
          <button type="button" aria-pressed={chosenId === undefined} onClick={() => onPick(undefined)} className={`${row} border-t-0`}>
            <DeckTile deck={null} size={panel ? 22 : 28} />
            <span className="min-w-0 flex-1 truncate">{copy.allDecks}</span>
            <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{total}</span>
            <ChosenMark on={chosenId === undefined} />
          </button>
        ) : null}
        {shown.length === 0 ? (
          <p className="m-0 px-[14px] py-[12px] text-[13px] text-[color:var(--fg-muted)]">{copy.noDeck}</p>
        ) : (
          shown.map((d) => (
            <button key={d.id} type="button" aria-pressed={chosenId === d.id} onClick={() => onPick(d.id)} className={row}>
              <DeckTile deck={d} size={panel ? 22 : 28} />
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{counts.get(d.id) ?? 0}</span>
              <ChosenMark on={chosenId === d.id} />
            </button>
          ))
        )}
      </div>
      {leftOut > 0 ? <p className="m-0 px-[4px] font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.deckLeftOut(leftOut)}</p> : null}
    </>
  );
}

/** The deck trigger's art: the chosen deck's tile, or up to three listed decks' tiles overlapped. */
function DeckArtStack({ decks, chosen }: { decks: readonly DeckChoice[]; chosen: DeckChoice | undefined }) {
  const tiles = chosen ? [chosen] : decks.slice(0, 3);
  return (
    <span aria-hidden className="inline-flex flex-none items-center">
      {tiles.map((d, i) => (
        <span key={d.id} className={i === 0 ? "" : "-ml-[8px]"}><DeckTile deck={d} size={22} /></span>
      ))}
    </span>
  );
}

/** The phone's deck picker, in the shelf picker's slot: the deck's name, its games under the others, a chevron; a press opens the sheet. */
export function DeckPhonePicker({ decks, filter, counts, onChange }: {
  decks: readonly DeckChoice[];
  filter: GameHistoryFilter;
  /** Games per deck under the other filters. */
  counts: ReadonlyMap<string, number>;
  onChange: (next: GameHistoryFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const chosen = decks.find((d) => d.id === filter.deckId);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const count = chosen ? counts.get(chosen.id) ?? 0 : total;
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={copy.deck}
        onClick={() => setOpen(true)}
        className="relative flex h-[44px] min-w-0 cursor-pointer items-baseline gap-[7px] border-0 bg-transparent p-0 pt-[13px] font-sans text-[15px] font-semibold text-[color:var(--fg)]"
      >
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{chosen ? chosen.name : copy.allDecks}</span>
        <span className="font-mono text-[11.5px] font-normal text-[color:var(--fg-faint)]">{count}</span>
        <Chevron className="self-center text-[11px] text-[color:var(--fg-muted)]" />
      </button>
      {open ? <DeckSheet decks={decks} counts={counts} chosenId={filter.deckId} onPick={(id) => { onChange(withGamesFilter(filter, { deckId: id })); setOpen(false); }} onDismiss={() => setOpen(false)} /> : null}
    </>
  );
}

function DeckSheet({ decks, counts, chosenId, onPick, onDismiss }: {
  decks: readonly DeckChoice[];
  counts: ReadonlyMap<string, number>;
  chosenId: string | undefined;
  onPick: (id: string | undefined) => void;
  onDismiss: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useDialogA11y(panelRef, onDismiss);
  return (
    <Sheet open portal onDismiss={onDismiss} ariaLabel={copy.deck} panelRef={panelRef} header={<SheetHeader title={copy.deck} closeLabel={copy.close} onDismiss={onDismiss} />}>
      <div className="flex min-h-0 flex-col gap-[8px] overflow-y-auto px-[18px] pb-[18px] pt-[14px]">
        <DeckList decks={decks} counts={counts} chosenId={chosenId} onPick={onPick} inputRef={inputRef} panel={false} />
      </div>
    </Sheet>
  );
}

/**
 * The wide form's anchored panel and its trigger: a non-modal panel under the button (the page beside it stays usable),
 * closed by Escape, a press outside, or the child's `close`. `clear` adds a ✕ after the trigger that takes the value off.
 */
function WidePanel({ label, on, trigger, clear, children }: {
  label: string;
  on: boolean;
  trigger: ReactNode;
  clear?: { label: string; onClear: () => void };
  children: (ctx: { close: () => void; inputRef: React.RefObject<HTMLInputElement | null> }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
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
      <span className={`${triggerLook(on)} !p-0 ${open ? "border-[color:var(--accent)]" : ""}`}>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-label={label}
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex cursor-pointer items-center gap-[8px] border-0 bg-transparent py-[9px] pl-[14px] font-sans text-[13px] font-medium text-[color:var(--fg)] ${clear ? "pr-[6px]" : "pr-[14px]"}`}
        >
          {trigger}
          <Chevron open={open} />
        </button>
        {clear ? (
          <button type="button" aria-label={clear.label} onClick={() => { clear.onClear(); triggerRef.current?.focus(); }} className="flex cursor-pointer items-center border-0 bg-transparent py-[9px] pl-[4px] pr-[12px] text-[13px] leading-none text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]">
            <span aria-hidden>✕</span>
          </button>
        ) : null}
      </span>
      {open ? (
        <div
          id={id}
          ref={panelRef}
          role="dialog"
          aria-label={label}
          onBlur={(e) => {
            // Tabbing out of the non-modal panel closes it; a blur to nothing (a click on the page) is the mousedown handler's.
            const to = e.relatedTarget as Node | null;
            if (to && !e.currentTarget.contains(to) && !triggerRef.current?.contains(to)) setOpen(false);
          }}
          className={`${ANCHORED_PANEL_CLASS} fixed flex flex-col gap-[8px] p-[8px]`}
          style={{ background: "var(--surface-raised)", width: PANEL_WIDTH, maxHeight: at?.maxHeight, top: at?.top ?? 0, left: at?.left ?? 0, visibility: at ? "visible" : "hidden" }}
        >
          {children({ close: () => setOpen(false), inputRef })}
        </div>
      ) : null}
    </>
  );
}

/** The wide form's Deck trigger (art stack and name) and its panel. */
export function DeckWideTrigger({ decks, filter, counts, onChange }: {
  decks: readonly DeckChoice[];
  filter: GameHistoryFilter;
  counts: ReadonlyMap<string, number>;
  onChange: (next: GameHistoryFilter) => void;
}) {
  const chosen = decks.find((d) => d.id === filter.deckId);
  const { listed } = listedDecks(decks, counts, filter.deckId);
  return (
    <WidePanel
      label={copy.deck}
      on={chosen !== undefined}
      trigger={
        <>
          <DeckArtStack decks={listed} chosen={chosen} />
          <span className="max-w-[170px] truncate">{chosen ? chosen.name : copy.allDecks}</span>
        </>
      }
    >
      {({ close, inputRef }) => (
        <DeckList decks={decks} counts={counts} chosenId={filter.deckId} inputRef={inputRef} panel onPick={(id) => { onChange(withGamesFilter(filter, { deckId: id })); close(); }} />
      )}
    </WidePanel>
  );
}

/** Result as an inline switch: Any · Won · Lost · Drawn. Wide on the view row; `fill` in the phone sheet. */
export function ResultSwitch({ filter, onChange, fill }: { filter: GameHistoryFilter; onChange: (next: GameHistoryFilter) => void; fill?: boolean }) {
  const on = RESULTS.find((r) => r === filter.result);
  return (
    <SegmentedSwitch<GameResult | "any">
      kind="radio"
      ariaLabel={copy.result}
      size="compact"
      fill={fill}
      value={on ?? "any"}
      onChange={(v) => onChange(withGamesFilter(filter, { result: v === "any" ? undefined : v }))}
      segments={[{ value: "any", label: copy.anyShort }, ...RESULTS.map((r) => ({ value: r, label: copy.results[r] }))]}
    />
  );
}

/** The option's face: a friend's signature commander, or the commander's own art; initials when there is none. */
function OptionFace({ option, panel }: { option: AgainstOption; panel: boolean }) {
  // The board's 22px tile in the panel and 26px in the sheet, both with the 6px corners the 22 draws.
  return <Face name={option.name} commander={option.artCropUri ? { artCropUri: option.artCropUri } : null} size={22} className={panel ? "" : "!h-[26px] !w-[26px]"} />;
}

export function OptionName({ option }: { option: AgainstOption }) {
  return typeof option.name === "string" ? <>{option.name}</> : <PersonName n={option.name} />;
}

/**
 * The searchable list: a field, then Friends and Commanders, each row a face, a name, the reader's count of games against
 * them and a box. Search reads both kinds. A press picks the row (or takes it off); the list never reorders under a press.
 */
function AgainstList({ options, chosen, onPick, inputRef, panel, describedBy }: {
  options: readonly AgainstOption[];
  chosen: AgainstOption | null;
  onPick: (o: AgainstOption) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** The desktop panel (13px rows, a 34px field, bare commander counts) rather than the phone sheet (14px, 46px rows, 44px field). */
  panel: boolean;
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
          className={panel ? "h-[34px] text-[16px] [@media(pointer:fine)]:text-[13px]" : "h-[44px] text-[16px]"}
        />
      </div>
      <div className={`min-h-0 overflow-y-auto rounded-[10px] border border-solid border-[color:var(--border)] ${panel ? "" : "mt-[9px]"}`}>
        {groups.length === 0 ? (
          <p className="m-0 px-[14px] py-[12px] text-[13px] text-[color:var(--fg-muted)]">{copy.noOption}</p>
        ) : (
          groups.map((g) => (
            <div key={g.key} role="group" aria-label={g.label}>
              <p className="m-0 flex min-h-[30px] items-center border-0 border-t border-solid border-t-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[12px] font-mono text-[11px] uppercase leading-[normal] tracking-[0.1em] text-[color:var(--fg-faint)] first:border-t-0">{g.label}</p>
              {g.rows.map((o) => {
                const on = chosen !== null && chosen.kind === o.kind && chosen.id === o.id;
                return (
                  <button
                    key={`${o.kind}:${o.id}`}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onPick(o)}
                    className={`flex w-full cursor-pointer items-center gap-[10px] border-0 border-t border-solid border-t-[color:var(--border)] bg-transparent px-[12px] text-left text-[color:var(--fg)] hover:bg-[color:var(--surface-raised)] ${panel ? "min-h-[38px] text-[13px]" : "min-h-[46px] text-[14px]"}`}
                  >
                    <OptionFace option={o} panel={panel} />
                    <span className="min-w-0 flex-1 truncate"><OptionName option={o} /></span>
                    <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{panel && o.kind === "commander" ? o.games : copy.optionCount(o.games)}</span>
                    <ChosenMark on={on} />
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

/** The wide form's Played against: the picked face and name with a ✕, and the anchored panel under it. */
export function AgainstWideTrigger({ options, filter, onChange }: {
  options: readonly AgainstOption[];
  filter: GameHistoryFilter;
  onChange: (next: GameHistoryFilter) => void;
}) {
  const chosen = chosenAgainst(options, filter);
  const on = playedAgainstOf(filter) !== null;
  return (
    <WidePanel
      label={copy.playedAgainst}
      on={on}
      clear={on ? { label: copy.clearAgainst, onClear: () => onChange(withGamesFilter(filter, { friend: undefined, commander: undefined })) } : undefined}
      trigger={
        <>
          {chosen ? <OptionFace option={chosen} panel /> : null}
          <span className="max-w-[170px] truncate">{chosen ? <OptionName option={chosen} /> : copy.playedAgainst}</span>
        </>
      }
    >
      {({ close, inputRef }) => (
        <AgainstList options={options} chosen={chosen} panel inputRef={inputRef} onPick={(o) => { onChange(pickAgainst(filter, o)); close(); }} />
      )}
    </WidePanel>
  );
}

/**
 * `Filter games` on the phone: the shared Sheet (Small items 9, B1), Result as three toggles with the reader's counts
 * under the OTHER filters, Played against as the searchable list, and a button that says what it would show. Filters apply
 * as they are touched, as the deck filter sheet's do; the button only closes. Nothing is ever disabled: a zero option stays
 * pressable and `Show 0 games` lands on the no-match frame.
 */
export function GamesFilterSheet({ open, onDismiss, filter, onChange, options, shown }: {
  open: boolean;
  onDismiss: () => void;
  filter: GameHistoryFilter;
  onChange: (next: GameHistoryFilter) => void;
  options: readonly AgainstOption[];
  /** Games the list holds under the filter as it stands. */
  shown: number;
}) {
  // Mounted only while open: its trap and scroll lock follow the dialog, not this component's lifetime.
  return open ? <SheetBody onDismiss={onDismiss} filter={filter} onChange={onChange} options={options} shown={shown} /> : null;
}

function SheetBody({ onDismiss, filter, onChange, options, shown }: Omit<Parameters<typeof GamesFilterSheet>[0], "open">) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useDialogA11y(panelRef, onDismiss);
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
        <div className="flex items-center gap-[10px] border-0 border-t border-solid border-t-[color:var(--border)] px-[18px] pb-[18px] pt-[12px]">
          <GhostButton
            onClick={() => onChange(withGamesFilter(filter, { result: undefined, friend: undefined, commander: undefined }))}
            disabled={none}
            // Inert reads inert: GHOST draws a disabled press as an enabled one, so this button says it itself.
            className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] px-[14px] text-[14px] disabled:![color:var(--fg-locked)] disabled:![border-color:var(--border)] disabled:hover:![color:var(--fg-locked)] disabled:hover:![border-color:var(--border)]"
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
      <div className="flex min-h-0 flex-col gap-[18px] overflow-y-auto px-[18px] pb-[14px] pt-[14px]">
        <fieldset role="group" aria-label={copy.result} className="m-0 border-none p-0">
          <legend className="mx-0 mt-0 mb-[9px] p-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.result}</legend>
          <ResultSwitch filter={filter} onChange={onChange} fill />
        </fieldset>
        <fieldset role="group" aria-label={copy.playedAgainst} className="m-0 flex min-h-0 flex-col border-none p-0">
          <legend className="mx-0 mt-0 mb-[9px] p-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.playedAgainst}</legend>
          <AgainstList
            options={options}
            chosen={chosen}
            panel={false}
            inputRef={inputRef}
            onPick={(o) => onChange(pickAgainst(filter, o))}
          />
        </fieldset>
      </div>
    </Sheet>
  );
}
