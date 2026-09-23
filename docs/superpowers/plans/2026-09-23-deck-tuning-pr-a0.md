# Deck tuning — PR A0 — `listFingerprint`

> Part of the deck tuning plan. **Read the index first:** [`2026-09-07-deck-tuning-suggestions.md`](2026-09-07-deck-tuning-suggestions.md) — the Global Constraints, File Structure, PR boundaries and Cost there apply to every task below. Task numbers are shared across all six files.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

### Task 0: `listFingerprint`, beside `profileFingerprint`

**PR A0.** Additive only. Ownership of `src/lib/profile/fingerprint.ts` and its test is granted to this lane for this one PR (orchestrator, 2026-09-23); the `analysis-tab` lane consumes the same function in its C1.

**Why.** `profileFingerprint` hashes `PROFILE_VERSION` together with the cards (`src/lib/profile/fingerprint.ts:32-50`), which is right for a cache key and wrong for "has the player changed their deck": a deploy that bumps the version (it went 1 → 3 on 2026-09-20/21) reads as a change on every deck. Hugh ruled on 2026-09-23 that only the player's own edits count as drift. So the list gets a fingerprint of its own, with no version in it, and every "did the player change this" question reads that one.

**Files:**
- Modify: `src/lib/profile/fingerprint.ts`, `src/lib/profile/fingerprint.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  /** The player's list alone — both commander columns and the (oracleId, quantity) pairs. No version. */
  export function listFingerprint(input: {
    commanderOracleId: string;
    partnerOracleId: string | null;
    cards: readonly { oracleId: string; quantity: number }[];
  }): string;
  ```
  Same input shape as `profileFingerprint`, so a `ProfileHead` passes to either. `profileFingerprint` is unchanged.

- [ ] **Step 1: Write the failing tests**

```typescript
it("ignores the order the rows arrive in", () => {
  expect(listFingerprint({ ...head, cards: [...head.cards].reverse() })).toBe(listFingerprint(head));
});

it("changes with a quantity, a card, or either commander", () => {
  expect(listFingerprint({ ...head, cards: [{ ...head.cards[0], quantity: 2 }, ...head.cards.slice(1)] })).not.toBe(listFingerprint(head));
  expect(listFingerprint({ ...head, partnerOracleId: "p" })).not.toBe(listFingerprint(head));
});

it("does not move when PROFILE_VERSION does", async () => {
  // vi.doMock("./version", () => ({ PROFILE_VERSION: 99 })), re-import, compare.
  // profileFingerprint MUST move under the same mock — asserted beside it, so this test
  // cannot pass by mocking nothing.
});
```

- [ ] **Step 2: Implement** — the same sort and hash as `profileFingerprint` with the `v` key left out, as its own function rather than a flag on the old one, so neither caller can pass the wrong argument.

- [ ] **Step 3: Run and commit**

```bash
pnpm test src/lib/profile/fingerprint.test.ts
git add src/lib/profile/fingerprint.ts src/lib/profile/fingerprint.test.ts
git commit -m "feat(profile): listFingerprint — the player's list, with no version in the hash"
```

---
