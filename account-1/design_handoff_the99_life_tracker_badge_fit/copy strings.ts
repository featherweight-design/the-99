// trackerCopy.panel, added (every badge fits addendum). Existing badge, badgeTax and badgeAria stay as the chip's aria-label.
export const panelBadgeFit = {
  /** The compact badge's visible figure: "8" (damage or a counter). */
  badgeFigure: (n: number) => `${n}`,
  /** The tax chip's figure: "+4". */
  badgeTaxFigure: (n: number) => `+${n}`,
  /** The last chip when the row cannot hold every badge. */
  badgeMore: (n: number) => `+${n}`,
  badgeMoreAria: (n: number) => `${n} more. Open them in the sheet`,
};
