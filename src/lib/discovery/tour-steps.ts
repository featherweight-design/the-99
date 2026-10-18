// The first-run tour's six stops and where its card goes (discovery R3·1b; design-tables/discovery-r3.md, "The
// spotlight", "The tour card" and "Step geometry"). Pure: the overlay reads a target's rect at run time and asks here
// for the cutout around it and the card's place beside it.

import { DEFAULT_THEME, isThemeKey } from "../theme/themes";
import type { TargetId } from "./targets";

export type StepKey = "collection" | "commanders" | "decks" | "buying" | "look" | "whatsNew";
/** What the cutout is drawn around, which sets its room and its corner. */
export type CutoutKind = "card" | "slot" | "account" | "banner";
/** Where the card sits at desktop, relative to the lit control. */
export type Placement = "below-end" | "beside" | "beside-foot" | "below-start";
export type Picture = "tour-commanders" | "tour-decks" | "tour-shopping";
/**
 * A tour picture in the reader's theme (R2·4 captures all three in every theme, and its coverage test fails the build
 * first if one is missing), the default theme's for an unknown one. Built here rather than through `shotFor`, whose
 * shot map and tool registry would ride into Home's bundle with it.
 */
export function tourPictureSrc(theme: string | undefined, picture: Picture): string {
  return `/about/shots/${isThemeKey(theme) ? theme : DEFAULT_THEME}/${picture}.webp`;
}

/** Where each capture is cropped in the card's 118px (128 at 390) box, as the boards draw it. */
export const PICTURE_FOCUS: Record<Picture, string> = {
  "tour-commanders": "center 80%",
  "tour-decks": "center 24%",
  "tour-shopping": "center 64%",
};

export type Step = {
  key: StepKey;
  target: TargetId;
  kind: CutoutKind;
  place: Placement;
  picture: Picture | null;
  lit: "collection" | "commanders" | "decks" | "account" | "banner";
};

export const STEPS: readonly Step[] = [
  { key: "collection", target: "tour:step-one", kind: "card", place: "below-end", picture: null, lit: "collection" },
  { key: "commanders", target: "tour:commanders", kind: "slot", place: "beside", picture: "tour-commanders", lit: "commanders" },
  { key: "decks", target: "tour:decks", kind: "slot", place: "beside", picture: "tour-decks", lit: "decks" },
  // Buying has no slot of its own: it lives inside Decks.
  { key: "buying", target: "tour:decks", kind: "slot", place: "beside", picture: "tour-shopping", lit: "decks" },
  { key: "look", target: "tour:account", kind: "account", place: "beside-foot", picture: null, lit: "account" },
  { key: "whatsNew", target: "tour:banner", kind: "banner", place: "below-start", picture: null, lit: "banner" },
];

export type Box = { x: number; y: number; w: number; h: number };
export type Cutout = Box & { r: number };

/** Room around the lit control and its corner: 5/14 on a slot, 4/round on the account button, 8/20 a card, 8/16 the banner. */
const ROOM: Record<CutoutKind, { pad: number; r: number | "round" }> = {
  slot: { pad: 5, r: 14 },
  account: { pad: 4, r: "round" },
  card: { pad: 8, r: 20 },
  banner: { pad: 8, r: 16 },
};

/**
 * `phone`: the header's account button is a 38px square inside the button's 3px pad, lit with 4px of room and a 15
 * corner; the rail's is a circle, lit round.
 */
export function cutoutFor(rect: Box, kind: CutoutKind, phone = false): Cutout {
  const { pad, r } = kind === "account" && phone ? { pad: 1, r: 15 } : ROOM[kind];
  const box = { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
  return { ...box, r: r === "round" ? Math.min(box.w, box.h) / 2 : r };
}

/** The card's distance from the lit control's own box, and the least it keeps from the frame (the boards' numbers). */
export const BESIDE = 24;
export const FRAME = 14;
/** Desktop card width; the phone's is the frame less 16 a side. */
export const CARD_W = 340;
/**
 * At 390 the card's foot sits this far above the frame's: the table's `bottom 100 with the locked bar`, 12 above the
 * locked tab bar's bracket rather than the bar's own 74px top.
 */
export const PHONE_DOCK = 100;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

/**
 * The card's top-left at desktop, from the lit control's own box (not the cutout), clamped 14px inside the frame and
 * never over the control where the frame has room. Reproduces the boards' geometry: a slot at (12, 163, 38) puts the
 * card at (74, 131) (the boards: 132, and 214 for Decks at 247), the banner at (90, 120, 1162 x 46) at (90, 184), step 1's card at (90, 186, 1162 x 304) at
 * (912, 504). `rect` null is step 6 with no line to light (R3 gap 6): the card stands centred.
 */
export function placeCard(place: Placement, rect: Box | null, card: { w: number; h: number }, frame: { w: number; h: number }): { x: number; y: number } {
  const maxX = frame.w - card.w - FRAME;
  const maxY = frame.h - card.h - FRAME;
  if (!rect) return { x: clamp((frame.w - card.w) / 2, FRAME, maxX), y: clamp((frame.h - card.h) / 2, FRAME, maxY) };
  switch (place) {
    case "beside":
      // 32 above the slot: the boards draw 31 at Commanders and 33 at Decks.
      return { x: clamp(rect.x + rect.w + BESIDE, FRAME, maxX), y: clamp(rect.y - 32, FRAME, maxY) };
    case "beside-foot":
      // The account button sits at the rail's foot: the card's foot is 14px above the frame's.
      return { x: clamp(rect.x + rect.w + BESIDE, FRAME, maxX), y: clamp(maxY, FRAME, maxY) };
    case "below-start":
      return { x: clamp(rect.x, FRAME, maxX), y: clamp(rect.y + rect.h + 18, FRAME, maxY) };
    case "below-end": {
      const below = rect.y + rect.h + FRAME;
      // Below when it fits, else above, else as low as the frame allows.
      const y = below + card.h <= frame.h - FRAME ? below : rect.y - FRAME - card.h >= FRAME ? rect.y - FRAME - card.h : maxY;
      // Clamped too: a lit card pushed below the frame (Home's table cards above step 1) must not take the card's
      // foot, and its Next, off screen.
      return { x: clamp(rect.x + rect.w - card.w, FRAME, maxX), y: clamp(y, FRAME, maxY) };
    }
  }
}
