// themes · copy strings.ts
// Handoff: design/design_handoff_the99_theme_replacement/ · R6 · 2026-09-06
// Unchanged from R5 — the R6 chroma refit touched token hexes only, not names.
// Voice: Kitchen Table, unchanged.
//
// Supersedes the picker block in design_handoff_the99_themes/themes · copy strings.ts (R1).
// Everything in that file OUTSIDE picker.options is unchanged and not repeated here.
//
//   REMOVED  — innistrad (Moonlit) and duskmourn (Screen Glow). Two accents that sat
//              15° and 25° from a survivor; at UI sizes that is not a second theme.
//   RENAMED  — three survivors move to the weather-and-hour system. The plane prefix
//              stays: it is the constraint that keeps the names from being moods.
//   NEW      — ixalan (Canopy) and eldraine (Witching Hour).

export const themeCopy = {
  picker: {
    label: "Theme",
    groupLabel: "Colour theme",

    options: {
      // RENAMED from "Gilded Stone". Low Sun names the light rather than the material,
      // which is what the theme actually looks like.
      amonkhet: { name: "Low Sun",       plane: "Amonkhet" },

      // Unchanged — already in the system it turns out we were writing.
      kamigawa: { name: "Neon Rain",     plane: "Kamigawa: Neon Dynasty" },

      // RENAMED from "Oil and Iron". "Salt Fog" was the first draft and was wrong:
      // coastal weather on a plane made of oil and metal. Oil Haze keeps the plane
      // and avoids a second "Rain" beside Kamigawa's.
      phyrexia: { name: "Oil Haze",      plane: "New Phyrexia" },

      // RENAMED from "Rune Frost". Same face, same palette, same synthetic-bold rule
      // (R2 §H) — only the second word moves.
      kaldheim: { name: "First Frost",   plane: "Kaldheim" },

      // NEW. Replaces innistrad. Ships Trirong at 600.
      ixalan:   { name: "Canopy",        plane: "Ixalan" },

      // NEW. Replaces duskmourn. Ships Cormorant Garamond at 600 — NEVER 400,
      // see READINESS: it is the lightest display face in the set.
      eldraine: { name: "Witching Hour", plane: "Wilds of Eldraine" },
    },

    optionLabel: (name: string, plane: string) => `${name} — ${plane}`,
    applied: (name: string) => `${name} applied.`,
  },
} as const;

// Theme ids that no longer resolve. Exported because the fallback needs to name the
// theme it moved someone to — a silent switch reads as a bug. See MIGRATION.md.
export const retiredThemes = {
  innistrad: { was: "Moonlit",     nowUse: "phyrexia", nowCalled: "Oil Haze" },
  duskmourn: { was: "Screen Glow", nowUse: "kaldheim", nowCalled: "First Frost" },
} as const;
