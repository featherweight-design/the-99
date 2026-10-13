# Property table — Branded user menu (#35 design / #13 eng)

ENUMERATE pass. Derived **only** from `design/design_handoff_the99_user_menu/README.md`,
`READINESS.md`, and `The 99 - User Menu.dc.html`. No implementation source was read.

**Correction precedence:** where READINESS.md issues an eng-side correction, the corrected value is
authoritative and the superseded handoff value is shown struck through / parenthesised with the
correction number (`READINESS §1`–`§6`).

Source keys: `RM:n` = README line, `CV§n` = canvas section, `CV:n` = canvas line, `RD§n` = READINESS
eng-side item.

---

## 1 · Surfaces

| # | Surface | Background | Border | Radius | Padding | Shadow | Width / Height | z-index | Position / anchor | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Trigger — idle (all 3 sites) | `--bg` `#14110E` | `1px solid --brass #C9A24B` | `12px` | none (content centred); **3px outer pad ring** on wrapper → 44×44 hit area | none | `38×38` visual box; 44×44 hit area | — | rail foot (`mt-auto`, row pad `14px 12px`); mobile header top-right | RM:123, RM:45, CV:89, CV:147, CV:149 |
| S2 | Trigger — hover / pressed | `--surface-raised` `#221D16` | `1px solid --brass-hover #D8B25E` | `12px` | as S1 | none | `38×38` | — | as S1 | RM:125, CV:103, CV:157 |
| S3 | Trigger — focus-visible | as current state (`--bg` when idle) | `1px solid --brass` + `outline 2px solid --brass`, `outline-offset 2px` (global ring, unmodified) | `12px` | as S1 | none | `38×38` | — | as S1; last tab stop in rail; ring clears rail border by 8px at the 12px gutter | RM:75, RM:126, CV:117, CV:167, CV:169. Ring lives at `globals.css:133-135` (**RD§4**; handoff's `globals.css:130` is wrong) |
| S4 | Trigger — open | `--elevated` `#2A241D` | `1px solid --brass-hover #D8B25E` | `12px` | as S1 | none | `38×38` | — | as S1 | RM:126, CV:131, CV:178, CV:224 |
| S5 | Popover container (desktop only) | `--surface-raised` `#221D16` | `1px solid --border-strong #3A3229` | `14px` | `8px` (all sides; bottom pad of panel comes from this — last item flush) | `0 20px 50px rgba(0,0,0,0.6)` | `width:216px`; height auto | `20` | `position:absolute; left:12px; width:216px; bottom:calc(100% + 8px)` — supersedes `left:12px;right:12px;bottom:calc(100% - 6px)` | RM:22, RM:49-52, RM:127, RM:56-60, CV:210, CV:246-248 |
| S6 | Popover — top-anchored flip variant | as S5 | as S5 | as S5 | as S5 | as S5 | `216px` | `20` | `top:calc(100% + 8px)`, right-aligned to trigger, diamond above panel | **DO NOT IMPLEMENT — RD§3**: no trigger site resolves to a top-anchored popover (desktop `/commanders` header has no trigger; both mobile triggers open the sheet). Specified at RM:54, CV:254; skip the branch. |
| S7 | Popover backdrop | **none** — no backdrop, no blur on desktop | — | — | — | — | — | — | "This is a menu, not a modal." | RM:52, RM:134, CV:189, CV:236 |
| S8 | Bottom sheet container (mobile) | `var(--surface)` `#1E1A15` — **RD§2**: handoff gives bare hex `#1E1A15` with no token; `--surface` exists at `globals.css:10` and must be used | `border-top: 1px solid --border-strong #3A3229` (no side/bottom borders) | `20px 20px 0 0` | `20px 20px 26px`; the `26px` bottom pad sits **on top of** `env(safe-area-inset-bottom)`, not instead of it | none stated (INFERRED: none) | `left:0; right:0` full-width; height auto | `9` | `position:absolute/fixed; left:0;right:0;bottom:0`; sits above the tab bar's stacking context | RM:130, RM:221 (READINESS inherited 13), CV:297, CV:316 |
| S9 | Sheet backdrop (mobile only) | `rgba(8,6,4,0.72)` — **RD§5** correction; handoff says `rgba(10,8,6,0.72)` (RM:105, RM:134, CV:133, CV:295), a value present nowhere in `src/`. Shipped modals use `rgba(8,6,4,0.72)`. | — | — | — | — | `inset:0` (full viewport) | `8` (below sheet's `9`) | Covers the tab bar; the tab bar is covered by the backdrop, not by the sheet | RM:134, CV:274, CV:295, RD§5 |
| S10 | `<UserProfile/>` `modalBackdrop` | `rgba(8,6,4,0.72)` — **RD§5** (handoff: `rgba(10,8,6,0.72)`) | — | — | — | — | `inset:0` | INFERRED: Clerk's own | Centred content | CV:579, CV:362, RD§5 |
| S11 | `<UserProfile/>` `modalContent` | — | — | `16px` desktop; **radius dropped** on mobile (Clerk full-bleed under ~640px) | — | — | — | — | — | CV:580, CV:414, CV:465 |
| S12 | `<UserProfile/>` `cardBox` | `--surface` `#1E1A15` | `1px --border-strong #3A3229` | `16px` | (owned by cardBox; `card` is transparent `padding 0`) | `0 40px 100px rgba(0,0,0,0.7)` | `860×560` centred (desktop max) | — | Matches Issue Inspector dialog shell | CV:581-582, CV:363, CV:414 |

---

## 2 · Elements within each surface

### 2a · Trigger (S1–S4) — identical at all three call sites

| # | Element | Typography | Colour | Spacing | Size | States |
|---|---|---|---|---|---|---|
| E1 | Avatar initials ("AR") | IBM Plex Mono, `13px`; weight not stated (INFERRED: 400) ; line-height not stated | idle `--brass #C9A24B`; hover/pressed `--brass-hover #D8B25E`; open `--brass-hover` | centred (`display:flex; align-items:center; justify-content:center`) | within the 38px box | idle / hover / pressed / focus-visible / open — see S1–S4. `aria-hidden` | RM:123-126, CV:89/103/117/131 |
| E2 | Hit-area pad ring | — | transparent | `padding: 3px` on all sides | 38 + 3+3 = 44×44 | Applies "on both mobile sites" (RM:45); mock draws `padding:3px` on the mobile header wrapper. Desktop rail wrapper draws `padding:14px 12px` (idle/hover/focus) and `padding:10px 12px 14px` (open). | RM:45-47, CV:89, CV:147, CV:178 |
| E3 | Brass diamond marker (open, **desktop only**) | — | `--brass #C9A24B` | `6px` above the trigger; centred on the trigger (mock: container `width:62px; padding-left:12px; justify-content:center`) | `4×4`, `transform: rotate(45deg)` | Only in the **open** state, and only where the panel is adjacent — **no diamond on the mobile sheet** | RM:62-66, RM:126, CV:177, CV:180, CV:223 |

### 2b · Popover (S5)

| # | Element | Typography | Colour | Spacing | Size | States |
|---|---|---|---|---|---|---|
| E4 | Identity header row | — | — | `padding: 12px 12px 14px`; `gap: 12px`; `border-bottom: 1px solid --border #2A241D` | — | Not a menu item, not focusable, no hover | RM:128, CV:211 |
| E5 | Header avatar | IBM Plex Mono `14px` | `--brass #C9A24B` on `--bg #14110E`, `1px solid --brass` border | `flex:none` | `44×44`, radius `12px` | static | RM:128, CV:212 |
| E6 | Name — "Ana Ruiz" | IBM Plex Sans, weight `600`, `14px`; line-height not stated | `--fg #EDE6D8` | in `min-width:0` column | truncates: `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` | static; no tooltip specced | RM:128, RM:183, CV:214 |
| E7 | Email — "ana.ruiz@example.com" | IBM Plex Mono `11px` | **`--fg-muted #A89B84`** — **RD§1** correction. Handoff says `--fg-faint #8E8269` (RM:128, CV:215), which is **4.42:1** on `--surface-raised` and fails SC 1.4.3 at 11px. `--fg-muted` = **8.48:1**. Do **not** fix by enlarging the text. | `margin-top: 2px` | truncates (ellipsis) | static; no tooltip | RM:128, CV:215, RD§1 |
| E8 | Menu item — "Manage account" | `14px` (family INFERRED Plex Sans, weight INFERRED 400) | label `--fg #EDE6D8` | `padding: 11px 12px`; `gap: 11px`; items `gap: 2px` in a column; list `padding-top: 6px` | radius `8px` | idle transparent; **hover `--elevated #2A241D`**; focus = roving `role=menuitem` (first focus on open); active/pressed not specced | RM:129, CV:218-219 |
| E9 | — its diamond marker | — | `--brass #C9A24B` | `flex:none`, `gap:11px` from label | `6×6`, rotate 45° | `aria-hidden` | RM:129, CV:219, CV:534 |
| E10 | Menu item — "Sign out" | `14px` | label stays `--fg #EDE6D8` (**not** danger-coloured) | `padding: 11px 12px` | radius `8px` | idle transparent; hover `--elevated`; last item flush to the container's 8px bottom pad | RM:129, RM:148-149, CV:220 |
| E11 | — its danger diamond | — | `--danger #C6533F` | `flex:none` | `6×6`, rotate 45° | `aria-hidden`; carries the destructive signal alongside the literal words | RM:129, CV:220 |
| E12 | Footer / `SECURED BY CLERK` caption | — | — | — | — | **DELETED, not restyled**; its `14px` top margin goes with it. Nothing replaces it. | RM:20, RM:56-60, CV:248, READINESS inherited 1 & 7 |

### 2c · Bottom sheet (S8)

| # | Element | Typography | Colour | Spacing | Size | States |
|---|---|---|---|---|---|---|
| E13 | Drag handle | — | `--border-strong #3A3229` | `margin: 0 auto 20px` (20px below it) | `40×4`, radius `2px` | Decorative only: `aria-hidden="true"`, **no pointer handlers, no `cursor:grab`**, no drag-to-dismiss | RM:133, RM:68-72, CV:298, CV:321 |
| E14 | Identity header row | — | — | `gap: 14px`; `padding-bottom: 18px`; `border-bottom: 1px solid --border #2A241D` | — | not focusable, not a menu item | RM:131, CV:299 |
| E15 | Sheet avatar | IBM Plex Mono `15px` | `--brass` on `--bg #14110E`, `1px solid --brass` | `flex:none` | `48×48`, radius `14px` | static | RM:131, CV:300 |
| E16 | Sheet name | Plex Sans `600` / `16px` | `--fg #EDE6D8` | in `min-width:0` column | truncates (ellipsis) | static | RM:131, CV:302 |
| E17 | Sheet email | IBM Plex Mono `12px` | `--fg-faint #8E8269` — **passes at 4.57:1 on `#1E1A15`**, so leave as specified. RD§1 notes `--fg-muted` is also safe here if one value across both panels is preferred. | `margin-top: 2px` | truncates | static | RM:131, CV:303, RD§1 |
| E18 | Sheet item — "Manage account" | `15px` | `--fg #EDE6D8` | `padding: 15px 6px` → **~52px** tall; `gap: 12px` | — | first item has **no** top divider; first focus target | RM:132, CV:306 |
| E19 | Sheet item — "Sign out" | `15px` | label `--fg`; marker `--danger #C6533F` | `padding: 15px 6px`; `border-top: 1px solid --border #2A241D` | ~52px | rows divided by `1px --border` | RM:132, CV:307 |
| E20 | Sheet item diamonds | — | `--brass` (manage) / `--danger` (sign out) | `flex:none` | `6×6`, rotate 45° | `aria-hidden` | RM:132, CV:306-307, CV:534 |
| E21 | Sheet diamond marker above trigger | — | — | — | — | **Absent by design** — the sheet is not adjacent to the trigger | RM:65-66, CV:135 |

### 2d · `<UserProfile/>` themed modal — `appearance` map (44 enumerated elements)

> **Retired 2026-10-12 (Hugh, speed plan).** *Manage account* now calls `clerk.redirectToUserProfile()` and opens Clerk's hosted account page, and the app loads none of Clerk's prebuilt UI (`prefetchUI={false}`), so this map, S10, S11, S12, N14, N17, N18, X14, the T9+ Clerk strings and ambiguities 13 and 18 describe nothing that renders. The hosted page is themed in Clerk's dashboard; the values below are the reference for that.

`appearance.variables` base pass (16 keys), CV:559-576:

| # | Key | Value |
|---|---|---|
| V1 | `colorPrimary` | `--brass #C9A24B` |
| V2 | `colorBackground` | `--surface #1E1A15` |
| V3 | `colorText` | `--fg #EDE6D8` |
| V4 | `colorTextSecondary` | `--fg-muted #A89B84` |
| V5 | `colorTextOnPrimaryBackground` | `--bg #14110E` |
| V6 | `colorInputBackground` | `--surface-sunken #181410` |
| V7 | `colorInputText` | `--fg #EDE6D8` |
| V8 | `colorNeutral` | `--fg-faint #8E8269` |
| V9 | `colorDanger` | `--danger #C6533F` |
| V10 | `colorSuccess` | `--success #6FA368` |
| V11 | `colorWarning` | `--warning #E0913C` |
| V12 | `colorShimmer` | `rgba(201,162,75,0.10)` |
| V13 | `fontFamily` | `var(--font-plex-sans)` |
| V14 | `fontFamilyButtons` | `var(--font-plex-sans)` |
| V15 | `fontSize` | `14px` |
| V16 | `borderRadius` | `8px` |

`appearance.elements` (CV:578-622). Group colours in the mock are canvas chrome only.

| # | Clerk element | Tokens / values | Note |
|---|---|---|---|
| M1 | `rootBox` | `width 100%; font-family var(--font-plex-sans)` | Resets Clerk's default width clamp |
| M2 | `modalBackdrop` | `rgba(8,6,4,0.72)` — **RD§5** (canvas says `rgba(10,8,6,0.72)`) | Same value as sheet backdrop + card-detail modal |
| M3 | `modalContent` | `radius 16px` | Desktop only; mobile full-bleed, radius dropped |
| M4 | `cardBox` | `bg --surface #1E1A15; border 1px --border-strong #3A3229; radius 16px; shadow 0 40px 100px rgba(0,0,0,.7)` | Matches Issue Inspector dialog shell |
| M5 | `card` | `background transparent; padding 0` | cardBox owns the surface; must not double |
| M6 | `scrollBox` | `background transparent` | Scroll region only |
| M7 | `navbar` | `bg --surface-rail #1A160F; border-right 1px --border-strong #3A3229` | Reads as the app rail |
| M8 | `navbarButton` | `color --fg-muted #A89B84; font-weight 500; radius 8px; hover bg --elevated-hover #211C15` | Same geometry as a rail nav item |
| M9 | `navbarButton__active` | `bg --elevated #2A241D; color --fg #EDE6D8; font-weight 600` | Shell active nav, verbatim |
| M10 | `navbarButtonIcon` | `--brass #C9A24B` active / `--border-strong #3A3229` idle | Glyph stays Clerk's |
| M11 | `navbarMobileMenuButton` | `color --fg-muted; border 1px --border-strong; radius 8px` | Mobile disclosure inside the modal |
| M12 | `header` | `padding 0 0 18px; border-bottom 1px --border #2A241D` | Same divider weight as popover header |
| M13 | `headerTitle` | `var(--font-cinzel); 700; 22px; color --fg` | Cinzel is the heading voice |
| M14 | `headerSubtitle` | `var(--font-plex-mono); 11.5px; --fg-faint #8E8269` | Mono meta |
| M15 | `breadcrumbs` | `var(--font-plex-mono); 11px` | Nested panels (email, MFA) |
| M16 | `breadcrumbsItem` | `--fg-faint`; current `--fg-body #C6B79A` | Current crumb readable |
| M17 | `profileSection` | `border-bottom 1px --border #2A241D; padding 18px 0` | One recipe for profile / email / password / sessions / MFA |
| M18 | `profileSectionTitleText` | `var(--font-cinzel); 600; 15px; --fg` | 15px, **not** 22px |
| M19 | `profileSectionContent` | `--fg-body #C6B79A; 13.5px; line-height 1.6` | Body ramp |
| M20 | `profileSectionPrimaryButton` | `bg transparent; color --brass; 600; hover bg --elevated` | Quiet; brass fill reserved for one primary per panel |
| M21 | `accordionTriggerButton` | `color --fg; radius 8px; hover bg --elevated-hover` | Connected accounts, sessions |
| M22 | `accordionContent` | `bg --surface-sunken #181410; radius 8px` | Inset |
| M23 | `activeDeviceIcon` | `color --fg-faint` | Sessions list |
| M24 | `badge` | `bg rgba(201,162,75,.14); color --brass; var(--font-plex-mono); 10.5px; radius 999px` | "Primary" / "Verified" pills |
| M25 | `formFieldLabel` | `12.5px; 600; --fg-muted` | Above the input, never floating |
| M26 | `formFieldInput` | `bg --surface-sunken #181410; border 1px --border-strong #3A3229; radius 8px; height 40px; color --fg; focus border --brass + ring 0 0 0 3px rgba(201,162,75,.16)` | Issue Inspector filter input, verbatim |
| M27 | `formFieldHintText` | `var(--font-plex-mono); 11px; --fg-faint` | Mono hints |
| M28 | `formFieldErrorText` | `--danger #C6533F; 12px` | Paired with a Clerk icon — colour not the only signal |
| M29 | `formFieldSuccessText` | `--success #6FA368; 12px` | Same rule |
| M30 | `formFieldAction` | `--brass; 600` | Inline links |
| M31 | `formButtonPrimary` | `bg --brass #C9A24B; color --bg #14110E; 600; radius 8px; padding 12px 26px; hover bg --brass-hover #D8B25E` | **One per panel** |
| M32 | `formButtonReset` | `bg transparent; border 1px --border-strong; color --fg-muted; radius 8px; hover border --brass` | Secondary / Cancel |
| M33 | `avatarBox` | `radius 12px; border 1px --brass` | 12px at every size Clerk renders |
| M34 | `avatarImageActionsUpload` | `--brass; 600` | "Upload" action text |
| M35 | `fileDropAreaBox` | `bg --surface-sunken; border 1.5px dashed --border-dashed #4A4033; radius 12px; hover border --brass, bg --surface-inset #1C1712` | Collection CSV dropzone, verbatim |
| M36 | `fileDropAreaIconBox` | `--brass; border 1px --brass; radius 999px` | Brass ring from the dropzone |
| M37 | `dividerLine` | `bg --border #2A241D` | Hairline |
| M38 | `dividerText` | `var(--font-plex-mono); 10px; letter-spacing 0.08em; --fg-faint; uppercase` | Divider voice |
| M39 | `alert` | `bg --surface-sunken; border-left 3px; radius 8px` | Left border carries `--danger` / `--warning` / `--success` |
| M40 | `alertText` | `--fg-body #C6B79A; 13px` | Body ramp |
| M41 | `menuButton` | `--fg-muted; radius 8px; hover bg --elevated-hover` | Row overflow menus |
| M42 | `menuList` | `bg --surface-raised #221D16; border 1px --border-strong; radius 14px; shadow 0 20px 50px rgba(0,0,0,.6)` | Deliberately the account popover container |
| M43 | `menuItem` | `14px; --fg; padding 11px 12px; radius 8px; hover bg --elevated; destructive color --fg with --danger marker` | Matches popover item metrics |
| M44 | `footer` | `display none` | Decision 1. **Eng/legal to confirm** the plan permits hiding `<UserProfile/>` branding; the dev-instance badge is separate and untouched (gap 1) |
| M45 | `footerActionLink` | `--brass; hover --brass-hover` | Only if footer is restored |

---

## 3 · Named states

| # | State | Surface | Trigger condition | Visual change | Source |
|---|---|---|---|---|---|
| N1 | Trigger · **idle** | trigger | default | `--bg` fill, `1px --brass` border, `--brass` initials | RM:123, CV:82 |
| N2 | Trigger · **hover / pressed** | trigger | pointer hover or active press (one combined state) | fill → `--surface-raised`; border + initials → `--brass-hover`; **120ms colour transition only, no scale** | RM:125, CV:96, CV:106 |
| N3 | Trigger · **focus-visible** | trigger | keyboard focus | global ring `2px solid --brass`, `outline-offset 2px`; no bespoke override; the 3px pad ring keeps the outline off the header border | RM:75, RM:126, CV:110, CV:120 |
| N4 | Trigger · **open** | trigger | panel or sheet open | fill → `--elevated`; border → `--brass-hover`; `aria-expanded="true"`; **4px brass diamond 6px above (desktop only)** | RM:126, CV:124, CV:135, CV:173, CV:180 |
| N5 | **Popover open** | popover | desktop (`md:` and up) trigger activated | panel appears 8px above the trigger, left-aligned, 216px; page behind untouched, no backdrop, no blur | RM:49-52, CV:188-189 |
| N6 | **Bottom sheet open** | sheet + backdrop | mobile (below `md:`) trigger activated | backdrop fades in; sheet slides up from bottom edge; sheet above tab-bar stacking context, tab bar covered by backdrop | RM:30, CV:273-274 |
| N7 | **Menu item hover** | popover item | pointer hover | `background: --elevated #2A241D`, radius 8px | RM:129, CV:219 |
| N8 | **Menu item focus (roving)** | popover / sheet item | `↑ ↓` or open | roving focus between the two `role=menuitem` children; wraps | RM:147, CV:261 |
| N9 | **First-focus on open** | both panels | panel opens by any means | focus lands on *Manage account* (no close button, no filter) | RM:138-139, CV:513 |
| N10 | **Closed via Escape** | both | `ESC` | panel/sheet removed **instantly** (closing is instant in both motion modes); focus returns to trigger | RM:87, RM:140, CV:263 |
| N11 | **Closed via outside-click** | popover | click outside the panel | same path as Escape | RM:140, CV:263 |
| N12 | **Closed via backdrop tap** | sheet | tap the backdrop | same path; focus returns to trigger | RM:140, CV:514 |
| N13 | **Closed via Android hardware back** | sheet | hardware back button | same path; focus returns to trigger | RM:72, RM:140, CV:514 |
| N14 | **`<UserProfile/>` open (trap handoff)** | modal | *Manage account* activated | menu dismisses; focus trap handed to Clerk's modal; on its close focus returns to the **trigger**, not to the dismissed menu | RM:141-142, CV:515 |
| N15 | **Responsive — desktop (`md:` and up)** | rail trigger → popover | viewport ≥ `md:` | avatar-only trigger at rail foot; popover; diamond marker present; no backdrop | RM:52, RD§3, CV:139 |
| N16 | **Responsive — mobile (below `md:`)** | header trigger → sheet | viewport < `md:` | same 38px trigger in the mobile header (both sites); bottom sheet; **no diamond**; backdrop present; 44×44 hit area | RM:27-31, RM:45, RD§3 |
| N17 | **Responsive — `<UserProfile/>` desktop** | modal | ≥ ~640px | centred `860×560` card, `modalContent` radius 16px, Clerk left nav rail-styled | RM:107-109, CV:347, CV:414 |
| N18 | **Responsive — `<UserProfile/>` mobile** | modal | < ~640px | full-bleed, radius dropped, left nav collapses to `navbarMobileMenuButton` | RM:107-109, CV:418, CV:465 |
| N19 | **Reduced motion** | popover + sheet + backdrop | `prefers-reduced-motion: reduce` | both surfaces appear at final position, fully opaque, no fade; `animation: none` | RM:86-87, CV:25-27, CV:331 |
| N20 | **Long name / long email overflow** | both identity headers | text exceeds available width | truncates with ellipsis at 216px; **no tooltip specced** | RM:183, CV:214-215, CV:302-303 |
| N21 | Trigger · **top-anchored popover flip** | popover | (specified) top-anchored trigger | `top:calc(100% + 8px)`, right-aligned, diamond above panel | **Unreachable — do not implement (RD§3)** |

---

## 4 · Strings

| # | String (verbatim) | Where it appears | Source |
|---|---|---|---|
| T1 | `Manage account` | Popover menu item 1; sheet menu item 1; keyboard note "focus moves to *Manage account*" | RM:114, CV:219, CV:306, CV:513 |
| T2 | `Sign out` | Popover menu item 2; sheet menu item 2 | RM:114, CV:220, CV:307 |
| T3 | `Account: Ana Ruiz` | Trigger's accessible name (`aria-label`); colon; "Ana Ruiz" is the account holder's name | RM:145, CV:265, CV:532 |
| T4 | `Ana Ruiz` | Popover + sheet identity name line; also `<UserProfile/>` profile row. **Fabricated mock identity** — real value comes from the session | RM:169, CV:214, CV:302 |
| T5 | `ana.ruiz@example.com` | Popover + sheet identity email line; `<UserProfile/>` email section. **Fabricated** | RM:169, CV:215, CV:303 |
| T6 | `AR` | Avatar initials, all sizes. **Fabricated**; `aria-hidden` | RM:169, CV:89, CV:212, CV:300 |
| T7 | `SECURED BY CLERK` | **Does not ship.** Every occurrence in README/canvas is prose describing the deletion | RM:20, READINESS inherited 1 |
| T8 | Sheet `aria-label` | Not given verbatim — spec says "a label pointing at the name" | CV:534, RM:147 |

Copy externalizes to `src/lib/copy/shell.ts` alongside the other shell strings (RM:115, RM:166).
Strings T9+ below belong to the themed `<UserProfile/>` modal and are **Clerk's own copy**, reproduced
in the mock, not authored by us: `Account`, `Profile`, `Security`, `Profile details`,
`Manage your account information`, `Update profile`, `Email addresses`, `Primary`,
`+ Add email address`, `Connected accounts`, `Google · ana.ruiz@example.com`, `Verified`, `Save`
(CV:366-458).

---

## 5 · Motion

| # | Name | Applies to | Duration | Easing | Properties animated | Reduced-motion fallback | Source |
|---|---|---|---|---|---|---|---|
| A1 | `.anim-menu-in` | popover | `120ms` | `ease-out` | `opacity: 0 → 1` **plus** a 4px rise (`transform: translateY(4px) → translateY(0)`); `both` fill mode | `animation: none` — appears at final position, fully opaque, no fade | RM:80-81, CV:21, CV:23, CV:328 |
| A2 | `.anim-sheet-up` | bottom sheet | `180ms` | `cubic-bezier(0.22, 1, 0.36, 1)` | `transform: translateY(100%) → translateY(0)`; `both` fill mode | `animation: none` — final position, opaque, no slide | RM:82-83, CV:22, CV:24, CV:329 |
| A3 | Backdrop cross-fade | sheet backdrop | `180ms` (same duration as A2) | not stated (INFERRED: matches A2) | opacity cross-fade | not stated explicitly; covered by "both surfaces appear … no fade" | RM:83, CV:329, CV:331 |
| A4 | Trigger colour transition | trigger | `120ms` | not stated (INFERRED: default/ease) | colour only — background, border, initials. **No scale.** | not stated (INFERRED: unaffected) | RM:125, CV:106 |
| A5 | Closing | all surfaces | **instant, in both motion modes** — no exit animation | — | — | — | RM:87, CV:331 |

Both utility names join the existing `prefers-reduced-motion: reduce` block at `globals.css:166-173`
(verified correct by READINESS), following its **explicit-fallback** pattern, not a blanket rule
(RM:85-87, CV:330).

---

## 6 · Accessibility contract

| # | Requirement | Detail | Source |
|---|---|---|---|
| X1 | Trigger element | native `<button>` | RM:144, CV:531 |
| X2 | Trigger ARIA | `aria-haspopup="menu"`, `aria-expanded` (true when open), `aria-controls` (points at the panel) | RM:144, CV:531 |
| X3 | Trigger accessible name | `"Account: Ana Ruiz"` — the person, not the glyphs | RM:145, CV:532 |
| X4 | Initials hidden | avatar initials `aria-hidden` | RM:145, CV:532 |
| X5 | Panel role | `role="menu"` with exactly two `role="menuitem"` children | RM:146, CV:533 |
| X6 | Identity header semantics | not a menu item, **not focusable** | RM:128, CV:533 |
| X7 | Sheet extra ARIA | `aria-modal="true"` plus a label pointing at the name | RM:147, CV:534 |
| X8 | Decorative elements hidden | drag handle `aria-hidden="true"`; **all** diamonds (`aria-hidden`), including the open-state marker | RM:64, RM:133, CV:180, CV:534 |
| X9 | Focus trap | active for the whole open lifetime, **both** viewports; TAB cannot walk into the page behind | RM:137, CV:262, CV:512 |
| X10 | First focus | *Manage account* (first item) — on `↵` / `␣` open | RM:138-139, CV:260, CV:513 |
| X11 | Roving focus | `↑ ↓` move between the two items and **wrap** | RM:147, CV:261 |
| X12 | Escape | closes and returns focus to the trigger | RM:140, CV:263 |
| X13 | Outside-click / backdrop tap / Android hardware back | all take the same close-and-restore-focus path as Escape | RM:140, CV:263, CV:514 |
| X14 | Clerk modal trap handoff | opening `<UserProfile/>` hands the trap to Clerk; on close focus returns to the **trigger**, not the dismissed menu | RM:141-142, CV:515 |
| X15 | Touch target | visual box 38px, hit area padded to **44×44** on both mobile sites; sheet rows ~52px tall (over 44px) | RM:45, RM:132, CV:59, CV:316 |
| X16 | Not colour alone (SC 1.4.1) | Sign out is signalled by the literal words + the danger diamond; the label stays `--fg` | RM:148-149, CV:525 |
| X17 | Contrast — initials `--brass` on `--bg` | **7.84:1** (**RD** correction; handoff claims 7.4:1) — passes | RM:150, CV:521, READINESS table |
| X18 | Contrast — item label `--fg` on `--surface-raised` | **13.47:1** (handoff claims 11.9:1) — passes AAA | RM:151, CV:522, READINESS table |
| X19 | Contrast — popover email | Handoff claims `--fg-faint` = 4.6:1 AA; actual **4.42:1, FAILS AA** at 11px. **Use `--fg-muted #A89B84` = 8.48:1** (**RD§1**) | RM:151, CV:523, RD§1 |
| X20 | Contrast — sheet email | `--fg-faint` on `--surface` `#1E1A15` = **4.57:1**, passes; may stay as specified | RD§1 |
| X21 | Contrast — focus ring `--brass` vs `--surface-rail` | **7.51:1** (handoff claims 6.6:1) — passes | RM:152, CV:524, READINESS table |
| X22 | Focus ring source | global `:focus-visible` at `globals.css:133-135` (`outline: 2px solid var(--brass)`, `outline-offset: 2px`); **no override**. Handoff's `globals.css:130` citation is wrong (**RD§4**) | RM:75, CV:64, RD§4 |
| X23 | Safe area | sheet's `26px` bottom padding is **additive** to `env(safe-area-inset-bottom)` | RM:130, CV:316 |
| X24 | Clerk error signalling | `formFieldErrorText` / `formFieldSuccessText` are paired with a Clerk icon — colour is not the only signal | CV:605-606 |

---

## 7 · Ambiguities / gaps

Unresolved here by design — an implementer would have to guess. Not resolved in this pass.

1. **Font weight and line-height of the initials.** `IBM Plex Mono 13px` (trigger) / `14px` (popover
   avatar) / `15px` (sheet avatar) / `16px` (`<UserProfile/>` 56px avatar) are given with no weight and
   no line-height.
2. **Menu-item label font family and weight.** Popover items are `font-size:14px; color:#EDE6D8` with
   no `font-family` and no `font-weight` in the mock — inherits the page's Plex Sans 400. Sheet items
   likewise at 15px. Rail nav items nearby explicitly carry `font-weight:500`, so the omission may be
   intentional or an oversight.
3. **Active / pressed state for menu items.** Hover (`--elevated`) is specified; there is no
   `:active`, no keyboard-focus visual for the roving `menuitem` (the global focus ring's behaviour on
   an item with `tabindex="-1"` roving focus is not stated), and no distinction between
   pointer-hover and roving-focus highlight.
4. **Popover `transition` for item hover.** The trigger gets an explicit 120ms colour transition;
   menu-item hover has no duration specified — instant or transitioned is unstated.
5. **Sheet max-height / scroll behaviour.** No `max-height` and no overflow rule. With two items it
   never overflows today, but nothing constrains it.
6. **Sheet backdrop animation details.** "Cross-fades over the same duration" — the easing, and
   whether the backdrop also animates out (given closing is "instant"), are unspecified.
7. **Popover shadow / sheet shadow asymmetry.** The popover gets `0 20px 50px rgba(0,0,0,.6)`; the
   sheet container has **no** shadow specified — deliberate or omitted is unstated.
8. **Desktop trigger wrapper padding.** The mock draws `padding:14px 12px` on the rail wrapper in
   idle/hover/focus but `padding:10px 12px 14px` in the open state (to make room for the 4px
   diamond + 6px gap). Whether the trigger visually shifts up by 4px when opened, or the diamond is
   absolutely positioned so nothing moves, is not stated.
9. **Diamond horizontal centring on desktop.** The mock uses a `width:62px; padding-left:12px;
   justify-content:center` wrapper, which centres the diamond on a 50px span, not on the 38px box.
   The prose says "centred on the trigger". The two disagree by ~6px.
10. **Popover `aria-labelledby` / accessible name.** The sheet gets "a label pointing at the name";
    the desktop popover's `role="menu"` accessible name is not specified.
11. **Sheet label string.** The exact `aria-label`/`aria-labelledby` text for the sheet is not given
    verbatim, unlike the trigger's "Account: Ana Ruiz".
12. **Home/End, type-ahead, and `Tab` inside the menu.** `↑ ↓` and `ESC` are specified; APG menu
    conventions (`Home`/`End`, first-letter type-ahead, whether `Tab` closes or cycles) are not.
    "Trapped inside the panel" implies cycling, but the two items' tab order is not stated.
13. **Focus behaviour when the sheet's `<UserProfile/>` opens on mobile.** The trap handoff is
    specified generically; whether the sheet closes first or stays mounted behind Clerk's full-bleed
    modal is not.
14. **Loading / pending state for "Sign out".** No busy, disabled, or error state for a sign-out that
    is in flight or fails.
15. **Avatar fallback rules.** Initials are the only avatar treatment drawn. What happens with a
    Clerk profile image, a one-word name, a name with no letters, or a user with no name at all
    (accessible name is `"Account: {name}"`) is unspecified.
16. **Reduced-motion + trigger colour transition.** A4's 120ms colour change is not listed in the
    reduced-motion block; whether it should be suppressed is unstated.
17. **Backdrop for the popover on a touch-capable desktop.** "No backdrop on desktop" is by viewport,
    not by input modality; outside-tap dismissal on a touch laptop is not addressed.
18. **`<UserProfile/>` footer branding legality** — handoff gap 1, explicitly routed to eng/legal:
    whether the current Clerk plan permits `elements.footer: display none`. The dev-instance badge is
    separate and untouched.
19. **Drag-to-dismiss** — handoff gap 2, ruled out on the no-dependencies constraint; revisit only on
    beta feedback.
20. **Clerk `appearance` coverage drift** — handoff gap 3: if an element renders unstyled, apply its
    group's recipe rather than inventing a value, and tell Design.
21. **No tooltip for truncated name/email** — handoff gap 4: explicitly not specced; if a real email
    overflows badly, revisit the popover width, not the truncation.
22. **`z-index` values for the popover vs. the app's other layers.** Popover is `z-index:20`; sheet
    `9` over backdrop `8` in the mock's device frame. Whether those sheet values are real app values
    or artefacts of the mock's local stacking context is not stated (mock-frame numbers — treat as
    relative ordering, not absolute).
23. **The `appshell.md:2188-2189` supersession.** The canvas footer lists it among superseded rows
    (CV:543) but neither the README's superseded table nor the decisions log says what changes there.
