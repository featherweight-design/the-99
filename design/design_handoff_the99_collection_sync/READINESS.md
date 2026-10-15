# READINESS — Collection Sync (R2)

**🟢 R2, approved by Hugh (LGTM, 2026-10-15).** Hugh audited R1 on 2026-10-15: two changes (the desktop cards' left gutter, `Kept from The 99`), everything
else approved. Both are made in R2; see README §R2.

## Locks held

| Lock | How R1 holds it |
|---|---|
| No data changes before confirm | Every figure is the dry run; choice, follow-up and conflict answers write nothing. |
| Tokens are synced, Replace's way | One line, no choice, no conflict; same transaction; a failure writes nothing. |
| File-only changes taken, app-only kept | `from the file` and `kept from The 99` tiles and lists. |
| A conflict is the player's call, per card or in bulk | Radios per row, nothing pre-picked; two bulk presses acting on all conflicts. |
| One History entry; Revert takes it back | `Sync upload`; shipped Revert and `Revert what’s left`. |
| Replace and Add unchanged | Same words, order and behaviour; Sync third. R2's desktop card layout applies to all three cards (Hugh's call). (Step title: G10.) |
| First-run never shows Sync | First import still skips the choice. |
| Hit targets, keyboard, screen reader | Cards and radios ≥44px; roving radios; held button jumps to the first card left; tiles a polite live region; row names carry the counts. |
| Switch | Off: shipped Replace flow. |

## Open questions, called

1 Sync, `Sync my collection` · 2 three equals, none picked, Sync third, disabled with reason · 3 a section on top of the
review, radios per card, bulk with counts, button held · 4 banner on the step, follow-up after the cards, additions
first · 5 four tiles, agreed in nothing to do · 6 cards · 7 summary clause, `Sync upload` · 8 disabled · 9 one line ·
10 nothing to sync / record tokens.

## For the audit

G1 (the choice figure counts copies), G3 (Revert leaves tokens), G10 (the step title changes) are the three calls most
worth checking. Full gap report in README.

## Engineering readiness audit (2026-10-15)

**🟡 → 🟢 after rulings.** Audited against `main` (0f6aa76's base), independently of the table above. Rulings are the
orchestrator's as Hugh's proxy, 2026-10-15; Hugh may overrule 5.

**The base is the last Replace or Sync FILE, not the collection after it** (engineering, approved). The brief's rule
rebuilt "the collection after the last upload" from the ledger. That fails twice:
- Hugh's own case: his last production upload (Oct 2, `The Vault 10-1-26.csv`) predates the ledger (first entry
  2026-10-11), so C3 would have shown Sync unavailable for exactly the file it exists for.
- After any Sync: the post-Sync collection includes the kept app changes. The next export lacks them, so `f ≠ b`,
  `a = b`, and Sync would take the file and delete them. On staging, re-syncing the same file after a first Sync would
  remove 112 holdings and lower 9, against call 10's "Nothing to sync".

The base is the stored `preview_payload.pendingItems` of the newest confirmed Replace or Sync that was not reverted.
It needs no ledger and has no 90-day limit. On production (SELECT only), Hugh's stored Oct 2 file against his
collection differs on 40 holdings, all of them in his ledger. A re-upload of that file takes 0 cards, keeps 40,
raises 0 conflicts and records the tokens: S1.

As a result, C3 (no record) and C3b (past 90 days) stop firing for a Replace or Sync anchor. The unavailable card
form stays for what is left: never uploaded, a last file stored before migration 0008, and no unreverted Replace or
Sync to anchor on. There is no redraw.

**Rulings**
1. An Add is never the anchor. Its cards read as the app's side: kept, or a conflict where the file holds another
   count.
2. Under **Only what it adds**, tokens are additive: upsert what the file reads, delete nothing. Under the other
   picks, Replace's token rule applies.
3. The receipt is built on the shipped summary layout (eyebrow, `N cards in your collection`, lede, stamp below), with
   Sync's lede. Y1's heading and stamp position are read as a stale draw.
4. No new revert warning. Reverting a Sync applies its inverse as every entry's revert does today.
5. No `ABOUT_VERSION` bump. Sync ships behind its own switch, and the `upload-choice` entry follows that switch,
   announced on the flip.

**Eng-resolvable (the plan absorbs these):**
- States drawn at one width only are built from the drawn width's content in the shipped chrome of the other width.
- The component extensions are listed in the plan.
- Migration 0125 adds `upload_sync` to `collection_history_kind_check`.
- G9's counts are stored on the upload's payload.
- G3 holds as written, and is wider: Revert also leaves the token joins it deleted, and `token_reads`.

**Copy, for `/copy-review`:**
- The Y1 lede joins "arrived and … left" against the shipped "arrived, … left".
- The Y3 revert lede, `changed since, stays` and the Y1 heading are drawn but not in the copy file.
- G6 (`We couldn’t sync that`).
- The new stamp key collides with `card-assignments`' `stamp`.
