/**
 * The stand-in fact lines allowed to reach FOUR lines at 390, where the ruling holds every other line to
 * three (d9, close-out ruling 6, from Hugh's emphasis on card details).
 *
 * WHY THESE, AND WHY A LIST. Ten content rules took the catalog's rows from up to nine lines to three
 * (see sheet-model.ts and land.ts), every one keeping the facts. These are what is left: 8 distinct
 * lines of about 22,500, drawn by 9 (original, stand-in) pairs, all for three rare utility originals (The World Tree, Mount Doom and
 * Balduvian Trading Post), each still saying every fact. Getting them to three would take copy written
 * for one card, or shortening "once, by sacrificing it", which the Show all ruling quotes. d9 ruled on
 * 2026-09-25 that they read four lines rather than either.
 *
 * THE LIST CANNOT ROT OR HIDE. `measure:swap-lines` fails when a row NOT listed here reaches 4, when a
 * listed row no longer reaches 4 (a stale entry must be deleted, not left to excuse a future row), and
 * when anything reaches 5. Each entry names the original, the stand-in and the exact line, so it excuses
 * that line and nothing else.
 */
export type ResidueLine = { original: string; originalId: string; standIn: string; standInId: string; text: string };

export const FOUR_LINE_RESIDUE: readonly ResidueLine[] = [
  {
    original: "Mount Doom", originalId: "995c8dac-fd27-468a-abd4-02372cf0c850",
    standIn: "Starting Town", standInId: "d04e0975-f401-41b8-a9db-9bcf9cbbce66",
    text: "makes black and red, untapped on your first three turns · costs 1 life · gives up dealing damage and a board wipe",
  },
  {
    original: "The World Tree", originalId: "3437d504-bf62-4c27-b15f-f6330182ff7e",
    standIn: "Starting Town", standInId: "d04e0975-f401-41b8-a9db-9bcf9cbbce66",
    text: "makes every color, untapped on your first three turns · costs 1 life · gives up a library search and one more",
  },
  {
    original: "Balduvian Trading Post", originalId: "7647940e-c99c-401c-ad1d-9ec730f66b6f",
    standIn: "Turbulent Springs", standInId: "9aef7510-9f06-4939-8cae-f71330d1105e",
    text: "makes red, untapped if your opponents control 8 or more lands · gives up its extra mana and dealing damage",
  },
  // The same line for a second stand-in. It was always drawn; a measure that kept only the first pair per
  // line hid it until each pair was held to the list (review, #1035 round 2).
  {
    original: "Balduvian Trading Post", originalId: "7647940e-c99c-401c-ad1d-9ec730f66b6f",
    standIn: "Turbulent Steppe", standInId: "db444f9d-4dde-4308-b0f2-7acfe6de871a",
    text: "makes red, untapped if your opponents control 8 or more lands · gives up its extra mana and dealing damage",
  },
  ...([
    ["Abandoned Outpost", "5a70ccfa-d12d-4e62-a1a4-f05cda2fd442", "white"],
    ["Bog Wreckage", "bce32541-3bc4-4553-ace2-784a58f164aa", "black"],
    ["Timberland Ruins", "29c7f059-2eeb-40f9-8f50-03eba2d0d5e0", "green"],
    ["Seafloor Debris", "eef64810-4187-40c1-8e59-1cb8773ebea3", "blue"],
    ["Ravaged Highlands", "68919931-b995-4aa0-9d2a-e80eae2f335f", "red"],
  ] as const).map(([standIn, standInId, color]) => ({
    original: "The World Tree", originalId: "3437d504-bf62-4c27-b15f-f6330182ff7e", standIn, standInId,
    text: `makes ${color}, tapped · every other color once, by sacrificing it · gives up a library search and one more`,
  })),
];
