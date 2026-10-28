# Readiness: Suggested changes v2

**Verdict: Green.** Approved by Hugh on 2026-10-28 ("This all LGTM"), after R1b (chips under the box, Added/Cut, group by type or role), R2 (his rulings with engineering: streaming wait, bracket move in release 1, apply with confirmation and Undo, request beside history results, N 1 to 20) and R2b (Apply 2N changes, confirmation max height, trimmed copy).
Nothing below blocks the build. Every open item has a drawn default.

## For Hugh

1. **Copy** is a placeholder wherever it is new and needs `/copy-review`: every string in `suggested-changes-v2 · copy strings.ts`.
2. **About.** v2 changes a surface that already has an entry: Decks › Analysis (the label, a new Good to know card, the credits card, the Try it line). Drawn on the About board; it rides v2's switch and the line's About batch.

## For engineering

1. **Streaming (G1).** Additions and cuts are saved and sent to the client as each one validates, additions first. The client appends; a side is "in" when its call finishes. Apply is enabled only when both sides are in.
2. **Type and role per line (G2).** Each suggestion carries `cardTypeGroup` and its shelf role (the role counter's, not the model's); no role goes in Threats & synergy. Grouping reads `the99:deck-grouping`.
3. **Chip sources (G3).** Worst role gap, the deck's focus, the newest game note (quoted, dated), a second role gap. At most four; hidden when there is nothing to say. A chip tracks only its own sentence in the box.
4. **Same request (G4).** The spec §8 check runs on press, before a credit is reserved: same N, words, limits, bracket choice and list fingerprint.
5. **The bracket aim (G6).** The choice reaches the prompt and the checks. Keep drops a card that would move the deck's bracket. Up to 3 or 4 flags each addition that reaches the aim (the shipped bracket flag). The bar reports whether the picked set reaches it, by `permitsOf`-style arithmetic on the set.
6. **Apply.** One transaction for the picked set on the deck's draft; one Undo restores the set and keeps the picks. Picks are capped at N per side, and Apply needs equal counts. The confirmation's max height is min(640px, 100dvh − 96px) desktop, 88% sheet, with the lists scrolling.
7. **Retired.** Suggest again, Suggest again anyway, the unchanged lead, Additional notes, Reject on v2 rows.
