// DRAFT · addendum A3 to src/lib/copy/precon-upgrade.ts (through /copy-review)
//
// Close: one new accessible name; three foot labels stop being drawn.
export const preconUpgradeCloseCopy = {
  // The bare ✕'s aria-label at every step (was preconUpgradeCopy.flow.notNow).
  close: "Close",
  // No longer drawn as buttons: preconUpgradeCopy.flow.notNow on the intro's foot,
  // preconUpgradeCopy.flow.back on the Wait's foot, preconUpgradeCopy.history.close.
  // flow.back stays for Commander, Bracket, Strategy and the failed run.
} as const;

// Marks: no new strings. The swaps and the key reuse the shipped vocabulary as it is:
//   cardMarkCopy.gameChanger / massLandDenial / extraTurns / tutor  (key words, accessible names)
//   comboAwarenessCopy.keyWord                                      ("Two-card combo")
//   comboAwarenessCopy.deckTooltip.inDeck(partner)                        (the combo mark's hover sentence)
//   cardMarkCopy.keyRegionAria                                      (the key's group label)
// Unchanged and reused: preconUpgradeCopy.entry.running, preconUpgradeCopy.wait.leave.
