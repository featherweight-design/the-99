/**
 * Evidence benchmarks (plan `2026-10-10-evidence-benchmarks.md`), from the handoff’s copy file
 * (`design/design_handoff_the99_analysis_tab/addendum_evidence_benchmarks/`) after its /copy-review
 * pass. Changes from the handoff, each from the readiness audit:
 * - `noComboLine` no longer says the deck "wins through combat": a deck with no combo can still win
 *   another way (Thorin, Sultai Arisen), and the combat row says whether it does;
 * - About key 4 says the cards open "where there are any" (no combo and Combat Heavy draw none);
 * - the tiny-list strings are gone: a reading needs a whole deck, so the state cannot occur;
 * - apostrophes are typographic.
 * No string mentions labels; a counterspell is interaction; Dependencies is a risk, never a score.
 */

/** A count's noun, singular at 1. */
const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export const deckBenchmarksCopy = {
  // The block (Analysis tab, last in the reading, under "What is in this deck")
  heading: 'How it plays',
  caption: 'Graded on one scale for every Commander deck. Nothing here moves your bracket.',
  captionStale: (date: string) => `Graded with the bracket on ${date}, before your changes.`,

  // The four graded benchmarks
  names: {
    velocity: 'Mana velocity',
    flow: 'Card flow',
    interaction: 'Interaction',
    win: 'Win speed',
  },
  steps: ['Low', 'Modest', 'Typical', 'High', 'Top'],
  stepAria: (name: string, word: string, step: number) => `${name}: ${word}, step ${step} of 5`,

  // Tile figure lines: [before, bold run, after]
  figure: {
    velocity: (ramp: string, avgMv: string) => ['Early ramp ', ramp, ` · average spell ${avgMv} mana`],
    flow: (engines: number, oneShots: number) => ['', String(engines), ` repeating ${engines === 1 ? 'engine' : 'engines'}, ${n(oneShots, 'one-time draw', 'one-time draws')}`],
    interaction: (answers: number, cheapInstant: number) => [`${n(answers, 'answer', 'answers')} · `, `${cheapInstant} cheap and instant`, ''],
    win: (lines: number, odds: string) => [`${lines} ${lines === 1 ? 'line' : 'lines'} · `, odds, ' in hand by turn 8'],
  },
  open: (n: number) => (n === 1 ? 'see the card' : `see the ${n} cards`),
  openCombo: (n: number) => (n === 1 ? 'see the line' : `see the ${n} lines`),
  openAria: (name: string, word: string) => `${name}, ${word}: see the cards behind it`,

  // Win speed without a counted combo
  noCombo: 'No combo line',
  noComboLine: "Nothing in this list puts a combo together. Timing a win without one takes a test game, which we don’t run yet.",

  // Dependencies: a list of risks, never graded
  deps: {
    name: 'Dependencies',
    // R3: no kicker chip. The explanation lives in the InfoTip beside the name.
    tip: "What an opponent’s cards could take away from this deck. A risk to know about, never a score.",
    tipAria: 'About dependencies',
    strength: { heavy: 'Heavy', light: 'Light' },
    brokenBy: 'Broken by',
    rows: {
      graveyard: 'Graveyard',
      artifacts: 'Artifacts',
      enchantments: 'Enchantments',
      creatures: 'Creatures',
      activated: 'Activated abilities',
      combat: 'Combat',
    },
    // Fixed per row, in code, never generated (brief lock 5)
    hate: {
      graveyard: 'Rest in Peace, Bojuka Bog, Dauthi Voidwalker',
      artifacts: 'Artifact wipes such as Vandalblast. Null Rod and Collector Ouphe stop the abilities.',
      enchantments: 'Enchantment wipes such as Back to Nature and Farewell',
      creatures: 'Creature board wipes',
      activated: 'Cursed Totem',
      combat: 'Fogs, Propaganda, Ghostly Prison',
    },
    figure: {
      graveyard: (count: number, commander: boolean) => ['', String(count), ` ${count === 1 ? 'card uses' : 'cards use'} the graveyard${commander ? ', your commander among them' : ''}`],
      artifacts: (artifacts: number, payoffs: number, activated: number) => ['', String(artifacts), ` ${artifacts === 1 ? 'artifact' : 'artifacts'}, ${n(payoffs, 'card that pays off', 'cards that pay off')} on them${activated ? `, ${activated} with abilities` : ''}`],
      enchantments: (enchantments: number, payoffs: number) => ['', String(enchantments), ` ${enchantments === 1 ? 'enchantment' : 'enchantments'}, ${n(payoffs, 'card that pays off', 'cards that pay off')} on them`],
      creatures: (payoffs: number) => ['', String(payoffs), payoffs === 1 ? ' card that pays off on creatures' : ' cards that pay off on creatures'],
      activated: (count: number, commander: boolean) => ['', String(count), ` ${count === 1 ? 'creature' : 'creatures'} with abilities${commander ? ', your commander among them' : ''}`],
      combat: (routes: number) => (routes === 0 ? ['', 'No way', ' to win outside combat'] : ['Only ', String(routes), ` ${routes === 1 ? 'way' : 'ways'} to win outside combat`]),
    },
    rowAria: (row: string, strength: string) => `${row}, ${strength} dependency`,
    noneHead: 'No single thing this deck leans on reaches our list.',
    noneLine: "That isn’t protection. Board wipes and other answers still hit whatever is on the battlefield; nothing here is concentrated enough to name.",
    checked: 'Checked: graveyard · artifacts · enchantments · creatures · activated abilities · combat',
  },


  // The ledger (ModalChrome 760). Graded: title = names[k], aside = the step word.
  // Dependency: title = ledgerTitle(row), aside = the strength tag.
  ledger: {
    closeAria: (name: string) => `Close ${name}`,
    ledgerTitle: (row: string) => `Dependencies · ${row}`,
    counted: 'Counted',
    readNotCounted: 'Read, not counted',
    linkCurve: 'Built on Curve in Deck stats',
    linkJobs: 'Built on Jobs in Deck stats',
    expectedTurn: (commander: string, turn: number) => `${commander} is expected on turn ${turn}.`,
    byT8: 'in hand by turn 8',
    foundBy: 'Found by',
    spellbook: 'Commander Spellbook',
    onceNote: 'A card is listed once, under its first group.',
    landsLeftOut: (names: string) => `Lands that use the graveyard aren’t counted: ${names}.`,
    reachNote: "A one-time burn spell is reach, not a route, so it isn’t listed.",
    groups: {
      usesGraveyard: 'Uses the graveyard',
      paysOffArtifacts: 'Pays off on artifacts',
      artifactAbilities: 'Artifacts with abilities',
      otherArtifacts: 'Other artifacts',
      paysOffEnchantments: 'Pays off on enchantments',
      otherEnchantments: 'Other enchantments',
      paysOffCreatures: 'Pays off on creatures',
      activatedCreatures: 'Creatures with abilities',
      winsOutsideCombat: 'Wins outside combat',
    },
    readings: {
      velocity: (lands: number, ramp: string, avgMv: string) =>
        `${n(lands, 'land', 'lands')} and ${ramp} ${ramp === '1' ? 'point' : 'points'} of early ramp, set against an average spell of ${avgMv} mana. Ramp counts in full at 2 mana or less and half at 3, and a one-time burst counts half again.`,
      flow: (pts: number, cards: number) =>
        `${n(pts, 'point', 'points')} from ${n(cards, 'card', 'cards')}. A card that draws again and again counts 2, a one-time draw counts 1, and your commander’s own draw counts double. Draws that go to opponents don’t count.`,
      interaction: (answers: number, cheapInstant: number) =>
        `${n(answers, 'answer', 'answers')}, ${cheapInstant === 0 ? (answers === 1 ? 'and it isn’t' : 'and none is') : answers === 1 ? 'and it is' : `${cheapInstant} of them`} cheap and instant. Each counts 1, plus 1 at instant speed or with flash, plus 1 at 2 mana or less. Counterspells count here; removal is what answers a card already on the battlefield.`,
      win: (odds: string) =>
        `A ${odds} chance that every piece of at least one line is in hand by turn 8: an opening seven, then a card a turn on the play. A tutor in hand stands in for a missing piece it can find. Mana isn’t counted.`,
      winNote: 'Each line is named by what it produces. A loop with no way to end it can draw the game.',
      graveyard: (count: number, commander: boolean) =>
        `${n(count, 'card uses', 'cards use')} the graveyard${commander ? ', and your commander is one of them' : ''}. A card counts when it brings cards back, fills your own graveyard, grows with cards there, or has a keyword that plays from it.`,
      artifacts: (a: number, p: number, act: number) =>
        `${n(a, 'artifact', 'artifacts')}, ${n(p, 'card that pays off', 'cards that pay off')} on them, and ${n(act, 'artifact', 'artifacts')} with abilities. Artifact wipes take the artifacts and leave the payoffs with nothing. Null Rod and Collector Ouphe leave the artifacts in play but stop their abilities.`,
      enchantments: (e: number, p: number) =>
        `${n(e, 'enchantment', 'enchantments')} and ${n(p, 'card that pays off', 'cards that pay off')} on them. An enchantment wipe takes the enchantments and leaves the payoffs with nothing.`,
      creatures: (p: number) =>
        `${n(p, 'card pays', 'cards pay')} off on your creatures: lords, anthems, and token makers that work again and again. A creature board wipe takes the bodies and the payoffs together.`,
      activated: (count: number) =>
        `${count === 1 ? '1 creature does' : `${count} creatures do`} their work through an activated ability, such as mana creatures. Cursed Totem turns all of them off at once.`,
      combat: (routes: number) =>
        `${routes === 1 ? 'One card wins' : `${routes} cards win`} without attacking. Every other route runs through combat. A card counts when it drains, poisons or mills opponents again and again, wins or makes an opponent lose outright, or completes a combo.`,
    },
    why: {
      speedCost: (kind: string, mv: number) => `${kind}, ${mv} mana`,
      counterspell: (mv: number) => `counterspell, instant, ${mv} mana`,
      wipe: (kind: string, mv: number) => `${kind}, ${mv} mana, wipe`,
      landOut: (mv: number) => `land onto the battlefield, ${mv} mana`,
      burst: (mv: number) => `one-time burst, ${mv} mana`,
      costReduction: 'cost reduction',
      tooLate: (mv: number) => `ramp, ${mv} mana: too late to count`,
      repeatable: 'draws again and again',
      oneShot: 'one-time draw',
      commanderPrefix: 'commander · ',
      graveyard: { fills: 'fills the graveyard', returns: 'brings cards back', grows: 'grows with cards in graveyards' },
      winsOutright: 'you win the game',
    },
  },
} as const;

// About entry · chapter 03, after 'deck-analysis'. `since` is the bump at the evidence line’s
// close (batched with the Overview claim tap-through): ABOUT_VERSION 13. A literal, because
// `about.ts` imports this entry and importing the version back would make the two modules a cycle.
export const benchmarksAboutEntry = {
  id: 'deck-benchmarks',
  chapter: '03',
  title: 'How it plays',
  route: '/decks',
  opens: 'opens the Analysis tab',
  width: 'plate',
  caption:
    "Under the bracket reading, the Analysis tab grades how a deck plays: how fast its mana comes, how many cards it draws, how quickly and cheaply it answers threats, and how soon a combo could come together. Then it lists what the deck depends on that an opponent could break. Everything is worked out from your list and what we know about each card, with nothing written for you on the spot, so reading it costs nothing.",
  keys: [
    'Mana velocity, card flow and interaction each sit on one of five steps, on a scale shared by every Commander deck. There’s no total.',
    'Win speed is graded only when the deck can assemble a combo. Otherwise it says there’s no combo line, which isn’t a low grade.',
    'Dependencies lists what the deck leans on, Heavy or Light, and the cards that break it. It’s a risk to know about, never a score, and an empty list doesn’t mean the deck is safe.',
    'Every grade and every dependency opens the cards behind it, where there are any. The block is part of the reading, so it goes out of date with it.',
  ],
  since: 13,
} as const;
