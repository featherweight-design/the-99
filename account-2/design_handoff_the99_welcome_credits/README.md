# The 99 · Welcome credits · R2 (drawn, awaiting Hugh's review)

Where a new sign-up learns which tools spend their 15 welcome credits, when the lot expires, and that `/credits` exists.
Launch epic D2. Behind `WELCOME_CREDITS_ENABLED` (which needs `PAYMENTS_ENABLED`). Account 2, 2026-10-21.

Source of truth: `docs/superpowers/design-briefs/2026-10-18-welcome-credits-onboarding.md` (main, #2071). Its
"Rulings that bind the screens" and its "Ruled by the orchestrator" section are closed and not reopened here, and no
call in `design/design_handoff_the99_buying_credits/README.md` is reopened.

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them, then
rebuild in the app's stack. Kamigawa (Neon Rain) values unless a board says otherwise; new things are outlined in pink
dashes. Art is in `art/` by relative path; on the canvas it is uploaded as assets. **No new tokens, no new motion, no new
dependencies.** Canvas (account 2): https://claude.ai/artifact/NSvXWeJpAUSfjdrfJsQREw

## R2 (2026-10-21), after Hugh's R1 feedback · supersedes R1's placement, section and states

Hugh: the section was too large and a wall of text, fell below the fold on the phone, left a hole under the right
column on the dashboard, and drew a 0 state where none can happen (nothing runs before a collection).

| Read | For |
|---|---|
| **`R2-Main.dc.html`** | What changed, against each point of the feedback. |
| `R2-Placement.dc.html` | The strip on the first-run Home and the dashboard, 390 (at the fold and full length) and desktop. |
| `R2-Sheet.dc.html` | `Where credits work` in the shipped sheet (390) and modal (desktop): before a collection, cards in with no deck, with a deck; and from the Welcome cell on `/credits`. |
| `R2-States.dc.html` | Every state, on the Home it can happen on. |
| `R2-Themes.dc.html` | Low Sun and First Frost. |

- **The strip.** One line on Home in the About line's family: the lot's mark, `15 welcome credits to try the tools,
  until Nov 20.`, the link `Where they work`, and a bare ✕ (closes for good, per account). First-run Home: under the
  About line. Dashboard: heads the main column, over Ready to build; the right column is Friends alone, as shipped. Above
  the fold at 390 × 844 on both.
- **The sheet.** The list moves off Home into the shipped SocialModal (sheet at 390, 460 modal on desktop): title, R4's
  L6 line, the grant line with its date (the free credit goes first), the five rows as name, where and cost (the
  descriptions are dropped), then the teaser at the foot while payments are on and nothing is bought.
- **Try it.** Before a collection nothing can run (New deck and Commanders are locked at 0 cards), so no `Try it`: the
  shipped lock line `Opens once your cards are in` once, over all five. With cards and no deck: Help me choose leads
  with `Try it ›`, then the needs-a-deck line once. With a deck: About's order, `Try it ›` on the three with a landing.
- **The reference that stays.** The Welcome cell on `/credits` reads `expire Nov 20 · Where they work`, opening the
  same sheet (without the teaser), for as long as a credit is held, so closing the strip loses nothing.
- **States.** Held, expiring, switch off and payments off on the first-run Home; partly spent, used up, the paid limit
  and also bought on the dashboard only. Used up says `You've used all 15 welcome credits.` with `More on Credits`
  (payments on, nothing bought) or `Your free credit comes back each day.`; it leaves on the date or ✕. Expired and no
  lot: nothing.
- **Unchanged from R1:** the credit line and chip (Line-and-Chip), the Welcome cell's date (Credits-Page), `--warning`
  at 3 days, the gaps below.

The R1 boards below stay on the canvas as the record; where they differ, R2 wins.

## R1 · Start here

| Read | For |
|---|---|
| **`Main.dc.html`** | **The seven calls, every ruling and where it's honoured, the gaps.** |
| `Placement.dc.html` | Open 1: the four candidates against engineering's read; the call (a card on Home) on the first-run Home and the dashboard, 390 and desktop. |
| `Section.dc.html` | Items 2 and 3: the section, its rows, `Try it` and the reason line, with and without a deck; its spec. |
| `Line-and-Chip.dc.html` | Item 4 (Open 3, 5): the credit line with welcome credits on the shipped press, W1 to W6; the chip by state. |
| `Credits-Page.dc.html` | Item 5 (Open 4, 5): the Welcome cell's line and its expiring form; also bought; payments off. |
| `States-A` to `States-D` | Item 6: every row of the brief's "Every state to draw", first-run Home at 390 and desktop, with the chip, the line and the balance beside each. |
| `Themes.dc.html` | Low Sun (Amonkhet) and First Frost (Kaldheim). |
| `STATES-welcome-credits.md` | The state matrix, with what each state must not do. |
| `READINESS.md` | The verdict and what blocks the build. |
| `welcome-credits · copy strings.ts` | Every new string, for /copy-review. |

## The calls

### 1 · Placement: a card on Home
The section **is** the Home card: the last thing in the first-run Home's stack, under the Friends row and unnumbered like
it (the kicker stays `Step 1 of 3`); on the dashboard, the foot of the 316 right column under Friends (desktop) and the
last block (phone, after Commitments' slot). No moment, no tour stop, no new menu row.

Why: it is the only candidate on screen without a press, it sits under step 1 so it competes with nothing, and being in
the page it never arrives over an open surface or on the tour's visit. Hugh prefers an inline place on the shipped page
to a follow-up step. The others, drawn for comparison: **A** a first-run moment (needs a slot and an anchor, the chip
can't anchor it, visit 2 at the earliest); **C** the chip and `/credits` alone (kept as where the facts live, but it
needs a press); **D** a seventh tour stop (changes `Six stops`, switch-bound, skippers never see it).

### 2 · Try it, and the reason line (ruled; how it sits is the call)
- **No deck** (every new sign-up): Help me choose leads, with `Try it ›` in its where line. Then the shipped reason line
  once, `Needs a deck, and you have none yet.` (11px mono, `--fg-muted`, after a hairline), over the other four rows.
- **With a deck**: About's order; `Try it ›` on the three tools with a landing of their own (`suggested-changes`,
  `proposed-cuts`, `help-me-choose`). Overview and Which deck needs it most? have none, so their where line stands
  alone. No second landing.

### 3 · Welcome credits on the credit line and the chip (Open 3)
- **Line:** welcome takes its own segment, in spend order: `1 of 1 free · 15 welcome · 40 paid`. The L3 form reads
  `this run uses 1 of 15 welcome`, and `first` says `Uses a welcome credit.` Plan and packs stay one number, `paid`.
  No colour change: spending a gift is not a warning.
- **Chip:** one number, as shipped (`16 credits`, free plus held). The menu is not where the lot is explained.
- **Limit (L5):** names welcome among what is banked. 15 welcome runs can't reach the 20-run limit alone, so this state
  needs a purchase too.

### 4 · The Welcome cell's line (Open 4)
`expire Nov 20`, the shape of a cancelled plan's `expire Nov 16`, in the reader's own day (drawn after hydration, like the
Free cell's reset time). The cell still shows only while it holds a credit.

### 5 · The expiring state (3 days, ruled)
Every surface that names the lot turns `--warning`, never `--danger`: the section's border and grant line (`9 welcome
credits expire in 3 days, on November 20.`), the Welcome cell (`expire in 3 days, Nov 20`), the credit line's tail (`9
welcome credits expire Nov 20`, shaped like a plan's L7) and the chip, with that line under it, as a cancelled plan's.
The words carry it: in Low Sun `--warning` sits close to the accent.

### 6 · The teaser
One line at the section's foot, `Credit packs and the monthly plan are on Credits ›`, to `/credits`. Packs first (L6).
Absent, never disabled, with payments off for the reader; gone once the reader has bought anything (`everBought`).

### 7 · Dismissal
A bare `✕` closes the section for good, stored per account. It leaves on its own on the expiry date. Used up, it stays
until then, saying so, with the teaser (payments on). Expired: nothing anywhere; a last line would nag, and the free
credit carries on.

### Other calls on the way
- **The section's content:** the pack card's diamond (R2b offer art) carrying the welcome credits left; the title
  `Where credits work`; the grant line with its date; R4's line, `Browsing is always free. Anything we write just for you
  uses a credit.` (L6, kept identical to `/credits`), then the intro (the free credit goes first); the five rows reused
  whole from `writtenForYouCopy.rows`, drawn as About draws them; the teaser.
- **Switch off, lot held:** the section draws as held. The switch gates the write only and the lot still spends, so its
  facts are true; hiding them recreates the problem this brief fixes.
- **Payments off, lot held:** the section without the teaser; no `Get more credits`; `/credits` reduced, the Welcome cell
  kept.
- **Paid limit:** the section adds nothing; the press disables and the line takes the limit form.
- **`/credits` head:** carries R4's line (placement B, approved 2026-10-21).

## Gaps

| # | Gap | Who |
|---|---|---|
| G1 | Home reads the lot per request, outside the cached payload, as the chip does: units, left, expiry (the grant row read the brief describes). `Used up` and `Partly spent` need it. | Eng |
| G2 | The dismissal is stored per account (a spent-like flag, like a moment's), so it holds across devices; a purchase never clears it. | Eng |
| G3 | `creditsCopy` gains the welcome segment forms (`withWelcome`, `welcomeNext`, a welcome `expiring`, the limit form naming welcome) and `firstWelcome`; `Allowance` gains the welcome expiry. | Eng |
| G4 | Dates in the reader's own day: the shipped `expiring` and `shortDay` read UTC. The welcome forms render after hydration. | Eng |
| G5 | With a plan and the welcome lot both within 3 days, the chip's line names the earlier; the credit line names both. | Eng |
| G6 | Rows follow `captionLineSwitches`, as Written for you does; with every row off the section is absent. | Eng |
| G7 | About entry not drawn: it joins the launch-end batch (launch plan G1). New entry or an edit to `credits` is Hugh's call. | Hugh |
| G8 | Every string is a placeholder in `welcome-credits · copy strings.ts`, for /copy-review. | Note |

## Not drawn
- Converting the leftover on purchase (out of scope; nothing promises it).
- Invite credits, the value recap at the wall, email reminders.
- The About entry (G7).
