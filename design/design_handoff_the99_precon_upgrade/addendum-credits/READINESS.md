# Readiness · the credits path (self-assessed): Green for design; G22 to G24 are for engineering

Every change reuses shipped pieces: `GetMoreLink`, `preconUpgradeCopy.strategy.freeOnly`, `--warning`, the landing's tool rows and tips, and its diamond tiles. `scratch-gen/crpatch.diff` is the change written against main and used to render the boards. It's for reference only: it carries render-only props (`initStep`, `initPicks`, `initOpen`) that must not ship, and it has no tests.

- **G22 · Back from Credits.** When `Get more credits` leaves the flow, keep its picks per precon (in session storage), and reopen at Strategy when the player returns. `/credits` has no return link, so the return comes from the browser's Back or the next visit to the precon or deck page.
- **G23 · When the shortfall shows.** It shows when `runFunding(allowance, 2)` is `short`, or `spent` with `creditLineKind` = `spent`. The paid limit (L5), the owner's share and the pause keep their shipped lines. Mixed lots are `short` too.
- **G24 · Landing claims.** Add `LandingClaims.upgrade`, read from the app-wide `PRECON_UPGRADE_ENABLED`. While it's on, the cost strip replaces `ThreeTimes`, and the twice sentence shows only when the grant covers every tool twice at its low cost. With it off, the landing is as shipped.
- **Shipped fixes in scope:**
  - Add `withMore` to the press line at 1 credit. R2d drew it, but the build left it out.
  - Add `md:ml-auto` to the foot's press group, so presses stay right on desktop when there's no line.
- **Copy:** every new string is DRAFT and goes through `/copy-review` (`copy strings.ts`).
- **Tests to expect:** the intro and press lines in the four C1/C2 states, no link with payments off, Next staying on, the landing row gated by its switch, and the cost strip's pips (◆, ◆◇, ◆◆).
