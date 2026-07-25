# 2026-07-25 — Branded user menu — design spec

Design spec for GitHub issue **#35** ("replace Clerk default user menu with branded menu, mobile +
desktop"). Captures the workshop decisions and defines what Design still owes.

- **Design ticket:** [#35](https://github.com/HartiganHM/the-99/issues/35)
- **Paired eng ticket:** [#13](https://github.com/HartiganHM/the-99/issues/13) — implements the branded popover + bottom sheet
- **Related:** [#31](https://github.com/HartiganHM/the-99/issues/31) (closed) — the click-target bug whose workaround this supersedes
- **Track:** 2 (design needed → handoff → readiness → plan PR → implementation)

---

## Problem

The account menu is still Clerk's default `<UserButton/>` surface at all three trigger sites. Clerk
owns everything that opens: the panel styling, the "Secured by Clerk" footer, and the dev-mode badge.
The trigger is skinned to brand but the menu is not, so the most-visited control in the app is the one
place the product stops looking like itself.

`docs/superpowers/design-tables/appshell.md` already specifies a fully branded replacement —
§Account Popover (Desktop) at `:1577`, §Account Bottom Sheet (Mobile) at `:1690`, both listed in the
state table at `:2188-2189`. That spec predates this workshop, and three of the decisions below
**supersede** parts of it. Design's job is a targeted addendum, not a new surface.

## Workshop decisions (locked)

| Decision | Choice |
|---|---|
| Clerk attribution | **Dropped.** The `SECURED BY CLERK` caption does not ship. Supersedes `appshell.md:1676-1686` (desktop) and `:1779` (mobile). The caption was the literal complaint in #35; a security footer inside an account menu is reassurance nobody asked for. Clerk's mandated element is the development-instance badge, which is separate and unaffected. |
| "Manage account" destination | **Clerk's `<UserProfile/>`, themed** via Clerk's `appearance` API to our tokens. Not a bespoke `/account` page. |
| Desktop trigger | **Avatar-only, compact.** The trigger does not span the rail. Supersedes the implied avatar + name + ellipsis composition in `appshell.md:157-184` — the "ellipsis color" row in §Open/active no longer applies. |
| Popover anchoring | **Narrower than the rail, anchored to the compact trigger.** Supersedes `position: absolute; left:12px; right:12px` at `appshell.md:1584`. |
| Trigger consistency | **One component, one size, all three sites.** Today the shell renders 38px/`br 12px` and the commanders header renders 34px/`br 10px`; that divergence ends. |
| Mobile pattern | Bottom sheet, per the existing spec. Unchanged. |
| Session actions | Keep Clerk's session actions behind our own UI — manage account, sign out. No new auth surface. |
| A11y baseline | Focus trap while open, Escape to close, focus returns to the trigger on close, WCAG AA contrast. |

## Out of scope

- A bespoke `/account` page (superseded by the themed-modal decision; revisit only if theming proves insufficient)
- Any change to sign-in / sign-up, which stay on Clerk's hosted pages (`src/proxy.ts:7`)
- Additional menu entries beyond manage-account and sign-out
- Restyling Clerk's development-instance badge

## Current state in code

Three trigger sites, all rendering Clerk's default menu:

| Site | Trigger |
|---|---|
| `src/components/shell/nav.tsx:234` | Desktop rail, inside the `AccountTrigger` pill — 38px, `br 12px` |
| `src/components/shell/nav.tsx:348` | Mobile header, top-right — 38px, `br 12px` |
| `src/components/commanders/page-header.tsx:48` | Commanders header — 34px, `br 10px` |

`AccountTrigger` (`nav.tsx:206-244`) forwards wrapper-surface clicks into the Clerk button as the #31
fix. That workaround exists only because the pill is wider than its interactive child; the compact
trigger removes the mismatch, so the forwarding logic goes away with it.

Tokens are in `src/app/globals.css` — `--surface-raised` `:11`, `--border-strong` `:20`, `--brass`
`:31`. A `prefers-reduced-motion` block landed with #58 at `:165-172` and disables the named
animation utilities; any open/close motion follows that pattern.

## Design owns

Compact trigger composition and its resting size (the 34px-vs-38px unification is a visual call),
popover width and anchor geometry against the compact trigger, what replaces the removed caption in
the popover footer (if anything), open/close motion and its reduced-motion behaviour, focus-visible
treatment on the trigger, whether the mobile drag handle is functional or decorative, and the token
mapping for Clerk's `<UserProfile/>` `appearance` — enumerated per Clerk element, so #13 isn't
guessing which of profile/email/password/sessions/MFA gets which token.

The richness pass (`design/design_handoff_the99_richness/`) does not cover the account menu, so this
surface inherits #58's character layer rather than being restyled by it later.

## Next steps

1. Design produces the addendum into `design/design_handoff_the99_user_menu/`.
2. Readiness audit against the locked decisions above.
3. Plan PR for #13 once the verdict is Green or Yellow.

## Traceability

Workshop held 2026-07-25. Decisions 1–3 in the table above answer the three open questions identified
while assessing #35 for readiness; the remainder were already settled by the appshell design table and
are restated here only where this spec changes them.
