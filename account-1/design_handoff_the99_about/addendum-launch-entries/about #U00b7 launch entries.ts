// About · launch entries (addendum to R6). Proposed additions to `src/lib/copy/about.ts`.
// One bump: ABOUT_VERSION 9 → 10, and every entry below is `since: 10`.
// Insert each entry at the position named in its `// after` comment. Page order decides the sheet's
// and the index's order (R6 §N1, §O1).

export const launchEntries = [
  // chapter 02 · after 'discover'
  {
    id: 'help-me-choose',
    chapter: '02',
    title: 'Help me choose',
    route: '/decks/new/choose',
    width: 'plate',
    caption:
      'For a deck you want but have no commander for. Answer as much or as little as you like: colors, a theme, a budget, a bracket, a card to build around, or a sentence in your own words. The results are commanders ordered by how well each fits what you asked, not by what you own, and picking one creates the deck and fills it under the same answers.',
    keys: [
      "Each figure is a share of that commander's decks: the share tagged with your theme, or the share that runs your card. The weakest figure orders the row and is marked SETS RANK.",
      "What you own is shown on the row but never orders it: the commander's own mark, how much of its 99 you own, and roughly what the rest would cost.",
      "Your sentence is matched for free. A closer read of what's left costs one credit, and the form says so before you spend it.",
      'When too few commanders fit, the page names the answer that rules out the most, so you can loosen it yourself.',
    ],
    since: 10,
  },
  // chapter 03 · after 'decklist-marks'
  {
    id: 'locked-cards',
    chapter: '03',
    title: 'Locked cards',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      "Lock a card and no tool will offer to cut it. Suggested changes won't propose it, cheaper stand-ins skip it, and clearing the fill's auto cards leaves it in place. The ✕ still removes it: a lock binds the app's suggestions, not you. Lock cards, in the deck's toolbar, turns every row's ✕ into a lock until you press Done.",
    keys: [
      'A locked card shows the lock after its name, in the list and on its tile. Nothing else about the row changes.',
      'Lock cards turns each ✕ into a lock until you press Done. It is how you lock a card from a phone or a keyboard.',
      'Clear all auto skips locked cards and says how many stayed. Pull it never takes a copy from a deck where the card is locked.',
      'Remove a locked card, then press Undo or Put back, and it comes back locked. Any other way back, including a discard, returns it unlocked.',
    ],
    since: 10,
  },
  // chapter 03 · after 'add-cards'
  {
    id: 'fits-your-decks',
    chapter: '03',
    title: 'Find a deck for it',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'plate',
    caption:
      "A card can belong in a deck you haven't thought of. Find a deck for it, in any card's details, lists the decks you could add it to without breaking their colors. Each deck shows two facts side by side: how often that commander's decks run the card, and where the deck stands on the job the card does. Decks that already hold it are listed after, and Add puts it in the chosen deck's draft.",
    keys: [
      "Only decks whose colors allow the card, and that don't already run it, are offered.",
      "The commander fact is how often that commander's decks run the card. A staple that every deck runs says staple instead.",
      "The deck fact is this deck's count for the card's role against its target. It is left out when the card has no role or the target isn't measured.",
      'The two facts sit side by side and are never added into a score. Add uses a free copy if you have one. Otherwise the card joins as one to buy.',
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
      "Some cards Shopping asks you to buy cost more than the job they do. A limit per card marks those rows, and a marked row's ⇄ opens cheaper cards that do the same job, with copies you already own listed first. Nothing is picked for you. Each stand-in shows its price and what it gives up, and taking one is an ordinary draft change you can undo.",
    keys: [
      "The line under the price strip is this deck's limit per card. Until you set your own, it says it is the default.",
      "A row over the limit is marked, and its ⇄ opens the stand-ins. Every card's stand-ins are also linked from its details.",
      "Stand-ins do the same job for less, with your free copies first, and each says what it gives up. A card whose job we can't read gets no stand-ins.",
      'Take swaps the stand-in into the draft, and Undo swap puts both cards back. A locked card is never offered stand-ins.',
    ],
    since: 10,
  },
  // chapter 03 · after 'new-deck'
  {
    id: 'change-commander',
    chapter: '03',
    title: 'Change commander',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      "Like the 99 but not the leader? Change commander, on the commander's art, lists every commander in exactly this deck's colors, or every pair for a pair deck, with the ones you own first. Each carries one figure: how many of this deck's cards its own decks run. Choosing one is a draft change like any other. It waits in pending changes, and Discard puts the old commander back.",
    keys: [
      "Only commanders in exactly this deck's colors are offered, and only pairs for a pair deck, so not one card of the 99 changes.",
      "The figure counts this deck's cards that the candidate's decks run, leaving out basic lands and the staples every deck runs. Press it to see which cards.",
      'Candidates you own come first, marked free or held, and the rest carry a price. Mana value is shown beside each but never sets the order.',
      'When a candidate is already in the 99, it moves to the command zone and the commander it replaces takes its slot, so the deck stays whole.',
    ],
    since: 10,
  },
] as const;
