/**
 * THE ONE PLACE "the reader sees credits" is decided (buying-credits plan E3, G6). Pure. The `/credits` page
 * answers `notFound()` and the menu's chip is absent when it says no. Anything held or ever bought keeps the
 * page (reduced, with no offers, once the switch is off): a reader with money in the app is never locked out
 * of seeing it. `switchOn` is `PAYMENTS_ENABLED` for THIS reader (`requestSwitchEnv`), never `process.env`.
 */
export function readerSeesCredits(input: { switchOn: boolean; held: boolean; everBought: boolean }): boolean {
  return input.switchOn || input.held || input.everBought;
}

/** Whether the page draws its buying offers: only while the switch is on for the reader. */
export function readerSeesOffers(input: { switchOn: boolean }): boolean {
  return input.switchOn;
}
