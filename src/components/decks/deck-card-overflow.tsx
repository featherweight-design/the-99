"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { deleteDeck } from "../../app/decks/actions";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { refreshCopy } from "../../lib/copy/refresh";
import { RenameForm } from "./rename-form";
import { MoveMode } from "./deck-move-mode";
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
  onMoved: (result: { refused: boolean }) => void;
  /**
   * Whether this card stays on screen after a move — true on All decks, false on
   * a named shelf, where the deck leaves the grid and the view takes focus.
   */
  keepsFocus: boolean;
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
}: DeckCardOverflowProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "rename" | "move">("menu");
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Every deck card renders one of these, so the id has to be per-instance.
  const panelId = useId();

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
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
    if (!confirm(`Delete "${deckName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteDeck(deckId);
    });
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
  // The optimistic receipt EXPIRES ON THE FIRST CHANGED SERVER PROP, whether it
  // agrees or not. Clearing only on agreement left it standing forever when the
  // destination was deleted or the deck moved elsewhere before the refresh
  // landed: the id never matched, and the menu went on printing a shelf that
  // was no longer true. `from` is what the server said when the override was
  // made, so any change to that is the answer arriving.
  if (movedTo && movedTo.from !== folderId) setMovedTo(null);
  const shelf = movedTo ?? { id: folderId, name: folderName };
  const shelfLabel = shelf.name ?? folderCopy.shelves.unfiled;

  useEffect(() => {
    if (mode !== "menu" || !wantsMoveRowFocus.current) return;
    wantsMoveRowFocus.current = false;
    moveRow.current?.focus();
  }, [mode]);

  function handleClose() {
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
          className="absolute right-0 top-full z-20 mt-[6px] w-[186px] overflow-hidden rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-[0_22px_50px_rgba(0,0,0,0.6)] sm:mt-[4px]"
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
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className={`${ITEM} bg-transparent text-[color:var(--danger)]`}
                style={{ cursor: isPending ? "default" : "pointer" }}
              >
                {isPending ? "Deleting…" : refreshCopy.decks.menu.delete}
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
              onRefused={() => {
                // M6: the row reverts to the shelf it named, which means the
                // menu — not a destination list whose focused button is about
                // to be refreshed away.
                setMovedTo(null);
                wantsMoveRowFocus.current = true;
                setMode("menu");
                onMoved({ refused: false });
              }}
              onMoved={(next) => {
                setMovedTo({ ...next, from: folderId });
                // The menu's Move row is the receipt, so it is also where focus
                // belongs — but only when this card SURVIVES the refresh. On a
                // named shelf the moved deck leaves the grid, and the view
                // focuses the shelf control instead; asking for the row here
                // would put focus on a node about to be removed.
                if (keepsFocus) wantsMoveRowFocus.current = true;
                // The list, its counts and both denominators live in the view;
                // without this a deck moved off the shelf being viewed stays in
                // the grid and every figure above it is stale.
                onMoved({ refused: false });
                // Back to the menu, not closed: the row now reads the new shelf,
                // and that is the receipt.
                setMode("menu");
              }}
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
