import { describe, it, expect } from "vitest";

// The header's figure, as the shell computes it. Extracted here as the same
// expression rather than rendered, because what is being pinned is the
// ARITHMETIC: a commander can also be a row on its own list, and the first
// version added a row count to two booleans and counted that one printed card
// twice — disagreeing with the tile beside it about the same deck.
const proxiedCount = (
  cards: { oracleId: string; proxied?: boolean }[],
  commander: { oracleId: string; proxied?: boolean },
  partner: { oracleId: string; proxied?: boolean } | null,
) => new Set([
  ...cards.filter((c) => c.proxied).map((c) => c.oracleId),
  ...(commander.proxied ? [commander.oracleId] : []),
  ...(partner?.proxied ? [partner.oracleId] : []),
]).size;

describe("one mark is one proxy, per card", () => {
  it("folds a commander that is also on its own list", () => {
    // The folded case the claim model already handles: one card, one mark.
    const count = proxiedCount(
      [{ oracleId: "cmd", proxied: true }],
      { oracleId: "cmd", proxied: true },
      null,
    );
    expect(count).toBe(1);
  });

  it("counts a commander and a separate list card as two", () => {
    const count = proxiedCount(
      [{ oracleId: "a", proxied: true }],
      { oracleId: "cmd", proxied: true },
      null,
    );
    expect(count).toBe(2);
  });

  it("counts each half of a proxied pair", () => {
    const count = proxiedCount([], { oracleId: "c1", proxied: true }, { oracleId: "c2", proxied: true });
    expect(count).toBe(2);
  });

  it("is zero when nothing is printed", () => {
    expect(proxiedCount([{ oracleId: "a" }], { oracleId: "cmd" }, null)).toBe(0);
  });
});
