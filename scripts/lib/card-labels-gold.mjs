// THE GOLD SET: hand-labelled against oracle text, one entry per card.
//
// Hand-made and weighted to the hard cases, both deliberate. A random 100 of
// 31,830 is mostly vanilla creatures every classifier agrees on, and would report
// a high agreement rate that says nothing about the false matches this lane
// exists to explain. The classes are 2b's list of what the text rules get wrong,
// plus an `easy` tail so a model that OVER-labels a simple card is caught.
//
// `why` is the reasoning for the label, per d9's ask. Where a label is a judgement
// rather than a reading, the why says so -- those are the rows to argue with.
//
// NOT EXACTLY REPRODUCIBLE from `label-cards-select.mjs`, and the selector's header
// says which four rows and why: they were labelled before that file's
// case-sensitivity and ordering fixes, and the fixed queries no longer surface them.
// This file is the authority on what was labelled.
//
// LABELLED AGAINST THE VOCABULARY'S INTENT, NOT AGAINST ITS REGEXES. The text
// rules are SCORED against this file, so mimicking them would make the baseline
// score 100% by construction and measure nothing. Two consequences worth knowing:
//   - `counters` means +1/+1 counters, per the Theme rule's own definition. A lore
//     counter, a -1/-1 counter and a flying counter are NOT this theme, and a
//     model that labels them is wrong.
//   - `ramp` is never a land's job. `classifyRoles` gives a land the `land` role
//     and skips ramp entirely (`!isLand`), so a land that taps for mana is `land`.
//     That is the role's intent -- every deck plays lands -- not a rule artefact.
import { validateJob } from "./card-labels-schema.mjs";

/**
 * One job. `tr` trigger, `rec` recurrence, `to` restrictedTo, `th` threshold,
 * `rk` rampKind (required on role:ramp, may be null meaning no kind fits).
 */
const j = (space, kind, o = {}) => {
  const job = {
    space, kind,
    restrictedTo: o.to ?? null,
    trigger: o.tr ?? "none",
    recurrence: o.rec ?? "repeatable",
    threshold: o.th ?? null,
    modal: o.modal ?? false,
  };
  if ("rk" in o) job.rampKind = o.rk;
  return job;
};
const mv = (n, op = ">=") => ({ stat: "mv", op, value: n });

export const GOLD = [
  // ---- the cards the brief names -------------------------------------------
  {
    name: "Bejeweled Warg", klass: "named",
    jobs: [
      j("theme", "counters", { to: "Wolf", tr: "combatDamage", modal: true }),
      j("theme", "treasure", { tr: "combatDamage", modal: true }),
      j("role", "ramp", { rk: "makesTreasure", tr: "combatDamage", modal: true }),
    ],
    why: "The false match itself. Counters go on a WOLF only, and the deck that matched was Dinosaurs. The ramp is a Treasure on combat damage, where Runadi taps for {G}. Both jobs are MODAL — 'choose one' — so it never does both, and a consumer that sums them credits it with more than it can do. Repeatable, though: each combat hit triggers again.",
  },
  {
    name: "Generator Servant", klass: "named",
    jobs: [
      j("role", "ramp", { rk: "burstMana", tr: "activated", rec: "oneShot" }),
      j("theme", "haste", { to: "creature", tr: "activated", rec: "oneShot" }),
    ],
    why: "rampKind burstMana: a one-shot burst fit none of E1's ORIGINAL three kinds, which this card is how we found out — not tapsForMana (gone after one use), not fetchesLand, not makesTreasure (no token; the mana is added directly). Raised with 2b, ruled by d9 on 2026-09-25 as a fourth kind. oneShot because the ability sacrifices the creature — the distinction the brief names. Haste is conditional twice over: only if that mana is spent, and only on a creature spell.",
  },
  {
    name: "Runadi, Behemoth Caller", klass: "named",
    jobs: [
      j("theme", "counters", { to: "creature", tr: "cast", th: mv(5) }),
      j("theme", "haste", { to: "creature", th: { stat: "counters", op: ">=", value: 3 } }),
      j("role", "ramp", { rk: "tapsForMana", tr: "activated" }),
    ],
    why: "The other half of the false match. Counters are unrestricted by TYPE but gated by a THRESHOLD (MV 5+) and arrive on cast. Ramp is a repeatable tap for {G} — tapsForMana, which is why a Treasure-maker must not match it. Haste is static, gated on 3+ counters.",
  },

  // ---- restrictedCounter: the Warg's shape, a counter limited to a type -----
  {
    name: "Captain Storm, Cosmium Raider", klass: "restrictedCounter",
    jobs: [j("theme", "counters", { to: "Pirate", tr: "etb" })],
    why: "Counter restricted to Pirate, triggered by an artifact entering. Useless in a deck that plays no Pirates, which is the Warg case exactly.",
  },
  {
    name: "Deeproot Elite", klass: "restrictedCounter",
    jobs: [j("theme", "counters", { to: "Merfolk", tr: "etb" })],
    why: "Merfolk-restricted, and the trigger is ALSO Merfolk-gated ('whenever another Merfolk you control enters'), so it is doubly tribal.",
  },
  {
    name: "Jade Guardian", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { to: "Merfolk", tr: "etb", rec: "oneShot" }),
      j("theme", "protection", { to: "creature" }),
    ],
    why: "oneShot: an ETB on a creature happens once. Hexproof on itself is the protection theme.",
  },
  {
    name: "Venerable Knight", klass: "restrictedCounter",
    jobs: [j("theme", "counters", { to: "Knight", tr: "dies", rec: "oneShot" })],
    why: "Knight-restricted, and it has to DIE first — a trigger the controller does not choose. oneShot for the same reason.",
  },
  {
    name: "Stromkirk Bloodthief", klass: "restrictedCounter",
    jobs: [j("theme", "counters", { to: "Vampire", tr: "upkeep" })],
    why: "Vampire-restricted, on a turn-based trigger with a further condition (an opponent lost life). Repeatable, once a turn at most.",
  },
  {
    name: "Green Goblin, Nemesis", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { to: "Goblin", tr: "other" }),
      j("theme", "treasure", { tr: "other" }),
      j("role", "ramp", { rk: "makesTreasure", tr: "other" }),
      j("theme", "evasion", { to: "creature" }),
    ],
    why: "Two separate discard triggers, not modal: a nonland discard gives a Goblin a counter, a land discard makes a Treasure. Both conditional on discarding. Flying on itself is evasion.",
  },
  {
    name: "Lady Spider, Maybelle Reilly", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { to: "Spider", tr: "other" }),
      j("theme", "evasion", { to: "creature" }),
    ],
    why: "Spider-restricted, on discard. Reach is evasion-adjacent on itself.",
  },
  {
    name: "Talion's Messenger", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { to: "Faerie", tr: "attacks" }),
      j("theme", "draw", { tr: "attacks" }),
      j("role", "draw", { tr: "attacks" }),
      j("theme", "evasion", { to: "creature" }),
    ],
    why: "Faerie-restricted counter, and the trigger needs Faeries attacking. The draw is a loot (draw then discard) and still a draw.",
  },
  {
    name: "Omnath, Locus of the Roil", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { to: "Elemental", tr: "landfall" }),
      j("theme", "landfall"),
      j("role", "removal", { tr: "etb", rec: "oneShot" }),
    ],
    why: "Elemental-restricted counter on landfall. The ETB damage is removal, scaled by Elementals — a threshold in effect but not a gate, so no threshold recorded.",
  },
  {
    name: "Keldon Warcaller", klass: "restrictedCounter",
    jobs: [],
    why: "A HARD NEGATIVE. A LORE counter on a Saga is not the `counters` theme, whose rule and meaning are +1/+1 counters. Any model labelling this `counters` is wrong, and the text rule correctly does not fire.",
  },
  {
    name: "Sigurd, Jarl of Ravensthorpe", klass: "restrictedCounter",
    jobs: [
      j("theme", "evasion", { to: "creature" }),
      j("theme", "counters", { to: "creature", tr: "other" }),
    ],
    why: "Lore counters again are not `counters` — but this one ALSO puts +1/+1 counters when a Saga gets a lore counter, so the theme is genuinely present by a different clause. Trample/lifelink on itself. A card designed to catch a lazy negative.",
  },
  {
    name: "Clash of the Eikons", klass: "restrictedCounter",
    jobs: [],
    why: "A HARD NEGATIVE twice over: the lore counter is not `counters`, and the fight clause targets a creature YOU control as well as an opponent's, so it is not clean removal either. 'Choose one or more' also makes its clauses modal-ish rather than a sum.",
  },
  // ---- tribalStatic: a lord restricting to a type, not "target X you control" --
  {
    name: "Achilles Davenport", klass: "tribalStatic",
    jobs: [j("theme", "pump", { to: "Assassin" }), j("theme", "evasion", { to: "creature" })],
    why: "Static lord restricted to Assassins. Menace on itself is evasion.",
  },
  {
    name: "Adeliz, the Cinder Wind", klass: "tribalStatic",
    jobs: [
      j("theme", "pump", { to: "Wizard", tr: "cast", rec: "oneShot" }),
      j("theme", "spellslinger", { tr: "cast" }),
      j("theme", "evasion", { to: "creature" }),
      j("theme", "haste", { to: "creature" }),
    ],
    why: "Wizard-restricted pump, and oneShot per trigger (until end of turn) rather than static — the temporary-versus-permanent distinction a stand-in should not flatten.",
  },
  {
    name: "Admiral Beckett Brass", klass: "tribalStatic",
    jobs: [j("theme", "pump", { to: "Pirate" }), j("role", "removal", { to: "permanent", tr: "upkeep" })],
    why: "Pirate lord. The end-step theft needs THREE Pirates to have connected — a condition no text rule expresses, and closer to removal than anything else in the vocabulary.",
  },
  {
    name: "Liliana's Devotee", klass: "tribalStatic",
    jobs: [j("theme", "pump", { to: "Zombie" }), j("theme", "tokens", { tr: "upkeep" })],
    why: "Zombie lord, +1/+0 only. Token needs a creature to have died and {1}{B} paid.",
  },
  {
    name: "Sigarda, Heron's Grace", klass: "tribalStatic",
    jobs: [
      j("theme", "protection", { to: "Human" }),
      j("theme", "tokens", { tr: "activated" }),
      j("theme", "evasion", { to: "creature" }),
    ],
    why: "Hexproof restricted to Humans (and the controller). Not a pump — protection.",
  },
  {
    name: "Depala, Pilot Exemplar", klass: "tribalStatic",
    jobs: [j("theme", "pump", { to: "Dwarf" }), j("theme", "pump", { to: "Vehicle" })],
    why: "TWO restricted pumps with different types, one a creature type and one a CARD type. The schema's single-string restrictedTo holds because they are separate jobs.",
  },
  {
    name: "Belle of the Brawl", klass: "tribalStatic",
    jobs: [j("theme", "pump", { to: "Knight", tr: "attacks", rec: "oneShot" }), j("theme", "evasion", { to: "creature" })],
    why: "Knight-restricted, only on attack, only until end of turn.",
  },
  {
    name: "The Odd Acorn Gang", klass: "tribalStatic",
    jobs: [j("theme", "pump", { to: "Squirrel", tr: "activated" }), j("theme", "evasion", { to: "creature" })],
    why: "Grants Squirrels an activated pump ability — restricted twice, to Squirrels granting and Squirrels targeted.",
  },
  {
    name: "Midnight Mayhem", klass: "tribalStatic",
    jobs: [
      j("theme", "tokens", { rec: "oneShot" }),
      j("theme", "evasion", { to: "Gremlin", rec: "oneShot" }),
      j("theme", "lifegain", { to: "Gremlin", rec: "oneShot" }),
      j("theme", "haste", { to: "Gremlin", rec: "oneShot" }),
    ],
    why: "A sorcery, so every job is oneShot. The keyword grant is Gremlin-restricted — and it makes the Gremlins itself, so the restriction is self-satisfied, which a naive reader would call a limitation and a player would not.",
  },
  {
    name: "Call the Spirit Dragons", klass: "tribalStatic",
    jobs: [j("theme", "protection", { to: "Dragon" }), j("theme", "counters", { to: "Dragon", tr: "upkeep" })],
    why: "Dragon-restricted indestructible and Dragon-restricted counters.",
  },
  {
    name: "Suki, Kyoshi Captain", klass: "tribalStatic",
    jobs: [j("theme", "pump", { to: "Warrior" }), j("theme", "pump", { to: "Warrior", tr: "activated", rec: "oneShot" })],
    why: "Warrior lord plus a Warrior-restricted activated double strike, itself limited to ATTACKING Warriors.",
  },
  {
    name: "Vexilus Praetor", klass: "tribalStatic",
    jobs: [j("theme", "protection", { to: "Commander" }), j("theme", "evasion", { to: "creature" })],
    why: "Restricted to Commanders — not a creature type at all but a game role, which is why restrictedTo is a free string rather than an enum of creature types.",
  },
  {
    name: "Valiant Veteran", klass: "tribalStatic",
    jobs: [j("theme", "pump", { to: "Soldier" }), j("theme", "counters", { to: "Soldier", tr: "activated", rec: "oneShot" })],
    why: "Soldier lord; the graveyard ability is oneShot (exiles itself) and Soldier-restricted.",
  },
  {
    name: "Thrumming Hivepool", klass: "tribalStatic",
    jobs: [
      j("theme", "haste", { to: "Sliver" }), j("theme", "evasion", { to: "Sliver" }),
      j("theme", "tokens", { tr: "upkeep" }),
    ],
    why: "Sliver-restricted grants. Double strike is not in the vocabulary, so only haste is recorded — a vocabulary gap rather than a labelling choice.",
  },
  {
    name: "Aeronaut Admiral", klass: "tribalStatic",
    jobs: [j("theme", "evasion", { to: "Vehicle" }), j("theme", "evasion", { to: "creature" })],
    why: "Flying granted only to VEHICLES — a card type, and worthless in a deck with none. Its own flying is separate.",
  },

  // ---- conditionalMana: one-shot or gated mana, against a repeatable tap ------
  {
    name: "Blood Pet", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "burstMana", tr: "activated", rec: "oneShot" }), j("theme", "sacOutlet", { tr: "activated", rec: "oneShot" })],
    why: "The Generator Servant shape at its simplest, and the reason the kind gap is a class and not a curiosity: sacrifice itself for {B}. No kind fits.",
  },
  {
    name: "Azorius Cluestone", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", tr: "activated" }), j("theme", "draw", { tr: "activated", rec: "oneShot" }), j("role", "draw", { tr: "activated", rec: "oneShot" })],
    why: "A TRUE tapsForMana — repeatable, from a permanent's tap. The draw consumes the rock, so the two jobs differ in recurrence on one card.",
  },
  {
    name: "Jeskai Banner", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", tr: "activated" }), j("theme", "draw", { tr: "activated", rec: "oneShot" }), j("role", "draw", { tr: "activated", rec: "oneShot" })],
    why: "Same shape as the Cluestone; kept as a duplicate class member so a model cannot score well by memorising one card.",
  },
  {
    name: "Incubator Drone", klass: "conditionalMana",
    jobs: [j("theme", "tokens", { tr: "etb", rec: "oneShot" }), j("role", "ramp", { rk: "burstMana", tr: "etb", rec: "oneShot" }), j("theme", "sacOutlet", { tr: "etb", rec: "oneShot" })],
    why: "The ramp is INDIRECT — the token sacrifices for {C}, the Drone never adds mana itself. A reader tracking only the Drone's own text sees no ramp at all; a player counts it.",
  },
  {
    name: "Kessig Naturalist // Lord of the Ulvenwald", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", tr: "attacks" })],
    why: "Mana on ATTACK. Labelled `burstMana`/`oneShot` at first, on the reasoning that it is not a tap and makes no Treasure — WRONG against E1's ratified kinds (2026-09-26). One-shot means the source is CONSUMED making the mana: sacrifice this, an instant or sorcery, an entering trigger, a Gold token. An attack trigger is none of those and the creature survives, so this is repeatable mana from the permanent's own ability. `rampKinds` in src/lib/swaps/honest.ts returns [\"tapsForMana\"], checked directly.",
  },
  {
    name: "The Mana Rig", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", tr: "cast" })],
    why: "A Powerstone is Treasure-adjacent but is NOT a Treasure (it cannot pay for spells generally), so `makesTreasure` would be false — but `burstMana` was wrong too. E1 names the Powerstone explicitly under taps for mana, because it taps every turn; the source is not consumed. `rampKinds` returns [\"tapsForMana\"], checked directly.",
  },
  {
    name: "Sorcerer Class", klass: "conditionalMana",
    jobs: [j("theme", "draw", { tr: "etb", rec: "oneShot" }), j("role", "draw", { tr: "etb", rec: "oneShot" }), j("role", "ramp", { rk: "tapsForMana", tr: "activated" })],
    why: "The ramp exists only at LEVEL 2 — a cost gate no text rule reads, and the mana is granted to creatures rather than produced by the Class.",
  },
  {
    name: "Dora Milaje Elite", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", tr: "etb" })],
    why: "Gated on an opponent controlling MORE LANDS — a condition about the board, not the card. The Vibranium token reads `{T}: Add {C}` — a repeatable tap, nothing consumed — which is the POWERSTONE shape and therefore `tapsForMana` under E1's kinds, not a burst. Labelled `burstMana`/`oneShot` at first and corrected 2026-09-26 in the same sweep as The Mana Rig; it was the sibling that sweep missed on its first pass.",
  },
  {
    name: "Gatewatch Beacon", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", tr: "activated" })],
    why: "Taps for {W} repeatably, but it spends loyalty counters — finite, though not one-shot. The schema has no field for a resource limit, which is a real gap worth reporting.",
  },
  {
    name: "Wandertale Mentor", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", tr: "activated" }), j("theme", "counters", { tr: "other" })],
    why: "A clean dork: repeatable tap for {R} or {G}. Counters on itself only, gated on 'expend 4'.",
  },
  {
    name: "Lavabrink Floodgates", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", tr: "activated" }), j("role", "wipes", { tr: "upkeep", rec: "oneShot" })],
    why: "Taps for {R}{R}. The doom-counter clause destroys ALL creatures — a wipe on a timer any opponent can influence.",
  },
  {
    name: "Quintorius Kand", klass: "conditionalMana",
    jobs: [j("theme", "drain", { tr: "cast" }), j("theme", "lifegain", { tr: "cast" }), j("theme", "tokens", { tr: "activated" })],
    why: "A HARD NEGATIVE for ramp: it matched a mana-ish query but adds no mana. Drain plus lifegain on casting from exile.",
  },
  {
    name: "Visage of Bolas", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", tr: "activated" })],
    why: "A tutor for one named card plus a mana ability. The tutor is not in the vocabulary, so only ramp is recorded.",
  },

  // ---- thresholds: a gate on a number ----------------------------------------
  {
    name: "Tyrant's Scorn", klass: "thresholds",
    jobs: [j("role", "removal", { to: "creature", rec: "oneShot", th: mv(3, "<="), modal: true }), j("role", "removal", { to: "creature", rec: "oneShot", modal: true })],
    why: "Two MODAL removal jobs with DIFFERENT limits: destroy is capped at MV 3, bounce is not. Collapsing them loses the cap, which is the whole point.",
  },
  {
    name: "Pyrrhic Strike", klass: "thresholds",
    jobs: [j("role", "removal", { to: "artifact", rec: "oneShot", modal: true }), j("role", "removal", { to: "creature", rec: "oneShot", th: mv(3), modal: true })],
    why: "Modal, and 'choose both' if an additional cost was paid — so the modality is itself conditional. Threshold runs the OTHER way from Tyrant's Scorn: MV 3 or GREATER.",
  },
  {
    name: "Jin-Gitaxias // The Great Synthesis", klass: "thresholds",
    jobs: [j("theme", "draw", { tr: "cast", th: mv(3) }), j("role", "draw", { tr: "cast", th: mv(3) }), j("theme", "protection", { to: "creature" })],
    why: "Draw gated on casting a NONCREATURE spell of MV 3+. Ward is protection. Front face only.",
  },
  {
    name: "Rhino, Barreling Brute", klass: "thresholds",
    jobs: [j("theme", "draw", { tr: "attacks", th: mv(4) }), j("role", "draw", { tr: "attacks", th: mv(4) }), j("theme", "evasion", { to: "creature" }), j("theme", "haste", { to: "creature" })],
    why: "Two conditions at once: it must attack AND you must have cast an MV 4+ spell that turn.",
  },
  {
    name: "Technomancer", klass: "thresholds",
    jobs: [j("theme", "recursion", { to: "artifact", tr: "etb", rec: "oneShot", th: mv(6, "<=") }), j("theme", "mill", { tr: "etb", rec: "oneShot" })],
    why: "Recursion restricted to ARTIFACT creatures and capped at TOTAL mana value 6 — a pooled threshold, not a per-card one, which the schema cannot express. Recorded as a gap.",
  },
  {
    name: "Spellseeker", klass: "thresholds",
    jobs: [j("theme", "draw", { tr: "etb", rec: "oneShot", th: mv(2, "<=") })],
    why: "A tutor to HAND, capped at MV 2. Counted as draw because it puts a card in hand; the vocabulary has no tutor job, which is itself worth reporting.",
  },
  {
    name: "Forger's Foundry", klass: "thresholds",
    jobs: [j("role", "ramp", { rk: "tapsForMana", tr: "activated" }), j("theme", "castFree", { tr: "activated", rec: "oneShot" })],
    why: "Taps for {U}. The exile clause is gated on MV 3 or less, and the second ability casts spells without paying — castFree.",
  },
  {
    name: "Elder Pine of Jukai", klass: "thresholds",
    jobs: [j("theme", "draw", { to: "land", tr: "cast" })],
    why: "Lands only, to HAND, gated on casting a Spirit or Arcane spell. Not ramp: nothing reaches the battlefield. A card the ramp rules would plausibly over-claim.",
  },
  {
    name: "Scuttling Death", klass: "thresholds",
    jobs: [j("role", "removal", { to: "creature", tr: "activated", rec: "oneShot" }), j("theme", "sacOutlet", { tr: "activated", rec: "oneShot" })],
    why: "-1/-1 until end of turn is removal only against a 1-toughness creature — weak removal, still removal. Sacrifices itself, so oneShot.",
  },
  {
    name: "Hedge Whisperer", klass: "thresholds",
    jobs: [j("theme", "pump", { to: "land", tr: "activated" })],
    why: "A HARD NEGATIVE for ramp: it animates a land, adding no mana. Collect evidence 4 is a threshold on the graveyard the schema records nowhere.",
  },

  // ---- modal: jobs that are ALTERNATIVES, never a sum -------------------------
  {
    name: "Aether Channeler", klass: "modal",
    jobs: [
      j("theme", "tokens", { tr: "etb", rec: "oneShot", modal: true }),
      j("role", "removal", { to: "permanent", tr: "etb", rec: "oneShot", modal: true }),
      j("theme", "draw", { tr: "etb", rec: "oneShot", modal: true }),
      j("role", "draw", { tr: "etb", rec: "oneShot", modal: true }),
    ],
    why: "Three modes, one chosen. A consumer summing these credits the card with a token AND a bounce AND a draw — three cards' worth of jobs from one card.",
  },
  {
    name: "Retreat to Kazandu", klass: "modal",
    jobs: [j("theme", "counters", { to: "creature", tr: "landfall", modal: true }), j("theme", "lifegain", { tr: "landfall", modal: true }), j("theme", "landfall")],
    why: "Modal on every landfall, so the choice recurs — modal and repeatable together, which is not a contradiction.",
  },
  {
    name: "Pollenbright Druid", klass: "modal",
    jobs: [j("theme", "counters", { to: "creature", tr: "etb", rec: "oneShot", modal: true })],
    why: "Proliferate is not in the vocabulary, so only one mode has a job. A model may over-label the second mode as `counters`, which is why this card is here.",
  },
  {
    name: "Knight of Autumn", klass: "modal",
    jobs: [
      j("theme", "counters", { to: "creature", tr: "etb", rec: "oneShot", modal: true }),
      j("role", "removal", { to: "artifact", tr: "etb", rec: "oneShot", modal: true }),
      j("theme", "lifegain", { tr: "etb", rec: "oneShot", modal: true }),
    ],
    why: "The classic three-mode ETB. The counters mode targets ITSELF only, which is a tighter restriction than 'creature' and one the schema cannot say.",
  },
  {
    name: "Inspired Inventor", klass: "modal",
    jobs: [j("theme", "counters", { to: "creature", tr: "etb", rec: "oneShot", modal: true }), j("theme", "tokens", { tr: "etb", rec: "oneShot", modal: true })],
    why: "Energy is not in the vocabulary; two of three modes carry jobs.",
  },
  {
    name: "Qutrub Forayer", klass: "modal",
    jobs: [j("role", "removal", { to: "creature", tr: "etb", rec: "oneShot", modal: true })],
    why: "Removal restricted to a creature ALREADY DAMAGED this turn — a condition on the board, not the target's type. Graveyard exile has no job.",
  },
  {
    name: "Sylvan Scavenging", klass: "modal",
    jobs: [j("theme", "counters", { to: "creature", tr: "upkeep", modal: true }), j("theme", "tokens", { tr: "upkeep", modal: true, th: { stat: "power", op: ">=", value: 4 } })],
    why: "One mode carries its OWN threshold (a creature with power 4+) while the other does not — per-job limits, not per-card.",
  },
  {
    name: "The Spear of Leonidas", klass: "modal",
    jobs: [j("theme", "pump", { to: "creature", tr: "attacks", rec: "oneShot", modal: true }), j("theme", "tokens", { tr: "attacks", rec: "oneShot", modal: true }), j("theme", "draw", { tr: "attacks", rec: "oneShot", modal: true })],
    why: "Equipment: every job is gated on the EQUIPPED creature attacking, so the card does nothing until it is attached and attacks.",
  },
  {
    name: "Flash Thompson, Spider-Fan", klass: "modal",
    jobs: [],
    why: "A HARD NEGATIVE. Tap and untap a creature are neither removal nor any theme in the vocabulary. 'Choose one or both' also breaks the modal binary. Correct label: no jobs.",
  },
  {
    name: "Reckless Endeavor", klass: "modal",
    jobs: [j("role", "wipes", { rec: "oneShot" }), j("theme", "treasure", { rec: "oneShot" }), j("role", "ramp", { rk: "makesTreasure", rec: "oneShot" })],
    why: "NOT modal despite 'choose one result' — the dice choose which number goes where, and the card does both halves. A model reading 'choose one' as modal is wrong here, which is why it is in this class.",
  },
  {
    name: "Jin Sakai, Ghost of Tsushima", klass: "modal",
    jobs: [j("theme", "draw", { tr: "combatDamage" }), j("role", "draw", { tr: "combatDamage" }), j("theme", "pump", { to: "creature", tr: "attacks", rec: "oneShot", modal: true })],
    why: "The draw is unconditional on combat damage; the modal part is gated on a creature attacking ALONE. Two triggers with different conditions on one card.",
  },
  {
    name: "Hollow Specter", klass: "modal",
    jobs: [j("theme", "evasion", { to: "creature" })],
    why: "A HARD NEGATIVE for modality: no modes at all, it just matched 'choose'. Discard is not in the vocabulary. Flying on itself is the only job.",
  },

  // ---- twoFaced: the front face is the only one the rules read ---------------
  {
    name: "Invasion of Zendikar // Awakened Skyclave", klass: "twoFaced",
    jobs: [j("role", "ramp", { rk: "fetchesLand", to: "land", tr: "etb", rec: "oneShot" })],
    why: "A genuine fetchesLand — two basics onto the battlefield. The back face is a creature with no jobs; a labeller reading both faces would double-count.",
  },
  {
    name: "Drowner of Truth // Drowned Jungle", klass: "twoFaced",
    jobs: [j("theme", "tokens", { tr: "cast", rec: "oneShot" }), j("role", "ramp", { rk: "burstMana", tr: "cast", rec: "oneShot" })],
    why: "MDFC: the back is a land, but the FRONT is what the rules read. The Spawn tokens sacrifice for {C} — kindless burst again, and indirect.",
  },
  {
    name: "Strength of the Harvest // Haven of the Harvest", klass: "twoFaced",
    jobs: [j("theme", "pump", { to: "creature" })],
    why: "MDFC whose back face is a land. The front is an Aura pump scaling with permanents. Choosing the land face gives the deck a land and NO job — the schema labels the card, not the choice.",
  },
  {
    name: "Ettercap // Web Shot", klass: "twoFaced",
    jobs: [j("role", "removal", { to: "creature", rec: "oneShot" }), j("theme", "evasion", { to: "creature" })],
    why: "Adventure: the removal lives on the ADVENTURE half and the creature on the front. Both are genuinely available from one card, unlike an MDFC land.",
  },
  {
    name: "Lonesome Unicorn // Rider in Need", klass: "twoFaced",
    jobs: [j("theme", "tokens", { rec: "oneShot" })],
    why: "Adventure making a token. Vigilance is not in the vocabulary.",
  },
  {
    name: "Spring-Loaded Sawblades // Bladewheel Chariot", klass: "twoFaced",
    jobs: [j("role", "removal", { to: "creature", tr: "etb", rec: "oneShot" })],
    why: "Removal restricted to a TAPPED creature an opponent controls — a state restriction, not a type one, which the schema records only as the type.",
  },
  {
    name: "The Kami War // O-Kagachi Made Manifest", klass: "twoFaced",
    jobs: [j("role", "removal", { to: "permanent", rec: "oneShot" })],
    why: "A Saga: its chapters fire on a timer, so the removal is real but slow. Chapters are neither modal nor simultaneous — a shape the schema has no field for.",
  },
  {
    name: "Dorothea, Vengeful Victim // Dorothea's Retribution", klass: "twoFaced",
    jobs: [j("theme", "evasion", { to: "creature" }), j("theme", "tokens", { tr: "attacks" })],
    why: "The token clause is on the BACK face (the Aura), reachable only via Disturb. Front-face reading misses it — deliberately included to measure that.",
  },
  {
    name: "Blaster, Combat DJ // Blaster, Morale Booster", klass: "twoFaced",
    jobs: [j("theme", "counters", { to: "artifact" })],
    why: "Modular grants counters, restricted to artifact creatures and Vehicles. The convert clause is a transform, not a job.",
  },
  {
    name: "Ral, Monsoon Mage // Ral, Leyline Prodigy", klass: "twoFaced",
    jobs: [j("theme", "spellslinger", { tr: "cast" })],
    why: "Cost reduction is not in the vocabulary. The coin flip is a condition no schema field holds. A near-empty label on a complex card, by design.",
  },

  // ---- lands: a land's role is `land`, and ramp is never a land's job ---------
  {
    name: "Uncharted Haven", klass: "lands",
    jobs: [j("role", "land")],
    why: "The baseline. Taps for mana, but `classifyRoles` gives a land the `land` role and skips ramp entirely — every deck plays lands, so a land that makes mana is not acceleration.",
  },
  {
    name: "Rimewood Falls", klass: "lands",
    jobs: [j("role", "land")],
    why: "A dual that enters tapped and nothing else. The purest negative in the set.",
  },
  {
    name: "Temple of Malady", klass: "lands",
    jobs: [j("role", "land")],
    why: "Scry is not in the vocabulary, so the scry land is indistinguishable from a plain dual here — a vocabulary gap, not a labelling error.",
  },
  {
    name: "Sejiri Refuge", klass: "lands",
    jobs: [j("role", "land"), j("theme", "lifegain", { tr: "etb", rec: "oneShot" })],
    why: "A gain-land: the 1 life is genuinely the lifegain theme, one-shot on entry.",
  },
  {
    name: "Razortide Bridge", klass: "lands",
    jobs: [j("role", "land"), j("theme", "protection")],
    why: "Indestructible on itself is the protection theme by the rule's own wording — arguably noise on a land, which is why it is worth measuring.",
  },
  {
    name: "Escape Tunnel", klass: "lands",
    jobs: [j("role", "land"), j("theme", "evasion", { to: "creature", tr: "activated", rec: "oneShot" })],
    why: "Sacrifices for a basic (a fetch, but on a LAND, so no ramp role) or makes a small creature unblockable. Both one-shot and mutually exclusive in practice.",
  },
  {
    name: "Miren, the Moaning Well", klass: "lands",
    jobs: [j("role", "land"), j("theme", "lifegain", { tr: "activated" }), j("theme", "sacOutlet", { tr: "activated" })],
    why: "A repeatable sacrifice outlet on a land, which the role vocabulary cannot express at all.",
  },
  {
    name: "Barbarian Ring", klass: "lands",
    jobs: [j("role", "land"), j("role", "removal", { tr: "activated", rec: "oneShot", th: { stat: "cardsInGraveyard", op: ">=", value: 7 } })],
    why: "Threshold in the literal sense: removal only with seven cards in the graveyard, and it sacrifices the land.",
  },
  {
    name: "Wandering Fumarole", klass: "lands",
    jobs: [j("role", "land"), j("theme", "pump", { to: "land", tr: "activated", rec: "oneShot" })],
    why: "Animates itself. Not a creature job — the land becomes the creature.",
  },
  {
    name: "Kjeldoran Outpost", klass: "lands",
    jobs: [j("role", "land"), j("theme", "tokens", { tr: "activated" })],
    why: "A repeatable token engine on a land, at the cost of sacrificing a Plains to play it — an entry cost the schema cannot record.",
  },

  // ---- fetchesLand: the kind distinction from the other side -----------------
  {
    name: "Ulvenwald Hydra", klass: "fetchesLand",
    jobs: [j("role", "ramp", { rk: "fetchesLand", to: "land", tr: "etb", rec: "oneShot" }), j("theme", "evasion", { to: "creature" })],
    why: "A clean fetchesLand: a land onto the battlefield, once, on entry. Any land, not just a basic.",
  },
  {
    name: "Thunderherd Migration", klass: "fetchesLand",
    jobs: [j("role", "ramp", { rk: "fetchesLand", to: "land", rec: "oneShot" })],
    why: "A sorcery fetch whose COST is gated on revealing a Dinosaur — a tribal condition on casting rather than on the effect, which the schema records nowhere.",
  },
  {
    name: "Weathered Wayfarer", klass: "fetchesLand",
    jobs: [j("role", "ramp", { rk: "fetchesLand", to: "land", tr: "activated" })],
    why: "REPEATABLE fetch, but to HAND and only while an opponent has more lands. Repeatable and conditional at once; a Treasure-versus-tap reading misses both.",
  },
  {
    name: "Silver Deputy", klass: "fetchesLand",
    jobs: [j("theme", "pump", { to: "creature", tr: "activated", rec: "oneShot" })],
    why: "A HARD NEGATIVE for fetchesLand: it puts the land ON TOP of the library, not into hand or play. No mana is accelerated, so no ramp job at all.",
  },
  {
    name: "Marshals' Pathcruiser", klass: "fetchesLand",
    jobs: [j("role", "ramp", { rk: "fetchesLand", to: "land", tr: "etb", rec: "oneShot" }), j("theme", "counters", { tr: "activated", rec: "oneShot" })],
    why: "Fetch to HAND, which still counts as fetchesLand by 2b's definition ('onto the battlefield or into the hand').",
  },
  {
    name: "Bant Panorama", klass: "fetchesLand",
    jobs: [j("role", "land")],
    why: "Fetches a basic, but it IS a land, so no ramp role — the clearest case of the land rule swallowing a genuine fetch.",
  },
  {
    name: "Maestros Theater", klass: "fetchesLand",
    jobs: [j("role", "land"), j("theme", "lifegain", { tr: "etb", rec: "oneShot" })],
    why: "Sacrifices itself on entry to fetch. A land again, so no ramp.",
  },
  {
    name: "Topiary Panther", klass: "fetchesLand",
    jobs: [j("theme", "evasion", { to: "creature" })],
    why: "A HARD NEGATIVE: basic landcycling is a DISCARD outlet that fetches, from hand, at the cost of the card. Not ramp in play. Trample is its only job.",
  },
  {
    name: "Roxxon Brutes", klass: "fetchesLand",
    jobs: [j("theme", "counters", { to: "creature", tr: "other" }), j("theme", "evasion", { to: "creature" })],
    why: "Landcycling again, so no ramp. The counter trigger is on drawing a SECOND card each turn.",
  },

  // ---- easy: a model that over-labels a simple card is caught here -----------
  {
    name: "Pincer Spider", klass: "easy",
    jobs: [j("theme", "counters", { rec: "oneShot" }), j("theme", "evasion", { to: "creature" })],
    why: "Enters with a counter on itself if kicked. Reach only.",
  },
  {
    name: "Ritual of Steel", klass: "easy",
    jobs: [j("theme", "draw", { tr: "etb", rec: "oneShot" }), j("role", "draw", { tr: "etb", rec: "oneShot" }), j("theme", "pump", { to: "creature" })],
    why: "A delayed draw and a +0/+2. Simple, and a good check that a model does not invent limits.",
  },
  {
    name: "Fire Nation Attacks", klass: "easy",
    jobs: [j("theme", "tokens", { rec: "oneShot" })],
    why: "Two tokens. Flashback makes it twice-castable, not repeatable in play.",
  },
  {
    name: "Circuit Mender", klass: "easy",
    jobs: [j("theme", "lifegain", { tr: "etb", rec: "oneShot" }), j("theme", "draw", { tr: "other", rec: "oneShot" }), j("role", "draw", { tr: "other", rec: "oneShot" })],
    why: "Gain on entry, draw on LEAVING — two different triggers, neither optional.",
  },
  {
    name: "Impaler Shrike", klass: "easy",
    jobs: [j("theme", "draw", { tr: "combatDamage", rec: "oneShot" }), j("role", "draw", { tr: "combatDamage", rec: "oneShot" }), j("theme", "evasion", { to: "creature" })],
    why: "Draw three, but it sacrifices itself, so oneShot — and it must connect first.",
  },
  {
    name: "Cryptcaller Chariot", klass: "easy",
    jobs: [j("theme", "tokens", { tr: "other" }), j("theme", "evasion", { to: "creature" })],
    why: "Tokens on discard, repeatable. A Vehicle, so it needs crewing to attack.",
  },
  {
    name: "Coretapper", klass: "easy",
    jobs: [],
    why: "A HARD NEGATIVE. CHARGE counters on an artifact are not +1/+1 counters, so not the `counters` theme. Sacrificing itself is a cost, not the sacOutlet theme (which is an outlet for OTHER permanents). Correct label: no jobs.",
  },
  {
    name: "Creakwood Ghoul", klass: "easy",
    jobs: [j("theme", "lifegain", { tr: "activated" })],
    why: "Graveyard exile is not in the vocabulary. Gains 1 life, repeatably.",
  },
  {
    name: "Deathcult Rogue", klass: "easy",
    jobs: [j("theme", "evasion", { to: "creature" })],
    why: "'Can't be blocked except by Rogues' is the evasion rule's own `can't be blocked` clause, partially negated. A judgement call: recorded as evasion because it is nearly unblockable in most decks.",
  },
  {
    name: "Wartime Protestors", klass: "easy",
    jobs: [j("theme", "counters", { to: "Ally", tr: "etb" }), j("theme", "haste", { to: "Ally", tr: "etb" })],
    why: "Ally-restricted on both jobs — an `easy` card that is actually tribal, which is why it is here rather than in the tribal class.",
  },
  {
    name: "Earthbender Ascension", klass: "easy",
    jobs: [j("role", "ramp", { rk: "fetchesLand", to: "land", tr: "etb", rec: "oneShot" }), j("theme", "landfall")],
    why: "A real fetchesLand on an enchantment, plus a landfall counter engine.",
  },
  {
    name: "Extract Power", klass: "easy",
    jobs: [j("theme", "castFree", { rec: "oneShot" })],
    why: "Play cards without paying their costs — castFree, from every player's library.",
  },
  {
    name: "Khorvath's Fury", klass: "easy",
    jobs: [j("theme", "draw", { rec: "oneShot" }), j("role", "draw", { rec: "oneShot" })],
    why: "A symmetrical wheel. The damage is to PLAYERS, so not removal; it is closest to drain but the vocabulary's drain rule wants a life-loss clause, which this has not.",
  },
  {
    name: "Lady Octopus, Inspired Inventor", klass: "easy",
    jobs: [j("theme", "castFree", { tr: "activated" })],
    why: "Casts an artifact from hand gated on a counter count — castFree in spirit (no cost paid), and a threshold the schema records on the job.",
  },

];

/** Fails loudly rather than scoring a malformed gold set. */
export function validateGold(rows = GOLD) {
  const bad = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.name)) bad.push(`${row.name}: listed twice`);
    seen.add(row.name);
    if (!row.why || row.why.length < 20) bad.push(`${row.name}: no reasoning recorded`);
    for (const job of row.jobs) {
      const problems = validateJob(job);
      if (problems.length) bad.push(`${row.name} [${job.kind}]: ${problems.join(", ")}`);
      // A null kind was legal while the gap was open; d9 closed it on 2026-09-25
      // with `burstMana`. A null now means a kind none of the four fits, which is
      // a finding to raise rather than a label to leave sitting in the gold set.
      if (job.rampKind === null) bad.push(`${row.name}: ramp with NO KIND — a new gap, report it`);
    }
  }
  return bad;
}
