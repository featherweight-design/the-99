/**
 * RETIRED (Hugh 2026-11-01): nothing gates on this any more. The swap tools (the Shopping limit and
 * its marks, the stand-ins sheet, Take and Undo swap, Fits your decks, and Find a deck's one-credit
 * read, `fits_read`) are always on; the read's spend is stopped only by the model-call kill switch
 * (`reserveModelCall`). Only the admin registry reads this, until the switch is deleted. It once read
 * true only for the exact string `'true'`.
 */
export function swapToolsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.SWAP_TOOLS_ENABLED === "true";
}
