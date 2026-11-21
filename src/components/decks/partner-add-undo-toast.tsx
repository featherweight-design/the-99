"use client";
// The toast after a partner is added (#491, partner-add handoff §6, G3): `joins`, what left the deck, and
// one Undo. The Add a partner section mounts it. It is a receipt in the deck stack (`status`, the
// floor) while it holds the Undo, and the shipped refusal alert (`role="alert"`, replacing itself like the token
// refusal) when the write is refused or throws. Eight seconds, held on hover, focus and an undo in flight, and
// lost on a reload or navigation: nothing is stored. Any other draft edit dismisses it, which is the caller's
// `onDone`; this toast knows nothing of the draft, so a lasting undo can replace it.

import { useRef, useState } from "react";
import { undoPartnerAdd } from "../../lib/commander-change/actions";
import { changeCommanderCopy } from "../../lib/copy/change-commander";
import { SteadyLabel } from "../ui/steady-label";
import { ToastFrame, useToastClock } from "../collection/edit-toast";
import { DeckRefusalToast } from "./token-refusal-toast";

const c = changeCommanderCopy.partnerUndo;

type Phase = "shown" | "undoing" | "undone" | "refused";

export function PartnerAddUndoToast({
  deckId, stays, partner, cut, names, onDone,
}: {
  deckId: string;
  /** Oracle ids the add wrote: the single that stayed, the partner that joined, the card it cut (null when none). */
  stays: string;
  partner: string;
  cut: string | null;
  names: { stays: string; partner: string; cut: string | null };
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("shown");
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  // An undo in flight holds the window, as the shipped receipt's does; the result then reads for the full eight.
  useToastClock(ref, !hover && !focus && phase !== "undoing" && phase !== "refused", onDone);

  async function undo() {
    if (phase !== "shown") return;
    setPhase("undoing");
    try {
      const result = await undoPartnerAdd(deckId, stays, partner, cut);
      setPhase(result.ok ? "undone" : "refused");
    } catch {
      // The answer was lost: say it was refused rather than claim the pair is back.
      setPhase("refused");
    }
  }

  if (phase === "refused") {
    return <DeckRefusalToast kind="partner-add-undo-refused" title={c.refused} detail={c.refusedDetail} onDone={onDone} />;
  }
  return (
    <ToastFrame
      frameRef={ref}
      role="status"
      placement="deck"
      kind="receipt"
      title={phase === "undone" ? c.undone(names.stays) : c.joined(names.partner, names.stays)}
      detail={phase === "shown" && names.cut ? c.cut(names.cut) : undefined}
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
      actions={phase === "shown" || phase === "undoing" ? (
        <button
          type="button"
          disabled={phase === "undoing"}
          onClick={undo}
          className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent-text)] underline underline-offset-2"
        >
          <SteadyLabel hold={[c.undo, c.undoing]}>{phase === "undoing" ? c.undoing : c.undo}</SteadyLabel>
        </button>
      ) : undefined}
    />
  );
}
