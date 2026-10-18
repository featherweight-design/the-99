/**
 * THE ONE PLACE "the reader sees credits" is decided (buying-credits plan E3, G6). Pure. The `/credits` page
 * answers `notFound()` and the menu's chip is absent when it says no. Anything held or ever bought keeps the
 * page (reduced, with no offers, once the switch is off): a reader with money in the app is never locked out
 * of seeing it, and neither is a reader coming BACK from a Checkout of their own (`returning`: a return read that
 * is not `none`, so a first-time buyer whose switch turned off mid-purchase is not shown a 404 for what they just
 * paid for; stopping sales does not cancel an open Checkout). `switchOn` is `PAYMENTS_ENABLED` for THIS reader (`requestSwitchEnv`), never `process.env`.
 */
export function readerSeesCredits(input: { switchOn: boolean; held: boolean; everBought: boolean; returning: boolean }): boolean {
  return input.switchOn || input.held || input.everBought || input.returning;
}

/**
 * Whether the page draws its buying offers: only while the switch is on for the reader AND their buying is not paused
 * (K2's purchase block, `purchaseBlocked`). Absent, never disabled (handoff O1, B1).
 */
export function readerSeesOffers(input: { switchOn: boolean; blocked: boolean }): boolean {
  return input.switchOn && !input.blocked;
}

/**
 * Whether the page draws the pause band (handoff B1): in place of the offers, while the switch is on and a dispute has
 * paused this reader's buying. With the switch off there is nothing to buy, so nothing to explain (O2 to O4).
 */
export function readerSeesPause(input: { switchOn: boolean; blocked: boolean }): boolean {
  return input.switchOn && input.blocked;
}
