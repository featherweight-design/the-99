# Design property table: account in Settings (handoff R1)

Sources: `design/design_handoff_the99_account_settings/` (README, STATES, READINESS clarifications 1-10 binding, `account · copy strings.ts`, PRIVACY-copy.md, `art/*.webp`) and the drawn proposal source (`a6-proposal/account-section.tsx`, `delete-account.tsx`, `account.ts`, identical to the handoff copy file).

Conventions:
- Mobile = below md (drawn at 390). Desktop = md and up (768px+, drawn at 1300).
- Values are exact from the proposal classes. `inherited: X` means the design source hands the property to a shipped part (`SECTION_HEAD`, `TextField`, `field()`, `link()`, `LINKS`, `CodeBoxes`, `SIGN_ERR`, `CODE_ERR`, `SheetGrabber`, `SupportLink`, `ToastFrame`, the account menu) and sets no value of its own. Read those from the shipped part.
- `—` = explicitly absent. Properties the design does not set are left out.
- Copy: `a` = `accountCopy`, `a.del` = `accountCopy.del`, `nf` = `socialCopy.page.nameField`, `c` = `creditsPageCopy.del`, `signInCopy` / `joinCopy` from `src/lib/copy/join`. Only keys and arguments are listed.
- Per clarification 9, the 390-only states take their md values from the drawn md frames (the section's md classes; the 440 dialog).

## 1. Account section (`AccountSection`, last section on `/settings`, after Your decks)

### 1.1 Section wrapper and head

| Element | Property | Mobile (<md) | Desktop (md+) |
|---|---|---|---|
| `section` | element / aria | `section`, `aria-labelledby="settings-account"` | same |
| `section` | margin-top | 26px | 34px |
| `section` | `data-new=""` | board marker in the proposal only, not a design value | same |
| `h2` head | id | `settings-account` | same |
| `h2` head | all type, color, spacing, border | inherited: `SECTION_HEAD` (boards: mono uppercase, wide tracking, rule under) | same |
| `h2` head | copy | `a.head` | same |
| rows `ul` | margin | 0, margin-top 4px | same |
| rows `ul` | padding / list-style | 0 / none | same |
| row `li` (each, `LI`) | border-top between siblings (`li + li`) | 1px solid `var(--border)` | same |
| first `li` | border-top | — | — |

### 1.2 Shared row recipe (`ROW`, `B`, `LINE`, `LINKBTN`)

| Token | Property | Mobile | Desktop |
|---|---|---|---|
| `ROW` | display | flex | flex |
| `ROW` | align-items | flex-start | flex-start |
| `ROW` | gap | 12px | 12px |
| `ROW` | min-height | 44px | 44px |
| `ROW` | padding-top / padding-bottom | 10px / 10px | 10px / 10px |
| `B` (value text, `<b>`) | font-family | `font-sans` | same |
| `B` | font-size / weight | 14px / 500 | 14px / 500 |
| `B` | color | `var(--fg)` | same |
| `B` | overflow-wrap | anywhere | anywhere |
| `LINE` (label and line text) | font-size / line-height | 12.5px / 1.45 | same |
| `LINE` | color | `var(--fg-muted)` | same |
| `LINE` | font-family | not set (inherits body) | same |
| `LINKBTN` (Change, Sign out, Try again) | display / align-items | flex / center | same |
| `LINKBTN` | flex | none (`flex-none`) | same |
| `LINKBTN` | min-height | 44px | 32px |
| `LINKBTN` | padding-left / right | 10px / 10px | 10px / 10px |
| `LINKBTN` | white-space | nowrap | nowrap |
| `LINKBTN` | border / background | 0 / transparent | same |
| `LINKBTN` | cursor | pointer | pointer |
| `LINKBTN` | font-family / size / weight | `font-sans` / 13.5px / 500 | same |
| `LINKBTN` | color | `var(--accent-text)` | same |
| `LINKBTN` | hover / focus / disabled | not set by the design | not set |
| text column (`span` in each row) | display / direction | flex / column | same |
| text column | gap | 2px | 2px |
| text column | flex / min-width | 1 1 0% (`flex-1`) / 0 | same |

### 1.3 Your name row (not editing)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| condition | renders when | `editing == null` | same |
| row | recipe | `ROW` (align-items flex-start) | same |
| label | style / copy | `LINE` / `a.name.label` | same |
| name | style / data | `B` / the reader's display name (profile, clarification 3) | same |
| line | style / copy | `LINE` / `a.name.line` | same |
| Change button | style | `LINKBTN` | `LINKBTN` (min-height 32px) |
| Change button | margin-right / margin-top | -10px / -8px | -10px / -8px |
| Change button | type / copy | `button` / `a.name.change` | same |
| Change button | behavior | opens the editing form in place (clarification 2: writes through `setDisplayNameAction`) | same |

### 1.4 Your name row (editing: the shipped name field)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| condition | renders when | `editing != null` (replaces the row in the same `li`) | same |
| `form` | display / direction | flex / column | same |
| `form` | gap | 8px | 8px |
| `form` | padding-top / bottom | 12px / 12px | 12px / 12px |
| `form` | width / max-width | 100% / — | 420px / 100% |
| `label` | font-size / weight | 13px / 600 | same |
| `label` | color | `var(--fg)` | same |
| `label` | copy | `nf.label` | same |
| `TextField` | height | 44px | 40px |
| `TextField` | padding-left / right | 12px / 12px | 12px / 12px |
| `TextField` | font-size | 16px | 16px; 14px under `(pointer: fine)` |
| `TextField` | border, radius, colors, focus | inherited: `TextField` | same |
| `TextField` | value | the draft name | same |
| hint `p` | margin | 0 | 0 |
| hint `p` | font-family / size | `font-mono` / 11px | same |
| hint `p` | color | `var(--fg-faint)` | same |
| hint `p` | copy | `nf.hint` | same |
| buttons row | display / gap | flex / 8px | flex / 8px |
| Cancel | type | `button` | same |
| Cancel | height | 44px | 32px |
| Cancel | flex | 1 (`max-md:flex-1`) | not set |
| Cancel | font-size | 14px | 12.5px |
| Cancel | padding-left / right | 14px / 14px | 14px / 14px |
| Cancel | border-radius | 6px | 6px |
| Cancel | border | 1px solid `var(--border)` | same |
| Cancel | background | transparent | transparent |
| Cancel | font-family / weight | `font-sans` / not set | same |
| Cancel | color | `var(--fg-body)` | same |
| Cancel | cursor | pointer | pointer |
| Cancel | copy | `nf.cancel` | same |
| Save | type | `submit` | same |
| Save | height | 44px | 32px |
| Save | flex | 1 | not set |
| Save | font-size / weight | 14px / 600 | 12.5px / 600 |
| Save | padding-left / right | 14px / 14px | 14px / 14px |
| Save | border-radius | 6px | 6px |
| Save | border | 0 | 0 |
| Save | background | `var(--accent)` | same |
| Save | color | `var(--bg)` | same |
| Save | cursor | pointer | pointer |
| Save | copy | `nf.save` | same |
| Save failed | rendering | Friends' shipped toast (no new UI) | same |

### 1.5 Email and sign-in row

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| row | recipe | `ROW` | same |
| label | style / copy | `LINE` / `a.signIn.label` | same |
| email | style / data | `B` / primary email address | same |
| methods line | style | `LINE` | same |
| methods line | copy | NO copy key: the proposal renders a literal template ``Signs in with ${methods}.``, where each method is `a.signIn.google` / `a.signIn.password` / `a.signIn.code`, joined `", "` and a final `" and "` (see Contradictions) | same |
| methods line | data | the account's sign-in methods (order: as listed by the account) | same |
| link wrap `span` | margin-top | 2px | 2px |
| link wrap | display / wrap / align | flex / wrap / center | same |
| link wrap | column-gap | 6px | 6px |
| More account options `a` | display / align | flex / center | same |
| `a` | margin-left | -2px | -2px |
| `a` | padding-left / right | 2px / 2px | 2px / 2px |
| `a` | min-height | 44px | 28px |
| `a` | font-family / size / weight | `font-sans` / 13.5px / 500 | same |
| `a` | color | `var(--accent-text)` | same |
| `a` | text-decoration | none | none |
| `a` | cursor | pointer | pointer |
| `a` | copy | `a.signIn.more` followed by `" ›"` | same |
| `a` | action | `redirectToUserProfile()` (Clerk hosted page) | same |
| more line `span` | display | none (`hidden`) | inline |
| more line | font-size | 12.5px | 12.5px |
| more line | color | `var(--fg-faint)` | same |
| more line | copy | `a.signIn.moreLine` | same |

### 1.6 Devices: sub-head, explain, loading, failed

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| sub-head `h3` (`SUB`) | margin | 0; margin-top 22px | same |
| `h3` | font-family / size / weight | `font-mono` / 10.5px / 500 | same |
| `h3` | text-transform | uppercase | uppercase |
| `h3` | letter-spacing | 0.14em | 0.14em |
| `h3` | color | `var(--fg-faint)` | same |
| `h3` | copy | `a.devices.head(n)`, n = number of sessions; while loading or failed the trailing `" · 0"` is stripped (head drawn without a count) | same |
| explain `p` | margin | 0; margin-top 6px | same |
| explain `p` | font-size / line-height | 13px / 1.55 | same |
| explain `p` | color | `var(--fg-muted)` | same |
| explain `p` | copy | `a.devices.explain` | same |
| loading `p` | condition | `getSessions()` in flight | same |
| loading `p` | role | `status` | same |
| loading `p` | margin | 0; margin-top 12px | same |
| loading `p` | display / align | flex / center | same |
| loading `p` | min-height | 44px | 44px |
| loading `p` | font-family / size | `font-mono` / 11px | same |
| loading `p` | color | `var(--fg-faint)` | same |
| loading `p` | copy | `a.devices.loading` | same |
| failed `p` | condition | `getSessions()` throws | same |
| failed `p` | role | `alert` | same |
| failed `p` | margin | 0; margin-top 6px | same |
| failed `p` | display / wrap / align | flex / wrap / center | same |
| failed `p` | min-height | 44px | 44px |
| failed `p` | column-gap | 4px | 4px |
| failed `p` | font-size / color | 13px / `var(--fg-muted)` | same |
| failed `p` | copy | `a.devices.readFailed` | same |
| Try again button | style | `LINKBTN` with padding-left/right 6px (overrides 10px) | same, min-height 32px |
| Try again | copy | `a.devices.retry` | same |
| Try again | action | re-runs `getSessions()` | same |

### 1.7 Devices: rows, glyphs, sign out, signing out

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| list `ul` | condition | sessions read succeeded | same |
| list `ul` | margin | 0; margin-top 6px | same |
| list `ul` | padding / list-style | 0 / none | same |
| row `li` | border-top between siblings | 1px solid `var(--border)` (`LI`) | same |
| row `li` | opacity | 0.55 while that device is signing out; else not set | same |
| row inner | recipe | `ROW` with align-items center (overrides flex-start) | same |
| glyph `svg` | aria | `aria-hidden` | same |
| glyph | width / height | 18px / 18px | same |
| glyph | viewBox | `0 0 24 24` | same |
| glyph | fill / stroke | none / `currentColor` | same |
| glyph | stroke-width | 1.6 | 1.6 |
| glyph | margin-top | 1px | 1px |
| glyph | flex | none | none |
| glyph | color | `var(--fg-muted)` | same |
| glyph, kind phone | paths | `<rect x="7" y="3" width="10" height="18" rx="2"/>` + `<path d="M11 18h2"/>` | same |
| glyph, kind tablet | paths | `<rect x="4" y="3" width="16" height="18" rx="2"/>` + `<path d="M11 18h2"/>` | same |
| glyph, kind desktop | paths | `<rect x="3" y="5" width="18" height="12" rx="1.5"/>` + `<path d="M2 20h20"/>` | same |
| text column | recipe | flex column, gap 2px, flex 1, min-width 0 | same |
| device name | style / copy | `B` / `a.devices.name(browser, device)` | same |
| meta line | style | `LINE` | same |
| meta, this device | rendering | `span` font-weight 500, color `var(--accent-text)`, copy `a.devices.thisDevice` | same |
| meta, other device active now | copy | `a.devices.activeNow` (when `ago === null`) | same |
| meta, other device | copy | `a.devices.lastActive(ago)` | same |
| meta suffix | content | literal `" · "` + place (city, country) | same |
| control, this device | rendering | — (no control) | — |
| Sign out button | condition | not this device, not pending | same |
| Sign out button | style | `LINKBTN`, margin-right -10px | same (min-height 32px) |
| Sign out button | aria-label | `a.devices.signOutAria(name)` | same |
| Sign out button | copy | `a.devices.signOut` | same |
| Signing out `span` | condition | that row pending | same |
| Signing out | display / align / flex | flex / center / none | same |
| Signing out | min-height | 44px | 32px |
| Signing out | padding-left / right | 10px / 10px | same |
| Signing out | font-family / size | `font-mono` / 11px | same |
| Signing out | color | `var(--fg-faint)` | same |
| Signing out | copy | `a.devices.signingOut` | same |
| sign-out failed | rendering | toast, role `alert`, copy `a.devices.failed`; the row returns | same |
| signed out | rendering | row leaves; toast role `status`, copy `a.devices.signedOut(name)` | same |
| sign-out-all | rendering | — (design call 5) | — |

### 1.8 Delete account row

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| wrapper `div` | margin-top | 22px | 22px |
| wrapper | border-top | 1px solid `var(--border)` | same |
| inner `div` | display / direction | flex / column | flex / row |
| inner | align-items | stretch (not set) | center |
| inner | gap | 12px | 24px |
| inner | padding-top | 14px | 14px |
| text column | recipe | flex column, gap 2px, flex 1, min-width 0 | same |
| label | style / copy | `B` / `a.del.label` | same |
| line | style / copy | `LINE` / `a.del.line` | same |
| button | type | `button` | same |
| button | width | full row width (stretched by the column; drawn full width) | content width (`flex-none`) |
| button | height | 44px | 36px |
| button | flex | none | none |
| button | padding-left / right | 16px / 16px | same |
| button | border-radius | 8px | 8px |
| button | border | 1px solid `var(--border-strong)` | same |
| button | background | transparent | transparent |
| button | font-family / size / weight | `font-sans` / 14px / 500 | `font-sans` / 13.5px / 500 |
| button | color | `var(--danger)` | same |
| button | cursor | pointer | pointer |
| button | copy | `a.del.open` | same |
| button | action | opens D1 | same |

## 2. Delete modal frame (`Frame` = SocialModal's markup; the build uses `SocialModal`)

| Element | Property | Mobile (sheet) | Desktop (440 dialog) |
|---|---|---|---|
| backdrop | role | `presentation` | same |
| backdrop | position | fixed, inset 0 | same |
| backdrop | z-index | 50 | 50 |
| backdrop | display / justify | flex / center | same |
| backdrop | align-items | flex-end | flex-start |
| backdrop | padding-top | — | 10dvh |
| backdrop | background | `color-mix(in oklab, var(--bg) 72%, transparent)` | same |
| dialog | role / aria-modal | `dialog` / `true` | same |
| dialog | display / direction | flex / column | same |
| dialog | width | 100% | 440px |
| dialog | overflow | hidden | hidden |
| dialog | border-radius | 20px 20px 0 0 | 14px |
| dialog | background | `var(--surface-raised)` | same |
| dialog | outline | none | none |
| dialog | border | top only: 1px solid `var(--border-strong)` | 1px solid `var(--border-strong)` all sides |
| dialog | box-shadow | `0 -20px 50px rgba(0,0,0,0.5)` | `0 30px 70px rgba(0,0,0,0.6)` |
| grabber | rendering | inherited: `SheetGrabber` (drawn on the phone) | inherited: `SheetGrabber` (not drawn at md) |
| head row | display / align | flex / center | same |
| head row | gap | 4px | 4px |
| head row | padding-left / right | 18px / 18px | 20px / 20px |
| head row | padding-top | not set | 12px |
| back `‹` | condition | D2 only | same |
| back | aria-label | `a.del.back` | same |
| back | width / height | 44px / 44px | 36px / 44px |
| back | margin-left | -12px | -10px |
| back | display / align / justify | flex / center / center | same |
| back | flex | none | none |
| back | padding | 0; padding-bottom 3px | same |
| back | border / background | 0 / transparent | same |
| back | font-size / line-height | 22px / 1 | same |
| back | color | `var(--fg)` | same |
| back | glyph | `‹` | same |
| back | action | `cancel()` of reverification; lands on D1 with the cancelled note | same |
| title `h2` | margin | 0 | 0 |
| title | font-family | `font-display` (boards render small caps; theme font) | same |
| title | font-size / weight | 18px / 700 | 19px / 700 |
| title | color | `var(--fg)` | same |
| title | flex / min-width | 1 / 0 | same |
| title | copy | D1 `a.del.title`; D2 `a.del.verifyTitle` | same |
| close `✕` | aria-label | `a.del.close` | same |
| close | width / height | 44px / 44px | 44px / 44px |
| close | margin-right | -10px | -10px |
| close | display / align / justify | flex / center / center | same |
| close | padding / border / bg | 0 / 0 / transparent | same |
| close | font-size | 15px | 15px |
| close | color | `var(--fg-muted)` | same |
| sub `p` | condition | D2 only (D1 passes no `sub`) | same |
| sub `p` | margin-left / right | 18px / 18px | 20px / 20px |
| sub `p` | margin-top / bottom | 0 / 14px | 0 / 14px |
| sub `p` | font-size / line-height | 13px / 1.5 | same |
| sub `p` | color | `var(--fg-muted)` | same |
| sub emphasis `b` (the email) | font-weight | 600 | 600 |
| sub emphasis | color | `var(--fg)` | same |
| sub emphasis | overflow-wrap | anywhere | anywhere |
| body | display / direction | flex / column | same |
| body | flex / min-height | 1 / 0 | same |
| body | overflow-y | auto | auto |
| body | padding-left / right | 18px / 18px | 20px / 20px |
| body | padding-bottom | 24px | 18px |

## 3. D1: Delete your account? (`DeleteScreen`)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| column | display / direction | flex / column | same |
| column | gap | 12px | 12px |
| column | padding-top | 2px | 2px |
| cancelled note `p` | condition | after ‹ on D2 | same |
| note | role | `status` | same |
| note | margin | 0 | 0 |
| note | font-family / size | `font-mono` / 11px | same |
| note | color | `var(--fg-muted)` | same |
| note | copy | `a.del.notDeleted` | same |
| intro `p` | margin | 0 | 0 |
| intro | font-size / line-height | 13.5px / 1.55 | same |
| intro | color | `var(--fg-body)` | same |
| intro | copy | `a.del.intro` | same |
| erased `ul` | margin | 0; margin-top -4px | same |
| erased `ul` | display / direction | flex / column | same |
| erased `ul` | gap | 3px | 3px |
| erased `ul` | padding / list-style | 0 / none | same |
| erased `li` | display / align | flex / baseline | same |
| erased `li` | gap | 10px | 10px |
| erased `li` | font-size / line-height | 13.5px / 1.5 | same |
| erased `li` | color | `var(--fg-body)` | same |
| erased `li` | copy | `a.del.erased[i]` (4 items), first character uppercased | same |
| erased marker `span` | aria | `aria-hidden` | same |
| marker | display | inline-block | same |
| marker | width / height | 5px / 5px | same |
| marker | flex | none | none |
| marker | transform | translateY(-2px) rotate(45deg) | same |
| marker | background | `var(--danger)` | same |
| pods `p` | margin | 0 | 0 |
| pods | font-size / line-height | 12.5px / 1.55 | same |
| pods | color | `var(--fg-muted)` | same |
| pods | copy | `a.del.pods` | same |
| split `ul` | condition | held plan > 0 or pack > 0 (`warnsBeforeDelete`); failed read draws none | same |
| split `ul` | margin / padding / list-style | 0 / 0 / none | same |
| split `ul` | display | flex | flex |
| split `ul` | overflow | hidden | hidden |
| split `ul` | border-radius | 10px | 10px |
| split `ul` | border | 1px solid `var(--border)` | same |
| split cell `li` | condition | plan cell when plan > 0; pack cell when pack > 0 | same |
| cell | display / direction | flex / column | same |
| cell | flex / min-width | 1 / 0 | same |
| cell | gap | 2px | 2px |
| cell | padding | 10px 12px | 10px 12px |
| cell | border-left | 1px solid `var(--border)`; first cell 0 | same |
| cell label | font-family / size / weight | `font-mono` / 10px / 500 | same |
| cell label | text-transform / letter-spacing | uppercase / 0.12em | same |
| cell label | color | `var(--fg-muted)` | same |
| cell label | copy | `c.plan` / `c.packs` | same |
| cell number | font-family / size / weight | `font-mono` / 20px / 600 | same |
| cell number | line-height | 1.15 | 1.15 |
| cell number | color | `var(--fg)` | same |
| cell number | data | held plan / held pack credits | same |
| cell sub | font-family / size | `font-mono` / 10.5px | same |
| cell sub | color | `var(--fg-muted)` | same |
| cell sub | white-space | normal (wraps, drawn on two lines) | nowrap |
| cell sub | copy | `c.planSub` / `c.packsSub` | same |
| says `p` | condition | split drawn | same |
| says `p` | margin | 0 | 0 |
| says `p` | font-size / line-height | 13.5px / 1.55 | same |
| says `p` | text-wrap | pretty | pretty |
| says `p` | color | `var(--fg-body)` | same |
| says `p` | copy | `a.del.heldSays(plan, pack)`, then `" " + a.del.plan` when a plan is live | same |
| plan line, no held credits | condition | `holdsPlan` with no held paid credits (clarification 4; not drawn) | same |
| plan line, no held credits | rendering | `a.del.plan` and the widened refund line, no split, in the slot of the says sentence (clarification 4) | same |
| refund `p` | condition | split drawn, or plan live (clarification 4) | same |
| refund `p` | margin | 0 | 0 |
| refund `p` | font-size / line-height | 12.5px / 1.55 | same |
| refund `p` | color | `var(--fg-muted)` | same |
| refund `p` | copy, plan live | `a.del.refundBefore` + `SupportLink` + `a.del.refundAfter` (clarification 8: `/copy-review` restores the "not used" condition) | same |
| refund `p` | copy, packs only | `c.refundBefore` + `SupportLink` + `c.refundAfter` | same |
| `SupportLink` | style | inherited: `SupportLink` (drawn underlined) | same |
| final `p` | margin | 0 | 0 |
| final | font-size / weight / line-height | 13.5px / 600 / 1.55 | same |
| final | color | `var(--fg)` | same |
| final | copy | `a.del.final` | same |
| word `label` | margin-top | 2px | 2px |
| word `label` | display / direction | flex / column | same |
| word `label` | text-align | left | left |
| word `label` | font-family / size / weight | `font-sans` / 13px / 600 | same |
| word `label` | color | `var(--fg)` | same |
| label text `span` | margin-bottom | 6px | 6px |
| label text | copy | `a.del.typeLabel` | same |
| word `input` | style | inherited: `field(filled, busy ? "held" : false)` (boards: accent edge once filled) | same |
| word `input` | attributes | `autoCapitalize="none"`, `autoComplete="off"`, `spellCheck={false}` (README call 7 also asks autocorrect off) | same |
| word `input` | match rule | `typed.trim().toLowerCase() === a.del.word` | same |
| error `p` | condition | failed delete or rate limited | same |
| error `p` | role | `alert` | same |
| error `p` | style | inherited: `SIGN_ERR`, plus margin-top -4px | same |
| error `p` | copy | `a.del.failed` or `a.del.tooMany`; the typed word is kept | same |
| pair `div` | margin-top | 4px | 4px |
| pair `div` | display / gap | flex / 8px | same |
| pair buttons (`PAIR_BTN`) | height | 44px | 40px |
| pair buttons | flex | 1 | 1 |
| pair buttons | border-radius | 8px | 8px |
| pair buttons | font-family / size | `font-sans` / 14px | `font-sans` / 13.5px |
| pair buttons | cursor | pointer; default when disabled | same |
| Keep | border | 1px solid `var(--border-strong)` | same |
| Keep | background | transparent | same |
| Keep | color | `var(--fg-body)` | same |
| Keep | disabled | while busy | same |
| Keep | copy | `a.del.keep` | same |
| Delete account | border | none | none |
| Delete account | background | `var(--danger)` | same |
| Delete account | font-weight | 600 | 600 |
| Delete account | color | `var(--bg)` | same |
| Delete account | disabled | word not matched, or busy | same |
| Delete account | opacity | 0.45 when word not matched; 0.6 when busy; else not set | same |
| Delete account | aria-busy | `true` when busy | same |
| Delete account | copy | `a.del.go`; `a.del.deleting` while busy | same |

## 4. D2: Confirm it's you (`VerifyScreen`)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| frame | title / back | `a.del.verifyTitle` / ‹ shown | same |
| sub, password account | copy | `a.del.verifyPassword(email)` (email as `b`) | same |
| sub, code account | copy | `a.del.verifyCode(email)`; email is the `email_code` factor's `safeIdentifier` (clarification 10) | same |
| sub, Google-only account | copy | `a.del.verifyGoogle(email)`; email = Google email (`safeIdentifier`) | same |
| `CONFIRM` press | box-sizing | border-box | same |
| `CONFIRM` | margin-top | 14px | 14px |
| `CONFIRM` | display / align / justify | inline-flex / center / center | same |
| `CONFIRM` | width | 100% | 100% |
| `CONFIRM` | height | 48px | 48px (no md variant) |
| `CONFIRM` | border-radius | 8px | 8px |
| `CONFIRM` | border | 0 | 0 |
| `CONFIRM` | background | `var(--danger)` | same |
| `CONFIRM` | font-family / size / weight | `font-sans` / 15px / 600 | same |
| `CONFIRM` | color | `var(--bg)` | same |
| `CONFIRM` | cursor | pointer; default when disabled | same |
| `CONFIRM` | opacity | 0.6 busy; 0.45 when empty or code not full; else not set | same |
| `CONFIRM` | copy | `a.del.confirm`; `a.del.deleting` while busy | same |

### 4.1 Password variant

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| wrapper | display / direction | flex / column | same |
| `label` | display / direction / align | flex / column / left | same |
| `label` | font-family / size / weight | `font-sans` / 13px / 600 | same |
| `label` | color | `var(--fg)` | same |
| label text `span` | margin-bottom / copy | 6px / `signInCopy.passwordLabel` | same |
| password `input` | style | inherited: `field(filled, busy ? "held" : false, error)`, error = line present and not busy (boards: `--danger` edge on wrong) | same |
| password `input` | content | the typed password, masked | same |
| error `p` | role / style | `alert` / inherited `SIGN_ERR` | same |
| error `p` | copy | `a.del.wrongPassword` or `a.del.tooMany` | same |
| `CONFIRM` | disabled | busy or nothing typed | same |
| links wrap | style | inherited: `LINKS` | same |
| code-instead button | style | inherited: `link(false)` | same |
| code-instead | copy | `signInCopy.codeInstead` | same |

### 4.2 Code variant (email code and Google)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| wrapper | display / direction | flex / column | same |
| wrapper | padding-top | 4px | 4px |
| `CodeBoxes` | style | inherited: `CodeBoxes` (six boxes) | same |
| `CodeBoxes` | props | `digits` = typed, `label="6-digit code"` (literal, no copy key), `wrong` = line present and line ≠ `a.del.tooMany`, `busy` | same |
| `CodeBoxes`, rate limited | wrong | false (boxes keep the code, no danger edge) | same |
| error `p` | role / style | `alert` / inherited `CODE_ERR` | same |
| error `p` | copy | `joinCopy.codeWrong` / `joinCopy.codeExpired` (shipped, per clarification 8) or `a.del.tooMany` | same |
| `CONFIRM` | disabled | busy or fewer than 6 digits | same |
| links wrap | style | inherited: `LINKS` | same |
| resend button | style | inherited: `link(cooling)` | same |
| resend | disabled | while cooling | same |
| resend | copy | `joinCopy.resendIn(cooling)` while cooling; else `joinCopy.resend` | same |
| code sent | timing | sent as D2 opens; shipped resend countdown | same |

## 5. Account menu after (sheet on the phone, popover at md)

| Element | Property | Mobile (`AccountSheet`) | Desktop (`AccountPopover`) |
|---|---|---|---|
| Manage account row | rendering | — (removed) | — (removed) |
| rows, in order | rendering | About, Take the tour, Settings, (Admin when admin), Sign out | same |
| all row styles | values | inherited: shipped account menu | same |
| retired copy | key | `shellCopy.accountMenu.manageAccount` | same |
| retired | parts | the menu's `DeleteWarning` path and held-credits read | same |

## 6. Landing after delete

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| route | rendering | `/` signed out, reached via `clerk.signOut({ redirectUrl: "/?deleted=1" })` (clarification 7) | same |
| toast | component / style | inherited: `ToastFrame` | same |
| toast | role | `status` | same |
| toast | copy | `accountCopy.deleted` | same |
| toast | bottom offset | 16px off the foot: the landing sets its own `--tabbar-h` (clarification 7; G6's "0 there" is wrong) | same |
| toast | horizontal | inherited: `ToastFrame` center slot (drawn full width less gutters on the phone, centered at md) | same |
| `?deleted=1` | after showing | stripped with `mirrorUrl` | same |
| goodbye page / banner | rendering | — | — |

## 7. Themes

All six themes are drawn for the section and D1 with credits. Every color above is a token, so no per-theme values. Tokens the proposal uses: `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint`, `--accent`, `--accent-text`, `--danger`, `--border`, `--border-strong`, `--surface-raised`, `--bg`.

## State Coverage

| State | Triggering condition | Component rendered | Key data required |
|---|---|---|---|
| Account section default | `/settings` | `AccountSection`: name row, email and sign-in row, devices list, delete row | display name (profile), primary email, sign-in methods, sessions |
| Password account | account's factors include password | email row methods line names password and email code | sign-in methods |
| Name editing | Change pressed | shipped name field in the name `li` (Cancel / Save) | current name (draft) |
| Name save failed | the write refuses | Friends' shipped toast | write result |
| Devices loading | `getSessions()` in flight | sub-head without count, explain, loading `p` (role status) | none |
| Devices read failed | `getSessions()` throws | sub-head without count, explain, failed `p` (role alert) + Try again | none |
| One device | only this session | one row, This device, no Sign out | sessions (1, current) |
| Device signing out | Sign out pressed | row at opacity 0.55, Signing out span in place of the button | session id, pending flag |
| Sign-out failed | revoke refuses | toast (`a.devices.failed`, role alert), row back to normal | revoke result |
| Signed out | revoke succeeds | row leaves; toast `a.devices.signedOut(name)` | session id, device name |
| Menu: Manage account removed | always | AccountSheet / AccountPopover without the row | none |
| D1 empty | Delete account… pressed | D1, Delete account at opacity 0.45, disabled | held credits, plan facts (server read) |
| D1 typed | word matches `delete` (any case, trimmed) | D1, Delete account live, field filled edge | typed word |
| D1 paid credits, plan subscriber | held plan + packs, plan live | split (two cells), says + plan line, widened refund line | `readHeldPaid` {plan, pack}, `readPlanFacts.holdsPlan` |
| D1 packs only | held packs, no plan | split (pack cell), says, shipped refund line (`c.refund*`) | `readHeldPaid` |
| D1 deleting | Delete account pressed inside Clerk's window | D1 busy: Keep disabled, Delete account `a.del.deleting`, opacity 0.6, field held | typed word, busy |
| D1 step-up cancelled | ‹ on D2 | D1 with note `a.del.notDeleted` (role status), word kept | none |
| D1 failed delete | delete refused or dropped | D1 with `a.del.failed` (role alert), word kept | error |
| D1 rate limited | our rule or Clerk's 429 | D1 with `a.del.tooMany` (role alert) | 429 |
| D2 password (empty, typed, wrong) | password account outside Clerk's window | D2 password field, Confirm and delete, code-instead link; wrong: danger field + `a.del.wrongPassword` | factor = password, account email |
| D2 email code (sent, wrong or expired) | code account outside Clerk's window | D2 six boxes, resend countdown; wrong: danger boxes + `joinCopy.codeWrong`/`codeExpired` | `email_code` factor `safeIdentifier`, cooldown |
| D2 Google account | Google-only account | D2 code variant with `a.del.verifyGoogle(email)` | Google email via `email_code` `safeIdentifier` (spike G3) |
| D2 deleting | Confirm and delete pressed | D2 busy: `CONFIRM` shows `a.del.deleting`, opacity 0.6, input held | busy |
| D2 rate limited | 429 | D2 with `a.del.tooMany`; boxes keep the code, no danger edge | 429 |
| Landing after delete | `/?deleted=1` | signed-out `/` with `ToastFrame` (`accountCopy.deleted`, role status) | `deleted` param |
| Removing the last sign-in method | no trigger in the app | not drawn | none |

## Contradictions between sources

1. **Methods line has no copy key.** The proposal renders ``Signs in with ${...}.`` as a literal, and the copy file's comment for `signIn` describes a different shape (`wren@example.com · Google`, joined with " and "). The boards draw the literal sentence. A copy key is needed before build.
2. **Tokens.** READINESS says the handoff uses only `--fg`, `--fg-muted`, `--accent-text`, `--danger`, `--border`, `--surface-raised`, `--bg`. The proposal also uses `--fg-body`, `--fg-faint`, `--accent` and `--border-strong` (Delete account outline, the Keep press, the dialog border).
3. **Autocorrect.** README call 7 says autocapitalize and autocorrect off. The proposal sets `autoCapitalize="none"`, `autoComplete="off"` and `spellCheck={false}`, but no `autoCorrect`.
4. **Plan line without credits.** The proposal draws the plan line only inside the split. Clarification 4 (binding) draws it whenever a plan is live, with or without credits.
5. **Widened refund line.** It drops the shipped "and not used it" condition. Clarification 8 sends it to `/copy-review`.
6. **Toast foot.** G6 says `--tabbar-h` is 0 on the landing. Clarification 7 says it is 74px app-wide, so the landing must set its own value.
7. **G6 full load vs signOut redirect.** Clarification 7 replaces it with `signOut({ redirectUrl })`.
8. **Failed-delete caption.** It names `user.delete()`. Clarification 1 rules a server action.
9. **G2 and G5 reads.** The handoff's "already sets firstName" and "`heldPaidAction`'s read" are both wrong. Clarifications 2 and 4 rule.
10. **Resend while deleting.** In the D2 busy board (`amonkhet-p-d2-busy`) the resend link is live ("Send a new code") while Deleting… runs. The source does not disable resend when busy.
11. **CodeBoxes label.** It is a hard-coded `"6-digit code"`, not a copy key.
12. **Fixture difference.** In the desktop section boards Chrome on Mac is this device, and on the phone Safari on iPhone is. These are fixtures, not a rule.
