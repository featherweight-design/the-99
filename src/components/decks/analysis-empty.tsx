"use client";

import { useId, useRef, useState } from "react";

import type { Bracket } from "../../lib/bracket/types";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { BracketMark } from "./bracket-mark";
import { DeckDescriptionField } from "./deck-description-field";
import { ProvenanceOpener } from "./provenance-panel";

const copy = deckAnalysisCopy.panel;

/** The ring's five marks, 1 at twelve o'clock and running clockwise: a 150px box, 50px radius, 44px marks. */
const RING: { bracket: Bracket; left: number; top: number }[] = ([1, 2, 3, 4, 5] as const).map((bracket, i) => {
  const t = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return {
    bracket,
    left: Math.round(75 + 50 * Math.cos(t) - 22),
    top: Math.round(75 + 50 * Math.sin(t) - 22),
  };
});

/**
 * The Analysis tab before a first reading (Analysis tab handoff §2, 2a to 2c): one empty state,
 * full width, and the grid withheld. No empty bracket box beside it, and no reserved space.
 *
 * THE RING IS DECORATIVE and `aria-hidden`: the heading carries the state, and is the live region.
 * That is also why its marks may sit at 0.3 (failed) and 0.22 (the loading trough), below
 * `DIM_OPACITY` — the 3:1 rule is for a mark that is read, and nothing here is read (readiness
 * finding 17).
 */
export function AnalysisEmpty({
  phase,
  stage = "reading",
  onRequest,
  blocked = null,
  note = null,
  see = null,
  description = null,
  onSaveDescription,
}: {
  phase: "idle" | "loading" | "failed";
  /**
   * While loading, what the press is doing: reading the deck, or (a first press that also writes
   * the overview, held until both can paint) writing the overview (Hugh, 2026-09-26).
   */
  stage?: "reading" | "writing";
  onRequest: () => void;
  /**
   * Ruling 1: the deck is not whole, so the press is disabled and this line says why, under it
   * (Hugh, 2026-09-23; undrawn in the handoff, so it borrows the busy button's look).
   */
  blocked?: string | null;
  /**
   * The credit note when this press also writes the overview (`CREDITS-overview.md` 7a, 7b): after
   * the button at 1300, with the provenance opener wrapped to its own line under the pair; centred
   * under the full-width button at 390. None over a blocked deck (finding 10b).
   */
  note?: string | null;
  /** The overview check's *See which →*, after the note (deck notices HANDOFF §6). */
  see?: { label: string; onPress: () => void } | null;
  /** The deck's description, read by this field and by Suggested changes (H35). Null until
   *  stated — the field is empty, never undrawn, since the empty state IS where it is asked. */
  description?: string | null;
  /** Saves the description. The press (below) awaits this before it reads (engineering note 1):
   *  a description typed seconds before Analyze must not be lost to a race. */
  onSaveDescription?: (value: string) => Promise<DeckMutationResult>;
}) {
  const noteId = useId();
  const [draft, setDraft] = useState(description ?? "");
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionRefused, setDescriptionRefused] = useState<string | null>(null);
  const [descriptionAnnounced, setDescriptionAnnounced] = useState("");
  // A new description from the page (another tab's edit, a revalidate) replaces the held draft,
  // adjusted during render rather than in an effect — but only while the draft still matches
  // what was last seen: a reader mid-edit here must not have their unsaved text overwritten by
  // a revalidation that landed from, say, their own header save (pre-open review).
  const [seenDescription, setSeenDescription] = useState(description ?? null);
  if (seenDescription !== description) {
    const unedited = draft.trim() === (seenDescription ?? "").trim();
    setSeenDescription(description ?? null);
    if (unedited) setDraft(description ?? "");
  }
  // Blur fires a save, then a press on Analyze a moment later can fire a SECOND one before the
  // first settles (pre-open review round 2) — both write and both revalidate, and the one that
  // resolves last decides what the field ends up reading. Sharing the in-flight promise means a
  // second call while one is pending joins the first rather than racing it.
  const pendingSave = useRef<Promise<DeckMutationResult> | null>(null);
  async function saveDescription(): Promise<DeckMutationResult> {
    if (pendingSave.current) return pendingSave.current;
    if (!onSaveDescription) return { ok: true };
    const trimmed = draft.trim();
    if (trimmed === (description ?? "").trim()) return { ok: true };
    setSavingDescription(true);
    setDescriptionRefused(null);
    setDescriptionAnnounced("");
    const run = (async (): Promise<DeckMutationResult> => {
      try {
        // Deferred through a microtask, so a callback that THROWS SYNCHRONOUSLY (rather than
        // returning a rejected promise) still suspends this async function at `await` instead
        // of running the whole try/catch/finally to completion before `pendingSave.current = run`
        // below ever executes — which would have the `finally` clear the ref back to null and
        // this line immediately re-set it to an already-settled promise, stuck until unmount.
        const result = await Promise.resolve().then(() => onSaveDescription(trimmed));
        if (result.ok) setDescriptionAnnounced(deckDescriptionCopy.announce.descriptionSaved);
        else setDescriptionRefused(result.message);
        return result;
      } catch {
        const result: DeckMutationResult = { ok: false, message: deckDescriptionCopy.description.refused };
        setDescriptionRefused(result.message);
        return result;
      } finally {
        setSavingDescription(false);
        pendingSave.current = null;
      }
    })();
    pendingSave.current = run;
    return run;
  }
  const shownNote = blocked === null ? note : null;
  const text = phase === "loading"
    ? stage === "writing" ? copy.writing : copy.loading
    : phase === "failed" ? copy.failed : copy.idle;
  const busy = phase === "loading";
  const disabled = busy || blocked !== null;
  return (
    <section className="flex flex-col gap-[7px] md:gap-[8px]" data-testid="analysis-empty" data-phase={phase}>
      <h3 className="m-0 font-mono font-normal uppercase text-[9.5px] tracking-[0.14em] text-[color:var(--fg-faint)] md:text-[10px] md:tracking-[0.16em]">
        {copy.overview}
      </h3>
      <div className="flex flex-col items-center text-center px-[4px] pt-[22px] pb-[8px] md:flex-row md:items-start md:justify-center md:gap-[40px] md:text-left md:px-[24px] md:pt-[28px] md:pb-[18px]">
        <span
          aria-hidden="true"
          data-testid="analysis-ring"
          className="relative mx-auto block h-[150px] w-[150px] flex-none md:mx-0"
          style={{ opacity: phase === "failed" ? 0.3 : undefined }}
        >
          {RING.map(({ bracket, left, top }, i) => (
            <span
              key={bracket}
              className={"absolute " + (busy ? "anim-at-wave" : "")}
              style={{ left, top, animationDelay: busy ? `${i * 0.16}s` : undefined }}
            >
              <BracketMark bracket={bracket} px={44} />
            </span>
          ))}
        </span>
        <div className="flex flex-col items-center md:min-w-0 md:max-w-[640px] md:flex-1 md:items-start">
          <h2
            aria-live="polite"
            role={phase === "failed" ? "alert" : undefined}
            className="m-0 mt-[22px] font-display text-[21px] font-bold leading-[1.25] text-[color:var(--fg)] [text-wrap:balance] md:mt-0 md:text-[26px]"
          >
            {text.heading}
          </h2>
          <p className="m-0 mt-[11px] max-w-[540px] text-[13.5px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty] md:mt-[12px] md:text-[14.5px] md:leading-[1.65]">
            {text.body}
          </p>
          {phase === "idle" ? (
            <p className="m-0 mt-[9px] max-w-[540px] text-[13.5px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty] md:mt-[10px] md:text-[14.5px] md:leading-[1.65]">
              {copy.idle.bodyPersist}
            </p>
          ) : null}
          {/* The description field, between the second paragraph and Analyze (H35, STATES §1).
              Not drawn during loading — the shipped loading state is unchanged. */}
          {phase === "idle" ? (
            <div className="w-full max-w-[540px]">
              <DeckDescriptionField
                value={draft}
                onChange={setDraft}
                onBlur={() => void saveDescription()}
                saving={savingDescription}
                refused={descriptionRefused}
              />
              <span role="status" className="sr-only">{descriptionAnnounced}</span>
            </div>
          ) : null}
          <div className={`mt-[20px] flex w-full flex-col items-center gap-[6px] md:mt-[22px] md:w-auto md:flex-row md:flex-wrap md:gap-x-[20px] ${shownNote ? "md:gap-y-[12px]" : "md:gap-y-[20px]"}`}>
            {/* A BUTTON, NEVER AUTOMATIC. A silent retry loop is how a wait becomes a bill. */}
            <button
              type="button"
              onClick={disabled ? undefined : () => {
                // Nothing to save: read now, synchronously — a caller with no save wired up
                // (or no pending edit) gets exactly the old one-press behavior.
                if (!onSaveDescription || draft.trim() === (description ?? "").trim()) { onRequest(); return; }
                // A refused or thrown save leaves the field as it was (including `savingDescription`
                // reset by `saveDescription`'s own `finally`) and never reads — reading over an
                // unsaved, refused description would silently drop it (pre-open review).
                void saveDescription().then((result) => { if (result.ok) onRequest(); });
              }}
              aria-disabled={disabled || undefined}
              aria-describedby={blocked ? "analysis-blocked" : shownNote ? noteId : undefined}
              className={
                "inline-flex min-h-[44px] items-center justify-center self-stretch rounded-[8px] px-[22px] text-[14px] font-semibold md:self-auto md:text-[14.5px] "
                + (disabled
                  ? "cursor-default bg-[color:var(--elevated)] text-[color:var(--fg-faint)]"
                  : "cursor-pointer bg-[color:var(--fg)] text-[color:var(--bg)]")
              }
            >
              {phase === "failed" ? copy.failed.cta : copy.idle.cta}
            </button>
            {shownNote ? (
              <p
                data-testid="press-note"
                className="m-0 text-center font-mono text-[9.5px] leading-[1.55] text-[color:var(--fg-faint)] md:max-w-[340px] md:text-left md:text-[11px]"
              >
                {/* The button's description is the note's TEXT: a control inside it would be read as
                    part of the description, so the id sits on the words alone. */}
                <span id={noteId}>{shownNote}</span>
                {see ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={see.onPress}
                      data-testid="press-note-see"
                      className="cursor-pointer whitespace-nowrap border-b border-dotted border-[color:var(--accent)] text-[color:var(--accent)] hover:border-[color:var(--accent-hover)] hover:text-[color:var(--accent-hover)]"
                    >
                      {see.label} <span aria-hidden="true">→</span>
                    </button>
                  </>
                ) : null}
              </p>
            ) : null}
            {/* With a note in the row, the opener takes its own line under the pair (7a). */}
            <div className={shownNote ? "md:basis-full" : "contents"}>
              <ProvenanceOpener tone="accent" />
            </div>
            {/* IN the CTA row (the table's placement), on a line of its own under the press. */}
            {blocked ? (
              <p
                id="analysis-blocked"
                data-testid="analysis-blocked"
                className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)] md:basis-full md:text-[13px]"
              >
                {blocked}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
