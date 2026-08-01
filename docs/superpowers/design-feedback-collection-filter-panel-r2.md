# Design feedback — Collection Filter Panel, R2

Status: **ratification ask**, not a blocker. Engineering has resolved the item below; the
handoff should either confirm the resolution or replace it. Nothing is waiting on a reply.

Source: `docs/superpowers/design-tables/collection-filter-panel.md` §8 "Minor unresolved
items", first bullet — hover/focus undrawn for six controls, and `accent-hover #D8B25E`
defined in the brand sheet but applied nowhere on the canvas.

---

## Paste-ready message

> **Collection Filter Panel — one item from §8 we resolved in code, please ratify.**
>
> The property table flags that hover and focus are undrawn for the sheet close `✕`, the
> search field's clear `✕`, the empty state's `Clear search`, the footer's `Clear` and
> `Done`, and the chip dismiss `✕` — and notes that the brand's `accent-hover #D8B25E`
> is never applied on the canvas, with `Done`'s hover as the inferred intent.
>
> We've taken that inference for `Done` only. It now renders through the shared
> `PrimaryButton` primitive, which is the same brass CTA used by the 404 page and the
> deck-list empty state, and which carries `background: #C9A24B → #D8B25E` on hover with a
> `transition-colors`. So `Done`'s resting appearance is unchanged and matches the
> canvas exactly; the only addition is the hover fill.
>
> Two things we'd like from you:
>
> 1. **Confirm `#D8B25E` is right for `Done`'s hover** — or give us the value you intended.
>    If it's correct, we'd suggest adding the hover row to the `Done` table so the next
>    reader doesn't have to re-derive it.
> 2. **Tell us whether the other five controls should also get hovers**, and what they are.
>    They are all currently inert on hover. That's a defensible resting state for icon
>    buttons, but it's an inconsistency worth deciding on deliberately rather than by
>    omission — `Clear` in particular sits next to `Done` in the same footer and reads as
>    equally interactive.
>
> Focus states are separate and not covered here: every control in the panel picks up the
> app-wide `focus-visible` brass ring from `globals.css`, so keyboard users are served
> regardless of what you decide about hover.

---

## Engineering notes (not for Design)

- `Done` is `src/components/ui/filter-panel.tsx:559`.
- The hover lives in `PRIMARY` in `src/components/ui/button.tsx`; `--brass-hover` is
  `#D8B25E` at `src/app/globals.css:32`.
- If Design returns a different value, change the token or give `Done` an arbitrary hover
  class — do not add an inline `style`, which would outrank the `hover:` utility and kill
  the state silently.
