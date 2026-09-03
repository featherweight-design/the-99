import { describe, it, expect } from "vitest";
import { planLastSlots, countLastSlotsUnowned } from "../../../lib/decks/last-slots";
import type { SynergyCard } from "../../../lib/commanders/synergy-cards";

// Minimal SynergyCard fixture — only the fields planLastSlots reads.
function card(oracleId: string, owned: boolean): SynergyCard {
  return {
    oracleId,
    name: oracleId,
    typeLine: "Creature",
    facet: "creature",
    inclusionPct: null,
    synergyPts: null,
    owned,
  };
}

// The case the old `allCandidates - ownedCandidates` arithmetic got wrong:
// when the owned pool alone covers the gap both planLastSlots runs hit openSlots
// and the difference is 0, hiding control B even though the ranked list has
// unowned cards the top-up plan would place. countLastSlotsUnowned returns the
// number of unowned ids inside the single top-up plan — which is > 0 here
// because the ranked list leads with unowned cards that score higher than the
// owned ones.
describe("countLastSlotsUnowned", () => {
  it("is > 0 when the top-up plan contains unowned cards, even if the owned pool covers the gap", () => {
    // 5 open slots. Owned pool (cards 6–10) covers the gap on its own.
    // Top-up plan (ownedOnly: false) prefers the higher-ranked unowned cards
    // (cards 1–5), so every slot it fills is unowned.
    const ranked: SynergyCard[] = [
      card("u1", false),
      card("u2", false),
      card("u3", false),
      card("u4", false),
      card("u5", false),
      card("o1", true),
      card("o2", true),
      card("o3", true),
      card("o4", true),
      card("o5", true),
    ];
    const openSlots = 5;
    const inDeckOracleIds = new Set<string>();

    // Old arithmetic: allCandidates and ownedCandidates both equal openSlots.
    const owned = planLastSlots({ ranked, openSlots, inDeckOracleIds, ownedOnly: true }).place.length;
    const all = planLastSlots({ ranked, openSlots, inDeckOracleIds, ownedOnly: false }).place.length;
    expect(all - owned).toBe(0); // the arithmetic failure the helper fixes

    // New helper: intersects the top-up plan's ids with the owned set.
    const unowned = countLastSlotsUnowned({ ranked, openSlots, inDeckOracleIds });
    expect(unowned).toBeGreaterThan(0);
    expect(unowned).toBe(5); // all 5 top-up slots go to unowned cards
  });

  it("is 0 only when every card in the top-up plan is already owned", () => {
    // All ranked cards are owned; the top-up plan places only owned cards.
    const ranked: SynergyCard[] = [
      card("o1", true),
      card("o2", true),
      card("o3", true),
    ];
    const unowned = countLastSlotsUnowned({ ranked, openSlots: 3, inDeckOracleIds: new Set() });
    expect(unowned).toBe(0);
  });
});
