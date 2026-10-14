// Proposed additions to src/lib/copy/decks-builder.ts, beside `row`.
// Placeholders: /copy-review settles the wording, and the refusal verb.

export const basicStepperCopy = {
  // Each button names the card and the result (brief §Constraints, Screen reader).
  fewerAria: (name: string, after: number) => `Take one ${name} out, ${after} left`,
  moreAria: (name: string, after: number) => `Add one ${name}, ${after} in deck`,
  // At 1 the − slot is the shipped ✕ and uses `row.removeAria` unchanged.
  countAria: (name: string) => `${name}s in deck`,
  // Visual only (aria-hidden): the name's description keeps the shipped recount strings.
  from: (n: number) => `from ${n}`,
  // Polite live region, once per settle.
  settled: (name: string, n: number) => `${name}, ${n} in the deck.`,
  // The shipped refusal shape: `We couldn’t <verb> that. The deck is unchanged.`
  refused: "We couldn’t change that. The deck is unchanged.",
} as const;
