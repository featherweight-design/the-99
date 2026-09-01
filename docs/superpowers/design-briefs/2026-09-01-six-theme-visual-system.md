# Design Brief — Six-theme visual system (theme system + character retirement)

Date: 2026-09-01
Shape: **system layer** (like `design_handoff_the99_brand`), plus one new surface
and a redesign of ten empty/loading states.
Eng spec (source of truth for architecture):
`docs/superpowers/specs/2026-08-31-theme-system-design.md`

> **This handoff amends locked decisions in `design/design_handoff_the99_brand/`.**
> That package locked "Palette: A · Table Candlelight" as *the* palette and
> "Cinzel (display/headings/wordmark)" as *the* display face. Both are now one
> option among six. Nothing else in the brand system changes — the logomark,
> the WUBRG-as-tags-only rule, the type scale, and the spacing scale all hold.
> Treat the brand README as still-authoritative except where this brief says
> otherwise.

---

## §0 Dependency — read before scheduling

Eng phases 0–2 (retire the character layer, establish the token contract, sweep
~849 hardcoded hex literals into tokens) are non-visual prerequisites and can
run in parallel with design. **Phase 3 onward is blocked on this handoff.**

Phase 0 does have a design dependency: it strips the crab and kaiju from ten
surfaces, and those surfaces need a replacement treatment from this handoff
before they can ship. Until then they render copy-only.

---

## §1 Feature / surface + route

Three things:

1. **A six-theme token system.** Not a route. Six complete palettes plus one
   display typeface each.
2. **A theme picker.** One new surface. Recommended home is the existing user
   menu (`design/design_handoff_the99_user_menu/`) — see §9, this is Design's
   call.
3. **Ten illustration-free empty/loading states**, replacing the crab and kaiju.

---

## §2 Where it lives in the flow

The theme system has no flow — it is ambient on every screen.

The picker: user menu → theme submenu or inline row → selection applies
immediately, no confirm, no reload.

The empty states keep their current positions in their current flows; only
their contents change.

---

## §3 Design system / files to build from

- `design/design_handoff_the99_brand/` — the foundation this amends. `The 99 -
  Brand Sheet.dc.html` shows the current palette and type scale.
- `src/app/globals.css` — the 38 live tokens, their exact names, and the
  `@theme inline` block. This is the contract you are filling six times.
- `design/design_handoff_the99_availability/` — most recent 🟢 Green package;
  mirror its file structure.
- `design/design_handoff_the99_user_menu/` — the picker's likely home.

Surfaces that lose an illustration in Phase 0 (all ten import from
`src/components/character/`):

`app/decks/page.tsx` · `app/not-found.tsx` · `collection/no-results.tsx` ·
`collection/review-screen.tsx` · `commanders/filtered-empty.tsx` ·
`commanders/guided-banner.tsx` · `decks/builder-shell.tsx` ·
`decks/completion-reveal.tsx` · `home/first-run.tsx` ·
`shell/loading-screen.tsx`

---

## §4 Interaction model

**Picker.** Six options, always all six, no search or grouping. Selecting one
applies it instantly to the whole app — this is a live preview that is also the
commit; there is no separate Save. Selecting is idempotent and reversible, so
no confirmation step.

**Persistence.** A cookie, read during SSR. The chosen theme is correct on
first paint of every subsequent page load — no flash of the default theme.

**Reduced motion.** If the picker animates the transition between themes, it
must be inert under `prefers-reduced-motion` (the existing block in
`globals.css` covers the app's other animations; follow that pattern).

---

## §5 Data contract

- `<html data-theme="amonkhet | kamigawa | innistrad | phyrexia | duskmourn | kaldheim">`
- Amonkhet lives in `:root` and is the fallback, so an unrecognised or absent
  value degrades to a complete, correct theme.
- Every theme declares **exactly the same token key set**. A missing key is a
  CI failure, not a soft fallback.

Token families you are specifying six times:

| Family | Count | Notes |
|---|---|---|
| Chrome (bg, surfaces, borders, text ramp) | 16 | near-neutral, see §8 chroma budget |
| Accent (currently `--brass*`, renamed `--accent*`) | 6 | the only high-chroma family |
| Semantic (success, warning, danger) | 3 | must stay distinguishable from accent |
| WUBRG pips | 5 | must stay distinguishable from accent and each other |
| Availability | 3 literals | 2 more are `var()` aliases and re-resolve free |

The three character tokens (`--kaiju-body`, `--celebrate-top`,
`--celebrate-bottom`) are deleted.

---

## §6 States to cover — name all

**Per theme (all six):**
- App shell at rest — desktop + mobile
- A populated data surface (commander recommendations is the densest; it is the
  real stress test)
- Accent-in-use: primary button, focus ring, active nav item
- WUBRG pips in context, on `--surface`
- Semantic colours in context: success, warning, danger
- Availability treatments

**Theme picker:** default · hover · selected · keyboard-focused · mobile.

**The ten empty/loading states**, in at least two themes (pick the two most
different — Amonkhet and Kamigawa) so the treatment is proven to be
theme-driven rather than tuned to one palette:
- loading (was: animated dots + creature)
- first run
- no results
- filtered empty
- not found (404)
- deck completion / celebration
- builder empty
- collection review empty

---

## §7 Copy

Voice is **Kitchen Table** — unchanged, and load-bearing here. The empty states
are exactly the "expressive moments" that get the wink treatment, and they are
about to lose the illustration that was carrying most of that personality. The
copy now has to do that work alone.

Ban list stands: corporate-service-speak, motivational drift, fake urgency,
SaaS onboarding phrasing.

Theme names shown to the user are an open item — see §9.

Externalise strings per the existing convention
(`<feature> · copy strings.ts` in the handoff folder).

---

## §8 Locked — do not propose alternatives

1. **Six themes**, these six worlds, these six accents and display faces:

   | # | Theme | Accent | Display face |
   |---|---|---|---|
   | 01 | Amonkhet | `#CF8745` | Cinzel |
   | 02 | Kamigawa: Neon Dynasty | `#FF4D9A` | Chakra Petch |
   | 03 | Innistrad | `#9AA9A3` | Spectral |
   | 04 | New Phyrexia | `#518179` | Syncopate |
   | 05 | Duskmourn | `#49A9DC` | Big Shoulders Display |
   | 06 | Kaldheim | `#5C86C9` | Metamorphous |

2. **Chrome ramps are set.** bg / surface / border-strong / fg / fg-muted:

   | Theme | bg | surface | border-strong | fg | fg-muted |
   |---|---|---|---|---|---|
   | Amonkhet | `#14110E` | `#1E1A15` | `#3A3229` | `#EDE6D8` | `#8E8269` |
   | Kamigawa | `#0E0F14` | `#16181F` | `#262A35` | `#E6E8F0` | `#6E7488` |
   | Innistrad | `#101314` | `#191D1E` | `#2B3133` | `#DDE3E1` | `#737D7B` |
   | Phyrexia | `#0D0B0E` | `#151317` | `#262329` | `#E4E2E6` | `#78747E` |
   | Duskmourn | `#100E15` | `#1A1822` | `#2F3A44` | `#D8DBE0` | `#606D86` |
   | Kaldheim | `#121217` | `#1E1F26` | `#2E3340` | `#C6D2D3` | `#7C8A8C` |

   The remaining 11 chrome tokens are yours to derive — hold the existing
   Amonkhet ramp's lightness steps, substitute the theme's hue and chroma.

3. **Only the display face changes per theme.** Body stays IBM Plex Sans, mono
   stays IBM Plex Mono, in all six. Do not propose per-theme body faces.

4. **Chroma budget, enforced in CI.** Expressed in OKLCH chroma:
   surfaces ≤ 0.02 · borders ≤ 0.04 · text ramp ≤ 0.03 · accent and pips
   unbounded. Card art must stay the most saturated thing on screen; a mockup
   that busts the budget will fail the build, so please check before handing
   back.

5. **Accent is budgeted by area, not by count.** Roughly 10% of any viewport.
   Six accent tokens used everywhere is still a violation.

6. **All six themes are dark.** No light mode — it is a separate axis.

7. **No per-theme layout, spacing, radius, or type scale.** Colour and display
   face only.

8. **The character layer is retired**, and the replacement empty states ship
   **no illustration**. The components stay in git so a per-theme creature can
   return later, but nothing creature-shaped is in scope here.

9. **Contrast floors** (CI-enforced): `--fg` on `--bg` ≥ 7:1 · body and muted
   on `--surface` ≥ 4.5:1 · faint and locked ≥ 3:1 · button label on accent
   ≥ 4.5:1 · focus ring on `--bg` ≥ 3:1.

   Note: today's `--fg-locked` (`#6A6152`) measures **2.77:1** and fails. It is
   being lightened in Phase 1 — please specify its replacement.

---

## §9 Open — propose options

1. **User-facing theme names.** "Amonkhet" and "New Phyrexia" are plane names —
   precise for a Magic player, opaque to anyone else, and they read as WotC
   product names inside a third-party app. Options: plane names as-is;
   descriptive names ("Gilded Stone", "Neon Dynasty", "Moonlit"); or
   descriptive-primary with the plane as a subtitle. The current palette's
   existing name, "Table Candlelight", is evidence the descriptive register
   already fits this app. **Your call.**

2. **Where the picker lives.** User menu is the obvious home and my
   recommendation, but a six-option visual choice may deserve more room than a
   menu row — a settings sheet or a dedicated small surface are both defensible.
   If you want it in the menu, say how the six options are represented: swatch,
   name, or a miniature preview.

3. **How a theme previews in the picker.** A name alone under-sells the
   feature; six full previews is a lot of pixels, especially on mobile.

4. **The empty-state treatment.** This is the biggest open question in the
   handoff. Ten surfaces lose their illustration and need something that reads
   as intentional rather than as absence — a token-driven mark, a typographic
   treatment, generous space, or something else. Whatever you propose must
   work in all six themes from one set of tokens.

5. **Whether Innistrad's near-achromatic accent needs a floor.** At effectively
   zero chroma it is the one theme where the accent may not read as an accent.
   Either confirm it works or propose the minimum chroma that keeps it
   Innistrad.

---

## §10 Viewports + a11y baseline

Mobile + desktop ship together, mobile-first, at the project's existing
breakpoints. WCAG AA throughout; the specific floors in §8.9 are stricter than
AA in places and are the binding numbers.

Two additions beyond the usual bar:

- **Theme choice must not be the only carrier of meaning.** Availability
  states, semantic colours and WUBRG pips already pair colour with text or
  shape — keep that true in all six.
- **Focus ring** is accent-derived in every theme and must clear 3:1 against
  `--bg` in each. Innistrad and Phyrexia are the risky ones.

---

## §11 Deliverables

Target folder: `design/design_handoff_the99_themes/`
Mirror: `design/design_handoff_the99_availability/` (most recent 🟢 Green).

Beyond the standard package, this one specifically needs:

- **A six-column token table** — every token key × every theme, as literal
  hexes. This is the artifact eng implements from, and the CI contract checks
  set-equality against it, so completeness matters more than presentation.
- **A type specimen** showing all six display faces at the app's actual heading
  sizes, with the app's longest real heading in each. Metamorphous and Big
  Shoulders have very different metrics from Cinzel and this is where wrapping
  regressions will surface.
- The empty-state treatment in two themes (§6).

---

## §12 Sequence

Ping me when R1 lands and I will audit it against §8's locked decisions and
§10's a11y floors, then issue a READINESS verdict.

Prior visual-system work has gone one-pass: the brand package landed without a
readiness blocker, and availability reached 🟢 Green at R3 with its addendum
also Green. The chroma and contrast numbers in §8 are the parts most likely to
need a second round, which is precisely why they are stated as numbers.
