// What's what (life tracker addendum, 2026-11-22). Placeholders for /copy-review.
export const whatsWhatCopy = {
  menuRow: "What's what",
  menuLine: "What each button and badge does.",
  title: "What's what",
  intro: "Every panel works like yours. Tap anywhere to go back to the game.",
  close: "Close the guide",
  // [name, tablet line, phone line]
  round: ["Round", "Goes up when play gets back to whoever went first.", "Counts rounds, not turns."],
  monarch: ["Monarch", "Tap it, then tap who takes the crown.", "Tap, then tap who's crowned."],
  initiative: ["Initiative", "Tap it, then tap who takes it.", "Tap, then tap who takes it."],
  dayNight: ["Day and night", "Off until a card starts it. Tap for day, tap again to flip.", "Tap for day, again to flip."],
  dice: ["Dice", "Roll a d6 or a d20, or flip a coin.", "A d6, a d20 or a coin."],
  undo: ["Undo", "Takes back the last change, one at a time.", "Takes back the last change."],
  menu: ["Menu", "This guide, and back to the table.", "This guide, and back to the table."],
  endTurn: ["End turn", "Only on the player whose turn it is. Their edge is lit.", "Passes play on."],
  sheet: ["Your sheet", "Damage, counters, tax, mana, history.", "Damage, counters and more."],
  badges: ["What's on you", "Damage and counters you carry. Tap one to change it.", "Damage and counters you carry. Tap one to change it."],
  life: ["Life", "Tap − or + for 1. Hold for 10 at a time. It settles after 2 seconds.", "Tap − or + for 1. Hold for 10."],
} as const;
