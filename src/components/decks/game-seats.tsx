"use client";
// GameSeats: the form's optional "Across the table" row (Social R3 plan, PR 2; the handoff's F1, F5, F6, F8 and
// P1 to P7). Your seat first, each opponent as an art seat, then a dashed Add opponent while the pod has room.
// On a loss each opponent carries a trophy for who won. ONE tree for both widths: the seat is a column of
// 124 x 86 art at 1300 and a 58px row at 390, and the trophy is one button that is a circle over the art at
// 1300 and a `Won` pill at the row's end at 390.
//
// The row holds no state of its own beyond which seat's picker is open; the seats, the result and the pod size
// are the form's, so what is saved is what is drawn.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { listPickerPodsAction, listPodSeatsAction } from "../../app/decks/[id]/opponent-actions";
import { gameSeatsCopy } from "../../lib/copy/game-seats";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { hasRoom, podFill, seatCount, seatedFriends, seatName, shortName, SEAT_LABEL_MAX, type Seat, type SeatFriend, type SeatPick } from "../../lib/decks/game-seats";
import { joinNames, PersonInitials, PersonName, PersonText, personAttrs, personText, type PersonParts, type ThirdPartyName } from "../../lib/person-name";
import type { PickerPod } from "../../lib/social/games";
import { ArtLayer } from "../ui/art-layer";
import { SeatPicker } from "./seat-picker";
import { TrophyIcon } from "./trophy-icon";

const copy = gameSeatsCopy.seats;

/** Your own seat: the deck's commander, tagged YOU, and not pressable. It makes the count legible. */
export type YouSeat = { name: string; deckName: string; imageUri: string | null };

const ART = "relative block h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[8px] md:h-[86px] md:w-[124px] md:rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--elevated)]";
const ART_POSITION = "50% 20%";

/** A seat's art, or the friend's initials while they were seated with no commander to draw. */
function Art({ uri, dim = false, initials = null }: { uri: string | null; dim?: boolean; initials?: ReactNode }) {
  return (
    <span aria-hidden className={`${ART} ${uri || initials === null ? "" : "flex items-center justify-center font-mono text-[18px] text-[color:var(--fg-muted)]"}`} style={dim ? { opacity: 0.78 } : undefined}>
      {uri ? <ArtLayer src={uri} style={{ backgroundPosition: ART_POSITION }} /> : initials}
    </span>
  );
}

/** The line under a seat's name: the table's deck, the friend's deck, the commander a friend played, or nothing. */
const seatSub = (s: Seat) => (s.table ? s.table.deckName : s.deck ? s.deck.name : s.friend && s.commander ? shortName(s.commander.name) : null);

function SeatView({
  seat, lost, busy, editing, onOpen, onClear, onWon, onLabel,
}: {
  seat: Seat;
  lost: boolean;
  busy: boolean;
  editing: boolean;
  /** `deck` opens the picker straight on this seat's friend, to pick a deck. */
  onOpen: (anchor: HTMLElement, deck?: boolean) => void;
  onClear: () => void;
  onWon: () => void;
  onLabel: (text: string) => void;
}) {
  const name = seatName(seat);
  // The name field is drawn in place once asked for, or while the seat already carries a label.
  const [naming, setNaming] = useState(false);
  const labelled = seat.label !== "";
  const fieldOpen = !seat.friend && (naming || labelled);
  const sub = seatSub(seat);
  return (
    <li className="relative flex list-none items-center gap-[12px] md:w-[124px] md:flex-col md:items-stretch md:gap-[2px]">
      <button
        type="button"
        disabled={busy}
        onClick={(e) => onOpen(e.currentTarget)}
        {...personAttrs({ "aria-label": copy.change(name) }, `shrink-0 cursor-pointer rounded-[8px] border-0 bg-transparent p-0 md:rounded-[10px] ${seat.won ? "outline outline-2 outline-offset-2 outline-[color:var(--fg)]" : ""}`)}
        aria-expanded={editing}
        data-seat-art
        data-seat-key={seat.key}
      >
        {seat.table ? (
          // A seat from a Rule 0 table (plan §PR 8) draws the table's art for it, or the player's initials while it waits.
          <Art uri={seat.table.artCropUri} initials={<PersonInitials n={seat.table.name} />} />
        ) : (
          <Art uri={seat.commander?.imageUri ?? null} initials={seat.friend ? <PersonInitials n={seat.friend.name} /> : null} />
        )}
      </button>
      <span className="min-w-0 flex-1 md:flex-none">
        <span className="mt-0 block truncate text-[13px] font-medium text-[color:var(--fg)] md:mt-[6px]">
          <PersonName n={name} />
          {seat.table?.mark && <small className="ml-[6px] font-mono text-[9.5px] text-[color:var(--fg-faint)]">{ruleZeroCopy.log.fromTable}</small>}
        </span>
        {sub && !seat.won && <span className="block truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]"><PersonName n={sub} /></span>}
        {seat.won ? (
          <span className="block truncate font-mono text-[10.5px] text-[color:var(--fg)]">{copy.wonLine}</span>
        ) : seat.table ? null : seat.friend ? (
          // A friend has no label: their name is the name. Seated alone, the one thing left to name is the deck.
          !seat.deck && !seat.commander && (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => onOpen(e.currentTarget, true)}
              className="block cursor-pointer border-0 border-b border-dashed border-b-[color:var(--border-dashed)] bg-transparent p-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]"
            >
              {copy.whichDeck}
            </button>
          )
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
              className="h-[28px] min-w-0 flex-1 rounded-[6px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[6px] text-[16px] text-[color:var(--fg)] [@media(pointer:fine)]:md:text-[11px]"
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
          onClick={onWon}
          {...personAttrs({ "aria-label": copy.wonAria(name) }, [
            "flex h-[32px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid px-[12px] font-mono text-[11px] font-semibold " +
            "md:absolute md:right-[6px] md:top-[6px] md:h-[30px] md:w-[30px] md:p-0 " +
            (seat.won
              ? "border-[color:var(--fg)] bg-[color:var(--fg)] text-[color:var(--bg)]"
              : "border-[color:var(--border-strong)] bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] text-[color:var(--fg)]"),
          ].join(" "))}
        >
          <span className="md:hidden">{copy.wonPill}</span>
          <span className="hidden md:block"><TrophyIcon /></span>
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onClear}
        {...personAttrs({ "aria-label": copy.clear(name) }, "flex h-[28px] w-[28px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid border-[color:var(--border)] bg-transparent text-[12px] text-[color:var(--fg-muted)] md:absolute md:left-[6px] md:top-[6px] md:h-[22px] md:w-[22px] md:bg-[color-mix(in_srgb,var(--bg)_80%,transparent)]")}
      >
        ✕
      </button>
    </li>
  );
}

/** "Sam", "Sam and Jo", "Sam, Jo and Lee". */
const names = (list: ReadonlyArray<string | ThirdPartyName>): PersonParts =>
  list.length < 2 ? personText`${list[0] ?? ""}` : personText`${joinNames(list.slice(0, -1))} and ${list[list.length - 1]}`;

export function GameSeats({
  you, podSize, result, seats, busy, held, onSeat, onPod, onPodPending, onClear, onWon, onLabel,
}: {
  you: YouSeat;
  podSize: number;
  result: "win" | "loss" | "draw" | null;
  seats: Seat[];
  busy: boolean;
  /** A pod size below the filled seats was pressed: say why it did not move. */
  held: boolean;
  /** `at` is the seat key being changed, or null for a new seat. */
  onSeat: (at: string | null, pick: SeatPick) => void;
  /** A Seat a pod press: the pod size to set and the friends to seat, in order. Answers the keys of the seats it made. */
  onPod: (podSize: number, add: SeatFriend[]) => string[];
  /** The pod read is in flight: the form holds every edit and Save until it lands, so the fill is planned against what stands. */
  onPodPending: (pending: boolean) => void;
  onClear: (key: string) => void;
  onWon: (key: string) => void;
  onLabel: (key: string, text: string) => void;
}) {
  // Which seat the open picker is for (null: a new seat), and the control it hangs from.
  const [picking, setPicking] = useState<{ at: string | null; anchor: HTMLElement; openAt: SeatFriend | null } | null>(null);
  // The reader's pods, for the chips: names and sizes only, read once when the row mounts.
  const [pods, setPods] = useState<PickerPod[]>([]);
  useEffect(() => {
    let live = true;
    listPickerPodsAction().then((list) => { if (live) setPods(list); }).catch(() => {});
    return () => { live = false; };
  }, []);
  // The seats each chip's press made (key and friend), by pod: a chip undoes only those, and only while the seat still
  // holds that friend. A seat cleared and filled again by hand, or by another pod, is no longer its.
  const [podFilled, setPodFilled] = useState<Record<string, { key: string; friend: string }[]>>({});
  const reading = useRef(false);
  const onPodPendingRef = useRef(onPodPending);
  useEffect(() => { onPodPendingRef.current = onPodPending; });
  // A pod read that lands after the row is gone (the form was cancelled) must not seat anyone into the next one.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // A read still in flight is abandoned with the row: release the form's hold now, because the read's own
      // release is skipped once the row is gone, and it must not clear the hold of a form opened after this one.
      if (reading.current) onPodPendingRef.current(false);
    };
  }, []);
  const [podNote, setPodNote] = useState<string | PersonParts | null>(null);
  const room = hasRoom(podSize, seats.length);
  const lost = result === "loss" && seats.length > 0;
  const addRef = useRef<HTMLButtonElement>(null);

  const section = useRef<HTMLElement>(null);
  // Set when a pick closes a picker whose opener may now be gone: the opener, and the seat it was changing (null: a new one).
  const refocus = useRef<{ opener: HTMLElement; at: string | null } | null>(null);

  function pick(choice: SeatPick) {
    if (!picking) return;
    refocus.current = { opener: picking.anchor, at: picking.at };
    onSeat(picking.at, choice);
    setPicking(null);
  }

  const ownSeats = (pod: PickerPod) =>
    (podFilled[pod.id] ?? []).filter((o) => seats.some((s) => s.key === o.key && s.friend?.publicId === o.friend));
  const chipOn = (pod: PickerPod) => ownSeats(pod).length > 0;
  async function seatPod(pod: PickerPod) {
    if (reading.current) return;
    setPodNote(null);
    if (chipOn(pod)) {
      // Pressed again: take back the seats it filled.
      for (const o of ownSeats(pod)) onClear(o.key);
      setPodFilled((held) => Object.fromEntries(Object.entries(held).filter(([id]) => id !== pod.id)));
      return;
    }
    reading.current = true;
    onPodPending(true);
    try {
      const members = await listPodSeatsAction(pod.id);
      if (!mounted.current) return;
      const fill = podFill(seats, pod.memberCount, members.map((m) => ({ publicId: m.publicId, name: m.displayName })));
      const keys = onPod(fill.podSize, fill.add);
      setPodFilled((held) => ({ ...held, [pod.id]: fill.add.map((f, i) => ({ key: keys[i], friend: f.publicId })) }));
      if (fill.unseated.length > 0) setPodNote(copy.podLeftOut(names(fill.unseated)));
    } catch {
      if (mounted.current) setPodNote(copy.podFailed);
    } finally {
      if (mounted.current) {
        reading.current = false;
        onPodPending(false);
      }
    }
  }

  // Clearing a seat removes the ✕ that held focus, and always makes room for Add opponent: focus goes there.
  const clearedFocus = useRef(false);
  useEffect(() => {
    if (!clearedFocus.current) return;
    clearedFocus.current = false;
    addRef.current?.focus();
  }, [seats]);

  // Filling the last seat removes Add opponent in the same commit that closes the picker, so the dialog's own
  // focus return lands on a detached button and focus drops to the page. A seat that was changed takes focus back;
  // a new one is the last.
  useEffect(() => {
    const held = refocus.current;
    if (!held || picking) return;
    refocus.current = null;
    if (held.opener.isConnected) return;
    const arts = Array.from(section.current?.querySelectorAll<HTMLElement>("[data-seat-art]") ?? []);
    (arts.find((a) => held.at !== null && a.dataset.seatKey === held.at) ?? arts[arts.length - 1])?.focus();
  }, [picking, seats]);

  return (
    <section ref={section} aria-labelledby="game-seats-label" className="mb-[18px] mt-[16px] border-0 border-t border-solid border-t-[color:var(--border)] pt-[14px] md:mt-[2px] md:pt-[16px]">
      <div className="mb-[10px] flex flex-wrap items-baseline justify-between gap-x-[12px] gap-y-[8px]">
        <span id="game-seats-label" className="block font-mono text-[9.5px] uppercase tracking-[0.14em] text-fg-faint md:text-[10px]">
          {copy.label}
        </span>
        {pods.length > 0 && (
          // On the section's own line at 1300, above the seats at 390: one element, wrapped by the row.
          <span role="group" aria-label={copy.seatPod} className="order-3 flex w-full flex-wrap items-center gap-[6px] md:order-none md:w-auto md:flex-1 md:justify-end">
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.seatPod}</span>
            {pods.map((pod) => (
              <button
                key={pod.id}
                type="button"
                disabled={busy}
                aria-pressed={chipOn(pod)}
                onClick={() => void seatPod(pod)}
                className={
                  "h-[28px] max-w-[180px] cursor-pointer truncate rounded-full border border-solid px-[12px] text-[12px] " +
                  (chipOn(pod)
                    ? "border-[color:var(--fg)] bg-[color:var(--fg)] text-[color:var(--bg)]"
                    : "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg)]")
                }
              >
                <PersonName n={pod.name} />
              </button>
            ))}
          </span>
        )}
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
            onOpen={(anchor, deck) => setPicking({ at: s.key, anchor, openAt: deck ? s.friend : null })}
            onClear={() => { clearedFocus.current = true; onClear(s.key); }}
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
              onClick={(e) => setPicking({ at: null, anchor: e.currentTarget, openAt: null })}
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
      {podNote && <p role="status" className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-muted)]"><PersonText text={podNote} /></p>}
      {held && (
        <p role="status" className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.held(seats.length)}</p>
      )}
      {lost && (
        <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-muted)]">
          <span className="hidden md:inline">{copy.wonHint}</span>
          <span className="md:hidden">{copy.wonHintPhone}</span>
        </p>
      )}
      {picking && (
        <SeatPicker anchor={picking.anchor} onClose={() => setPicking(null)} onPick={pick} seated={seatedFriends(seats, picking.at)} openAt={picking.openAt} />
      )}
    </section>
  );
}
