// Amendment 1 — the black mana pip.
//
// This amendment adds NO product copy. The change is one token value and one
// deleted constant; nothing on screen gains or loses a word, and no shipped
// string is edited. The block below exists so the audit does not have to take
// that on trust: it records what was checked, and the two accessible-name
// strings the pip work touches (both of which belong to amendment 4 and are
// repeated here only because they name a colour).
//
// Shape follows src/lib/copy/recommendations.ts and synergy-discovery.ts:
// flat const object, functions for interpolated strings, no JSX.

// ── Strings that mention a mana colour, all checked, none changed ──────
//
//   src/lib/copy/color-labels.ts        colorLabel() — 'Dimir', 'Black', the
//                                       guild/type names. Text, not colour;
//                                       unaffected by the token value.
//   card-modal.tsx  IDENTITY_NAME       'White' | 'Blue' | 'Black' | 'Red' |
//                                       'Green' — the Identity meta field's
//                                       value, printed beside the pip. This is
//                                       the reason the pip is not colour-alone
//                                       at that call site, before or after.
//   color-pip.tsx   aria-label          `Filter by ${color}` — the filter
//                                       switch's whole accessible name. Reads
//                                       'Filter by B'; terse, and pre-existing.
//                                       Flagged, NOT fixed here: it is a
//                                       component edit, and this amendment
//                                       touches no component.
//   mana-pips.tsx                        No copy. The glyph is the mana symbol
//                                       itself, straight off `manaCost`.
//
// Nothing in src/lib/copy/ names a hex, a token or a pip, so no copy module is
// even adjacent to this change.

export const blackPipNotes = {
  // Not copy — a one-line rationale kept next to the token so the next person
  // to read #837D78 in globals.css finds the reason without the handoff.
  // Belongs in globals.css as a comment, verbatim, above the amonkhet block's
  // WUBRG group:
  tokenComment:
    "WUBRG identity swatches (5). --b is a lifted neutral rather than a near-black: on six " +
    "canvases between #151317 and #1E1F26 a near-black disc measures 1.01–1.27:1 against its " +
    "own ground, which is a hole and not a swatch. Black is identified here on both axes: it is " +
    "the darkest of the five AND the only violet — hue 335, C 0.059. A neutral at the same " +
    "lightness (#837D78) was tried and reads as a second white at 9-12px, where the pip carries " +
    "no glyph. THREE gates set this value, and the third is the binding one: 3:1 on the " +
    "lightest ground (--elevated, kaldheim); a --bg glyph at 4.5:1 on the lightest --bg " +
    "(#101314, innistrad); and deltaEOk(pip, accent) >= 0.1 per theme, asserted by " +
    "lib/theme/contract.test.ts:145 — #857A93 measured 0.087 against phyrexia's accent and " +
    "failed. Re-measure all three if any theme's --bg, --elevated or --accent moves.",
} as const;

// ── Amendment 4's two additions, repeated here because they name a pip ──
//
// These are the ONLY new strings in either amendment's copy surface, and they
// live in src/lib/copy/commanders.ts, not here. Repeated verbatim so the two
// files cannot drift; delete this block once amendment 4's copy file lands.

export const fullCardTriggerCopy = {
  // Replaces the shipped 'Full card' on the commander detail art header. The
  // control now opens the shared card-details modal, so it names that surface
  // instead of the lightbox it used to open. See amendment 4, decision 1.
  //
  // REPLACES: full-card-trigger.tsx  'Full card'  (visible label)
  label: "Card details",
  // REPLACES: full-card-trigger.tsx  aria-label 'View full card'
  //
  // Falls in behind cardDetailCopy.triggerAria(name) — 'View details for
  // {name}' — which every other card on the page already uses, so the
  // commander stops being the one trigger with its own accessible name.
  ariaFallsBackToShared: true,
} as const;
