// Gold coverage for the vocabulary plan's Task 4: see the brief at the head of card-labels-gold.mts.
//
// Sixteen themes, each with at least 8 positives and 4 hard negatives. A card often counts for more
// than one theme (Teferi's Protection is a protection positive AND a fog negative), so its `klass`
// names the group it was picked for and its `why` names the others. Every row lists every job the
// card does, not only the one it was picked for.
//
// Conventions applied throughout, each a judgement call:
//   - The `draw` THEME is "cares about drawing: rewards you for the cards you draw". A card that
//     merely draws carries the `draw` ROLE only.
//   - A targeted hand-attack or theft ("target player discards") is `opponents`, by the same ruling
//     the coordinator gave for removal: the job is aimed at opponents even where the rules allow you.
//   - Flashback, escape and rebound make a spell castable twice, not repeatable in play, so those
//     stay `oneShot` (the audited set's Fire Nation Attacks rule). Buyback is `repeatable`.
import { j, type GoldRow } from "./card-labels-gold-helpers.mjs";

const pow = (n: number, op: ">=" | "<=" = ">=") => ({ stat: "power" as const, op, value: n });

export const COVERAGE_THEMES: GoldRow[] = [
  // ---- graveyardHate ------------------------------------------------------------------------
  {
    name: "Rest in Peace", klass: "graveyardHate",
    jobs: [
      j("theme", "graveyardHate", { af: "each", tr: "etb", rec: "oneShot" }),
      j("theme", "graveyardHate", { af: "each" }),
    ],
    why: "Exiles all graveyards on entry and replaces every trip to a graveyard with exile, for every player including you, so affects each. Two abilities, two jobs (each ability is its own job): the ETB exile, oneShot, and the standing replacement.",
  },
  {
    name: "Relic of Progenitus", klass: "graveyardHate",
    jobs: [
      j("theme", "graveyardHate", { af: "opponents", tr: "activated" }),
      j("theme", "graveyardHate", { af: "each", tr: "activated", rec: "oneShot" }),
      j("role", "draw", { af: "self", tr: "activated", rec: "oneShot" }),
    ],
    why: "Two graveyard-exile abilities: the tap one targets any player (repeatable), the sacrifice one exiles all graveyards. One job per ability: the tap targets a player (opponents by intent), the sacrifice hits every graveyard (each, oneShot). The draw rides on the one-shot exile-all.",
  },
  {
    name: "Tormod's Crypt", klass: "graveyardHate",
    jobs: [j("theme", "graveyardHate", { af: "opponents", tr: "activated", rec: "oneShot" })],
    why: "Sacrifices itself to exile one player's graveyard: oneShot. 'Target player' recorded as opponents, the job's intent (judgement, by the coordinator's targeting ruling).",
  },
  {
    name: "Leyline of the Void", klass: "graveyardHate",
    jobs: [j("theme", "graveyardHate", { af: "opponents" })],
    why: "Static replacement on OPPONENTS' graveyards only, the clean opponents case beside Rest in Peace's each. The opening-hand clause is not a job.",
  },
  {
    name: "Grafdigger's Cage", klass: "graveyardHate",
    jobs: [j("theme", "graveyardHate", { af: "each" })],
    why: "The 'stops cards leaving them' half of the definition: creatures can't enter from graveyards and nothing is cast from one. Symmetric. Judgement: NOT also stax, because its lock is on graveyards and libraries, which is this theme's own clause.",
  },
  {
    name: "Bojuka Bog", klass: "graveyardHate",
    jobs: [
      j("role", "land", { af: "self" }),
      j("theme", "graveyardHate", { af: "opponents", tr: "etb", rec: "oneShot" }),
    ],
    why: "A land, so `land`, never ramp. Its ETB exiles one target player's graveyard once; opponents by intent.",
  },
  {
    name: "Nihil Spellbomb", klass: "graveyardHate",
    jobs: [
      j("theme", "graveyardHate", { af: "opponents", tr: "activated", rec: "oneShot" }),
      j("role", "draw", { af: "self", tr: "other", rec: "oneShot" }),
    ],
    why: "Sacrifices itself to exile a graveyard (oneShot), and the optional draw triggers on the artifact going to the graveyard, which is not a creature dying, so trigger other.",
  },
  {
    name: "Treasure Cruise", klass: "graveyardHateNeg",
    jobs: [j("role", "draw", { af: "self", rec: "oneShot" })],
    why: "A HARD NEGATIVE for graveyardHate: delve exiles cards from your OWN graveyard as a cost to cast it, which is not hate. Just draw three.",
  },
  {
    name: "Thought Scour", klass: "graveyardHateNeg",
    jobs: [
      j("theme", "mill", { af: "opponents", rec: "oneShot" }),
      j("role", "draw", { af: "self", rec: "oneShot" }),
    ],
    why: "A HARD NEGATIVE for graveyardHate: it FILLS a graveyard. 'Target player mills' is opponents by the prompt's rule, since the card does not plainly mean you, though it is often played as self-mill.",
  },

  {
    name: "Soul-Guide Lantern", klass: "graveyardHate",
    jobs: [
      j("theme", "graveyardHate", { af: "opponents", tr: "etb", rec: "oneShot" }),
      j("theme", "graveyardHate", { af: "opponents", tr: "activated", rec: "oneShot" }),
      j("role", "draw", { af: "self", tr: "activated", rec: "oneShot" }),
    ],
    why: "ETB exiles one card from any graveyard, and it sacrifices to exile each OPPONENT'S graveyard; one job per ability, both opponents (judgement: the ETB can hit any graveyard). The third mode sacrifices it to draw. All oneShot: each mode costs the artifact.",
  },
  {
    name: "Faerie Macabre", klass: "graveyardHate",
    jobs: [
      j("theme", "graveyardHate", { af: "opponents", tr: "activated", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Discarded from hand, exiles up to two cards from ANY graveyards: hate that costs no mana. Affects opponents by the by-job rule: it exiles the cards chosen, which is not the same thing done to every player. Flying when cast as a creature.",
  },
  {
    name: "Mental Note", klass: "graveyardHateNeg",
    jobs: [
      j("theme", "mill", { af: "self", rec: "oneShot" }),
      j("role", "draw", { af: "self", rec: "oneShot" }),
    ],
    why: "A HARD NEGATIVE for graveyardHate: it puts cards INTO your own graveyard. Self-mill two and draw.",
  },
  {
    name: "Prison Break", klass: "graveyardHateNeg",
    jobs: [
      j("theme", "recursion", { rt: "creature", af: "self", dest: "battlefield", rec: "oneShot" }),
      j("theme", "counters", { af: "self", rec: "oneShot" }),
    ],
    why: "A HARD NEGATIVE three times over: for graveyardHate (it takes a card OUT of your graveyard), for deathTrigger (it acts on a creature already dead), and for doublers (the brief's one-time +1/+1 counter: one additional counter, once, doubles nothing). Mayhem is a second cast, still oneShot.",
  },

  // ---- discard ------------------------------------------------------------------------------
  {
    name: "Thoughtseize", klass: "discard",
    jobs: [j("theme", "discard", { af: "opponents", rec: "oneShot" })],
    why: "Targeted hand attack. 'Target player' is opponents by intent (judgement). The 2 life you lose is a cost, not a job.",
  },
  {
    name: "Duress", klass: "discard",
    jobs: [j("theme", "discard", { af: "opponents", rec: "oneShot" })],
    why: "Target OPPONENT discards a noncreature, nonland card: opponents by the printed text.",
  },
  {
    name: "Hymn to Tourach", klass: "discard",
    jobs: [j("theme", "discard", { af: "opponents", rec: "oneShot" })],
    why: "Two cards at random from target player; opponents by intent.",
  },
  {
    name: "Mind Twist", klass: "discard",
    jobs: [j("theme", "discard", { af: "opponents", rec: "oneShot" })],
    why: "X cards at random from target player; opponents by intent. No threshold: X scales, nothing gates it.",
  },
  {
    name: "Liliana of the Veil", klass: "discard",
    jobs: [
      j("theme", "discard", { af: "each", tr: "activated" }),
      j("role", "removal", { af: "opponents", meth: "sacrifice", tr: "activated" }),
    ],
    why: "+1 makes EACH player discard, the each case. The -2 edict and -6 pile split make a player sacrifice: removal, method sacrifice (d9's ruling of 2026-10-02).",
  },
  {
    name: "Ravenous Rats", klass: "discard",
    jobs: [j("theme", "discard", { af: "opponents", tr: "etb", rec: "oneShot" })],
    why: "ETB, target opponent discards one card. The creature-borne case.",
  },
  {
    name: "Mind Rot", klass: "discard",
    jobs: [j("theme", "discard", { af: "opponents", rec: "oneShot" })],
    why: "Target player discards two of their choice; opponents by intent.",
  },
  {
    name: "Gitaxian Probe", klass: "discardNeg",
    jobs: [j("role", "draw", { af: "self", rec: "oneShot" })],
    why: "A HARD NEGATIVE for discard: it LOOKS at a hand and takes nothing. A cantrip.",
  },
  {
    name: "Waste Not", klass: "discardNeg",
    jobs: [
      j("theme", "tokens", { af: "self", tr: "other" }),
      j("role", "draw", { af: "self", tr: "other" }),
      j("role", "ramp", { rk: "multiplies", af: "self", tr: "other" }),
    ],
    why: "A HARD NEGATIVE for discard: it REWARDS an opponent discarding and makes no one discard. Its '{B}{B} when they discard a land' is triggered mana: ramp of kind multiplies (d9's ruling of 2026-10-02).",
  },
  {
    name: "Megrim", klass: "discardNeg",
    jobs: [j("theme", "drain", { af: "opponents", tr: "other" })],
    why: "A HARD NEGATIVE for discard: it punishes a discard without causing one. The 2 damage goes only to the discarding opponent, so drain.",
  },
  {
    name: "Brainstorm", klass: "discardNeg",
    jobs: [j("role", "draw", { af: "self", rec: "oneShot" })],
    why: "A HARD NEGATIVE for discard: the two cards go back on TOP of the library, not into a graveyard. Draw three.",
  },

  {
    name: "Inquisition of Kozilek", klass: "discard",
    jobs: [j("theme", "discard", { af: "opponents", rec: "oneShot", th: { stat: "mv", op: "<=", value: 3 } })],
    why: "Targeted discard gated by a number: the chosen card must have mana value 3 or less, so threshold mv <= 3. Opponents by intent.",
  },

  // ---- stax ---------------------------------------------------------------------------------
  {
    name: "Sphere of Resistance", klass: "stax",
    jobs: [j("theme", "stax", { af: "each" })],
    why: "Every spell costs {1} more, symmetric. The plain tax case.",
  },
  {
    name: "Rule of Law", klass: "stax",
    jobs: [j("theme", "stax", { af: "each" })],
    why: "Each player can't cast more than one spell a turn: a 'can't cast' lock, symmetric.",
  },
  {
    name: "Armageddon", klass: "stax",
    jobs: [j("theme", "stax", { af: "each", rec: "oneShot" })],
    why: "MASS LAND DENIAL, which the definition names as stax: destroy all lands, every player's. Not wipes, which is creatures; not removal of one permanent.",
  },
  {
    name: "Winter Orb", klass: "stax",
    jobs: [j("theme", "stax", { af: "each" })],
    why: "MASS LAND DENIAL by the other route the definition names, lands that don't untap: no player untaps more than one land. Symmetric, static.",
  },
  {
    name: "Aven Mindcensor", klass: "stax",
    jobs: [
      j("theme", "stax", { af: "opponents" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Opponents' searches see only four cards, the 'can't search' clause softened to a restriction: stax, opponents. Flying on itself is evasion.",
  },
  {
    name: "Drannith Magistrate", klass: "stax",
    jobs: [j("theme", "stax", { af: "opponents" })],
    why: "Opponents can't cast from anywhere but their hand, so no commanders from the command zone: a 'can't cast' lock on opponents only.",
  },
  {
    name: "Grand Abolisher", klass: "stax",
    jobs: [j("theme", "stax", { af: "opponents" })],
    why: "Opponents can't cast spells or activate most abilities during your turn: a lock aimed at opponents.",
  },
  {
    name: "Stone Rain", klass: "staxNeg",
    jobs: [j("role", "removal", { rt: "land", af: "opponents", meth: "destroy", rec: "oneShot" })],
    why: "A HARD NEGATIVE for stax: ONE land destroyed is removal, not mass land denial.",
  },
  {
    name: "Mana Vault", klass: "staxNeg",
    jobs: [j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" })],
    why: "A HARD NEGATIVE for stax: 'doesn't untap during your untap step' is a drawback on YOUR OWN rock, not a lock on opponents. Judgement: tapsForMana, because it is a permanent's tap ability that can be untapped for {4}, though in practice it often taps once.",
  },

  {
    name: "Thorn of Amethyst", klass: "stax",
    jobs: [j("theme", "stax", { af: "each" })],
    why: "Noncreature spells cost {1} more for every player: a symmetric tax on an artifact.",
  },
  {
    name: "Goblin Electromancer", klass: "staxNeg",
    jobs: [j("role", "ramp", { rk: "costReduction", rt: "instant or sorcery", af: "self" })],
    why: "A HARD NEGATIVE for stax: a cost CHANGE, but down and only for your own spells. Ramp costReduction, restrictedTo 'instant or sorcery' as printed (the scope Spellseeker and Ral carry).",
  },
  {
    name: "Frost Titan", klass: "staxNeg",
    jobs: [],
    why: "A HARD NEGATIVE for stax: 'doesn't untap during its controller's next untap step' on ONE permanent is a tapper, not a lock. Judgement: its targeting tax ('counter unless its controller pays {2}') is ward in all but name, yet the card does not print ward, so no protection job; flagged as arguable.",
  },

  // ---- clones -------------------------------------------------------------------------------
  {
    name: "Clever Impersonator", klass: "clones",
    jobs: [j("theme", "clones", { af: "self", tr: "etb", rec: "oneShot" })],
    why: "Enters as a copy of any nonland permanent: the widest clone, no type restriction.",
  },
  {
    name: "Mirrormade", klass: "clones",
    jobs: [j("theme", "clones", { af: "self", tr: "etb", rec: "oneShot" })],
    why: "A NONCREATURE clone: an enchantment entering as a copy of an artifact or enchantment. Guards against a model reading clones as creature-only.",
  },
  {
    name: "Sakashima of a Thousand Faces", klass: "clones",
    jobs: [j("theme", "clones", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" })],
    why: "Enters as a copy of a creature you control. Turning off the legend rule enables the copy but is not a job of its own.",
  },
  {
    name: "Mirror Image", klass: "clones",
    jobs: [j("theme", "clones", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" })],
    why: "Enters as a copy of a creature you control: the self-only clone.",
  },
  {
    name: "Rite of Replication", klass: "clonesNeg",
    jobs: [j("theme", "tokens", { af: "self", rec: "oneShot" })],
    why: "A HARD NEGATIVE for clones: it makes TOKEN copies, which the definition calls tokens, not clones. Kicked, five tokens; still one spell, oneShot.",
  },
  {
    name: "Kiki-Jiki, Mirror Breaker", klass: "clonesNeg",
    jobs: [
      j("theme", "tokens", { af: "self", tr: "activated" }),
      j("theme", "haste", { rt: "creature", af: "self", tr: "activated" }),
    ],
    why: "A HARD NEGATIVE for clones: a token copy each turn is tokens. The token gains haste; Kiki's own haste is a keyword on itself.",
  },
  {
    name: "Helm of the Host", klass: "clonesNeg",
    jobs: [
      j("theme", "tokens", { af: "self", tr: "other" }),
      j("theme", "haste", { rt: "creature", af: "self", tr: "other" }),
    ],
    why: "A HARD NEGATIVE for clones: a token copy of the equipped creature each combat, which is tokens. The token gains haste. Beginning of combat is trigger other.",
  },
  {
    name: "Cackling Counterpart", klass: "clonesNeg",
    jobs: [j("theme", "tokens", { af: "self", rec: "oneShot" })],
    why: "A HARD NEGATIVE for clones: a token copy of your creature. Flashback is a second cast, still oneShot.",
  },
  {
    name: "Cytoshape", klass: "clonesNeg",
    jobs: [],
    why: "A HARD NEGATIVE for clones: a creature BECOMES a copy until end of turn, but no permanent ENTERS as a copy, which is what the definition asks. No job in the vocabulary.",
  },

  {
    name: "Stunt Double", klass: "clones",
    jobs: [j("theme", "clones", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" })],
    why: "Flash clone of any creature on the battlefield. Also a HARD NEGATIVE for theft: copying an opponent's creature takes nothing from them.",
  },
  {
    name: "Copy Enchantment", klass: "clones",
    jobs: [j("theme", "clones", { rt: "enchantment", af: "self", tr: "etb", rec: "oneShot" })],
    why: "A NONCREATURE clone: enters as a copy of any enchantment.",
  },
  {
    name: "Dack's Duplicate", klass: "clones",
    jobs: [
      j("theme", "clones", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "haste", { rt: "creature", af: "self" }),
      j("theme", "counters", { af: "self", tr: "attacks" }),
    ],
    why: "Enters as a copy of any creature with haste and dethrone. Dethrone puts a +1/+1 counter on it when it attacks the life leader, so counters, repeatable.",
  },
  {
    name: "Body Double", klass: "clones",
    jobs: [j("theme", "clones", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" })],
    why: "Enters as a copy of a creature CARD IN A GRAVEYARD. Judgement: clones, though the original is a card rather than a permanent; it is not recursion, since nothing leaves the graveyard.",
  },
  {
    name: "Vesuvan Doppelganger", klass: "clones",
    jobs: [j("theme", "clones", { rt: "creature", af: "self", tr: "etb" })],
    why: "Enters as a copy of any creature, and can become a copy of another each upkeep. Judgement: repeatable, since it re-copies every turn, though only the entry is the definition's 'enters as a copy'.",
  },

  // ---- theft --------------------------------------------------------------------------------
  {
    name: "Treachery", klass: "theft",
    jobs: [
      j("theme", "theft", { rt: "creature", af: "opponents", rec: "oneShot" }),
      j("role", "removal", { rt: "creature", af: "opponents", meth: null, rec: "oneShot" }),
    ],
    why: "An Aura that steals the enchanted creature for good: theft, and removal with method null (no method describes a change of control), oneShot. It also untaps five lands on entry. Judgement: the untap is left unlabelled, since it refunds the cost rather than casting free or fitting a ramp kind cleanly (burstMana is the nearest); flagged.",
  },
  {
    name: "Act of Treason", klass: "theft",
    jobs: [
      j("theme", "theft", { rt: "creature", af: "opponents", rec: "oneShot" }),
      j("theme", "haste", { rt: "creature", af: "opponents", rec: "oneShot" }),
    ],
    why: "Theft until end of turn. Judgement: NOT removal, because the creature goes back at end of turn and the opponent loses nothing. The haste goes on the stolen creature, so opponents.",
  },
  {
    name: "Insurrection", klass: "theft",
    jobs: [
      j("theme", "theft", { rt: "creature", af: "opponents", rec: "oneShot" }),
      j("theme", "haste", { rt: "creature", af: "each", rec: "oneShot" }),
      j("theme", "finisher", { af: "self", rec: "oneShot" }),
    ],
    why: "Steals every creature for a turn with haste: theft and a finisher (a large attack). Not removal, it is temporary. Haste affects each, since your own creatures get it too.",
  },
  {
    name: "Gilded Drake", klass: "theft",
    jobs: [
      j("theme", "theft", { rt: "creature", af: "opponents", tr: "etb", rec: "oneShot" }),
      j("role", "removal", { rt: "creature", af: "opponents", meth: null, tr: "etb", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Exchange of control on entry: you gain their creature permanently, so theft and removal (method null). Flying is evasion, though after the swap the flier is theirs.",
  },
  {
    name: "Hostage Taker", klass: "theft",
    jobs: [
      j("role", "removal", { af: "opponents", meth: "exile", tr: "etb", rec: "oneShot" }),
      j("theme", "theft", { af: "opponents", tr: "etb", rec: "oneShot" }),
    ],
    why: "Exiles a creature or artifact and lets you CAST it: removal by exile, and theft by the 'casts an opponent's card' clause. Two types, so restrictedTo null.",
  },
  {
    name: "Thief of Sanity", klass: "theft",
    jobs: [
      j("theme", "theft", { af: "opponents", tr: "combatDamage" }),
      j("theme", "mill", { af: "opponents", tr: "combatDamage" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "On each hit you may cast one of their top three cards: theft. The other two go to their graveyard, which is mill on opponents. Flying.",
  },
  {
    name: "Agent of Treachery", klass: "theft",
    jobs: [
      j("theme", "theft", { af: "opponents", tr: "etb", rec: "oneShot" }),
      j("role", "removal", { af: "opponents", meth: null, tr: "etb", rec: "oneShot" }),
      j("role", "draw", { af: "self", tr: "other", th: { stat: "other", op: ">=", value: 3 } }),
    ],
    why: "Permanent control of any permanent on entry: theft and removal. The end-step draw is gated on controlling three permanents you don't own, a threshold with no named stat, so 'other'.",
  },
  {
    name: "Donate", klass: "theftNeg",
    jobs: [],
    why: "A HARD NEGATIVE for theft: it moves control the OTHER way, giving your permanent to another player. No job in the vocabulary.",
  },
  {
    name: "Harmless Offering", klass: "theftNeg",
    jobs: [],
    why: "A HARD NEGATIVE for theft: Donate aimed at an opponent. 'Gains control' is in the text, but the opponent gains it, not you.",
  },

  {
    name: "Mind Control", klass: "theft",
    jobs: [
      j("theme", "theft", { rt: "creature", af: "opponents", rec: "oneShot" }),
      j("role", "removal", { rt: "creature", af: "opponents", meth: null, rec: "oneShot" }),
    ],
    why: "Permanent control change: theft, and removal by the role's 'or gains control of it'. Method null, since no method describes a change of control. oneShot (judgement): the Aura takes one creature, once.",
  },
  {
    name: "Beacon of Unrest", klass: "theftNeg",
    jobs: [j("theme", "recursion", { af: "self", dest: "battlefield", rec: "oneShot" })],
    why: "A HARD NEGATIVE for theft: it can take an artifact or creature from an OPPONENT'S graveyard, but a card in a graveyard is neither a permanent they control nor a card cast. Recursion from any graveyard, self by the by-job rule; two types, no restrictedTo. It shuffles itself back, a re-draw and not repeatable in play.",
  },

  // ---- poison -------------------------------------------------------------------------------
  {
    name: "Glistener Elf", klass: "poison",
    jobs: [j("theme", "poison", { af: "opponents" })],
    why: "Infect: the bare one-mana poison creature.",
  },
  {
    name: "Blightsteel Colossus", klass: "poison",
    jobs: [
      j("theme", "poison", { af: "opponents" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "protection", { rt: "creature", af: "self" }),
    ],
    why: "Infect with trample (evasion) and indestructible (protection). The shuffle-back clause is not a job.",
  },
  {
    name: "Triumph of the Hordes", klass: "poison",
    jobs: [
      j("theme", "poison", { af: "opponents", rec: "oneShot" }),
      j("theme", "pump", { rt: "creature", af: "self", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self", rec: "oneShot" }),
      j("theme", "finisher", { af: "self", rec: "oneShot" }),
    ],
    why: "GRANTS infect to your team for a turn with +1/+1 and trample: the classic poison kill, so also a finisher (a large attack).",
  },
  {
    name: "Skithiryx, the Blight Dragon", klass: "poison",
    jobs: [
      j("theme", "poison", { af: "opponents" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
      j("theme", "haste", { rt: "creature", af: "self", tr: "activated" }),
      j("theme", "protection", { rt: "creature", af: "self", tr: "activated" }),
    ],
    why: "Infect flier. Also a protection positive by REGENERATE ({B}{B}: regenerate), one of the definition's named forms. Haste on itself, activated.",
  },
  {
    name: "Venerated Rotpriest", klass: "poison",
    jobs: [
      j("theme", "poison", { af: "opponents" }),
      j("theme", "poison", { af: "opponents", tr: "other" }),
    ],
    why: "TOXIC 1, and a target-opponent poison counter whenever your creature is targeted: two abilities, so two poison jobs, the keyword static and the trigger 'other'.",
  },
  {
    name: "Bloated Contaminator", klass: "poison",
    jobs: [
      j("theme", "poison", { af: "opponents" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Toxic 1 with trample. Proliferate on a hit grows poison and any counter, but proliferate itself is no job in the vocabulary (judgement: not counters, which is about putting +1/+1 counters).",
  },
  {
    name: "Ichor Rats", klass: "poison",
    jobs: [
      j("theme", "poison", { af: "opponents" }),
      j("theme", "poison", { af: "each", tr: "etb", rec: "oneShot" }),
    ],
    why: "Infect, and an ETB that gives EACH player a poison counter, you included: two abilities, so two poison jobs. The infect is opponents; the ETB is each.",
  },
  {
    name: "Vishgraz, the Doomhive", klass: "poison",
    jobs: [
      j("theme", "poison", { af: "opponents" }),
      j("theme", "tokens", { af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Toxic 1 on itself and on the three Mites it makes. Menace is evasion. Its self-scaling +1/+1 per poison counter is left off pump (judgement: it pumps only itself, from a count).",
  },
  {
    name: "Inexorable Tide", klass: "poisonNeg",
    jobs: [],
    why: "A HARD NEGATIVE for poison: proliferate adds to poison a player ALREADY has but never gives a first one. No job in the vocabulary.",
  },
  {
    name: "Black Sun's Zenith", klass: "poisonNeg",
    jobs: [j("role", "wipes", { af: "each", meth: "shrink", rec: "oneShot" })],
    why: "A HARD NEGATIVE for poison: -1/-1 counters are infect's creature half, but no player gets poison. A -X/-X wipe; it shuffles back, which is a re-draw, not repeatable in play.",
  },
  {
    name: "Boggart Ram-Gang", klass: "poisonNeg",
    jobs: [j("theme", "haste", { rt: "creature", af: "self" })],
    why: "A HARD NEGATIVE for poison: WITHER is infect's creature half without the poison. Haste on itself.",
  },
  {
    name: "Flux Channeler", klass: "poisonNeg",
    jobs: [j("theme", "spellslinger", { af: "self", tr: "cast" })],
    why: "A HARD NEGATIVE for poison: a proliferate engine. Judgement: spellslinger, since it rewards casting noncreature spells, instants and sorceries included.",
  },

  // ---- goad ---------------------------------------------------------------------------------
  {
    name: "Disrupt Decorum", klass: "goad",
    jobs: [j("theme", "goad", { af: "opponents", rec: "oneShot" })],
    why: "Goad all creatures you don't control: the plain mass goad.",
  },
  {
    name: "Kardur, Doomscourge", klass: "goad",
    jobs: [
      j("theme", "goad", { af: "opponents", tr: "etb", rec: "oneShot" }),
      j("theme", "deathTrigger", { af: "each", tr: "dies" }),
      j("theme", "drain", { af: "opponents", tr: "dies" }),
      j("theme", "lifegain", { af: "self", tr: "dies" }),
    ],
    why: "'Attack each combat if able' without the word goad, the definition's second clause. Any attacking creature dying drains each opponent: deathTrigger affecting each, since the dying creature can be anyone's.",
  },
  {
    name: "Bloodthirsty Blade", klass: "goad",
    jobs: [
      j("theme", "goad", { af: "opponents", tr: "activated" }),
      j("theme", "pump", { rt: "creature", af: "self" }),
    ],
    why: "Equipment that goads, attached to an opponent's creature for {1}. Judgement: +2/+0 is labelled pump, affects self by the by-job rule, though it lands on whichever creature carries it.",
  },
  {
    name: "Vengeful Ancestor", klass: "goad",
    jobs: [
      j("theme", "goad", { af: "opponents", tr: "attacks" }),
      j("theme", "drain", { af: "opponents", tr: "other" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Goads on entering AND attacking; recorded as trigger attacks, the repeatable one (judgement: the schema holds one trigger). A goaded creature attacking damages its controller, an opponent in practice, so drain (judgement). Flying.",
  },
  {
    name: "Marisi, Breaker of the Coil", klass: "goad",
    jobs: [
      j("theme", "goad", { af: "opponents", tr: "combatDamage" }),
      j("theme", "stax", { af: "opponents" }),
    ],
    why: "Each connecting creature goads that player's whole board. Opponents can't cast spells during combat: a 'can't cast' lock, so stax too.",
  },
  {
    name: "Karazikar, the Eye Tyrant", klass: "goad",
    jobs: [
      j("theme", "goad", { af: "opponents", tr: "attacks" }),
      j("role", "draw", { af: "each", tr: "other" }),
    ],
    why: "Taps and goads a creature of the player you attack. When opponents attack each other you and the attacker each draw (affects each) and each lose 1, which is not drain because you lose too.",
  },
  {
    name: "Shiny Impetus", klass: "goad",
    jobs: [
      j("theme", "goad", { af: "opponents" }),
      j("theme", "pump", { rt: "creature", af: "self" }),
      j("theme", "treasure", { af: "self", tr: "attacks" }),
      j("role", "ramp", { rk: "makesTreasure", af: "self", tr: "attacks" }),
    ],
    why: "An Aura that goads and pumps the enchanted creature, cast on an opponent's (goad opponents by intent; pump self by the by-job rule). You get a Treasure whenever it attacks.",
  },
  {
    name: "Agitator Ant", klass: "goad",
    jobs: [
      j("theme", "goad", { af: "each", tr: "other" }),
      j("theme", "counters", { af: "each", tr: "other" }),
    ],
    why: "Each player MAY put two +1/+1 counters on a creature, and every creature so chosen is goaded, yours included: both jobs affect each. End step is trigger other.",
  },
  {
    name: "Lure", klass: "goadNeg",
    jobs: [],
    why: "A HARD NEGATIVE for goad: it forces creatures to BLOCK, not to attack. No job.",
  },
  {
    name: "Hellrider", klass: "goadNeg",
    jobs: [
      j("theme", "haste", { rt: "creature", af: "self" }),
      j("theme", "drain", { af: "opponents", tr: "attacks" }),
    ],
    why: "A HARD NEGATIVE for goad: it rewards YOUR creatures attacking and forces nothing. Each attacker pings the player it attacks: drain (judgement: the target is an opponent or their planeswalker, never you).",
  },
  {
    name: "Taunting Elf", klass: "goadNeg",
    jobs: [],
    why: "A HARD NEGATIVE for goad: Lure on a body, a forced block. No job.",
  },
  {
    name: "Ghostly Prison", klass: "goadNeg",
    jobs: [j("theme", "stax", { af: "opponents" })],
    why: "A HARD NEGATIVE for goad: it DISCOURAGES attacking you rather than forcing attacks elsewhere. Judgement: an attack tax is labelled stax ('taxes opponents').",
  },

  // ---- doublers -----------------------------------------------------------------------------
  {
    name: "Doubling Season", klass: "doublers",
    jobs: [j("theme", "doublers", { af: "self" })],
    why: "Twice the tokens AND twice the counters: both named halves of the definition in one card.",
  },
  {
    name: "Parallel Lives", klass: "doublers",
    jobs: [j("theme", "doublers", { af: "self" })],
    why: "Twice the tokens. Makes none itself, so not tokens.",
  },
  {
    name: "Anointed Procession", klass: "doublers",
    jobs: [j("theme", "doublers", { af: "self" })],
    why: "Parallel Lives in white: twice the tokens.",
  },
  {
    name: "Mana Reflection", klass: "doublersNeg",
    jobs: [j("role", "ramp", { rk: "multiplies", rt: "permanent", af: "self" })],
    why: "A HARD NEGATIVE for doublers (d9, 2026-10-02): twice the MANA is ramp of kind multiplies alone. doublers is for tokens, counters, damage or triggers, so a mana doubler never stands in for Doubling Season.",
  },
  {
    name: "Panharmonicon", klass: "doublers",
    jobs: [j("theme", "doublers", { af: "self" })],
    why: "An extra time for each ETB trigger: the definition's trigger clause.",
  },
  {
    name: "Corpsejack Menace", klass: "doublers",
    jobs: [j("theme", "doublers", { rt: "creature", af: "self" })],
    why: "Twice the +1/+1 counters, on creatures only. Judgement: not the counters theme, because it puts no counter itself.",
  },
  {
    name: "Teysa Karlov", klass: "doublers",
    jobs: [
      j("theme", "doublers", { af: "self" }),
      j("theme", "lifegain", { rt: "creature", af: "self" }),
    ],
    why: "Death triggers fire an extra time: doublers. Lifelink for your creature tokens is lifegain. Judgement: NOT deathTrigger, because it does nothing itself when a creature dies; it multiplies cards that do.",
  },
  {
    name: "Zendikar Resurgent", klass: "doublersNeg",
    jobs: [
      j("role", "ramp", { rk: "multiplies", rt: "land", af: "self" }),
      j("role", "draw", { af: "self", tr: "cast" }),
    ],
    why: "Each land tapped for mana adds one more of that type: twice the mana from lands, ramp of kind multiplies as Mana Reflection, and a HARD NEGATIVE for doublers: mana is multiplies alone (d9, 2026-10-02). Draws on creature spells cast, which is an etbDraw NEAR-MISS (cast, not enters).",
  },
  {
    name: "Hardened Scales", klass: "doublersNeg",
    jobs: [j("theme", "counters", { rt: "creature", af: "self" })],
    why: "A HARD NEGATIVE for doublers: PLUS ONE, not twice. A +1/+1 counter card, so counters.",
  },
  {
    name: "Xorn", klass: "doublersNeg",
    jobs: [
      j("theme", "treasure", { af: "self", tr: "other" }),
      j("role", "ramp", { rk: "makesTreasure", af: "self", tr: "other" }),
    ],
    why: "A HARD NEGATIVE for doublers: the brief's single extra token, one more Treasure, not twice. It creates Treasure when another Treasure is made, so treasure and makesTreasure ramp.",
  },
  {
    name: "Cathars' Crusade", klass: "doublersNeg",
    jobs: [j("theme", "counters", { rt: "creature", af: "self", tr: "etb" })],
    why: "A HARD NEGATIVE for doublers: many counters, but by putting one on each creature, not doubling any. Counters on a creature entering.",
  },
  {
    name: "Divine Visitation", klass: "doublersNeg",
    jobs: [],
    why: "A HARD NEGATIVE for doublers: it REPLACES token creatures with Angels, the same number. Judgement: no tokens or evasion job either, since it creates nothing on its own.",
  },

  // ---- fog ----------------------------------------------------------------------------------
  {
    name: "Holy Day", klass: "fog",
    jobs: [j("theme", "fog", { af: "each", rec: "oneShot" })],
    why: "Fog in white, the colour-shift check. Also a HARD NEGATIVE for protection.",
  },
  {
    name: "Darkness", klass: "fog",
    jobs: [j("theme", "fog", { af: "each", rec: "oneShot" })],
    why: "Fog in black, the colour-shift check again. Also a HARD NEGATIVE for protection.",
  },
  {
    name: "Moment's Peace", klass: "fog",
    jobs: [j("theme", "fog", { af: "each", rec: "oneShot" })],
    why: "Fog with flashback: castable twice, oneShot per the flashback convention.",
  },
  {
    name: "Constant Mists", klass: "fog",
    jobs: [j("theme", "fog", { af: "each" })],
    why: "Fog with buyback (sacrifice a land): it returns to hand and can be cast every turn, so repeatable (judgement: buyback is unbounded where flashback is a second cast).",
  },
  {
    name: "Spore Frog", klass: "fog",
    jobs: [j("theme", "fog", { af: "each", tr: "activated", rec: "oneShot" })],
    why: "A fog on a creature that sacrifices itself: activated, oneShot.",
  },
  {
    name: "Tangle", klass: "fog",
    jobs: [j("theme", "fog", { af: "each", rec: "oneShot" })],
    why: "Fog, and attackers don't untap next turn. Judgement: that rider is not stax, being one untap step for creatures that attacked.",
  },
  {
    name: "Dawn Charm", klass: "fog",
    jobs: [
      j("theme", "fog", { af: "each", rec: "oneShot", modal: true }),
      j("theme", "protection", { rt: "creature", af: "self", rec: "oneShot", modal: true }),
      j("role", "counterspell", { af: "opponents", rec: "oneShot", modal: true }),
    ],
    why: "Choose one: a fog, a REGENERATE (protection), or counter a spell that targets you (counterspell, opponents by intent). All three modal.",
  },
  {
    name: "Heroic Intervention", klass: "fogNeg",
    jobs: [j("theme", "protection", { af: "self", rec: "oneShot" })],
    why: "A HARD NEGATIVE for fog: hexproof and indestructible on all your permanents, which saves a board from a wipe but prevents no combat damage. A protection positive.",
  },
  {
    name: "Teferi's Protection", klass: "fogNeg",
    jobs: [j("theme", "protection", { af: "self", rec: "oneShot" })],
    why: "A HARD NEGATIVE for fog: your life can't change, you have protection from everything and your permanents PHASE OUT. Survives combat without preventing damage. A protection positive by phasing, one of the named forms.",
  },
  {
    name: "Flawless Maneuver", klass: "fogNeg",
    jobs: [
      j("theme", "protection", { rt: "creature", af: "self", rec: "oneShot" }),
      j("theme", "castFree", { af: "self", rec: "oneShot" }),
    ],
    why: "A HARD NEGATIVE for fog: indestructible for your creatures. Judgement: castFree, because with a commander it is cast without paying its mana cost, though only ITSELF.",
  },
  {
    name: "Blossoming Defense", klass: "fogNeg",
    jobs: [
      j("theme", "protection", { rt: "creature", af: "self", rec: "oneShot" }),
      j("theme", "pump", { rt: "creature", af: "self", rec: "oneShot" }),
    ],
    why: "A HARD NEGATIVE for fog: a single-target hexproof and +2/+2. Protection and pump.",
  },

  {
    name: "Respite", klass: "fog",
    jobs: [
      j("theme", "fog", { af: "each", rec: "oneShot" }),
      j("theme", "lifegain", { af: "self", rec: "oneShot" }),
    ],
    why: "Fog that also gains 1 life per attacking creature.",
  },

  // ---- drain --------------------------------------------------------------------------------
  {
    name: "Sanguine Bond", klass: "drain",
    jobs: [j("theme", "drain", { af: "opponents", tr: "other" })],
    why: "Target opponent loses what you gain. Judgement: not lifegain, because it gains nothing itself.",
  },
  {
    name: "Purphoros, God of the Forge", klass: "drain",
    jobs: [
      j("theme", "drain", { af: "opponents", tr: "etb" }),
      j("theme", "pump", { rt: "creature", af: "self", tr: "activated" }),
      j("theme", "protection", { af: "self" }),
    ],
    why: "Two damage to EACH OPPONENT per creature entering: damage aimed only at opponents is drain. +1/+0 to the team is pump. Indestructible on itself is protection.",
  },
  {
    name: "Impact Tremors", klass: "drain",
    jobs: [j("theme", "drain", { af: "opponents", tr: "etb" })],
    why: "Purphoros's trigger alone: 1 damage to each opponent per creature entering.",
  },
  {
    name: "Vito, Thorn of the Dusk Rose", klass: "drain",
    jobs: [
      j("theme", "drain", { af: "opponents", tr: "other" }),
      j("theme", "lifegain", { rt: "creature", af: "self", tr: "activated" }),
    ],
    why: "Sanguine Bond on a creature, plus team lifelink for {3}{B}{B}, which is lifegain.",
  },
  {
    name: "Shock", klass: "drainNeg",
    jobs: [j("role", "removal", { af: "opponents", meth: "shrink", rec: "oneShot" })],
    why: "A HARD NEGATIVE for drain, named by the definition: 2 damage to ANY target. Removal by damage.",
  },
  {
    name: "Pestilence", klass: "drainNeg",
    jobs: [j("role", "wipes", { af: "each", meth: "shrink", tr: "activated" })],
    why: "A HARD NEGATIVE for drain: 1 damage to each creature AND EACH PLAYER, you included, so not aimed only at opponents. Judgement: a repeatable damage wipe.",
  },
  {
    name: "Goblin Bombardment", klass: "drainNeg",
    jobs: [
      j("theme", "sacOutlet", { af: "self", tr: "activated" }),
      j("role", "removal", { af: "opponents", meth: "shrink", tr: "activated" }),
    ],
    why: "A HARD NEGATIVE for drain: every sacrifice pings ANY target. A free sac outlet, and removal by damage (judgement: 1 damage at a time).",
  },

  {
    name: "Cruel Celebrant", klass: "drain",
    jobs: [
      j("theme", "drain", { af: "opponents", tr: "dies" }),
      j("theme", "lifegain", { af: "self", tr: "dies" }),
      j("theme", "deathTrigger", { af: "self", tr: "dies" }),
    ],
    why: "Each of your creatures or planeswalkers dying drains each opponent: drain, lifegain and deathTrigger.",
  },
  {
    name: "Corpse Knight", klass: "drain",
    jobs: [j("theme", "drain", { af: "opponents", tr: "etb" })],
    why: "Each opponent loses 1 when another creature of yours enters: drain on entry, with no lifegain.",
  },
  {
    name: "Lightning Strike", klass: "drainNeg",
    jobs: [j("role", "removal", { af: "opponents", meth: "shrink", rec: "oneShot" })],
    why: "A HARD NEGATIVE for drain: 3 damage to ANY target, the Shock rule. Removal by damage.",
  },

  // ---- protection ---------------------------------------------------------------------------
  {
    name: "Swiftfoot Boots", klass: "protection",
    jobs: [
      j("theme", "protection", { rt: "creature", af: "self" }),
      j("theme", "haste", { rt: "creature", af: "self" }),
    ],
    why: "Hexproof and haste on the equipped creature.",
  },
  {
    name: "Darksteel Plate", klass: "protection",
    jobs: [j("theme", "protection", { rt: "creature", af: "self" })],
    why: "Indestructible on the equipped creature and on itself.",
  },
  {
    name: "Mother of Runes", klass: "protection",
    jobs: [j("theme", "protection", { rt: "creature", af: "self", tr: "activated" })],
    why: "Tap: protection from a colour for your creature, every turn. The 'protection from' form.",
  },
  {
    name: "Hyena Umbra", klass: "protection",
    jobs: [
      j("theme", "protection", { rt: "creature", af: "self" }),
      j("theme", "pump", { rt: "creature", af: "self" }),
    ],
    why: "UMBRA ARMOR (totem armor), one of the definition's named forms, plus +1/+1. Protection and pump are self by the by-job rule; first strike is no job.",
  },
  {
    name: "Asceticism", klass: "protection",
    jobs: [
      j("theme", "protection", { rt: "creature", af: "self" }),
      j("theme", "protection", { rt: "creature", af: "self", tr: "activated" }),
    ],
    why: "Team hexproof, and REGENERATE for {1}{G}: two abilities, so two protection jobs, the hexproof static and the regenerate activated.",
  },
  {
    name: "Guardian of Faith", klass: "protection",
    jobs: [j("theme", "protection", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" })],
    why: "PHASES OUT your other creatures on entry: the phasing form. Flash and vigilance are not jobs.",
  },
  {
    name: "Ephemerate", klass: "protectionNeg",
    jobs: [j("theme", "blink", { rt: "creature", af: "self", rec: "oneShot" })],
    why: "A HARD NEGATIVE for protection: blinking dodges removal but grants nothing (the fogs are this theme's other negatives). A blink positive. Rebound gives a second cast, oneShot per the convention.",
  },
  {
    name: "Ghostly Flicker", klass: "protectionNeg",
    jobs: [j("theme", "blink", { af: "self", rec: "oneShot" })],
    why: "A HARD NEGATIVE for protection, the same dodge-by-blink near-miss. Exiles two of your artifacts, creatures or lands and returns them: blink, three types so no restrictedTo.",
  },

  // ---- finisher -----------------------------------------------------------------------------
  {
    name: "Craterhoof Behemoth", klass: "finisher",
    jobs: [
      j("theme", "finisher", { af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "pump", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "haste", { rt: "creature", af: "self" }),
    ],
    why: "The large attack: +X/+X and trample to the team on entry. Haste is on itself, static.",
  },
  {
    name: "Overrun", klass: "finisher",
    jobs: [
      j("theme", "finisher", { af: "self", rec: "oneShot" }),
      j("theme", "pump", { rt: "creature", af: "self", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self", rec: "oneShot" }),
    ],
    why: "+3/+3 and trample to the team: a large attack.",
  },
  {
    name: "Aggravated Assault", klass: "finisher",
    jobs: [j("theme", "finisher", { af: "self", tr: "activated" })],
    why: "An EXTRA COMBAT, repeatable at sorcery speed for {3}{R}{R}.",
  },
  {
    name: "Relentless Assault", klass: "finisher",
    jobs: [j("theme", "finisher", { af: "self", rec: "oneShot" })],
    why: "An extra combat once, as a sorcery.",
  },
  {
    name: "Time Warp", klass: "finisher",
    jobs: [j("theme", "finisher", { af: "self", rec: "oneShot" })],
    why: "An EXTRA TURN. 'Target player' is self in practice (judgement).",
  },
  {
    name: "Thassa's Oracle", klass: "finisher",
    jobs: [j("theme", "finisher", { af: "self", tr: "etb", rec: "oneShot" })],
    why: "A WIN-THE-GAME clause on entry, gated on devotion against library size. Judgement: no threshold, since the gate compares two counts rather than one number. The top-of-library arrangement is no job.",
  },
  {
    name: "Approach of the Second Sun", klass: "finisher",
    jobs: [
      j("theme", "finisher", { af: "self", rec: "oneShot" }),
      j("theme", "lifegain", { af: "self", rec: "oneShot" }),
    ],
    why: "Win the game on the second cast; the first gains 7 life.",
  },
  {
    name: "Glorious Anthem", klass: "finisherNeg",
    jobs: [j("theme", "pump", { rt: "creature", af: "self" })],
    why: "A HARD NEGATIVE for finisher: a +1/+1 anthem helps every attack and ends none by itself. Pump.",
  },
  {
    name: "Giant Growth", klass: "finisherNeg",
    jobs: [j("theme", "pump", { rt: "creature", af: "self", rec: "oneShot" })],
    why: "A HARD NEGATIVE for finisher: +3/+3 on ONE creature. Pump is self by the by-job rule.",
  },
  {
    name: "Fervor", klass: "finisherNeg",
    jobs: [j("theme", "haste", { rt: "creature", af: "self" })],
    why: "A HARD NEGATIVE for finisher: team haste speeds an attack but neither enlarges it nor adds a combat.",
  },
  {
    name: "Fling", klass: "finisherNeg",
    jobs: [j("role", "removal", { af: "opponents", meth: "shrink", rec: "oneShot" })],
    why: "A HARD NEGATIVE for finisher: one creature's power thrown at any target is a reach burn spell, not a game-ending attack. Removal by damage; the sacrifice is a one-time cost, not sacOutlet.",
  },

  // ---- etbDraw ------------------------------------------------------------------------------
  {
    name: "Guardian Project", klass: "etbDraw",
    jobs: [
      j("theme", "etbDraw", { rt: "creature", af: "self", tr: "etb" }),
      j("role", "draw", { af: "self", tr: "etb" }),
    ],
    why: "Draws when a nontoken creature with a new name enters under your control.",
  },
  {
    name: "Elemental Bond", klass: "etbDraw",
    jobs: [
      j("theme", "etbDraw", { rt: "creature", af: "self", tr: "etb", th: pow(3) }),
      j("role", "draw", { af: "self", tr: "etb", th: pow(3) }),
    ],
    why: "Draws when a creature with power 3 or greater enters: the threshold case, power >= 3.",
  },
  {
    name: "Garruk's Packleader", klass: "etbDraw",
    jobs: [
      j("theme", "etbDraw", { rt: "creature", af: "self", tr: "etb", th: pow(3) }),
      j("role", "draw", { af: "self", tr: "etb", th: pow(3) }),
    ],
    why: "Elemental Bond on a body, optional draw, power >= 3.",
  },
  {
    name: "Soul of the Harvest", klass: "etbDraw",
    jobs: [
      j("theme", "etbDraw", { rt: "creature", af: "self", tr: "etb" }),
      j("role", "draw", { af: "self", tr: "etb" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Draws when another nontoken creature enters. Trample.",
  },
  {
    name: "Mentor of the Meek", klass: "etbDraw",
    jobs: [
      j("theme", "etbDraw", { rt: "creature", af: "self", tr: "etb", th: pow(2, "<=") }),
      j("role", "draw", { af: "self", tr: "etb", th: pow(2, "<=") }),
    ],
    why: "The inverse threshold, power 2 or LESS, and the draw costs {1}.",
  },
  {
    name: "Kindred Discovery", klass: "etbDraw",
    jobs: [
      j("theme", "etbDraw", { rt: "creature", af: "self", tr: "etb" }),
      j("role", "draw", { af: "self", tr: "etb" }),
      j("theme", "tribal", { af: "self" }),
    ],
    why: "Draws when a creature of the CHOSEN type enters or attacks: etbDraw and tribal. The type is chosen, not printed, so restrictedTo stays 'creature' (judgement). Trigger recorded as etb though attacks also draws.",
  },
  {
    name: "Mulldrifter", klass: "etbDraw",
    jobs: [
      j("theme", "etbDraw", { af: "self", tr: "etb", rec: "oneShot" }),
      j("role", "draw", { af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Judgement: a creature drawing on ITS OWN entry is etbDraw ('draws a card when a creature enters'), which is what blink decks want it for. oneShot. Flying.",
  },
  {
    name: "Elvish Visionary", klass: "etbDraw",
    jobs: [
      j("theme", "etbDraw", { af: "self", tr: "etb", rec: "oneShot" }),
      j("role", "draw", { af: "self", tr: "etb", rec: "oneShot" }),
    ],
    why: "The smallest self-ETB draw; same judgement as Mulldrifter.",
  },
  {
    name: "Beast Whisperer", klass: "etbDrawNeg",
    jobs: [j("role", "draw", { af: "self", tr: "cast" })],
    why: "A HARD NEGATIVE for etbDraw: draws on CASTING a creature spell, not on a creature entering, so a blinked or reanimated creature draws nothing.",
  },
  {
    name: "Tatyova, Benthic Druid", klass: "etbDrawNeg",
    jobs: [
      j("theme", "landfall", { af: "self", tr: "landfall" }),
      j("theme", "lifegain", { af: "self", tr: "landfall" }),
      j("role", "draw", { af: "self", tr: "landfall" }),
    ],
    why: "A HARD NEGATIVE for etbDraw: draws when a LAND enters, which is landfall.",
  },
  {
    name: "Skullclamp", klass: "etbDrawNeg",
    jobs: [
      j("role", "draw", { af: "self", tr: "dies" }),
      j("theme", "deathTrigger", { af: "self", tr: "dies" }),
    ],
    why: "A HARD NEGATIVE for etbDraw: draws when the equipped creature DIES, which is a deathTrigger positive instead. +1/-1 is not pump.",
  },

  {
    name: "Primordial Sage", klass: "etbDrawNeg",
    jobs: [j("role", "draw", { af: "self", tr: "cast" })],
    why: "A HARD NEGATIVE for etbDraw: draws on CASTING a creature spell, so a creature put onto the battlefield draws nothing.",
  },

  // ---- blink --------------------------------------------------------------------------------
  {
    name: "Restoration Angel", klass: "blink",
    jobs: [
      j("theme", "blink", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Flash, and blinks a non-Angel creature of yours on entry. Flying.",
  },
  {
    name: "Conjurer's Closet", klass: "blink",
    jobs: [j("theme", "blink", { rt: "creature", af: "self", tr: "other" })],
    why: "Blinks a creature of yours every end step: repeatable blink, trigger other.",
  },
  {
    name: "Brago, King Eternal", klass: "blink",
    jobs: [
      j("theme", "blink", { af: "self", tr: "combatDamage" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Blinks any number of your nonland permanents when it connects. Flying.",
  },
  {
    name: "Soulherder", klass: "blink",
    jobs: [
      j("theme", "blink", { rt: "creature", af: "self", tr: "other" }),
      j("theme", "counters", { af: "self", tr: "other" }),
    ],
    why: "End-step blink of your creature, and grows with a +1/+1 counter whenever a creature is exiled from the battlefield.",
  },
  {
    name: "Thassa, Deep-Dwelling", klass: "blink",
    jobs: [
      j("theme", "blink", { rt: "creature", af: "self", tr: "other" }),
      j("theme", "protection", { af: "self" }),
    ],
    why: "End-step blink, repeatable. Indestructible on itself. Its tap ability is a tapper, not removal.",
  },
  {
    name: "Cloudshift", klass: "blink",
    jobs: [j("theme", "blink", { rt: "creature", af: "self", rec: "oneShot" })],
    why: "The one-mana blink of your own creature.",
  },
  {
    name: "Felidar Guardian", klass: "blink",
    jobs: [j("theme", "blink", { af: "self", tr: "etb", rec: "oneShot" })],
    why: "Blinks another permanent of yours on entry, any type.",
  },
  {
    name: "Path to Exile", klass: "blinkNeg",
    jobs: [j("role", "removal", { af: "opponents", meth: "exile", rec: "oneShot" })],
    why: "A HARD NEGATIVE for blink: exile with nothing coming back (the basic land search is the opponent's).",
  },
  {
    name: "Kaya's Ghostform", klass: "blinkNeg",
    jobs: [
      j("theme", "recursion", { af: "self", dest: "battlefield", tr: "dies", rec: "oneShot" }),
      j("theme", "deathTrigger", { af: "self", tr: "dies", rec: "oneShot" }),
    ],
    why: "A HARD NEGATIVE for blink: it returns a permanent that died or was exiled by something else, which is recursion. Does something when the creature dies, so deathTrigger. Creature or planeswalker, so no restrictedTo.",
  },

  {
    name: "Journey to Nowhere", klass: "blinkNeg",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "exile", tr: "etb", rec: "oneShot" })],
    why: "A HARD NEGATIVE for blink: exiles a creature and returns it only when the enchantment leaves, to its owner. Removal held hostage, not a blink.",
  },
  {
    name: "Boomerang", klass: "blinkNeg",
    jobs: [j("role", "removal", { af: "opponents", meth: "bounce", rec: "oneShot" })],
    why: "A HARD NEGATIVE for blink: bouncing a permanent resets it too, but nothing is exiled and returned. Removal by bounce, any permanent.",
  },

  // ---- deathTrigger -------------------------------------------------------------------------
  {
    name: "Grim Haruspex", klass: "deathTrigger",
    jobs: [
      j("theme", "deathTrigger", { rt: "creature", af: "self", tr: "dies" }),
      j("role", "draw", { af: "self", tr: "dies" }),
    ],
    why: "Draws when another nontoken creature of yours dies. Morph is no job.",
  },
  {
    name: "Midnight Reaper", klass: "deathTrigger",
    jobs: [
      j("theme", "deathTrigger", { rt: "creature", af: "self", tr: "dies" }),
      j("role", "draw", { af: "self", tr: "dies" }),
    ],
    why: "Grim Haruspex that pings you for each card. The damage is to you, so not drain.",
  },
  {
    name: "Pitiless Plunderer", klass: "deathTrigger",
    jobs: [
      j("theme", "deathTrigger", { rt: "creature", af: "self", tr: "dies" }),
      j("theme", "treasure", { af: "self", tr: "dies" }),
      j("role", "ramp", { rk: "makesTreasure", af: "self", tr: "dies" }),
    ],
    why: "A Treasure for each of your other creatures dying.",
  },
  {
    name: "Grave Pact", klass: "deathTrigger",
    jobs: [
      j("theme", "deathTrigger", { rt: "creature", af: "self", tr: "dies" }),
      j("role", "removal", { rt: "creature", af: "opponents", meth: "sacrifice", tr: "dies" }),
    ],
    why: "Each of your creatures dying makes every other player sacrifice one: an edict: removal, method sacrifice (d9's ruling of 2026-10-02).",
  },
  {
    name: "Bastion of Remembrance", klass: "deathTrigger",
    jobs: [
      j("theme", "deathTrigger", { rt: "creature", af: "self", tr: "dies" }),
      j("theme", "drain", { af: "opponents", tr: "dies" }),
      j("theme", "lifegain", { af: "self", tr: "dies" }),
      j("theme", "tokens", { af: "self", tr: "etb", rec: "oneShot" }),
    ],
    why: "Each of your creatures dying drains each opponent 1 and gains you 1: deathTrigger, drain and lifegain. Plus one Soldier token on entry.",
  },
  {
    name: "Viscera Seer", klass: "deathTriggerNeg",
    jobs: [j("theme", "sacOutlet", { rt: "creature", af: "self", tr: "activated" })],
    why: "A HARD NEGATIVE for deathTrigger: it CAUSES deaths for free but does nothing because one happened (scry is a cost-paid effect and not a job).",
  },
  {
    name: "Ashnod's Altar", klass: "deathTriggerNeg",
    jobs: [
      j("theme", "sacOutlet", { rt: "creature", af: "self", tr: "activated" }),
      j("role", "ramp", { rk: "burstMana", af: "self", tr: "activated" }),
    ],
    why: "A HARD NEGATIVE for deathTrigger: a sac outlet whose payoff is a cost, not a trigger. Sacrificing a creature for mana is burstMana, repeatable across creatures.",
  },

  {
    name: "Phyrexian Altar", klass: "deathTriggerNeg",
    jobs: [
      j("theme", "sacOutlet", { rt: "creature", af: "self", tr: "activated" }),
      j("role", "ramp", { rk: "burstMana", af: "self", tr: "activated" }),
    ],
    why: "A HARD NEGATIVE for deathTrigger: it causes deaths as a cost and pays out from the cost, not from a trigger. Sac outlet and burstMana.",
  },

  // ---- tribal -------------------------------------------------------------------------------
  {
    name: "Lord of Atlantis", klass: "tribal",
    jobs: [
      j("theme", "tribal", { rt: "Merfolk", af: "each" }),
      j("theme", "pump", { rt: "Merfolk", af: "each" }),
      j("theme", "evasion", { rt: "Merfolk", af: "each" }),
    ],
    why: "Other Merfolk, ANYONE'S, get +1/+1 and islandwalk: affects each. Judgement: islandwalk is evasion, being 'can't be blocked' conditioned on an Island.",
  },
  {
    name: "Elvish Archdruid", klass: "tribal",
    jobs: [
      j("theme", "tribal", { rt: "Elf", af: "self" }),
      j("theme", "pump", { rt: "Elf", af: "self" }),
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" }),
    ],
    why: "Elf lord: +1/+1 to your other Elves and taps for {G} per Elf.",
  },
  {
    name: "Lord of the Undead", klass: "tribal",
    jobs: [
      j("theme", "tribal", { rt: "Zombie", af: "each" }),
      j("theme", "pump", { rt: "Zombie", af: "each" }),
      j("theme", "recursion", { rt: "Zombie", af: "self", dest: "hand", tr: "activated" }),
    ],
    why: "All other Zombies get +1/+1 (affects each), and it regrows a Zombie card to hand: Zombie-restricted recursion.",
  },
  {
    name: "Vanquisher's Banner", klass: "tribal",
    jobs: [
      j("theme", "tribal", { af: "self" }),
      j("theme", "pump", { rt: "creature", af: "self" }),
      j("role", "draw", { af: "self", tr: "cast" }),
    ],
    why: "Chosen-type anthem and a draw on casting a creature of that type. The type is chosen, not printed, so tribal carries no restrictedTo (judgement).",
  },
  {
    name: "Metallic Mimic", klass: "tribal",
    jobs: [
      j("theme", "tribal", { af: "self" }),
      j("theme", "counters", { rt: "creature", af: "self", tr: "etb" }),
    ],
    why: "Chosen-type creatures enter with a +1/+1 counter.",
  },
  {
    name: "Krenko, Mob Boss", klass: "tribal",
    jobs: [
      j("theme", "tribal", { rt: "Goblin", af: "self" }),
      j("theme", "tokens", { af: "self", tr: "activated" }),
    ],
    why: "Makes X Goblin tokens, X counting your Goblins: tribal for Goblin, tokens repeatable.",
  },
  {
    name: "Herald's Horn", klass: "tribal",
    jobs: [
      j("theme", "tribal", { af: "self" }),
      j("role", "ramp", { rk: "costReduction", rt: "creature", af: "self" }),
      j("role", "draw", { af: "self", tr: "upkeep" }),
    ],
    why: "Chosen-type creature spells cost {1} less (costReduction on OTHER spells). Judgement: the upkeep reveal that puts a matching creature into hand is draw ('puts cards into your hand from your library'); it is not a search, so not tutor.",
  },
  {
    name: "Coat of Arms", klass: "tribalNeg",
    jobs: [j("theme", "pump", { rt: "creature", af: "each" })],
    why: "A HARD NEGATIVE for tribal: it rewards creatures sharing ANY type, not one type, and pumps everyone's. Pump, affects each.",
  },
  {
    name: "Shared Animosity", klass: "tribalNeg",
    jobs: [j("theme", "pump", { rt: "creature", af: "self", tr: "attacks" })],
    why: "A HARD NEGATIVE for tribal: 'shares a creature type' with no one type named. Attack-triggered pump.",
  },
  {
    name: "Changeling Outcast", klass: "tribalNeg",
    jobs: [j("theme", "evasion", { rt: "creature", af: "self" })],
    why: "A HARD NEGATIVE for tribal: changeling makes it EVERY type, a card tribal decks play, but it cares about no type. Can't be blocked is evasion.",
  },
  {
    name: "Intangible Virtue", klass: "tribalNeg",
    jobs: [j("theme", "pump", { rt: "creature", af: "self" })],
    why: "A HARD NEGATIVE for tribal: a lord for TOKENS, which is not a creature type. Pump for your creature tokens.",
  },
];
