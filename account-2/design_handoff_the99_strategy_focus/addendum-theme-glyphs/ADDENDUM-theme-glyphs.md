# Strategy focus · Addendum: theme glyphs · R1 (account 2, 2026-11-20)

Canvas: https://claude.ai/artifact/6DVT1vSir56XWKGpDeNb9B · **R1, awaiting Hugh's audit against the shipped set.**

Extends this folder's R2g handoff. The focus flow, ring, medallion and legend are locked; this addendum only adds glyphs to
`STRATEGY_GLYPHS` in `src/components/decks/strategy-icon.tsx`. Nothing else changes: no new tokens, colours or components.

## Boards (one canvas, three artboards; a canvas frame caps at 8000px tall)

| Board | What |
|---|---|
| Main | The calls; three shipped glyphs for scale; the thirteen at 14, 16, 18, 16 picked, and on the medallion at both widths (60 on 92, 77 on 118); the shipped strategy block in place on four fixture decks (390 ×3, 1300) |
| Themes | All six themes (Low Sun, Neon Rain, Canopy, Oil Haze, Witching Hour, First Frost), tokens from `globals.css`: the legend at 16 with all thirteen plus three shipped, Storm picked; every new glyph on both medallions |
| Pairs | Ten groups at risk of confusion at 14/16/24, on the medallion and as legend rows, with how each was separated; the whole 48-glyph set at 16 and at 14 |

## Calls

1. **Same family.** 24-unit grid, no fill, stroke 1.6 in `currentColor`, round caps and joins, one to four shapes. They take
   `--fg-muted` in the legend, `--accent-text` when picked, and sit on the shipped medallion at 56% of the ring centre.
2. **Read at 14.** The smallest shipped size is the precon upgrade run row (14px); the focus picker legend is 16; precon pick and
   result are 18. Every glyph's outline alone names it at 14.
3. **One mark per mechanic.** Storm and Monarch already ship as life tracker counter icons (`src/components/tracker/icons.tsx`,
   stroke 1.8). They are reused here at 1.6, so a mechanic wears one mark across the app. Monarch's is a plain drawn crown, not the
   Monarch card's crown. **Option B** (a throne) is drawn in case Hugh wants no crown at all; it breaks with the tracker.
4. **Nothing from Wizards.** No mana or set symbols, no planeswalker symbol, no loyalty shield, no Saga chapter numerals, no
   card-frame crown.
5. **Three stand-ins retire.** Planeswalkers stops drawing the dashed fallback, Sagas stops borrowing Enchantments' moon,
   Proliferate stops borrowing +1/+1 counters' square.

## The glyphs

| Key (suggested; use eng's theme key) | Legend name | Drawing |
|---|---|---|
| `planeswalkers` | Planeswalkers | A figure (head and shoulders) with three rays rising: its spark |
| `sagas` | Sagas | A book open flat |
| `proliferate` | Proliferate | Three plus signs, no frame |
| `storm` | Storm | Twister: four stepped strokes and a curl (tracker's Storm) |
| `monarch` | Monarch | Plain crown over a base bar (tracker's Monarch) · B: throne |
| `extraTurns` | Extra turns | Hourglass, capped top and bottom |
| `extraCombats` | Extra combats | Two swords crossed |
| `minusCounters` | −1/−1 counters | −1 in a circle |
| `burn` | Burn | Flame with two tongues |
| `groupHug` | Group hug | Gift box with a bow |
| `pillowFort` | Pillow fort | Crenellated wall with a gate |
| `bigMana` | Big mana | Three stacked rounded rocks |
| `politics` | Politics | Two speech bubbles |

Legend names for the new themes are placeholders for /copy-review where engineering hasn't named them.

## Pairs at risk, and how they're separated

- **Storm · Burn · Spells matter**: open stepped strokes vs one closed flame vs the zigzag bolt. Different outlines.
- **Extra turns · Extra combats** (and Equipment and Auras): time vs fight. Hourglass is upright and mirrored top to bottom; the swords are an X, mirrored left to right. One sword stays Equipment and Auras; Extra combats always has two.
- **Burn · Drain**: Drain's drop is symmetric with a bar inside; Burn's flame is lopsided with nothing inside.
- **−1/−1 · +1/+1 · Proliferate**: at 14 the plus's upright is under 2px, so the frame carries the difference: square for +1/+1, circle for −1/−1, no frame for Proliferate.
- **Monarch · Landfall**: crown has three even points over a separate bar; Landfall is two uneven peaks, no bar. Option B removes the zigzag entirely.
- **Pillow fort · Protection · Stax**: flat-topped wall vs pointed shield vs arched padlock.
- **Group hug · Treasure · Life gain**: square gift vs pointed gem vs heart.
- **Planeswalkers · Blink**: a figure with three rays above vs eight rays around nothing.
- **Sagas · Card draw**: a wide open book vs upright cards.
- **Big mana · Treasure · Artifacts**: stacked rocks vs gem vs gear. (Off this surface, the tracker's Blessing is also a stepped pile; they never share a screen.)

## For engineering

Add to `STRATEGY_GLYPHS` (renaming keys to the shipped theme keys), and delete the three stand-in entries for planeswalkers,
sagas and proliferate:

```tsx
  planeswalkers: (<><circle cx="12" cy="11" r="3" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" /><path d="M12 2.5v2.5M6.5 4.5l1.6 1.9M17.5 4.5l-1.6 1.9" /></>),
  sagas: (<><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z" /><path d="M12 6.5v13" /></>),
  proliferate: (<><path d="M12 3v6M9 6h6" /><path d="M6.5 13v6M3.5 16h6" /><path d="M17.5 13v6M14.5 16h6" /></>),
  storm: (<><path d="M4 8.5h13M6 12h11M8.5 15.5h7M11 19h3.5" /><path d="M17 8.5c2 0 3-1.2 3-2.5S19 3.5 17 3.5H8" /></>),
  monarch: (<><path d="M3.5 18l2-10 4.3 4L12 5l2.2 7 4.3-4 2 10z" /><path d="M5 21h14" /></>),
  extraTurns: (<><path d="M6.5 3.5h11M6.5 20.5h11" /><path d="M8 3.5v2c0 3.5 4 4.5 4 6.5s-4 3-4 6.5v2M16 3.5v2c0 3.5-4 4.5-4 6.5s4 3 4 6.5v2" /></>),
  extraCombats: (<><path d="M4 4l11 11M13 17.5l4.5-4.5M15 15l4.5 4.5" /><path d="M20 4L9 15M11 17.5L6.5 13M9 15l-4.5 4.5" /></>),
  minusCounters: (<><circle cx="12" cy="12" r="9" /><path d="M6.5 12h5M15.5 9v6" /></>),
  burn: <path d="M12 21.5a6.5 6.5 0 0 0 6.5-6.5c0-4.5-3.5-6.5-4-12-2.5 2-3.5 4.5-3.5 7-1.2-.8-2-2.2-2.2-3.8C6.6 8 5.5 11.5 5.5 15a6.5 6.5 0 0 0 6.5 6.5z" />,
  groupHug: (<><path d="M4 10h16v3H4z" /><path d="M5.5 13v7.5h13V13M12 10v10.5" /><path d="M12 10c-1.5-3-5.5-4.5-5.5-2S9.5 10 12 10c2.5 0 5.5.5 5.5-2s-4-1-5.5 2z" /></>),
  pillowFort: (<><path d="M4.5 21V8h3v2.5h3V8h3v2.5h3V8h3v13z" /><path d="M10 21v-4a2 2 0 0 1 4 0v4" /></>),
  bigMana: (<><rect x="3.5" y="16" width="17" height="4.5" rx="2.25" /><rect x="5.5" y="10.5" width="12" height="4.5" rx="2.25" /><rect x="8.5" y="5" width="8" height="4.5" rx="2.25" /></>),
  politics: (<><path d="M4 3.5h9.5A1.5 1.5 0 0 1 15 5v5a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3H4A1.5 1.5 0 0 1 2.5 10V5A1.5 1.5 0 0 1 4 3.5z" /><path d="M18 8.5h2A1.5 1.5 0 0 1 21.5 10v5a1.5 1.5 0 0 1-1.5 1.5h-1v3l-3.5-3H11a1.5 1.5 0 0 1-1.5-1.5v-1" /></>),
  monarchThrone: (<><path d="M7.5 12.5V7.5a4.5 4.5 0 0 1 9 0v5" /><path d="M5 12.5h14V16H5z" /><path d="M6.5 16v4.5M17.5 16v4.5" /></>),
```

`monarchThrone` is option B only; ship `monarch` unless Hugh picks B. The `strategy-icon.test.tsx` "every strategy has its own
glyph" style check should now cover the three former stand-ins.

## States

None new. Each glyph appears wherever `StrategyIcon` already draws (legend 16, ring medallion, precon upgrade 14/18).

The generator lives on `design-assets` under `account-2/design_handoff_the99_strategy_focus/addendum-theme-glyphs/scratch-gen/`:
`python3 gbuild.py` writes `gout/`; `python3 flat.py Main Themes Pairs && node grender.js` renders and checks for overflow.
