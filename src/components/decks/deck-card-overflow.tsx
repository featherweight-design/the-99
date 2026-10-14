"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { refreshCopy } from "../../lib/copy/refresh";
import { RenameForm } from "./rename-form";
import { MoveMode } from "./deck-move-mode";
import { DeleteMode } from "./deck-delete-mode";
import { ANCHORED_PANEL_CLASS, useAnchoredPanel } from "../ui/anchored-panel";
import { DELETE_CONFIRM_WIDTH } from "../ui/delete-confirm";

/** The menu's own width; the delete pane takes `DELETE_CONFIRM_WIDTH`. */
const MENU_WIDTH = 186;
import { folderCopy } from "../../lib/copy/folders";
import { decksStatsCopy } from "../../lib/copy/decks-stats";

/** One menu row. The same geometry `DeckSortMenu` draws, which is the only
 *  menu the Decks frames specify. */
const ITEM =
  "flex h-[38px] w-full items-center border-x-0 border-b-0 border-t border-solid border-t-[color:var(--elevated)] px-[13px] text-left font-sans text-[13px] transition-colors hover:bg-[color:var(--elevated)]";

interface DeckCardOverflowProps {
  deckId: string;
  deckName: string;
  /** Cards in the deck. At zero there is nothing to diff, so the update entry
   *  is absent rather than disabled — #277 state 3. */
  built: number;
  /**
   * Where the menu is drawn. On a `tile` it sits on the art's top-right corner over the tile's
   * link and carries every row. In the deck page's `header` it is flowed beside Export, at the
   * header's own button size, and drops Update and Rename, since the header draws its own Update
   * button and rename pencil beside it. It carries Move (the deck page reads the shelves and
   * `useDeckShelfMove` holds the move and the create dialog) and Delete, and no Stats: the header
   * passes no `onAmong`, Stats being a list view.
   */
  placement: "tile" | "header";
  /** The Move row and its mode, with the list view that owns them. Absent, the row is too. */
  move?: DeckMove;
  /** Stats with this deck chosen (`LINEUP_ENABLED`): absent while the switch is off, and the row with it. */
  onAmong?: () => void;
}

/** What the Move row needs from the Decks list, which owns the shelves and the create dialog. */
export interface DeckMove {
  /** Every shelf this deck can be filed on, in the line's own order. */
  folders: readonly { id: string; name: string }[];
  /** The folder it is on now, or null for unfiled. */
  folderId: string | null;
  /**
   * THE LABEL IS THE RECEIPT (handoff decision 17). On All decks a move changes
   * nothing else on screen, so the row returning to the menu reading its new
   * shelf is the whole confirmation — no toast, and no new pattern.
   */
  folderName: string | null;
  /** Opens the route's create dialog — `New folder…` is the move list's last row. */
  onCreateFolder: () => void;
  /**
   * The view's one optimistic move for this deck. The grid, every count and the
   * announcement are the view's, so this panel only says where the deck went;
   * the deck's new shelf comes back down as `folderId` and `folderName` on the
   * press, and a refusal takes it back the same way.
   */
  onMove: (to: { id: string | null; name: string | null }) => void;
  /**
   * Whether this card stays on screen after a move — true on All decks, false on
   * a named shelf, where the deck leaves the grid and the view takes focus.
   */
  keepsFocus: boolean;
  /**
   * A create started from THIS card's move mode, once the route's dialog has
   * made the folder and filed the deck into it. That path never reaches the
   * handlers below — the move is performed by the dialog, not by the destination
   * list — so the panel is told directly, and closes exactly as it would have.
   * A `seq`, so a second create on the same card is a new instruction. Null for
   * every other card.
   */
  closeAfterCreate: { seq: number } | null;
}

/**
 * "⋯" overflow menu for a deck card.
 * Opens a popover with "Rename" and "Delete" actions.
 * Rendered as a `relative z-10` sibling to the absolute-inset Link overlay
 * so clicks here do NOT navigate.
 */
export function DeckCardOverflow({
  deckId,
  deckName,
  built,
  placement,
  move,
  onAmong,
}: DeckCardOverflowProps) {
  const header = placement === "header";
  const closeAfterCreate = move?.closeAfterCreate ?? null;
  const keepsFocus = move?.keepsFocus ?? true;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "rename" | "move" | "delete">("menu");
  // Raised by the delete pane while its action is in flight. The pane's own
  // guards die with the pane, and the ⋯ trigger sits OUTSIDE the panel and stays
  // reachable by Shift+Tab and by pointer: without this, toggling the panel
  // unmounts the pane mid-request, resets its guard, and a reopened menu can
  // submit the same delete again. `ShelfMenu` holds the same fact for the same
  // reason.
  const [busy, setBusy] = useState(false);
  /**
   * Viewport coordinates for the panel, fixed rather than `absolute`, clamped, flipped near the
   * fold and kept clear of the phone's tab bar: `useAnchoredPanel`, which was lifted out of this
   * file so the game log's delete confirm floats the same way. The delete pane is wider than the
   * menu (Hugh, 2026-09-27), so the width follows the mode and the panel is re-placed with it.
   */
  const { at, place, triggerRef: buttonRef, panelRef } = useAnchoredPanel({
    open,
    width: mode === "delete" ? DELETE_CONFIRM_WIDTH : MENU_WIDTH,
    remeasure: mode,
  });
  // Every deck card renders one of these, so the id has to be per-instance.
  const panelId = useId();

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!open) place();
    setOpen((o) => !o);
    setMode("menu");
  }

  function handleMove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMode("move");
  }

  function handleRename(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMode("rename");
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMode("delete");
  }

  // A ref, not state: the delete pane's cancel unmounts holding focus, and this
  // is a one-shot instruction to the DOM after a commit. Holding it in state
  // would mean setting state inside the effect that consumes it — the cascading
  // render this repo's lint rejects.
  const wantsDeleteRowFocus = useRef(false);
  const deleteRow = useRef<HTMLButtonElement>(null);
  // No override of its own: the view's optimistic list hands the new shelf down
  // on the press, and drops it again on a refusal.
  const shelfLabel = move?.folderName ?? folderCopy.shelves.unfiled;

  // The seq already acted on. A ref because this is a one-shot instruction
  // after a commit, and holding it in state would set state inside the effect
  // that reads it — the cascading render this repo's lint rejects.
  const closedSeq = useRef(closeAfterCreate?.seq ?? null);
  useEffect(() => {
    if (closeAfterCreate === null || closeAfterCreate.seq === closedSeq.current) return;
    const { seq } = closeAfterCreate;
    // EVERYTHING A FRAME LATER, and for one reason: the dialog that performed
    // this move is unmounting in the same commit, and its focus trap restores
    // focus to the control that opened it — a destination row that has gone with
    // the list, which lands focus on the body. Taking focus after that is the
    // only ordering that holds, and keeping the state with it means nothing is
    // set synchronously inside an effect.
    const frame = requestAnimationFrame(() => {
      // MARKED HERE, not in the effect body. Cleanup cancels an undelivered
      // frame, and an effect that re-ran before it fired — the parent's
      // callbacks are inline, so it does — would then see its own instruction as
      // already handled and drop it.
      closedSeq.current = seq;
      // Errata E21: the act is finished, so the panel goes. On All decks the ⋯
      // survives and takes focus; on a named shelf the deck has left the shelf
      // being viewed with the move, and the view's dialog rescue puts focus on
      // the shelf control.
      setOpen(false);
      setMode("menu");
      if (keepsFocus) buttonRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [buttonRef, closeAfterCreate, keepsFocus]);

  useEffect(() => {
    if (mode !== "menu" || !wantsDeleteRowFocus.current) return;
    wantsDeleteRowFocus.current = false;
    deleteRow.current?.focus();
  }, [mode]);

  function handleClose() {
    if (busy) return;
    setOpen(false);
    setMode("menu");
    buttonRef.current?.focus();
  }

  return (
    // z-10 so this sits above the absolute-inset Link overlay. Placed against
    // the art header's top-right corner rather than flowed, because the tile's
    // body is a grid of figures and this is not one of them.
    // In the header it is flowed, so it is only the anchor for the panel's absolute fallback.
    <div className={header ? "relative" : "absolute top-[8px] right-[8px] z-10 sm:top-[10px] sm:right-[10px]"}>
      {/* §Deck card — "⋯" overflow button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        // Names the deck it acts on. "Deck options" said the same thing for
        // every tile on the page, so a reader tabbing the grid heard one label
        // repeated as many times as there were decks.
        aria-label={refreshCopy.decks.menu.trigger(deckName)}
        // No aria-haspopup at all. Every value it takes names a pattern this
        // panel does not implement — ARIA defines "true" as equivalent to
        // "menu", and a menu means role="menu" with menuitem children and
        // arrow-key navigation, which `sort-menu` and `account-menu` provide
        // and this does not. Its second mode is a rename form, so it is not a
        // menu under any reading. aria-expanded plus aria-controls state the
        // relationship truthfully and claim nothing further.
        aria-expanded={open}
        // Omitted while closed: the panel is unmounted at rest, and a reference
        // to an absent id is worse than no reference at all.
        aria-controls={open ? panelId : undefined}
        // On a tile: a 44px target on a phone and the unchanged 26px control at
        // desktop, with the 26px plate drawn inside either one. In the header the
        // button is its own plate, at the header's sizes (see the header branch).
        // On the tile it was bare on a phone by ruling — "the
        // drawn plate is desktop-only" — and what made that safe was the top
        // scrim veiling the crop under it. That scrim is gone, so this glyph
        // would be `var(--fg)` on an unmodified crop: the one accessibility
        // exposure in the round, and it is fixed in the same change that creates
        // it rather than a PR later.
        //
        // Hit area unchanged, drawn box now matching desktop, touch floor
        // untouched. The open state is a class, not an inline style: an inline
        // background outranks the hover: utilities beside it and the control
        // stops highlighting the moment the panel is open.
        className={
          header
            ? // The header's own button: the phone row's 44px target, and Export's 32px at desktop.
              `flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-[7px] border border-[color:var(--border-strong)] p-0 font-mono text-[13px] tracking-[1px] transition-colors md:h-[32px] md:w-[32px] md:rounded-[8px] ${
                open ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : "bg-transparent text-[color:var(--fg-body)] hover:bg-[color:var(--elevated)]"
              }`
            : "flex h-[44px] w-[44px] cursor-pointer items-center justify-center bg-transparent p-0 sm:h-[26px] sm:w-[26px]"
        }
      >
        {/* THE PLATE, as `full-card-trigger.tsx` draws it: opaque `var(--bg)`
            under one hairline at radius 7. Opaque rather than measured per
            theme — ink on `--bg` is the page's own body contrast — which is what
            lets the band underneath carry no scrim at all. Decision 3's
            treatment, now at both widths. In the header the button is its own
            plate, so the glyph sits in it bare. */}
        {header ? "…" : (
        <span
          className={`flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border font-mono text-[13px] tracking-[1px] transition-colors sm:h-full sm:w-full sm:text-[11px] ${
            open
              ? "border-[color:var(--border-strong)] bg-[color:var(--elevated)] text-[color:var(--fg)]"
              : "border-[color:var(--border-strong)] bg-[color:var(--bg)] text-[color:var(--fg-body)] sm:text-[color:var(--fg-body)]"
          }`}
        >
          …
        </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          ref={panelRef}
          // `marginTop: 0` because the gap moved into `place()`: the classes below
          // still carry `mt-[6px] sm:mt-[4px]` for the absolute fallback, and a
          // flipped panel must not be pushed back down into its own trigger.
          // The width is inline because it follows the mode: the delete pane is wider.
          style={{
            width: mode === "delete" ? DELETE_CONFIRM_WIDTH : MENU_WIDTH,
            ...(at ? { position: "fixed", top: at.top, left: at.left, marginTop: 0 } : {}),
          }}
          className={`absolute right-0 top-full mt-[6px] sm:mt-[4px] ${ANCHORED_PANEL_CLASS}`}
          // Propagation only: the deck-card Link overlay beneath fires on
          // bubbling, so stopping the bubble is the whole fix. preventDefault
          // here would also cancel the browser default for clicks inside the
          // panel, which is what cmd/ctrl- and middle-clicking the Update link
          // rely on to open a new tab.
          onClick={(e) => e.stopPropagation()}
        >
          {mode === "menu" ? (
            // Flush 38px rows divided by hairlines, not inset pills: the panel
            // clips its own corners, so `first:border-t-0` is the whole
            // separator rule and it survives the Update row being absent.
            <div className="flex flex-col">
              {!header && built > 0 && (
                <Link
                  href={`/decks/${deckId}/import`}
                  aria-label={deckImportCopy.update.entryAria(deckName)}
                  className={`${ITEM} first:border-t-0 text-[color:var(--fg)] no-underline`}
                >
                  {refreshCopy.decks.menu.updateFromList}
                </Link>
              )}
              {!header ? (
              <button
                type="button"
                onClick={handleRename}
                // bg/border as utilities, not inline: an inline background
                // outranks hover: and the row never highlights.
                className={`${ITEM} first:border-t-0 cursor-pointer bg-transparent text-[color:var(--fg)]`}
              >
                {refreshCopy.decks.menu.rename}
              </button>
              ) : null}
              {/* Between Rename and Delete on a tile, whether or not the Update row
                  above rendered — it is gated on `built > 0`, so the shipped menu is
                  two rows on a brew (errata E9). In the header there is no Rename, so
                  it is the first row and takes `first:border-t-0` like the others. */}
              {move ? (
              <button
                type="button"
                onClick={handleMove}
                aria-label={folderCopy.move.rowAria(deckName, shelfLabel)}
                // ITEM without its `transition-colors`: this round draws no
                // motion, and an easing hover is motion. The shipped rows keep
                // theirs — changing those is a different round's decision.
                className={`${ITEM.replace(" transition-colors", "")} first:border-t-0 cursor-pointer bg-transparent text-[color:var(--fg)]`}
              >
                <span className="truncate" title={shelfLabel}>
                  {folderCopy.move.row(shelfLabel)}
                </span>
              </button>
              ) : null}
              <button
                ref={deleteRow}
                type="button"
                onClick={handleDelete}
                className={`${ITEM} first:border-t-0 cursor-pointer bg-transparent text-[color:var(--danger)]`}
              >
                {refreshCopy.decks.menu.delete}
              </button>
              {/* Appended after the shipped rows (handoff G6). Focus goes back to this card's trigger first, so a
                  Stats read that fails leaves it there with Tiles; one that lands moves it to the Stats card. */}
              {onAmong ? (
                <button
                  type="button"
                  onClick={() => { handleClose(); onAmong(); }}
                  className={`${ITEM.replace(" transition-colors", "")} cursor-pointer bg-transparent text-[color:var(--fg)]`}
                >
                  {decksStatsCopy.menu.among}
                </button>
              ) : null}
            </div>
          ) : mode === "move" && move ? (
            <MoveMode
              deckName={deckName}
              folders={move.folders}
              currentId={move.folderId}
              onCreate={move.onCreateFolder}
              onMove={(next) => {
                // THE MENU CLOSES, ON THE PRESS. Waiting for the action left
                // the panel open over a deck that had not moved for a round
                // trip (Hugh's walk, H24); the view moves it optimistically and
                // takes it back if the server refuses.
                //
                // Design made the Move row the receipt and had the panel return
                // to it; Hugh overruled that on 2026-09-13 —
                // the act is finished, so the panel that performed it goes
                // (errata E21). The receipt is the announcement, plus the tile
                // leaving the grid on a named shelf.
                //
                // `handleClose` returns focus to this card's own ⋯ trigger,
                // which survives on All decks; on a named shelf the card leaves
                // and the view focuses the shelf control instead.
                if (keepsFocus) handleClose();
                else setOpen(false);
                // The list, its counts and both denominators live in the view,
                // and so does the move that changes them.
                move.onMove(next);
              }}
            />
          ) : mode === "delete" ? (
            <DeleteMode
              deckId={deckId}
              deckName={deckName}
              // Back to the menu, not closed: a reader who declines has not
              // finished with the card, and the folder pane's own cancel does
              // the same. Focus is returned EXPLICITLY — the pane unmounts with
              // focus on its own cancel button, and nothing puts it anywhere
              // afterwards, so without this the reader is dropped on the body.
              // The Delete row, because that is where they pressed.
              onCancel={() => {
                wantsDeleteRowFocus.current = true;
                setMode("menu");
              }}
              onBusy={setBusy}
            />
          ) : (
            <div className="p-[12px]">
              <RenameForm
                deckId={deckId}
                currentName={deckName}
                onDone={handleClose}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
