/**
 * Seat layouts as data. A cell is the box a seat's panel fills on the design canvas (phone 390x844, tablet 1180x820),
 * and `rot` is the turn that faces the panel to its player (0 bottom, 90 left edge, 180 top, -90 right edge). The play
 * surface scales the canvas to the screen. Cells list seats in turn order, clockwise from the seat nearest the bottom, so the
 * nth seat of the table takes cell n.
 *
 * L1 to L5 are the drawn boards. The counts the boards do not draw (phone 2, 5 and 6, tablet 4 as 2+2 and tablet 6 as 3+3) follow
 * the same grammar: full-width rows for the faces at the ends, 155 px columns for the sides on a phone.
 */
export type Device = "phone" | "tablet";
export type Cell = { x: number; y: number; w: number; h: number; rot: 0 | 90 | 180 | -90 };
export type Layout = { id: string; device: Device; seats: number; canvas: { w: number; h: number }; label: string; cells: readonly Cell[] };

const PHONE = { w: 390, h: 844 } as const;
const TABLET = { w: 1180, h: 820 } as const;
const c = (x: number, y: number, w: number, h: number, rot: Cell["rot"]): Cell => ({ x, y, w, h, rot });

export const LAYOUTS: readonly Layout[] = [
  { id: "phone-2", device: "phone", seats: 2, canvas: PHONE, label: "Face to face", cells: [c(6, 648, 378, 190, 0), c(6, 6, 378, 190, 180)] },
  { id: "phone-3-end", device: "phone", seats: 3, canvas: PHONE, label: "One at the end", cells: [c(6, 648, 378, 190, 0), c(6, 6, 155, 636, 90), c(229, 6, 155, 636, -90)] },
  { id: "phone-3-side", device: "phone", seats: 3, canvas: PHONE, label: "Along one side", cells: [c(6, 565, 316, 273, 90), c(6, 285, 316, 274, 90), c(6, 6, 316, 273, 90)] },
  { id: "phone-4-around", device: "phone", seats: 4, canvas: PHONE, label: "Around", cells: [c(6, 648, 378, 190, 0), c(6, 202, 155, 440, 90), c(6, 6, 378, 190, 180), c(229, 202, 155, 440, -90)] },
  { id: "phone-5", device: "phone", seats: 5, canvas: PHONE, label: "Around", cells: [c(6, 648, 378, 190, 0), c(6, 425, 155, 217, 90), c(6, 202, 155, 217, 90), c(6, 6, 378, 190, 180), c(229, 202, 155, 440, -90)] },
  { id: "phone-6", device: "phone", seats: 6, canvas: PHONE, label: "Around", cells: [c(6, 648, 378, 190, 0), c(6, 425, 155, 217, 90), c(6, 202, 155, 217, 90), c(6, 6, 378, 190, 180), c(229, 202, 155, 217, -90), c(229, 425, 155, 217, -90)] },
  { id: "tablet-4", device: "tablet", seats: 4, canvas: TABLET, label: "Two and two", cells: [c(10, 452, 570, 358, 0), c(10, 10, 570, 358, 180), c(600, 10, 570, 358, 180), c(600, 452, 570, 358, 0)] },
  { id: "tablet-5", device: "tablet", seats: 5, canvas: TABLET, label: "Three and two", cells: [c(10, 452, 380, 358, 0), c(10, 10, 575, 358, 180), c(595, 10, 575, 358, 180), c(790, 452, 380, 358, 0), c(400, 452, 380, 358, 0)] },
  { id: "tablet-5-end", device: "tablet", seats: 5, canvas: TABLET, label: "One at the end", cells: [c(10, 452, 445, 358, 0), c(10, 10, 445, 358, 180), c(465, 10, 445, 358, 180), c(920, 10, 250, 800, -90), c(465, 452, 445, 358, 0)] },
  { id: "tablet-6", device: "tablet", seats: 6, canvas: TABLET, label: "Three and three", cells: [c(10, 452, 380, 358, 0), c(10, 10, 380, 358, 180), c(400, 10, 380, 358, 180), c(790, 10, 380, 358, 180), c(790, 452, 380, 358, 0), c(400, 452, 380, 358, 0)] },
  { id: "tablet-6-ends", device: "tablet", seats: 6, canvas: TABLET, label: "Ends", cells: [c(270, 452, 315, 358, 0), c(10, 10, 250, 800, 90), c(270, 10, 315, 358, 180), c(595, 10, 315, 358, 180), c(920, 10, 250, 800, -90), c(595, 452, 315, 358, 0)] },
];

/** The layouts a screen offers for a seat count, drawn boards first. */
export const layoutsFor = (device: Device, seats: number): Layout[] => LAYOUTS.filter((l) => l.device === device && l.seats === seats);
export const layoutById = (id: string): Layout | undefined => LAYOUTS.find((l) => l.id === id);
