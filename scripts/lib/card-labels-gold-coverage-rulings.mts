// Gold coverage for d9's rulings of 2026-10-02: the `multiplies` ramp kind, the `sacrifice` and `bottom`
// methods, and shroud and hexproof-for-yourself as protection. Each new value has its own positives and
// hard negatives, because a value with no gold cases is a bar nothing can be scored against.
import { j, mv, type GoldRow } from "./card-labels-gold-helpers.mjs";

const once = { rec: "oneShot" } as const;

export const COVERAGE_RULINGS: GoldRow[] = [
  // ---- ramp kind `multiplies` ------------------------------------------------------------------
  {
    name: "Nyxbloom Ancient", klass: "multiplies",
    jobs: [
      j("role", "ramp", { rk: "multiplies", af: "self" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Any permanent you tap for mana produces three times as much: multiplies mana you already make, unrestricted by type (rt null). Not doublers: mana is multiplies alone (d9, 2026-10-02). Trigger none: a static replacement. Trample on itself is evasion.",
  },
  {
    name: "Mirari's Wake", klass: "multiplies",
    jobs: [
      j("role", "ramp", { rk: "multiplies", rt: "land", af: "self" }),
      j("theme", "pump", { rt: "creature", af: "self" }),
    ],
    why: "Each land you tap adds one more of the same type: multiplies, restricted to land; mana is never doublers (d9, 2026-10-02). Trigger none, matching that precedent: the bonus rides every tap. Anthem is pump.",
  },
  {
    name: "Mana Flare", klass: "multiplies",
    jobs: [
      j("role", "ramp", { rk: "multiplies", rt: "land", af: "each" }),
    ],
    why: "Every player's lands add one more of the same type: multiplies (never doublers: d9, 2026-10-02), affects EACH because opponents get it too, which is the whole difference from Mirari's Wake. Judgement: affects each on a ramp job, where nearly every ramp is self.",
  },
  {
    name: "Wild Growth", klass: "multiplies",
    jobs: [j("role", "ramp", { rk: "multiplies", rt: "land", af: "self" })],
    why: "The enchanted land adds an extra {G} whenever it is tapped: multiplies mana you already make, not tapsForMana (the Aura has no tap ability of its own). Judgement: NOT doublers, since it adds one mana to one land rather than doubling what you get broadly; and af self though 'its controller' could in principle be an opponent if enchanted on their land.",
  },
  {
    name: "Utopia Sprawl", klass: "multiplies",
    jobs: [j("role", "ramp", { rk: "multiplies", rt: "Forest", af: "self" })],
    why: "Enchant Forest: an extra mana of the chosen colour whenever that Forest taps. Multiplies, restricted to Forest exactly as printed. Same not-doublers judgement as Wild Growth.",
  },
  {
    name: "Caged Sun", klass: "multiplies",
    jobs: [
      j("role", "ramp", { rk: "multiplies", rt: "land", af: "self" }),
      j("theme", "pump", { rt: "creature", af: "self" }),
    ],
    why: "A land's mana of the chosen colour gets an additional one: multiplies alone, since mana is never doublers (d9, 2026-10-02). Judgement: the colour gate is not a type, so rt is land. Creatures of the colour get +1/+1: pump.",
  },
  {
    name: "Mana Echoes", klass: "multiplies",
    jobs: [j("role", "ramp", { rk: "multiplies", af: "self", tr: "etb" })],
    why: "Makes {C} when a creature enters: the 'makes mana when something else happens' clause of multiplies, triggered by an entry (etb, as Captain Storm's artifact-enters trigger is labelled). Judgement: not tribal, since it cares that creatures SHARE a type rather than about one type; not doublers.",
  },
  {
    name: "Vorinclex, Voice of Hunger", klass: "multiplies",
    jobs: [
      j("role", "ramp", { rk: "multiplies", rt: "land", af: "self" }),
      j("theme", "doublers", { af: "self" }),
      j("theme", "stax", { rt: "land", af: "opponents", tr: "other" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Your lands add one more of the same type: multiplies and doublers (the Mirari's Wake half). An opponent's land tapped for mana doesn't untap next turn: stax, on an opponent's tap (trigger other). Trample is evasion.",
  },
  {
    name: "Arcane Signet", klass: "multipliesNeg",
    jobs: [j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" })],
    why: "A HARD NEGATIVE for multiplies: a plain mana rock MAKES new mana with its own tap ability, it does not add to mana something else makes. tapsForMana.",
  },
  {
    name: "Professional Face-Breaker", klass: "multipliesNeg",
    jobs: [
      j("role", "ramp", { rk: "makesTreasure", af: "self", tr: "combatDamage" }),
      j("theme", "treasure", { af: "self", tr: "combatDamage" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "A HARD NEGATIVE for multiplies: it makes mana 'when something else happens' (combat damage), but as a Treasure token, which is makesTreasure and never multiplies. Menace is evasion. Judgement: the sacrifice-a-Treasure impulse draw is not draw (nothing goes to hand) and is left unlabelled.",
  },
  {
    name: "Rite of Flame", klass: "multipliesNeg",
    jobs: [j("role", "ramp", { rk: "burstMana", af: "self", ...once })],
    why: "A HARD NEGATIVE for multiplies: a ritual whose output GROWS with each Rite of Flame in graveyards reads like 'adds to mana', but it is one spell making one-time mana: burstMana, oneShot.",
  },
  {
    name: "Semblance Anvil", klass: "multipliesNeg",
    jobs: [j("role", "ramp", { rk: "costReduction", af: "self" })],
    why: "A HARD NEGATIVE for multiplies: it makes spells sharing a type with the imprinted card cost {2} less, which saves mana rather than adding to it: costReduction. rt null, since the type is whatever was imprinted.",
  },

  // ---- method `sacrifice` (edicts) --------------------------------------------------------------
  {
    name: "Diabolic Edict", klass: "sacrifice",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "sacrifice", ...once })],
    why: "The canonical edict: target player sacrifices a creature of their choice. Removal by method sacrifice, affects opponents ('target player' by intent).",
  },
  {
    name: "Chainer's Edict", klass: "sacrifice",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "sacrifice", ...once })],
    why: "An edict with flashback: method sacrifice. oneShot per the flashback convention (Moment's Peace). Casting it from the graveyard is not recursion, since no card returns.",
  },
  {
    name: "Liliana's Triumph", klass: "sacrifice",
    jobs: [
      j("role", "removal", { rt: "creature", af: "opponents", meth: "sacrifice", ...once }),
      j("theme", "discard", { af: "opponents", ...once }),
    ],
    why: "Each opponent sacrifices a creature: removal by sacrifice. Judgement: the discard is labelled though it needs a Liliana planeswalker, a condition with no threshold stat.",
  },
  {
    name: "Sheoldred's Edict", klass: "sacrifice",
    jobs: [j("role", "removal", { af: "opponents", meth: "sacrifice", ...once })],
    why: "Each opponent sacrifices a nontoken creature, a creature token, or a planeswalker: every mode is the same edict, so ONE removal job. Judgement: modal false, because whichever mode is chosen the card does this job; rt null because the modes span creatures and planeswalkers.",
  },
  {
    name: "Dictate of Erebos", klass: "sacrifice",
    jobs: [
      j("theme", "deathTrigger", { rt: "creature", af: "self", tr: "dies" }),
      j("role", "removal", { rt: "creature", af: "opponents", meth: "sacrifice", tr: "dies" }),
    ],
    why: "Grave Pact with flash: each of your creatures dying makes each opponent sacrifice one. A repeatable edict, method sacrifice, on a death trigger.",
  },
  {
    name: "Butcher of Malakir", klass: "sacrifice",
    jobs: [
      j("theme", "deathTrigger", { rt: "creature", af: "self", tr: "dies" }),
      j("role", "removal", { rt: "creature", af: "opponents", meth: "sacrifice", tr: "dies" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Itself or another creature you control dying makes each opponent sacrifice a creature: repeatable edict on a death trigger. Flying is evasion.",
  },
  {
    name: "Soul Shatter", klass: "sacrifice",
    jobs: [j("role", "removal", { af: "opponents", meth: "sacrifice", ...once })],
    why: "Each opponent sacrifices their creature or planeswalker with the greatest mana value: an edict that picks the biggest, method sacrifice. rt null, two types. No threshold: 'greatest' is relative, not a number.",
  },
  {
    name: "All Is Dust", klass: "sacrifice",
    jobs: [j("role", "wipes", { rt: "permanent", af: "each", meth: "sacrifice", ...once })],
    why: "EACH player sacrifices every coloured permanent: a wipe by edict, affects each, method sacrifice. Judgement: rt permanent, since it hits every coloured permanent type rather than creatures alone.",
  },
  {
    name: "Altar of Dementia", klass: "sacrificeNeg",
    jobs: [
      j("theme", "sacOutlet", { rt: "creature", af: "self", tr: "activated" }),
      j("theme", "mill", { af: "opponents", tr: "activated" }),
    ],
    why: "A HARD NEGATIVE for method sacrifice: YOU sacrifice your own creatures, repeatably. That is a sacOutlet, not an edict, and no opponent's permanent is removed. The mill is 'target player', opponents by intent.",
  },
  {
    name: "Bone Splinters", klass: "sacrificeNeg",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", ...once })],
    why: "A HARD NEGATIVE for method sacrifice: the word is on the card, but YOU sacrifice a creature as a cost, and the removal itself destroys. Method destroy. Not a sacOutlet: a one-time additional cost.",
  },
  {
    name: "Hero's Downfall", klass: "sacrificeNeg",
    jobs: [j("role", "removal", { af: "opponents", meth: "destroy", ...once })],
    why: "A HARD NEGATIVE for method sacrifice: hits the same creature-or-planeswalker targets as Soul Shatter but the caster chooses and it destroys. rt null, two types.",
  },
  {
    name: "Banishing Light", klass: "sacrificeNeg",
    jobs: [j("role", "removal", { rt: "permanent", af: "opponents", meth: "exile", tr: "etb", ...once })],
    why: "A HARD NEGATIVE for method sacrifice: removal aimed at an opponent's permanent, but by exile until it leaves, not by making them sacrifice. Oblivion Ring's shape.",
  },

  // ---- method `bottom` (tucks) ------------------------------------------------------------------
  {
    name: "Condemn", klass: "bottom",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "bottom", ...once })],
    why: "Target attacking creature goes to the bottom of its owner's library: the canonical tuck. The life its controller gains goes to the opponent, so no lifegain job.",
  },
  {
    name: "Terminus", klass: "bottom",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "bottom", ...once })],
    why: "All creatures to the bottom of their owners' libraries: a tuck wipe, affects each. Miracle is a cheaper cost paid, not castFree.",
  },
  {
    name: "Hallowed Burial", klass: "bottom",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "bottom", ...once })],
    why: "Terminus without miracle: every creature tucked, affects each, method bottom.",
  },
  {
    name: "Bant Charm", klass: "bottom",
    jobs: [
      j("role", "removal", { rt: "artifact", af: "opponents", meth: "destroy", modal: true, ...once }),
      j("role", "removal", { rt: "creature", af: "opponents", meth: "bottom", modal: true, ...once }),
      j("role", "counterspell", { rt: "instant", af: "opponents", modal: true, ...once }),
    ],
    why: "Choose one: destroy an artifact, tuck a creature, or counter an instant. Three alternatives, every job modal. Two removal jobs because the two modes differ in method and type.",
  },
  {
    name: "Eternal Isolation", klass: "bottom",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "bottom", th: { stat: "power", op: ">=", value: 4 }, ...once })],
    why: "Tucks a creature with power 4 or greater: method bottom, gated by a power THRESHOLD.",
  },
  {
    name: "Forced Landing", klass: "bottom",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "bottom", ...once })],
    why: "Tucks a creature with flying. Judgement: 'with flying' is a keyword gate, not a type and not a number, so rt creature and no threshold.",
  },
  {
    name: "The Spot's Portal", klass: "bottom",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "bottom", ...once })],
    why: "Unconditional creature tuck. The 2 life you may lose is a cost to you, not a job.",
  },
  {
    name: "Brutalizer Exarch", klass: "bottom",
    jobs: [
      j("role", "tutor", { rt: "creature", af: "self", dest: "top", tr: "etb", modal: true, ...once }),
      j("role", "removal", { rt: "noncreature", af: "opponents", meth: "bottom", tr: "etb", modal: true, ...once }),
    ],
    why: "ETB, choose one: tutor a creature to the TOP of your library, or tuck a noncreature permanent to the BOTTOM of its owner's. Both modal and oneShot. The one permanent among the tuck positives.",
  },
  {
    name: "Chaos Warp", klass: "bottomNeg",
    jobs: [j("role", "removal", { rt: "permanent", af: "opponents", meth: null, ...once })],
    why: "A HARD NEGATIVE for method bottom: the permanent goes into its owner's LIBRARY but is SHUFFLED in, not put on the bottom. Judgement: method null, since a shuffle is none of destroy, exile, bounce, shrink, sacrifice or bottom; the reveal may put a replacement permanent onto the battlefield, which no job names.",
  },
  {
    name: "Disperse", klass: "bottomNeg",
    jobs: [j("role", "removal", { rt: "permanent", af: "opponents", meth: "bounce", ...once })],
    why: "A HARD NEGATIVE for method bottom: the nonland permanent leaves for its owner's HAND, not the library. Method bounce.",
  },
  {
    name: "Detention Sphere", klass: "bottomNeg",
    jobs: [j("role", "removal", { rt: "permanent", af: "opponents", meth: "exile", tr: "etb", ...once })],
    why: "A HARD NEGATIVE for method bottom: removal that sets the card aside, but in exile until the Sphere leaves. Method exile. The same-name sweep can catch your own copies; affects opponents by the removal rule.",
  },
  {
    name: "Griptide", klass: "bottomNeg",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: null, ...once })],
    why: "A HARD NEGATIVE for method bottom: the creature goes to the TOP of its owner's library, the near-miss of a tuck. Judgement: method null, because no method names 'top of library' (bottom is the bottom only, and it is not a bounce to hand).",
  },

  // ---- protection: shroud, and hexproof or shroud for YOU ---------------------------------------
  {
    name: "Lightning Greaves", klass: "protectionShroud",
    jobs: [
      j("theme", "protection", { rt: "creature", af: "self" }),
      j("theme", "haste", { rt: "creature", af: "self" }),
    ],
    why: "Equipped creature has SHROUD and haste, equip {0}: protection by shroud, the Swiftfoot Boots row's twin with shroud in place of hexproof.",
  },
  {
    name: "Whispersilk Cloak", klass: "protectionShroud",
    jobs: [
      j("theme", "protection", { rt: "creature", af: "self" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Equipped creature has shroud (protection) and can't be blocked (evasion).",
  },
  {
    name: "Leyline of Sanctity", klass: "protectionYou",
    jobs: [j("theme", "protection", { af: "self" })],
    why: "YOU have hexproof: protection by the 'giving you hexproof' clause. rt null, since it protects a player rather than a card type. The opening-hand clause is not castFree (judgement: it is never cast).",
  },
  {
    name: "Aegis of the Gods", klass: "protectionYou",
    jobs: [j("theme", "protection", { af: "self" })],
    why: "A creature whose only text is 'You have hexproof': protection for the player, rt null.",
  },
  {
    name: "Spirit of the Hearth", klass: "protectionYou",
    jobs: [
      j("theme", "protection", { af: "self" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "You have hexproof (protection, rt null, for the player) on a flier (evasion).",
  },
  {
    name: "True Believer", klass: "protectionYou",
    jobs: [j("theme", "protection", { af: "self" })],
    why: "YOU have shroud: protection by the 'giving you shroud' clause. Judgement: shroud also stops your own targeted spells reaching you, but the job is still protection.",
  },
  {
    name: "Ivory Mask", klass: "protectionYou",
    jobs: [j("theme", "protection", { af: "self" })],
    why: "An enchantment whose only text is 'You have shroud': protection for the player.",
  },
  {
    name: "Shalai, Voice of Plenty", klass: "protectionYou",
    jobs: [
      j("theme", "protection", { af: "self" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "counters", { rt: "creature", af: "self", tr: "activated" }),
    ],
    why: "You, your planeswalkers and your other creatures have hexproof: ONE protection job, rt null because it covers a player and two permanent types. Flying is evasion. The activation puts a +1/+1 counter on each creature you control: counters.",
  },
  {
    name: "Root Snare", klass: "protectionNeg",
    jobs: [j("theme", "fog", { af: "self", ...once })],
    why: "A HARD NEGATIVE for protection: it prevents all combat damage this turn, which protects you in effect, but that is a fog and a fog is not protection.",
  },
  {
    name: "Chaplain's Blessing", klass: "protectionNeg",
    jobs: [j("theme", "lifegain", { af: "self", ...once })],
    why: "A HARD NEGATIVE for protection: gaining 5 life keeps you alive but gives you no hexproof or shroud. Lifegain, oneShot.",
  },
  {
    name: "Abrupt Decay", klass: "protectionNeg",
    jobs: [j("role", "removal", { rt: "permanent", af: "opponents", meth: "destroy", th: mv(3, "<="), ...once })],
    why: "A HARD NEGATIVE for protection: 'can't be countered' shields the SPELL, not a permanent or a player, so it is no protection job. Destroys a nonland permanent with mana value 3 or less: removal, threshold mv <= 3.",
  },
  {
    name: "Platinum Angel", klass: "protectionNeg",
    jobs: [j("theme", "evasion", { rt: "creature", af: "self" })],
    why: "A HARD NEGATIVE for protection-for-you: 'you can't lose the game' guards the player, but it is neither hexproof nor shroud and nothing in the protection list. Judgement: the clause has no job (it is not finisher, which is about winning). Flying is evasion.",
  },
  // ---- the coverage floor's last cases (the per-job test in card-labels-schema.test.mts) ---------
  {
    name: "Bazaar Trader", klass: "theftNeg",
    jobs: [],
    why: "A HARD NEGATIVE for theft: Donate's shape on a creature. It hands YOUR artifact, creature or land to a target player, moving control away from you. No job in the vocabulary.",
  },
  {
    name: "Gurmag Angler", klass: "costReductionNeg",
    jobs: [],
    why: "A HARD NEGATIVE for costReduction: delve pays only ITS OWN cost, the self-affinity case the definition excludes. A vanilla 5/5 otherwise.",
  },
  {
    name: "Carrion Feeder", klass: "deathTriggerNeg",
    jobs: [
      j("theme", "sacOutlet", { rt: "creature", af: "self", tr: "activated" }),
      j("theme", "counters", { af: "self", tr: "activated" }),
    ],
    why: "A HARD NEGATIVE for deathTrigger: it CAUSES a death as a free cost and grows from the sacrifice, not from a creature dying. The +1/+1 counter goes on itself.",
  },
  {
    name: "Shardless Agent", klass: "castFree",
    jobs: [j("theme", "castFree", { af: "self", tr: "cast", ...once })],
    why: "Cascade: casting it casts a cheaper nonland card from your library without paying its mana cost. One cast per cast of this, so oneShot, triggered on cast. 'Costs less' is relative to this card, so no threshold.",
  },
  {
    name: "Bloodbraid Elf", klass: "castFree",
    jobs: [j("theme", "castFree", { af: "self", tr: "cast", ...once })],
    why: "Cascade, as Shardless Agent. Haste is a keyword on itself and no job.",
  },
  {
    name: "Fist of Suns", klass: "castFreeNeg",
    jobs: [],
    why: "A HARD NEGATIVE for castFree: an ALTERNATIVE cost of WUBRG is still paid, so nothing is cast free. Not costReduction either, because it lowers no cost by a fixed amount (judgement: for most spells it costs more).",
  },
  {
    name: "Sapphire Medallion", klass: "castFreeNeg",
    jobs: [j("role", "ramp", { rk: "costReduction", rt: "blue", af: "self" })],
    why: "A HARD NEGATIVE for castFree: blue spells cost {1} less, which is costReduction. You still pay the rest.",
  },
  {
    name: "Jhoira's Familiar", klass: "castFreeNeg",
    jobs: [
      j("role", "ramp", { rk: "costReduction", rt: "historic", af: "self" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "A HARD NEGATIVE for castFree: historic spells cost {1} less, which is costReduction. Flying is evasion on itself.",
  },
  {
    name: "Snapcaster Mage", klass: "castFreeNeg",
    jobs: [j("theme", "recursion", { rt: "instant or sorcery", af: "self", dest: null, tr: "etb", ...once })],
    why: "A HARD NEGATIVE for castFree: flashback lets you cast the card again from your graveyard, but you pay its mana cost. Recursion with no destination, since the card is cast from the graveyard rather than returned anywhere (judgement).",
  },

  // ---- doublers without mana (d9's ruling of 2026-10-02 took the mana doublers out) -----------------
  {
    name: "Branching Evolution", klass: "doublers",
    jobs: [j("theme", "doublers", { rt: "creature", af: "self" })],
    why: "Twice the +1/+1 counters on your creatures: doublers by its counters clause, restricted as Corpsejack Menace.",
  },
  {
    name: "Furnace of Rath", klass: "doublers",
    jobs: [j("theme", "doublers", { af: "each" })],
    why: "Every source deals double damage, to every permanent and player: doublers by its damage clause, affects each since it is symmetric.",
  },
];
