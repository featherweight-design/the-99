// Evidence benchmarks: fixtures for the block and the ledger. Every string is a PLACEHOLDER
// owed to /copy-review (mirrored in `evidence-benchmarks · copy strings.ts`). Figures follow the
// brief's two staging tables; grade cut points and card lists are illustrative until the plan
// fixes them. No surface names labels: a ledger simply lists its cards.

export const COPY = {
  heading: "How it plays",
  caption: "Graded on one scale for every Commander deck. Nothing here moves your bracket.",
  captionStale: "Graded with the bracket on 18 Sept, before your changes.",
  names: { velocity: "Mana velocity", flow: "Card flow", interaction: "Interaction", win: "Win speed" },
  steps: ["Low", "Modest", "Typical", "High", "Top"],
  noCombo: "No combo line",
  noComboLine: "This deck wins through combat. Timing that takes a test game, which we don't run yet.",
  open: (n) => (n === 1 ? "see the card" : `see the ${n} cards`),
  openCombo: (n) => (n === 1 ? "see the line" : `see the ${n} lines`),
  tinyHead: (n, min) => `Grades start at ${min} cards. This list has ${n}.`,
  tinyLine: "The bracket above is read from what's here. Benchmarks wait for a fuller list.",
  stepOf: (i) => `step ${i} of 5`,
  deps: {
    name: "Dependencies",
    kicker: "Risks, not scores",
    sub: "What an opponent's cards could take away from this deck. A risk to know about, never a score.",
    tipAria: "About dependencies",
    strength: { heavy: "Heavy", light: "Light" },
    brokenBy: "Broken by",
    rows: { graveyard: "Graveyard", artifacts: "Artifacts", enchantments: "Enchantments", creatures: "Creatures", activated: "Activated abilities", combat: "Combat" },
    hate: {
      graveyard: "Rest in Peace, Bojuka Bog, Dauthi Voidwalker",
      artifacts: "Artifact wipes such as Vandalblast. Null Rod and Collector Ouphe stop the abilities.",
      enchantments: "Enchantment wipes such as Back to Nature and Farewell",
      creatures: "Creature board wipes",
      activated: "Cursed Totem",
      combat: "Fogs, Propaganda, Ghostly Prison",
    },
    noneHead: "No single thing this deck leans on reaches our list.",
    noneLine: "That isn't protection. Board wipes and other answers still hit whatever is on the battlefield; nothing here is concentrated enough to name.",
    checked: "Checked: graveyard · artifacts · enchantments · creatures · activated abilities · combat",
  },
  ledger: {
    counted: "Counted",
    notCounted: "Read, not counted",
    close: (name) => `Close ${name}`,
    foundBy: "Found by",
    byT8: "in hand by turn 8",
    spellbook: "Commander Spellbook",
    onceNote: "A card is listed once, under its first group.",
  },
};

// One hue (the app's --fact blue, h 250) rising in saturation, step 1 to 5. Grades only.
export const STEP_INK = ["oklch(0.68 0.02 250)", "oklch(0.69 0.045 250)", "oklch(0.70 0.07 250)", "oklch(0.71 0.10 250)", "oklch(0.72 0.135 250)"];

const R = (name, why, pts) => ({ name, why, pts: pts ?? "" });
const D = (k, s, pre, strong, post, n) => ({ k, s, pre, strong, post, n });

const DECKS = {
  gishath: {
    deckName: "HD - Gishath", commander: "Gishath, Sun's Avatar", cards: 99,
    velocity: {
      step: 3, pre: "Early ramp ", strong: "9.75", post: " · average spell 4.29 mana", n: 12,
      reading: "36 lands and 9.75 points of early ramp, set against an average spell of 4.29 mana. Ramp counts in full at 2 mana or less and half at 3, and a one-time burst counts half again.",
      note: "Gishath, Sun's Avatar is expected on turn 7.", link: "Built on Curve in Deck stats",
      groups: [
        { head: "Counted", rows: [R("Sol Ring", "rock, 1 mana", "+1"), R("Birds of Paradise", "creature, 1 mana", "+1"), R("Llanowar Elves", "creature, 1 mana", "+1"), R("Arcane Signet", "rock, 2 mana", "+1"), R("Rampant Growth", "land onto the battlefield, 2 mana", "+1"), R("Nature's Lore", "land onto the battlefield, 2 mana", "+1"), R("Three Visits", "land onto the battlefield, 2 mana", "+1"), R("Farseek", "land onto the battlefield, 2 mana", "+1"), R("Cultivate", "land onto the battlefield, 3 mana", "+0.5"), R("Kodama's Reach", "land onto the battlefield, 3 mana", "+0.5"), R("Strike It Rich", "one-time burst, 1 mana", "+0.5"), R("Jeska's Will", "one-time burst, 3 mana", "+0.25")] },
        { head: "Read, not counted", rows: [R("Kinjalli's Caller", "cost reduction", "0"), R("Herald's Horn", "cost reduction", "0"), R("Explosive Vegetation", "ramp, 4 mana: too late to count", "0")] },
      ],
    },
    flow: { step: 3, pre: "", strong: "4", post: " repeating engines, 7 one-time draws", n: 11 },
    interaction: {
      step: 3, pre: "18 answers · ", strong: "0 cheap and instant", post: "", n: 18,
      reading: "18 answers, and none is both cheap and instant. Each counts 1, plus 1 at instant speed or with flash, plus 1 at 2 mana or less. Counterspells count here; removal is what answers a card already on the battlefield.",
      note: "", link: "Built on Jobs in Deck stats",
      groups: [
        { head: "Counted", rows: [R("Vandalblast", "sorcery, 1 mana", "+2"), R("Chaos Warp", "instant, 3 mana", "+2"), R("Beast Within", "instant, 3 mana", "+2"), R("Generous Gift", "instant, 3 mana", "+2"), R("Return to Dust", "instant, 4 mana", "+2"), R("Oblivion Ring", "enchantment, 3 mana", "+1"), R("Banishing Light", "enchantment, 3 mana", "+1"), R("Song of the Dryads", "enchantment, 3 mana", "+1"), R("Thrashing Brontodon", "creature, 3 mana", "+1"), R("Conclave Tribunal", "enchantment, 4 mana", "+1"), R("Wrath of God", "sorcery, 4 mana, wipe", "+1"), R("Hour of Revelation", "sorcery, 5 mana, wipe", "+1"), R("Cleansing Nova", "sorcery, 5 mana, wipe", "+1"), R("Austere Command", "sorcery, 6 mana, wipe", "+1"), R("Farewell", "sorcery, 6 mana, wipe", "+1"), R("Kogla, the Titan Ape", "creature, 6 mana", "+1"), R("Vanquish the Horde", "sorcery, 8 mana, wipe", "+1"), R("Ezuri's Predation", "sorcery, 8 mana, wipe", "+1")] },
      ],
    },
    win: {
      combo: true, step: 4, pre: "4 lines · ", strong: "28%", post: " in hand by turn 8", n: 4,
      reading: "A 28% chance that every piece of at least one line is in hand by turn 8: an opening seven, then a card a turn on the play. A tutor in hand stands in for one missing piece. Mana isn't counted.",
      note: "Each line is named by what it produces. A loop with no way to end it can draw the game.",
      combos: [
        { pieces: ["Marauding Raptor", "Polyraptor"], produces: ["Infinite creature tokens", "Infinite enrage triggers"], odds: "14%", tutors: "Worldly Tutor · Congregation at Dawn" },
        { pieces: ["Terror of the Peaks", "Polyraptor"], produces: ["Infinite creature tokens", "Infinite damage"], odds: "12%", tutors: "Worldly Tutor · Congregation at Dawn" },
        { pieces: ["Forerunner of the Empire", "Polyraptor"], produces: ["Infinite creature tokens", "Infinite damage to each creature"], odds: "6%", tutors: "Worldly Tutor · Congregation at Dawn" },
        { pieces: ["Wrathful Raptors", "Polyraptor", "Marauding Raptor"], produces: ["Infinite damage"], odds: "4%", tutors: "Congregation at Dawn" },
      ],
    },
    deps: [D("creatures", "light", "", "18", " cards that pay off on creatures", 18)],
  },
  elves: {
    deckName: "HD - Elves", commander: "Lathril, Blade of the Elves", cards: 99,
    velocity: { step: 5, pre: "Early ramp ", strong: "15.5", post: " · average spell 2.53 mana", n: 19 },
    flow: {
      step: 2, pre: "", strong: "2", post: " repeating engines, 3 one-time draws", n: 5,
      reading: "7 points from 5 cards. A card that draws again and again counts 2, a one-time draw counts 1, and your commander's own draw counts double. Draws that go to opponents don't count.",
      note: "", link: "Built on Jobs in Deck stats",
      groups: [{ head: "Counted", rows: [R("Guardian Project", "draws again and again", "+2"), R("Sylvan Library", "draws again and again", "+2"), R("Elvish Visionary", "one-time draw", "+1"), R("Harmonize", "one-time draw", "+1"), R("Return of the Wildspeaker", "one-time draw", "+1")] }],
    },
    interaction: { step: 1, pre: "8 answers · ", strong: "0 cheap and instant", post: "", n: 8 },
    win: { combo: false },
    deps: [
      D("creatures", "heavy", "", "20", " cards that pay off on creatures", 20),
      D("activated", "heavy", "", "23", " creatures with abilities, your commander among them", 23),
      D("combat", "heavy", "", "No way", " to win outside combat", 0),
    ],
  },
  sultai: {
    deckName: "HD Tune - Sultai Arisen", commander: "Teval, the Balanced Scale", cards: 99,
    velocity: { step: 3, pre: "Early ramp ", strong: "9", post: " · average spell 3.29 mana", n: 11 },
    flow: { step: 3, pre: "", strong: "3", post: " repeating engines, 7 one-time draws", n: 10 },
    interaction: { step: 2, pre: "8 answers · ", strong: "2 cheap and instant", post: "", n: 8 },
    win: { combo: false },
    deps: [D("graveyard", "heavy", "", "30", " cards use the graveyard, your commander among them", 30)],
    depLedger: {
      graveyard: {
        reading: "30 cards use the graveyard, and your commander is one of them. A card counts when it brings cards back, fills your own graveyard, grows with cards there, or has a keyword that plays from it.",
        note: "Lands that use the graveyard aren't counted: Cephalid Coliseum, Memorial to Folly.",
        groups: [{ head: "Uses the graveyard", rows: [R("Teval, the Balanced Scale", "commander · fills the graveyard, brings cards back"), R("Satyr Wayfinder", "fills the graveyard"), R("Stitcher's Supplier", "fills the graveyard"), R("Grisly Salvage", "fills the graveyard"), R("Mulch", "fills the graveyard"), R("Sidisi, Brood Tyrant", "fills the graveyard"), R("Underrealm Lich", "fills the graveyard"), R("Deadbridge Chant", "fills the graveyard, brings cards back"), R("World Shaper", "fills the graveyard, brings cards back"), R("Perpetual Timepiece", "fills the graveyard, brings cards back"), R("Eternal Witness", "brings cards back"), R("Animate Dead", "brings cards back"), R("Reanimate", "brings cards back"), R("Ramunap Excavator", "brings cards back"), R("Crucible of Worlds", "brings cards back"), R("Splendid Reclamation", "brings cards back"), R("Liliana, Death's Majesty", "brings cards back"), R("Muldrotha, the Gravetide", "brings cards back"), R("Phyrexian Reclamation", "brings cards back"), R("Gravecrawler", "brings cards back"), R("Dread Return", "brings cards back, flashback"), R("Life from the Loam", "brings cards back, dredge"), R("Golgari Thug", "dredge"), R("Stinkweed Imp", "dredge"), R("Hooting Mandrills", "delve"), R("Gurmag Angler", "delve"), R("Tasigur, the Golden Fang", "delve"), R("Treasure Cruise", "delve"), R("Dig Through Time", "delve"), R("Lord of Extinction", "grows with cards in graveyards")] }],
      },
    },
  },
  counter: {
    deckName: "HD Tune - Counter Intelligence", commander: "Inspirit, Flagship Vessel", cards: 99,
    velocity: { step: 4, pre: "Early ramp ", strong: "9.5", post: " · average spell 2.77 mana", n: 12 },
    flow: { step: 3, pre: "", strong: "5", post: " repeating engines, 6 one-time draws", n: 11 },
    interaction: { step: 3, pre: "12 answers · ", strong: "5 cheap and instant", post: "", n: 12 },
    win: { combo: true, step: 4, pre: "17 lines · ", strong: "29%", post: " in hand by turn 8", n: 17 },
    deps: [D("artifacts", "heavy", "", "37", " artifacts, 15 cards that pay off on them, 21 with abilities", 37)],
    depLedger: {
      artifacts: {
        reading: "37 artifacts, 15 cards that pay off on them, and 21 artifacts with abilities. Artifact wipes take the artifacts and leave the payoffs with nothing. Null Rod and Collector Ouphe leave the artifacts in play but stop their abilities.",
        note: "A card is listed once, under its first group.",
        groups: [
          { head: "Pays off on artifacts", rows: [R("Inspirit, Flagship Vessel", "commander · puts counters on another artifact"), R("Urza, Lord High Artificer", "for each artifact"), R("Steel Overseer", "artifact creatures you control"), R("Kappa Cannoneer", "whenever an artifact enters"), R("Sai, Master Thopterist", "whenever you cast an artifact spell"), R("Efficient Construction", "whenever you cast an artifact spell"), R("Reckless Fireweaver", "whenever an artifact enters"), R("Etherium Sculptor", "artifact spells cost less"), R("Thought Monitor", "affinity for artifacts"), R("Emry, Lurker of the Loch", "costs less for each artifact"), R("Lux Artillery", "whenever you cast an artifact creature spell"), R("Cyberdrive Awakener", "artifacts you control"), R("Galvanic Blast", "metalcraft"), R("Cranial Plating", "for each artifact"), R("Thopter Spy Network", "artifacts you control")] },
          { head: "Artifacts with abilities", rows: [R("Sol Ring", "mana ability"), R("Arcane Signet", "mana ability"), R("Everflowing Chalice", "mana ability"), R("Pentad Prism", "mana ability"), R("Astral Cornucopia", "mana ability"), R("Golem Foundry", "makes a creature"), R("Insight Engine", "draws"), R("Lux Cannon", "destroys a permanent"), R("Soul-Guide Lantern", "exiles a graveyard"), R("Titan Forge", "makes a creature"), R("Gavel of the Righteous", "equip"), R("Hangarback Walker", "grows"), R("Patrolling Peacemaker", "grows"), R("Mindless Automaton", "draws"), R("Moxite Refinery", "moves counters")] },
          { head: "Other artifacts", rows: [R("Darksteel Reactor", "artifact"), R("Cloud Key", "artifact"), R("Uthros Research Craft", "artifact"), R("Phyrexian Metamorph", "artifact creature"), R("Etched Oracle", "artifact creature"), R("Threefold Thunderhulk", "artifact creature"), R("Kilo, Apogee Mind", "artifact creature"), R("Coretapper", "artifact creature"), R("Crystalline Crawler", "artifact creature"), R("Long-Range Sensor", "artifact"), R("Solar Array", "artifact")] },
        ],
      },
    },
  },
  scrappy: {
    deckName: "HD Tune - Scrappy Survivors", commander: "Dogmeat, Ever Loyal", cards: 99,
    velocity: { step: 3, pre: "Early ramp ", strong: "6.5", post: " · average spell 2.97 mana", n: 9 },
    flow: { step: 4, pre: "", strong: "6", post: " repeating engines, 8 one-time draws", n: 14 },
    interaction: { step: 1, pre: "6 answers · ", strong: "0 cheap and instant", post: "", n: 6 },
    win: { combo: false },
    deps: [
      D("graveyard", "heavy", "", "13", " cards use the graveyard, your commander among them", 13),
      D("enchantments", "heavy", "", "26", " enchantments, 9 cards that pay off on them", 26),
      D("creatures", "light", "", "17", " cards that pay off on creatures", 17),
      D("combat", "heavy", "", "No way", " to win outside combat", 0),
    ],
  },
  thorin: {
    deckName: "HD -Thorin", commander: "Thorin, King of Durin's Folk", cards: 99,
    velocity: { step: 4, pre: "Early ramp ", strong: "10", post: " · average spell 2.8 mana", n: 13 },
    flow: { step: 3, pre: "", strong: "3", post: " repeating engines, 7 one-time draws", n: 10 },
    interaction: { step: 3, pre: "15 answers · ", strong: "5 cheap and instant", post: "", n: 15 },
    win: { combo: false },
    deps: [
      D("creatures", "heavy", "", "25", " cards that pay off on creatures", 25),
      D("artifacts", "light", "", "20", " artifacts, 2 cards that pay off on them", 20),
      D("combat", "light", "Only ", "2", " ways to win outside combat", 2),
    ],
    depLedger: {
      combat: {
        reading: "Two cards win without attacking. Every other route runs through combat, so fogs, Propaganda and Ghostly Prison slow this deck most. A card counts when it drains, poisons or mills opponents again and again, wins or makes someone lose outright, or completes a combo.",
        note: "A one-time burn spell is reach, not a route, so it isn't listed.",
        groups: [{ head: "Wins outside combat", rows: [R("Revel in Riches", "you win the game"), R("Mechanized Production", "you win the game")] }],
      },
    },
  },
  soldiers: {
    deckName: "HD - Soldiers", commander: "Myrel, Shield of Argive", cards: 99,
    velocity: { step: 3, pre: "Early ramp ", strong: "5.5", post: " · average spell 2.69 mana", n: 8 },
    flow: { step: 1, pre: "", strong: "1", post: " repeating engine, 3 one-time draws", n: 4 },
    interaction: { step: 3, pre: "12 answers · ", strong: "5 cheap and instant", post: "", n: 12 },
    win: { combo: false },
    deps: [
      D("combat", "heavy", "", "No way", " to win outside combat", 0),
      D("creatures", "light", "", "18", " cards that pay off on creatures", 18),
    ],
  },
  wizards: {
    deckName: "HD - Wizards", commander: "Inalla, Archmage Ritualist", cards: 99,
    velocity: { step: 3, pre: "Early ramp ", strong: "5.75", post: " · average spell 2.53 mana", n: 8 },
    flow: { step: 5, pre: "", strong: "12", post: " repeating engines, 9 one-time draws", n: 21 },
    interaction: { step: 5, pre: "23 answers · ", strong: "10 cheap and instant", post: "", n: 23 },
    win: { combo: true, step: 2, pre: "2 lines · ", strong: "14%", post: " in hand by turn 8", n: 2 },
    deps: [],
  },
  tiny: { deckName: "Untitled deck", commander: "a list in progress", cards: 41, tiny: true, deps: [] },
  low: {
    deckName: "Constructed fixture", commander: "every benchmark at its lowest step", cards: 99,
    velocity: { step: 1, pre: "Early ramp ", strong: "3", post: " · average spell 3.4 mana", n: 4 },
    flow: { step: 1, pre: "", strong: "0", post: " repeating engines, 4 one-time draws", n: 4 },
    interaction: { step: 1, pre: "6 answers · ", strong: "0 cheap and instant", post: "", n: 6 },
    win: { combo: true, step: 1, pre: "1 line · ", strong: "2%", post: " in hand by turn 8", n: 1 },
    deps: [],
  },
};

export const DEP_ORDER = ["graveyard", "artifacts", "enchantments", "creatures", "activated", "combat"];
export function deckData(id) { return DECKS[id] || DECKS.gishath; }
