/**
 * The stand-in fact lines allowed to reach FOUR lines at 390, where the ruling holds every other line to
 * three (d9, close-out ruling 6, from Hugh's emphasis on card details).
 *
 * WHY THESE, AND WHY A LIST. Ten content rules took the catalog's rows from up to nine lines to three
 * (see sheet-model.ts and land.ts), every one keeping the facts. The first entries are what is left: 8 distinct
 * lines of about 22,500, drawn by 9 (original, stand-in) pairs, all for three rare utility originals (The World Tree, Mount Doom and
 * Balduvian Trading Post), each still saying every fact. Getting them to three would take copy written
 * for one card, or shortening "once, by sacrificing it", which the Show all ruling quotes. d9 ruled on
 * 2026-09-25 that they read four lines rather than either. E1 adds 32 spell pairs on three more
 * originals, for its own reason, below.
 *
 * THE LIST CANNOT ROT OR HIDE. `measure:swap-lines` fails when a row NOT listed here reaches 4, when a
 * listed row no longer reaches 4 (a stale entry must be deleted, not left to excuse a future row), and
 * when anything reaches 5. Each entry names the original, the stand-in and the exact line, so it excuses
 * that line and nothing else.
 */
export type ResidueLine = { original: string; originalId: string; standIn: string; standInId: string; text: string };

// E2 (the stand-in row addendum, 2026-09-26) retired all 41 earlier entries. A spell row became a comparison
// fitted to 2 lines at 390 by `fitCompare`, which retired the 32 spell pairs, and the land facts line now spans
// the whole row (315px against 233px), which brought all 9 land pairs to 3 lines or fewer.
//
// One entry is new, and it comes from Hugh's ruling of the same day that a land's drawback starts its own line.
// Mount Doom's mana line, "untapped on your first three turns", takes two lines at 390 by itself, so with its
// cost and loss on their own line the row reads four. Every fact stays, as ruling 6 asks; this is the only
// such row in the catalog's measure.
export const FOUR_LINE_RESIDUE: readonly ResidueLine[] = [
  {
    original: "Mount Doom", originalId: "995c8dac-fd27-468a-abd4-02372cf0c850",
    standIn: "Starting Town", standInId: "d04e0975-f401-41b8-a9db-9bcf9cbbce66",
    text: "makes black and red, untapped on your first three turns · costs 1 life · loses dealing damage and a board wipe",
  },
];
