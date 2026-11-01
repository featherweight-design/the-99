"use client";

// What a hidden commander's row becomes on For you and Discover (design_handoff_the99_hide_commander README §2, the
// Undo board): the deck builder's Undo row (`UndoShell`), across the list's width, *{name} hidden* and **Undo**. No
// toast and no timer. Phone: 48px, 14px in; desktop: 44px, 16px in (`.urow`).

import type { Ref } from "react";
import { UndoShell } from "../ui/undo-row";
import { hideCommanderCopy } from "../../lib/copy/commander-explained";
import { addPanelCopy } from "../../lib/copy/decks-builder";

// The Undo board's `.merr`: one line under the row in `--danger`, 12px on 1.5, 6px above and 2px in. The board draws
// it so, not as the deck builder's amber `MutationError`; README §2's "as the builder's" is the behavior (the
// button goes, one line stands under the row), not its tone.
function refusedLine(message: string) {
  return (
    <p role="alert" className="pt-[6px] px-[2px] text-[12px] leading-[1.5] text-[color:var(--danger)]">
      {message}
    </p>
  );
}

const SHELL = "flex items-center gap-[12px] min-h-[48px] px-[14px] rounded-[8px] sm:min-h-[44px] sm:px-[16px]";

export function CommanderUndoRow({
  name,
  refused,
  onUndo,
  undoRef,
  frameRef,
}: {
  name: string;
  /** The undo was refused: no button, and the line under the row. */
  refused: boolean;
  onUndo: () => void;
  undoRef?: Ref<HTMLButtonElement>;
  frameRef?: Ref<HTMLDivElement>;
}) {
  return (
    <UndoShell
      marks={{ "data-commander-undo-row": "" }}
      shell={SHELL}
      label={hideCommanderCopy.undoRow.label(name)}
      action={addPanelCopy.undo.action}
      actionAria={hideCommanderCopy.undoRow.actionAria(name)}
      onUndo={onUndo}
      error={refused ? hideCommanderCopy.undoRow.refused : null}
      undoRef={undoRef}
      frameRef={frameRef}
      errorLine={refusedLine}
    />
  );
}
