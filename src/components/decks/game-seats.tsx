"use client";
// GameSeats: the form's optional "Across the table" row (Social R3 plan, PR 2; the handoff's F1, F5, F6, F8 and
// P1 to P7). Your seat first, each opponent as an art seat, then a dashed Add opponent while the pod has room.
// On a loss each opponent carries a trophy for who won. ONE tree for both widths: the seat is a column of
// 124 x 86 art at 1300 and a 58px row at 390, and the trophy is one button that is a circle over the art at
// 1300 and a `Won` pill at the row's end at 390.
//
// The row holds no state of its own beyond which seat's picker is open; the seats, the result and the pod size
// are the form's, so what is saved is what is drawn.

import { useEffect, useRef, useState } from "react";
import { gameSeatsCopy } from "../../lib/copy/game-seats";
import { hasRoom, seatCount, seatName, shortName, SEAT_LABEL_MAX, type Seat, type SeatCommander } from "../../lib/decks/game-seats";
import type { OpponentCommanderHit } from "../../lib/decks/opponent-commanders";
import { SeatPicker } from "./seat-picker";

const copy = gameSeatsCopy.seats;

/** Your own seat: the deck's commander, tagged YOU, and not pressable. It makes the count legible. */
export type YouSeat = { name: string; deckName: string; imageUri: string | null };

const ART = "relative block h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[8px] md:h-[86px] md:w-[124px] md:rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--elevated)] bg-cover";
const ART_POSITION = "50% 20%";

function Art({ uri, dim = false }: { uri: string | null; dim?: boolean }) {
  return (
    <span
      aria-hidden
      className={ART}
      style={{ ...(uri ? { backgroundImage: `url("${uri}")`, backgroundPosition: ART_POSITION } : {}), ...(dim ? { opacity: 0.78 } : {}) }}
    />
  );
}

function Trophy() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 2.5h7v4a3.5 3.5 0 0 1-7 0v-4Z" />
      <path d="M4.5 4H2.5a1.5 1.5 0 0 0 2 2.3M11.5 4h2a1.5 1.5 0 0 1-2 2.3M8 10v2.5M5.5 13.5h5" />
    </svg>
  );
}

function SeatView({
  seat, lost, busy, editing, onOpen, onClear, onWon, onLabel,
}: {
  seat: Seat;
  lost: boolean;
  busy: boolean;
  editing: boolean;
  onOpen: (anchor: HTMLElement) => void;
  onClear: () => void;
  onWon: () => void;
  onLabel: (text: string) => void;
}) {
  const name = seatName(seat);
  // The name field is drawn in place once asked for, or while the seat already carries a label.
  const [naming, setNaming] = useState(false);
  const labelled = seat.label !== "";
  const fieldOpen = naming || labelled;
  return (
    <li className="relative flex list-none items-center gap-[12px] md:w-[124px] md:flex-col md:items-stretch md:gap-[2px]">
      <button
        type="button"
        disabled={busy}
        onClick={(e) => onOpen(e.currentTarget)}
        aria-label={copy.change(name)}
        aria-expanded={editing}
        data-seat-art
        className={`shrink-0 cursor-pointer rounded-[8px] border-0 bg-transparent p-0 md:rounded-[10px] ${seat.won ? "outline outline-2 outline-offset-2 outline-[color:var(--fg)]" : ""}`}
      >
        <Art uri={seat.commander.imageUri} />
      </button>
      <span className="min-w-0 flex-1 md:flex-none">
        <span className="mt-0 block truncate text-[13px] font-medium text-[color:var(--fg)] md:mt-[6px]">{name}</span>
        {seat.won ? (
          <span className="block truncate font-mono text-[10.5px] text-[color:var(--fg)]">{copy.wonLine}</span>
        ) : fieldOpen ? (
          <span className="flex items-center gap-[6px]">
            <input
              type="text"
              value={seat.label}
              autoFocus={naming && !labelled}
              maxLength={SEAT_LABEL_MAX * 2}
              disabled={busy}
              aria-label={copy.labelAria}
              placeholder={copy.addName}
              onChange={(e) => onLabel(e.target.value)}
              onBlur={() => { if (seat.label === "") setNaming(false); }}
              // 16px on the phone, or iOS zooms the page when the field takes focus.
              className="h-[28px] min-w-0 flex-1 rounded-[6px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[6px] text-[16px] text-[color:var(--fg)] md:text-[11px]"
            />
            <span className="shrink-0 font-mono text-[10px] text-[color:var(--fg-faint)]">
              {copy.labelCounter(Array.from(seat.label).length)}
            </span>
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setNaming(true)}
            className="block cursor-pointer border-0 border-b border-dashed border-b-[color:var(--border-dashed)] bg-transparent p-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]"
          >
            {copy.addName}
          </button>
        )}
      </span>
      {lost && (
        <button
          type="button"
          disabled={busy}
          aria-pressed={seat.won}
          aria-label={copy.wonAria(name)}
          onClick={onWon}
          className={
            "flex h-[32px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid px-[12px] font-mono text-[11px] font-semibold " +
            "md:absolute md:right-[6px] md:top-[6px] md:h-[30px] md:w-[30px] md:p-0 " +
            (seat.won
              ? "border-[color:var(--fg)] bg-[color:var(--fg)] text-[color:var(--bg)]"
              : "border-[color:var(--border-strong)] bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] text-[color:var(--fg)]")
          }
        >
          <span className="md:hidden">{copy.wonPill}</span>
          <span className="hidden md:block"><Trophy /></span>
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onClear}
        aria-label={copy.clear(name)}
        className="flex h-[28px] w-[28px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid border-[color:var(--border)] bg-transparent text-[12px] text-[color:var(--fg-muted)] md:absolute md:left-[6px] md:top-[6px] md:h-[22px] md:w-[22px] md:bg-[color-mix(in_srgb,var(--bg)_80%,transparent)]"
      >
        ✕
      </button>
    </li>
  );
}

export function GameSeats({
  you, podSize, result, seats, busy, held, onSeat, onClear, onWon, onLabel,
}: {
  you: YouSeat;
  podSize: number;
  result: "win" | "loss" | "draw" | null;
  seats: Seat[];
  busy: boolean;
  /** A pod size below the filled seats was pressed: say why it did not move. */
  held: boolean;
  /** `at` is the seat key being changed, or null for a new seat. */
  onSeat: (at: string | null, commander: SeatCommander) => void;
  onClear: (key: string) => void;
  onWon: (key: string) => void;
  onLabel: (key: string, text: string) => void;
}) {
  // Which seat the open picker is for (null: a new seat), and the control it hangs from.
  const [picking, setPicking] = useState<{ at: string | null; anchor: HTMLElement } | null>(null);
  const room = hasRoom(podSize, seats.length);
  const lost = result === "loss" && seats.length > 0;
  const addRef = useRef<HTMLButtonElement>(null);

  const section = useRef<HTMLElement>(null);
  // Set when a pick closes a picker whose opener may now be gone.
  const refocus = useRef<HTMLElement | null>(null);

  function pick(hit: OpponentCommanderHit) {
    if (!picking) return;
    refocus.current = picking.anchor;
    onSeat(picking.at, { oracleId: hit.oracleId, name: hit.name, imageUri: hit.imageUri, colorIdentity: hit.colorIdentity });
    setPicking(null);
  }

  // Filling the last seat removes Add opponent in the same commit that closes the picker, so the dialog's own
  // focus return lands on a detached button and focus drops to the page. The seat just filled is the last one.
  useEffect(() => {
    const opener = refocus.current;
    if (!opener || picking) return;
    refocus.current = null;
    if (opener.isConnected) return;
    const arts = section.current?.querySelectorAll<HTMLElement>("[data-seat-art]");
    arts?.[arts.length - 1]?.focus();
  }, [picking, seats]);

  return (
    <section ref={section} aria-labelledby="game-seats-label" className="mb-[18px] mt-[16px] border-0 border-t border-solid border-t-[color:var(--border)] pt-[14px] md:mt-[2px] md:pt-[16px]">
      <div className="mb-[10px] flex items-baseline justify-between gap-[12px]">
        <span id="game-seats-label" className="block font-mono text-[9.5px] uppercase tracking-[0.14em] text-fg-faint md:text-[10px]">
          {copy.label}
        </span>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.count(seats.length, seatCount(podSize))}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-[10px] p-0 md:flex-row md:flex-wrap md:gap-[12px]">
        <li className="flex list-none items-center gap-[12px] md:w-[124px] md:flex-col md:items-stretch md:gap-[2px]">
          <Art uri={you.imageUri} dim />
          <span className="min-w-0 flex-1 md:flex-none">
            <span className="mt-0 flex items-baseline gap-[6px] md:mt-[6px]">
              <span className="truncate text-[13px] font-medium text-[color:var(--fg)]">{copy.you}</span>
              <span className="font-mono text-[9px] tracking-[0.1em] text-[color:var(--fg-faint)]">{copy.youTag}</span>
            </span>
            <span className="block truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">{shortName(you.name)}</span>
          </span>
        </li>
        {seats.map((s) => (
          <SeatView
            key={s.key}
            seat={s}
            lost={lost}
            busy={busy}
            editing={picking?.at === s.key}
            onOpen={(anchor) => setPicking({ at: s.key, anchor })}
            onClear={() => onClear(s.key)}
            onWon={() => onWon(s.key)}
            onLabel={(text) => onLabel(s.key, text)}
          />
        ))}
        {room && (
          <li className="list-none">
            <button
              ref={addRef}
              type="button"
              disabled={busy}
              aria-expanded={picking?.at === null}
              onClick={(e) => setPicking({ at: null, anchor: e.currentTarget })}
              className={
                "flex h-[58px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[10px] border-[1.5px] bg-transparent text-[12.5px] text-[color:var(--fg-muted)] " +
                "md:h-[86px] md:w-[124px] md:flex-col md:gap-[4px] " +
                (picking?.at === null ? "border-solid border-[color:var(--accent)] text-[color:var(--fg)]" : "border-dashed border-[color:var(--border-dashed)]")
              }
            >
              <b aria-hidden className="text-[22px] font-normal leading-none">+</b>
              {copy.add}
            </button>
          </li>
        )}
      </ul>
      {held && (
        <p role="status" className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.held(seats.length)}</p>
      )}
      {lost && (
        <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-muted)]">
          <span className="hidden md:inline">{copy.wonHint}</span>
          <span className="md:hidden">{copy.wonHintPhone}</span>
        </p>
      )}
      {picking && <SeatPicker anchor={picking.anchor} onClose={() => setPicking(null)} onPick={pick} />}
    </section>
  );
}
