// Gold coverage for the vocabulary plan's Task 4: see the brief at the head of card-labels-gold.mts.
//
// These rows score the three CONSUMER-READ FIELDS, each of which decides a stand-in match:
// `affects` (a wrong value silently disqualifies an honest match), `to` on recursion and tutor,
// and `method` on removal and wipes. Each card is picked so the FIELD is the interesting part,
// and the near-miss pairs sit next to each other: self-mill / opponent-mill / each-player mill,
// you-discard / opponents-discard / each-player discard, your draw / symmetrical draw, and life
// loss to each opponent (drain) against life loss to each player (not drain).
//
// Two rulings these rows follow (coordinator, 2026-10-02):
//   - `affects` on REMOVAL is `opponents` even where the rules let you target your own permanent,
//     because removal is defined as taking an opponent's permanent. A wipe ("destroy all
//     creatures") hits every player's, so it is `each`.
//   - `affects` is answered BY JOB (the prompt's rule): recursion and clones are `self` even from
//     "a graveyard" or of "any creature", and graveyard hate is `opponents` even on "any graveyard".
//     `null` is left for a job pointing at no player at all, and no row here needs it.
//
// A card's OWN dies-trigger is labelled by the job's `trigger: "dies"`, not by the deathTrigger
// theme, which is kept for cards that care about OTHER creatures dying. Flashback and escape stay
// `oneShot`, following the audited set's Fire Nation Attacks row ("twice-castable, not repeatable
// in play").
import { j, mv, type GoldRow } from "./card-labels-gold-helpers.mjs";

export const COVERAGE_FIELDS: GoldRow[] = [
  // ---- affects: self ---------------------------------------------------------
  {
    name: "Stitcher's Supplier", klass: "affectsSelf",
    jobs: [
      j("theme", "mill", { af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "mill", { af: "self", tr: "dies", rec: "oneShot" }),
    ],
    why: "Self-mill: 'mill three cards' with no player named mills YOUR library. Two separate triggers (enters, dies), each once, so two oneShot jobs rather than one repeatable. Its own death is the trigger, not the deathTrigger theme (judgement: the theme is for caring about other creatures dying). Pairs with Ruin Crab (opponents) and Mindwrack Harpy (each).",
  },
  {
    name: "Armored Skaab", klass: "affectsSelf",
    jobs: [j("theme", "mill", { af: "self", tr: "etb", rec: "oneShot" })],
    why: "Self-mill on ETB, 'mill four cards' of your own library. The self half of the mill near-miss: a consumer wanting opponent-mill must never keep this.",
  },
  {
    name: "Careful Study", klass: "affectsSelf",
    jobs: [
      j("role", "draw", { af: "self", rec: "oneShot" }),
      j("theme", "discard", { af: "self", rec: "oneShot" }),
    ],
    why: "You-discard: the discard is YOUR OWN hand (a loot), so discard affects self. The self half of the discard near-miss against Burglar Rat (opponents) and Windfall (each). Judgement: a self-discard is labelled with the discard theme, because the theme is 'makes a player discard' and the player is you.",
  },
  {
    name: "Wild Mongrel", klass: "affectsSelf",
    jobs: [
      j("theme", "discard", { af: "self", tr: "activated" }),
      j("theme", "pump", { rt: "creature", af: "self", tr: "activated" }),
    ],
    why: "Discard as an activated COST, repeatable, of your own hand: discard self. The +1/+1 is on itself, pump self. Judgement: a discard paid as a cost still 'makes a player discard'; the player is you.",
  },
  {
    name: "Divination", klass: "affectsSelf",
    jobs: [j("role", "draw", { af: "self", rec: "oneShot" })],
    why: "Plain 'draw two cards': YOUR draw, self. The self half of the draw near-miss against Howling Mine and Temple Bell (each).",
  },
  {
    name: "Night's Whisper", klass: "affectsSelf",
    jobs: [j("role", "draw", { af: "self", rec: "oneShot" })],
    why: "'You draw two cards and lose 2 life': self draw. The life loss is your own, which is no job (drain is opponents only), so nothing else is labelled.",
  },
  {
    name: "Spark Double", klass: "affectsSelf",
    jobs: [
      j("theme", "clones", { rt: null, af: "self", tr: "etb", rec: "oneShot" }),
      j("theme", "counters", { af: "self", tr: "etb", rec: "oneShot" }),
    ],
    why: "A clone limited to 'a creature or planeswalker YOU control', so affects self, the same answer Clone's 'any creature' gets by the by-job rule. rt null: it copies a creature OR a planeswalker, two types, as Phyrexian Metamorph.",
  },

  // ---- affects: opponents ------------------------------------------------------
  {
    name: "Ruin Crab", klass: "affectsOpponents",
    jobs: [
      j("theme", "mill", { af: "opponents", tr: "landfall" }),
      j("theme", "landfall", { af: "self", tr: "landfall" }),
    ],
    why: "'Each opponent mills three cards': opponent-mill, the middle of the mill near-miss (Armored Skaab self, Mindwrack Harpy each). Landfall is on lands YOU control.",
  },
  {
    name: "Psychic Corrosion", klass: "affectsOpponents",
    jobs: [
      j("theme", "mill", { af: "opponents", tr: "other" }),
      j("theme", "draw", { af: "self", tr: "other" }),
    ],
    why: "Each opponent mills two whenever YOU draw: opponent-mill, and the draw theme (rewards your draws) is self. Trigger 'other' because a draw is not one of the named events.",
  },
  {
    name: "Sphinx Mindbreaker", klass: "affectsOpponents",
    jobs: [
      j("theme", "mill", { af: "opponents", tr: "etb", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "'Each opponent mills ten cards' once on ETB: opponents, oneShot. Flying on itself is evasion, self.",
  },
  {
    name: "Burglar Rat", klass: "affectsOpponents",
    jobs: [j("theme", "discard", { af: "opponents", tr: "etb", rec: "oneShot" })],
    why: "'Each opponent discards a card': opponents-discard, the middle of the discard near-miss (Careful Study self, Windfall each).",
  },
  {
    name: "Words of Waste", klass: "affectsOpponents",
    jobs: [j("theme", "discard", { af: "opponents", tr: "activated" })],
    why: "Each opponent discards in place of your draw, repeatable for {1}. Opponents discard. Judgement: it REPLACES your draw, so it is not a draw job and gets no draw label.",
  },
  {
    name: "Tinybones, Bauble Burglar", klass: "affectsOpponents",
    jobs: [
      j("theme", "discard", { af: "opponents", tr: "activated" }),
      j("theme", "theft", { af: "opponents", tr: "other" }),
      j("theme", "graveyardHate", { af: "opponents", tr: "other" }),
    ],
    why: "Activated 'each opponent discards'. Exiling an opponent's discarded card from THEIR graveyard is graveyardHate on opponents, and playing cards you don't own is theft. Trigger 'other' on those two because 'an opponent discards' is no named event (judgement).",
  },
  {
    name: "Bad Deal", klass: "affectsOpponents",
    jobs: [
      j("role", "draw", { af: "self", rec: "oneShot" }),
      j("theme", "discard", { af: "opponents", rec: "oneShot" }),
    ],
    why: "Three directions in one card: YOU draw (self), EACH OPPONENT discards (opponents), and EACH PLAYER loses 2, which is NOT drain because drain is life loss aimed only at opponents. A model that reads the whole card as one direction gets two of three wrong.",
  },
  {
    name: "Gray Merchant of Asphodel", klass: "affectsOpponents",
    jobs: [
      j("theme", "drain", { af: "opponents", tr: "etb", rec: "oneShot" }),
      j("theme", "lifegain", { af: "self", tr: "etb", rec: "oneShot" }),
    ],
    why: "'Each opponent loses X life': drain, opponents. The near-miss against Dire Fleet Ravager, whose ETB life loss hits EACH PLAYER and so is not drain at all. The lifegain is yours.",
  },
  {
    name: "Kokusho, the Evening Star", klass: "affectsOpponents",
    jobs: [
      j("theme", "drain", { af: "opponents", tr: "dies", rec: "oneShot" }),
      j("theme", "lifegain", { af: "self", tr: "dies", rec: "oneShot" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "Drain to each opponent on its own death, oneShot. Its own death is the trigger, not the deathTrigger theme (judgement, as on Stitcher's Supplier). Flying is evasion on itself.",
  },
  {
    name: "Zulaport Cutthroat", klass: "affectsOpponents",
    jobs: [
      j("theme", "drain", { af: "opponents", tr: "dies" }),
      j("theme", "lifegain", { af: "self", tr: "dies" }),
      j("theme", "deathTrigger", { rt: "creature", af: "self", tr: "dies" }),
    ],
    why: "Each opponent loses 1 when a creature YOU control dies: drain opponents, repeatable. deathTrigger affects self because only your creatures count, against Syr Konrad's any-creature trigger (each).",
  },

  // ---- affects: each -----------------------------------------------------------
  {
    name: "Howling Mine", klass: "affectsEach",
    jobs: [j("role", "draw", { af: "each", tr: "other" })],
    why: "Symmetrical draw: each player draws an extra card in their own draw step. affects each, against Dark Confidant (self). Trigger 'other' because a draw step is not upkeep.",
  },
  {
    name: "Temple Bell", klass: "affectsEach",
    jobs: [j("role", "draw", { af: "each", tr: "activated" })],
    why: "'{T}: Each player draws a card': symmetrical, repeatable, activated. A group-hug draw that a your-draw consumer must not keep as a Divination stand-in.",
  },
  {
    name: "Windfall", klass: "affectsEach",
    jobs: [
      j("theme", "discard", { af: "each", rec: "oneShot" }),
      j("role", "draw", { af: "each", rec: "oneShot" }),
    ],
    why: "Each player discards their hand then draws: each-player discard, the third corner of the discard near-miss, and a symmetrical draw.",
  },
  {
    name: "Wheel of Fortune", klass: "affectsEach",
    jobs: [
      j("theme", "discard", { af: "each", rec: "oneShot" }),
      j("role", "draw", { af: "each", rec: "oneShot" }),
    ],
    why: "The original wheel: each player discards and draws seven. Both jobs each.",
  },
  {
    name: "Dark Deal", klass: "affectsEach",
    jobs: [
      j("theme", "discard", { af: "each", rec: "oneShot" }),
      j("role", "draw", { af: "each", rec: "oneShot" }),
    ],
    why: "A wheel that nets each player one card fewer. Each player discards and draws, so both each; it is not removal or stax.",
  },
  {
    name: "Mindslicer", klass: "affectsEach",
    jobs: [j("theme", "discard", { af: "each", tr: "dies", rec: "oneShot" })],
    why: "'Each player discards their hand' on its own death: each, including you. A tempting opponents-discard read because the player who killed it usually suffers more. Its own death is the trigger, not deathTrigger (judgement).",
  },
  {
    name: "Mindwrack Harpy", klass: "affectsEach",
    jobs: [
      j("theme", "mill", { af: "each", tr: "other" }),
      j("theme", "evasion", { rt: "creature", af: "self" }),
    ],
    why: "'Each player mills three cards' every combat on your turn: each-player mill, the third corner of the mill near-miss. Trigger 'other' for beginning of combat. Flying is evasion on itself.",
  },
  {
    name: "Syr Konrad, the Grim", klass: "affectsEach",
    jobs: [
      j("theme", "mill", { af: "each", tr: "activated" }),
      j("theme", "drain", { af: "opponents", tr: "dies" }),
      j("theme", "deathTrigger", { rt: "creature", af: "each", tr: "dies" }),
    ],
    why: "Activated 'each player mills a card': each. The 1 damage goes to each opponent only, so drain opponents. The death trigger watches ANY creature, so deathTrigger is each (judgement: whose creatures, read as every player's). The trigger also fires on creature cards milled or leaving your graveyard; 'dies' is the main event.",
  },
  {
    name: "Fascination", klass: "affectsEach",
    jobs: [
      j("role", "draw", { af: "each", rec: "oneShot", modal: true }),
      j("theme", "mill", { af: "each", rec: "oneShot", modal: true }),
    ],
    why: "Choose one: each player draws X, or each player mills X. Both modal, both each: a symmetrical draw and an each-player mill on one card.",
  },
  {
    name: "Dire Fleet Ravager", klass: "drainNeg",
    jobs: [j("theme", "evasion", { rt: "creature", af: "self" })],
    why: "A HARD NEGATIVE for drain. 'Each player loses a third of their life' includes you, and drain is life loss aimed ONLY at opponents, so it is not drain, against Gray Merchant and Kokusho. Menace is evasion; deathtouch is no job.",
  },

  // ---- affects by job: 'a graveyard' and 'any creature' --------------------------
  {
    name: "Reanimate", klass: "affectsByJob",
    jobs: [j("theme", "recursion", { rt: "creature", af: "self", dest: "battlefield", rec: "oneShot" })],
    why: "Reanimation from 'a graveyard', ANY player's: recursion is self by the by-job rule, wherever the card comes from. The life loss is your own and no job.",
  },
  {
    name: "Animate Dead", klass: "affectsByJob",
    jobs: [j("theme", "recursion", { rt: "creature", af: "self", dest: "battlefield", tr: "etb", rec: "oneShot" })],
    why: "Enchant 'creature card in a graveyard', any player's: reanimation, self by the by-job rule (as Reanimate). The -1/-0 is no job.",
  },
  {
    name: "Necromancy", klass: "affectsByJob",
    jobs: [j("theme", "recursion", { rt: "creature", af: "self", dest: "battlefield", tr: "etb", rec: "oneShot" })],
    why: "'Target creature card from a graveyard' onto the battlefield: reanimation from any graveyard, self by the by-job rule (as Reanimate).",
  },
  {
    name: "Noxious Revival", klass: "affectsByJob",
    jobs: [j("theme", "recursion", { af: "self", dest: "top", rec: "oneShot" })],
    why: "'Target card from a graveyard on top of its OWNER's library': recursion to top, from any graveyard, self by the by-job rule. It can as easily undo an opponent's dead creature, which the rule deliberately does not split out.",
  },
  {
    name: "Scavenging Ooze", klass: "affectsByJob",
    jobs: [
      j("theme", "graveyardHate", { af: "opponents", tr: "activated" }),
      j("theme", "counters", { af: "self", tr: "activated" }),
      j("theme", "lifegain", { af: "self", tr: "activated" }),
    ],
    why: "'Exile target card from a graveyard', any graveyard: graveyardHate, opponents by the by-job rule. The +1/+1 counter and the life are yours, conditional on a creature card.",
  },
  {
    name: "Cling to Dust", klass: "affectsByJob",
    jobs: [
      j("theme", "graveyardHate", { af: "opponents", rec: "oneShot" }),
      j("theme", "lifegain", { af: "self", rec: "oneShot" }),
      j("role", "draw", { af: "self", rec: "oneShot" }),
    ],
    why: "Exile a card from any graveyard: graveyardHate, opponents by the by-job rule. Then gain 3 life OR draw a card depending on what it hit, a condition rather than a choice, so not modal (judgement). Escape makes it re-castable, kept oneShot per the flashback precedent.",
  },
  {
    name: "Deathrite Shaman", klass: "affectsByJob",
    jobs: [
      j("theme", "graveyardHate", { rt: "land", af: "opponents", tr: "activated" }),
      j("theme", "graveyardHate", { rt: "instant or sorcery", af: "opponents", tr: "activated" }),
      j("theme", "graveyardHate", { rt: "creature", af: "opponents", tr: "activated" }),
      j("role", "ramp", { rk: "tapsForMana", af: "self", tr: "activated" }),
      j("theme", "drain", { af: "opponents", tr: "activated" }),
      j("theme", "lifegain", { af: "self", tr: "activated" }),
    ],
    why: "All three abilities exile from 'a graveyard', any player's: graveyardHate, opponents by the by-job rule. The first taps for mana (tapsForMana, judgement: it needs a land card in some graveyard), the second makes each opponent lose 2 (drain), the third gains you 2. Three separate abilities, not modal, so three graveyardHate jobs, each restricted to the card type it exiles.",
  },
  {
    name: "Clone", klass: "affectsByJob",
    jobs: [j("theme", "clones", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" })],
    why: "'A copy of ANY creature on the battlefield', yours or an opponent's: clones, self by the by-job rule (the copy is yours). Spark Double, which copies only your own, answers the same.",
  },
  {
    name: "Phantasmal Image", klass: "affectsByJob",
    jobs: [j("theme", "clones", { rt: "creature", af: "self", tr: "etb", rec: "oneShot" })],
    why: "Copies any creature on the battlefield: clones, self, as Clone. The sacrifice-when-targeted drawback is no job.",
  },
  {
    name: "Phyrexian Metamorph", klass: "affectsByJob",
    jobs: [j("theme", "clones", { af: "self", tr: "etb", rec: "oneShot" })],
    why: "Copies any artifact OR creature on the battlefield, either side: clones, self, as Clone. restrictedTo left null because it spans two types (judgement).",
  },

  // ---- to: recursion -----------------------------------------------------------
  {
    name: "Eternal Witness", klass: "toHand",
    jobs: [j("theme", "recursion", { af: "self", dest: "hand", tr: "etb", rec: "oneShot" })],
    why: "Regrowth on a body: any card from YOUR graveyard to your hand. to hand, self.",
  },
  {
    name: "Regrowth", klass: "toHand",
    jobs: [j("theme", "recursion", { af: "self", dest: "hand", rec: "oneShot" })],
    why: "The namesake regrowth: target card from your graveyard to your hand. to hand.",
  },
  {
    name: "Raise Dead", klass: "toHand",
    jobs: [j("theme", "recursion", { rt: "creature", af: "self", dest: "hand", rec: "oneShot" })],
    why: "Creature card to HAND, not to the battlefield: the regrowth half of the near-miss against Zombify, which returns the same card to play.",
  },
  {
    name: "Gravedigger", klass: "toHand",
    jobs: [j("theme", "recursion", { rt: "creature", af: "self", dest: "hand", tr: "etb", rec: "oneShot" })],
    why: "ETB creature card to hand. A creature returning a creature tempts a reanimation read; it goes to hand.",
  },
  {
    name: "Archaeomancer", klass: "toHand",
    jobs: [j("theme", "recursion", { rt: "instant or sorcery", af: "self", dest: "hand", tr: "etb", rec: "oneShot" })],
    why: "Instant or sorcery to hand on ETB. Against Mystic Sanctuary, which returns the same kind of card to the TOP.",
  },
  {
    name: "Disentomb", klass: "toHand",
    jobs: [j("theme", "recursion", { rt: "creature", af: "self", dest: "hand", rec: "oneShot" })],
    why: "Creature card from your graveyard to your hand for {B}. A one-mana return a reader may confuse with Reanimate (battlefield).",
  },
  {
    name: "Zombify", klass: "toBattlefield",
    jobs: [j("theme", "recursion", { rt: "creature", af: "self", dest: "battlefield", rec: "oneShot" })],
    why: "Creature card from YOUR graveyard to the battlefield: reanimation, self. Same words as Raise Dead with a different destination.",
  },
  {
    name: "Unburial Rites", klass: "toBattlefield",
    jobs: [j("theme", "recursion", { rt: "creature", af: "self", dest: "battlefield", rec: "oneShot" })],
    why: "Reanimation from your graveyard. Flashback lets it be cast twice; kept oneShot per the audited set's flashback precedent (Fire Nation Attacks).",
  },
  {
    name: "Dread Return", klass: "toBattlefield",
    jobs: [j("theme", "recursion", { rt: "creature", af: "self", dest: "battlefield", rec: "oneShot" })],
    why: "Reanimation from your graveyard; the flashback cost sacrifices three creatures, which is a cost and not a sacOutlet (not repeatable). oneShot per the flashback precedent.",
  },
  {
    name: "Sun Titan", klass: "toBattlefield",
    jobs: [
      j("theme", "recursion", { rt: "permanent", af: "self", dest: "battlefield", tr: "etb", rec: "oneShot", th: mv(3, "<=") }),
      j("theme", "recursion", { rt: "permanent", af: "self", dest: "battlefield", tr: "attacks", th: mv(3, "<=") }),
    ],
    why: "Permanent card with MV 3 or less to the battlefield, on ETB (once) and on every attack (repeatable): two triggers, two jobs, same destination and threshold. Vigilance is no job.",
  },
  {
    name: "Living Death", klass: "toBattlefield",
    jobs: [
      j("theme", "recursion", { rt: "creature", af: "each", dest: "battlefield", rec: "oneShot" }),
      j("role", "wipes", { rt: "creature", af: "each", meth: "sacrifice", rec: "oneShot" }),
    ],
    why: "EACH player returns their own creature cards to the battlefield: recursion to battlefield, affects each. Each player first sacrifices every creature: a wipe, method sacrifice (d9's ruling of 2026-10-02).",
  },
  {
    name: "Reclaim", klass: "toTop",
    jobs: [j("theme", "recursion", { af: "self", dest: "top", rec: "oneShot" })],
    why: "Target card from your graveyard on TOP of your library: recursion to top, self. Not draw: nothing reaches your hand.",
  },
  {
    name: "Gravepurge", klass: "toTop",
    jobs: [
      j("theme", "recursion", { rt: "creature", af: "self", dest: "top", rec: "oneShot" }),
      j("role", "draw", { af: "self", rec: "oneShot" }),
    ],
    why: "Any number of creature cards from your graveyard to the top of your library, then draw one. to top; the draw is a separate job.",
  },
  {
    name: "Academy Ruins", klass: "toTop",
    jobs: [
      j("role", "land", { af: "self" }),
      j("theme", "recursion", { rt: "artifact", af: "self", dest: "top", tr: "activated" }),
    ],
    why: "A land (role land, never ramp) whose activated ability puts an artifact card from your graveyard on top: repeatable recursion to top. affects self on the land role is a judgement: a land is yours and the schema requires a value.",
  },
  {
    name: "Volrath's Stronghold", klass: "toTop",
    jobs: [
      j("role", "land", { af: "self" }),
      j("theme", "recursion", { rt: "creature", af: "self", dest: "top", tr: "activated" }),
    ],
    why: "The creature version of Academy Ruins: repeatable recursion to top. Land role affects self as on Academy Ruins (judgement).",
  },
  {
    name: "Mystic Sanctuary", klass: "toTop",
    jobs: [
      j("role", "land", { af: "self" }),
      j("theme", "recursion", { rt: "instant or sorcery", af: "self", dest: "top", tr: "etb", rec: "oneShot" }),
    ],
    why: "A land that, entering untapped, puts an instant or sorcery from your graveyard on top: to top, against Archaeomancer's to hand. Conditional on three other Islands.",
  },

  // ---- to: tutor ---------------------------------------------------------------
  {
    name: "Grim Tutor", klass: "toHand",
    jobs: [j("role", "tutor", { af: "self", dest: "hand", rec: "oneShot" })],
    why: "Any card to hand; the 3 life is your own and no job.",
  },
  {
    name: "Trinket Mage", klass: "toHand",
    jobs: [j("role", "tutor", { rt: "artifact", af: "self", dest: "hand", tr: "etb", rec: "oneShot", th: mv(1, "<=") })],
    why: "ETB tutor for an artifact with MV 1 or less, to hand. The threshold is the limit that matters.",
  },
  {
    name: "Stoneforge Mystic", klass: "toHand",
    jobs: [j("role", "tutor", { rt: "Equipment", af: "self", dest: "hand", tr: "etb", rec: "oneShot" })],
    why: "ETB tutor for an Equipment, to hand (rt exactly as printed). Judgement: the second ability puts an Equipment from HAND onto the battlefield, which is neither a search nor casting, so no job (not castFree, not a tutor to battlefield).",
  },
  {
    name: "Recruiter of the Guard", klass: "toHand",
    jobs: [j("role", "tutor", { rt: "creature", af: "self", dest: "hand", tr: "etb", rec: "oneShot", th: { stat: "other", op: "<=", value: 2 } })],
    why: "ETB creature tutor to hand, gated on toughness 2 or less. Toughness has no stat of its own, so stat 'other' (judgement).",
  },
  {
    name: "Natural Order", klass: "toBattlefield",
    jobs: [j("role", "tutor", { rt: "creature", af: "self", dest: "battlefield", rec: "oneShot" })],
    why: "A green creature straight onto the battlefield. The sacrifice is an additional cost, once, so not a sacOutlet.",
  },
  {
    name: "Eldritch Evolution", klass: "toBattlefield",
    jobs: [j("role", "tutor", { rt: "creature", af: "self", dest: "battlefield", rec: "oneShot" })],
    why: "Creature onto the battlefield, MV up to 2 more than the sacrificed one. The cap is relative, not a fixed number, so no threshold (judgement).",
  },
  {
    name: "Birthing Pod", klass: "toBattlefield",
    jobs: [
      j("role", "tutor", { rt: "creature", af: "self", dest: "battlefield", tr: "activated" }),
      j("theme", "sacOutlet", { rt: "creature", af: "self", tr: "activated" }),
    ],
    why: "Repeatable activated tutor onto the battlefield, MV exactly one more than the creature sacrificed. The sacrifice of OTHER creatures, repeatably, is also a sacOutlet (sorcery speed).",
  },
  {
    name: "Neoform", klass: "toBattlefield",
    jobs: [
      j("role", "tutor", { rt: "creature", af: "self", dest: "battlefield", rec: "oneShot" }),
      j("theme", "counters", { af: "self", rec: "oneShot" }),
    ],
    why: "One-shot Birthing Pod: creature onto the battlefield with an extra +1/+1 counter, which is the counters theme on your own creature.",
  },
  {
    name: "Academy Rector", klass: "toBattlefield",
    jobs: [j("role", "tutor", { rt: "enchantment", af: "self", dest: "battlefield", tr: "dies", rec: "oneShot" })],
    why: "On its own death, an enchantment straight onto the battlefield: the battlefield corner against Enlightened Tutor and Moon-Blessed Cleric (top). Own death is the trigger, not deathTrigger (judgement).",
  },
  {
    name: "Enlightened Tutor", klass: "toTop",
    jobs: [j("role", "tutor", { rt: "artifact or enchantment", af: "self", dest: "top", rec: "oneShot" })],
    why: "Artifact or enchantment to top. rt kept as printed across both types (judgement).",
  },
  {
    name: "Sylvan Tutor", klass: "toTop",
    jobs: [j("role", "tutor", { rt: "creature", af: "self", dest: "top", rec: "oneShot" })],
    why: "Creature to top at sorcery speed, against the creature-to-battlefield tutors (Natural Order, Eldritch Evolution).",
  },

  // ---- method: destroy ---------------------------------------------------------
  {
    name: "Ravenous Chupacabra", klass: "methodDestroy",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", tr: "etb", rec: "oneShot" })],
    why: "ETB 'destroy target creature an opponent controls': destroy, opponents, stated outright. Under the removal ruling it reads the same affects as Infernal Grasp.",
  },
  {
    name: "Beast Within", klass: "methodDestroy",
    jobs: [j("role", "removal", { rt: "permanent", af: "opponents", meth: "destroy", rec: "oneShot" })],
    why: "Destroy target permanent. The 3/3 Beast goes to the permanent's CONTROLLER, normally an opponent, so no tokens job is labelled (judgement: tokens means creating them for you).",
  },
  {
    name: "Damnation", klass: "methodDestroy",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "destroy", rec: "oneShot" })],
    why: "'Destroy all creatures': the destroy wipe, affects each because it hits every player's creatures, yours included.",
  },

  // ---- method: exile -------------------------------------------------------------
  {
    name: "Banisher Priest", klass: "methodExile",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "exile", tr: "etb", rec: "oneShot" })],
    why: "ETB exile target creature an opponent controls, until it leaves. Temporary, still exile removal; not blink (the card is not returned by you on purpose).",
  },
  {
    name: "Anguished Unmaking", klass: "methodExile",
    jobs: [j("role", "removal", { rt: "permanent", af: "opponents", meth: "exile", rec: "oneShot" })],
    why: "Exile target nonland permanent; the life loss is your own and no job.",
  },
  {
    name: "Oblivion Ring", klass: "methodExile",
    jobs: [j("role", "removal", { rt: "permanent", af: "opponents", meth: "exile", tr: "etb", rec: "oneShot" })],
    why: "ETB exile another nonland permanent until O-Ring leaves. Exile, not bounce: the card does not go to a hand.",
  },
  {
    name: "Declaration in Stone", klass: "methodExile",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "exile", rec: "oneShot" })],
    why: "Exile a creature and every same-named one its controller has. The Clues go to that player, so no job for you.",
  },
  {
    name: "Final Judgment", klass: "methodExile",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "exile", rec: "oneShot" })],
    why: "'Exile all creatures': the exile wipe, each. Against Damnation's destroy.",
  },

  // ---- method: bounce ------------------------------------------------------------
  {
    name: "Into the Roil", klass: "methodBounce",
    jobs: [
      j("role", "removal", { rt: "permanent", af: "opponents", meth: "bounce", rec: "oneShot" }),
      j("role", "draw", { af: "self", rec: "oneShot" }),
    ],
    why: "Bounce a nonland permanent; kicked, you also draw. The draw is conditional on paying the kicker, still a draw job (judgement).",
  },
  {
    name: "Man-o'-War", klass: "methodBounce",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "bounce", tr: "etb", rec: "oneShot" })],
    why: "ETB bounce target creature. Often used on your own creature to re-buy an ETB; affects opponents per the removal ruling.",
  },
  {
    name: "Cyclonic Rift", klass: "methodBounce",
    jobs: [
      j("role", "removal", { rt: "permanent", af: "opponents", meth: "bounce", rec: "oneShot", modal: true }),
      j("role", "wipes", { rt: "permanent", af: "opponents", meth: "bounce", rec: "oneShot", modal: true }),
    ],
    why: "Bounce a nonland permanent you don't control, or overloaded, EVERY nonland permanent you don't control: a one-sided bounce wipe, affects opponents (not each), against Devastation Tide. Modal is a judgement: overload is an alternative cost, so the card does one or the other.",
  },

  // ---- method: shrink ------------------------------------------------------------
  {
    name: "Lightning Bolt", klass: "methodShrink",
    jobs: [j("role", "removal", { af: "opponents", meth: "shrink", rec: "oneShot" })],
    why: "3 damage to any target: damage is shrink. Not drain, because it can hit any target. rt null because 'any target' spans creatures, planeswalkers, battles and players (judgement).",
  },
  {
    name: "Flame Slash", klass: "methodShrink",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "shrink", rec: "oneShot" })],
    why: "4 damage to target creature: damage-based removal is shrink.",
  },
  {
    name: "Pyroclasm", klass: "methodShrink",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "shrink", rec: "oneShot" })],
    why: "2 damage to each creature: a damage wipe, shrink, each.",
  },
  {
    name: "Blasphemous Act", klass: "methodShrink",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "shrink", rec: "oneShot" })],
    why: "13 damage to each creature: damage wipe, shrink, each. The self cost reduction is not ramp (it reduces only its own cost).",
  },
  {
    name: "Concentrate", klass: "affectsSelf",
    jobs: [j("role", "draw", { af: "self", rec: "oneShot" })],
    why: "Plain 'draw three cards', self. An easy self draw so a model that reads every draw as symmetrical is caught.",
  },
  {
    name: "Dark Confidant", klass: "affectsSelf",
    jobs: [j("role", "draw", { af: "self", tr: "upkeep" })],
    why: "Repeatable card on YOUR upkeep, put into your hand from your library, so draw self though the text says 'reveal ... put into your hand' rather than 'draw' (judgement: the role is defined by where the card goes). Contrast Howling Mine, where every player draws: same extra card a turn, opposite affects. The life loss is yours and no job.",
  },
  {
    name: "Tribute Mage", klass: "toHand",
    jobs: [j("role", "tutor", { rt: "artifact", af: "self", dest: "hand", tr: "etb", rec: "oneShot", th: mv(2, "==") })],
    why: "ETB tutor for an artifact with mana value EXACTLY 2, to hand: the threshold op is '==', against Trinket Mage's '<='.",
  },
  {
    name: "Ranger-Captain of Eos", klass: "toHand",
    jobs: [
      j("role", "tutor", { rt: "creature", af: "self", dest: "hand", tr: "etb", rec: "oneShot", th: mv(1, "<=") }),
      j("theme", "stax", { af: "opponents", tr: "activated", rec: "oneShot" }),
    ],
    why: "ETB creature tutor (MV 1 or less) to hand. Sacrificing itself stops opponents casting noncreature spells this turn, which is stax on opponents, oneShot because it sacrifices the source.",
  },
  {
    name: "Arena Rector", klass: "toBattlefield",
    jobs: [j("role", "tutor", { rt: "planeswalker", af: "self", dest: "battlefield", tr: "dies", rec: "oneShot" })],
    why: "On its own death, a planeswalker straight onto the battlefield. Own death is the trigger, not deathTrigger (judgement).",
  },
  {
    name: "Prime Speaker Vannifar", klass: "toBattlefield",
    jobs: [
      j("role", "tutor", { rt: "creature", af: "self", dest: "battlefield", tr: "activated" }),
      j("theme", "sacOutlet", { rt: "creature", af: "self", tr: "activated" }),
    ],
    why: "Birthing Pod on a body: tap and sacrifice another creature for one with MV one higher, onto the battlefield, repeatable. Sacrificing OTHER creatures repeatably is a sacOutlet.",
  },
  {
    name: "Cruel Tutor", klass: "toTop",
    jobs: [j("role", "tutor", { af: "self", dest: "top", rec: "oneShot" })],
    why: "Any card on TOP of your library, not to hand: the destination is the whole difference from Grim Tutor. The life loss is yours and no job.",
  },
  {
    name: "Sterling Grove", klass: "toTop",
    jobs: [
      j("role", "tutor", { rt: "enchantment", af: "self", dest: "top", tr: "activated", rec: "oneShot" }),
      j("theme", "protection", { rt: "enchantment", af: "self" }),
    ],
    why: "Sacrifice it to put an enchantment on top: tutor to top, oneShot because the cost sacrifices the source. Shroud on your OTHER enchantments is protection, self.",
  },
  {
    name: "Insidious Dreams", klass: "toTop",
    jobs: [
      j("role", "tutor", { af: "self", dest: "top", rec: "oneShot" }),
      j("theme", "discard", { af: "self", rec: "oneShot" }),
    ],
    why: "X cards stacked on top in any order. The X discards are an additional cost from YOUR hand: discard self, the same judgement as Wild Mongrel.",
  },
  {
    name: "Moon-Blessed Cleric", klass: "toTop",
    jobs: [j("role", "tutor", { rt: "enchantment", af: "self", dest: "top", tr: "etb", rec: "oneShot" })],
    why: "ETB enchantment to top. Against Academy Rector's enchantment onto the battlefield.",
  },
  {
    name: "Loyal Tutor", klass: "toTop",
    jobs: [j("role", "tutor", { rt: "planeswalker", af: "self", dest: "top", rec: "oneShot" })],
    why: "Planeswalker to top, against Arena Rector's planeswalker onto the battlefield.",
  },
  {
    name: "Infernal Grasp", klass: "methodDestroy",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", rec: "oneShot" })],
    why: "'Destroy target creature': method destroy. affects opponents, though it names no player, per the ruling that removal is defined as taking an opponent's permanent. The life loss is yours and no job.",
  },
  {
    name: "Vendetta", klass: "methodDestroy",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "destroy", rec: "oneShot" })],
    why: "Destroy target nonblack creature; rt 'creature', the colour limit has no field. Your life loss is no job.",
  },
  {
    name: "Repulse", klass: "methodBounce",
    jobs: [
      j("role", "removal", { rt: "creature", af: "opponents", meth: "bounce", rec: "oneShot" }),
      j("role", "draw", { af: "self", rec: "oneShot" }),
    ],
    why: "Return target creature to its owner's hand (bounce), and draw a card unconditionally, unlike Into the Roil's kicker.",
  },
  {
    name: "Devastation Tide", klass: "methodBounce",
    jobs: [j("role", "wipes", { rt: "permanent", af: "each", meth: "bounce", rec: "oneShot" })],
    why: "Return ALL nonland permanents to their owners' hands: a bounce wipe, each, against Cyclonic Rift's one-sided overload (opponents). Miracle is an alternative cost, not a second job.",
  },
  {
    name: "Last Gasp", klass: "methodShrink",
    jobs: [j("role", "removal", { rt: "creature", af: "opponents", meth: "shrink", rec: "oneShot" })],
    why: "-3/-3 until end of turn: shrink, the -X/-X half of the method (Lightning Bolt and Flame Slash are the damage half).",
  },
  {
    name: "Languish", klass: "methodShrink",
    jobs: [j("role", "wipes", { rt: "creature", af: "each", meth: "shrink", rec: "oneShot" })],
    why: "All creatures get -4/-4: the -X/-X wipe, shrink, each, against Pyroclasm's damage wipe.",
  },
];
