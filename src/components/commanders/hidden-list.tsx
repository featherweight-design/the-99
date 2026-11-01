"use client";

// The Hidden tab's list (design_handoff_the99_hide_commander README §3, the Hidden board's states 4, 5, 6 and 12).
//
// The row is Help me choose's result row in SHAPE only (READINESS Y5: `choose-row.tsx` is bound to its fill run
// and opens the create page): the 40px card face, the name and pips, `--surface-rail`, with *Hidden Oct 31* under
// the name and **Unhide** where the figures were. The row opens the commander's page, or a built commander's deck.
//
// OPTIMISTIC, and it holds its own rows. Unhide turns the row into the shared Undo row at once, saying where it
// went; Undo hides it again. The unhide's action drops the reader's list cache, and a refresh of this route would
// hand back a list without the row, so the rows are seeded once from the server and kept: an Undo row stands until
// the reader leaves the tab (the board's "gone when the reader leaves").
//
// Refusals, as the board draws them. Unhide refused: the row stays as it was, with the shared toast and Try again.
// The Undo of an unhide refused: the button goes and one line under the row says where to hide it from instead.
// Only the newest press on a row may put anything back; server actions run one at a time per client, so the writes
// themselves land in the order they were pressed.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { hideCommanderAction, unhideCommanderAction } from "../../app/commanders/actions";
import { hiddenDay, type HiddenRow } from "../../lib/commanders/hidden-row";
import { hiddenListCopy as copy } from "../../lib/copy/commanders-hidden";
import { hideCommanderCopy } from "../../lib/copy/commander-explained";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { CommanderThumb } from "../ui/commander-thumb";
import { useHydrated } from "../ui/hydrated-art";
import { TOUCH_HIT } from "../ui/touch-hit";
import { UndoShell } from "../ui/undo-row";
import { ZeroState } from "../ui/zero-state";
import { IdentityPips } from "./commander-art";
import { COMMANDER_UNDO_SHELL, commanderUndoRefusedLine } from "./commander-undo-row";
import { announceCommanderCountsStale } from "./counts-event";
import { EyeOff } from "./eye-off";
import { RefusalToast } from "./hide-commander";

/** `hidden`: drawn as the row. `back`: unhidden, the Undo row stands. `refused`: unhidden, its Undo refused. */
export type HiddenRowState = "hidden" | "back" | "refused";

type Focus = "unhide" | "undo" | "line";

/** A new press on `id`: answers whether it is still the newest, which alone may act on its answer. */
function bump(tickets: Map<string, number>, id: string): () => boolean {
  const ticket = (tickets.get(id) ?? 0) + 1;
  tickets.set(id, ticket);
  return () => tickets.get(id) === ticket;
}

export function HiddenList({ rows: served }: { rows: HiddenRow[] }) {
  // Seeded once: see the head of the file.
  const [rows] = useState(served);
  const [states, setStates] = useState<ReadonlyMap<string, HiddenRowState>>(() => new Map());
  const [refusal, setRefusal] = useState<{ row: HiddenRow; text: string } | null>(null);
  const tickets = useRef(new Map<string, number>());
  const [focusTo, setFocusTo] = useState<{ id: string; kind: Focus } | null>(null);
  const controls = useRef(new Map<string, HTMLElement>());
  // The server's draw is UTC; once hydrated, the reader's own day.
  const timeZone = useHydrated() ? undefined : "UTC";

  const register = useCallback(
    (kind: Focus, id: string) => (el: HTMLElement | null) => {
      const key = `${kind}:${id}`;
      if (el) controls.current.set(key, el);
      else controls.current.delete(key);
    },
    [],
  );

  // The pressed control is replaced by the one the press reveals, so focus moves to it, without scrolling.
  useEffect(() => {
    if (focusTo) controls.current.get(`${focusTo.kind}:${focusTo.id}`)?.focus({ preventScroll: true });
  }, [focusTo]);

  const set = useCallback((id: string, state: HiddenRowState) => {
    setStates((m) => new Map(m).set(id, state));
  }, []);

  const unhide = useCallback(
    (row: HiddenRow) => {
      const latest = bump(tickets.current, row.oracleId);
      set(row.oracleId, "back");
      setRefusal(null);
      setFocusTo({ id: row.oracleId, kind: "undo" });
      const refuse = () => {
        if (!latest()) return;
        set(row.oracleId, "hidden");
        setFocusTo({ id: row.oracleId, kind: "unhide" });
        setRefusal({ row, text: copy.unhideRefused(row.name) });
      };
      unhideCommanderAction(row.oracleId).then((ok) => {
        if (!ok) return refuse();
        if (latest()) announceCommanderCountsStale();
      }, refuse);
    },
    [set],
  );

  const undo = useCallback(
    (row: HiddenRow) => {
      const latest = bump(tickets.current, row.oracleId);
      set(row.oracleId, "hidden");
      setFocusTo({ id: row.oracleId, kind: "unhide" });
      const refuse = () => {
        if (!latest()) return;
        set(row.oracleId, "refused");
        setFocusTo({ id: row.oracleId, kind: "line" });
      };
      hideCommanderAction(row.oracleId).then((ok) => {
        if (!ok) return refuse();
        if (latest()) announceCommanderCountsStale();
      }, refuse);
    },
    [set],
  );

  if (rows.length === 0) return <HiddenEmpty />;

  const standing = rows.filter((r) => (states.get(r.oracleId) ?? "hidden") === "hidden").length;
  return (
    <>
      {/* Every row unhidden: there is no figure left to state, and the Undo rows below say what happened. */}
      {standing > 0 ? (
        <p
          data-testid="hidden-count"
          className="m-0 mt-[12px] sm:mt-0 p-[14px_16px_13px] sm:p-[14px_34px_13px] font-mono text-[12px] text-[color:var(--fg-muted)] border-0 border-b border-b-[color:var(--border)] border-solid border-[color:var(--border)]"
        >
          {copy.count(standing)}
        </p>
      ) : null}
      <ul className="m-0 list-none flex flex-col gap-[8px] p-[12px_14px] sm:p-[16px_34px_34px] sm:max-w-[788px]">
        {rows.map((row) => {
          const state = states.get(row.oracleId) ?? "hidden";
          return (
            <li key={row.oracleId} data-hidden-row={row.oracleId}>
              {state === "hidden" ? (
                <Row
                  row={row}
                  day={hiddenDay(new Date(row.hiddenAt), timeZone)}
                  onUnhide={() => unhide(row)}
                  unhideRef={register("unhide", row.oracleId)}
                />
              ) : (
                <UndoShell
                  marks={{ "data-commander-undo-row": "" }}
                  shell={COMMANDER_UNDO_SHELL}
                  label={copy.undoRow.label(row.name, row.lane)}
                  action={addPanelCopy.undo.action}
                  actionAria={copy.undoRow.actionAria(row.name)}
                  onUndo={() => undo(row)}
                  error={state === "refused" ? copy.undoRow.refused(row.lane) : null}
                  undoRef={register("undo", row.oracleId)}
                  frameRef={register("line", row.oracleId)}
                  errorLine={commanderUndoRefusedLine}
                />
              )}
            </li>
          );
        })}
      </ul>
      {refusal ? (
        <RefusalToast
          key={refusal.text}
          title={refusal.text}
          onDone={() => setRefusal(null)}
          onRetry={() => unhide(refusal.row)}
        />
      ) : null}
    </>
  );
}

/** One hidden commander: the board's `.hrow`. The name is the row's press, stretched over the whole row; Unhide
    sits above it (`z-[2]`), the row's only other control. */
function Row({
  row,
  day,
  onUnhide,
  unhideRef,
}: {
  row: HiddenRow;
  day: string;
  onUnhide: () => void;
  unhideRef: (el: HTMLElement | null) => void;
}) {
  const nameClass =
    "min-w-0 truncate font-display font-semibold text-[14px] sm:text-[16px] text-[color:var(--fg)] no-underline";
  const built = row.href?.startsWith("/decks/") ?? false;
  return (
    <div
      className={[
        "relative grid items-center grid-cols-[40px_minmax(0,1fr)_auto] min-h-[44px]",
        "gap-x-[11px] p-[10px_6px_10px_12px] rounded-[10px]",
        "sm:gap-x-[16px] sm:p-[12px_10px_12px_15px] sm:rounded-[11px]",
        "border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)]",
      ].join(" ")}
    >
      <CommanderThumb imageUri={row.imageUri} colorIdentity={row.colorIdentity} size="result" lazy />
      <div className="min-w-0">
        <div className="flex items-center gap-[8px] min-w-0">
          {row.href ? (
            <Link
              href={row.href}
              aria-label={built ? copy.openDeck(row.name) : undefined}
              data-testid="hidden-row-open"
              className={`${nameClass} after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]`}
            >
              {row.name}
            </Link>
          ) : (
            <span className={nameClass}>{row.name}</span>
          )}
          <IdentityPips colorIdentity={row.colorIdentity} size={9} gap={4} />
        </div>
        <p className="m-0 mt-[5px] font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.hiddenOn(day)}</p>
      </div>
      <button
        ref={unhideRef}
        type="button"
        onClick={onUnhide}
        aria-label={hideCommanderCopy.unhideAria(row.name)}
        // The board's `.tb`: the builder's accent text button, 44px, 8px in, above the stretched link.
        className={`relative z-[2] flex-none inline-flex items-center min-h-[44px] px-[8px] ${TOUCH_HIT} bg-transparent border-0 cursor-pointer font-sans text-[12.5px] font-semibold leading-[1.4] text-accent-text hover:text-accent-hover transition-colors`}
      >
        <span className="border-0 border-b border-b-accent-shadow border-solid border-accent-shadow">
          {hideCommanderCopy.unhide}
        </span>
      </button>
    </div>
  );
}

/** State 5: the shared zero state, its sentence drawing the glyph it names. No button: the tabs are the way out. */
function HiddenEmpty() {
  return (
    <>
      {/* The phone's header draws no rule of its own; the board closes it with one 12px down. */}
      <div aria-hidden className="h-[12px] sm:hidden border-0 border-b border-b-[color:var(--border)] border-solid border-[color:var(--border)]" />
      <ZeroState
        heading={copy.empty.heading}
        body={
          <>
            {copy.empty.before}
            <span className="inline-flex align-[-3px] mx-[2px] text-[color:var(--fg-faint)]">
              <EyeOff size={15} />
              <span className="sr-only">{copy.empty.glyph}</span>
            </span>
            {copy.empty.after}
          </>
        }
      />
    </>
  );
}
