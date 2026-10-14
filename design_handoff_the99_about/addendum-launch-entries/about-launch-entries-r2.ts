// About · launch entries, r2 (2026-09-25). Revises two entries in `about · launch entries.ts`
// to describe the rebuilt swap-tools ranking. Replace those two objects in place. Ids, chapters,
// positions, routes and `since` are unchanged. The other three entries are untouched.

export const revisedLaunchEntries = [
  // chapter 03 · after 'add-cards'
  {
    id: 'fits-your-decks',
    chapter: '03',
    title: 'Find a deck for it',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'plate',
    caption:
      "A card can belong in a deck you haven't thought of. Find a deck for it, in any card's details, lists the decks you could add it to without breaking their colors. The deck whose commander suits the card best comes first. Each deck gives one reason: a combo the card would complete with cards already in that deck, or the theme it would join. Decks that already hold it are listed after, and Add puts it in the chosen deck's draft.",
    keys: [
      "Only decks whose colors allow the card, and that don't already run it, are offered.",
      "Decks are ordered by synergy: how much more often that commander's decks run the card than other decks in the same colors. How many decks run it doesn't set the order.",
      'Each deck gives its strongest reason. A combo the card completes with that deck\'s own cards comes first, then the theme it joins. With neither, the deck shows the two shares it was ordered by. A staple that every deck runs says staple instead.',
      "After the reason comes this deck's count for the card's role against its target, left out when there's no role. Add uses a free copy if you have one. Otherwise the card joins as one to buy.",
    ],
    since: 10,
  },
  // chapter 03 · after 'shopping'
  {
    id: 'stand-ins',
    chapter: '03',
    title: 'Cheaper stand-ins',
    route: '/decks',
    opens: 'opens the shopping roll-up',
    width: 'plate',
    caption:
      "Some cards Shopping asks you to buy cost more than the job they do. A limit per card marks those rows, and a marked row's ⇄ opens cheaper cards that do the same job. Cards of the same type come first, then other types, each led by what suits this commander. A land's stand-ins say what they make and whether they come in untapped, best mana first. Nothing is picked for you, and taking one is an ordinary draft change you can undo.",
    keys: [
      'The line under the price strip is this deck\'s limit per card. Until you set your own, it says it is the default.',
      "A row over the limit is marked, and its ⇄ opens the stand-ins. Every card's stand-ins are also linked from its details.",
      "A stand-in does every job the card does. Cards of the same type come first, a creature for a creature, then other types. Each group is led by the cards this commander's decks favor, and shows a few until you ask for all.",
      "A land's stand-ins say which colors they make and whether they come in untapped. Untapped comes first, then tapped, then lands that make a color only once, which doesn't count as making it. Each says what it gives up.",
    ],
    since: 10,
  },
] as const;
