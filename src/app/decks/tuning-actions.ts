"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import { db } from "../../db";
import { deckSuggestionItems, decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { heldStubOutcome } from "../../lib/tuning/stub";
import { isUuid } from "../../lib/uuid";
import { creditsCopy } from "../../lib/copy/credits";
import { countCharacters, deckTuningCopy } from "../../lib/copy/deck-tuning";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { validateDeckName } from "../../lib/decks/deck-name";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { deckSurfaces } from "../../lib/decks/revalidate";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import {
  profileOfHead,
  commanderName,
  readOwnedOracleIds,
  readTuningContext,
  readTuningState,
  tuningInputs,
  withBracketAfter,
} from "../../lib/decks/tuning-read";
import { callModel } from "../../lib/model/client";
import { buildPlayGroup } from "../../lib/profile/play";
import { buildEvidencePack } from "../../lib/tuning/evidence";
import { resolveTaggedText } from "../../lib/cards/tagged-text";
import { plainText, tagCount } from "../../lib/decks/notes-body";
import { tuningEnabled } from "../../lib/tuning/flag";
import { gateReason } from "../../lib/tuning/gate";
import { intentTooLong, MAX_SUGGESTIONS, NOTES_TAGS_MAX, MODEL_TIMEOUT_MS, TUNING_EFFORT, TUNING_MAX_TOKENS, TUNING_MODEL, TUNING_RETRY_FLOOR_MS } from "../../lib/tuning/limits";
import { MAX_BUDGET_DOLLARS, MAX_SETS } from "../../lib/intake/answers";
import { buildPrompt } from "../../lib/tuning/prompt";
import { tuningResponseSchema } from "../../lib/tuning/response-schema";
import { finishRun, persistRun, runIsPending, saveIntent, startRun, type Billed } from "../../lib/tuning/run-store";
import type { TuningState } from "../../lib/tuning/state";
import { chooseRefusal, sizeLists, type ValidationReport } from "../../lib/tuning/validate";
import { resolveAnswer } from "../../lib/tuning/answer";
import { refundsCredit } from "../../lib/tuning/refund";
import { retryable } from "../../lib/tuning/retry";
import { loadOwnedCandidates } from "../../lib/tuning/owned-candidates";
import { applyItem, setDismissed, undoItem } from "../../lib/tuning/verdicts";

/**
 * Deck tuning's server actions. Every one is a PUBLIC ENDPOINT, as `logGame` says of itself, so
 * every gate the panel applies is re-applied here: a stale tab or a replayed request meets the
 * same rule the button does. The transactions live in `src/lib/tuning/run-store.ts` and
 * `verdicts.ts`, where the probe reaches them; these add the session and the revalidation.
 *
 * THE TYPES DO NOT REACH THE WIRE. Every argument is checked for what it claims to be before it
 * is used: an id that is not a uuid is refused rather than handed to Postgres to throw on, and
 * `anyway` counts only as the literal `true`, or `{ anyway: "false" }` would pass the gate.
 */

function revalidateDeck(deckId: string): void {
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
}

/**
 * The deck's description (H35): one or two sentences, quoted verbatim by Suggested changes. The
 * overview does not read it (H35, Q2: Hugh kept the overview as it was). Every save clears `intent_seeded` too, which no longer matters for a new
 * write (nothing seeds any more) but still holds for a deck that had an old seeded line.
 */
export async function saveDeckDescription(deckId: string, formData: FormData): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return { ok: false, message: deckDescriptionCopy.description.refused };
  // A field that is missing or not text is a refusal, never an empty line: reading it as ""
  // would clear the player's description on a malformed request.
  const raw = formData instanceof FormData ? formData.get("intent") : null;
  if (typeof raw !== "string") return { ok: false, message: deckDescriptionCopy.description.refused };
  const saved = await saveIntent(deckId, userId, raw);
  if (saved === "tooLong") return { ok: false, message: deckDescriptionCopy.description.tooLong };
  if (saved === "refused") return { ok: false, message: deckDescriptionCopy.description.refused };
  revalidateDeck(deckId);
  return { ok: true };
}

/**
 * The header pencil's ONE commit (H35, pre-open review round 2): a name and/or a description,
 * written in ONE update so a description refusal can never leave a renamed deck behind with no
 * way for Cancel to undo it. Pass only the fields that changed when the editor's commit began —
 * a field the caller omits is left exactly as the database holds it, so a concurrent save of the
 * OTHER field (the empty-state door, say) is never overwritten with a stale closure value.
 */
export async function saveDeckHeader(
  deckId: string,
  fields: { name?: string; description?: string },
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return { ok: false, message: deckDescriptionCopy.description.refused };
  // A SERVER ACTION IS A PUBLIC ENDPOINT (this file's own header): the TypeScript parameter type
  // checks nothing at runtime, so a malformed request — `null`, a field that is not a string —
  // must be refused here rather than reaching `validateDeckName` or `.trim()` and throwing.
  if (typeof fields !== "object" || fields === null) return { ok: false, message: deckDescriptionCopy.description.refused };
  if (fields.name !== undefined && typeof fields.name !== "string") return { ok: false, message: deckDescriptionCopy.description.refused };
  if (fields.description !== undefined && typeof fields.description !== "string") return { ok: false, message: deckDescriptionCopy.description.refused };
  const set: { name?: string; intent?: string | null; intentSeeded?: boolean } = {};
  if (fields.name !== undefined) {
    try {
      set.name = validateDeckName(fields.name);
    } catch {
      return { ok: false, message: deckDescriptionCopy.description.refused };
    }
  }
  if (fields.description !== undefined) {
    const trimmed = fields.description.trim();
    if (intentTooLong(trimmed)) return { ok: false, message: deckDescriptionCopy.description.tooLong };
    set.intent = trimmed.length > 0 ? trimmed : null;
    set.intentSeeded = false;
  }
  if (Object.keys(set).length === 0) return { ok: true };
  const updated = await db.update(decks).set({ ...set, lastEditedAt: sql`clock_timestamp()` })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .returning({ id: decks.id });
  if (updated.length === 0) return { ok: false, message: deckDescriptionCopy.description.refused };
  if (set.name !== undefined) revalidateClaims(deckId, userId);
  revalidateDeck(deckId);
  return { ok: true };
}

/**
 * "Kept for this deck" (H35, PR 2): the per-card cap, the sets and owned-only Suggested changes'
 * own swaps stay inside. Held per deck, not per run — null/empty/false is "no limit", never
 * seeded. Checked the same way help-me-choose's budget control is (`MAX_BUDGET_DOLLARS`):
 * whole dollars, 1 to `MAX_BUDGET_DOLLARS`, converted to cents only after that bound holds.
 *
 * PARTIAL, like `saveDeckHeader` above (pre-open review round 2): each control autosaves on its
 * own debounce, so a caller sends only the field it just changed. Saving all three every time
 * meant one tab's cap edit could carry another tab's STALE sets/owned-only back over whatever
 * that tab had since saved — a field this action never touches is never written.
 */
export async function saveDeckLimits(
  deckId: string,
  fields: { capDollars?: number | null; sets?: readonly string[]; ownedOnly?: boolean },
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!tuningEnabled() || !isUuid(deckId)) return { ok: false, message: deckDescriptionCopy.limits.refused };
  if (typeof fields !== "object" || fields === null) return { ok: false, message: deckDescriptionCopy.limits.refused };
  const { capDollars, sets, ownedOnly } = fields;
  if (
    (capDollars !== undefined && !(capDollars === null || (Number.isInteger(capDollars) && capDollars >= 1 && capDollars <= MAX_BUDGET_DOLLARS)))
    // Same set-code shape `validateCreateAnswers` checks (`answers.ts`): a malformed code (a
    // single letter, a space, a NUL byte) was previously accepted here and either persisted as
    // an unmatchable filter or made Postgres reject the whole update outright, never answering
    // the field's own refusal (pre-open review round 4, a previously-missed finding).
    // Bounded the same way the create flow bounds its own Sets answer (`MAX_SETS`, review
    // round 6): an unbounded array is untrusted past the shape check alone, and it is serialized
    // twice into a paid model request and once into SQL every run.
    || (sets !== undefined && (!Array.isArray(sets) || sets.length > MAX_SETS || sets.some((s) => typeof s !== "string" || !/^[a-z0-9]{2,8}$/.test(s.toLowerCase()))))
    || (ownedOnly !== undefined && typeof ownedOnly !== "boolean")
  ) return { ok: false, message: deckDescriptionCopy.limits.refused };
  const set: { tuningCapCents?: number | null; tuningSets?: string[]; tuningOwnedOnly?: boolean } = {};
  if (capDollars !== undefined) set.tuningCapCents = capDollars === null ? null : capDollars * 100;
  if (sets !== undefined) {
    // Deduped and lower-cased: the wire is untrusted, and `SetsField`'s own codes are already
    // lower-case, so a mismatch here could only be a malformed or replayed request.
    set.tuningSets = [...new Set(sets.map((s) => s.toLowerCase()))];
  }
  if (ownedOnly !== undefined) set.tuningOwnedOnly = ownedOnly;
  if (Object.keys(set).length === 0) return { ok: true };
  const updated = await db.update(decks)
    .set({ ...set, lastEditedAt: sql`clock_timestamp()` })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .returning({ id: decks.id });
  if (updated.length === 0) return { ok: false, message: deckDescriptionCopy.limits.refused };
  revalidateDeck(deckId);
  return { ok: true };
}

/**
 * One tuning run, start to finish. `anyway` is the drawn `Suggest again anyway`: it passes the
 * `unchanged` reason and no other.
 *
 * The order is the design: the gate, then `startRun`'s one transaction holding the unit and the
 * pending row, committed before any network call. Everything after that sits in one `try`, so a
 * throw anywhere fails the run and refunds its unit: no unit is ever spent on a call never made.
 */
export async function runTuning(
  deckId: string,
  opts: { anyway?: boolean; runId?: string; notes?: string } = {},
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!tuningEnabled() || !isUuid(deckId)) return { ok: false, message: deckTuningCopy.run.refused };
  const anyway = typeof opts === "object" && opts !== null && opts.anyway === true;
  // The panel names its run so it can wait on that run and no other (`await-run.ts`). Anything but
  // a uuid is refused rather than dropped: a wait keyed on an id the row does not carry would never end.
  const requested = typeof opts === "object" && opts !== null ? opts.runId : undefined;
  if (requested !== undefined && (typeof requested !== "string" || !isUuid(requested))) {
    return { ok: false, message: deckTuningCopy.run.refused };
  }
  // "Additional notes" (H35, PR 4b): never saved, so the request carries the player's own text
  // for this run alone. A field that is present but not text, or over its own cap, is a refusal
  // rather than a silent drop — the client already enforces the cap on every keystroke, so this
  // can only be a forged or stale request.
  const rawNotes = typeof opts === "object" && opts !== null ? opts.notes : undefined;
  if (rawNotes !== undefined && typeof rawNotes !== "string") {
    return { ok: false, message: deckTuningCopy.run.refused };
  }
  // The body may carry `[[id|Name]]` tags (the box takes the `[[` picker). The cap is on what it DRAWS, in
  // code points, and a body holds at most `NOTES_TAGS_MAX` tags; a tag's id adds no drawn text, so those two
  // bound the raw length as well.
  const trimmedBody = rawNotes === undefined ? null : rawNotes.trim();
  const notesCap = deckDescriptionCopy.notes.maxLength;
  if (trimmedBody !== null && (tagCount(trimmedBody) > NOTES_TAGS_MAX || countCharacters(plainText(trimmedBody)) > notesCap)) {
    return { ok: false, message: deckTuningCopy.run.refused };
  }
  // A tag is the catalog's name for its id, never the client's: an id the catalog does not hold, or a card
  // banned in Commander, is plain words. The prompt gets the names, through `playerText`, as ever.
  const trimmedNotes = trimmedBody === null ? null : (await resolveTaggedText(trimmedBody, { commanderLegalOnly: true })).text.trim();
  const notes = trimmedNotes === "" ? null : trimmedNotes;

  const inputs = await tuningInputs(deckId, userId);
  if (!inputs) return { ok: false, message: deckTuningCopy.run.refused };
  const { head, games, intent, declared, fingerprint, readVersion, locked, allLocked, limits } = inputs;

  // `allLocked` is a gate reason, so this refusal lands BEFORE `startRun` reserves a credit: the
  // panel's "No credit is used." is true of the server, not only of a disabled button.
  const gate = gateReason(await readTuningState(deckId, userId, fingerprint, new Date(), { allLocked }));
  // "Additional notes" (H35, PR 4b, review round 2): the same bypass `anyway` gives — notes are
  // new input the model has never seen, so "unchanged" is not true of this request even when
  // nothing else moved. Never bypasses the other gate reasons.
  if (gate && !(gate.kind === "unchanged" && (anyway || notes !== null))) return { ok: false, message: gate.message };

  const started = await startRun(userId, deckId, fingerprint, readVersion, { runId: requested });
  if (started.kind === "paused") return { ok: false, message: creditsCopy.pausedServer };
  if (started.kind === "ownerShare") return { ok: false, message: creditsCopy.ownerShare(new Date()) };
  if (started.kind === "allowance") return { ok: false, message: deckTuningCopy.allowance.spent };
  if (started.kind === "in_flight") return { ok: false, message: deckTuningCopy.announce.started };
  // The last card was locked after the gate's snapshot: refused under the lock, nothing reserved.
  if (started.kind === "allLocked") {
    return { ok: false, message: lockedCardsCopy.tuning.allLocked(await commanderName(head)) };
  }

  // The run and its ledger unit, held for the whole request: every settle below reaches the unit
  // by its own id, so a deck deleted mid-call (which cascades the run row away) still gets its bill.
  const run = { runId: started.runId, callId: started.callId };
  // What the call was billed for, once it returned. Every outcome write after that records it: a
  // failed one, since a refund still burned the tokens, and a late one that finds the run already
  // reaped, since the call billed all the same (`run-store.ts`, `recordLate`).
  // One entry per provider call (a retried run has two), settled together under the one reservation.
  const billed: Billed[] = [];
  const fail = async (
    errorClass: Parameters<typeof finishRun>[1]["errorClass"],
    droppedCount?: number,
    validationReport?: ValidationReport,
  ) => {
    if (await finishRun(run, { status: "failed", errorClass, droppedCount, validationReport }, billed.length > 0 ? billed : undefined)) revalidateDeck(deckId);
    return { ok: true } as const;
  };

  // The model call and everything that settles it run AFTER the response (`after()`), as the Help me
  // choose read does: the request returns once the run holds its unit and its pending row, and the
  // run finishes whether or not the player stays on the page. The panel reads the run until it settles.
  const work = async (): Promise<unknown> => {
    try {
      const profile = await profileOfHead(head);
      const [owned, { overview, universal }] = await Promise.all([
        readOwnedOracleIds(userId, [
          ...profile.cards.map((c) => c.oracleId),
          ...profile.skeleton.staples.map((s) => s.oracleId),
        ]),
        readTuningContext(head),
      ]);
      // "Owned only": the model is shown what the player owns that fits, since it cannot see ownership
      // and otherwise guesses (Soldiers kept no add). When nothing fits the run asks for cards to BUY
      // instead, under the same cap and sets, and says so (`ownedNone`); owned cards still come first
      // whenever any fit.
      const ownedCandidates = limits.ownedOnly
        ? await loadOwnedCandidates({
          userId, deckId, commanderOracleIds: profile.commanderOracleIds, colorIdentity: [...profile.colours.identity],
          inDeck: new Set(profile.cards.map((c) => c.oracleId)), limits,
        })
        : undefined;
      const ownedNone = ownedCandidates !== undefined && ownedCandidates.length === 0;
      const pack = buildEvidencePack({
        profile, play: buildPlayGroup(games), intent, owned, overview, universal, locked: new Set(locked), notes,
        limits: ownedNone ? { ...limits, ownedOnly: false } : limits,
        ownedCandidates: ownedNone ? undefined : ownedCandidates,
        ownedNone,
      });
      const { system, user } = buildPrompt(pack);
      // One ask, and at most one more when the first comes back with nothing to show (a degenerate answer, or
      // every suggestion dropped: model tiering saw 1 in 24 Sonnet 5.5 answers be one word of "skip"). The
      // credit is given back only when the second fails too. The reservation is two attempts of one call: the
      // second ask is made only when the first cost no more than one attempt's worth of it, and gets no retry
      // of its own inside `callModel` (a retry floor it can never meet), so the two stay inside what was set
      // aside. It is made only for a run still pending and when a whole attempt still fits the deadline.
      const startedAt = Date.now();
      let resolved: Awaited<ReturnType<typeof resolveAnswer>>;
      let sized: ReturnType<typeof sizeLists>;
      // How many asks were made: after a second, whatever it kept is spent, never refunded as thin.
      let asked = 1;
      for (let attempt = 1; ; attempt++) {
        const outcome = (attempt === 1 ? await heldStubOutcome() : null) ?? await callModel({
          model: TUNING_MODEL, system, user, maxTokens: TUNING_MAX_TOKENS,
          schema: tuningResponseSchema, deadlineMs: attempt === 1 ? MODEL_TIMEOUT_MS : MODEL_TIMEOUT_MS - (Date.now() - startedAt),
          effort: TUNING_EFFORT, retryFloorMs: attempt === 1 ? TUNING_RETRY_FLOOR_MS : MODEL_TIMEOUT_MS,
        });
        if (outcome.usage) billed.push({ model: TUNING_MODEL, usage: outcome.usage, step: attempt === 1 ? "suggest" : "suggest_retry", effort: TUNING_EFFORT });
        // A rejection is stored as busy here: the distinction is kept for the overview only, for now.
        if (!outcome.ok) return await fail(outcome.errorClass === "upstream_rejected" ? "upstream_busy" : outcome.errorClass);

        resolved = await resolveAnswer({ userId, deckId, pack, response: outcome.value });
        // 6-asked/5-kept in each list (H35, PR 4a; sub-project 8): the first survivors of each list in
        // whatever order the validator already gives — no new ranking pass. Fewer than 5 is shown as-is.
        sized = sizeLists(resolved.kept, MAX_SUGGESTIONS);
        if (sized.length > 0 || attempt === 2) break;
        // A Stop, a deleted deck or the reaper may have settled the run while the first ask was out: no second
        // ask is made for a run that is no longer pending. The first ask's usage is recorded late, as ever.
        if (!(await runIsPending(run.runId))) return await fail("upstream_busy");
        // After that await, so the deadline it measures is the one left now.
        if (!retryable(billed, resolved.drops, Date.now() - startedAt)) break;
        asked = 2;
      }
      const { kept, droppedCount, drops, askedCount } = resolved;
      // An answer too thin to charge for still shows what held up, and gives the credit back. Never an
      // empty one: that is a failure below, refunded the same way, with no suggestions to show.
      const refunded = sized.length > 0 && asked === 1 && refundsCredit(sized.length, askedCount);
      const report: ValidationReport = {
        askedCount, survivedCount: kept.length, keptCount: sized.length, hadNotes: notes !== null, drops,
        ...(ownedNone ? { ownedNone: true as const } : {}),
        ...(refunded ? { refunded: true as const } : {}),
      };
      // F10: every suggestion cut a card the player locked. Its own class, so the empty result says
      // that rather than `ungrounded`'s three causes. Refunded like every failure.
      if (sized.length === 0 && drops.length > 0 && drops.every((d) => d.rule === "neverCut")) {
        return await fail("locked_only", droppedCount, { ...report, refusal: chooseRefusal(drops, limits.capCents) });
      }
      if (sized.length === 0) {
        return await fail("ungrounded", droppedCount, { ...report, refusal: chooseRefusal(drops, limits.capCents) });
      }

      // The bracket flag: shown, never dropped (Hugh, 2026-09-23).
      const flagged = await withBracketAfter(head, profile, declared, sized);
      if (await persistRun(run, flagged, droppedCount, billed, report, refunded ? "refunded" : "spent")) revalidateDeck(deckId);
      return undefined;
    } catch (err) {
      // Nobody is waiting on this request, so a throw is logged, not rethrown; the run is failed and refunded.
      console.error(`[tuning] run ${run.runId} threw after its reservation`, err);
      await fail("upstream_busy").catch(() => undefined);
      return undefined;
    }
  };
  after(work);
  return { ok: true };
}

/**
 * What a surface calls to draw the panel. The Analysis tab has no address, so no route loader
 * can load this only when the panel shows; the panel asks for it. Never builds the profile.
 * Null for a deck that is not the reader's.
 */
export async function readTuningPanel(deckId: string, runId: string | null = null): Promise<TuningState | null> {
  const userId = await requireUserId();
  if (!tuningEnabled() || !isUuid(deckId)) return null;
  const inputs = await tuningInputs(deckId, userId);
  if (!inputs) return null;
  // `runId` is History's re-review: that past run's lines, each re-checked live. Anything that is
  // not a uuid reads as the ordinary panel.
  return readTuningState(deckId, userId, inputs.fingerprint, new Date(), {
    allLocked: inputs.allLocked,
    runId: runId && isUuid(runId) ? runId : null,
  });
}

/** A line of the two lists (one card), as against a pair stored before them: the refusal names a
 *  "change" for the first and a "swap" for the second. Read only on the refusal path. */
async function isLine(itemId: string): Promise<boolean> {
  if (!isUuid(itemId)) return false;
  const [row] = await db
    .select({ add: deckSuggestionItems.addOracleId, cut: deckSuggestionItems.cutOracleId })
    .from(deckSuggestionItems)
    .where(eq(deckSuggestionItems.id, itemId));
  return !!row && (row.add === null || row.cut === null);
}

async function verdict(
  itemId: string,
  write: (userId: string) => Promise<string | null>,
  refused: string | { pair: string; line: string },
  claims: boolean,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  const refuse = async (): Promise<DeckMutationResult> => ({
    ok: false,
    message: typeof refused === "string" ? refused : (await isLine(itemId)) ? refused.line : refused.pair,
  });
  if (!tuningEnabled() || !isUuid(itemId)) return refuse();
  const deckId = await write(userId);
  if (!deckId) return refuse();
  if (claims) revalidateClaims(deckId, userId);
  else revalidateDeck(deckId);
  return { ok: true };
}

export async function applySuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => applyItem(itemId, u), { pair: deckTuningCopy.card.applyRefused, line: deckTuningCopy.lists.applyRefused }, true);
}

export async function undoSuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => undoItem(itemId, u), { pair: deckTuningCopy.card.undoRefused, line: deckTuningCopy.lists.undoRefused }, true);
}

export async function dismissSuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => setDismissed(itemId, u, true), deckTuningCopy.card.verdictRefused, false);
}

export async function restoreSuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => setDismissed(itemId, u, false), deckTuningCopy.card.verdictRefused, false);
}
