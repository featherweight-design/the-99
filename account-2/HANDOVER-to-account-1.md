# Handover: account 2 to account 1 (2026-10-16)

Give this file to account 1 at the start of its next Design session. Repo: `HartiganHM/the-99`.

## State on GitHub

Everything account 2 designed is pushed. `design-assets` tip at handover: `44d33f6`. Every approved handoff is merged into main under `design/`. No design PRs are open.

| Round | design-assets `account-2/` | Handoff on main | PR |
|---|---|---|---|
| Basic-lands stepper (R2) | design_handoff_the99_basic_lands_stepper | same name | #1747 |
| Upcoming precons + Home banner (R2) | design_handoff_the99_upcoming_precons | same name | #1751 |
| Small polish: lock, placeholder, motion, precon skeleton, token tile (R2) | design_handoff_the99_small_polish | same name | #1756 |
| Help me choose history (R1) | design_handoff_the99_hmc_history | same name | #1765 |
| Collection Sync, third upload choice (R2) | design_handoff_the99_collection_sync | same name | #1771 |
| Foil treatment R1 (tiles) | design_handoff_the99_foil_treatment | same name | #1776 |
| No-collection entry (R2 + R3 addendum) | design_handoff_the99_no_collection_entry | same name | #1788 |
| Proposed cuts About entry (R1) | design_handoff_the99_proposed_cuts_about | same name | #1791 |
| Social R1: friends and pods | design_handoff_the99_social_r1 | same name | #1796 |
| Foil treatment R2 (large views, subtle tilt) | design_handoff_the99_foil_treatment | same name | #1797 |
| Social R3: opponents, who won, matchups (+ G9 commander image focus) | design_handoff_the99_social_r3 | same name | #1798 |
| Announced reveal collapse (addendum A1) | design_handoff_the99_upcoming_precons/addendum-announced-collapse | same path | #1849 |
| Social R2: wishlist, friend's wishlist, spares | design_handoff_the99_social_r2 | same name | #1858 |
| Social About entries (4 entries) | design_handoff_the99_about/addendum-social-line | same path | #1873 |
| Foil mark addendum (glint under the ownership dot) | design_handoff_the99_foil_treatment/addendum-foil-mark | same path | #1875 |
| Card rows one line (addendum L1) | design_handoff_the99_card_rows/addendum-one-line | same path | #1901 |
| Card scanning (R1, B scan mark + T3 flipping count card) | design_handoff_the99_card_scan | same name | #1903 |

Build prompts for all of these were handed to Hugh for Claude Code CLI. Open idea, not started: move the About notification into the Home banner (its own handoff later).

## Sync rules

1. Before designing, pull `design-assets` and read `account-2/` (newest work) and `account-1/` (your own earlier exports). For anything already built, main's `design/design_handoff_the99_*` is the approved version.
2. Don't re-import `.dc.html` files as Design projects. Use repo files as reference and rebuild canvases.
3. Commit Design exports unchanged to `design-assets` under `account-1/` only. Never write to `account-2/`. No restructuring, renaming or deduping.
4. Never merge `design-assets` into main and never open a PR from it.
5. Commit messages name the account, the date and what changed, for example `account-1 2026-10-17: deck notes R1 for Hugh's audit`.
6. When Hugh approves a round, open a normal PR to main that adds `design/design_handoff_the99_<name>/` (or an `addendum-*` folder inside an existing handoff). Don't touch main's `design/` any other way.
7. Push at the end of every session. The accounts alternate around the Friday usage reset, and the other account starts from whatever is on GitHub.
8. Canvases can't load Scryfall images, so upload images as canvas assets and reference them by their `/_blob` URL. Relative `art/` paths show as broken.

## Hugh's standing design rules

- Draw boards over the real shipped pages, not a simplified app frame. Match the shipped UI on every design, and extend shipped surfaces (for example a section in the shipped stand-ins modal) instead of inventing new ones.
- Prefer an inline option on the existing flow (like the precon "I own this" checkbox) over a follow-up banner or extra step.
- Use minimalist controls, one control per action, never split controls. Close buttons are a bare ✕ with no "Dismiss" text.
- Keep settings in one place, with no duplicate fields. Don't add rows to the user menu; prefer a tab on an existing page.
- Hugh likes personality: card art, flips, subtle tilt. Plain screens read as unfinished.
- Never show broken images, and use crops from the design folder. No board may be cut off, so check every board fully renders before handing over.
- Show cards at card size and shape, not the picture-frame crop used for user images. No stamps that don't fit the design system.
- Keep dense rows (like Shopping) uncrowded with large mobile hit boxes: a small marker explained in the key, opening a modal on desktop or a drawer on phone like existing UIs.
- Don't draw states or screens that have no real trigger. Transient errors use the shared toast (ToastFrame).
- Friend names in fixtures are Colin, Peter, Max and Chris.
- Hugh sometimes opens option cards just to view mocks. Don't treat that as a pick; wait for his words.

## How a round runs

Hugh posts a design request. Read the references and brief from the repo, build canvases, commit to `account-1/`, take Hugh's audit notes as R2, R3 and so on, and on approval open the handoff PR to main. Once it's merged, Hugh hands it to Claude Code CLI to build.
