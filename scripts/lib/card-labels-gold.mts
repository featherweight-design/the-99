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
import { validateJob } from "../../src/lib/labels/schema.js";
import { COVERAGE_FIELDS } from "./card-labels-gold-coverage-fields.mjs";
import { COVERAGE_ROLES } from "./card-labels-gold-coverage-roles.mjs";
import { COVERAGE_RULINGS } from "./card-labels-gold-coverage-rulings.mjs";
import { COVERAGE_THEMES } from "./card-labels-gold-coverage-themes.mjs";
import { j, mv, type GoldRow } from "./card-labels-gold-helpers.mjs";

/** The first gold set (#1034), re-audited on the new schema and definitions by the vocabulary plan's Task 4. */
const AUDITED: GoldRow[] = [
  // ---- the cards the brief names -------------------------------------------
  {
    name: "Bejeweled Warg", klass: "named",
    jobs: [
      j("theme", "counters", { rt: "Wolf", af: "self", tr: "combatDamage", modal: true }),
      j("theme", "treasure", { af: "self", tr: "combatDamage", modal: true }),
      j("role", "ramp", { rk: "makesTreasure", af: "self", tr: "combatDamage", modal: true }),
      j("theme", "tribal", { rt: "Wolf", af: "self", tr: "combatDamage", modal: true }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "The false match itself. Counters go on a WOLF only, and the deck that matched was Dinosaurs. The ramp is a Treasure on combat damage, where Runadi taps for {G}. Both jobs are MODAL — 'choose one' — so it never does both, and a consumer that sums them credits it with more than it can do. Repeatable, though: each combat hit triggers again. Task 4 re-audit: gains `tribal` (Wolf), which the vocabulary now defines as caring about one creature type and which this card's counter mode does; and `evasion` for its own trample, which the first labelling missed.",
  },
  {
    name: "Generator Servant", klass: "named",
    jobs: [
      j("role", "ramp", { rk: "burstMana", af: "self", tr: "activated", rec: "oneShot" }),
      j("theme", "haste", { rt: "creature", af: "self", tr: "activated", rec: "oneShot" }),
    ],
    why: "rampKind burstMana: a one-shot burst fit none of E1's ORIGINAL three kinds, which this card is how we found out — not tapsForMana (gone after one use), not fetchesLand, not makesTreasure (no token; the mana is added directly). Raised with 2b, ruled by d9 on 2026-09-25 as a fourth kind. oneShot because the ability sacrifices the creature — the distinction the brief names. Haste is conditional twice over: only if that mana is spent, and only on a creature spell.",
  },
  {
    name: "Runadi, Behemoth Caller", klass: "named",
    jobs: [
      j("theme", "counters", { rt: "creature", af: "self", tr: "cast", th: mv(5) }),
      j("theme", "haste", { rt: "creature", af: "self", th: { stat: "counters", op: ">=", value: 3 } }),
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" }),
    ],
    why: "The other half of the false match. Counters are unrestricted by TYPE but gated by a THRESHOLD (MV 5+) and arrive on cast. Ramp is a repeatable tap for {G} — tapsForMana, which is why a Treasure-maker must not match it. Haste is static, gated on 3+ counters.",
  },

  // ---- restrictedCounter: the Warg's shape, a counter limited to a type -----
  {
    name: "Captain Storm, Cosmium Raider", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { rt: "Pirate", af: "self", tr: "etb" }),
      j("theme", "tribal", { rt: "Pirate", af: "self", tr: "etb" }),
    ],
    why: "Counter restricted to Pirate, triggered by an artifact entering. Useless in a deck that plays no Pirates, which is the Warg case exactly. Task 4 re-audit: gains `tribal` (Pirate) under the new definition, caring about one creature type.",
  },
  {
    name: "Deeproot Elite", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { rt: "Merfolk", af: "self", tr: "etb" }),
      j("theme", "tribal", { rt: "Merfolk", af: "self", tr: "etb" }),
    ],
    why: "Merfolk-restricted, and the trigger is ALSO Merfolk-gated ('whenever another Merfolk you control enters'), so it is doubly tribal. Task 4 re-audit: gains `tribal` (Merfolk) under the new definition.",
  },
  {
    name: "Jade Guardian", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { rt: "Merfolk", af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "protection", { rt: "creature", af: "self" }),
      j("theme", "tribal", { rt: "Merfolk", af: "self", tr: "etb", rec: "oneShot" }),
    ],
    why: "oneShot: an ETB on a creature happens once. Hexproof on itself is the protection theme. Task 4 re-audit: gains `tribal` (Merfolk) under the new definition.",
  },
  {
    name: "Venerable Knight", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { rt: "Knight", af: "self", tr: "dies", rec: "oneShot" }),
      j("theme", "tribal", { rt: "Knight", af: "self", tr: "dies", rec: "oneShot" }),
    ],
    why: "Knight-restricted, and it has to DIE first — a trigger the controller does not choose. oneShot for the same reason. Task 4 re-audit: gains `tribal` (Knight). Its OWN death is the trigger (trigger `dies`), not the deathTrigger theme, which is for another creature dying.",
  },
  {
    name: "Stromkirk Bloodthief", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { rt: "Vampire", af: "self", tr: "other" }),
      j("theme", "tribal", { rt: "Vampire", af: "self", tr: "other" }),
    ],
    why: "Vampire-restricted, on a turn-based trigger with a further condition (an opponent lost life). Repeatable, once a turn at most. Task 4 re-audit: gains `tribal` (Vampire) under the new definition.",
  },
  {
    name: "Green Goblin, Nemesis", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { rt: "Goblin", af: "self", tr: "other" }),
      j("theme", "treasure", { af: "self", tr: "other" }),
      j("role", "ramp", { rk: "makesTreasure", af: "self", tr: "other" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "tribal", { rt: "Goblin", af: "self", tr: "other" }),
    ],
    why: "Two separate discard triggers, not modal: a nonland discard gives a Goblin a counter, a land discard makes a Treasure. Both conditional on discarding. Flying on itself is evasion. Task 4 re-audit: gains `tribal` (Goblin). NOT `discard`: that theme is 'makes a player discard', and this card only rewards a discard something else causes — a judgement call on the definition's wording.",
  },
  {
    name: "Lady Spider, Maybelle Reilly", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { rt: "Spider", af: "self", tr: "other" }),
      j("theme", "tribal", { rt: "Spider", af: "self", tr: "other" }),
    ],
    why: "Spider-restricted, on discard. Reach is evasion-adjacent on itself. Task 4 re-audit: gains `tribal` (Spider); loses `evasion`, because reach is not in the evasion definition (flying, trample, menace, can't be blocked). Not `discard`, which rewards rather than makes a discard (judgement).",
  },
  {
    name: "Talion's Messenger", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { rt: "Faerie", af: "self", tr: "attacks" }),
      j("role", "draw", { af: "self", tr: "attacks" }),
      j("theme", "discard", { af: "self", tr: "attacks" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "tribal", { rt: "Faerie", af: "self", tr: "attacks" }),
    ],
    why: "Faerie-restricted counter, and the trigger needs Faeries attacking. The draw is a loot (draw then discard) and still a draw. Task 4 re-audit: theme `draw` removed (it now means cares about drawing, rewarding the cards you draw; a loot is the role, not the theme); gains `discard` affects self for the loot's discard, and `tribal` (Faerie).",
  },
  {
    name: "Omnath, Locus of the Roil", klass: "restrictedCounter",
    jobs: [
      j("theme", "counters", { rt: "Elemental", af: "self", tr: "landfall" }),
      j("theme", "landfall", { af: "self", tr: "landfall" }),
      j("role", "removal", { af: "opponents", meth: "shrink", tr: "etb", rec: "oneShot" }),
      j("theme", "drain", { af: "opponents", tr: "etb", rec: "oneShot" }),
      j("role", "draw", { af: "self", tr: "landfall", th: { stat: "other", op: ">=", value: 8 } }),
      j("theme", "tribal", { rt: "Elemental", af: "self", tr: "landfall" }),
    ],
    why: "Elemental-restricted counter on landfall. The ETB damage is removal, scaled by Elementals — a threshold in effect but not a gate, so no threshold recorded. Task 4 re-audit: gains role `draw` for the eight-lands landfall draw, which the first labelling missed, and `tribal` (Elemental). The ETB damage goes to any target and is labelled removal by shrink, affects opponents by the removal ruling, and drain as well since v8 (2026-10-04).",
  },
  {
    name: "Keldon Warcaller", klass: "restrictedCounter",
    jobs: [],
    why: "A HARD NEGATIVE. A LORE counter on a Saga is not the `counters` theme, whose rule and meaning are +1/+1 counters. Any model labelling this `counters` is wrong, and the text rule correctly does not fire.",
  },
  {
    name: "Sigurd, Jarl of Ravensthorpe", klass: "restrictedCounter",
    jobs: [
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "counters", { rt: "creature", af: "self", tr: "other" }),
      j("theme", "lifegain", { af: "self" }),
    ],
    why: "Lore counters again are not `counters` — but this one ALSO puts +1/+1 counters when a Saga gets a lore counter, so the theme is genuinely present by a different clause. Trample/lifelink on itself. A card designed to catch a lazy negative. Task 4 re-audit: gains `lifegain` for its own lifelink, matching Midnight Mayhem, whose lifelink grant was already labelled lifegain.",
  },
  {
    name: "Clash of the Eikons", klass: "restrictedCounter",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "shrink", rec: "oneShot" })],
    why: "A HARD NEGATIVE twice over: the lore counter is not `counters`, and the fight clause targets a creature YOU control as well as an opponent's, so it is not clean removal either. 'Choose one or more' also makes its clauses modal-ish rather than a sum. Task 4 re-audit: the fight is now `removal` by shrink — the tightened definition counts damage that takes an opponent's creature away, and the damage lands on 'a creature an opponent controls'. Not modal, since 'choose one or more' lets it do every mode. A judgement call that reverses the first labelling; the row stays a hard negative for `counters` only.",
  },
  // ---- tribalStatic: a lord restricting to a type, not "target X you control" --
  {
    name: "Achilles Davenport", klass: "tribalStatic",
    jobs: [
      j("theme", "pump", { rt: "Assassin", af: "self" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "tribal", { rt: "Assassin", af: "self" }),
    ],
    why: "Static lord restricted to Assassins. Menace on itself is evasion. Task 4 re-audit: gains `tribal` (Assassin) under the new definition.",
  },
  {
    name: "Adeliz, the Cinder Wind", klass: "tribalStatic",
    jobs: [
      j("theme", "pump", { rt: "Wizard", af: "self", tr: "cast", rec: "oneShot" }),
      j("theme", "spellslinger", { af: "self", tr: "cast" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "haste", { rt: "creature", af: "self" }),
      j("theme", "tribal", { rt: "Wizard", af: "self", tr: "cast", rec: "oneShot" }),
    ],
    why: "Wizard-restricted pump, and oneShot per trigger (until end of turn) rather than static — the temporary-versus-permanent distinction a stand-in should not flatten. Task 4 re-audit: gains `tribal` (Wizard) under the new definition.",
  },
  {
    name: "Admiral Beckett Brass", klass: "tribalStatic",
    jobs: [
      j("theme", "pump", { rt: "Pirate", af: "self" }),
      j("role", "removal", { rt: "permanent", af: "opponents", meth: null, tr: "other" }),
      j("theme", "theft", { rt: "permanent", af: "opponents", tr: "other" }),
      j("theme", "tribal", { rt: "Pirate", af: "self" }),
    ],
    why: "Pirate lord. The end-step theft needs THREE Pirates to have connected — a condition no text rule expresses, and closer to removal than anything else in the vocabulary. Task 4 re-audit: the removal now carries the new `theft` theme beside it (removal includes gaining control). Method null, a judgement: no method describes a steal. Gains `tribal` (Pirate). Trigger `other`: the end step has no trigger value of its own.",
  },
  {
    name: "Liliana's Devotee", klass: "tribalStatic",
    jobs: [
      j("theme", "pump", { rt: "Zombie", af: "self" }),
      j("theme", "tokens", { af: "self", tr: "other" }),
      j("theme", "tribal", { rt: "Zombie", af: "self" }),
      j("theme", "deathTrigger", { af: "each", tr: "other" }),
    ],
    why: "Zombie lord, +1/+0 only. Token needs a creature to have died and {1}{B} paid. Task 4 re-audit: gains `tribal` (Zombie), and `deathTrigger` affects each — a judgement call, since it fires at end step IF any creature died rather than on the death itself. Trigger `other` for the end step.",
  },
  {
    name: "Sigarda, Heron's Grace", klass: "tribalStatic",
    jobs: [
      j("theme", "protection", { rt: "Human", af: "self" }),
      j("theme", "tokens", { af: "self", tr: "activated" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "tribal", { rt: "Human", af: "self" }),
    ],
    why: "Hexproof restricted to Humans (and the controller). Not a pump — protection. Task 4 re-audit: gains `tribal` (Human) under the new definition.",
  },
  {
    name: "Depala, Pilot Exemplar", klass: "tribalStatic",
    jobs: [
      j("theme", "pump", { rt: "Dwarf", af: "self" }),
      j("theme", "pump", { rt: "Vehicle", af: "self" }),
      j("theme", "tribal", { rt: "Dwarf", af: "self" }),
      j("role", "draw", { rt: "Dwarf or Vehicle", af: "self", tr: "other" }),
    ],
    why: "TWO restricted pumps with different types, one a creature type and one a CARD type. The schema's single-string restrictedTo holds because they are separate jobs. Task 4 re-audit: gains `tribal` (Dwarf; Vehicle is a card type, not a creature type), and role `draw` for the tap trigger that puts Dwarf and Vehicle cards from the library into hand, which the first labelling missed. restrictedTo 'Dwarf or Vehicle' is a judgement: the field holds one string and the effect names two.",
  },
  {
    name: "Belle of the Brawl", klass: "tribalStatic",
    jobs: [
      j("theme", "pump", { rt: "Knight", af: "self", tr: "attacks", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "tribal", { rt: "Knight", af: "self", tr: "attacks", rec: "oneShot" }),
    ],
    why: "Knight-restricted, only on attack, only until end of turn. Task 4 re-audit: gains `tribal` (Knight) under the new definition.",
  },
  {
    name: "The Odd Acorn Gang", klass: "tribalStatic",
    jobs: [
      j("theme", "pump", { rt: "Squirrel", af: "self", tr: "activated" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "tribal", { rt: "Squirrel", af: "self" }),
      j("role", "draw", { af: "self", tr: "combatDamage" }),
    ],
    why: "Grants Squirrels an activated pump ability — restricted twice, to Squirrels granting and Squirrels targeted. Task 4 re-audit: gains `tribal` (Squirrel), and role `draw` for the Squirrels-connect draw, which the first labelling missed.",
  },
  {
    name: "Midnight Mayhem", klass: "tribalStatic",
    jobs: [
      j("theme", "tokens", { af: "self", rec: "oneShot" }),
      j("theme", "evasion", { rt: "Gremlin", af: "self", rec: "oneShot" }),
      j("theme", "lifegain", { rt: "Gremlin", af: "self", rec: "oneShot" }),
      j("theme", "haste", { rt: "Gremlin", af: "self", rec: "oneShot" }),
      j("theme", "tribal", { rt: "Gremlin", af: "self", rec: "oneShot" }),
    ],
    why: "A sorcery, so every job is oneShot. The keyword grant is Gremlin-restricted — and it makes the Gremlins itself, so the restriction is self-satisfied, which a naive reader would call a limitation and a player would not. Task 4 re-audit: gains `tribal` (Gremlin). A judgement call: the card makes its own Gremlins, but the grant reaches every Gremlin you control, so it does care about the type.",
  },
  {
    name: "Call the Spirit Dragons", klass: "tribalStatic",
    jobs: [
      j("theme", "protection", { rt: "Dragon", af: "self" }),
      j("theme", "counters", { rt: "Dragon", af: "self", tr: "upkeep" }),
      j("theme", "finisher", { rt: "Dragon", af: "self", tr: "upkeep" }),
      j("theme", "tribal", { rt: "Dragon", af: "self" }),
    ],
    why: "Dragon-restricted indestructible and Dragon-restricted counters. Task 4 re-audit: gains `finisher` for the win-the-game clause (the definition now names one) and `tribal` (Dragon).",
  },
  {
    name: "Suki, Kyoshi Captain", klass: "tribalStatic",
    jobs: [
      j("theme", "pump", { rt: "Warrior", af: "self" }),
      j("theme", "tribal", { rt: "Warrior", af: "self" }),
    ],
    why: "Warrior lord plus a Warrior-restricted activated double strike, itself limited to ATTACKING Warriors. Task 4 re-audit: the activated double strike is no longer `pump`, which is now defined as +X/+X; double strike has no job (as Thrumming Hivepool's row already said). Gains `tribal` (Warrior).",
  },
  {
    name: "Vexilus Praetor", klass: "tribalStatic",
    jobs: [j("theme", "protection", { rt: "Commander", af: "self" })],
    why: "Restricted to Commanders — not a creature type at all but a game role, which is why restrictedTo is a free string rather than an enum of creature types. Task 4 re-audit: `evasion` removed — the card has flash and vigilance, neither of which is evasion; the first labelling was wrong.",
  },
  {
    name: "Valiant Veteran", klass: "tribalStatic",
    jobs: [
      j("theme", "pump", { rt: "Soldier", af: "self" }),
      j("theme", "counters", { rt: "Soldier", af: "self", tr: "activated", rec: "oneShot" }),
      j("theme", "tribal", { rt: "Soldier", af: "self" }),
    ],
    why: "Soldier lord; the graveyard ability is oneShot (exiles itself) and Soldier-restricted. Task 4 re-audit: gains `tribal` (Soldier) under the new definition.",
  },
  {
    name: "Thrumming Hivepool", klass: "tribalStatic",
    jobs: [
      j("theme", "haste", { rt: "Sliver", af: "self" }),
      j("theme", "tokens", { af: "self", tr: "upkeep" }),
      j("theme", "tribal", { rt: "Sliver", af: "self" }),
    ],
    why: "Sliver-restricted grants. Double strike is not in the vocabulary, so only haste is recorded — a vocabulary gap rather than a labelling choice. Task 4 re-audit: `evasion` removed — double strike is not evasion, and the first labelling contradicted its own why. Gains `tribal` (Sliver). Affinity for Slivers reduces only its own cost, so it is not costReduction ramp.",
  },
  {
    name: "Aeronaut Admiral", klass: "tribalStatic",
    jobs: [
      j("theme", "evasion", { rt: "Vehicle", af: "self" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Flying granted only to VEHICLES — a card type, and worthless in a deck with none. Its own flying is separate.",
  },

  // ---- conditionalMana: one-shot or gated mana, against a repeatable tap ------
  {
    name: "Blood Pet", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "burstMana", af: "self", tr: "activated", rec: "oneShot" })],
    why: "The Generator Servant shape at its simplest, and the reason the kind gap is a class and not a curiosity: sacrifice itself for {B}. No kind fits. Task 4 re-audit: `sacOutlet` removed — it sacrifices only itself, and sacOutlet is an outlet for OTHER permanents (the rule Coretapper's row already applies).",
  },
  {
    name: "Azorius Cluestone", klass: "conditionalMana",
    jobs: [
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" }),
      j("role", "draw", { af: "self", tr: "activated", rec: "oneShot" }),
    ],
    why: "A TRUE tapsForMana — repeatable, from a permanent's tap. The draw consumes the rock, so the two jobs differ in recurrence on one card. Task 4 re-audit: theme `draw` removed; it now means rewarding the cards you draw, and drawing one is the role.",
  },
  {
    name: "Jeskai Banner", klass: "conditionalMana",
    jobs: [
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" }),
      j("role", "draw", { af: "self", tr: "activated", rec: "oneShot" }),
    ],
    why: "Same shape as the Cluestone; kept as a duplicate class member so a model cannot score well by memorising one card. Task 4 re-audit: theme `draw` removed, as on the Cluestone.",
  },
  {
    name: "Incubator Drone", klass: "conditionalMana",
    jobs: [
      j("theme", "tokens", { af: "self", tr: "etb", rec: "oneShot" }),
      j("role", "ramp", { rk: "burstMana", af: "self", tr: "etb", rec: "oneShot" }),
    ],
    why: "The ramp is INDIRECT — the token sacrifices for {C}, the Drone never adds mana itself. A reader tracking only the Drone's own text sees no ramp at all; a player counts it. Task 4 re-audit: `sacOutlet` removed — the Scion sacrifices only itself, which is not an outlet for other permanents.",
  },
  {
    name: "Kessig Naturalist // Lord of the Ulvenwald", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "attacks" })],
    why: "Mana on ATTACK. Labelled `burstMana`/`oneShot` at first, on the reasoning that it is not a tap and makes no Treasure — WRONG against E1's ratified kinds (2026-09-26). One-shot means the source is CONSUMED making the mana: sacrifice this, an instant or sorcery, an entering trigger, a Gold token. An attack trigger is none of those and the creature survives, so this is repeatable mana from the permanent's own ability. `rampKinds` in src/lib/swaps/honest.ts returns [\"tapsForMana\"], checked directly.",
  },
  {
    name: "The Mana Rig", klass: "conditionalMana",
    jobs: [
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "cast" }),
      j("role", "draw", { af: "self", tr: "activated" }),
    ],
    why: "A Powerstone is Treasure-adjacent but is NOT a Treasure (it cannot pay for spells generally), so `makesTreasure` would be false — but `burstMana` was wrong too. E1 names the Powerstone explicitly under taps for mana, because it taps every turn; the source is not consumed. `rampKinds` returns [\"tapsForMana\"], checked directly. Task 4 re-audit: gains role `draw` for the {X}{X}{X} ability that puts up to two cards into hand, which the first labelling missed.",
  },
  {
    name: "Sorcerer Class", klass: "conditionalMana",
    jobs: [
      j("role", "draw", { af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "discard", { af: "self", tr: "etb", rec: "oneShot" }),
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" }),
      j("theme", "spellslinger", { af: "self", tr: "cast" }),
      j("theme", "drain", { af: "opponents", tr: "cast" }),
    ],
    why: "The ramp exists only at LEVEL 2 — a cost gate no text rule reads, and the mana is granted to creatures rather than produced by the Class. Task 4 re-audit: theme `draw` removed (the role covers drawing two); gains `discard` affects self for the discard two, and the level-3 clause the first labelling missed: `spellslinger` and `drain`, since its damage goes to each opponent only.",
  },
  {
    name: "Dora Milaje Elite", klass: "conditionalMana",
    jobs: [
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "etb" }),
      j("theme", "protection", { rt: "legendary", af: "self", tr: "activated", rec: "oneShot" }),
    ],
    why: "Gated on an opponent controlling MORE LANDS — a condition about the board, not the card. The Vibranium token reads `{T}: Add {C}` — a repeatable tap, nothing consumed — which is the POWERSTONE shape, so `tapsForMana` rather than a burst. Labelled `burstMana`/`oneShot` at first and corrected 2026-09-26 in the same sweep as The Mana Rig; it was the sibling that sweep missed. **E1 assigns this card no ramp job at all**, because `usableText` strips a mana token's reminder text and the Vibranium ability lives only there — so this label is a judgement about what the CARD does, not a reading of the classifier, and it is one of three rows where the gold set is deliberately wider than E1. Raised with 2b. Task 4 re-audit: gains `protection` for the sacrifice-for-indestructible clause on legendary permanents, which the first labelling missed. restrictedTo 'legendary' is a supertype, the closest the field allows.",
  },
  {
    name: "Gatewatch Beacon", klass: "conditionalMana",
    jobs: [j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" })],
    why: "Taps for {W} repeatably, but it spends loyalty counters — finite, though not one-shot. The schema has no field for a resource limit, which is a real gap worth reporting.",
  },
  {
    name: "Wandertale Mentor", klass: "conditionalMana",
    jobs: [
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" }),
      j("theme", "counters", { af: "self", tr: "other" }),
    ],
    why: "A clean dork: repeatable tap for {R} or {G}. Counters on itself only, gated on 'expend 4'.",
  },
  {
    name: "Lavabrink Floodgates", klass: "conditionalMana",
    jobs: [
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" }),
      j("role", "wipes", { af: "each", meth: "shrink", tr: "upkeep", rec: "oneShot" }),
    ],
    why: "Taps for {R}{R}. The doom-counter clause destroys ALL creatures — a wipe on a timer any opponent can influence.",
  },
  {
    name: "Quintorius Kand", klass: "conditionalMana",
    jobs: [
      j("theme", "drain", { af: "opponents", tr: "cast" }),
      j("theme", "lifegain", { af: "self", tr: "cast" }),
      j("theme", "tokens", { af: "self", tr: "activated" }),
      j("theme", "castFree", { af: "self", tr: "activated", th: mv(4, "<=") }),
      j("role", "ramp", { rk: "burstMana", af: "self", tr: "activated", rec: "oneShot" }),
    ],
    why: "A HARD NEGATIVE for ramp: it matched a mana-ish query but adds no mana. Drain plus lifegain on casting from exile. Task 4 re-audit: gains `castFree` for Discover 4 (cast without paying, MV 4 or less), and ramp `burstMana` for the −6, which does add {R} per card exiled — so the first labelling's 'adds no mana' was wrong and this is no longer a hard negative for ramp. Both judgement calls on a keyword with no reminder text and an ultimate. Not graveyardHate: it exiles YOUR graveyard for value.",
  },
  {
    name: "Visage of Bolas", klass: "conditionalMana",
    jobs: [
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" }),
      j("role", "tutor", { rt: "Nicol Bolas, the Deceiver", af: "self", dest: "hand", tr: "etb", rec: "oneShot" }),
      j("theme", "recursion", { rt: "Nicol Bolas, the Deceiver", af: "self", dest: "hand", tr: "etb", rec: "oneShot" }),
    ],
    why: "A tutor for one named card plus a mana ability. The tutor is not in the vocabulary, so only ramp is recorded. Task 4 re-audit: gains role `tutor` (to hand), now in the vocabulary, and `recursion` because the same search may take the card from the graveyard. restrictedTo a card NAME is a judgement: the field asks for a type, and the card names one card.",
  },

  // ---- thresholds: a gate on a number ----------------------------------------
  {
    name: "Tyrant's Scorn", klass: "thresholds",
    jobs: [
      j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", rec: "oneShot", th: mv(3, "<="), modal: true }),
      j("role", "removal", { rt: "creature", af: "opponents", meth: "bounce", rec: "oneShot", modal: true }),
    ],
    why: "Two MODAL removal jobs with DIFFERENT limits: destroy is capped at MV 3, bounce is not. Collapsing them loses the cap, which is the whole point.",
  },
  {
    name: "Pyrrhic Strike", klass: "thresholds",
    jobs: [
      j("role", "removal", { rt: "artifact", af: "opponents", meth: "destroy", rec: "oneShot", modal: true }),
      j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", rec: "oneShot", th: mv(3), modal: true }),
    ],
    why: "Modal, and 'choose both' if an additional cost was paid — so the modality is itself conditional. Threshold runs the OTHER way from Tyrant's Scorn: MV 3 or GREATER.",
  },
  {
    name: "Jin-Gitaxias // The Great Synthesis", klass: "thresholds",
    jobs: [
      j("role", "draw", { af: "self", tr: "cast", th: mv(3) }),
      j("theme", "protection", { rt: "creature", af: "self" }),
    ],
    why: "Draw gated on casting a NONCREATURE spell of MV 3+. Ward is protection. Front face only. Task 4 re-audit: theme `draw` removed; drawing on cast is the role, not a reward for drawing.",
  },
  {
    name: "Rhino, Barreling Brute", klass: "thresholds",
    jobs: [
      j("role", "draw", { af: "self", tr: "attacks", th: mv(4) }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "haste", { rt: "creature", af: "self" }),
    ],
    why: "Two conditions at once: it must attack AND you must have cast an MV 4+ spell that turn. Task 4 re-audit: theme `draw` removed; the role covers the draw.",
  },
  {
    name: "Technomancer", klass: "thresholds",
    jobs: [
      j("theme", "recursion", { rt: "artifact", af: "self", dest: "battlefield", tr: "etb", rec: "oneShot", th: mv(6, "<=") }),
      j("theme", "mill", { af: "self", tr: "etb", rec: "oneShot" }),
    ],
    why: "Recursion restricted to ARTIFACT creatures and capped at TOTAL mana value 6 — a pooled threshold, not a per-card one, which the schema cannot express. Recorded as a gap.",
  },
  {
    name: "Spellseeker", klass: "thresholds",
    jobs: [
      j("role", "tutor", { rt: "instant or sorcery", af: "self", dest: "hand", tr: "etb", rec: "oneShot", th: mv(2, "<=") }),
    ],
    why: "A tutor to HAND, capped at MV 2. Counted as draw because it puts a card in hand; the vocabulary has no tutor job, which is itself worth reporting. Task 4 re-audit: now role `tutor` (to hand), which the vocabulary has; theme `draw` removed, because a tutor is not draw. restrictedTo 'instant or sorcery' holds both printed types in one string.",
  },
  {
    name: "Forger's Foundry", klass: "thresholds",
    jobs: [
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" }),
      j("theme", "castFree", { af: "self", tr: "activated", rec: "oneShot" }),
      j("theme", "spellslinger", { af: "self", tr: "cast", th: mv(3, "<=") }),
    ],
    why: "Taps for {U}. The exile clause is gated on MV 3 or less, and the second ability casts spells without paying — castFree. Task 4 re-audit: gains `spellslinger` — its mana rewards casting instants and sorceries of MV 3 or less by banking them to recast free. A judgement call: the reward is the castFree job's setup rather than a separate payoff.",
  },
  {
    name: "Elder Pine of Jukai", klass: "thresholds",
    jobs: [
      j("role", "draw", { rt: "land", af: "self", tr: "cast" }),
      j("theme", "recursion", { rt: "Spirit", af: "self", dest: "hand", tr: "dies", rec: "oneShot", th: mv(2, "<=") }),
      j("theme", "tribal", { rt: "Spirit", af: "self", tr: "cast" }),
    ],
    why: "Lands only, to HAND, gated on casting a Spirit or Arcane spell. Not ramp: nothing reaches the battlefield. A card the ramp rules would plausibly over-claim. Task 4 re-audit: theme `draw` becomes role `draw` (lands from the library into hand; the theme now means rewarding draws). Gains the soulshift the first labelling missed — `recursion` to hand on its own death (trigger `dies`, not the deathTrigger theme) — and `tribal` (Spirit), a judgement since the trigger also accepts Arcane spells.",
  },
  {
    name: "Scuttling Death", klass: "thresholds",
    jobs: [
      j("role", "removal", { rt: "creature", af: "opponents", meth: "shrink", tr: "activated", rec: "oneShot" }),
      j("theme", "recursion", { rt: "Spirit", af: "self", dest: "hand", tr: "dies", rec: "oneShot", th: mv(4, "<=") }),
      j("theme", "tribal", { rt: "Spirit", af: "self", tr: "dies", rec: "oneShot" }),
    ],
    why: "-1/-1 until end of turn is removal only against a 1-toughness creature — weak removal, still removal. Sacrifices itself, so oneShot. Task 4 re-audit: `sacOutlet` removed (it sacrifices only itself); gains the soulshift the first labelling missed — `recursion` to hand on its own death (trigger `dies`, not the deathTrigger theme) — and `tribal` (Spirit), a judgement since soulshift is its only Spirit clause.",
  },
  {
    name: "Hedge Whisperer", klass: "thresholds",
    jobs: [
      j("theme", "haste", { rt: "land", af: "self", tr: "activated" }),
    ],
    why: "A HARD NEGATIVE for ramp: it animates a land, adding no mana. Collect evidence 4 is a threshold on the graveyard the schema records nowhere. Task 4 re-audit: gains `haste` — the animated land has haste, which the first labelling missed. Re-sample review: `pump` removed, since setting a land's power and toughness is not +X/+X.",
  },

  // ---- modal: jobs that are ALTERNATIVES, never a sum -------------------------
  {
    name: "Aether Channeler", klass: "modal",
    jobs: [
      j("theme", "tokens", { af: "self", tr: "etb", rec: "oneShot", modal: true }),
      j("role", "removal", { rt: "permanent", af: "opponents", meth: "bounce", tr: "etb", rec: "oneShot", modal: true }),
      j("role", "draw", { af: "self", tr: "etb", rec: "oneShot", modal: true }),
      j("theme", "etbDraw", { af: "self", tr: "etb", rec: "oneShot", modal: true }),
    ],
    why: "Three modes, one chosen. A consumer summing these credits the card with a token AND a bounce AND a draw — three cards' worth of jobs from one card. Task 4 re-audit: theme `draw` becomes `etbDraw` — a creature that draws when it enters is the newly defined etbDraw, while the draw theme now means rewarding draws. A judgement call that etbDraw covers a creature's own ETB.",
  },
  {
    name: "Retreat to Kazandu", klass: "modal",
    jobs: [
      j("theme", "counters", { rt: "creature", af: "self", tr: "landfall", modal: true }),
      j("theme", "lifegain", { af: "self", tr: "landfall", modal: true }),
      j("theme", "landfall", { af: "self", tr: "landfall" }),
    ],
    why: "Modal on every landfall, so the choice recurs — modal and repeatable together, which is not a contradiction.",
  },
  {
    name: "Pollenbright Druid", klass: "modal",
    jobs: [j("theme", "counters", { rt: "creature", af: "self", tr: "etb", rec: "oneShot", modal: true })],
    why: "Proliferate is not in the vocabulary, so only one mode has a job. A model may over-label the second mode as `counters`, which is why this card is here.",
  },
  {
    name: "Knight of Autumn", klass: "modal",
    jobs: [
      j("theme", "counters", { rt: "creature", af: "self", tr: "etb", rec: "oneShot", modal: true }),
      j("role", "removal", { rt: "artifact", af: "opponents", meth: "destroy", tr: "etb", rec: "oneShot", modal: true }),
      j("theme", "lifegain", { af: "self", tr: "etb", rec: "oneShot", modal: true }),
    ],
    why: "The classic three-mode ETB. The counters mode targets ITSELF only, which is a tighter restriction than 'creature' and one the schema cannot say.",
  },
  {
    name: "Inspired Inventor", klass: "modal",
    jobs: [
      j("theme", "counters", { rt: "creature", af: "self", tr: "etb", rec: "oneShot", modal: true }),
      j("theme", "tokens", { af: "self", tr: "etb", rec: "oneShot", modal: true }),
    ],
    why: "Energy is not in the vocabulary; two of three modes carry jobs.",
  },
  {
    name: "Qutrub Forayer", klass: "modal",
    jobs: [
      j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", tr: "etb", rec: "oneShot", modal: true }),
      j("theme", "graveyardHate", { af: "opponents", tr: "etb", rec: "oneShot", modal: true }),
    ],
    why: "Removal restricted to a creature ALREADY DAMAGED this turn — a condition on the board, not the target's type. Graveyard exile has no job. Task 4 re-audit: the graveyard-exile mode is now `graveyardHate`, which the vocabulary has. Affects opponents is a judgement: 'a single graveyard' could be yours, but the mode's intent is hate.",
  },
  {
    name: "Sylvan Scavenging", klass: "modal",
    jobs: [
      j("theme", "counters", { rt: "creature", af: "self", tr: "other", modal: true }),
      j("theme", "tokens", { af: "self", tr: "other", modal: true, th: { stat: "power", op: ">=", value: 4 } }),
    ],
    why: "One mode carries its OWN threshold (a creature with power 4+) while the other does not — per-job limits, not per-card.",
  },
  {
    name: "The Spear of Leonidas", klass: "modal",
    jobs: [
      j("theme", "tokens", { af: "self", tr: "attacks", rec: "oneShot", modal: true }),
      j("role", "draw", { af: "self", tr: "attacks", rec: "oneShot", modal: true }),
      j("theme", "discard", { af: "self", tr: "attacks", rec: "oneShot", modal: true }),
    ],
    why: "Equipment: every job is gated on the EQUIPPED creature attacking, so the card does nothing until it is attached and attacks. Task 4 re-audit: the double strike mode is no longer `pump` (now +X/+X only); theme `draw` becomes role `draw` for the rummage, and its discard-two is `discard` affects self.",
  },
  {
    name: "Flash Thompson, Spider-Fan", klass: "modal",
    jobs: [],
    why: "A HARD NEGATIVE. Tap and untap a creature are neither removal nor any theme in the vocabulary. 'Choose one or both' also breaks the modal binary. Correct label: no jobs. Task 4 re-audit: unchanged — the tightened removal definition now says outright that a tapper is not removal.",
  },
  {
    name: "Reckless Endeavor", klass: "modal",
    jobs: [
      j("role", "wipes", { af: "each", meth: "shrink", rec: "oneShot" }),
      j("theme", "treasure", { af: "self", rec: "oneShot" }),
      j("role", "ramp", { rk: "makesTreasure", af: "self", rec: "oneShot" }),
    ],
    why: "NOT modal despite 'choose one result' — the dice choose which number goes where, and the card does both halves. A model reading 'choose one' as modal is wrong here, which is why it is in this class.",
  },
  {
    name: "Jin Sakai, Ghost of Tsushima", klass: "modal",
    jobs: [
      j("role", "draw", { af: "self", tr: "combatDamage" }),
      j("theme", "evasion", { rt: "creature", af: "self", tr: "attacks", rec: "oneShot", modal: true }),
    ],
    why: "The draw is unconditional on combat damage; the modal part is gated on a creature attacking ALONE. Two triggers with different conditions on one card. Task 4 re-audit: theme `draw` removed (the role covers it); the modal job re-kinded from `pump` to `evasion` — Standoff grants double strike, which is not +X/+X and has no job, and Ghost grants can't-be-blocked, which is evasion.",
  },
  {
    name: "Hollow Specter", klass: "modal",
    jobs: [
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "discard", { af: "opponents", tr: "combatDamage" }),
    ],
    why: "A HARD NEGATIVE for modality: no modes at all, it just matched 'choose'. Discard is not in the vocabulary. Flying on itself is the only job. Task 4 re-audit: gains `discard` affects opponents, now in the vocabulary. Still a hard negative for modality.",
  },

  // ---- twoFaced: the front face is the only one the rules read ---------------
  {
    name: "Invasion of Zendikar // Awakened Skyclave", klass: "twoFaced",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", tr: "etb", rec: "oneShot" })],
    why: "A genuine fetchesLand — two basics onto the battlefield. The back face is a creature with no jobs; a labeller reading both faces would double-count.",
  },
  {
    name: "Drowner of Truth // Drowned Jungle", klass: "twoFaced",
    jobs: [
      j("theme", "tokens", { af: "self", tr: "cast", rec: "oneShot" }),
      j("role", "ramp", { rk: "burstMana", af: "self", tr: "cast", rec: "oneShot" }),
    ],
    why: "MDFC: the back is a land, but the FRONT is what the rules read. The Spawn tokens sacrifice for {C} — kindless burst again, and indirect.",
  },
  {
    name: "Strength of the Harvest // Haven of the Harvest", klass: "twoFaced",
    jobs: [j("theme", "pump", { rt: "creature", af: "self" })],
    why: "MDFC whose back face is a land. The front is an Aura pump scaling with permanents. Choosing the land face gives the deck a land and NO job — the schema labels the card, not the choice.",
  },
  {
    name: "Ettercap // Web Shot", klass: "twoFaced",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", rec: "oneShot" })],
    why: "Adventure: the removal lives on the ADVENTURE half and the creature on the front. Both are genuinely available from one card, unlike an MDFC land. Task 4 re-audit: `evasion` removed — reach is not in the evasion definition.",
  },
  {
    name: "Lonesome Unicorn // Rider in Need", klass: "twoFaced",
    jobs: [j("theme", "tokens", { af: "self", rec: "oneShot" })],
    why: "Adventure making a token. Vigilance is not in the vocabulary.",
  },
  {
    name: "Spring-Loaded Sawblades // Bladewheel Chariot", klass: "twoFaced",
    jobs: [
      j("role", "removal", { rt: "creature", af: "opponents", meth: "shrink", tr: "etb", rec: "oneShot" }),
    ],
    why: "Removal restricted to a TAPPED creature an opponent controls — a state restriction, not a type one, which the schema records only as the type.",
  },
  {
    name: "The Kami War // O-Kagachi Made Manifest", klass: "twoFaced",
    jobs: [
      j("role", "removal", { rt: "permanent", af: "opponents", meth: "exile", rec: "oneShot" }),
      j("role", "removal", { rt: "permanent", af: "opponents", meth: "bounce", rec: "oneShot" }),
      j("theme", "discard", { af: "opponents", rec: "oneShot" }),
    ],
    why: "A Saga: its chapters fire on a timer, so the removal is real but slow. Chapters are neither modal nor simultaneous — a shape the schema has no field for. Task 4 re-audit: split into two removal jobs by method — chapter I exiles, chapter II bounces — and gains `discard` affects opponents for chapter II's 'each opponent discards a card', now in the vocabulary.",
  },
  {
    name: "Dorothea, Vengeful Victim // Dorothea's Retribution", klass: "twoFaced",
    jobs: [j("theme", "evasion", { rt: "creature", af: "self" })],
    why: "The token clause is on the BACK face (the Aura), reachable only via Disturb. Front-face reading misses it — deliberately included to measure that. Task 4 re-audit: `tokens` removed. The model is now sent the FRONT face only for a transform card (`castFaceText`), so a back-face clause is one it never sees and the gold set labels only the front.",
  },
  {
    name: "Blaster, Combat DJ // Blaster, Morale Booster", klass: "twoFaced",
    jobs: [j("theme", "counters", { rt: "artifact", af: "self" })],
    why: "Modular grants counters, restricted to artifact creatures and Vehicles. The convert clause is a transform, not a job.",
  },
  {
    name: "Ral, Monsoon Mage // Ral, Leyline Prodigy", klass: "twoFaced",
    jobs: [
      j("theme", "spellslinger", { af: "self", tr: "cast" }),
      j("role", "ramp", { rk: "costReduction", rt: "instant or sorcery", af: "self" }),
    ],
    why: "Cost reduction is not in the vocabulary. The coin flip is a condition no schema field holds. A near-empty label on a complex card, by design. Task 4 re-audit: gains ramp `costReduction` (instants and sorceries cost {1} less), a kind the vocabulary now has.",
  },

  // ---- lands: a land's role is `land`, and ramp is never a land's job ---------
  {
    name: "Uncharted Haven", klass: "lands",
    jobs: [j("role", "land", { af: "self" })],
    why: "The baseline. Taps for mana, but `classifyRoles` gives a land the `land` role and skips ramp entirely — every deck plays lands, so a land that makes mana is not acceleration.",
  },
  {
    name: "Rimewood Falls", klass: "lands",
    jobs: [j("role", "land", { af: "self" })],
    why: "A dual that enters tapped and nothing else. The purest negative in the set.",
  },
  {
    name: "Temple of Malady", klass: "lands",
    jobs: [j("role", "land", { af: "self" })],
    why: "Scry is not in the vocabulary, so the scry land is indistinguishable from a plain dual here — a vocabulary gap, not a labelling error.",
  },
  {
    name: "Sejiri Refuge", klass: "lands",
    jobs: [
      j("role", "land", { af: "self" }),
      j("theme", "lifegain", { af: "self", tr: "etb", rec: "oneShot" }),
    ],
    why: "A gain-land: the 1 life is genuinely the lifegain theme, one-shot on entry.",
  },
  {
    name: "Razortide Bridge", klass: "lands",
    jobs: [
      j("role", "land", { af: "self" }),
      j("theme", "protection", { af: "self" }),
    ],
    why: "Indestructible on itself is the protection theme by the rule's own wording — arguably noise on a land, which is why it is worth measuring.",
  },
  {
    name: "Escape Tunnel", klass: "lands",
    jobs: [
      j("role", "land", { af: "self" }),
      j("theme", "evasion", { rt: "creature", af: "self", tr: "activated", rec: "oneShot" }),
    ],
    why: "Sacrifices for a basic (a fetch, but on a LAND, so no ramp role) or makes a small creature unblockable. Both one-shot and mutually exclusive in practice.",
  },
  {
    name: "Miren, the Moaning Well", klass: "lands",
    jobs: [
      j("role", "land", { af: "self" }),
      j("theme", "lifegain", { af: "self", tr: "activated" }),
      j("theme", "sacOutlet", { af: "self", tr: "activated" }),
    ],
    why: "A repeatable sacrifice outlet on a land, which the role vocabulary cannot express at all.",
  },
  {
    name: "Barbarian Ring", klass: "lands",
    jobs: [
      j("role", "land", { af: "self" }),
      j("role", "removal", { af: "opponents", meth: "shrink", tr: "activated", rec: "oneShot", th: { stat: "cardsInGraveyard", op: ">=", value: 7 } }),
    ],
    why: "Threshold in the literal sense: removal only with seven cards in the graveyard, and it sacrifices the land.",
  },
  {
    name: "Wandering Fumarole", klass: "lands",
    jobs: [
      j("role", "land", { af: "self" }),
    ],
    why: "Animates itself. Not a creature job: the land becomes the creature, and setting its power and toughness is not pump (re-sample review).",
  },
  {
    name: "Kjeldoran Outpost", klass: "lands",
    jobs: [
      j("role", "land", { af: "self" }),
      j("theme", "tokens", { af: "self", tr: "activated" }),
    ],
    why: "A repeatable token engine on a land, at the cost of sacrificing a Plains to play it — an entry cost the schema cannot record.",
  },

  // ---- fetchesLand: the kind distinction from the other side -----------------
  {
    name: "Ulvenwald Hydra", klass: "fetchesLand",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", tr: "etb", rec: "oneShot" })],
    why: "A clean fetchesLand: a land onto the battlefield, once, on entry. Any land, not just a basic. Task 4 re-audit: `evasion` removed — reach is not in the evasion definition.",
  },
  {
    name: "Thunderherd Migration", klass: "fetchesLand",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", rec: "oneShot" })],
    why: "A sorcery fetch whose COST is gated on revealing a Dinosaur — a tribal condition on casting rather than on the effect, which the schema records nowhere.",
  },
  {
    name: "Weathered Wayfarer", klass: "fetchesLand",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", tr: "activated" })],
    why: "REPEATABLE fetch, but to HAND and only while an opponent has more lands. Repeatable and conditional at once; a Treasure-versus-tap reading misses both. NOTE: E1 assigns no kind here — its `FETCHES` rule requires `onto the battlefield` — while 2b's written definition says \"onto the battlefield or into the hand\". The prose and the code disagree; this label follows the prose and the divergence is raised with 2b rather than settled here.",
  },
  {
    name: "Silver Deputy", klass: "fetchesLand",
    jobs: [j("theme", "pump", { rt: "creature", af: "self", tr: "activated", rec: "oneShot" })],
    why: "A HARD NEGATIVE for fetchesLand: it puts the land ON TOP of the library, not into hand or play. No mana is accelerated, so no ramp job at all. Task 4 re-audit: unchanged, and now also a hard negative for `tutor`: a land search is never a tutor.",
  },
  {
    name: "Marshals' Pathcruiser", klass: "fetchesLand",
    jobs: [
      j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "counters", { af: "self", tr: "activated", rec: "oneShot" }),
    ],
    why: "Fetch to HAND, which still counts as fetchesLand by 2b's written definition ('onto the battlefield or into the hand'). NOTE, the same divergence as `Weathered Wayfarer`: E1 assigns this card no kind, because its `FETCHES` rule requires `onto the battlefield`. The prose and the code disagree; this label follows the prose and the divergence is raised with 2b rather than settled here.",
  },
  {
    name: "Bant Panorama", klass: "fetchesLand",
    jobs: [j("role", "land", { af: "self" })],
    why: "Fetches a basic, but it IS a land, so no ramp role — the clearest case of the land rule swallowing a genuine fetch.",
  },
  {
    name: "Maestros Theater", klass: "fetchesLand",
    jobs: [
      j("role", "land", { af: "self" }),
      j("theme", "lifegain", { af: "self", tr: "etb", rec: "oneShot" }),
    ],
    why: "Sacrifices itself on entry to fetch. A land again, so no ramp.",
  },
  {
    name: "Topiary Panther", klass: "fetchesLand",
    jobs: [j("theme", "evasion", { rt: "creature", af: "self" })],
    why: "A HARD NEGATIVE: basic landcycling is a DISCARD outlet that fetches, from hand, at the cost of the card. Not ramp in play. Trample is its only job.",
  },
  {
    name: "Roxxon Brutes", klass: "fetchesLand",
    jobs: [
      j("theme", "counters", { rt: "creature", af: "self", tr: "other" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "draw", { af: "self", tr: "other" }),
    ],
    why: "Landcycling again, so no ramp. The counter trigger is on drawing a SECOND card each turn. Task 4 re-audit: gains theme `draw` — a counter whenever you draw your second card each turn is exactly the newly defined 'rewards you for the cards you draw'.",
  },

  // ---- easy: a model that over-labels a simple card is caught here -----------
  {
    name: "Pincer Spider", klass: "easy",
    jobs: [j("theme", "counters", { af: "self", rec: "oneShot" })],
    why: "Enters with a counter on itself if kicked. Reach only. Task 4 re-audit: `evasion` removed — reach is not in the evasion definition, so the card has one job.",
  },
  {
    name: "Ritual of Steel", klass: "easy",
    jobs: [
      j("role", "draw", { af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "pump", { rt: "creature", af: "self" }),
    ],
    why: "A delayed draw and a +0/+2. Simple, and a good check that a model does not invent limits. Task 4 re-audit: theme `draw` removed; the role covers the delayed draw.",
  },
  {
    name: "Fire Nation Attacks", klass: "easy",
    jobs: [j("theme", "tokens", { af: "self", rec: "oneShot" })],
    why: "Two tokens. Flashback makes it twice-castable, not repeatable in play.",
  },
  {
    name: "Circuit Mender", klass: "easy",
    jobs: [
      j("theme", "lifegain", { af: "self", tr: "etb", rec: "oneShot" }),
      j("role", "draw", { af: "self", tr: "other", rec: "oneShot" }),
    ],
    why: "Gain on entry, draw on LEAVING — two different triggers, neither optional. Task 4 re-audit: theme `draw` removed; the role covers the draw. Not `deathTrigger`: 'leaves the battlefield' includes dying but is not a death trigger (judgement).",
  },
  {
    name: "Impaler Shrike", klass: "easy",
    jobs: [
      j("role", "draw", { af: "self", tr: "combatDamage", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Draw three, but it sacrifices itself, so oneShot — and it must connect first. Task 4 re-audit: theme `draw` removed; the role covers the draw.",
  },
  {
    name: "Cryptcaller Chariot", klass: "easy",
    jobs: [
      j("theme", "tokens", { af: "self", tr: "other" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Tokens on discard, repeatable. A Vehicle, so it needs crewing to attack. Task 4 re-audit: still not `discard`, which makes a player discard; this rewards a discard something else causes (judgement).",
  },
  {
    name: "Coretapper", klass: "easy",
    jobs: [],
    why: "A HARD NEGATIVE. CHARGE counters on an artifact are not +1/+1 counters, so not the `counters` theme. Sacrificing itself is a cost, not the sacOutlet theme (which is an outlet for OTHER permanents). Correct label: no jobs.",
  },
  {
    name: "Creakwood Ghoul", klass: "easy",
    jobs: [
      j("theme", "lifegain", { af: "self", tr: "activated" }),
      j("theme", "graveyardHate", { af: "opponents", tr: "activated" }),
    ],
    why: "Graveyard exile is not in the vocabulary. Gains 1 life, repeatably. Task 4 re-audit: gains `graveyardHate`, now in the vocabulary. Affects opponents is a judgement: 'a graveyard' could be yours, but repeatable exile is hate.",
  },
  {
    name: "Deathcult Rogue", klass: "easy",
    jobs: [j("theme", "evasion", { rt: "creature", af: "self" })],
    why: "'Can't be blocked except by Rogues' is the evasion rule's own `can't be blocked` clause, partially negated. A judgement call: recorded as evasion because it is nearly unblockable in most decks.",
  },
  {
    name: "Wartime Protestors", klass: "easy",
    jobs: [
      j("theme", "counters", { rt: "Ally", af: "self", tr: "etb" }),
      j("theme", "haste", { rt: "Ally", af: "self", tr: "etb" }),
      j("theme", "tribal", { rt: "Ally", af: "self", tr: "etb" }),
    ],
    why: "Ally-restricted on both jobs — an `easy` card that is actually tribal, which is why it is here rather than in the tribal class. Task 4 re-audit: gains `tribal` (Ally) under the new definition.",
  },
  {
    name: "Earthbender Ascension", klass: "easy",
    jobs: [
      j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "landfall", { af: "self", tr: "landfall" }),
      j("theme", "counters", { rt: "creature", af: "self", tr: "landfall", th: { stat: "counters", op: ">=", value: 4 } }),
      j("theme", "evasion", { rt: "creature", af: "self", tr: "landfall", rec: "oneShot" }),
    ],
    why: "A real fetchesLand on an enchantment, plus a landfall counter engine. Task 4 re-audit: gains `counters` and `evasion` (trample until end of turn) for the landfall payoff once four quest counters are on it, which the first labelling missed.",
  },
  {
    name: "Extract Power", klass: "easy",
    jobs: [
      j("theme", "castFree", { af: "each", rec: "oneShot" }),
      j("theme", "theft", { af: "opponents", rec: "oneShot" }),
    ],
    why: "Play cards without paying their costs — castFree, from every player's library. Task 4 re-audit: gains `theft` — the new theme includes casting an opponent's card, and this plays the top card of each opponent's library. castFree affects each, since it exiles from every player's library.",
  },
  {
    name: "Khorvath's Fury", klass: "easy",
    jobs: [
      j("role", "draw", { af: "each", rec: "oneShot" }),
      j("theme", "discard", { af: "each", rec: "oneShot" }),
    ],
    why: "A symmetrical wheel. The damage is to PLAYERS, so not removal; it is closest to drain but the vocabulary's drain rule wants a life-loss clause, which this has not. Task 4 re-audit: theme `draw` removed (the role covers the wheel); gains `discard`, now in the vocabulary. Both affects each, a judgement: 'friend' can be any player. The damage to foes is still not `drain`, because each player chooses friend or foe, so it is not aimed at opponents alone.",
  },
  {
    name: "Lady Octopus, Inspired Inventor", klass: "easy",
    jobs: [
      j("theme", "castFree", { rt: "artifact", af: "self", tr: "activated" }),
      j("theme", "draw", { af: "self", tr: "other" }),
    ],
    why: "Casts an artifact from hand gated on a counter count — castFree in spirit (no cost paid), and a threshold the schema records on the job. Task 4 re-audit: gains theme `draw` — an ingenuity counter for your first and second draw each turn rewards the cards you draw.",
  },

];

/**
 * Every gold row: the audited first set, then the vocabulary plan's Task 4 coverage, which gives each new
 * or changed job at least 8 positives and 4 hard negatives, and each consumer-read field its own cases.
 */
export const GOLD: GoldRow[] = [...AUDITED, ...COVERAGE_ROLES, ...COVERAGE_THEMES, ...COVERAGE_FIELDS, ...COVERAGE_RULINGS];

/** Fails loudly rather than scoring a malformed gold set. */
export function validateGold(rows = GOLD) {
  const bad = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.name)) bad.push(`${row.name}: listed twice`);
    seen.add(row.name);
    if (!row.why || row.why.length < 20) bad.push(`${row.name}: no reasoning recorded`);
    for (const job of row.jobs) {
      // No excuse for a missing `affects`, `to` or `method` since the vocabulary plan's Task 4: every row is
      // judged on all three, and one that is not is reported here rather than scored on a guess.
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
