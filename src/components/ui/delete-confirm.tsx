"use client";

import { useEffect, useRef } from "react";

/**
 * The delete confirm pane: a heading naming the thing, the sentence saying what goes and what does
 * not, and KEEP / DELETE. The deck's (`deck-delete-mode.tsx`), the folder's (`shelf-menu.tsx`) and a
 * logged game's (`game-history-row.tsx`) all draw this one, so every delete in the app reads the same
 * (Hugh, 2026-09-27: "our UI is consistent; re-use this UI"). The pane owns nothing but its markup
 * and its focus: each caller keeps its own action, its in-flight guard and its error.
 */

/** The floating panel's width in its delete mode. Was the deck menu's 186px (Hugh: "slightly too narrow"). */
export const DELETE_CONFIRM_WIDTH = 224;

export function DeleteConfirm({
  heading,
  body,
  cancelLabel,
  confirmLabel,
  pendingLabel,
  pending,
  error,
  onCancel,
  onConfirm,
  phoneTall = false,
}: {
  heading: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  /** Drawn on the confirm while the action is in flight; the confirm label when omitted. */
  pendingLabel?: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  /** 44px buttons at 13px below `md`, for a pane a phone reader presses (the pods menu); 32px everywhere otherwise. */
  phoneTall?: boolean;
}) {
  const size = phoneTall ? "h-[44px] text-[13px] md:h-[32px] md:text-[12.5px]" : "h-[32px] text-[12.5px]";
  const cancel = useRef<HTMLButtonElement>(null);

  // Entering the pane replaces the control the reader pressed, so without this they are dropped on
  // the body, and the pane is not a dialog that traps anything. KEEP takes focus rather than the
  // confirm: the destructive button should not be one Return away from the keystroke that opened it.
  useEffect(() => {
    cancel.current?.focus();
  }, []);

  return (
    // The heading sits OUTSIDE the scrolling body: a pane capped to the room beside its trigger (the
    // deck's and the game's, `useAnchoredPanel`) scrolls the sentence and buttons under it, and the
    // heading is what names WHICH thing is going. The 12px padding and 10px gap are split across the
    // two so the pane reads as before; the body carries its own padding so a focus ring is not cut at
    // its edge. In a box that does not cap it, the body never scrolls.
    <div data-delete-confirm className="flex min-h-0 flex-col">
      {/* `line-clamp-2` and `break-words`: the heading carries a name the reader chose, with no rule
          against an unbroken run, and the pane can hang inside a clipped box (the deck tile's art
          band). Two lines name anything a player can tell apart; three clipped the heading of a pane that exists to say WHICH thing is going. */}
      <p className="m-0 line-clamp-2 shrink-0 px-[12px] pt-[12px] font-display text-[14px] font-semibold break-words text-[color:var(--fg)]">
        {heading}
      </p>
      <div data-delete-confirm-body className="min-h-0 overflow-y-auto px-[12px] pt-[10px] pb-[12px]">
      <div className="flex flex-col gap-[10px]">
      {/* `[overflow-wrap:anywhere]`: a body can name a person, and a name may be one unbroken run. */}
      <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">{body}</p>
      {error && (
        <p role="alert" className="m-0 font-mono text-[11px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-[8px]">
        <button
          ref={cancel}
          type="button"
          disabled={pending}
          onClick={onCancel}
          className={`${size} flex-1 cursor-pointer rounded-[6px] border border-solid border-[color:var(--border-strong)] bg-transparent font-sans text-[color:var(--fg-body)]`}
        >
          {cancelLabel}
        </button>
        {/* `--danger`: this destroys a thing the player made, with no undo. What is safe is said by
            the sentence above. */}
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className={`${size} flex-1 cursor-pointer rounded-[6px] border-none bg-[color:var(--danger)] font-sans font-semibold text-[color:var(--bg)]`}
        >
          {pending && pendingLabel ? pendingLabel : confirmLabel}
        </button>
      </div>
      </div>
      </div>
    </div>
  );
}
