// How many of Top off's ranked candidates the landing demo draws and opens. One number, two readers: the exporter's card list
// (`project-cards.ts`, which fetches details for exactly these) and the demo's Top off pool (`demo-top-off-state.ts`, which draws
// exactly these), so a row on screen always opens its card. Its own module so the public surface imports a number, not the
// exporter's rules.

/** The first page of Top off's ranked candidates: the pool the demo draws, and the cards whose details it ships. */
export const TOP_OFF_OPENABLE = 8;
