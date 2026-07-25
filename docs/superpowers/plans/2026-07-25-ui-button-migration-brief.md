# CTA Migration Brief

Shared instructions for migrating inline-styled CTAs onto the primitives in
`src/components/ui/button.tsx`. One surface per PR.

## The primitives

```tsx
import { GhostButton, PrimaryButton } from "@/components/ui/button";
```

They own exactly nine properties: background, text colour, border,
font-family (`font-sans`), font-weight (`font-semibold`), border-radius
(`rounded-lg` = 8px), hover, the hover transition (`transition-colors`), and
cursor (`cursor-pointer disabled:cursor-default`). Everything else — padding,
font size, width, layout, focus ring — stays on the caller via `className`.

Two of those are really pairs, for one shared reason: `:disabled` suppresses a
button's click but neither its cursor nor its `:hover`. Each is therefore
matched by a `disabled:` override that pins it back — `disabled:cursor-default`
for the cursor, and a `disabled:hover:` restoring the resting fill, border and
text colour. A migrated site needs neither of its own; the primitive supplies
both.

Because font-family and font-weight are owned, migrating a site that today has
no weight class, or a lighter one, changes its appearance. Report every such
case.

`PrimaryButton` renders `bg-[color:var(--brass)] text-[color:var(--bg)]` with
`hover:bg-[color:var(--brass-hover)]`.
`GhostButton` renders transparent fill, `text-[color:var(--fg)]`, a
`1px solid var(--border-strong)` border, and brass border + text on hover.

Both render a `<button>` by default and a `next/link` when given `href`.
`className` is merged with `tailwind-merge`, so a caller class beats a base one.

Neither accepts a `style` prop. That is deliberate: an inline style outranks
the `hover:` utilities the primitives own, and the ESLint rule cannot see it on
a `<PrimaryButton>` because the selector matches `button`/`a`/`Link`. Reach for
a Tailwind class instead.

## Which sites to migrate

Migrate a site when its inline `style` is **static** (no ternary) and matches:

- **PRIMARY** — `background` is `#C9A24B` or `var(--brass)` with dark text
  (`#14110E` / `var(--bg)`)
- **GHOST** — `background: transparent` with a `1px solid` border in
  `#3A3229` / `var(--border-strong)`

## Which sites to leave alone

- Anything whose `style` is a ternary on component state (filter pills, tabs,
  selectable rows) — these are a different pattern and are out of scope
- Colour pips and mana pips, where the colour is computed from data
- Card and list-row wrappers that happen to be a `<button>` or `Link`
- Plain text links (brass text, no fill, no border)
- Any site overriding the primitives' nine properties so heavily that the
  primitive would be entirely overridden

When in doubt, leave it and note it in your report. A missed migration is
cheap; a wrong one is a visual regression.

## Token equivalences (pixel-identical, safe to normalise)

| Hex | Token |
|---|---|
| `#C9A24B` | `var(--brass)` |
| `#14110E` | `var(--bg)` |
| `#EDE6D8` | `var(--fg)` |
| `#3A3229` | `var(--border-strong)` |

`rounded-[8px]` equals the primitive's `rounded-lg` — drop it. Any other radius
(`rounded-[6px]`, `rounded-full`) must be kept as an explicit `className`.

## Deliberate visual changes

Sites that today have **no hover** or use `hover:opacity-90` will gain
`var(--brass-hover)` (`#D8B25E`). This is the bug the primitives exist to fix
and the design tables specify it — it is intended, not a regression. Call it
out in your report so the design review can confirm it.

## Changes that are NOT safe

Do not let a migration silently change a colour that is not in the table above.
`GhostButton` uses `var(--fg)` for text; a site currently using a muted text
colour such as `#A89B84` must keep that colour as an explicit `className`
override, or be left unmigrated.

## Per-site checklist

1. Preserve `type`, `onClick`, `disabled`, `href`, `aria-*` and `key`.
2. Move padding, font-size, width and layout classes into `className`.
3. Keep the existing `focus-visible:` ring classes.
4. Delete the `style` prop entirely — the primitives do not accept one, and
   passing it is a type error. A property they do not own (e.g. `cursor`) moves
   to a Tailwind class: `cursor: "default"` when disabled becomes
   `disabled:cursor-default`.
5. Preserve the section comments that reference the design tables.

## Verification

```bash
pnpm typecheck && pnpm lint && pnpm test
```

`pnpm lint` must report strictly fewer `no-restricted-syntax` warnings than
before your change, and zero errors.
