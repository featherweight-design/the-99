import { creditsCopy } from "../../lib/copy/credits";
import { synopsisCopy } from "../../lib/copy/synopsis";
import type { SynopsisView } from "./synopsis-state";

/**
 * The credit note beside a press that also writes the overview (`CREDITS-overview.md`, the four
 * items; the credits audit, item 2), and whether that press writes.
 *
 * ONE CONDITION, from the server: `pressWrites`, the live list has no overview (fingerprint alone,
 * ruling B). Then the allowance picks the form: credits left, the credit note, and the press
 * writes; none left, the used-up lead and line, and the press reads the bracket only. A list that
 * already has its overview draws NO note (7d), and neither does a state not yet read for the list
 * on screen: until it is, nothing is known about what the press would spend, so it spends nothing.
 */
export type PressWhere = "analyze" | "reanalyze";

export function pressNote(view: SynopsisView, where: PressWhere): { text: string; writes: boolean } | null {
  if (view.kind !== "ready" || !view.current || !view.state.pressWrites) return null;
  const { allowance } = view.state;
  const left = Math.max(0, allowance.limit - allowance.used);
  // The app-wide cap, or the owner's own share: every press is refused before it can write, so the
  // note says why instead of naming a credit (the spend cap, #914).
  if (allowance.paused) return { text: creditsCopy.paused(allowance.paused.until), writes: false };
  if (allowance.ownerShare) return { text: creditsCopy.ownerShare(new Date()), writes: false };
  if (left > 0) return { text: synopsisCopy.pressNote.writes(creditsCopy.standing(left, allowance.limit, allowance.nextAt)), writes: true };
  const lead = where === "analyze" ? synopsisCopy.pressNote.analyzeUsedUp : synopsisCopy.pressNote.reanalyzeUsedUp;
  return { text: `${lead} ${creditsCopy.spent(allowance.limit, allowance.reopensAt ?? allowance.nextAt)}`, writes: false };
}
