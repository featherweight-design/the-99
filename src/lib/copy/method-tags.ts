// The five ways an answer is reached, drawn as small outlined words on the deck page's and the Rule 0 table's
// "How we make these decisions" sheet (Hugh, 2026-09-28: five methods). All five are drawn identically on purpose:
// coloring them by trust would be a score. Moved here from About's retired How it works appendix (About visual PR 7a).
export type Method = 'rules' | 'decks' | 'model' | 'you' | 'list';

export const methodTagsCopy = {
  methods: {
    rules: { tag: 'rules text' },
    decks: { tag: 'other decks' },
    model: { tag: 'model-written' },
    you: { tag: 'your input' },
    list: { tag: 'published list' },
  },
  /**
   * Which methods each bracket count uses, read by the decisions sheet. Land denial and extra turns combine Commander
   * Spellbook's estimate with our reading of the rules text (`MLD_DETECTION.methods`, `EXTRA_TURN_DETECTION.methods`);
   * combos are Spellbook's index alone; Game Changers is Wizards' list, read through Scryfall.
   */
  bracketMethods: {
    gameChangers: ['list'],
    landDenial: ['rules', 'decks'],
    extraTurns: ['rules', 'decks'],
    combos: ['decks'],
    tutors: ['rules'],
  },
} as const satisfies {
  methods: Record<Method, { tag: string }>;
  bracketMethods: Record<string, readonly Method[]>;
};
