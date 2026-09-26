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
  // E1 (d9, 2026-09-26): a spell row's give-up names a ramp KIND now ("taps for mana", not "ramp"), which
  // takes these 32 rows, on three spell originals, to four lines. d9 ruled they are listed here rather than
  // shortened ("gives up mana" loses the kind, which is the point) and re-measured in E2, whose keeps /
  // gains / loses rewrite changes every spell row. The self-retiring rule holds: a stale entry fails.
  ...([
    ["Dina, Essence Brewer", "f61c1dc4-2f09-4b50-957f-ee656c659072", "creature · MV 3 · also +1/+1 counters and a sacrifice outlet · gives up taps for mana and draws on entering"],
    ["Gluntch, the Bestower", "0222dc7c-459b-4909-a037-72b2eb248599", "creature · MV 3 · also makes Treasure and +1/+1 counters · gives up taps for mana and draws on entering"],
    ["Jared Carthalion", "f9485c76-122d-4faf-9194-b84ed9c41378", "planeswalker · MV 5 · also makes Treasure and +1/+1 counters · gives up taps for mana and draws on entering"],
    ["Meltstrider Eulogist", "046b60da-0a14-40b0-a36c-5328f6b8972b", "creature · MV 3 · also +1/+1 counters and death triggers · gives up taps for mana and draws on entering"],
    ["Skyclave Shadowcat", "043ded41-2506-4dab-91c4-142d9287e7d7", "creature · MV 4 · also +1/+1 counters and a sacrifice outlet · gives up taps for mana and draws on entering"],
    ["Stormclaw Rager", "d1a77708-7ddf-4645-bf1e-1d8147a57f23", "creature · MV 3 · also +1/+1 counters and a sacrifice outlet · gives up taps for mana and draws on entering"],
    ["Taborax, Hope's Demise", "955abada-aba2-41c2-96ff-58e3679ad7e5", "creature · MV 3 · also +1/+1 counters and death triggers · gives up taps for mana and draws on entering"],
    ["Technodrome", "51c0b46c-c379-420a-a4a4-d18724c759aa", "creature · MV 2 · also +1/+1 counters and a sacrifice outlet · gives up taps for mana and draws on entering"],
    ["The Swarmlord", "ead75ea4-025f-443a-824f-26fef9e424db", "creature · MV 6 · also +1/+1 counters and death triggers · gives up taps for mana and draws on entering"],
    ["Tributary Instructor", "1c70b9d8-b04e-48f8-a4e0-12ce077d22f2", "creature · MV 4 · also +1/+1 counters and death triggers · gives up taps for mana and draws on entering"],
    ["Vampiric Rites", "660de988-b6fb-4f36-8006-42af3e7f908d", "enchantment · MV 1 · also a sacrifice outlet and life gain · gives up taps for mana and draws on entering"],
    ["Vazi, Keen Negotiator", "7446c013-63b0-402b-b8b9-dd25ccc553df", "creature · MV 5 · also makes Treasure and +1/+1 counters · gives up taps for mana and draws on entering"],
    ["Venom, Eddie Brock", "9132d7e6-7190-45e1-9c57-8fe2e5d0f2f2", "creature · MV 6 · also +1/+1 counters and death triggers · gives up taps for mana and draws on entering"],
    ["Vogar, Necropolis Tyrant", "1d704c2f-cd24-4a04-a51a-da7984dcd358", "creature · MV 5 · also +1/+1 counters and death triggers · gives up taps for mana and draws on entering"],
  ] as const).map(([standIn, standInId, text]) => ({ original: "Coveted Jewel", originalId: "98492d7d-3b9e-4ae1-ac45-1b508d6d2670", standIn, standInId, text })),
  ...([
    ["Charming Scoundrel", "9eec304d-ffcb-4287-b877-280ac1e4f496", "creature · MV 2 · also makes Treasure and draws on entering · gives up taps for mana and +1/+1 counters"],
    ["Tataru Taru", "70dd5013-f18f-4501-882f-70590c424e20", "creature · MV 2 · also makes Treasure and draws on entering · gives up taps for mana and +1/+1 counters"],
  ] as const).map(([standIn, standInId, text]) => ({ original: "The Great Henge", originalId: "78427103-9543-41fb-b6d4-72963fe87275", standIn, standInId, text })),
  ...([
    ["Armorcraft Judge", "d7f49243-a96e-499f-b2d7-8e9842432420", "creature · MV 4 · also +1/+1 counters and draws on entering · gives up taps for mana and free casts"],
    ["Brawn, Amadeus Cho", "19910a90-d334-4d99-89f2-cd81cea3c824", "creature · MV 2 · also +1/+1 counters and draws on entering · gives up taps for mana and free casts"],
    ["Charming Scoundrel", "9eec304d-ffcb-4287-b877-280ac1e4f496", "creature · MV 2 · also makes Treasure and draws on entering · gives up taps for mana and free casts"],
    ["Chronicler of Heroes", "c3779271-1186-4754-8b8d-0ee18e585bb6", "creature · MV 3 · also +1/+1 counters and draws on entering · gives up taps for mana and free casts"],
    ["Communal Brewing", "99deac41-584b-43f2-804e-c56ae0fef047", "enchantment · MV 3 · also +1/+1 counters and draws on entering · gives up taps for mana and free casts"],
    ["Dina, Essence Brewer", "f61c1dc4-2f09-4b50-957f-ee656c659072", "creature · MV 3 · also +1/+1 counters and a sacrifice outlet · gives up taps for mana and free casts"],
    ["Ox of Agonas", "22113051-c971-4108-953b-95356d21323a", "creature · MV 5 · also +1/+1 counters and draws on entering · gives up taps for mana and free casts"],
    ["Proft's Eidetic Memory", "b749e9e4-0f2a-4157-8cca-facd6b48157f", "enchantment · MV 2 · also +1/+1 counters and draws on entering · gives up taps for mana and free casts"],
    ["Rowdy Crew", "3d1d30e1-8934-4451-9b32-c6db2167fc2e", "creature · MV 4 · also +1/+1 counters and draws on entering · gives up taps for mana and free casts"],
    ["Shipwreck Sifters", "d70ee6f1-541b-43b4-897c-68a231beb894", "creature · MV 2 · also +1/+1 counters and draws on entering · gives up taps for mana and free casts"],
    ["Skyclave Shadowcat", "043ded41-2506-4dab-91c4-142d9287e7d7", "creature · MV 4 · also +1/+1 counters and a sacrifice outlet · gives up taps for mana and free casts"],
    ["Stormclaw Rager", "d1a77708-7ddf-4645-bf1e-1d8147a57f23", "creature · MV 3 · also +1/+1 counters and a sacrifice outlet · gives up taps for mana and free casts"],
    ["Tataru Taru", "70dd5013-f18f-4501-882f-70590c424e20", "creature · MV 2 · also makes Treasure and draws on entering · gives up taps for mana and free casts"],
    ["Technodrome", "51c0b46c-c379-420a-a4a4-d18724c759aa", "creature · MV 2 · also +1/+1 counters and a sacrifice outlet · gives up taps for mana and free casts"],
    ["Trade Route Envoy", "95d51048-be32-4c5f-8b75-fca3a891c9d6", "creature · MV 4 · also +1/+1 counters and draws on entering · gives up taps for mana and free casts"],
    ["Zegana, Utopian Speaker", "04260930-ff38-4b35-9ec4-e89196a4f2c7", "creature · MV 4 · also +1/+1 counters and draws on entering · gives up taps for mana and free casts"],
  ] as const).map(([standIn, standInId, text]) => ({ original: "Ugin, Eye of the Storms", originalId: "5c58353a-fd60-4528-bf0d-669626cda0b2", standIn, standInId, text })),
];
