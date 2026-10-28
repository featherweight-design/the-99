Build Suggested changes v2 from design/design_handoff_the99_suggested_changes_v2/ (PR #2302) against the spec docs/superpowers/specs/2026-10-27-suggested-changes-v2-design.md (#2295). Read the handoff's README, READINESS (GREEN), STATES and `suggested-changes-v2 · copy strings.ts` first. The boards are the canvas https://claude.ai/artifact/QY9JsqnZvEcQNWvaAQ9QcJ.

Hugh's rulings (2026-10-27/28), which override anything older in the spec:
- A run is never cut short. Additions, then cuts, stream to the client as each card validates.
- The bracket move ships in release 1, as a first-class choice beside the request box.
- Applying is one action for the picked additions and cuts, behind a confirmation, with one Undo for the whole set.
- History shows the typed request beside that run's results.
- N runs 1 to 20. Picks are capped at N per side, and Apply needs equal counts so the deck stays at 99.

Suggested order, one PR each. Put the new flow behind a switch, since it replaces a shipped surface.
1. **Backend.**
   - Streaming results per side (READINESS G1).
   - `cardTypeGroup` and shelf role on each line (G2).
   - The chip sources (G3).
   - The same-request check before a credit is reserved (G4).
   - The bracket aim in the prompt and the checks: Keep drops a card that would move the bracket, and Up to 3 or 4 flags the additions that reach the aim (G6).
   - Apply and Undo of a picked set as one transaction on the draft.
2. **Intake** (board Intake).
   - Three numbered steps on one panel, and Suggest changes.
   - The stepper, 1 to 20.
   - The request box is never pre-filled. What we noticed chips go under it, and a tap appends the chip's sentence.
   - The Bracket card goes beside the box on desktop and under the chips on a phone. It has four choices, and Keep is the default.
   - The shipped Kept for this deck box.
   - The same-request confirm.
   - Not at 99: the inert tile with its Top off or Proposed cuts link (board Not-At-99).
3. **Results** (boards Results-3/10/20, Short-Run).
   - One Pick per row, with a side greying its other Picks at N.
   - Flat at 5 a side. Grouped from N = 4 under the deck toolbar's By type · By role `SegmentedSwitch`, with the same stored choice (`the99:deck-grouping`, default By type).
   - The bracket aim shows in You asked, on the flagged rows and in the bar.
   - A short run states its count and reason.
4. **Apply** (board Apply).
   - The pinned bar shows the tally and "Apply 2N changes".
   - The confirmation is a ModalChrome eyebrow head at 560, or the shipped sheet on a phone. Max height is min(640px, 100dvh − 96px) on desktop and 88% on a phone. The head and the button stay put while the lists scroll.
   - Applied rows read ✓ Added / ✓ Cut, and the bar shows Undo all 2N until the next commit.
   - Undone keeps the picks.
   - A failed apply shows the shared toast.
5. **The wait** (board Wait).
   - A clock and "N to add and M to cut so far".
   - Rows append in arrival order, marked new for a beat. A side groups once it is in.
   - "Still finding more" ends each list until it is in.
   - Picks are kept, and Apply opens when both lists are in.
   - The ~45 s and ~2 min notes. No Stop control.
6. **History** (board History).
   - Each row quotes the request with asked · found · applied.
   - An opened run shows You asked beside its outcome on desktop.
   - A stale run is read-only.
   - v1 runs keep their stored summary.
7. **About** (board About): the Decks › Analysis label, the new Good to know card, the credits card and the Try it line, with this line's About batch.

Retire: Suggest again, Suggest again anyway, the unchanged lead, Additional notes, and Reject on v2 rows. New copy goes through /copy-review. UI PRs follow the design-review and feature-acceptance skills as usual, with mobile and desktop in the same PR.
