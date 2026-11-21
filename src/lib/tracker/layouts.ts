/**
 * Seat layouts as data. A cell is the box a seat's panel fills on the design canvas (phone 390x844, tablet 1180x820),
 * and `rot` is the turn that faces the panel to its player (0 bottom, 90 left edge, 180 top, -90 right edge). The play
 * surface scales the canvas to the screen. Cells list seats in turn order, clockwise from the seat nearest the bottom, so the
 * nth seat of the table takes cell n.
 *
 * L1 to L5 are the drawn boards, with phone 4 on two long sides (F02, setup's default for four), tablet 4 (F18: two
 * 575 px panels a side, 10 px apart) and tablet 5 (F19: three on top, two below). The counts the boards do not draw
 * (phone 2, 5 and 6, and tablet 6 as 3+3) follow the same grammar: full-width rows for the faces at the ends, 155 px
 * columns for the sides on a phone.
 */
export type Device = "phone" | "tablet";
export type Cell = { x: number; y: number; w: number; h: number; rot: 0 | 90 | 180 | -90 };
export type Rect = { x: number; y: number; w: number; h: number };
/**
 * `spine` is the centre strip's box (round, monarch, initiative, day/night, dice, undo, menu), in the gap the cells leave:
 * a column on a phone, a row on a tablet. L1 to L5 draw it; the rest sit it in the same gap.
 */
export type Layout = {
  id: string;
  device: Device;
  seats: number;
  canvas: { w: number; h: number };
  label: string;
  cells: readonly Cell[];
  spine: Rect;
  /**
   * The tablet's grid boards (F12, F18, F19) draw the panel with a 52px foot toward the strip (End turn, badges, the
   * sheet button) and the name on the outer edge. Every other board (the phone's, and the tablet's ends, L4 and L5) keeps
   * them in one name row along the top.
   */
  foot?: true;
};

const PHONE = { w: 390, h: 844 } as const;
const TABLET = { w: 1180, h: 820 } as const;
const c = (x: number, y: number, w: number, h: number, rot: Cell["rot"]): Cell => ({ x, y, w, h, rot });
const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const PHONE_SPINE = r(167, 202, 56, 440);
const TABLET_SPINE = r(10, 378, 1160, 64);

export const LAYOUTS: readonly Layout[] = [
  { id: "phone-2", device: "phone", seats: 2, canvas: PHONE, label: "Face to face", cells: [c(6, 648, 378, 190, 0), c(6, 6, 378, 190, 180)], spine: PHONE_SPINE },
  { id: "phone-3-end", device: "phone", seats: 3, canvas: PHONE, label: "One at the end", cells: [c(6, 648, 378, 190, 0), c(6, 6, 155, 636, 90), c(229, 6, 155, 636, -90)], spine: r(167, 6, 56, 636) },
  { id: "phone-3-side", device: "phone", seats: 3, canvas: PHONE, label: "Along one side", cells: [c(6, 565, 316, 273, 90), c(6, 285, 316, 274, 90), c(6, 6, 316, 273, 90)], spine: r(328, 6, 56, 832) },
  { id: "phone-4-sides", device: "phone", seats: 4, canvas: PHONE, label: "Two long sides, two players each", cells: [c(6, 425, 155, 413, 90), c(6, 6, 155, 413, 90), c(229, 6, 155, 413, -90), c(229, 425, 155, 413, -90)], spine: r(167, 6, 56, 832) },
  { id: "phone-4-around", device: "phone", seats: 4, canvas: PHONE, label: "One player on each side", cells: [c(6, 648, 378, 190, 0), c(6, 202, 155, 440, 90), c(6, 6, 378, 190, 180), c(229, 202, 155, 440, -90)], spine: PHONE_SPINE },
  { id: "phone-5", device: "phone", seats: 5, canvas: PHONE, label: "Around", cells: [c(6, 648, 378, 190, 0), c(6, 425, 155, 217, 90), c(6, 202, 155, 217, 90), c(6, 6, 378, 190, 180), c(229, 202, 155, 440, -90)], spine: PHONE_SPINE },
  { id: "phone-6", device: "phone", seats: 6, canvas: PHONE, label: "Around", cells: [c(6, 648, 378, 190, 0), c(6, 425, 155, 217, 90), c(6, 202, 155, 217, 90), c(6, 6, 378, 190, 180), c(229, 202, 155, 217, -90), c(229, 425, 155, 217, -90)], spine: PHONE_SPINE },
  { id: "tablet-4", foot: true, device: "tablet", seats: 4, canvas: TABLET, label: "Two and two", cells: [c(10, 452, 575, 358, 0), c(10, 10, 575, 358, 180), c(595, 10, 575, 358, 180), c(595, 452, 575, 358, 0)], spine: TABLET_SPINE },
  { id: "tablet-5", foot: true, device: "tablet", seats: 5, canvas: TABLET, label: "Three and two", cells: [c(10, 452, 575, 358, 0), c(10, 10, 380, 358, 180), c(400, 10, 380, 358, 180), c(790, 10, 380, 358, 180), c(595, 452, 575, 358, 0)], spine: TABLET_SPINE },
  { id: "tablet-5-end", device: "tablet", seats: 5, canvas: TABLET, label: "One at the end", cells: [c(10, 452, 445, 358, 0), c(10, 10, 445, 358, 180), c(465, 10, 445, 358, 180), c(920, 10, 250, 800, -90), c(465, 452, 445, 358, 0)], spine: r(10, 378, 900, 64) },
  { id: "tablet-6", foot: true, device: "tablet", seats: 6, canvas: TABLET, label: "Three and three", cells: [c(10, 452, 380, 358, 0), c(10, 10, 380, 358, 180), c(400, 10, 380, 358, 180), c(790, 10, 380, 358, 180), c(790, 452, 380, 358, 0), c(400, 452, 380, 358, 0)], spine: TABLET_SPINE },
  { id: "tablet-6-ends", device: "tablet", seats: 6, canvas: TABLET, label: "Ends", cells: [c(270, 452, 315, 358, 0), c(10, 10, 250, 800, 90), c(270, 10, 315, 358, 180), c(595, 10, 315, 358, 180), c(920, 10, 250, 800, -90), c(595, 452, 315, 358, 0)], spine: r(270, 378, 640, 64) },
];

/** The layouts a screen offers for a seat count, drawn boards first. */
export const layoutsFor = (device: Device, seats: number): Layout[] => LAYOUTS.filter((l) => l.device === device && l.seats === seats);
export const layoutById = (id: string): Layout | undefined => LAYOUTS.find((l) => l.id === id);

/**
 * The life number's size on the design canvas, by the cell it sits in: the boards draw 88px in F04's 155x413 sides, 86px
 * in L1 and L2's longer sides, 106px across L1's 378x190 ends, 110px in L3's 316x273 panels, and on a tablet 150px in
 * the 358px-tall grid panels and 140px in L4 and L5's 250px-wide ends. The panel scales it with the canvas.
 */
export function lifeSize(device: Device, cell: Cell): number {
  const short = Math.min(cell.w, cell.h);
  const long = Math.max(cell.w, cell.h);
  if (device === "tablet") return short >= 300 ? 150 : 140;
  if (short >= 270) return 110;
  if (short >= 180) return 106;
  return long === 413 ? 88 : 86;
}
