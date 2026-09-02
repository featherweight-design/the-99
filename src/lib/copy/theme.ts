// Theme picker copy. Voice: Kitchen Table, per the richness handoff.
// Names and plane subtitles come from the theme registry so the two cannot drift.

export const themeCopy = {
  // Section label in the account menu. Plex Mono 11px uppercase, per the brand label style.
  label: "Theme",
  // Announced to screen readers on the radiogroup.
  groupLabel: "Colour theme",
  // aria-label per option. The plane is included because it is visible text.
  optionLabel: (name: string, plane: string) => `${name} — ${plane}`,
  // Live-region announcement after a selection. There is no Save, so this is the receipt.
  applied: (name: string) => `${name} applied.`,
} as const;
