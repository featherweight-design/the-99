# Design Property Table — App Shell (#5)

> Source of truth: `design/design_handoff_the99_appshell/The 99 - App Shell.dc.html` (Turn 2 resolved frames, lines 53–341) + README.md + brand/Brand README.md.
> Option 1b (Crown Bar) was NOT selected — all production specs are from 1a (The Rail). 1b dimensions are documented where they differ for reference only.
> Token names from brand/Brand README.md; hex values from inline styles.

---

## Component: App Background / Canvas

### Root

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#14110E` (token: **base**) | `#14110E` (token: **base**) |
| background-image | `radial-gradient(600px 360px at 50% 22%, rgba(201,162,75,0.12), transparent 70%)` (signed-out only) | `radial-gradient(1000px 520px at 50% 8%, rgba(201,162,75,0.10), transparent 70%)` (signed-out only) |
| font-family | `'IBM Plex Sans', sans-serif` | `'IBM Plex Sans', sans-serif` |
| color | `#EDE6D8` (token: **primary**) | `#EDE6D8` (token: **primary**) |

---

## Component: Rail (Desktop Navigation Sidebar)

### Rail container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (not present) | `flex` |
| flex-direction | — | `column` |
| width | — | `236px` |
| flex | — | `none` |
| background | — | `#1A160F` |
| border-right | — | `1px solid #3A3229` (token: **line**) |
| height | — | fills `min-height` of parent |

### Rail: Wordmark area

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | — | `22px 20px 20px` |
| border-bottom | — | `1px solid #2A241D` (token: **elevated**) |
| display | — | `flex` |
| align-items | — | `flex-end` |
| gap | — | `7px` |

### Rail: Wordmark — "THE" label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `10px` |
| letter-spacing | — | `0.42em` |
| color | — | `#C9A24B` (token: **accent**) |
| padding-bottom | — | `5px` |

### Rail: Wordmark — Crown diamonds

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| gap | — | `4px` |
| transform | — | `translateX(-1px)` |
| Diamond sizes (small/large/small) | — | `6px × 6px` / `8px × 8px` / `6px × 6px` |
| background | — | `#C9A24B` (token: **accent**) |
| transform (each diamond) | — | `rotate(45deg)` |
| display (each diamond) | — | `block` |

### Rail: Wordmark — "99" numeral

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'Cinzel', serif` |
| font-weight | — | `800` |
| font-size | — | `30px` |
| line-height | — | `0.8` |
| color | — | `#EDE6D8` (token: **primary**) |

### Rail: Nav section

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | — | `16px 12px` |
| display | — | `flex` |
| flex-direction | — | `column` |
| gap | — | `4px` |

### Rail: Nav group label ("Play")

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `10px` |
| letter-spacing | — | `0.18em` |
| text-transform | — | `uppercase` |
| color | — | `#8E8269` (token: **faint**) |
| padding | — | `6px 12px 8px` |

### Rail: Nav item — Active state

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `11px` |
| padding | — | `10px 12px` |
| border-radius | — | `8px` |
| background | — | `#2A241D` (token: **elevated**) |
| color | — | `#EDE6D8` (token: **primary**) |
| font-size | — | `14px` |
| font-weight | — | `600` |
| Diamond color | — | `#C9A24B` (token: **accent**) |
| Diamond size | — | `6px × 6px` |
| Diamond transform | — | `rotate(45deg)` |

### Rail: Nav item — Idle state (unlocked surfaces)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `11px` |
| padding | — | `10px 12px` |
| border-radius | — | `8px` |
| color | — | `#A89B84` (token: **muted**) |
| font-size | — | `14px` |
| font-weight | — | `500` |
| Diamond color | — | `#3A3229` (token: **line**) |
| Diamond size | — | `6px × 6px` |

### Rail: Nav item — Idle hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `#211C15` |
| color | — | `#EDE6D8` (token: **primary**) |

### Rail: Nav item — Locked state (pre-upload, first-run)

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | — | `#8E8269` (token: **faint**) — lifted from `#6A6152` for WCAG AA (4.76:1 on `--surface-rail`; richness pass Task 8) |
| font-size | — | `14px` |
| font-weight | — | `500` |
| Diamond color | — | `#3A3229` (token: **line**) |

### Rail: Locked surfaces caption

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `10px` |
| color | — | `#8E8269` (token: **faint**) — lifted from `#6A6152` for WCAG AA (richness pass Task 8) |
| padding | — | `4px 12px` |
| line-height | — | `1.5` |
| content | — | `"Surfaces unlock once your collection is uploaded."` |

### Rail: Account trigger row — Idle

| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-top | — | `auto` |
| padding | — | `14px 12px` |
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `12px` |
| background | — | `#221D16` |
| border | — | `1px solid #3A3229` (token: **line**) |
| padding (inner) | — | `2px 12px 2px 2px` |
| border-radius | — | `14px` |
| cursor | — | `pointer` |

### Rail: Account trigger row — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| border-color | — | `#C9A24B` (token: **accent**) |

### Rail: Account trigger row — Open/active state

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `#2A241D` (token: **elevated**) |
| border | — | `1px solid #C9A24B` (token: **accent**) |
| ellipsis color | — | `#C9A24B` (token: **accent**) |

### Rail: Avatar badge

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | `38px` |
| height | — | `38px` |
| border-radius | — | `12px` |
| background | — | `#14110E` (token: **base**) |
| border | — | `1px solid #C9A24B` (token: **accent**) |
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `13px` |
| color | — | `#C9A24B` (token: **accent**) |
| display | — | `flex` |
| align-items | — | `center` |
| justify-content | — | `center` |

### Rail: Account name text

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | `13px` |
| color | — | `#EDE6D8` (token: **primary**) |
| font-weight | — | `600` |
| white-space | — | `nowrap` |
| overflow | — | `hidden` |
| text-overflow | — | `ellipsis` |

### Rail: Account role/tier text

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `10px` |
| color | — | `#8E8269` (token: **faint**) |
| content | — | `"invite · member"` |

### Rail: Ellipsis menu indicator

| Property | Mobile | Desktop |
|----------|--------|---------|
| color (idle) | — | `#8E8269` (token: **faint**) |
| font-size | — | `15px` |
| line-height | — | `1` |
| content | — | `⋯` |

---

## Component: Bottom Tab Bar (Mobile Navigation)

### Tab bar container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | — (not present) |
| border-top | `1px solid #3A3229` (token: **line**) | — |
| background | `#1A160F` | — |
| padding | `10px 6px 22px` | — |

### Tab item — Active

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | `1` | — |
| display | `flex` | — |
| flex-direction | `column` | — |
| align-items | `center` | — |
| gap | `5px` | — |
| Diamond color | `#C9A24B` (token: **accent**) | — |
| Diamond size | `8px × 8px` | — |
| Diamond transform | `rotate(45deg)` | — |
| label font-size | `10px` | — |
| label color | `#C9A24B` (token: **accent**) | — |
| label font-weight | `600` | — |

### Tab item — Idle

| Property | Mobile | Desktop |
|----------|--------|---------|
| Diamond color | `#4A4033` | — |
| label color | `#8E8269` (token: **faint**) | — |
| label font-size | `10px` | — |

### Tab labels (copy, all surfaces)

| Tab | Label text |
|-----|-----------|
| Home | `Home` |
| Collection | `Collection` |
| Commanders | `Commanders` |
| Decks | `Decks` |

---

## Component: Mobile Top Header (signed-in)

### Header container

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | `20px 20px 14px` | — |
| display | `flex` | — |
| align-items | `center` | — |
| justify-content | `space-between` | — |
| border-bottom | `1px solid #2A241D` (token: **elevated**) | — |

### Mobile Wordmark — "THE" label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | — |
| font-size | `9px` | — |
| letter-spacing | `0.4em` | — |
| color | `#C9A24B` (token: **accent**) | — |
| padding-bottom | `4px` | — |

### Mobile Wordmark — Crown diamonds

| Property | Mobile | Desktop |
|----------|--------|---------|
| gap | `3px` | — |
| Diamond sizes (s/l/s) | `5px × 5px` / `7px × 7px` / `5px × 5px` | — |
| background | `#C9A24B` (token: **accent**) | — |
| transform | `rotate(45deg)` | — |

### Mobile Wordmark — "99" numeral

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | — |
| font-weight | `800` | — |
| font-size | `24px` | — |
| line-height | `0.8` | — |
| color | `#EDE6D8` (token: **primary**) | — |

### Mobile top-right avatar trigger

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `38px` | — |
| height | `38px` | — |
| border-radius | `12px` | — |
| background | `#221D16` | — |
| border | `1px solid #C9A24B` (token: **accent**) | — |
| font-family | `'IBM Plex Mono', monospace` | — |
| font-size | `12px` | — |
| color | `#C9A24B` (token: **accent**) | — |

---

## Component: Signed-Out Landing (`/`)

### Page layout

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex`, `flex-direction: column`, `align-items: center`, `justify-content: center` | `flex`, `flex-direction: column`, `align-items: center`, `justify-content: center` |
| padding | `32px` | `40px` |
| text-align | `center` | `center` |
| height | `812px` (phone frame) | `720px` (browser frame) |
| background | `#14110E` (token: **base**) | `#14110E` (token: **base**) |
| background-image | `radial-gradient(600px 360px at 50% 22%, rgba(201,162,75,0.12), transparent 70%)` | `radial-gradient(1000px 520px at 50% 8%, rgba(201,162,75,0.10), transparent 70%)` |

### Hero mark — Crown diamonds

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| gap | `8px` | `11px` |
| transform | `translateX(-2px)` | `translateX(-3px)` |
| Diamond sizes (s/l/s) | `13px × 13px` / `18px × 18px` / `13px × 13px` | `18px × 18px` / `25px × 25px` / `18px × 18px` |
| background | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| transform (each) | `rotate(45deg)` | `rotate(45deg)` |

### Hero numeral "99"

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-weight | `900` | `900` |
| font-size | `92px` | `132px` |
| line-height | `0.82` | `0.82` |
| color | `#EDE6D8` (token: **primary**) | `#EDE6D8` (token: **primary**) |

### "THE NINETY-NINE" sub-label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `11px` | `13px` |
| letter-spacing | `0.4em` | `0.44em` |
| color | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| margin-top | `14px` | `16px` |
| text-transform | uppercase (all caps visually) | uppercase (all caps visually) |
| content | `THE NINETY-NINE` | `THE NINETY-NINE` |

### Tagline

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Sans'` | `'IBM Plex Sans'` |
| font-style | `italic` | `italic` |
| font-size | `17px` | `21px` |
| line-height | `1.5` | — |
| color | `#C6B79A` (token: **secondary**) | `#C6B79A` (token: **secondary**) |
| margin-top | `22px` | `26px` |
| max-width | `280px` | — |
| content (exact) | `"99 problems, but your commander ain't one."` | `"99 problems, but your commander ain't one."` |

### Sign in button

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Sans'` | `'IBM Plex Sans'` |
| font-weight | `600` | `600` |
| font-size | `15px` | `15px` |
| color | `#14110E` (token: **base**) | `#14110E` (token: **base**) |
| background | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| border | `none` | `none` |
| border-radius | `8px` | `8px` |
| padding | `14px 0` (full width up to 260px) | `14px 40px` |
| width | `100%` | — |
| max-width | `260px` | — |
| margin-top | `34px` | `36px` |
| cursor | `pointer` | `pointer` |
| label | `Sign in` | `Sign in` |

### Sign in button — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#D8B25E` (token: **accent-hover**) | `#D8B25E` (token: **accent-hover**) |

### "Invite-only" note

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `11px` | `12px` |
| color | `#8E8269` (token: **faint**) | `#8E8269` (token: **faint**) |
| margin-top | `18px` | `20px` |
| letter-spacing | `0.04em` | `0.04em` |
| content (mobile) | `Invite-only · access by request` | — |
| content (desktop) | — | `Invite-only · access by request · a Commander companion` |

---

## Component: First-Run Home — Hybrid Checklist

### Page heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-weight | `700` | `700` |
| font-size | `23px` | `30px` |
| margin | `0` | `0` |
| color | `#EDE6D8` (token: **primary**) | `#EDE6D8` (token: **primary**) |
| line-height | `1.2` | — |
| content | `Welcome to the 99, Arden` | `Welcome to the 99, Arden` |

### Page subhead

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `13px` | `15px` |
| color | `#C6B79A` (token: **secondary**) | `#C6B79A` (token: **secondary**) |
| margin | `8px 0 20px` | `10px 0 28px` |
| line-height | `1.5` | — |
| content (mobile) | `Three steps to your first recommendations.` | — |
| content (desktop) | — | `Three steps to your first recommendations. Start by handing us your cards.` |

### Step 1 active container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1E1A15` (token: **surface**) | `#1E1A15` (token: **surface**) |
| border | `1px solid #C9A24B` (token: **accent**) | `1px solid #C9A24B` (token: **accent**) |
| border-radius | `12px` | `14px` |
| padding | `16px` | `26px 28px` |

### Step badge — Active (step 1)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `22px` | `26px` |
| height | `22px` | `26px` |
| border-radius | `999px` | `999px` |
| background | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| color | `#14110E` (token: **base**) | `#14110E` (token: **base**) |
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `12px` | `13px` |
| font-weight | `600` | `600` |

### Step label — Active

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-weight | `600` | `600` |
| font-size | `16px` | `20px` |
| color | `#EDE6D8` (token: **primary**) | `#EDE6D8` (token: **primary**) |
| content | `Upload your collection` | `Upload your collection` |

### Step badge — Locked (steps 2 & 3)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `22px` | `26px` |
| height | `22px` | `26px` |
| border-radius | `999px` | `999px` |
| border | `1px solid #4A4033` | `1px solid #4A4033` |
| color | `#8E8269` (token: **faint**) | `#8E8269` (token: **faint**) |
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `12px` | `13px` |

### Step label — Locked

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-weight | `600` | `600` |
| font-size | `15px` | `18px` |
| color | `#A89B84` (token: **muted**) | `#A89B84` (token: **muted**) |
| content step 2 | `Review your commanders` | `Review your commanders` |
| content step 3 | `Build your first deck` | `Build your first deck` |

### Step container — Locked

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | `10px` | `12px` |
| padding | `15px 16px` | `18px 22px` |
| margin-top | `12px` (step 2), `10px` (step 3) | `14px` (step 2), `12px` (step 3) |
| background | `#181410` | `#181410` |
| border | `1px solid #2A241D` (token: **elevated**) | `1px solid #2A241D` (token: **elevated**) |
| border-radius | `12px` | `14px` |
| opacity | `0.55` | `0.55` |

### Locked step "unlocks after upload" hint (desktop only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-left | — | `auto` |
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `11px` |
| color | — | `#6A6152` |
| content | — | `unlocks after upload` (step 2 only) |

---

## Component: CSV Dropzone

### Dropzone container

| Property | Mobile | Desktop |
|----------|--------|---------|
| border | `1.5px dashed #4A4033` | `1.5px dashed #4A4033` |
| border-radius | `10px` | `12px` |
| background | `#181410` | `#181410` |
| padding | `22px 16px` | `34px` |
| text-align | `center` | — |
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `28px` |

### Dropzone — Hover state

| Property | Mobile | Desktop |
|----------|--------|---------|
| border-color | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| background | `#1C1712` | `#1C1712` |

### Dropzone: Upload icon ring

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `40px` | `56px` |
| height | `40px` | `56px` |
| border-radius | `999px` | `999px` |
| border | `1px solid #C9A24B` (token: **accent**) | `1px solid #C9A24B` (token: **accent**) |
| color | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| font-size | `18px` | `24px` |
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| justify-content | `center` | `center` |
| margin | `0 auto 12px` | — |
| flex (desktop) | — | `none` |
| content | `↑` | `↑` |

### Dropzone: Primary label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `14px` | `17px` |
| color | `#EDE6D8` (token: **primary**) | `#EDE6D8` (token: **primary**) |
| font-weight | `600` | `600` |
| content (mobile) | `Drop your collection CSV` | — |
| content (desktop) | — | `Drop your collection CSV here` |

### Dropzone: Format hint

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `10px` | `11px` |
| color | `#8E8269` (token: **faint**) | `#8E8269` (token: **faint**) |
| margin-top | `6px` | `6px` |
| letter-spacing | `0.06em` | `0.06em` |
| content | `ManaBox CSV export · more formats arrive with #6` | `ManaBox CSV export · more formats arrive with #6` |

> **Scope note:** The original handoff copy ("Moxfield · Archidekt · Deckbox · CSV") reflects the multi-format ingest designed for epic #6. The #5 interim UI is deliberately ManaBox-only; multi-format support ships with #6. The content row above reflects the interim copy used in Task 9's `upload-entry.tsx` dropzone.

### Dropzone: "Browse files" button

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Sans'` | `'IBM Plex Sans'` |
| font-weight | `600` | `600` |
| font-size | `13px` | `14px` |
| color | `#14110E` (token: **base**) | `#14110E` (token: **base**) |
| background | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| border | `none` | `none` |
| border-radius | `8px` | `8px` |
| padding | `10px 18px` | `11px 22px` |
| margin-top | `14px` | — |
| white-space | — | `nowrap` |
| cursor | `pointer` | `pointer` |

### Dropzone: "Browse files" button — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#D8B25E` (token: **accent-hover**) | `#D8B25E` (token: **accent-hover**) |

### Dropzone: Help text row

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `12px` | `13px` |
| color | `#8E8269` (token: **faint**) | `#8E8269` (token: **faint**) |
| line-height | `1.5` | `1.5` |
| margin-top | `12px` | — |
| content | `Needs a Name and Quantity column — most exports already have them.` | `We only need a Name and Quantity column — most exports already include them.` |
| "Name" / "Quantity" emphasis color | `#C6B79A` (token: **secondary**) | `#C6B79A` (token: **secondary**) |
| "Name" / "Quantity" font-weight | `600` | `600` |

### Dropzone: "Paste a list instead" link

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `12px` | `13px` |
| color | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| content | `Paste a list instead` | `Paste a list instead →` |

---

## Component: Paste-List View (Mobile only — Step 1 fallback)

### Paste view header

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | `20px 20px 14px` | — |
| display | `flex` | — |
| align-items | `center` | — |
| gap | `12px` | — |
| border-bottom | `1px solid #2A241D` | — |
| Back arrow color | `#C9A24B` | — |
| Back arrow font-size | `20px` | — |
| Title font-family | `'Cinzel', serif` | — |
| Title font-weight | `600` | — |
| Title font-size | `18px` | — |
| Title color | `#EDE6D8` (token: **primary**) | — |
| Title content | `Paste a list` | — |

### Paste view instructions

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `13px` | — |
| color | `#C6B79A` (token: **secondary**) | — |
| line-height | `1.55` | — |
| margin | `0 0 14px` | — |
| content | `One card per line — quantity, then name. We'll match them against the Oracle database.` | — |

### Paste textarea

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#181410` | — |
| border | `1px solid #3A3229` (token: **line**) | — |
| border-radius | `10px` | — |
| padding | `14px 16px` | — |
| font-family | `'IBM Plex Mono', monospace` | — |
| font-size | `13px` | — |
| color | `#C6B79A` (token: **secondary**) | — |
| line-height | `1.9` | — |
| height | `300px` | — |
| cursor color | `#6A6152` | — |

### Paste recognized-count label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | — |
| font-size | `11px` | — |
| color | `#8E8269` (token: **faint**) | — |
| margin-top | `10px` | — |
| content (example) | `42 lines · 128 cards recognized` | — |

### Paste import button

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Sans'` | — |
| font-weight | `600` | — |
| font-size | `15px` | — |
| color | `#14110E` (token: **base**) | — |
| background | `#C9A24B` (token: **accent**) | — |
| border | `none` | — |
| border-radius | `8px` | — |
| padding | `13px 0` | — |
| width | `100%` | — |
| margin-top | `16px` | — |
| content (example) | `Import 128 cards` | — |

### "Upload a CSV instead" link

| Property | Mobile | Desktop |
|----------|--------|---------|
| text-align | `center` | — |
| margin-top | `14px` | — |
| font-size | `13px` | — |
| color | `#C9A24B` (token: **accent**) | — |
| content | `Upload a CSV instead` | — |

---

## Component: Signed-In Home Dashboard

### Main content area

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | `20px` | `34px 40px 44px` |
| min-width | — | `0` |
| flex | — | `1` |

### Page heading "Welcome back"

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-weight | `700` | `700` |
| font-size | `24px` | `32px` |
| margin | `0` | `0` |
| color | `#EDE6D8` (token: **primary**) | `#EDE6D8` (token: **primary**) |
| content (mobile) | `Welcome back` | — |
| content (desktop) | — | `Welcome back, Arden` |

### Stats sub-line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `11px` | `13px` |
| color | `#A89B84` (token: **muted**) | `#A89B84` (token: **muted**) |
| margin-top | `6px` | `8px` |
| content (mobile) | `24 commanders buildable · 3 decks` | — |
| content (desktop) | — | `1,284 cards · 742 unique · 24 commanders buildable · 3 decks` |

### "Update collection" button (desktop header)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Sans'` |
| font-weight | — | `600` |
| font-size | — | `13px` |
| color | — | `#EDE6D8` (token: **primary**) |
| background | — | `transparent` |
| border | — | `1px solid #3A3229` (token: **line**) |
| border-radius | — | `8px` |
| padding | — | `9px 16px` |
| cursor | — | `pointer` |

### "Update collection" button — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| border-color | — | `#C9A24B` (token: **accent**) |
| color | — | `#D8B25E` (token: **accent-hover**) |

### Section label (e.g. "Most complete general", "Recommended", "Recent decks", "Collection")

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `10px` | `11px` |
| letter-spacing | `0.16em` | `0.16em` |
| text-transform | `uppercase` | `uppercase` |
| color | `#8E8269` (token: **faint**) | `#8E8269` (token: **faint**) |
| margin-bottom | `10px` | `12px` |
| margin-top | `22px` | — |

### "All 24 →" / "All decks →" links

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | `13px` |
| color | — | `#C9A24B` (token: **accent**) |
| cursor | — | `pointer` |
| content (commanders) | — | `All 24 →` |
| content (decks) | — | `All decks →` |

---

## Component: Hero Commander Card (Desktop Home)

### Hero card container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| gap | — | `0` |
| background | — | `#1E1A15` (token: **surface**) |
| border | — | `1px solid #3A3229` (token: **line**) |
| border-radius | — | `14px` |
| overflow | — | `hidden` |
| margin-bottom | — | `34px` |

### Hero card: Art placeholder

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | `200px` |
| flex | — | `none` |
| background | — | `#14110E` (token: **base**) |
| background-image | — | `repeating-linear-gradient(135deg, #1E1A15 0 11px, #181209 11px 22px)` |
| border-right | — | `1px solid #3A3229` (token: **line**) |
| position | — | `relative` |
| art caption font-family | — | `'IBM Plex Mono', monospace` |
| art caption font-size | — | `10px` |
| art caption color | — | `#8E8269` (token: **faint**) |
| art caption content | — | `commander art` |

### Hero card: Info area

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | — | `1` |
| padding | — | `26px 30px` |
| display | — | `flex` |
| flex-direction | — | `column` |
| justify-content | — | `center` |

### Hero card: Commander name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'Cinzel', serif` |
| font-weight | — | `700` |
| font-size | — | `28px` |
| color | — | `#EDE6D8` (token: **primary**) |

### Hero card: Type line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | `13px` |
| color | — | `#A89B84` (token: **muted**) |
| margin-top | — | `4px` |

### Hero card: Completeness row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `10px` |
| margin-top | — | `18px` |
| max-width | — | `420px` |

### Hero card: Owned count

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `13px` |
| color | — | `#6FA368` (token: **success**) |

### Hero card: Progress bar track

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | — | `1` |
| height | — | `6px` |
| background | — | `#2A241D` (token: **elevated**) |
| border-radius | — | `3px` |
| overflow | — | `hidden` |

### Hero card: Progress bar fill

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | — | `100%` |
| border-radius | — | `3px` |
| background (≥90%) | — | `#6FA368` (token: **success**) |
| background (≥75%) | — | `#E0913C` (token: **warning**) |
| background (<75%) | — | `#C6533F` (token: **danger**) |
| width (example) | — | `97%` (96/99 = 97%) |

### Hero card: Right action area

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | — | `26px 30px` |
| display | — | `flex` |
| flex-direction | — | `column` |
| justify-content | — | `center` |
| align-items | — | `flex-end` |
| gap | — | `12px` |
| border-left | — | `1px solid #2A241D` (token: **elevated**) |

### Hero card: "to complete" label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `11px` |
| color | — | `#8E8269` (token: **faint**) |
| content | — | `to complete` |

### Hero card: Cost/count line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `15px` |
| color | — | `#E0913C` (token: **warning**) |
| margin-top | — | `2px` |
| content (example) | — | `3 cards · $18.40` |

### "Build this deck" button (primary)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Sans'` | `'IBM Plex Sans'` |
| font-weight | `600` | `600` |
| font-size | `14px` | `14px` |
| color | `#14110E` (token: **base**) | `#14110E` (token: **base**) |
| background | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| border | `none` | `none` |
| border-radius | `8px` | `8px` |
| padding | `11px 0` (full width) | `11px 22px` |
| width (mobile) | `100%` | — |
| white-space | — | `nowrap` |
| cursor | `pointer` | `pointer` |

### "Build this deck" button — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#D8B25E` (token: **accent-hover**) | `#D8B25E` (token: **accent-hover**) |

---

## Component: Commander Card (Recommendation Grid)

### Card container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1E1A15` (token: **surface**) | `#1E1A15` (token: **surface**) |
| border | `1px solid #3A3229` (token: **line**) | `1px solid #3A3229` (token: **line**) |
| border-radius | `10px` | `12px` |
| overflow | `hidden` | `hidden` |
| display | `flex` | `flex` |
| flex-direction | `column` | `column` |

### Card: Art area (striped placeholder)

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `relative` | `relative` |
| height | — | `116px` |
| background | `#14110E` (token: **base**) | `#14110E` (token: **base**) |
| background-image | — | `repeating-linear-gradient(135deg, #1E1A15 0 10px, #181209 10px 20px)` |
| border-bottom | — | `1px solid #3A3229` (token: **line**) |

### Card: WUBRG pip

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `10px` | `11px` |
| height | `10px` | `11px` |
| border-radius | `2px` (mobile list) | `3px` (card grid) |
| border | — | `1px solid rgba(0,0,0,0.35)` |
| position (in card art) | — | `absolute; top:10px; left:10px` |
| gap between pips | `3px` | `4px` |

### Card: Info area

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | — | `14px 16px 16px` |
| display | — | `flex` |
| flex-direction | — | `column` |
| gap | — | `12px` |
| flex | — | `1` |

### Card: Commander name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-weight | `600` | `600` |
| font-size | `15px` (list row) | `17px` (grid card) |
| color | `#EDE6D8` (token: **primary**) | `#EDE6D8` (token: **primary**) |
| line-height | — | `1.15` |

### Card: Type line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | `12px` |
| color | `#8E8269` (mobile list) | `#A89B84` (token: **muted**) |
| margin-top | `2px` | `4px` |

### Card: Owned count text

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `11px` | `12px` |
| color | `#8E8269` (token: **faint**) (mobile list) | `#C6B79A` (token: **secondary**) |

### Card: "X to go" text

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `11px` |
| color | — | `#8E8269` (token: **faint**) |

### Card: Completeness % (mobile list only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | — |
| font-size | `12px` | — |
| color (≥90%) | `#6FA368` (token: **success**) | — |
| color (≥75%) | `#E0913C` (token: **warning**) | — |
| color (<75%) | `#C6533F` (token: **danger**) | — |

### Card: Progress bar

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | — | `6px` |
| track background | — | `#2A241D` (token: **elevated**) |
| track border-radius | — | `3px` |
| fill border-radius | — | `3px` |
| fill (≥90%) | — | `#6FA368` (token: **success**) |
| fill (≥75%) | — | `#E0913C` (token: **warning**) |
| fill (<75%) | — | `#C6533F` (token: **danger**) |
| margin-bottom (before bar) | — | `6px` |

### Card: "Build deck" button (grid — secondary)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Sans'` |
| font-weight | — | `600` |
| font-size | — | `13px` |
| color | — | `#EDE6D8` (token: **primary**) |
| background | — | `transparent` |
| border | — | `1px solid #3A3229` (token: **line**) |
| border-radius | — | `8px` |
| padding | — | `9px 0` |
| width | — | `100%` |
| cursor | — | `pointer` |

### Card: "Build deck" button — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| border-color | — | `#C9A24B` (token: **accent**) |
| color | — | `#D8B25E` (token: **accent-hover**) |

### Rec grid layout (desktop Home — "1a" Rail)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `grid` |
| grid-template-columns | — | `repeat(3, 1fr)` |
| gap | — | `16px` |
| margin-bottom | — | `36px` |

### Mobile recommended list (compact rows)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | — |
| align-items | `center` | — |
| gap | `12px` | — |
| background | `#1E1A15` (token: **surface**) | — |
| border | `1px solid #3A3229` (token: **line**) | — |
| border-radius | `10px` | — |
| padding | `12px 14px` | — |

---

## Component: Recent Decks List

### Decks/stats section layout (desktop)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `grid` |
| grid-template-columns | — | `1.5fr 1fr` |
| gap | — | `20px` |

### Deck row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | — | `14px` |
| background | — | `#1E1A15` (token: **surface**) |
| border | — | `1px solid #3A3229` (token: **line**) |
| border-left | — | `3px solid {d.color}` (state color) |
| border-radius | — | `8px` |
| padding | — | `13px 16px` |
| cursor | — | `pointer` |
| flex-direction | — | `row` |

### Deck row — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `#221D16` |

### Deck rows gap

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| flex-direction | — | `column` |
| gap | — | `10px` |

### Deck name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'Cinzel', serif` |
| font-weight | — | `600` |
| font-size | — | `16px` |
| color | — | `#EDE6D8` (token: **primary**) |

### Deck commander line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | `12px` |
| color | — | `#A89B84` (token: **muted**) |
| margin-top | — | `2px` |

### Deck owned count

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `13px` |
| color | — | `{d.color}` (state color: `#6FA368` / `#E0913C` / `#C6533F`) |

### Deck status text

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `11px` |
| color | — | `#8E8269` (token: **faint**) |
| margin-top | — | `2px` |

---

## Component: Collection Stats Panel

### Panel container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `#1E1A15` (token: **surface**) |
| border | — | `1px solid #3A3229` (token: **line**) |
| border-radius | — | `12px` |
| padding | — | `6px 20px` |

### Stat row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| justify-content | — | `space-between` |
| align-items | — | `center` |
| padding | — | `14px 0` |
| border-bottom | — | `1px solid #2A241D` (all except last row) |

### Stat label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | `13px` |
| color | — | `#C6B79A` (token: **secondary**) |

### Stat value

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `15px` |
| color (most) | — | `#EDE6D8` (token: **primary**) |
| color (commanders buildable) | — | `#C9A24B` (token: **accent**) |

### Stat rows content

| Label | Value example | Value color |
|-------|---------------|-------------|
| `Total cards` | `1,284` | `#EDE6D8` |
| `Unique` | `742` | `#EDE6D8` |
| `Commanders buildable` | `24` | `#C9A24B` |
| `Decks built` | `3` | `#EDE6D8` |

---

## Component: Color Filter Chips (Commanders surface)

### Filter chip container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| gap | — | `8px` |
| flex-wrap | — | `wrap` |
| margin | — | `24px 0 26px` |
| align-items | — | `center` |

### "All colors" chip — Active/selected

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Sans'` |
| font-weight | — | `600` |
| font-size | — | `13px` |
| color | — | `#14110E` (token: **base**) |
| background | — | `#C9A24B` (token: **accent**) |
| border-radius | — | `999px` |
| padding | — | `7px 15px` |
| cursor | — | `pointer` |

### WUBRG color chip — Idle

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `7px` |
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `12px` |
| color | — | `#EDE6D8` (token: **primary**) |
| background | — | `#2A241D` (token: **elevated**) |
| border-radius | — | `999px` |
| padding | — | `6px 13px 6px 10px` |
| cursor | — | `pointer` |
| Swatch size | — | `10px × 10px` |
| Swatch border-radius | — | `2px` |

### WUBRG color chip — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `#332B20` |

### "Buildable ≥ 90%" filter chip — Idle

| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-left | — | `auto` |
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `12px` |
| color | — | `#8E8269` (token: **faint**) |
| border | — | `1px solid #3A3229` (token: **line**) |
| border-radius | — | `999px` |
| padding | — | `6px 13px` |
| cursor | — | `pointer` |
| content | — | `Buildable ≥ 90% ✓` |

### "Buildable ≥ 90%" filter chip — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| border-color | — | `#C9A24B` (token: **accent**) |
| color | — | `#D8B25E` (token: **accent-hover**) |

### Commanders grid layout (desktop — populated)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `grid` |
| grid-template-columns | — | `repeat(3, 1fr)` |
| gap | — | `16px` |

---

## Component: Empty State — Collection Empty

### Empty state content area

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| flex-direction | `column` | `column` |
| align-items | `center` | `center` |
| justify-content | `center` | `center` |
| text-align | `center` | `center` |
| padding | `32px` | `48px` |

### Card-fan mark (mobile)

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `relative` | `relative` |
| width | `100px` | `120px` |
| height | `110px` | `130px` |
| margin-bottom | `22px` | `26px` |

### Card-fan: Back card

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute; left:50%; top:50%` | `absolute; left:50%; top:50%` |
| width | `52px` | `60px` |
| height | `74px` | `84px` |
| border-radius | `8px` | `9px` |
| background | `#2A241D` (token: **elevated**) | `#2A241D` (token: **elevated**) |
| border | `1.5px solid #4A4033` | `1.5px solid #4A4033` |
| transform | `translate(-50%,-50%) rotate(-14deg) translateX(-18px)` | `translate(-50%,-50%) rotate(-16deg) translateX(-22px)` |

### Card-fan: Middle card

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `52px` | `60px` |
| height | `74px` | `84px` |
| border-radius | `8px` | `9px` |
| background | `#33291F` | `#33291F` |
| border | `1.5px solid #5A4B38` | `1.5px solid #5A4B38` |
| transform | `translate(-50%,-50%)` | `translate(-50%,-50%)` |

### Card-fan: Front card (brass "99")

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `52px` | `60px` |
| height | `74px` | `84px` |
| border-radius | `8px` | `9px` |
| background | `#3E3020` | `#3E3020` |
| border | `1.5px solid #C9A24B` (token: **accent**) | `1.5px solid #C9A24B` (token: **accent**) |
| transform | `translate(-50%,-50%) rotate(14deg) translateX(18px)` | `translate(-50%,-50%) rotate(15deg) translateX(22px)` |
| display | `flex; align-items:center; justify-content:center` | `flex; align-items:center; justify-content:center` |

### Card-fan: "99" label on front card

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-weight | `800` | `800` |
| font-size | `22px` | `26px` |
| color | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |

### Empty state heading — Collection

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'Cinzel', serif` |
| font-weight | — | `700` |
| font-size | — | `28px` |
| margin | — | `0` |
| color | — | `#EDE6D8` (token: **primary**) |
| content | — | `Your collection is empty` |

### Empty state body — Collection

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | `16px` |
| color | — | `#C6B79A` (token: **secondary**) |
| line-height | — | `1.6` |
| margin | — | `12px 0 0` |
| max-width | — | `420px` |
| content | — | `A pile of possibilities waiting for a general. Upload a CSV and the table fills — commanders and decks follow.` |

### Empty state CTA row — Collection

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| gap | — | `12px` |
| margin-top | — | `26px` |

### "Upload collection" button

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Sans'` |
| font-weight | — | `600` |
| font-size | — | `14px` |
| color | — | `#14110E` (token: **base**) |
| background | — | `#C9A24B` (token: **accent**) |
| border | — | `none` |
| border-radius | — | `8px` |
| padding | — | `12px 24px` |
| cursor | — | `pointer` |

### "Upload collection" button — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `#D8B25E` (token: **accent-hover**) |

### "Paste a list" button (secondary, empty state)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Sans'` |
| font-weight | — | `600` |
| font-size | — | `14px` |
| color | — | `#EDE6D8` (token: **primary**) |
| background | — | `transparent` |
| border | — | `1px solid #3A3229` (token: **line**) |
| border-radius | — | `8px` |
| padding | — | `12px 24px` |
| cursor | — | `pointer` |

### "Paste a list" button — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| border-color | — | `#C9A24B` (token: **accent**) |
| color | — | `#D8B25E` (token: **accent-hover**) |

---

## Component: Empty State — No Commander Candidates

### XCIX seal (mobile)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `64px` | `78px` |
| height | `64px` | `78px` |
| border | `2px solid #C9A24B` (token: **accent**) | `2px solid #C9A24B` (token: **accent**) |
| border-radius | `14px` | `16px` |
| display | `flex; align-items:center; justify-content:center` | `flex; align-items:center; justify-content:center` |
| margin-bottom | `22px` | `24px` |

### XCIX label inside seal

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-weight | `700` | `700` |
| font-size | `20px` | `24px` |
| letter-spacing | `0.04em` | `0.04em` |
| color | `#EDE6D8` (token: **primary**) | `#EDE6D8` (token: **primary**) |
| content | `XCIX` | `XCIX` |

### Empty state heading — No candidates

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-weight | `700` | `700` |
| font-size | `24px` | `28px` |
| margin | `0` | `0` |
| color | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| line-height | `1.25` | — |
| content | `No generals in the ranks — yet` | `No generals in the ranks — yet` |

### Empty state body — No candidates

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `14px` | `16px` |
| color | `#C6B79A` (token: **secondary**) | `#C6B79A` (token: **secondary**) |
| line-height | `1.6` | `1.6` |
| margin | `14px 0 0` | `12px 0 0` |
| max-width | — | `460px` |
| content (mobile) | `We scanned all 742 cards and none can helm a legal 99 on their own. Add a legendary creature and they'll show up here.` | — |
| content (desktop) | — | `We scanned all 742 cards and none can helm a legal 99 on their own. Add a legendary creature — or a planeswalker that can command — and they'll appear here, ranked.` |

### Scanned-count mono line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `11px` | `12px` |
| color | `#8E8269` (token: **faint**) | `#8E8269` (token: **faint**) |
| margin-top | `18px` | `18px` |
| content (example) | `742 cards · 0 eligible commanders` | `742 cards scanned · 0 eligible commanders` |

### CTAs — No candidates (mobile)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-weight | `600` | — |
| font-size | `14px` | — |
| color | `#EDE6D8` (token: **primary**) | — |
| background | `transparent` | — |
| border | `1px solid #3A3229` (token: **line**) | — |
| border-radius | `8px` | — |
| padding | `12px 22px` | — |
| margin-top | `22px` | — |
| content | `Add more cards` | — |

### CTAs — No candidates (desktop)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| gap | — | `12px` |
| margin-top | — | `24px` |
| "Add more cards" style | — | primary button (`bg #C9A24B`, `color #14110E`, `pad 12px 24px`) |
| "View collection" style | — | secondary button (`transparent`, `1px solid #3A3229`, `color #EDE6D8`, `pad 12px 24px`) |

---

## Component: Empty State — No Decks

### Card-fan mark: same construction as collection empty state

See collection empty state card-fan specs above. Mobile: 100×110px container. Desktop: 120×130px container.

### Empty state heading — No decks

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-weight | `700` | `700` |
| font-size | `24px` | `28px` |
| margin | `0` | `0` |
| color | `#EDE6D8` (token: **primary**) | `#EDE6D8` (token: **primary**) |
| content | `No decks yet.` | `No decks yet.` |

### Empty state body — No decks

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `14px` | `16px` |
| color | `#C6B79A` (token: **secondary**) | `#C6B79A` (token: **secondary**) |
| line-height | `1.6` | `1.6` |
| margin | `12px 0 0` | `12px 0 0` |
| max-width | — | `420px` |
| content (mobile) | `Pick a commander and we'll assemble the 99 from cards you already own.` | — |
| content (desktop) | — | `Pick a commander and we'll assemble the 99 from cards you already own — then track what's missing.` |

### "Browse commanders" CTA

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Sans'` | `'IBM Plex Sans'` |
| font-weight | `600` | `600` |
| font-size | `14px` | `14px` |
| color | `#14110E` (token: **base**) | `#14110E` (token: **base**) |
| background | `#C9A24B` (token: **accent**) | `#C9A24B` (token: **accent**) |
| border | `none` | `none` |
| border-radius | `8px` | `8px` |
| padding | `13px 26px` | `12px 26px` |
| margin-top | `24px` | — |
| cursor | `pointer` | `pointer` |

### "Browse commanders" button — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `#D8B25E` (token: **accent-hover**) |

---

## Component: Account Popover (Desktop)

### Popover container

| Property | Mobile | Desktop |
|----------|--------|---------|
| — | — | — |
| position | — | `absolute; left:12px; right:12px; bottom:calc(100% - 6px)` |
| background | — | `#221D16` |
| border | — | `1px solid #3A3229` (token: **line**) |
| border-radius | — | `14px` |
| box-shadow | — | `0 20px 50px rgba(0,0,0,0.6)` |
| padding | — | `8px` |
| z-index | — | `20` |

### Popover: Account header row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `12px` |
| padding | — | `12px 12px 14px` |
| border-bottom | — | `1px solid #2A241D` (token: **elevated**) |

### Popover: Avatar

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | `44px` |
| height | — | `44px` |
| border-radius | — | `12px` |
| background | — | `#14110E` (token: **base**) |
| border | — | `1px solid #C9A24B` (token: **accent**) |
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `14px` |
| color | — | `#C9A24B` (token: **accent**) |

### Popover: User name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | `14px` |
| color | — | `#EDE6D8` (token: **primary**) |
| font-weight | — | `600` |

### Popover: User email

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `11px` |
| color | — | `#8E8269` (token: **faint**) |
| margin-top | — | `2px` |
| overflow | — | `hidden` |
| text-overflow | — | `ellipsis` |

### Popover: Menu item — "Manage account"

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `11px` |
| padding | — | `11px 12px` |
| border-radius | — | `8px` |
| font-size | — | `14px` |
| color | — | `#EDE6D8` (token: **primary**) |
| cursor | — | `pointer` |
| Diamond color | — | `#C9A24B` (token: **accent**) |
| Diamond size | — | `6px × 6px` |

### Popover: Menu item — "Manage account" — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `#2A241D` (token: **elevated**) |

### Popover: Menu item — "Sign out"

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `11px` |
| padding | — | `11px 12px` |
| border-radius | — | `8px` |
| font-size | — | `14px` |
| color | — | `#EDE6D8` (token: **primary**) |
| cursor | — | `pointer` |
| Diamond color | — | `#C6533F` (token: **danger**) |
| Diamond size | — | `6px × 6px` |

### Popover: Menu item — "Sign out" — Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `#2A241D` (token: **elevated**) |

### Popover: "SECURED BY CLERK" caption

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `10px` |
| color | — | `#6A6152` |
| text-align | — | `center` |
| padding | — | `8px 0 4px` |
| letter-spacing | — | `0.08em` |
| content | — | `SECURED BY CLERK` |

---

## Component: Account Bottom Sheet (Mobile)

### Overlay backdrop

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute; inset:0` | — |
| background | `rgba(10,8,6,0.72)` | — |
| z-index | `8` | — |

### Bottom sheet container

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `relative; z-index:9` | — |
| background | `#1E1A15` (token: **surface**) | — |
| border-top | `1px solid #3A3229` (token: **line**) | — |
| border-radius | `20px 20px 0 0` | — |
| padding | `20px 20px 26px` | — |

### Bottom sheet: Drag handle

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `40px` | — |
| height | `4px` | — |
| border-radius | `2px` | — |
| background | `#3A3229` (token: **line**) | — |
| margin | `0 auto 20px` | — |

### Bottom sheet: Account header

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex; align-items:center; gap:14px` | — |
| padding-bottom | `18px` | — |
| border-bottom | `1px solid #2A241D` (token: **elevated**) | — |

### Bottom sheet: Avatar (large)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `48px` | — |
| height | `48px` | — |
| border-radius | `14px` | — |
| background | `#14110E` (token: **base**) | — |
| border | `1px solid #C9A24B` (token: **accent**) | — |
| font-family | `'IBM Plex Mono', monospace` | — |
| font-size | `15px` | — |
| color | `#C9A24B` (token: **accent**) | — |

### Bottom sheet: User name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `16px` | — |
| color | `#EDE6D8` (token: **primary**) | — |
| font-weight | `600` | — |

### Bottom sheet: User email

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | — |
| font-size | `12px` | — |
| color | `#8E8269` (token: **faint**) | — |
| margin-top | `2px` | — |

### Bottom sheet: Menu item — "Manage account"

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex; align-items:center; gap:12px` | — |
| padding | `15px 6px` | — |
| font-size | `15px` | — |
| color | `#EDE6D8` (token: **primary**) | — |
| Diamond color | `#C9A24B` (token: **accent**) | — |

### Bottom sheet: Menu item — "Sign out"

| Property | Mobile | Desktop |
|----------|--------|---------|
| border-top | `1px solid #2A241D` (token: **elevated**) | — |
| display | `flex; align-items:center; gap:12px` | — |
| padding | `15px 6px` | — |
| font-size | `15px` | — |
| color | `#EDE6D8` (token: **primary**) | — |
| Diamond color | `#C6533F` (token: **danger**) | — |

### Bottom sheet: "SECURED BY CLERK" caption

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | — |
| font-size | `10px` | — |
| color | `#6A6152` | — |
| text-align | `center` | — |
| margin-top | `14px` | — |
| letter-spacing | `0.08em` | — |
| content | `SECURED BY CLERK` | — |

---

## Component: SVG / Marks Summary

### Crowned-99 (identity mark) — dimensions by context

| Context | Crown diamond sizes (s/l/s) | Numeral size | Gap | Notes |
|---------|----------------------------|--------------|-----|-------|
| Signed-out hero (mobile) | 13/18/13px | 92px, weight 900 | 8px | translateX(-2px) |
| Signed-out hero (desktop) | 18/25/18px | 132px, weight 900 | 11px | translateX(-3px) |
| Rail wordmark | 6/8/6px | 30px, weight 800 | 4px | translateX(-1px) on crown row |
| Mobile header | 5/7/5px | 24px, weight 800 | 3px | — |
| "THE" label with all versions | letter-spacing 0.42em (desktop rail/wordmark), 0.4em (mobile) | — | — | |
| Mark usage reference panel | 6/8/6px | 34px | 4px | canvas only |

### Card-fan mark — dimensions by context

| Context | Container | Card dimensions | Rotation angles |
|---------|-----------|-----------------|-----------------|
| Collection empty (mobile) | 100×110px | 52×74px | -14° / 0° / +14° |
| Collection empty (desktop) | 120×130px | 60×84px | -16° / 0° / +16° |
| Decks empty (mobile) | 100×110px | 52×74px | -14° / 0° / +14° |
| Decks empty (desktop) | 120×130px | 60×84px | -15° / 0° / +15° |
| Mark usage reference panel | 66px height, 32×46px cards | — | -15° / 0° / +15° |

### XCIX seal — dimensions by context

| Context | Container size | Border-radius | Border |
|---------|----------------|---------------|--------|
| Commanders empty (mobile) | 64×64px | 14px | 2px solid `#C9A24B` |
| Commanders empty (desktop) | 78×78px | 16px | 2px solid `#C9A24B` |
| Mark usage reference panel | 52×52px | 12px | 2px solid `#C9A24B` |

---

## Component: Crab Mark (character layer — richness pass)

> Source: `src/components/character/crab.tsx`. Geometry ported verbatim from `design/design_handoff_the99_richness/crab.svg`; hex tokens swapped for CSS custom properties.

### Crab SVG

| Property | Value |
|----------|-------|
| viewBox | `0 0 160 110` |
| width / height | `size` prop (px) / `size × 110/160` (maintains 160:110 aspect ratio) |
| aria-hidden | `true` |
| focusable | `false` |
| animation class | `anim-bob` (when `bobSeconds > 0`) |
| `--bob-duration` CSS var | `${bobSeconds}s` (default `4.5s`) |
| Leg strokes | `stroke: var(--brass)`, `strokeWidth: 3`, `strokeLinecap: round`, `strokeLinejoin: round`, `fill: none` |
| Carapace fill | `var(--surface)` |
| Carapace stroke | `var(--brass)`, `strokeWidth: 3` |
| Pincer fill | `var(--surface)` |
| Pincer stroke | `var(--brass)`, `strokeWidth: 3` |
| Eye fill | `var(--brass)` (pupils) |
| Eye sclera fill | `var(--surface)` |
| Eye stroke | `var(--brass)`, `strokeWidth: 3` |
| Mouth stroke | `var(--brass)`, `strokeWidth: 3`, `strokeLinecap: round` |

### Crab — sizes by context

| Context | Mobile size | Desktop size | Notes |
|---------|-------------|--------------|-------|
| First-run checklist heading | `72px` | `96px` | Beside h1 in `flex items-end` row |
| Global loading state | `96px` | `96px` | Same size both breakpoints |
| 404 state | `96px` | `96px` | Same size both breakpoints; `mt-[-14px] mb-[18px]` |
| Decks empty state | `64px` | `80px` | Side-by-side with CardFan |

### Crab — bob animation

| Property | Value |
|----------|-------|
| Keyframe name | `bob` |
| Keyframe | `0%,100% { transform: translateY(0) }; 50% { transform: translateY(-5px) }` |
| Class | `.anim-bob` |
| Default duration | `4.5s` (via `--bob-duration` CSS custom property, override per instance) |
| Timing function | `ease-in-out` |
| Iteration | `infinite` |
| Reduced-motion fallback | `.anim-bob { animation: none }` in `@media (prefers-reduced-motion: reduce)` |

---

## Component: LoaderDots

> Source: `src/components/character/loader-dots.tsx`. Three staggered brass dots paired with the Crab on loading surfaces.

### LoaderDots container

| Property | Value |
|----------|-------|
| display | `flex` |
| gap | `6px` |
| aria-hidden | `true` |

### Each dot

| Property | Value |
|----------|-------|
| width / height | `7px` / `7px` |
| border-radius | `999px` (rounded-full) |
| background | `var(--brass)` |
| animation class | `anim-dots` |
| animation-delay | `0s`, `0.2s`, `0.4s` (staggered) |

### Dots animation

| Property | Value |
|----------|-------|
| Keyframe name | `dots` |
| Keyframe | `0%,100% { opacity: 0.25 }; 50% { opacity: 1 }` |
| Class | `.anim-dots` |
| Duration | `1.2s` |
| Timing function | `ease-in-out` |
| Iteration | `infinite` |
| Reduced-motion fallback | `.anim-dots { animation: none }` in `@media (prefers-reduced-motion: reduce)` |

---

## Component: Motion tokens (globals.css — richness pass)

> New CSS tokens and animation utilities added in the richness pass. Scoped reduced-motion pattern intentional: adding a new animation forces an explicit static-fallback decision rather than silently inheriting a blanket `* { animation: none }`.

### New color tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--kaiju-body` | `#0B0907` | Kaiju silhouette fill — deeper than `--bg` so it reads as a hole in the canvas |
| `--celebrate-top` | `#171310` | Celebration gradient top stop |
| `--celebrate-bottom` | `#110E0B` | Celebration gradient bottom stop |

### Animation keyframes

| Keyframe | Definition | Use |
|----------|------------|-----|
| `bob` | `0%,100% { transform: translateY(0) }; 50% { transform: translateY(-5px) }` | Crab idle float |
| `dots` | `0%,100% { opacity: 0.25 }; 50% { opacity: 1 }` | LoaderDots pulse |
| `breathe` | `0%,100% { transform: scale(1) }; 50% { transform: scale(1.02) translateY(3px) }` | Kaiju idle (ships unused — pending #61) |
| `rise` | `0% { transform: translateY(18px); opacity: 0 }; 100% { transform: translateY(0); opacity: 1 }` | Entry reveal |

### Animation utility classes

| Class | Animation | Duration | Timing | `--bob-duration` override |
|-------|-----------|----------|--------|--------------------------|
| `.anim-bob` | `bob` | `var(--bob-duration, 4.5s)` | `ease-in-out infinite` | Yes — set per instance via CSS custom property |
| `.anim-dots` | `dots` | `1.2s` | `ease-in-out infinite` | No |
| `.anim-breathe` | `breathe` | `10s` | `ease-in-out infinite` | No |
| `.anim-rise` | `rise` | `0.8s` | `ease-out both` | No |

### Reduced-motion block

| Selector | Declaration |
|----------|-------------|
| `.anim-bob, .anim-dots, .anim-breathe, .anim-rise` (inside `@media (prefers-reduced-motion: reduce)`) | `animation: none` |

---

## Component: Global Loading State (`app/loading.tsx`)

### Loading page container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| flex-direction | `column` | `column` |
| align-items | `center` | `center` |
| justify-content | `center` | `center` |
| text-align | `center` | `center` |
| padding | `40px` | `40px` |
| min-height | `420px` | `520px` |
| background-color | `var(--bg)` | same |
| background-image | `radial-gradient(560px 320px at 50% 68%, rgba(201,162,75,0.08), transparent 70%)` | same |

### Loading: Crab + dots cluster

| Property | Value |
|----------|-------|
| Crab size | `96px` (both breakpoints) |
| LoaderDots position | `absolute top-[-4px] right-[-22px]` relative to `inline-flex` wrapper |

### Loading: Heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-display)` (Cinzel) | `var(--font-display)` |
| font-weight | `700` (bold) | `700` |
| font-size | `19px` | `22px` |
| color | `var(--fg)` (`#EDE6D8`) | `var(--fg)` |
| margin-top | `24px` | `24px` |
| margin-bottom | `0` | `0` |
| content | `"Reading your collection"` | `"Reading your collection"` |

### Loading: Status line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `12px` | `13px` |
| color | `var(--fg-faint)` (`#8E8269`) | `var(--fg-faint)` |
| margin-top | `8px` | `8px` |
| margin-bottom | `0` | `0` |
| content | `"matching to Oracle…"` | `"matching to Oracle…"` |

### Loading: Caption

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `13.5px` | `15px` |
| color | `var(--fg-body)` (`#C6B79A`) | `var(--fg-body)` |
| max-width | `380px` | `380px` |
| margin-top | `10px` | `10px` |
| margin-bottom | `0` | `0` |
| line-height | `1.6` | `1.6` |
| content | `"This is the boring part. I'll flag anything that looks off."` | same |

---

## Component: 404 State (`app/not-found.tsx`)

### 404 page container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| flex-direction | `column` | `column` |
| align-items | `center` | `center` |
| justify-content | `center` | `center` |
| text-align | `center` | `center` |
| padding | `40px` | `40px` |
| min-height | `400px` | `480px` |
| background-color | `var(--bg)` | same |
| background-image | `radial-gradient(520px 300px at 50% 70%, rgba(201,162,75,0.07), transparent 70%)` | same |

### 404: Numeral

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-display)` (Cinzel) | `var(--font-display)` |
| font-weight | `900` | `900` |
| font-size | `48px` | `64px` |
| color | `var(--elevated)` (`#2A241D`) | `var(--elevated)` |
| letter-spacing | `0.04em` | `0.04em` |
| line-height | `1` (leading-none) | `1` |
| content | `"404"` | `"404"` |

### 404: Crab

| Property | Value |
|----------|-------|
| size | `96px` (both breakpoints) |
| margin-top | `-14px` |
| margin-bottom | `18px` |

### 404: Heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-display)` (Cinzel) | `var(--font-display)` |
| font-weight | `700` (bold) | `700` |
| font-size | `21px` | `24px` |
| color | `var(--fg)` (`#EDE6D8`) | `var(--fg)` |
| margin | `0` | `0` |
| content | `"There's no page here."` | `"There's no page here."` |

### 404: Caption

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `13.5px` | `15px` |
| color | `var(--fg-body)` (`#C6B79A`) | `var(--fg-body)` |
| max-width | `380px` | `380px` |
| margin-top | `10px` | `10px` |
| margin-bottom | `0` | `0` |
| line-height | `1.6` | `1.6` |
| content | `"I checked. Twice. Probably a typo in the URL — happens to the best of us."` | same |

### 404: CTA row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| flex-direction | `column` | `row` |
| gap | `12px` | `12px` |
| margin-top | `24px` | `24px` |

### 404: Primary CTA ("Back home")

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-weight | `600` (semibold) | `600` |
| font-size | `13px` | `14px` |
| color | `var(--bg)` (`#14110E`) | `var(--bg)` |
| background | `var(--brass)` (`#C9A24B`) | `var(--brass)` |
| border-radius | `8px` | `8px` |
| padding | `12px 22px` | `12px 22px` |
| href | `/` | `/` |

### 404: Primary CTA — Hover

| Property | Value |
|----------|-------|
| background | `var(--brass-hover)` (`#D8B25E`) |

### 404: Secondary CTA ("View decks")

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-weight | `600` (semibold) | `600` |
| font-size | `13px` | `14px` |
| color | `var(--fg)` (`#EDE6D8`) | `var(--fg)` |
| border | `1px solid var(--border-strong)` (`#3A3229`) | same |
| border-radius | `8px` | `8px` |
| padding | `12px 22px` | `12px 22px` |
| href | `/decks` | `/decks` |

### 404: Secondary CTA — Hover

| Property | Value |
|----------|-------|
| border-color | `var(--brass)` |
| color | `var(--brass-hover)` (`#D8B25E`) |

---

## Component: Home Dashboard Vignette

> Applied via Tailwind `bg-[…]` on the dashboard root div. Mobile and desktop share the same gradient spec; position shifts on first-run vs. signed-in.
>
> Tailwind's `bg-[…]` arbitrary utility emits `background-image` only, so a trailing `, var(--bg)` colour makes the whole declaration invalid and the gradient silently disappears. Pair the gradient utility with a separate `bg-[color:var(--bg)]`.

| Surface | Gradient spec | Applied in |
|---------|---------------|------------|
| Signed-in home dashboard | `radial-gradient(760px 380px at 45% -60px, rgba(201,162,75,0.08), transparent 70%)` | `src/components/home/dashboard.tsx` |
| First-run checklist | `radial-gradient(640px 340px at 40% -40px, rgba(201,162,75,0.07), transparent 70%)` | `src/components/home/first-run.tsx` |
| Global loading state | `radial-gradient(560px 320px at 50% 68%, rgba(201,162,75,0.08), transparent 70%)` over `var(--bg)` | `src/app/loading.tsx` |
| 404 state | `radial-gradient(520px 300px at 50% 70%, rgba(201,162,75,0.07), transparent 70%)` over `var(--bg)` | `src/app/not-found.tsx` |

---

## Component: First-Run Checklist — Crab placement (richness pass)

> Crab added beside the page heading in `src/components/home/first-run.tsx`. Wrapper uses `flex items-end` so the crab aligns to the heading baseline.

### Heading + Crab row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `flex-end` | `flex-end` |
| gap | `16px` | `22px` |
| Crab size | `72px` | `96px` |

---

## Component: Decks Empty State — Crab pairing (richness pass)

> CardFan mark and Crab rendered side-by-side in `src/app/decks/page.tsx` empty state. Mobile uses `CardFan variant="mobile"` + `Crab size={64}`; desktop uses `CardFan variant="decks-desktop"` + `Crab size={80}`.

### CardFan + Crab container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `flex-end` | `flex-end` |
| justify-content | `center` | `center` |
| gap | `14px` | `18px` |
| margin-bottom | `22px` | `26px` |

### Crab sizes

| Breakpoint | CardFan variant | Crab size |
|------------|-----------------|-----------|
| Mobile | `mobile` (100×110px container) | `64px` |
| Desktop | `decks-desktop` (120×130px container) | `80px` |

### No-decks heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| content | `"No decks yet."` | `"No decks yet."` |

> Note: terminal period added in richness pass Task 11. Table row under §Empty State — No Decks updated accordingly.

---

## State Coverage — App Shell

| State | Triggering condition | Renders | Key data required |
|-------|---------------------|---------|-------------------|
| **Signed-out landing** | User is not authenticated (no Clerk session) | Crowned-99 hero mark, tagline, "Sign in" button, "Invite-only" note; no nav | None (public page) |
| **First-run checklist** | Authenticated + collection is empty (no CSV uploaded) | Full shell with rail/tabs; home content = 3-step checklist; step 1 active (dropzone); steps 2–3 locked+dimmed; rail surfaces show locked state with "Surfaces unlock once your collection is uploaded." caption | `user.name` (for greeting "Welcome to the 99, {name}") |
| **Signed-in home dashboard** | Authenticated + collection has cards | Full shell; hero commander card; "Recommended" grid (3 cards desktop, compact list mobile); recent decks list; collection stats panel; "Update collection" button | `recommendCommanders()[0]` (most complete: name, type, colorIdentity, owned count, completeness %); `recommendCommanders().slice(0,3)` (rec grid); `decks` (recent 3: name, commander, owned/99, status, color); collection stats (totalCards, uniqueCards, buildableCommanders, decksBuilt) |
| **Commanders surface — populated** | Authenticated + collection has ≥1 legal commander candidate | Rail with Commanders active; page heading "Commanders"; sub-line `{n} buildable from cards you own · ranked by completeness`; color filter chips (WUBRG + All colors + Buildable ≥ 90%); commander grid (3 cols desktop) | List of buildable commanders each with: name, type, colorIdentity (pips), owned/99, completeness % |
| **Collection empty state** | Authenticated + navigates to `/collection` + no CSV uploaded | Full shell; Collection active in nav; card-fan mark; "Your collection is empty" heading; body copy; "Upload collection" + "Paste a list" CTAs | None (no data needed to render) |
| **No commander candidates** | Authenticated + CSV uploaded + 0 eligible commanders (no owned legendary creatures) | Full shell; Commanders active in nav; XCIX seal; "No generals in the ranks — yet" heading (brass); body copy; scanned-count mono line (`{n} cards scanned · 0 eligible commanders`); "Add more cards" (primary) + "View collection" (secondary) CTAs | `collection.totalCount` (for scanned-count display) |
| **No decks** | Authenticated + navigates to `/decks` + 0 decks built | Full shell; Decks active in nav; card-fan mark + Crab (64px mobile / 80px desktop) side-by-side; "No decks yet." heading (terminal period); body copy; "Browse commanders" CTA | None |
| **Account popover open (desktop)** | User clicks account trigger row in rail | Popover rendered above account row (absolute, z-index 20); shows avatar, name, email, "Manage account" (brass diamond), "Sign out" (red diamond), "SECURED BY CLERK" caption; rest of UI visible behind | `user.name`, `user.email`, user initials (for avatar) |
| **Account bottom sheet open (mobile)** | User taps avatar in top-right of mobile header | Overlay backdrop `rgba(10,8,6,0.72)` covers page; bottom sheet slides up with drag handle, avatar (48px), name, email, "Manage account", "Sign out", "SECURED BY CLERK" | `user.name`, `user.email`, user initials |
| **Nav active states** | Current route matches nav destination | Active item: `bg #2A241D`, `color #EDE6D8`, `font-weight 600`, brass diamond; Mobile: active tab gets brass diamond + brass label `font-weight 600`; all other items idle | Current route path |
| **Nav locked state** | Authenticated + collection is empty (pre-upload) | Collection, Commanders, Decks rail items render at `color #8E8269` (token: **faint**); no hover state; lock caption shown below nav items. Note: lifted from `#6A6152` for WCAG AA contrast during richness pass Task 8. Two `--fg-locked` (`#6A6152`) sites intentionally remain and are SC 1.4.3-exempt: `caretColor` in `upload-entry.tsx` (non-text) and a disabled button in `issue-inspector.tsx` (inactive control). | `collection.isEmpty` boolean |
| **Paste-list view (mobile)** | User taps "Paste a list instead" link in step 1 dropzone | Mobile only: replaces checklist content with paste view; back arrow (`‹`, brass), "Paste a list" heading; instructions; mono textarea; recognized-count label; "Import {n} cards" button; "Upload a CSV instead" link | Live recognized-count (client-side parsing: `{n} lines · {n} cards recognized`) |
| **Global loading state** | Next.js Suspense fallback fires (any route data-fetching) | `app/loading.tsx`: crab (96px, bobbing) + LoaderDots absolute top-right; heading "Reading your collection"; mono status "matching to Oracle…"; body caption; warm vignette background | None |
| **404 state** | User navigates to a non-existent route | `app/not-found.tsx`: brass "404" numeral (48px/64px, `--elevated`); crab (96px, mt -14px mb 18px); heading "There's no page here."; caption; "Back home" (primary brass) + "View decks" (secondary border) CTAs. Note: the "404" numeral (`--elevated` `#2A241D` on `--bg` `#14110E`, ~1.24:1) is SC 1.4.3-exempt — it carries `aria-hidden="true"` and is purely decorative; the `<h1>` beneath it carries the meaning. | None |
