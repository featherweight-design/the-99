// The instruction block sent to both models, and the batch request builder.
//
// IDENTICAL for Haiku and Sonnet, deliberately: the comparison is between models,
// so any prompt difference would confound it. It is also CACHED -- one
// cache_control breakpoint at the end of the system block -- because the block is
// ~1.5k tokens and is resent for every batch. Over the full run (~32k cards) that
// is the difference between paying for the instructions once per batch and once
// per card.
//
// The vocabulary is INLINED from the schema module rather than retyped, so a
// change 2b makes reaches the prompt and the scorer together. A prompt that
// listed jobs by hand would drift from the thing it is scored against, and the
// drift would read as model error.
import { RAMP_KINDS, RECURRENCE, ROLES, THEMES, THRESHOLD_STATS, TRIGGERS } from "./card-labels-schema.mjs";

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
  modal        true when this job is ONE OPTION AMONG ALTERNATIVES ("choose one")
               so the card can do this OR another job but not both. false
               otherwise. Two separate triggers are NOT modal.

Return ONLY a JSON array, one object per card, in the order given. Every job
object uses EXACTLY these keys, spelled this way — "space", not "role":

[{"name":"Bejeweled Warg","jobs":[
  {"space":"theme","kind":"counters","restrictedTo":"Wolf","trigger":"combatDamage","recurrence":"repeatable","threshold":null,"modal":true},
  {"space":"role","kind":"ramp","rampKind":"makesTreasure","restrictedTo":null,"trigger":"combatDamage","recurrence":"repeatable","threshold":null,"modal":true}
]}]

Omit "rampKind" entirely on any job that is not a role "ramp" job.
A card with no job in the vocabulary gets "jobs": []. No prose, no markdown fence.`;

/** One card as the model sees it. Front face only, as the text rules read. */
export const renderCard = (c) =>
  `${c.name}\n${c.mana_cost || "(no cost)"} | ${c.type_line}\n${c.oracle_text ?? "(no text)"}`;

/**
 * One batch request. `cache_control` sits on the LAST system block so everything
 * above it is cached; the per-batch card list goes in the user turn, below the
 * breakpoint, where it is not.
 */
export const buildRequest = (customId, model, cards) => ({
  custom_id: customId,
  params: {
    model,
    max_tokens: 8000,
    // Deterministic, so a re-run of the same batch is comparable. A sampled run
    // would make the Haiku/Sonnet difference partly noise.
    temperature: 0,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Label these ${cards.length} cards.\n\n${cards.map(renderCard).join("\n\n---\n\n")}` }],
  },
});
