// The instruction block sent to both models, and the batch request builder.
//
// IDENTICAL for Haiku and Sonnet, deliberately: the comparison is between models,
// so any prompt difference would confound it.
//
// A cache_control breakpoint sits at the end of the system block, and MEASUREMENT
// says it is close to worthless here. The block is ~1,285 tokens by this repo's estimate and 1,215 as BILLED (two
// different quantities, so both are named), which is
// under Haiku's minimum cacheable length -- zero writes and zero reads across two
// identical calls -- so for the recommended model it is inert. For Sonnet it
// engages and still loses, because the 43 batch requests run in parallel and almost
// none finds a warm cache. The committed cost artifact records the CURRENT run:
// 53,277 cache-write tokens and ZERO reads for Sonnet, 0 and 0 for Haiku. An earlier
// run measured 37 writes against 6 reads; either way the writes dominate, and at
// 1.25x to write against 0.1x to read that costs more than not caching. Uncached,
// the block is paid once per BATCH of 12 (one system block per request), never once
// per card.
// Retained only because it is free to leave and starts paying if the block grows
// past ~2,048 tokens AND submission is sequenced so reads dominate.
//
// The vocabulary is INLINED from the schema module rather than retyped, so a
// change 2b makes reaches the prompt and the scorer together. A prompt that
// listed jobs by hand would drift from the thing it is scored against, and the
// drift would read as model error.
import { castFaceText } from "../../src/lib/cards/facet";
import { RAMP_KINDS, RECURRENCE, ROLES, THEMES, THRESHOLD_OPS, THRESHOLD_STATS, TRIGGERS } from "./card-labels-schema.mjs";

export const SYSTEM = `You label Magic: the Gathering cards with the JOBS they do and the LIMITS on each job.

A job's KIND is only half the answer. The limits are the point: two cards can both
do "ramp" and both do "+1/+1 counters" and still be nothing like each other. A card
that puts a counter on a Wolf is useless in a Dinosaur deck; a card that makes one
Treasure when it connects in combat is not a land that taps for mana every turn.
Label the limits as carefully as the kind.

ROLES (space "role"): ${ROLES.join(", ")}
  ramp     — accelerates mana. NEVER label a land with ramp; a land's role is "land".
  draw     — puts cards into your hand.
  removal  — destroys, exiles, bounces or shrinks an opponent's permanent.
  wipes    — hits ALL or most creatures at once.
  land     — the card is a land.

THEMES (space "theme"): ${THEMES.join(", ")}
  counters — +1/+1 counters ONLY. A lore counter, a charge counter, a -1/-1
             counter and a flying counter are NOT this theme.
  pump     — gives creatures +X/+X, permanently or until end of turn.
  haste, evasion (flying/trample/menace/unblockable), etbDraw, draw, tokens,
  treasure, protection (hexproof/indestructible/ward/protection from),
  recursion (from graveyard), blink, finisher, castFree (without paying its
  mana cost), mill, sacOutlet (a repeatable outlet for OTHER permanents),
  deathTrigger, lifegain, drain, spellslinger, landfall, tribal.

Use ONLY these names. Do not invent a job. If a card does something with no job
in this list, say nothing about it.

EVERY JOB CARRIES:
  space        "role" or "theme"
  kind         a name from that space's list
  rampKind     ONLY on a role "ramp" job, one of: ${RAMP_KINDS.join(", ")}
                 tapsForMana  — mana every turn from a permanent's tap ability
                 fetchesLand  — searches a land onto the battlefield or into hand
                 makesTreasure— creates a Treasure token
                 burstMana    — one-time mana from a source the cost consumes
                                (sacrifice this creature/token/land for mana)
               These match only themselves. A Treasure is never tapsForMana.
  restrictedTo the creature type or card type the effect is limited to, exactly
               as printed ("Wolf", "Dinosaur", "artifact", "land", "creature"),
               or null when it applies to anything.
  trigger      one of: ${TRIGGERS.join(", ")}
                 "none" = static or on resolution; "activated" = a cost you
                 choose to pay; the rest are events you must wait for.
  recurrence   one of: ${RECURRENCE.join(", ")}
                 "oneShot" = the card can do this at most once (an ETB, a spell
                 resolving, a cost that sacrifices the source).
                 "repeatable" = it can happen again.
  threshold    {"stat","op","value"} when a NUMBER gates the job — e.g. Runadi's
               "creature spell with mana value 5 or greater" is
               {"stat":"mv","op":">=","value":5}. Otherwise null.
               stat is one of: ${THRESHOLD_STATS.join(", ")}
               op is one of: ${THRESHOLD_OPS.join(" ")} — exactly these strings
  modal        true when this job is ONE OPTION AMONG ALTERNATIVES ("choose one")
               so the card can do this OR another job but not both. false
               otherwise. Two separate triggers are NOT modal.

Return ONLY a JSON array, one object per card, in the order given. Every job
object uses EXACTLY these keys, spelled this way — "space", not "role":

[{"name":"Bejeweled Warg","jobs":[
  {"space":"theme","kind":"counters","restrictedTo":"Wolf","trigger":"combatDamage","recurrence":"repeatable","threshold":null,"modal":true},
  {"space":"role","kind":"ramp","rampKind":"makesTreasure","restrictedTo":null,"trigger":"combatDamage","recurrence":"repeatable","threshold":null,"modal":true}
]}]

Omit "rampKind" entirely on any job that is not a role "ramp" job (a null is
accepted there too).
A card with no job in the vocabulary gets "jobs": []. No prose, no markdown fence.`;

type CardForPrompt = {
  name: string; mana_cost: string | null; type_line: string;
  oracle_text: string | null; layout?: string;
};

/**
 * One card as the model sees it.
 *
 * `cards.oracle_text` stores BOTH FACES of a two-faced card, joined by "\n//\n" --
 * `Strength of the Harvest // Haven of the Harvest` carries its land back's
 * "{T}: Add {G} or {W}" in the same string as its Aura front. Sent whole, the model
 * is asked about abilities the card cannot use from the front, against gold labels
 * that are front-face-only: it reads that land ability as ramp and is marked wrong
 * for believing the text it was given.
 *
 * `castFaceText` is this repository's own rule for the cut and is reused rather
 * than reimplemented. It drops the back face for `modal_dfc` and `transform`, which
 * are cast as their front, and keeps BOTH halves for split, adventure and prepare,
 * where both are genuinely castable. The gold set agrees: `Ettercap // Web Shot` is
 * labelled with the removal that lives on its adventure half.
 */
export const renderCard = (c: CardForPrompt) =>
  `${c.name}\n${c.mana_cost || "(no cost)"} | ${c.type_line}\n${castFaceText(c.oracle_text ?? null, c.layout ?? "normal") ?? "(no text)"}`;

/** The user turn exactly as sent, so the estimate can measure the real thing. */
export const renderBody = (cards: CardForPrompt[]) =>
  `Label these ${cards.length} cards.\n\n${cards.map(renderCard).join("\n\n---\n\n")}`;

/**
 * One batch request. `cache_control` sits on the LAST system block so everything
 * above it is cached; the per-batch card list goes in the user turn, below the
 * breakpoint, where it is not.
 */
/**
 * The output ceiling for one batch. EXPORTED because the spend estimate has to bind
 * on it: a hardcoded copy in the estimator means raising this doubles what the
 * requests permit while the cap still books the old figure.
 *
 * `LABEL_MAX_TOKENS` lowers it for a run whose PRICE is not known. The spend cap binds
 * on the worst case -- this ceiling x batches x the output rate -- so with an unpriced
 * model shrinking the ceiling is the only way to keep the cap meaningful.
 *
 * **4,000 is the working floor for a model with thinking enabled, and 3,000 is not.**
 * Measured output is 125-136 tokens a card across the three models (Haiku 125, Sonnet
 * 4.5 132, Sonnet 5 136), or ~1,650 a batch of 12, which makes 3,000 look like ample
 * headroom and it is -- for the COMPLETION. It is not headroom for reasoning: Sonnet 5
 * has adaptive thinking on by default and spent 2,999 of a 3,000 ceiling on it,
 * returning no labels at all and costing $1.0367 for nothing. So a ceiling under 4,000
 * is safe only with `thinking: {type: "disabled"}`, which `buildRequest` sets.
 */
export const MAX_TOKENS_PER_BATCH = (() => {
  const raw = process.env.LABEL_MAX_TOKENS;
  if (raw === undefined || raw === "") return 8000;
  const n = Number(raw);
  // NaN is the dangerous case, not the obvious one: it makes `worstTotal` NaN, and
  // `NaN > CAP_USD` is FALSE, so the spend guard waves the run through and the request
  // carries an invalid `max_tokens`. A bad ceiling has to refuse before submission.
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`LABEL_MAX_TOKENS must be a positive whole number of tokens, got "${raw}"`);
  }
  return n;
})();

/**
 * Whether a model still accepts `temperature`. Measured, not guessed: Sonnet 5 answers
 * 400 with "`temperature` is deprecated for this model", while Haiku 4.5 and Sonnet 4.5
 * accept 0. A list rather than a pattern, so a new model is a deliberate addition.
 */
export const acceptsTemperature = (model: string) => model !== "claude-sonnet-5";

/**
 * Models whose thinking must be turned OFF explicitly, and why it is not optional here.
 *
 * Sonnet 5 thinks ADAPTIVELY by default. Measured 2026-09-26: a trivial prompt used 0
 * thinking tokens, and this labelling prompt used 2,999 of a 3,000 output budget and
 * emitted a single `thinking` block with no text at all — 42 of 43 batch requests hit
 * `max_tokens` and the run produced 5 card objects out of 508. That cost $1.0367 for
 * nothing.
 *
 * Disabling it is also what makes the comparison fair: neither Haiku 4.5 nor Sonnet 4.5
 * thinks, so a thinking Sonnet 5 would be a different kind of run, not a faster one.
 * `{type:"enabled", budget_tokens}` is rejected for this model — it wants
 * `adaptive` with `output_config.effort` — so `disabled` is the only way to match.
 */
export const needsThinkingDisabled = (model: string) => model === "claude-sonnet-5";

export const buildRequest = (customId: string, model: string, cards: CardForPrompt[]) => ({
  custom_id: customId,
  params: {
    model,
    max_tokens: MAX_TOKENS_PER_BATCH,
    // Deterministic WHERE THE MODEL ACCEPTS IT, so a re-run of the same batch is
    // comparable and the difference between models is not partly sampling noise.
    //
    // `claude-sonnet-5` REJECTS the parameter -- "`temperature` is deprecated for this
    // model", HTTP 400, measured 2026-09-26 -- so it is omitted there and that model
    // runs at its default sampling. The consequence is stated wherever its figures
    // are: the comparison is matched on prompt, batching and scorer but NOT on
    // temperature, which is a real caveat rather than a formality.
    ...(acceptsTemperature(model) ? { temperature: 0 } : {}),
    ...(needsThinkingDisabled(model) ? { thinking: { type: "disabled" as const } } : {}),
    system: [{ type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user" as const, content: renderBody(cards) }],
  },
});
