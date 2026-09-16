import type { Availability } from "../../lib/decks/availability";

/**
 * An `Availability` in a named reading.
 *
 * Figures rather than a state name, because `availabilityState` is the thing
 * under test wherever this is used — handing it a state would be asserting the
 * mapping against itself.
 */
export function avail(reading: "free" | "soft" | "hard" | "over"): Availability {
  const base: Availability = { owned: 2, hard: 0, soft: 0, free: 2, claims: [] };
  if (reading === "free") return base;
  if (reading === "soft") return { ...base, soft: 1 };
  if (reading === "hard") return { ...base, hard: 2, free: 0 };
  return { ...base, hard: 3, free: -1 };
}

/**
 * A hard claim naming ONE deck, which is the only shape `markerAria` speaks a
 * name for — two claimants count instead of naming.
 */
export function heldBy(name: string): Availability {
  return {
    ...avail("hard"),
    claims: [
      {
        id: "deck-1",
        name,
        quantity: 2,
        mature: true,
        pending: false,
        commander: false,
        senior: true,
      },
    ],
  };
}
