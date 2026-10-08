"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import { db } from "../../db";
import { cards, decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
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
import { tuningEnabled } from "../../lib/tuning/flag";
import { gateReason } from "../../lib/tuning/gate";
import { intentTooLong, MAX_SUGGESTIONS, MODEL_TIMEOUT_MS, TUNING_EFFORT, TUNING_MAX_TOKENS, TUNING_MODEL, TUNING_RETRY_FLOOR_MS } from "../../lib/tuning/limits";
import { MAX_BUDGET_DOLLARS, MAX_SETS } from "../../lib/intake/answers";
import { buildPrompt } from "../../lib/tuning/prompt";
import { tuningResponseSchema } from "../../lib/tuning/response-schema";
import { cancelRun, finishRun, persistRun, saveIntent, startRun, type Billed } from "../../lib/tuning/run-store";
import type { TuningState } from "../../lib/tuning/state";
import { nameResolver } from "../../lib/tuning/resolve-names";
import { chooseRefusal, validateSuggestions, type ValidationReport } from "../../lib/tuning/validate";
import { loadPrices } from "../../lib/decks/price-query";
import { loadAvailability } from "../../lib/decks/availability-query";
import { priceOf, priceState } from "../../lib/decks/price";
import { printedIn } from "../../lib/sets/printed-in";
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
 * seeded. Checked the same way `lookDeeper`'s `budgetDollars` validates help-me-choose's cap:
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
  // The panel names its run so its Stop can cancel that run and no other. Anything but a uuid is
  // refused rather than dropped: a Stop keyed on an id the row does not carry could never land.
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
  const trimmedNotes = rawNotes === undefined ? null : rawNotes.trim();
  if (trimmedNotes !== null && countCharacters(trimmedNotes) > deckDescriptionCopy.notes.maxLength) {
    return { ok: false, message: deckTuningCopy.run.refused };
  }
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
  // Stopped or reaped, since the call billed all the same (`run-store.ts`, `recordLate`).
  let billed: Billed | undefined;
  const fail = async (
    errorClass: Parameters<typeof finishRun>[1]["errorClass"],
    droppedCount?: number,
    validationReport?: ValidationReport,
  ) => {
    if (await finishRun(run, { status: "failed", errorClass, droppedCount, validationReport }, billed)) revalidateDeck(deckId);
    return { ok: true } as const;
  };

  try {
    const profile = await profileOfHead(head);
    const [owned, { overview, universal }] = await Promise.all([
      readOwnedOracleIds(userId, [
        ...profile.cards.map((c) => c.oracleId),
        ...profile.skeleton.staples.map((s) => s.oracleId),
      ]),
      readTuningContext(head),
    ]);
    const pack = buildEvidencePack({
      profile, play: buildPlayGroup(games), intent, owned, overview, universal, locked: new Set(locked), limits, notes,
    });
    const { system, user } = buildPrompt(pack);
    const outcome = await callModel({
      model: TUNING_MODEL, system, user, maxTokens: TUNING_MAX_TOKENS,
      schema: tuningResponseSchema, deadlineMs: MODEL_TIMEOUT_MS,
      effort: TUNING_EFFORT, retryFloorMs: TUNING_RETRY_FLOOR_MS,
    });
    if (outcome.usage) billed = { model: TUNING_MODEL, usage: outcome.usage };
    // A rejection is stored as busy here: the distinction is kept for the overview only, for now.
    if (!outcome.ok) return await fail(outcome.errorClass === "upstream_rejected" ? "upstream_busy" : outcome.errorClass);

    const askedCount = outcome.value.suggestions.length;
    // One catalog read of every name the model returned; injected so validate.ts stays pure.
    const names = [...new Set(outcome.value.suggestions.flatMap((s) => [s.add, s.cut]))];
    const nameRows = names.length === 0 ? [] : await db
      .select({
        oracleId: cards.oracleId,
        name: cards.name,
        colorIdentity: cards.colorIdentity,
        commanderLegal: cards.commanderLegal,
        // Decision 9's rule (`printedIn`, src/lib/sets/printed-in.ts): any printing in the
        // selection, folding to `true` when the player set no Set limit at all.
        printedInSelectedSets: sql<boolean>`${printedIn(cards.oracleId, limits.sets)}`,
      })
      .from(cards)
      .where(inArray(cards.name, names));
    // "Kept for this deck" (H35, PR 4a): the SAME two reads the buy tag and a fill's
    // `pool: "sleeveable"` already use, scoped to the model's own named cards — the pack-time
    // `owned` set above only covers cards already in the deck or in the skeleton's staples, never
    // a genuinely new suggestion.
    // Read only while a cap is active: review round 3 found that, unlike the ownership read
    // alongside it, this figure is NEVER displayed either — the buy tag re-reads its own prices
    // independently (`readItems`, tuning-read.ts) — so an inactive cap has no consumer to protect
    // (round 1's own comment was wrong about that). A price-read failure must still never go
    // silent while a cap IS active: swallowing it turns every candidate's price into null, and
    // the validator deliberately exempts a null price from the cap (never dropped for a cap it
    // cannot be checked against) — so a transient failure would silently disable the cap rather
    // than refuse the run.
    const suggestedIds = nameRows.map((r) => r.oracleId);
    const [{ prices, newestAsOf }, suggestedOwned, availability] = await Promise.all([
      limits.capCents === null ? { prices: new Map(), newestAsOf: null } : loadPrices(suggestedIds),
      // Read only while the owned-only filter is active: unlike price, `owned` here is never
      // displayed, only checked (`notOwned`), so an inactive filter has no consumer to protect.
      // A failure would otherwise refund a paid, otherwise-valid answer over a read nothing needs.
      nameRows.length === 0 || !limits.ownedOnly ? new Set<string>() : readOwnedOracleIds(userId, suggestedIds),
      // SLEEVEABLE MEANS SLEEVEABLE (review round 6, same rule as `fill.ts`'s `pool:
      // "sleeveable"`): a collection row is owned whether or not a copy is FREE. Without this, a
      // card whose every copy is already claimed by another deck would pass "owned" and the
      // reader's own client would strip the applied swap on arrival. Fails closed (no `.catch`)
      // while the filter is active, same as the cap and the price read above it.
      nameRows.length === 0 || !limits.ownedOnly ? new Map() : loadAvailability(userId, { oracleIds: suggestedIds, excludeDeckId: deckId }),
    ]);
    const rows = nameRows.map((r) => {
      const fact = prices.get(r.oracleId) ?? null;
      const state = priceState(fact, newestAsOf);
      const avail = availability.get(r.oracleId);
      return {
        ...r,
        priceCents: fact ? priceOf(fact, state) : null,
        owned: suggestedOwned.has(r.oracleId) && (avail === undefined || avail.free > 0),
      };
    });
    const resolveName = nameResolver(rows, new Set(pack.cards.map((c) => c.oracleId)));

    const { kept, droppedCount, drops } = validateSuggestions({ response: outcome.value, pack, resolveName });
    // 8-asked/5-kept (H35, PR 4a): the first survivors in whatever order the validator already
    // gives — no new ranking pass, no retry, no second model call. Fewer than 5 is shown as-is.
    const sized = kept.slice(0, MAX_SUGGESTIONS);
    const report: ValidationReport = { askedCount, survivedCount: kept.length, keptCount: sized.length, hadNotes: notes !== null, drops };
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
    if (await persistRun(run, flagged, droppedCount, billed, report)) revalidateDeck(deckId);
    return { ok: true };
  } catch (err) {
    await fail("upstream_busy");
    throw err;
  }
}

/** Stop: the run the panel was watching, by id, so a late press cannot cancel the next one. */
export async function cancelTuningRun(deckId: string, runId: string): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!tuningEnabled() || !isUuid(deckId) || !isUuid(runId)) return { ok: true };
  if (await cancelRun(runId, deckId, userId)) revalidateDeck(deckId);
  return { ok: true };
}

/**
 * What a surface calls to draw the panel. The Analysis tab has no address, so no route loader
 * can load this only when the panel shows; the panel asks for it. Never builds the profile.
 * Null for a deck that is not the reader's.
 */
export async function readTuningPanel(deckId: string): Promise<TuningState | null> {
  const userId = await requireUserId();
  if (!tuningEnabled() || !isUuid(deckId)) return null;
  const inputs = await tuningInputs(deckId, userId);
  if (!inputs) return null;
  return readTuningState(deckId, userId, inputs.fingerprint, new Date(), { allLocked: inputs.allLocked });
}

async function verdict(
  itemId: string,
  write: (userId: string) => Promise<string | null>,
  refused: string,
  claims: boolean,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!tuningEnabled() || !isUuid(itemId)) return { ok: false, message: refused };
  const deckId = await write(userId);
  if (!deckId) return { ok: false, message: refused };
  if (claims) revalidateClaims(deckId, userId);
  else revalidateDeck(deckId);
  return { ok: true };
}

export async function applySuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => applyItem(itemId, u), deckTuningCopy.card.applyRefused, true);
}

export async function undoSuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => undoItem(itemId, u), deckTuningCopy.card.undoRefused, true);
}

export async function dismissSuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => setDismissed(itemId, u, true), deckTuningCopy.card.verdictRefused, false);
}

export async function restoreSuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => setDismissed(itemId, u, false), deckTuningCopy.card.verdictRefused, false);
}
