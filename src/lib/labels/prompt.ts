// The instruction block sent to both models, and the batch request builder.
//
// IDENTICAL for Haiku and Sonnet, deliberately: the comparison is between models,
// so any prompt difference would confound it.
//
// NO `cache_control`, and that is a MEASUREMENT rather than an omission (Task 3).
//
// Caching here loses money for both models, for two different reasons:
//
//   Haiku    the breakpoint is INERT. The block is ~1,285 tokens by this repo's
//            estimate and 1,215 as BILLED (two different quantities, so both are
//            named), which is under Haiku's minimum cacheable length -- zero writes
//            and zero reads across two identical calls.
//   Sonnet   it engages and still loses. Batch requests run in PARALLEL, so almost
//            none finds a warm cache: 53,277 cache-write tokens and ZERO reads in the
//            committed cost artifact, and 37 writes against 6 reads in an earlier run.
//            At 1.25x to write against 0.1x to read that is $0.0854 against $0.0784
//            uncached -- a 9% LOSS.
//
// Uncached, the block is paid once per BATCH of 12 (one system block per request),
// never once per card, which is why the loss is small either way.
//
// Revisit only if the instruction block grows past ~2,048 tokens AND batches are
// submitted sequentially enough for reads to dominate -- BOTH conditions, not either.
// The figures above are from the block BEFORE the vocabulary plan's Task 3, which grew it
// to 10,177 characters; Task 6 re-measures its billed tokens. That may meet the first
// condition. The second still fails, because batches are still submitted in parallel.
// The breakpoint was left in place through the sample because it was free to leave;
// it is removed now because "free to leave" stops being true the moment a 32,000-card
// run multiplies the write premium by 2,650 batches.
//
// The vocabulary is INLINED from the schema module rather than retyped, so a
// change 2b makes reaches the prompt and the scorer together. A prompt that
// listed jobs by hand would drift from the thing it is scored against, and the
// drift would read as model error.
import { createHash } from "node:crypto";

import { castFaceText } from "../cards/facet";
import {
  AFFECTS, DESTINATIONS, METHODS, RAMP_KINDS, RECURRENCE, ROLES, THEMES, THRESHOLD_OPS, THRESHOLD_STATS, TRIGGERS,
} from "./types";

// `counterspell` is its own role here and is NOT removal, while the app's text classifier
// (`REMOVAL_PATTERNS` in src/lib/recs/roles.ts) still counts `counter target` as removal. The
// difference is deliberate, recorded on both sides: that classifier's removal target of 8 was
// measured with counterspells counted, and a label can name the finer job without moving it.
export const SYSTEM = `You label Magic: the Gathering cards with the JOBS they do and the LIMITS on each job.

A job's KIND is only half the answer. The limits are the point: two cards can both
do "ramp" and both do "+1/+1 counters" and still be nothing like each other. A card
that puts a counter on a Wolf is useless in a Dinosaur deck; a card that makes one
Treasure when it connects in combat is not a land that taps for mana every turn.
Label the limits as carefully as the kind.

ROLES (space "role"): ${ROLES.join(", ")}
  ramp         — accelerates mana. NEVER label a land with ramp; a land's role
                 is "land", even a land that sacrifices itself to search for
                 another. A ritual (one-time mana from a spell) is ramp,
                 rampKind burstMana. Tokens that make mana are ramp. NOT ramp:
                 mana that lasts only until end of combat, untapping your
                 lands, and playing lands from the top of your library.
  draw         — puts cards into your hand from your library. Becoming the
                 monarch is repeatable draw. A tutor is NOT draw.
  removal      — takes an opponent's permanent away from them: destroys,
                 exiles, bounces or shrinks it, or gains control of it.
                 A counterspell, a tapper and hand attack are NOT removal.
  wipes        — hits ALL or most creatures at once ("destroy all creatures",
                 "destroy each creature", "all creatures get -3/-3").
  land         — the card is a land: its type line says Land, and ONLY then. A
                 nonland permanent that adds mana is ramp. Affects self.
  tutor        — searches your library for a card that is NOT a land. A search
                 for a land is ramp (fetchesLand), never tutor.
  counterspell — counters a spell or ability. Its affects is opponents.

THEMES (space "theme"): ${THEMES.join(", ")}
  counters      — +1/+1 counters ONLY. A lore counter, a charge counter, a -1/-1
                  counter and a flying counter are NOT this theme.
  pump          — gives creatures +X/+X or +X/+0, permanently or until end of
                  turn. NOT pump: a keyword grant (double strike, first strike),
                  a +1/+1 counter (that is counters), a penalty (-X/-X, -X/-0,
                  +X/-X), a land or noncreature becoming a creature, and a
                  creature growing only itself from a count. -X/-X on an
                  opponent's creature is removal, method shrink.
  haste         — gives haste.
  evasion       — flying, trample, menace, or can't be blocked.
  etbDraw       — draws a card when a creature enters, its OWN entry included.
                  Label it IN ADDITION to role draw. Drawing when a creature
                  spell is CAST is not etbDraw.
  draw          — cares about drawing: any reward triggered by you drawing
                  ("whenever you draw", "your second card each turn"), whatever
                  the reward is. It is role draw only if cards also go to hand.
  tokens        — creates creature tokens.
  treasure      — creates Treasure tokens. ALWAYS two jobs: this theme AND role
                  ramp, rampKind makesTreasure, an extra Treasure included.
  protection    — hexproof, shroud, indestructible, ward, protection from,
                  regenerate, phasing out, and totem or umbra armor; and
                  giving YOU hexproof or shroud.
  recursion     — returns a card from a graveyard.
  blink         — exiles a permanent and returns it.
  finisher      — ends the game: a large attack, an extra combat, an extra turn,
                  or a win-the-game clause.
  castFree      — casts a spell without paying its mana cost (from hand, exile
                  or itself). Putting a card onto the battlefield is not
                  casting it; exiling a card you may play by paying its cost
                  is not castFree.
  mill          — puts cards from a library into a graveyard. Use affects to say
                  whose library.
  sacOutlet     — a repeatable way to sacrifice OTHER permanents.
  deathTrigger  — does something when ANOTHER creature dies, or whenever any
                  creature dies (an enchanted or equipped creature dying
                  counts). Label it IN ADDITION to the job the death causes:
                  "whenever a creature you control dies, each opponent loses
                  1 life" is deathTrigger AND drain. A card's trigger on its
                  OWN death is not deathTrigger: label the job it does, with
                  trigger "dies".
  lifegain      — gains you life.
  drain         — damage or life loss aimed ONLY at opponents. A burn spell that
                  can hit any target is not drain.
  spellslinger  — rewards casting instants and sorceries, or noncreature
                  spells. "Whenever you cast a spell" alone is not spellslinger.
  landfall      — does something when a land enters under your control. Label
                  it IN ADDITION to the job that trigger does.
  tribal        — cares about one creature type. A job restricted to a
                  creature type (a lord that pumps Elves, a counter only for
                  Knights) ALSO earns tribal, beside the job itself.
  graveyardHate — exiles cards from graveyards, or stops cards leaving them;
                  exiling from an opponent's graveyard counts even when you
                  then use the card.
  discard       — makes a player discard.
  stax          — taxes or locks opponents: their spells cost more, their
                  permanents don't untap, they can't cast or search. Mass land
                  denial (destroy all lands, lands don't untap) is stax.
  clones        — a permanent enters as a copy of another permanent. Making a
                  TOKEN that is a copy is tokens, not clones.
  theft         — gains control of an opponent's permanent or casts an
                  opponent's card.
  poison        — gives poison counters, or infect or toxic.
  goad          — forces a creature to attack ("goad", "attacks each combat if
                  able").
  doublers      — DOUBLES what you get: twice the tokens, twice the counters,
                  twice the damage, or an extra time for each trigger. Twice
                  the MANA is not doublers: it is ramp of kind multiplies. One
                  ADDITIONAL token or counter is not doublers either.
  fog           — prevents combat damage for a turn. A fog is not protection.

Use ONLY these names. Do not invent a job. If a card does something with no job
in this list, say nothing about it. Scry and surveil are NOT jobs. Each separate
ability is its own job, even when two abilities do the same kind; merge only the
clauses of ONE ability.

EVERY JOB CARRIES:
  space        "role" or "theme"
  kind         a name from that space's list
  rampKind     ONLY on a role "ramp" job, one of: ${RAMP_KINDS.join(", ")}
                 tapsForMana  — mana every turn from a permanent's tap ability,
                                an extra cost that does not sacrifice it
                                included; also a token that taps for mana, and
                                mana a permanent makes from its own repeating
                                trigger ("whenever this attacks")
                 fetchesLand  — SEARCHES for a land onto the battlefield or into
                                hand. Landcycling, a land put on TOP of your
                                library, and lands revealed into hand (draw)
                                are not fetchesLand
                 makesTreasure— creates a Treasure token
                 burstMana    — one-time mana from a source the cost consumes
                                (sacrifice this creature/token/land for mana, a
                                Spawn, Scion or Gold token), or a ritual spell.
                                A trigger that creates a Spawn or Scion is
                                burstMana with that trigger; a trigger that
                                adds mana directly is not
                 costReduction— makes OTHER spells you cast cost less. A card
                                that reduces only ITS OWN cost (affinity,
                                improvise, convoke) is not ramp; casting a
                                spell for nothing is castFree; an alternative
                                cost ("rather than pay") lowers no cost.
                 extraLandDrop— lets you play ADDITIONAL lands each turn
                 multiplies   — doubles or adds to mana you already make, or
                                makes mana when something else happens (lands
                                that tap for twice as much; a creature that adds
                                mana whenever an opponent discards)
               These match only themselves. A Treasure is never tapsForMana.
  restrictedTo the creature type or card type the effect is limited to, exactly
               as printed ("Wolf", "Dinosaur", "artifact", "land", "creature"),
               or null when it applies to anything. A job that reaches only a
               creature type, a card type or a subtype (Equipment, Vehicle)
               MUST carry it; two together are joined with "or" ("Dwarf or
               Vehicle"). "creature" too is a restriction: write it.
  affects      whose cards, library, life or mana the job points at: one of
               ${AFFECTS.join(", ")}, or null.
               self      = yours: a mana rock or a Treasure you make, counters
                           on your own creatures, cards you draw, your library.
               opponents = an opponent's. EVERY removal job is opponents, even
                           where the rules would let you target your own
                           permanent: "destroy target creature" is opponents.
               each      = every player, you included: "destroy all
                           creatures", "each player draws a card".
               null      = ONLY when the job points at no player at all,
                           which is rare.
               By job, so the same job always answers the same way, unless
               it does the same for EVERY player, which is each. A symmetric
               effect is each even where it mostly helps you: preventing ALL
               combat damage, a tax on every player's spells, every player
               gaining control of something.
                 self      = clones (the copy is yours), pump, protection,
                             recursion (even from any graveyard), a land.
                 each      = fog, which prevents combat damage to everyone.
                 opponents = removal, counterspell, theft, graveyardHate.
               "Target player" discards, mills or loses life: opponents,
               unless the card plainly means you (a self-mill for value).
               A steal that lasts only until end of turn is theft, not
               removal.
               Mill and discard are where it matters most: "each opponent
               mills" is opponents, "mill three" of your own library is self.
  to           ONLY on a tutor or recursion job, where the card goes: one of
               ${DESTINATIONS.join(", ")}. Returning a creature to the
               battlefield is battlefield; to your hand is hand. A card CAST
               from a graveyard moves to no zone: null. Otherwise null.
  method       ONLY on a removal or wipes job, how it removes: one of
               ${METHODS.join(", ")} ("shrink" = -X/-X or damage). Returning a
               permanent to its owner's HAND is bounce; making a player
               sacrifice one (an edict) is sacrifice; putting it on the bottom
               of its owner's library (a tuck) is bottom. Shuffling it into a
               library, or putting it on top, is null. Gaining control of a
               permanent (theft) has no method: null. Otherwise null.
  trigger      one of: ${TRIGGERS.join(", ")}
                 "none" = static or on resolution; "activated" = a cost you
                 choose to pay; the rest are events you must wait for:
                 "upkeep" = the beginning of an upkeep, and ONLY an upkeep;
                 "landfall" = a land entering; "attacks" = a creature
                 attacking; "combatDamage" = combat damage being dealt;
                 "cast" = a spell being cast; "dies" = a creature dying;
                 "etb" = this or another permanent entering. Any other
                 event or step, the END STEP and beginning of combat
                 included, is "other".
  recurrence   one of: ${RECURRENCE.join(", ")}
                 "oneShot" = the card can do this at most once (an ETB, a spell
                 resolving, a cost that sacrifices the source).
                 "repeatable" = it can happen again.
  threshold    {"stat","op","value"} when a NUMBER gates the job — e.g. a
               "creature spell with mana value 5 or greater" is
               {"stat":"mv","op":">=","value":5}. Otherwise null.
               stat is one of: ${THRESHOLD_STATS.join(", ")}
               op is one of: ${THRESHOLD_OPS.join(" ")} — exactly these strings
  modal        true when this job is ONE OPTION AMONG ALTERNATIVES ("choose one")
               so the card can do this OR another job but not both. false
               otherwise. Two separate triggers are NOT modal.

Return ONLY a JSON array, one object per card, in the order given. Every job
object uses EXACTLY these keys, spelled this way — "space", not "role":

[{"name":"Example Wolf","jobs":[
  {"space":"theme","kind":"counters","restrictedTo":"Wolf","affects":"self","to":null,"method":null,"trigger":"combatDamage","recurrence":"repeatable","threshold":null,"modal":true},
  {"space":"theme","kind":"tribal","restrictedTo":"Wolf","affects":"self","to":null,"method":null,"trigger":"combatDamage","recurrence":"repeatable","threshold":null,"modal":true},
  {"space":"theme","kind":"treasure","restrictedTo":null,"affects":"self","to":null,"method":null,"trigger":"combatDamage","recurrence":"repeatable","threshold":null,"modal":true},
  {"space":"role","kind":"ramp","rampKind":"makesTreasure","restrictedTo":null,"affects":"self","to":null,"method":null,"trigger":"combatDamage","recurrence":"repeatable","threshold":null,"modal":true}
]}]
(An invented card, for the shape only: "Whenever this deals combat damage, choose one:
put a +1/+1 counter on target Wolf you control; or create a Treasure token.")

Omit "rampKind" entirely on any job that is not a role "ramp" job (a null is
accepted there too).
A card with no job in the vocabulary gets "jobs": []. No prose, no markdown fence.`;

/**
 * What the SYSTEM block can cost, in tokens, as a CEILING the build's hard stop is enforced against:
 * ONE TOKEN PER CHARACTER, a provable upper bound since no tokenizer emits more tokens than the string
 * has characters. The measured 1,215 billed tokens was for the block BEFORE Task 2 widened it, and a
 * measurement of an older string is not a bound on this one. It overstates about fourfold, which only
 * shrinks waves and pauses a run sooner; it can never let one spend past its cap. The vocabulary plan's
 * Task 6 re-measures the billed count against a snapshot of SYSTEM and replaces this.
 */
export const SYSTEM_TOKENS_BOUND = SYSTEM.length;

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

/**
 * Whether a request asks for prompt caching. FALSE, for the reason at the top of this file.
 *
 * Exported so the spend estimate reads it from the module that DECIDES it, rather than
 * inferring caching from a model's capability. `PRICING[m].caches` says the model could
 * cache; this says whether we ask. Estimating from capability alone books cache-write
 * tokens no request can generate — and the estimate is what the spend cap binds on, so a
 * figure computed from something nothing holds is exactly the class of bug this run has
 * been finding all day.
 */
export const SENDS_CACHE_BREAKPOINT = false;

/** The user turn exactly as sent, so the estimate can measure the real thing. */
export const renderBody = (cards: CardForPrompt[]) =>
  `Label these ${cards.length} cards.\n\n${cards.map(renderCard).join("\n\n---\n\n")}`;

/**
 * One batch request. The instruction block is the system turn and the per-batch card
 * list is the user turn — no cache breakpoint on either, for the reason at the top of
 * this file.
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
    system: [{ type: "text" as const, text: SYSTEM }],
    messages: [{ role: "user" as const, content: renderBody(cards) }],
  },
});

/**
 * The prompt's version, bumped whenever a change would make a stored label mean something
 * different from what a fresh call would produce.
 *
 * It is in `labelInputHash` below, so a bump marks every row stale and the next build
 * relabels — which costs a full run, and is therefore a deliberate act rather than a
 * side effect of editing a comment.
 *
 * Since the vocabulary plan's Task 3 the SYSTEM prompt is hashed too, so this constant is
 * no longer the only thing standing between a widened vocabulary and labels that predate it:
 * ANY edit to `SYSTEM`, a reworded definition included, marks every row stale. That is the
 * point (a label written against an older instruction is not the label a fresh call makes),
 * and it means a SYSTEM edit is a full run's spend, decided rather than incidental. The
 * version still moves with every SYSTEM edit (pinned in `prompt.test.ts`): it is the human-readable
 * reason a run was owed, and what the label copy reads to tell a prompt change from a catalog one.
 */
// "5": the re-sample's prompt fixes (2026-10-02): triggers defined, deathTrigger and tribal labelled beside
// the job they come with, symmetric effects are each.
// "4": deathTrigger is another creature dying; a card's own death is the job's `dies` trigger (Task 4 review).
// "3": the vocabulary plan's Task 3 vocabulary and definitions. SYSTEM's hash alone already stales
// every row; the version moves with it because `copy-card-labels.ts` reads a version mismatch as "a
// different prompt" and a hash mismatch under an EQUAL version as a catalog difference. A SYSTEM edit
// with no bump would be misreported as the latter, so `prompt.test.ts` pins SYSTEM's hash to this version.
// "2": every job now carries `affects`, `to` and `method` (the vocabulary plan's Task 2), so a row
// labelled under "1" has none of them and must read stale rather than current.
export const LABEL_PROMPT_VERSION = "5";

/**
 * Whether a stored label still describes its card, mirroring `proseInputHash`.
 *
 * A row whose stored hash equals the hash its current inputs produce is SKIPPED and costs
 * nothing, which is what makes the weekly hook nearly free and an interrupted run
 * resumable by being dispatched again.
 *
 * Four things are in the payload and each earns its place:
 *
 * - the ORACLE ID, which is what the row is keyed on;
 * - the NAME and TYPE LINE, because a card errata'd under its existing oracle id leaves a
 *   stored label describing something else — the one case where the id alone says fresh
 *   and the label is not. `proseInputHash` carries the name for the same reason;
 * - the MANA COST, because `renderCard` sends it and a limit is derived from it: a
 *   threshold may carry `stat: "mv"`, so a cost corrected under the same oracle id would
 *   otherwise hash identically, skip, and keep a `mv >= 5` derived from the OLD cost for
 *   ever. This was missed in the first version of this function, whose doc justified the
 *   payload as "what the model is actually sent" while omitting a field that is sent;
 * - the CAST-FACE text rather than the raw column, for the same reason from the other
 *   direction: hashing both faces would mark a row stale whenever a back face changed
 *   without changing anything the label was derived from;
 * - the PROMPT VERSION and the MODEL, so switching either relabels rather than silently
 *   mixing two models' output in one table;
 * - the SYSTEM prompt itself (the vocabulary plan's Task 3), because the vocabulary reached
 *   the hash only through the hand-kept version: widening it without a bump left
 *   old-vocabulary labels reading fresh, and `cardsNeedingLabels` would have skipped them.
 *
 * **The payload is derived from `renderCard`, not assembled beside it.** Anything
 * `renderCard` sends and this omits is a field a card can change under a fixed oracle id
 * while the row is still called fresh — so the two are pinned together by a test that
 * renders a card, mutates each sent field in turn, and requires the hash to move.
 */
export function labelInputHash(card: CardForPrompt & { oracleId: string }, model: string, system: string = SYSTEM): string {
  const payload = JSON.stringify([
    card.oracleId,
    // EXACTLY the string the model is sent, so no sent field can be forgotten here.
    renderCard(card),
    LABEL_PROMPT_VERSION,
    model,
    createHash("sha256").update(system).digest("hex"),
  ]);
  return createHash("sha256").update(payload).digest("hex");
}
