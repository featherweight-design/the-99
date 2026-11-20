"""Strategy focus glyphs addendum R1 (account 2, 2026-11-20): thirteen theme glyphs in the shipped family.

Family (src/components/decks/strategy-icon.tsx): 24-unit grid, no fill, stroke 1.6 in currentColor, round caps and joins,
one to four shapes. Storm and Monarch reuse the life tracker's shipped counter icons (src/components/tracker/icons.tsx),
redrawn at 1.6, so one mechanic has one mark across the app.
"""

# key: (legend name, inner svg, metaphor)
NEW = {
    "planeswalkers": ("Planeswalkers",
        '<circle cx="12" cy="11" r="3"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/><path d="M12 2.5v2.5M6.5 4.5l1.6 1.9M17.5 4.5l-1.6 1.9"/>',
        "A figure with its spark rising off it. No loyalty shield, no planeswalker symbol."),
    "sagas": ("Sagas",
        '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z"/><path d="M12 6.5v13"/>',
        "An open book: a story told in chapters. No chapter numerals from the frame."),
    "proliferate": ("Proliferate",
        '<path d="M12 3v6M9 6h6"/><path d="M6.5 13v6M3.5 16h6"/><path d="M17.5 13v6M14.5 16h6"/>',
        "Three plus signs: one more of every counter. Takes the plus from +1/+1 counters, drops its frame."),
    "storm": ("Storm",
        '<path d="M4 8.5h13M6 12h11M8.5 15.5h7M11 19h3.5"/><path d="M17 8.5c2 0 3-1.2 3-2.5S19 3.5 17 3.5H8"/>',
        "A twister. The life tracker’s shipped Storm counter, at this family’s 1.6 stroke."),
    "monarch": ("Monarch",
        '<path d="M3.5 18l2-10 4.3 4L12 5l2.2 7 4.3-4 2 10z"/><path d="M5 21h14"/>',
        "A plain drawn crown: the life tracker’s shipped Monarch counter, at 1.6. Not the card frame’s crown (R2: kept, Hugh)."),
    "extraTurns": ("Extra turns",
        '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M8 3.5v2c0 3.5 4 4.5 4 6.5s-4 3-4 6.5v2M16 3.5v2c0 3.5-4 4.5-4 6.5s4 3 4 6.5v2"/>',
        "An hourglass: more time. Upright and mirrored top to bottom."),
    "extraCombats": ("Extra combats",
        '<path d="M4 4l11 11M13 17.5l4.5-4.5M15 15l4.5 4.5"/><path d="M20 4L9 15M11 17.5L6.5 13M9 15l-4.5 4.5"/>',
        "Two swords crossed: another fight. An X, mirrored left to right."),
    "minusCounters": ("−1/−1 counters",
        '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M7 12h4M15 9v6"/>',
        "+1/+1’s own counter with a minus: the same frame and the same 1, the minus as wide as the plus’s arm, so it reads as its sibling at once."),
    "burn": ("Burn",
        '<path d="M12 21.5a6.5 6.5 0 0 0 6.5-6.5c0-4.5-3.5-6.5-4-12-2.5 2-3.5 4.5-3.5 7-1.2-.8-2-2.2-2.2-3.8C6.6 8 5.5 11.5 5.5 15a6.5 6.5 0 0 0 6.5 6.5z"/>',
        "A flame with two tongues. Closed, no inner mark."),
    "groupHug": ("Group hug",
        '<path d="M4 10h16v3H4z"/><path d="M5.5 13v7.5h13V13M12 10v10.5"/><path d="M12 10c-1.5-3-5.5-4.5-5.5-2S9.5 10 12 10c2.5 0 5.5.5 5.5-2s-4-1-5.5 2z"/>',
        "A gift: the deck hands everyone something."),
    "pillowFort": ("Pillow fort",
        '<path d="M4.5 21V8h3v2.5h3V8h3v2.5h3V8h3v13z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
        "A fort wall with a gate: attackers stay out. Flat top, crenellated."),
    "bigMana": ("Big mana",
        '<path d="M3 19.5h18V8.5z"/><path d="M4.5 12L13 4.5M9 4.5h4v4"/>',
        "A ramp with an arrow climbing it: the deck ramps. No mana symbol, no gem (Treasure has the gem)."),
    "politics": ("Politics",
        '<path d="M4 3.5h9.5A1.5 1.5 0 0 1 15 5v5a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3H4A1.5 1.5 0 0 1 2.5 10V5A1.5 1.5 0 0 1 4 3.5z"/><path d="M18 8.5h2A1.5 1.5 0 0 1 21.5 10v5a1.5 1.5 0 0 1-1.5 1.5h-1v3l-3.5-3H11a1.5 1.5 0 0 1-1.5-1.5v-1"/>',
        "Two speech bubbles: deals across the table."),
}

ALT = {}

# The stand-ins the three missing glyphs draw today (strategy-icon.tsx).
STANDIN = {"planeswalkers": "fallback", "sagas": "enchantments", "proliferate": "counters"}

NAMES = {
    "counters": "+1/+1 counters", "pump": "Pump", "haste": "Haste", "evasion": "Evasion", "etbDraw": "Draws on entering",
    "draw": "Card draw", "tokens": "Tokens", "treasure": "Treasure", "protection": "Protection", "recursion": "Recursion",
    "blink": "Blink", "finisher": "Finishers", "castFree": "Free casts", "mill": "Mill", "sacOutlet": "Sacrifice outlets",
    "deathTrigger": "Death triggers", "lifegain": "Life gain", "drain": "Drain", "spellslinger": "Spells matter",
    "landfall": "Landfall", "typal": "Creature types", "graveyardHate": "Graveyard hate", "discard": "Discard", "stax": "Stax",
    "clones": "Clones", "theft": "Theft", "poison": "Poison", "goad": "Goad", "doublers": "Doublers", "fog": "Fogs",
    "artifacts": "Artifacts", "enchantments": "Enchantments", "voltron": "Equipment and Auras", "vehicles": "Vehicles",
    "bigCreatures": "Creatures costing 6+", "fallback": "Fallback",
}
