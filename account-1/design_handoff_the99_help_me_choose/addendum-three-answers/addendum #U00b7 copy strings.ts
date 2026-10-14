// Help me choose — addendum: three answers. Extends helpMeChooseCopy. PLACEHOLDER; owed to /copy-review.

export const helpMeChooseAnswersCopy = {
  themeJoin: {
    all: "All",
    any: "Any",
    aria: "Themes: all or any",
    captionAll: "All of these: a commander has to fit every one.",
    captionAny: "Any of these: a commander fits if it fits one, and ranks by the one it fits best.",
    chipKind: "any of",
    joiner: "or",
    chipAria: (names: string[]) => `Any of ${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`,
    order: "Ordered by the theme each fits best",
    subAny: (names: string) => `You asked for any of ${names}, so each commander ranks by the one it fits best. Every one of them it fits is shown.`,
    widen: (n: number) => `Any of the ${n === 2 ? "two" : n === 3 ? "three" : n === 4 ? "four" : n} themes, not all`,
    widenWhy: (names: string) => `No commander’s decks are more than two of ${names} at once.`,
  },
  sets: {
    label: "Sets",
    // Trigger reuses collectionFilterCopy.set.triggerCount (Set 0 / Set 1 / Sets 2) — #1050.
    caption: "Only commanders printed in one of these. Leave it empty for every set.",
    chipKind: "printed in",
    chipAria: (names: string[]) => `Printed in ${names.join(" or ")}`,
    drop: (codes: string[]) => `Drop ${codes.join(" or ")}`,
  },
  pool: {
    label: "Cards for the 99",
    any: "Any cards",
    own: "Only cards I own",
    captionAny: "Owned or not. The budget caps what you’d buy.",
    captionOwn: "The 99 comes from your collection. The commander can still be one you’d buy, and it’s priced on its own.",
    budgetCaptionOwn: "With the 99 from your cards, this caps the commander only. It never ranks.",
    chipKind: "the 99",
    chipValue: "from cards you own",
    chipTail: "commander owned or not",
    rowCommander: "commander",
    rowLine: (usual: number) => `99 from your cards · ${usual} of its usual 99 are yours`,
    seeded: "the 99 from cards you own",
  },
} as const;
