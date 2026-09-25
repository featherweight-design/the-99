import { creditsCopy, monthName } from "../../lib/copy/credits";
import { deckNoticesCopy } from "../../lib/copy/notices";
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

/** `see`: the note is the overview check's, which carries *See which →* to the Notices sheet. */
export type PressNote = { text: string; writes: boolean; see?: true };

/** `deeperLooks`: `HELP_ME_CHOOSE_ENABLED`, so the credit lines name the looks only where they exist. */
export function pressNote(view: SynopsisView, where: PressWhere, deeperLooks = false): PressNote | null {
  if (view.kind !== "ready" || !view.current) return null;
  // THE CHECK FIRST (deck notices HANDOFF §6, plan D10): while a legality entry stands, the press
  // reads the bracket and the overview is withheld, whatever the list or the credits would say. The
  // slot then reads the check note, on a list that already has its overview too. A short deck's
  // `blocked` line still wins over it (F13): the components draw no note over a blocked press.
  if (view.state.illegal) return { text: deckNoticesCopy.check.note, writes: false, see: true };
  if (!view.state.pressWrites) return null;
  const { allowance } = view.state;
  const left = Math.max(0, allowance.limit - allowance.used);
  // The press still reads the bracket, which is free; only the overview is withheld. So every form
  // that writes nothing opens with "Reads the bracket only;" and says why in its own words: the
  // app is paused (the player has credits, so "waits for a credit" would be false), the owner's
  // share is used, or every credit is out. Bare, the cap's line beside a working Analyze read as
  // the analysis itself being paused (the-99-d9's ruling, 2026-09-24).
  if (allowance.paused) {
    return { text: `${synopsisCopy.pressNote.paused(monthName(allowance.paused.until))} ${creditsCopy.pausedReason(deeperLooks)}`, writes: false };
  }
  if (allowance.ownerShare) return { text: synopsisCopy.pressNote.ownerShare(monthName(new Date())), writes: false };
  const lead = where === "analyze" ? synopsisCopy.pressNote.analyzeUsedUp : synopsisCopy.pressNote.reanalyzeUsedUp;
  if (left > 0) return { text: synopsisCopy.pressNote.writes(creditsCopy.standing(left, allowance.limit, allowance.nextAt)), writes: true };
  return { text: `${lead} ${creditsCopy.spent(allowance.limit, allowance.reopensAt ?? allowance.nextAt, deeperLooks)}`, writes: false };
}
