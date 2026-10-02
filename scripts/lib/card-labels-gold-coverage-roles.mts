// Gold coverage for the vocabulary plan's Task 4: see the brief at the head of card-labels-gold.mts.
import { j, mv, type GoldRow } from "./card-labels-gold-helpers.mjs";

// Shorthands for the two shapes that recur on every spell here: a one-shot on resolution.
const once = { rec: "oneShot" } as const;

export const COVERAGE_ROLES: GoldRow[] = [
  // ---- tutor: positives ------------------------------------------------------
  {
    name: "Demonic Tutor", klass: "tutor",
    jobs: [j("role", "tutor", { af: "self", dest: "hand", ...once })],
    why: "The plain unrestricted tutor: any card, to hand, once on resolution.",
  },
  {
    name: "Vampiric Tutor", klass: "tutor",
    jobs: [j("role", "tutor", { af: "self", dest: "top", ...once })],
    why: "Unrestricted tutor to the TOP of the library, not the hand. The 2 life is a cost of the effect, not drain (it hits you) and not a job.",
  },
  {
    name: "Imperial Seal", klass: "tutor",
    jobs: [j("role", "tutor", { af: "self", dest: "top", ...once })],
    why: "Vampiric Tutor at sorcery speed: any card to the top. The life loss is yours, so no drain.",
  },
  {
    name: "Worldly Tutor", klass: "tutor",
    jobs: [j("role", "tutor", { rt: "creature", af: "self", dest: "top", ...once })],
    why: "Creature-only tutor to the top: restricted and top-destined, the pair the brief asks to vary.",
  },
  {
    name: "Mystical Tutor", klass: "tutor",
    jobs: [j("role", "tutor", { rt: "instant or sorcery", af: "self", dest: "top", ...once })],
    why: "Top-destined tutor restricted to two card types. JUDGEMENT: restrictedTo is written as printed, 'instant or sorcery', since the field holds one string and the restriction is the point.",
  },
  {
    name: "Fabricate", klass: "tutor",
    jobs: [j("role", "tutor", { rt: "artifact", af: "self", dest: "hand", ...once })],
    why: "Artifact-only tutor to hand.",
  },
  {
    name: "Idyllic Tutor", klass: "tutor",
    jobs: [j("role", "tutor", { rt: "enchantment", af: "self", dest: "hand", ...once })],
    why: "Enchantment-only tutor to hand.",
  },
  {
    name: "Eladamri's Call", klass: "tutor",
    jobs: [j("role", "tutor", { rt: "creature", af: "self", dest: "hand", ...once })],
    why: "Creature-only tutor to hand, at instant speed.",
  },
  {
    name: "Chord of Calling", klass: "tutor",
    jobs: [j("role", "tutor", { rt: "creature", af: "self", dest: "battlefield", ...once })],
    why: "Creature tutor straight to the BATTLEFIELD. Convoke reduces only its own cost, so it is not ramp. JUDGEMENT: the 'mana value X or less' cap is a threshold on X, which the schema cannot hold as a number, so threshold is null.",
  },
  {
    name: "Green Sun's Zenith", klass: "tutor",
    jobs: [j("role", "tutor", { rt: "creature", af: "self", dest: "battlefield", ...once })],
    why: "Creature tutor to the battlefield. JUDGEMENT: 'green' is a colour, not a card type, so restrictedTo is 'creature'; the MV-X cap is variable, so threshold is null. Shuffling itself back is not recursion (it never reaches a graveyard).",
  },

  // ---- tutor: hard negatives -------------------------------------------------
  {
    name: "Rampant Growth", klass: "tutorNeg",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", ...once })],
    why: "HARD NEGATIVE for tutor: it searches the library, but for a LAND, which the definition makes ramp (fetchesLand), never tutor.",
  },
  {
    name: "Farseek", klass: "tutorNeg",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", ...once })],
    why: "HARD NEGATIVE for tutor: a land search by basic type. fetchesLand. JUDGEMENT: restrictedTo is 'land' rather than the four printed land types, matching the existing fetchesLand rows.",
  },
  {
    name: "Expedition Map", klass: "tutorNeg",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", tr: "activated", ...once })],
    why: "HARD NEGATIVE for tutor: a search to HAND, which is the tutor shape, but for a land card, so it is fetchesLand ('onto the battlefield or into hand'). oneShot: the activation sacrifices it.",
  },
  {
    name: "Preordain", klass: "tutorNeg",
    jobs: [j("role", "draw", { af: "self", ...once })],
    why: "HARD NEGATIVE for tutor: scry selects from the library but searches nothing, and scry is not a job. The draw is.",
  },
  {
    name: "Courser of Kruphix", klass: "tutorNeg",
    jobs: [j("theme", "landfall", { af: "self", tr: "landfall" }), j("theme", "lifegain", { af: "self", tr: "landfall" })],
    why: "HARD NEGATIVE for tutor: it only REVEALS the top card and lets you play lands from it, which is neither a search nor an extra land drop. Its real jobs are the landfall life gain.",
  },

  // ---- counterspell: positives -----------------------------------------------
  // JUDGEMENT throughout: `affects` on a counterspell is `opponents`, by analogy with the coordinator's
  // ruling for removal ("target spell" is aimed at an opponent's spell in practice).
  {
    name: "Counterspell", klass: "counterspell",
    jobs: [j("role", "counterspell", { af: "opponents", ...once })],
    why: "The hard counter: any spell, unconditionally.",
  },
  {
    name: "Force of Will", klass: "counterspell",
    jobs: [j("role", "counterspell", { af: "opponents", ...once })],
    why: "A hard counter. JUDGEMENT: the alternative cost (life plus a blue card) is not castFree: it pays a cost for ITSELF rather than casting a spell without paying.",
  },
  {
    name: "Mana Leak", klass: "counterspell",
    jobs: [j("role", "counterspell", { af: "opponents", ...once })],
    why: "A SOFT counter: the spell is countered unless its controller pays {3}. Still a counterspell.",
  },
  {
    name: "Spell Pierce", klass: "counterspell",
    jobs: [j("role", "counterspell", { rt: "noncreature", af: "opponents", ...once })],
    why: "Soft AND restricted: noncreature spells only, unless {2} is paid. JUDGEMENT: restrictedTo 'noncreature' as printed; the field has no way to say 'not this type' otherwise.",
  },
  {
    name: "Negate", klass: "counterspell",
    jobs: [j("role", "counterspell", { rt: "noncreature", af: "opponents", ...once })],
    why: "Hard counter restricted to noncreature spells. restrictedTo 'noncreature' as printed (same judgement as Spell Pierce).",
  },
  {
    name: "Essence Scatter", klass: "counterspell",
    jobs: [j("role", "counterspell", { rt: "creature", af: "opponents", ...once })],
    why: "Hard counter restricted to creature spells.",
  },
  {
    name: "Stifle", klass: "counterspell",
    jobs: [j("role", "counterspell", { af: "opponents", ...once })],
    why: "An ABILITY counter: activated or triggered abilities only, no spells. The definition covers 'a spell or ability'. JUDGEMENT: restrictedTo stays null because an ability is not a card or creature type.",
  },
  {
    name: "Disallow", klass: "counterspell",
    jobs: [j("role", "counterspell", { af: "opponents", ...once })],
    why: "Counters a spell OR an activated or triggered ability: both halves of the definition in one card.",
  },

  // ---- counterspell: hard negatives ------------------------------------------
  {
    name: "Icy Manipulator", klass: "counterspellNeg",
    jobs: [],
    why: "HARD NEGATIVE for counterspell (and removal): a tapper stops a permanent for a turn and counters nothing. No job in the vocabulary.",
  },
  {
    name: "Thalia, Guardian of Thraben", klass: "counterspellNeg",
    jobs: [j("theme", "stax", { rt: "noncreature", af: "each" })],
    why: "HARD NEGATIVE for counterspell: it TAXES noncreature spells rather than countering them. That is stax. JUDGEMENT: affects 'each' because the tax hits your spells too; restrictedTo 'noncreature' as printed. First strike is not evasion.",
  },
  {
    name: "Misdirection", klass: "counterspellNeg",
    jobs: [],
    why: "HARD NEGATIVE for counterspell: it REDIRECTS a spell's target and the spell still resolves. Its alternative cost pays for itself, so it is not castFree. No job.",
  },
  {
    name: "Vexing Shusher", klass: "counterspellNeg",
    jobs: [],
    why: "HARD NEGATIVE for counterspell: it makes spells UNcounterable, the opposite job. JUDGEMENT: 'can't be countered' is not in the protection theme's list (hexproof, indestructible, ward, protection from, regenerate, phasing, armor), so no job.",
  },
  {
    name: "Fog", klass: "counterspellNeg",
    jobs: [j("theme", "fog", { af: "each", ...once })],
    why: "HARD NEGATIVE for counterspell: an instant that answers an attack without countering anything. Fog. JUDGEMENT: affects 'each' because it prevents ALL combat damage, yours included.",
  },

  // ---- removal: positives (affects is `opponents` on removal, per the coordinator's ruling) -------
  {
    name: "Doom Blade", klass: "removal",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", ...once })],
    why: "Single-target destroy, restricted to nonblack creatures. JUDGEMENT: 'nonblack' is a colour limit the field cannot hold, so restrictedTo is 'creature'.",
  },
  {
    name: "Vindicate", klass: "removal",
    jobs: [j("role", "removal", { rt: "permanent", af: "opponents", meth: "destroy", ...once })],
    why: "Destroy target PERMANENT: the unrestricted destroy, any permanent type.",
  },
  {
    name: "Swords to Plowshares", klass: "removal",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "exile", ...once })],
    why: "Exile removal. The life goes to the creature's CONTROLLER, not you, so it is not lifegain.",
  },
  {
    name: "Unsummon", klass: "removal",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "bounce", ...once })],
    why: "Bounce: return target creature to its owner's hand. The definition counts bouncing as removal.",
  },
  {
    name: "Dismember", klass: "removal",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "shrink", ...once })],
    why: "Shrink: -5/-5 until end of turn. Phyrexian mana is a cost option, not a job.",
  },
  {
    name: "Disfigure", klass: "removal",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "shrink", ...once })],
    why: "Shrink at the small end: -2/-2. Still removal, by method shrink.",
  },
  {
    name: "Control Magic", klass: "removal",
    jobs: [
      j("role", "removal", { rt: "creature", af: "opponents", meth: null }),
      j("theme", "theft", { rt: "creature", af: "opponents" }),
    ],
    why: "THEFT as removal: the definition says gaining control of a permanent is removal. JUDGEMENT: METHODS has no 'gain control' value, so method is null (none of destroy, exile, bounce, shrink fits); recurrence repeatable because the Aura holds the creature for as long as it stays. Theft theme too.",
  },
  {
    name: "Confiscate", klass: "removal",
    jobs: [
      j("role", "removal", { rt: "permanent", af: "opponents", meth: null }),
      j("theme", "theft", { rt: "permanent", af: "opponents" }),
    ],
    why: "Theft of any PERMANENT, not just a creature. Same method-null judgement as Control Magic: no method value names gaining control.",
  },
  {
    name: "Conclave Tribunal", klass: "removal",
    jobs: [j("role", "removal", { rt: "nonland permanent", af: "opponents", meth: "exile", tr: "etb", ...once })],
    why: "Exile removal on an ETB, and also a costReduction HARD NEGATIVE: convoke lowers only its OWN cost, which the definition says is not ramp. The text names 'an opponent controls', so affects is opponents by the card as well as by the ruling.",
  },

  // ---- removal: hard negatives -----------------------------------------------
  {
    name: "Dovin's Veto", klass: "removalNeg",
    jobs: [j("role", "counterspell", { rt: "noncreature", af: "opponents", ...once })],
    why: "HARD NEGATIVE for removal: a counterspell is NOT removal by definition (the app's text classifier still counts it, which is the near-miss). 'Can't be countered' on itself is not a job.",
  },
  {
    name: "Blinding Mage", klass: "removalNeg",
    jobs: [],
    why: "HARD NEGATIVE for removal: a tapper, which the definition excludes by name. The creature stays where it is.",
  },
  {
    name: "Despise", klass: "removalNeg",
    jobs: [j("theme", "discard", { rt: "creature or planeswalker", af: "opponents", ...once })],
    why: "HARD NEGATIVE for removal: hand attack takes a creature before it lands, which the definition excludes. Discard, aimed at a target opponent. JUDGEMENT: restrictedTo as printed, 'creature or planeswalker'.",
  },
  {
    name: "Pacifism", klass: "removalNeg",
    jobs: [],
    why: "HARD NEGATIVE for removal, and a JUDGEMENT: the creature can't attack or block but is not destroyed, exiled, bounced, shrunk or stolen, so it is none of the methods the definition names. Many players call this removal; the vocabulary does not.",
  },

  // ---- draw: positives ---------------------------------------------------------
  {
    name: "Harmonize", klass: "draw",
    jobs: [j("role", "draw", { af: "self", ...once })],
    why: "Plain draw three, once. No reward for drawing, so not the draw THEME.",
  },
  {
    name: "Phyrexian Arena", klass: "draw",
    jobs: [j("role", "draw", { af: "self", tr: "upkeep" })],
    why: "Repeatable draw every upkeep. The life loss is yours, not drain.",
  },
  {
    name: "Palace Sentinels", klass: "draw",
    jobs: [j("role", "draw", { af: "self", tr: "other" })],
    why: "Becoming the MONARCH, which the definition names as repeatable draw. JUDGEMENT: trigger 'other', because the draw comes at each end step while you hold the crown, not on the ETB that makes you monarch; recurrence repeatable.",
  },
  {
    name: "Rhystic Study", klass: "draw",
    jobs: [j("role", "draw", { af: "self", tr: "cast" })],
    why: "Repeatable draw triggered by an OPPONENT casting a spell, unless they pay {1}. affects self: you draw. JUDGEMENT: not stax, because the {1} is a choice that buys off your draw rather than a tax on the spell.",
  },

  // ---- draw: hard negatives (tutors, which are also tutor positives) -----------
  {
    name: "Diabolic Tutor", klass: "drawNeg",
    jobs: [j("role", "tutor", { af: "self", dest: "hand", ...once })],
    why: "HARD NEGATIVE for draw: it puts a card in hand from the library, which is the draw shape, but by SEARCH. The definition says a tutor is not draw.",
  },
  {
    name: "Personal Tutor", klass: "drawNeg",
    jobs: [j("role", "tutor", { rt: "sorcery", af: "self", dest: "top", ...once })],
    why: "HARD NEGATIVE for draw: a sorcery tutor to the TOP, so the card is drawn next turn by the normal draw. A tutor, not draw.",
  },
  {
    name: "Merchant Scroll", klass: "drawNeg",
    jobs: [j("role", "tutor", { rt: "instant", af: "self", dest: "hand", ...once })],
    why: "HARD NEGATIVE for draw: tutors a blue instant to hand. JUDGEMENT: 'blue' is a colour, so restrictedTo is 'instant'.",
  },
  {
    name: "Steelshaper's Gift", klass: "drawNeg",
    jobs: [j("role", "tutor", { rt: "Equipment", af: "self", dest: "hand", ...once })],
    why: "HARD NEGATIVE for draw: an Equipment tutor to hand. restrictedTo is the printed subtype 'Equipment'.",
  },

  // ---- wipes: positives (affects is `each` on a wipe: every player's creatures, yours included) ---
  {
    name: "Wrath of God", klass: "wipes",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "destroy", ...once })],
    why: "The canonical 'destroy all creatures'. 'Can't be regenerated' is not a job.",
  },
  {
    name: "Consume the Meek", klass: "wipes",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "destroy", th: mv(3, "<="), ...once })],
    why: "The 'destroy EACH creature' wording the brief asks for, gated by a THRESHOLD: mana value 3 or less.",
  },
  {
    name: "Toxic Deluge", klass: "wipes",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "shrink", ...once })],
    why: "A shrink wipe: all creatures get -X/-X. X is chosen, so no threshold.",
  },
  {
    name: "Evacuation", klass: "wipes",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "bounce", ...once })],
    why: "A bounce wipe: return all creatures to their owners' hands.",
  },

  // ---- wipes: hard negatives -----------------------------------------------------
  {
    name: "Murder", klass: "wipesNeg",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", ...once })],
    why: "HARD NEGATIVE for wipes: the same 'destroy' verb as Wrath of God, on ONE target. Single-target removal.",
  },
  {
    name: "Go for the Throat", klass: "wipesNeg",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", ...once })],
    why: "HARD NEGATIVE for wipes: single-target destroy. JUDGEMENT: 'nonartifact' cannot be held by restrictedTo, so it is 'creature'.",
  },

  // ---- ramp costReduction: positives ---------------------------------------------
  {
    name: "Etherium Sculptor", klass: "costReduction",
    jobs: [j("role", "ramp", { rk: "costReduction", rt: "artifact", af: "self" })],
    why: "Makes OTHER artifact spells cost {1} less: costReduction restricted to artifact.",
  },
  {
    name: "Foundry Inspector", klass: "costReduction",
    jobs: [j("role", "ramp", { rk: "costReduction", rt: "artifact", af: "self" })],
    why: "Artifact spells you cast cost {1} less. Same job as Etherium Sculptor, on a colourless body.",
  },
  {
    name: "Goblin Warchief", klass: "costReduction",
    jobs: [
      j("role", "ramp", { rk: "costReduction", rt: "Goblin", af: "self" }),
      j("theme", "haste", { rt: "Goblin", af: "self" }),
      j("theme", "tribal", { rt: "Goblin", af: "self" }),
    ],
    why: "Cost reduction restricted to a CREATURE TYPE, Goblin, plus haste for Goblins. Both reward one type, so tribal.",
  },
  {
    name: "Dragonspeaker Shaman", klass: "costReduction",
    jobs: [
      j("role", "ramp", { rk: "costReduction", rt: "Dragon", af: "self" }),
      j("theme", "tribal", { rt: "Dragon", af: "self" }),
    ],
    why: "Dragon spells cost {2} less: costReduction limited to Dragon, which is also tribal.",
  },
  {
    name: "Krosan Drover", klass: "costReduction",
    jobs: [j("role", "ramp", { rk: "costReduction", rt: "creature", af: "self", th: mv(6) })],
    why: "Creature spells cost {2} less, gated by a THRESHOLD: mana value 6 or greater.",
  },
  {
    name: "Heartless Summoning", klass: "costReduction",
    jobs: [j("role", "ramp", { rk: "costReduction", rt: "creature", af: "self" })],
    why: "Creature spells cost {2} less. The -1/-1 to your own creatures is a drawback with no job (not counters, not shrink-removal).",
  },
  {
    name: "Helm of Awakening", klass: "costReduction",
    jobs: [j("role", "ramp", { rk: "costReduction", af: "each" })],
    why: "'Spells cost {1} less': every player's, so affects is each. Unrestricted.",
  },
  {
    name: "Cloud Key", klass: "costReduction",
    jobs: [j("role", "ramp", { rk: "costReduction", af: "self" })],
    why: "Spells of a chosen type cost {1} less. JUDGEMENT: the type is CHOSEN as it enters, not printed, so restrictedTo is null.",
  },

  // ---- ramp costReduction: hard negatives ------------------------------------------
  {
    name: "Frogmite", klass: "costReductionNeg",
    jobs: [],
    why: "HARD NEGATIVE for costReduction: affinity reduces only ITS OWN cost, which the definition says is not ramp. A vanilla 2/2 otherwise.",
  },
  {
    name: "Thoughtcast", klass: "costReductionNeg",
    jobs: [j("role", "draw", { af: "self", ...once })],
    why: "HARD NEGATIVE for costReduction: affinity on itself only. The draw two is its job.",
  },
  {
    name: "Omniscience", klass: "costReductionNeg",
    jobs: [j("theme", "castFree", { af: "self" })],
    why: "HARD NEGATIVE for costReduction: casting spells WITHOUT PAYING is castFree, which the definition separates from cost reduction.",
  },
  // Conclave Tribunal (convoke, own cost only) is listed under removal above and is also this negative.

  // ---- ramp extraLandDrop: positives --------------------------------------------------
  {
    name: "Exploration", klass: "extraLandDrop",
    jobs: [j("role", "ramp", { rk: "extraLandDrop", af: "self" })],
    why: "The plain extra land drop each turn.",
  },
  {
    name: "Azusa, Lost but Seeking", klass: "extraLandDrop",
    jobs: [j("role", "ramp", { rk: "extraLandDrop", af: "self" })],
    why: "TWO additional lands each turn. The count is not a threshold (no number gates it), so it is the same label as Exploration.",
  },
  {
    name: "Oracle of Mul Daya", klass: "extraLandDrop",
    jobs: [j("role", "ramp", { rk: "extraLandDrop", af: "self" })],
    why: "An extra land drop. Playing lands from the top of the library is not a separate job (not a tutor, not draw).",
  },
  {
    name: "Dryad of the Ilysian Grove", klass: "extraLandDrop",
    jobs: [j("role", "ramp", { rk: "extraLandDrop", af: "self" })],
    why: "An extra land drop. Lands gaining every basic type is fixing, not a job.",
  },
  {
    name: "Wayward Swordtooth", klass: "extraLandDrop",
    jobs: [j("role", "ramp", { rk: "extraLandDrop", af: "self" })],
    why: "An extra land drop on a Dinosaur that can't attack until the city's blessing. That restriction is on itself, not a job.",
  },
  {
    name: "Mina and Denn, Wildborn", klass: "extraLandDrop",
    jobs: [
      j("role", "ramp", { rk: "extraLandDrop", af: "self" }),
      j("theme", "evasion", { rt: "creature", af: "self", tr: "activated" }),
    ],
    why: "Extra land drop, plus an activated trample grant (evasion). Returning your own land is the activation's cost, not bounce removal.",
  },
  {
    name: "Explore", klass: "extraLandDrop",
    jobs: [j("role", "ramp", { rk: "extraLandDrop", af: "self", ...once }), j("role", "draw", { af: "self", ...once })],
    why: "One additional land THIS TURN, so oneShot, plus draw a card.",
  },
  {
    name: "Rites of Flourishing", klass: "extraLandDrop",
    jobs: [j("role", "ramp", { rk: "extraLandDrop", af: "each" }), j("role", "draw", { af: "each", tr: "other" })],
    why: "Symmetric: EACH player gets an extra land and an extra draw, so affects is each on both. JUDGEMENT: the draw's trigger is 'other' (each draw step), which the trigger list has no closer name for.",
  },

  // ---- ramp extraLandDrop: hard negatives ------------------------------------------------
  {
    name: "Cultivate", klass: "extraLandDropNeg",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", ...once })],
    why: "HARD NEGATIVE for extraLandDrop: it puts a land onto the battlefield without using a land play, but by SEARCH, so it is fetchesLand. Kinds match only themselves.",
  },
  {
    name: "Sakura-Tribe Elder", klass: "extraLandDropNeg",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", tr: "activated", ...once })],
    why: "HARD NEGATIVE for extraLandDrop: a land search, fetchesLand. oneShot because it sacrifices itself; sacrificing only itself is not a sacOutlet.",
  },
  {
    name: "Crop Rotation", klass: "extraLandDropNeg",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "land", af: "self", ...once })],
    why: "HARD NEGATIVE for extraLandDrop: a land search onto the battlefield. JUDGEMENT: labelled fetchesLand even though it sacrifices a land to do it (net zero lands), because the kind names the mechanism and it upgrades the land.",
  },
  {
    name: "Wood Elves", klass: "extraLandDropNeg",
    jobs: [j("role", "ramp", { rk: "fetchesLand", rt: "Forest", af: "self", tr: "etb", ...once })],
    why: "HARD NEGATIVE for extraLandDrop: an ETB land search, fetchesLand, limited to a Forest as printed.",
  },

  // ---- ramp burstMana: positives -------------------------------------------------------
  {
    name: "Dark Ritual", klass: "burstMana",
    jobs: [j("role", "ramp", { rk: "burstMana", af: "self", ...once })],
    why: "The ritual the definition names: one-time mana from a spell, burstMana.",
  },
  {
    name: "Seething Song", klass: "burstMana",
    jobs: [j("role", "ramp", { rk: "burstMana", af: "self", ...once })],
    why: "A red ritual: five mana for three, once.",
  },
  {
    name: "Pyretic Ritual", klass: "burstMana",
    jobs: [j("role", "ramp", { rk: "burstMana", af: "self", ...once })],
    why: "A red ritual, three for two.",
  },
  {
    name: "Cabal Ritual", klass: "burstMana",
    jobs: [j("role", "ramp", { rk: "burstMana", af: "self", ...once })],
    why: "A ritual with a threshold upgrade. JUDGEMENT: threshold null, because the seven-card count only enlarges the burst rather than gating the job.",
  },

  // ---- ramp burstMana: hard negatives ---------------------------------------------------
  {
    name: "Sol Ring", klass: "burstManaNeg",
    jobs: [j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" })],
    why: "HARD NEGATIVE for burstMana: mana every turn from a tap, nothing consumed. tapsForMana.",
  },
  {
    name: "Brass's Bounty", klass: "burstManaNeg",
    jobs: [j("role", "ramp", { rk: "makesTreasure", af: "self", ...once }), j("theme", "treasure", { af: "self", ...once })],
    why: "HARD NEGATIVE for burstMana: a one-shot sorcery that LOOKS like a ritual, but it makes Treasure tokens, which is makesTreasure. Kinds match only themselves.",
  },
];
