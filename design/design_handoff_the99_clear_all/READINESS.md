# Readiness Review — Clear all of What's new

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (cold read, rebased onto origin/main @636536c83; replaces the Design-side Green note, whose build notes are kept below)
**Related ticket(s):** none (Hugh's ask, R1 approved 2026-11-20)
**Plan PR target:** TBD (one S PR, no migration, no switch)

## Summary

Buildable as drawn. No Design gap: states (1, 2, 9 items, announcements off, Upcoming drops, failure, Undo) and both widths are drawn. No migration: `feed_dismissals` already takes every key Home writes (`item:`, `set:`, `precon:`, `post:`; `feed_dismissals_key_check`) and its PK makes the write idempotent. The only server work is a bulk action plus its inverse. Five eng-side clarifications below, chiefly that the lead story does not live in What's new's hidden set.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Boundary, non-goals (Waiting on you, push, `ask:` keys) and the 2+ rule are stated.

### 🎭 State coverage
- ✅ Phone and desktop drawn (C1-C5), plus S1-S6.
- 🟡 Not drawn: Clear all pressed while an answer to a spare-request row is out or the lead holds a receipt (`held-lead.tsx`); see clarification 2.

### 🔌 Data contract
- ✅ No migration or new table. `dismissFeedTarget` writes one row per key; `parseDismissKey` already validates all four key kinds. A bulk insert is one statement, so a failure is all-or-nothing, matching "restore everything".
- ✅ Undo inverse (delete the reader's own `feed_dismissals` rows for those keys) needs no schema work.
- ✅ "Posts stay in Past announcements" holds: `archive.test.ts` pins that the archive reads no per-reader table.
- 🟡 Keys come from the client; the bulk action needs a cap (clarification 3).

### 🧱 Codebase fit
- ✅ `ShowAllFooter` (`aside` + Show all, same press classes) and `SocialToast` exist as named; no new tokens.
- 🟡 The lead is NOT in What's new's `useFeedDismiss` hidden set: it is drawn by `lead-story.tsx` with its own hook instance, and `whats-new.tsx` hides it only through `useHeldLead().gone` (clarification 1).
- 🟡 `SocialToast` has no "action" prop: its single action is `retry: { label, run }`, and `role` is per instance (clarification 4).

### ♿ Cross-cutting
- ✅ Accessible name, role status / alert, focus to `#home-whats-new` and back to Clear all on Undo are specified.

### ⏰ Drift from reality
- ✅ `feed/dismiss.tsx`, `home/whats-new.tsx`, `feed/show-all.tsx`, `social/social-toast.tsx`, `src/app/feed-dismiss-actions.ts`, `src/lib/social/feed-dismiss.ts` all exist as named.

### 📝 Decision log
- ✅ R1 approved by Hugh; copy marked DRAFT for `/copy-review`.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **Lead in the hidden set.** `WhatsNew` filters `feed.lead` only when `heldLead.gone` matches. Clear all hides the lead by setting `gone` to its key through the held-lead context (as the lead's own ✕ does via `onChange`), and hides rows and drops through `dismissed.hidden`; the unseen count already subtracts both in `withoutHidden`. The README's "the same hidden set" is shorthand for this.
2. **Answer out or receipt held.** Follow the ✕ pattern (`nextDismiss` skips a ✕ disabled while an answer is out): Clear all skips any item whose answer is in flight or whose receipt is held, and `n` counts only what was cleared.
3. **Cap and ownership.** The action refuses more than a fixed bound of keys (the Home window is far smaller) and any invalid key; `item:` keys not the reader's are a silent no-op, as today.
4. **Toast.** Success uses `retry` as the Undo action with `role="status"`; failure is a second `SocialToast` instance (role alert, no action). Rename the field to something neutral if touched.
5. **Revalidation.** Revalidate `/` and `/friends` via `after()` pattern if the shipped action does; the Undo action revalidates the same two.

## Decisions inherited

- No confirm; optimistic; failed write restores everything; no Undo on failure.
- Clear all at 2+ items only, lead included; between *Past announcements ›* and *Show all N*; stays after Show all; alone on the right with announcements off.
- Writes only `item:`/`set:`/`precon:`/`post:` keys, never `ask:`; Waiting on you and push untouched.
- Copy DRAFT through `/copy-review`; US English; no em dashes.

## Build notes from the Design-side check (kept)

Copy in `src/lib/copy/feed.ts` (`home`): the press, its aria label, `cleared(n)`, `clearFailed`. Tests: 2+ shows, 1 does not; count includes lead and hidden rows; bad keys refused; Undo deletes only the reader's rows; a failed write restores everything. Both widths in one PR. About: no label.
