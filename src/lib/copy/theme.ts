// Theme picker copy. Voice: Kitchen Table, per the richness handoff.
// Names and plane subtitles come from the theme registry so the two cannot drift.

export const themeCopy = {
  // Section label in the account menu. Plex Mono 11px uppercase, per the brand label style.
  label: "Theme",
  // Announced to screen readers on the radiogroup.
  groupLabel: "Color theme",
  // aria-label per option. The plane is included because it is visible text.
  optionLabel: (name: string, plane: string) => `${name}, ${plane}`,
  // Live-region announcement after a selection. There is no Save, so this is the receipt.
  applied: (name: string) => `${name} applied.`,
  // Shown once to a user whose persisted theme no longer exists, per MIGRATION.md.
  // Naming the move matters: a silent switch reads as a bug.
  retired: {
    headline: (was: string) => `${was} has been retired.`,
    // No pointer to the two new themes: the notice sits directly above the grid
    // that draws all six chips, so naming two of them narrates the next element.
    body: (nowCalled: string) => `You’re on ${nowCalled}, the closest theme to it.`,
    dismiss: "Dismiss",
  },
} as const;
