# The credit note — wherever a press writes the overview (addendum)

**Canvas:** `The 99 - Analysis Tab.dc.html` §7 (7a–7h), full page at 1300 and 390.
**Brief:** `docs/superpowers/design-briefs/2026-09-23-the-synopsis.md` §6 *Cost* and *Storage*, as on
`docs/deck-notices-brief` (PR #898). Hugh's rulings, 2026-09-23. Audited against the four items only.

## The rule

A note draws **exactly when the press would write the overview**: the stored overview's list
fingerprint (`listFingerprint`) or synopsis contract version differs from the live list's. Otherwise
the press returns the saved overview, spends nothing and draws **no note**. Only a successful answer
spends; a refused or failed one does not, and a stopped run is refunded (tuning, settled 2026-09-23).
A button never spends without its note drawn first.

## Placement (the Suggest changes note, tuning r3 E4)

- **1300:** in the button's row, after it; mono 11, `--fg-faint`, line-height 1.55, wraps at ~300–340px.
  In the empty state, *How we make these decisions →* wraps to its own line under the pair. In the
  banner, the note sits between the sentence and the button, right-aligned.
- **390:** centred under the full-width button; mono 9.5, `--fg-faint`.
- No new mark, no new colour, no `--danger`. The only red in these frames is Round 0's existing
  *not written* tag (7h), unchanged.

## The four items

| # | Where | Frame | Note |
|---|---|---|---|
| 1 | Empty state · **Analyze** | 7a | *Also writes the overview, using a credit. {n} of {total} left · next one at {time}.* Also on 2c's *Try again* (same press). |
| 2 | Banner · **Re-analyze**, list changed | 7c | same as 1. Also on 2d's *Try again*. |
| 2 | Banner · Re-analyze, overview already current | 7d | **none** — returns the saved overview |
| 3 | Overview · **Write one** (Round 0 state 2) | 7f | *Uses a credit. {n} of {total} left · next one at {time}.* |
| 3 | Overview · **Try again** (Round 0 state 4) | 7h | same as Write one |
| 4 | Analyze, used up | 7b | enabled (the bracket is free). *Reads the bracket only; the overview waits for a credit.* + used-up string |
| 4 | Re-analyze, used up | 7e | enabled. *Reads the bracket only; the overview stays as it was.* + used-up string |
| 4 | Write one, used up | 7g | **disabled** (`--fg-disabled` on the `--border-strong` outline, the tuning panel's disabled form) + used-up string. Try again used up takes the same form. |

## Shared string (one module, with the tuning panel)

```ts
credits: {
  left: (n: number, total: number, time: string) => `${n} of ${total} left \u00b7 next one at ${time}`,
  usedUp: (total: number, time: string) =>
    `0 of ${total} left \u00b7 next one at ${time}. Synopses and suggestions share these credits.`,
}
```

`{time}` is **12-hour** (`2:20 PM`), the time the oldest spend rolls off the 24-hour window. Never
*today*. At full credits there is no next time: the string is `{n} of {total} left` alone.

## Copy for `/copy-review`

New: the three leads (*Also writes the overview, using a credit.* · *Reads the bracket only; the
overview waits for a credit.* · *Reads the bracket only; the overview stays as it was.*). Conformed:
Round 0's *No summary has been written…* / *We wrote a summary…* to **overview**, and *about five
seconds* dropped. No em dashes.

## For engineering / copy-review, not drawn

1. **The tuning frames use 24-hour `14:20`.** The shared string is 12-hour; the tuning panel takes it
   when it moves to the shared module.
2. **"Synopses" in the used-up string** is the tuning panel's word; the tab now says *overview*.
   One term should win in `/copy-review`; changing it changes both surfaces.
3. **After a used-up Re-analyze, the overview is older than the list** and the banner is gone (the
   bracket is current). Nothing on the tab says so. Round 0's state 3 (*Write it again*) is the natural
   home but touch-up 2 retired its tag; this needs a ruling before the press-to-write PR ships.
