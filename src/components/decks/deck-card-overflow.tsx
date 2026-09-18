"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { refreshCopy } from "../../lib/copy/refresh";
import { RenameForm } from "./rename-form";
import { MoveMode } from "./deck-move-mode";
import { DeleteMode } from "./deck-delete-mode";
import { folderCopy } from "../../lib/copy/folders";

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
  /** The route's own live region, which outlives this panel's mode switch. */
  say: (announcement: string) => void;
  /**
   * Refreshes the route after a move — the grid and every count are the view's —
   * and says whether the move was refused, because a refusal can mean the deck
   * is gone and this card with it.
   */
  onMoved: (result: { refused: boolean; threw?: boolean }) => void;
  /**
   * Whether this card stays on screen after a move — true on All decks, false on
   * a named shelf, where the deck leaves the grid and the view takes focus.
   */
  keepsFocus: boolean;
  /**
   * The outcome of a create started from THIS card's move mode, once the route's
   * dialog has made the folder and tried to file the deck into it. That path
   * never reaches the handlers below — the move is performed by the dialog, not
   * by the destination list — so the panel is told directly, and acts exactly as
   * it would have: closing on a move that landed, returning to its menu on one
   * that did not. `seq` rather than a boolean alone, so a second create on the
   * same card is a new instruction. Null for every other card.
   */
  closeAfterCreate: { seq: number; filed: boolean } | null;
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
  folders,
  folderId,
  folderName,
  onCreateFolder,
  say,
  onMoved,
  keepsFocus,
  closeAfterCreate,
}: DeckCardOverflowProps) {
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
   * Viewport coordinates for the panel, and the reason it is not simply
   * `absolute`.
   *
   * This panel lives inside `data-deck-art`, which is `overflow-hidden` and
   * `h-[168px]` at the three-column band (roughly 640–1062px, where each cell
   * falls under the tile's own `@min-[330px]` query). An absolutely positioned
   * popover inside a clipping ancestor is CUT BY IT — and the menu's last row is
   * `Delete`, so at that band the reader could see 13px of it and reach none.
   * Confirmed on screen 2026-09-16. A fixed box escapes every clipping ancestor;
   * `shelf-menu.tsx` records the same trap and the same fix.
   *
   * Null only before the first open. `place()` runs in the same batch as
   * `setOpen`, so there is no paint with `at === null` and the absolute classes
   * below are a fallback for nothing but a `buttonRef` that has gone — they are
   * kept because a fixed box with no coordinates would draw at the viewport's
   * top-left, which is worse than a clipped one.
   */
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Every deck card renders one of these, so the id has to be per-instance.
  const panelId = useId();

  /**
   * CLAMPED TO THE VIEWPORT, the same way `shelf-menu.tsx` clamps: right-aligning
   * to the trigger alone puts the panel's left edge off-screen where the trigger
   * sits near the left margin, so it is placed FROM the left and pushed back
   * inside the margin when there is not room.
   *
   * `top` is the trigger's bottom, NOT bottom + 6: the panel keeps its own
   * `mt-[6px] sm:mt-[4px]`, and a fixed element's margin still offsets it. Adding
   * the gap here as well would double it, and would flatten the 6/4 step the
   * shipped panel draws between phone and desktop.
   */
  function place() {
    const box = buttonRef.current?.getBoundingClientRect();
    if (!box) return;
    const width = 186;
    const margin = 8;
    // The gap the shipped panel draws under its trigger, as a number rather than
    // the `mt-[6px] sm:mt-[4px]` classes: a flipped panel needs it ABOVE, and a
    // margin-top would push it down into the trigger instead. 640 is Tailwind's
    // `sm`.
    const gap = window.innerWidth >= 640 ? 4 : 6;
    const height = panelRef.current?.offsetHeight ?? 0;

    const wanted = box.right - width;
    const left = Math.min(Math.max(margin, wanted), window.innerWidth - width - margin);

    // The tab bar is FIXED at z-40 across the bottom below `md`, and this panel
    // does not outrank it: `position: fixed` escapes a clipping ancestor but NOT
    // a stacking context, and the tile's own `relative z-10` wrapper is one — so
    // the panel's `z-50` is resolved inside it and the bar paints over anything
    // that reaches under it. Treat those pixels as unavailable rather than
    // raising z-indexes across two components.
    const tabbar =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tabbar-h")) || 0;
    const floor = window.innerHeight - (window.innerWidth < 768 ? tabbar : 0);

    // FLIP WHEN THERE IS NO ROOM BELOW. A fixed box cannot be scrolled into view
    // — scrolling re-runs this and carries the panel along with its trigger — so
    // a panel hanging past the fold is not merely awkward, it is UNREACHABLE. A
    // tile in the grid's last visible row is the common case, not the edge one:
    // measured at 900x900, the four-row menu drew 821→975 and both `Move` and
    // `Delete` were below the fold with no scroll that would reveal them.
    //
    // `height` is 0 on the very first placement, before the panel has rendered;
    // the layout effect below re-places once it can be measured, and again
    // whenever the mode changes the panel's height.
    const below = box.bottom + gap;
    const fitsBelow = height === 0 || below + height + margin <= floor;
    const above = box.top - gap - height;
    const top = fitsBelow
      ? below
      : above >= margin
        ? above
        : // Neither side has room — a viewport shorter than the panel. Pin to the
          // top margin so the panel's HEAD is readable and the reader can at
          // least see what they opened.
          margin;

    setAt({ top, left });
  }

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

  // Optimistic, because the tile's own menu is the only place the fact is
  // stated: the server revalidates `/decks` behind this, and re-reading before
  // painting would leave the row naming the old shelf for a round trip.
  const [movedTo, setMovedTo] = useState<
    { id: string | null; name: string | null; from: string | null } | null
  >(null);
  // A ref, not state: this is a one-shot instruction to the DOM after a commit,
  // and holding it in state would mean setting state inside the effect that
  // consumes it — the cascading render this repo's lint rejects.
  const wantsMoveRowFocus = useRef(false);
  const moveRow = useRef<HTMLButtonElement>(null);
  // The same one-shot instruction for the delete pane's cancel, which unmounts
  // holding focus. Its own ref rather than a shared flag, because the two modes
  // return to different rows.
  const wantsDeleteRowFocus = useRef(false);
  const deleteRow = useRef<HTMLButtonElement>(null);
  // The optimistic receipt EXPIRES ON THE FIRST CHANGED SERVER PROP, whether it
  // agrees or not. Clearing only on agreement left it standing forever when the
  // destination was deleted or the deck moved elsewhere before the refresh
  // landed: the id never matched, and the menu went on printing a shelf that
  // was no longer true. `from` is what the server said when the override was
  // made, so any change to that is the answer arriving.
  if (movedTo && movedTo.from !== folderId) setMovedTo(null);
  const shelf = movedTo ?? { id: folderId, name: folderName };
  const shelfLabel = shelf.name ?? folderCopy.shelves.unfiled;

  // The seq already acted on. A ref because this is a one-shot instruction
  // after a commit, and holding it in state would set state inside the effect
  // that reads it — the cascading render this repo's lint rejects.
  const closedSeq = useRef(closeAfterCreate?.seq ?? null);
  useEffect(() => {
    if (closeAfterCreate === null || closeAfterCreate.seq === closedSeq.current) return;
    const { seq, filed } = closeAfterCreate;
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
      if (!filed) {
        // M6, the answer `onRefused` gives: nothing happened, so the panel
        // returns to the row naming the shelf this deck is still on, rather than
        // to a destination list left behind a dismissed dialog. There is no
        // optimistic override to clear — this path never set one, because the
        // move was performed by the dialog.
        // The flag, not a direct focus call: the row does not exist until the
        // mode change commits, and the effect below is what waits for that.
        wantsMoveRowFocus.current = true;
        setMode("menu");
        return;
      }
      // Errata E21: the act is finished, so the panel goes. On All decks the ⋯
      // survives and takes focus; on a named shelf the deck has left the shelf
      // being viewed and this card goes with it, so focus is handed to the view,
      // which knows to put it on the shelf control.
      setOpen(false);
      setMode("menu");
      if (keepsFocus) buttonRef.current?.focus();
      else onMoved({ refused: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [closeAfterCreate, keepsFocus, onMoved]);

  useEffect(() => {
    if (mode !== "menu" || !wantsMoveRowFocus.current) return;
    wantsMoveRowFocus.current = false;
    moveRow.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (mode !== "menu" || !wantsDeleteRowFocus.current) return;
    wantsDeleteRowFocus.current = false;
    deleteRow.current?.focus();
  }, [mode]);

  // A fixed box does not travel with the page, so its coordinates go stale the
  // moment anything moves. Capture phase, because the scroll that matters may be
  // a container's rather than the window's.
  useEffect(() => {
    if (!open) return;
    // Resize only. Scrolling and any other movement of the anchor are covered by
    // the frame loop below, which catches what a scroll listener cannot.
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  // Re-place once the panel can be MEASURED, and then whenever anything moves it.
  //
  // A layout effect rather than an effect: this runs before paint, so a panel
  // that has to flip never draws once in the wrong place.
  //
  // THREE things move it, and a scroll listener sees only one:
  //  - the panel RESIZES without opening or changing mode — the delete pane grows
  //    a `role="alert"` line when the action fails, which can push a pane that
  //    fitted below its trigger past the fold. `ResizeObserver`.
  //  - the page SCROLLS, which a fixed box does not follow.
  //  - the ANCHOR MOVES UNDER A STILL PAGE. Changing the deck sort or filter
  //    reorders `shown.map(… key={deck.id})`, so this very instance slides to a
  //    new row with no scroll and no resize, and the panel would sit at the old
  //    coordinates pointing at another deck's tile.
  //
  // A frame loop covers the last two together, and costs a rect read per frame
  // only while a menu is open.
  useLayoutEffect(() => {
    const node = panelRef.current;
    if (!open || !node) return;
    place();
    const observer = new ResizeObserver(place);
    observer.observe(node);

    let frame = 0;
    let previous = "";
    const track = () => {
      const box = buttonRef.current?.getBoundingClientRect();
      if (box) {
        const key = `${Math.round(box.top)}:${Math.round(box.left)}`;
        if (key !== previous) {
          previous = key;
          place();
        }
      }
      frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

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
    <div className="absolute top-[8px] right-[8px] z-10 sm:top-[10px] sm:right-[10px]">
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
        // A 44px target on a phone and the unchanged 26px control at desktop,
        // with the 26px plate drawn inside either one. It was bare on a phone by ruling — "the
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
        className="flex h-[44px] w-[44px] cursor-pointer items-center justify-center bg-transparent p-0 sm:h-[26px] sm:w-[26px]"
      >
        {/* THE PLATE, as `full-card-trigger.tsx` draws it: opaque `var(--bg)`
            under one hairline at radius 7. Opaque rather than measured per
            theme — ink on `--bg` is the page's own body contrast — which is what
            lets the band underneath carry no scrim at all. Decision 3's
            treatment, now at both widths. */}
        <span
          className={`flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border font-mono text-[13px] tracking-[1px] transition-colors sm:h-full sm:w-full sm:text-[11px] ${
            open
              ? "border-[color:var(--border-strong)] bg-[color:var(--elevated)] text-[color:var(--fg)]"
              : "border-[color:var(--border-strong)] bg-[color:var(--bg)] text-[color:var(--fg-body)] sm:text-[color:var(--fg-body)]"
          }`}
        >
          …
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          ref={panelRef}
          // `marginTop: 0` because the gap moved into `place()`: the classes below
          // still carry `mt-[6px] sm:mt-[4px]` for the absolute fallback, and a
          // flipped panel must not be pushed back down into its own trigger.
          style={
            at ? { position: "fixed", top: at.top, left: at.left, marginTop: 0 } : undefined
          }
          className="absolute right-0 top-full z-50 mt-[6px] w-[186px] overflow-hidden rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-[0_22px_50px_rgba(0,0,0,0.6)] sm:mt-[4px]"
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
              {built > 0 && (
                <Link
                  href={`/decks/${deckId}/import`}
                  aria-label={deckImportCopy.update.entryAria(deckName)}
                  className={`${ITEM} first:border-t-0 text-[color:var(--fg)] no-underline`}
                >
                  {refreshCopy.decks.menu.updateFromList}
                </Link>
              )}
              <button
                type="button"
                onClick={handleRename}
                // bg/border as utilities, not inline: an inline background
                // outranks hover: and the row never highlights.
                className={`${ITEM} first:border-t-0 cursor-pointer bg-transparent text-[color:var(--fg)]`}
              >
                {refreshCopy.decks.menu.rename}
              </button>
              {/* Between Rename and Delete, whether or not the Update row above
                  rendered — it is gated on `built > 0`, so the shipped menu is
                  two rows on a brew (errata E9). */}
              <button
                ref={moveRow}
                type="button"
                onClick={handleMove}
                aria-label={folderCopy.move.rowAria(deckName, shelfLabel)}
                // ITEM without its `transition-colors`: this round draws no
                // motion, and an easing hover is motion. The shipped rows keep
                // theirs — changing those is a different round's decision.
                className={`${ITEM.replace(" transition-colors", "")} cursor-pointer bg-transparent text-[color:var(--fg)]`}
              >
                <span className="truncate" title={shelfLabel}>
                  {folderCopy.move.row(shelfLabel)}
                </span>
              </button>
              <button
                ref={deleteRow}
                type="button"
                onClick={handleDelete}
                className={`${ITEM} cursor-pointer bg-transparent text-[color:var(--danger)]`}
              >
                {refreshCopy.decks.menu.delete}
              </button>
            </div>
          ) : mode === "move" ? (
            <MoveMode
              deckId={deckId}
              deckName={deckName}
              folders={folders}
              currentId={shelf.id}
              onCreate={onCreateFolder}
              say={say}
              onRefused={({ threw }) => {
                // M6: the row reverts to the shelf it named, which means the
                // menu — not a destination list whose focused button is about
                // to be refreshed away.
                setMovedTo(null);
                // ONLY WHERE THE VIEW IS NOT RESCUING. A `false` is reported as
                // a refusal below, and the view answers that by focusing the
                // shelf, because the deck may be gone and this card with it —
                // two focus calls in one commit, and the later one wins.
                wantsMoveRowFocus.current = threw;
                setMode("menu");
                // A `false` IS the refusal, and the view reads that flag to
                // decide whether this card may have gone: the deck being absent
                // is one of the two things it means. A throw is not — nothing
                // moved — so only the refetch it asks for is reported.
                onMoved({ refused: !threw, threw });
              }}
              onMoved={(next) => {
                setMovedTo({ ...next, from: folderId });
                // THE MENU CLOSES. Design made the Move row the receipt and had
                // the panel return to it; Hugh overruled that on 2026-09-13 —
                // the act is finished, so the panel that performed it goes
                // (errata E21). The receipt is the announcement, plus the tile
                // leaving the grid on a named shelf.
                //
                // `handleClose` returns focus to this card's own ⋯ trigger,
                // which survives on All decks; on a named shelf the card leaves
                // and the view focuses the shelf control instead.
                if (keepsFocus) handleClose();
                else setOpen(false);
                // The list, its counts and both denominators live in the view;
                // without this a deck moved off the shelf being viewed stays in
                // the grid and every figure above it is stale.
                onMoved({ refused: false });
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
