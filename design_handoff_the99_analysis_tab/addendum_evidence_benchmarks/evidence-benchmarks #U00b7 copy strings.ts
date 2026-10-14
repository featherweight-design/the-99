// Evidence benchmarks (priority 4c) · copy strings · R2 (Dependencies).
// EVERY STRING IS A PLACEHOLDER owed to /copy-review, including each benchmark's name, the
// five step words, the row names, the strength words and every hate list. US English, no em
// dashes. Proposed module: src/lib/copy/deck-benchmarks.ts. No string mentions labels.

export const deckBenchmarksCopy = {
  // The block (Analysis tab, last in the reading, under "What is in this deck")
  heading: 'How it plays', // PLACEHOLDER
  caption: 'Graded on one scale for every Commander deck. Nothing here moves your bracket.', // PLACEHOLDER
  captionStale: (date: string) => `Graded with the bracket on ${date}, before your changes.`, // PLACEHOLDER; date as the bracket box's stale line

  // The four graded benchmarks
  names: {
    velocity: 'Mana velocity', // PLACEHOLDER
    flow: 'Card flow', // PLACEHOLDER
    interaction: 'Interaction', // PLACEHOLDER
    win: 'Win speed', // PLACEHOLDER
  },
  steps: ['Low', 'Modest', 'Typical', 'High', 'Top'], // PLACEHOLDER ×5 (steps 1..5)
  stepAria: (name: string, word: string, step: number) => `${name}: ${word}, step ${step} of 5`, // PLACEHOLDER (screen readers)

  // Tile figure lines: [before, bold run, after]
  figure: {
    velocity: (ramp: string, avgMv: string) => ['Early ramp ', ramp, ` · average spell ${avgMv} mana`], // PLACEHOLDER
    flow: (engines: number, oneShots: number) => ['', String(engines), ` repeating ${engines === 1 ? 'engine' : 'engines'}, ${oneShots} one-time draws`], // PLACEHOLDER
    interaction: (answers: number, cheapInstant: number) => [`${answers} answers · `, `${cheapInstant} cheap and instant`, ''], // PLACEHOLDER
    win: (lines: number, odds: string) => [`${lines} ${lines === 1 ? 'line' : 'lines'} · `, odds, ' in hand by turn 8'], // PLACEHOLDER
  },
  open: (n: number) => (n === 1 ? 'see the card' : `see the ${n} cards`), // PLACEHOLDER (mirrors findings.open)
  openCombo: (n: number) => (n === 1 ? 'see the line' : `see the ${n} lines`), // PLACEHOLDER
  openAria: (name: string, word: string) => `${name}, ${word}: see the cards behind it`, // PLACEHOLDER

  // Win speed without a counted combo
  noCombo: 'No combo line', // PLACEHOLDER
  noComboLine: "This deck wins through combat. Timing that takes a test game, which we don't run yet.", // PLACEHOLDER

  // Dependencies: a list of risks, never graded
  deps: {
    name: 'Dependencies', // PLACEHOLDER
    // R3: no kicker chip. The explanation lives in the InfoTip beside the name.
    tip: "What an opponent's cards could take away from this deck. A risk to know about, never a score.", // PLACEHOLDER
    tipAria: 'About dependencies', // PLACEHOLDER
    strength: { heavy: 'Heavy', light: 'Light' }, // PLACEHOLDER ×2
    brokenBy: 'Broken by', // PLACEHOLDER
    rows: {
      graveyard: 'Graveyard', // PLACEHOLDER
      artifacts: 'Artifacts', // PLACEHOLDER
      enchantments: 'Enchantments', // PLACEHOLDER
      creatures: 'Creatures', // PLACEHOLDER
      activated: 'Activated abilities', // PLACEHOLDER
      combat: 'Combat', // PLACEHOLDER
    },
    // Fixed per row, in code, never generated (brief lock 5)
    hate: {
      graveyard: 'Rest in Peace, Bojuka Bog, Dauthi Voidwalker', // PLACEHOLDER
      artifacts: 'Artifact wipes such as Vandalblast. Null Rod and Collector Ouphe stop the abilities.', // PLACEHOLDER
      enchantments: 'Enchantment wipes such as Back to Nature and Farewell', // PLACEHOLDER
      creatures: 'Creature board wipes', // PLACEHOLDER
      activated: 'Cursed Totem', // PLACEHOLDER
      combat: 'Fogs, Propaganda, Ghostly Prison', // PLACEHOLDER
    },
    figure: {
      graveyard: (n: number, commander: boolean) => ['', String(n), ` cards use the graveyard${commander ? ', your commander among them' : ''}`], // PLACEHOLDER
      artifacts: (artifacts: number, payoffs: number, activated: number) => ['', String(artifacts), ` artifacts, ${payoffs} cards that pay off on them${activated ? `, ${activated} with abilities` : ''}`], // PLACEHOLDER
      enchantments: (enchantments: number, payoffs: number) => ['', String(enchantments), ` enchantments, ${payoffs} cards that pay off on them`], // PLACEHOLDER
      creatures: (payoffs: number) => ['', String(payoffs), ' cards that pay off on creatures'], // PLACEHOLDER
      activated: (n: number, commander: boolean) => ['', String(n), ` creatures with abilities${commander ? ', your commander among them' : ''}`], // PLACEHOLDER
      combat: (routes: number) => (routes === 0 ? ['', 'No way', ' to win outside combat'] : ['Only ', String(routes), ` ${routes === 1 ? 'way' : 'ways'} to win outside combat`]), // PLACEHOLDER
    },
    rowAria: (row: string, strength: string) => `${row}, ${strength} dependency`, // PLACEHOLDER
    noneHead: 'No single thing this deck leans on reaches our list.', // PLACEHOLDER
    noneLine: "That isn't protection. Board wipes and other answers still hit whatever is on the battlefield; nothing here is concentrated enough to name.", // PLACEHOLDER
    checked: 'Checked: graveyard · artifacts · enchantments · creatures · activated abilities · combat', // PLACEHOLDER
  },

  // Tiny list
  tinyHead: (n: number, min: number) => `Grades start at ${min} cards. This list has ${n}.`, // PLACEHOLDER
  tinyLine: "The bracket above is read from what's here. Benchmarks wait for a fuller list.", // PLACEHOLDER

  // The ledger (ModalChrome 760). Graded: title = names[k], aside = the step word.
  // Dependency: title = ledgerTitle(row), aside = the strength tag.
  ledger: {
    closeAria: (name: string) => `Close ${name}`, // PLACEHOLDER
    ledgerTitle: (row: string) => `Dependencies · ${row}`, // PLACEHOLDER
    counted: 'Counted', // PLACEHOLDER
    readNotCounted: 'Read, not counted', // PLACEHOLDER
    linkCurve: 'Built on Curve in Deck stats', // PLACEHOLDER
    linkJobs: 'Built on Jobs in Deck stats', // PLACEHOLDER
    expectedTurn: (commander: string, turn: number) => `${commander} is expected on turn ${turn}.`, // PLACEHOLDER
    byT8: 'in hand by turn 8', // PLACEHOLDER
    foundBy: 'Found by', // PLACEHOLDER
    spellbook: 'Commander Spellbook', // reused: copy.receipt.spellbook
    onceNote: 'A card is listed once, under its first group.', // PLACEHOLDER
    landsLeftOut: (names: string) => `Lands that use the graveyard aren't counted: ${names}.`, // PLACEHOLDER (pending the plan's scope call)
    reachNote: "A one-time burn spell is reach, not a route, so it isn't listed.", // PLACEHOLDER
    groups: {
      usesGraveyard: 'Uses the graveyard', // PLACEHOLDER
      paysOffArtifacts: 'Pays off on artifacts', // PLACEHOLDER
      artifactAbilities: 'Artifacts with abilities', // PLACEHOLDER
      otherArtifacts: 'Other artifacts', // PLACEHOLDER
      paysOffEnchantments: 'Pays off on enchantments', // PLACEHOLDER
      otherEnchantments: 'Other enchantments', // PLACEHOLDER
      paysOffCreatures: 'Pays off on creatures', // PLACEHOLDER
      activatedCreatures: 'Creatures with abilities', // PLACEHOLDER
      winsOutsideCombat: 'Wins outside combat', // PLACEHOLDER
    },
    readings: {
      velocity: (lands: number, ramp: string, avgMv: string) =>
        `${lands} lands and ${ramp} points of early ramp, set against an average spell of ${avgMv} mana. Ramp counts in full at 2 mana or less and half at 3, and a one-time burst counts half again.`, // PLACEHOLDER
      flow: (pts: number, cards: number) =>
        `${pts} points from ${cards} cards. A card that draws again and again counts 2, a one-time draw counts 1, and your commander's own draw counts double. Draws that go to opponents don't count.`, // PLACEHOLDER
      interaction: (answers: number, cheapInstant: number) =>
        `${answers} answers, ${cheapInstant === 0 ? 'and none is' : `${cheapInstant} of them`} cheap and instant. Each counts 1, plus 1 at instant speed or with flash, plus 1 at 2 mana or less. Counterspells count here; removal is what answers a card already on the battlefield.`, // PLACEHOLDER
      win: (odds: string) =>
        `A ${odds} chance that every piece of at least one line is in hand by turn 8: an opening seven, then a card a turn on the play. A tutor in hand stands in for one missing piece. Mana isn't counted.`, // PLACEHOLDER
      winNote: 'Each line is named by what it produces. A loop with no way to end it can draw the game.', // PLACEHOLDER
      graveyard: (n: number, commander: boolean) =>
        `${n} cards use the graveyard${commander ? ', and your commander is one of them' : ''}. A card counts when it brings cards back, fills your own graveyard, grows with cards there, or has a keyword that plays from it.`, // PLACEHOLDER
      artifacts: (a: number, p: number, act: number) =>
        `${a} artifacts, ${p} cards that pay off on them, and ${act} artifacts with abilities. Artifact wipes take the artifacts and leave the payoffs with nothing. Null Rod and Collector Ouphe leave the artifacts in play but stop their abilities.`, // PLACEHOLDER
      enchantments: (e: number, p: number) =>
        `${e} enchantments and ${p} cards that pay off on them. An enchantment wipe takes the enchantments and leaves the payoffs with nothing.`, // PLACEHOLDER
      creatures: (p: number) =>
        `${p} cards pay off on your creatures: lords, anthems, and token makers that work again and again. A creature board wipe takes the bodies and the payoffs together.`, // PLACEHOLDER
      activated: (n: number) =>
        `${n} creatures do their work through an activated ability, such as mana creatures. Cursed Totem turns all of them off at once.`, // PLACEHOLDER
      combat: (routes: number) =>
        `${routes === 1 ? 'One card wins' : `${routes} cards win`} without attacking. Every other route runs through combat. A card counts when it drains, poisons or mills opponents again and again, wins or makes someone lose outright, or completes a combo.`, // PLACEHOLDER
    },
    why: {
      speedCost: (kind: string, mv: number) => `${kind}, ${mv} mana`, // PLACEHOLDER e.g. "instant, 1 mana"
      counterspell: (mv: number) => `counterspell, instant, ${mv} mana`, // PLACEHOLDER
      wipe: (kind: string, mv: number) => `${kind}, ${mv} mana, wipe`, // PLACEHOLDER
      landOut: (mv: number) => `land onto the battlefield, ${mv} mana`, // PLACEHOLDER
      burst: (mv: number) => `one-time burst, ${mv} mana`, // PLACEHOLDER
      costReduction: 'cost reduction', // PLACEHOLDER
      tooLate: (mv: number) => `ramp, ${mv} mana: too late to count`, // PLACEHOLDER
      repeatable: 'draws again and again', // PLACEHOLDER
      oneShot: 'one-time draw', // PLACEHOLDER
      commanderPrefix: 'commander · ', // PLACEHOLDER
      graveyard: { fills: 'fills the graveyard', returns: 'brings cards back', grows: 'grows with cards in graveyards' }, // PLACEHOLDER; keywords print as their rules name
      winsOutright: 'you win the game', // PLACEHOLDER
    },
  },
} as const;

// About entry · chapter 03, after 'deck-analysis'. `since` is the bump at the evidence line's
// close (batched with the Overview claim tap-through). Every string PLACEHOLDER.
export const benchmarksAboutEntry = {
  id: 'deck-benchmarks',
  chapter: '03',
  title: 'How it plays',
  route: '/decks',
  opens: 'opens the Analysis tab',
  width: 'plate',
  caption:
    "Under the bracket reading, the Analysis tab grades how a deck plays: how fast its mana comes, how many cards it draws, how quickly and cheaply it answers threats, and how soon a combo could come together. Then it lists what the deck depends on that an opponent could break. Everything is worked out from your list and the cards’ own rules, with nothing generated, so the same list always reads the same.",
  keys: [
    'Mana velocity, card flow and interaction each sit on one of five steps, on a scale shared by every Commander deck. There’s no total.',
    'Win speed is graded only when the deck can assemble a combo. Otherwise it says there’s no combo line, which isn’t a low grade.',
    'Dependencies lists what the deck leans on, Heavy or Light, and the cards that break it. It’s a risk to know about, never a score, and an empty list doesn’t mean the deck is safe.',
    'Every grade and every dependency opens the cards behind it. The block is part of the reading, so it goes out of date with it.',
  ],
  since: 'ABOUT_VERSION at the evidence line close',
} as const;
