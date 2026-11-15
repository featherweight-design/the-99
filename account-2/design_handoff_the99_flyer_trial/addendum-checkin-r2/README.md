# Addendum: the check-in, round 2 ("How's it going?")

Account 2 · 2026-11-15 · a refresh of the shipped check-in (flyer trial boards 9 and 10, `Survey-Phone`, `Survey-Desktop`).
Hugh's ask: make it more fun, lively and appreciative, in look and words, because the feedback genuinely helps us know what to
improve. Today's thanks ("Thanks, that helps." under a plain check) reads dry and a bit cold.

Canvas: https://claude.ai/artifact/1LxZtxLZ1BYkuDPhU8hng8 (boards Main = `Checkin-Phone`, `Checkin-Play`, `Checkin-Desktop`,
`Checkin-Themes`, `Checkin-Spec`). Open them with `support.js` beside them. The boards load the Home captures from the canvas
asset store (`/_blob/…`); the same images are in `art/`.

## Locked (from the prompt)

Same trigger (14 days, 5 Home days), same three questions and note, nothing new collected, Not now snoozes and ✕ ends as
shipped, About › Report a problem stays reachable (named in both thanks), all six themes.

## Design's calls

1. **The rating is a hand of five cards** (card shape 63:88), fanned −6°, −3°, 0, 3°, 6° from the bottom centre, each with its
   number in the display face and a word: Rough, Meh, Okay, Good, Love it. The picked card lifts 10px, straightens, takes the
   accent wash and wears the crown (◆◆◆). Phone: five equal columns (about 67×93). Desktop: fixed 70×98, centred; a hovered
   card rises halfway (pointer only). The "not well / really well" ends go.
2. **Chips stay the shipped pills**, with a 180ms pop as one turns on. No icons (Shopping and Precons have no nav icon).
3. **The card back by the intro is the payoff.** A small tilted back (44×62, the 99 mark) beside the intro from the start. On
   send it becomes the shipped compact `FriendCard` (150×210, −3°) with the crowned face and turns face up as the thanks.
4. **Two thanks, picked by the rating already given.** 3–5: "Thank you, truly!" plus a burst of six crown diamonds. 1–2:
   "Thanks for telling us straight", same card, no burst.
5. **Sending** as shipped (Sending…, all held), answers dimmed to .6. **Failed** is the shipped toast with Try again; new words.

## States

| ID (phone / desktop) | State | Trigger |
| --- | --- | --- |
| A1 / D1 | The ask | Shipped: due on Home, 1.5s after hydration. |
| A2 / D2 | Answering | A card, chip or note. Send enables once a card is picked. |
| A3 / D3 | Sending | Send. |
| A4 / D4 | Thanks, rated 3–5 | Send succeeded, rating ≥ 3. |
| A5 / D5 | Thanks, rated 1–2 | Send succeeded, rating ≤ 2. |
| E1 / D6 | Failed | Send failed: toast with Try again, answers kept. |

## Motion (thanks, rated 3–5)

0ms form fades out (150ms) and the card back rises 24px into place (200ms) · 200ms the shipped beat, then the shipped
520ms turn (`cubic-bezier(.45,.05,.25,1)`) · 720ms face up: six ◆ burst out and fade (700ms) as heading, body and Close
fade in (200ms) · 1420ms settled; nothing loops. Rated 1–2: the same without the burst.
Card pick: 220ms lift with a small overshoot, crown fades in. Chip: 180ms pop from .94.

**Reduced motion:** no rise, turn, burst, pop or lift transition. The back cross-fades to the face over 120ms after the
200ms beat (the shipped `.friend-card` rule), the words with it.

## Accessibility

Shipped `radiogroup` of five `radio` buttons named "4 of 5, Good"; add arrow keys with a roving tabindex. Hit boxes ≥ 44
everywhere. The small back and the diamonds are `aria-hidden`; the face-up card is one image, "Thank you, a card from The 99".
On thanks, focus moves to the heading (tabindex −1) inside a polite live region.

## Engineering notes (not design calls)

Reuse `FriendCard` (`compact`, `face.crown`, `word`), mounted face down, `up` set on the next frame with `arrival`. The burst
is six ◆ in `--accent-text`, CSS keyframes, removed after 1.5s. Rating words map by index; the stored value stays 1–5. Tests
asserting today's strings (`check-in-form.test.tsx`) move to the new keys.

## Questions for Hugh

- Q1 one thanks or two (rec: two, split by rating).
- Q2 the card's Magic joke, "Instant — Thanks" with "When this resolves…" rules text (rec: keep) vs a plainer text box.
- Q3 the five words (rec: keep) vs numbers with today's end labels.

## Copy

Every new string is a draft for /copy-review: `check-in r2 · copy strings.ts` here, and the table on `Checkin-Spec`.
