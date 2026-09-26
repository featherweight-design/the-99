"use client";

// The selected shelf's own `…` — two rows, `Rename` and `Delete` (STATES R1),
// and the acts behind them.
//
// NEVER ON `All decks` OR `Unfiled`, and never on an unselected segment: both
// rows act on a folder, and neither of those is one (errata E7). The caller
// decides that by not mounting this.
//
// NO BLUR COMMIT in the rename field. That is the deck header's ruling, and in
// a panel form blur lands before the button's click and double-submits
// (`rename-form.tsx:21-23`).

import { useEffect, useRef, useState, useTransition } from "react";
import { PrimaryButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { folderCopy } from "../../lib/copy/folders";
import { deleteFolderAction, renameFolderAction } from "../../app/decks/folder-actions";
import { DeleteConfirm } from "../ui/delete-confirm";
import { FOLDER_NAME_MAX } from "../../lib/decks/folder-name";
import { stripControlChars } from "./folder-create-dialog";

const ROW =
  "flex h-[38px] w-full cursor-pointer items-center border-x-0 border-b-0 border-t border-solid "
  + "border-t-[color:var(--elevated)] bg-transparent px-[13px] text-left font-sans text-[13px] "
  + "hover:bg-[color:var(--elevated)]";

type Mode = "menu" | "rename" | "delete";

export function ShelfMenu({
  folderId,
  name,
  deckCount,
  onRenamed,
  onDeleted,
  onGone,
  say,
  size = "wide",
}: {
  folderId: string;
  name: string;
  /** Decks on this shelf, for the delete confirmation's own sentence. */
  deckCount: number;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
  /** The folder was gone when the rename landed: refresh, and rescue focus. */
  onGone: () => void;
  say: (announcement: string) => void;
  /** 22px inside the segment on the wide line; a 44px target on the phone. */
  size?: "wide" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  /**
   * FIXED, POSITIONED FROM THE TRIGGER'S RECT — not absolute inside the line.
   *
   * The shelf line is a scroll container (its two-row ceiling needs one), and an
   * absolutely positioned popover inside a scrolling ancestor is CLIPPED by it:
   * the contact sheet caught this one, with the delete confirmation sliced off
   * against the top of the line. It is the same trap `filter-chassis.tsx`
   * records for its own control row — "clipping this group hides every panel the
   * chassis opens". A fixed box escapes every clipping ancestor.
   */
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  /**
   * A write in flight. Closing is not cancelling — the action lands either way
   * and its callback still moves the page — so neither Escape, nor the trigger,
   * nor an outside press may hide one (the confirm modal's own rule).
   */
  const [busy, setBusy] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  /**
   * CLAMPED TO THE VIEWPORT. Right-anchoring alone put the panel's left edge
   * off-screen on a phone: the trigger sits just after a left-aligned shelf
   * name, and 248px to the left of it is negative at 390px. The panel is placed
   * from the left, aligned to the trigger's right edge where there is room and
   * pushed back inside the margin where there is not.
   */
  function place() {
    const box = trigger.current?.getBoundingClientRect();
    if (!box) return;
    const width = 248;
    const margin = 8;
    const wanted = box.right - width;
    const left = Math.min(Math.max(margin, wanted), window.innerWidth - width - margin);
    setAt({ top: box.bottom + 6, left: Math.max(margin, left) });
  }

  function close(restoreFocus = true) {
    if (busy) return;
    setOpen(false);
    setMode("menu");
    // Not on an outside press: the thing pressed takes focus itself, and if it
    // was another shelf, this trigger is about to be unmounted with the segment
    // that carries it.
    if (restoreFocus) trigger.current?.focus();
  }

  // The anchor moves: the page scrolls, the line's own scrollport scrolls, the
  // window resizes. A fixed panel measured once would stay at the old viewport
  // coordinates, detached from the trigger and floating over whatever is there
  // now.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // An outside press dismisses, because this popover has no backdrop —
  // `account-menu.tsx`'s rule, scoped to the wrapper so a press on the trigger
  // reaches its own toggle rather than being closed here and reopened.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapper.current?.contains(e.target as Node)) close(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  });

  return (
    // A `div`, not a `span`: `Panel` renders a `div role="dialog"` inside this
    // wrapper, and a div is not phrasing content. `inline-flex` keeps it sitting
    // in the segment exactly as before.
    <div ref={wrapper} className="relative inline-flex">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={folderCopy.shelves.menuTrigger(name)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (busy) return;
          place();
          setOpen((o) => !o);
          setMode("menu");
        }}
        className={`flex cursor-pointer items-center justify-center rounded-[6px] border-none bg-transparent p-0 text-[color:var(--fg-muted)] ${
          size === "wide" ? "ml-[6px] h-[22px] w-[22px] text-[13px]" : "h-[44px] w-[44px] text-[15px]"
        }`}
      >
        …
      </button>

      {open && (
        <Panel
          ref={panel}
          at={at}
          mode={mode}
          onDismiss={close}
          // Named for the mode it is in. Left at the menu's name, the rename
          // form told assistive tech it was still an action list.
          label={
            mode === "delete"
              ? folderCopy.del.heading(name)
              : mode === "rename"
                ? folderCopy.rename.heading
                : folderCopy.shelves.menuTrigger(name)
          }
        >
          {mode === "menu" && (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setMode("rename")}
                className={`${ROW} first:border-t-0 text-[color:var(--fg)]`}
              >
                {folderCopy.rename.action}
              </button>
              <button
                type="button"
                onClick={() => setMode("delete")}
                className={`${ROW} text-[color:var(--danger)]`}
              >
                {folderCopy.del.action}
              </button>
            </div>
          )}

          {mode === "rename" && (
            <RenameFolder
              folderId={folderId}
              name={name}
              onBusy={setBusy}
              onDone={(next) => {
                say(folderCopy.shelves.aria(next, deckCount));
                onRenamed(next);
                setBusy(false);
                setOpen(false);
                setMode("menu");
                trigger.current?.focus();
              }}
              onGone={() => {
                // Refused: the folder is gone or not theirs. The page is stale
                // and needs the refresh, but nothing was renamed and nothing may
                // be announced as though it had been — and the segment carrying
                // this menu is about to go with it, so the route rescues focus.
                setBusy(false);
                setOpen(false);
                setMode("menu");
                onGone();
              }}
              onCancel={() => setMode("menu")}
            />
          )}

          {mode === "delete" && (
            <DeleteFolder
              folderId={folderId}
              name={name}
              deckCount={deckCount}
              onBusy={setBusy}
              onDone={() => {
                onDeleted();
                setBusy(false);
                setOpen(false);
                setMode("menu");
              }}
              onCancel={() => setMode("menu")}
            />
          )}
        </Panel>
      )}
    </div>
  );
}

/** The popover shell both modes sit in, with the app's shared focus trap. */
function Panel({
  ref,
  label,
  at,
  mode,
  onDismiss,
  children,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  label: string;
  at: { top: number; left: number } | null;
  mode: Mode;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  // `lockScroll: false`: this is a non-modal popover — no backdrop, and an
  // outside press dismisses it — so freezing the page behind it is the account
  // menu's own exemption, for the same reason.
  useDialogA11y(ref, onDismiss, { lockScroll: false });

  // The hook focuses on MOUNT, and this panel swaps its contents without
  // unmounting — so the button a reader pressed to get here is removed while
  // the dialog stays, and focus falls to the body inside an `aria-modal`. Every
  // mode change lands on its own first control.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(
      "input, button:not([disabled])",
    )?.focus();
  }, [mode, ref]);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      style={at ? { position: "fixed", top: at.top, left: at.left } : undefined}
      // `whitespace-normal` because the wide segment this lives inside sets
      // `whitespace-nowrap`, and fixed positioning changes where a box is drawn,
      // not what it inherits — the delete sentence was running off the panel's
      // edge mid-word. The contact sheet caught that too.
      className="absolute top-full right-0 z-50 w-[248px] overflow-hidden rounded-[10px] whitespace-normal border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-[0_22px_50px_rgba(0,0,0,0.6)]"
    >
      {children}
    </div>
  );
}

function RenameFolder({
  folderId,
  name,
  onDone,
  onGone,
  onBusy,
  onCancel,
}: {
  folderId: string;
  name: string;
  onDone: (next: string) => void;
  onGone: () => void;
  onBusy: (busy: boolean) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);

  const trimmed = value.trim();
  // Unchanged reverts rather than writing: R2's rule, and it also keeps the
  // unique index from being asked about a name the folder already has.
  const canSave = trimmed.length > 0 && trimmed !== name && !pending;

  function submit() {
    if (!canSave || inFlight.current) return;
    inFlight.current = true;
    onBusy(true);
    startTransition(async () => {
      const result = await renameFolderAction(folderId, trimmed).catch(() => null);
      inFlight.current = false;
      if (result?.ok) return onDone(result.folder.name);
      onBusy(false);
      // The typed value survives every refusal (R3): a reader who typed a
      // near-miss needs to see what they typed.
      if (result?.ok === false && result.reason === "duplicate") {
        setError(folderCopy.rename.duplicate(trimmed));
      } else if (result?.ok === false && result.reason === "refused") {
        // Gone or not theirs. Nothing was renamed, so nothing is announced —
        // the page is refreshed and the panel closes.
        onGone();
      } else {
        // A throw: an outage or a timeout, not a name problem, and the reader
        // can try again.
        setError(folderCopy.create.failed);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-[8px] p-[12px]"
    >
      <TextField
        autoFocus
        value={value}
        onChange={(e) => {
          setValue(stripControlChars(e.target.value));
          setError(null);
        }}
        maxLength={FOLDER_NAME_MAX}
        aria-label={folderCopy.rename.fieldAria}
        aria-invalid={error ? true : undefined}
        readOnly={pending}
        className="w-full rounded-[6px] px-[10px] py-[7px] font-sans text-[13px]"
      />
      {error && (
        <p role="alert" className="m-0 font-mono text-[11px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-[8px]">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="h-[32px] flex-1 cursor-pointer rounded-[6px] border border-solid border-[color:var(--border-strong)] bg-transparent font-sans text-[12.5px] text-[color:var(--fg-body)]"
        >
          {folderCopy.rename.cancel}
        </button>
        <PrimaryButton
          type="submit"
          disabled={!canSave}
          className="h-[32px] flex-1 rounded-[6px] text-[12.5px]"
        >
          {folderCopy.rename.submit}
        </PrimaryButton>
      </div>
    </form>
  );
}

/**
 * The confirmation, and its second sentence is the whole design (decision 23):
 * the decks return to Unfiled and none is deleted. That is a promise the foreign
 * key keeps however the folder goes, so it is stated as a fact rather than as
 * reassurance — and it is confirmed either way, because there is no undo.
 */
function DeleteFolder({
  folderId,
  name,
  deckCount,
  onDone,
  onBusy,
  onCancel,
}: {
  folderId: string;
  name: string;
  deckCount: number;
  onDone: () => void;
  onBusy: (busy: boolean) => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    onBusy(true);
    startTransition(async () => {
      // `false` is DONE, not an error (decision 25): the folder is already gone,
      // and the UI must not invent a failure the query refused to. A THROW is
      // the other thing entirely — an outage — and treating it as done would
      // walk the reader off to All decks reporting a deletion that never
      // happened.
      const answer = await deleteFolderAction(folderId).catch(() => "threw" as const);
      inFlight.current = false;
      if (answer === "threw") {
        onBusy(false);
        setError(folderCopy.del.failed);
        return;
      }
      onDone();
    });
  }

  return (
    <DeleteConfirm
      heading={folderCopy.del.heading(name)}
      body={deckCount > 0 ? folderCopy.del.body(deckCount) : folderCopy.del.bodyEmpty}
      cancelLabel={folderCopy.del.cancel}
      confirmLabel={folderCopy.del.confirm}
      pending={pending}
      error={error}
      onCancel={onCancel}
      onConfirm={confirm}
    />
  );
}
