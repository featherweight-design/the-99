// Where each step's press ring goes (public landing, 5l). Its own small module with no imports beyond a type: the card (`demo.tsx`)
// reads these on every render, and the steps (`demo-steps.tsx`) are a chunk that loads when Start is pressed, so the card cannot
// import them from there without the whole drawing half riding in the landing's first load.

import type { RingPlace } from "./demo-ring";

/**
 * The control each step's press ring floats over (`PressRing`): a selector for the first match inside the app panel. A ring
 * is drawn only where a press leads somewhere with no card details behind it: step 2 the first row's Fit chip ("Why it fits",
 * the board's), step 4 the mark key, which decodes the marks the rows below carry, step 5 the first
 * finding that opens its receipt, steps 7 and 8 the tab not yet open. The card rings (steps 1, 3 and 6) return with 5l-c,
 * which supplies card details: until then a card press opens nothing, so those steps draw no ring. A step with no entry draws
 * no ring.
 */
export function ringTarget(index: number): string | null {
  switch (index) {
    case 1:
      return "[data-fit-chip]";
    case 3:
      // The mark key (the first group in the step), near the top of the step: the first marked row sits ~1,850px down. The key's
      // entries are not controls, so the key as a whole is ringed.
      return "[data-testid='demo-deck'] [role='group']";
    case 4:
      return "[data-testid^='finding-']:has(button)";
    case 6:
    case 7:
      return "[role='tab'][aria-selected='false']";
    default:
      return null;
  }
}

/** Where each step's ring label sits (`RingPlace`): a tab's ring sits right under the panel label, so its label goes under it; step 1's tile has the legend row above; every other target is wide, with a label straddling its top edge. */
export function ringPlace(index: number): RingPlace {
  switch (index) {
    case 0:
      return "inside";
    case 6:
    case 7:
      return "bottom";
    default:
      return "top";
  }
}
