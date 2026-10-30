# CONTRAST — the card mark

§3 asks for one thing before the build: *a wordless mark must be checked against the surface's
existing conventions and its weakest contrast measured BEFORE the build.* **This mark is wordless,
so the trigger fires.** Both halves are below.

## Half one — the ink on every ground it touches

`--fact` `#8FA6BE` is one theme-independent ink on four grounds, two live themes.

WCAG AA small text is **4.5:1**; non-text graphics (1.4.11) is **3:1**. The glyphs are graphics, so
3:1 is the governing floor — every figure below clears the stricter text floor anyway.

| Ground | Where | amonkhet | kamigawa |
|---|---|---|---|
| `--surface` | collection row, collection tile | **6.9:1** | **7.1:1** |
| `--surface-rail` | decklist row at rest | **7.2:1** | **7.3:1** |
| `--elevated-hover` | decklist row, hovered — the darkest ground | **6.7:1** | **6.9:1** |
| `--bg` | the modal block, the key | **7.5:1** | **7.6:1** |

**Weakest measured: 6.7:1**, `#8FA6BE` on `#201C17`. There is no fifth ground: the mark is never
drawn on art, on an accent fill, on a status tint or on a scrim.

**Solid glyphs, not outlines**, so the measured ratio is the ratio the eye gets. An outline glyph at
12px covers so few pixels that its effective contrast is well below its nominal one; a filled
silhouette does not have that gap.

### The glow is decoration and is stated as such

`drop-shadow` at 45% of the ink, 2–3px. It adds no contrast the table does not already have and
carries nothing — **remove it and every fact here still holds.** It exists to lift the mark off a
dark row on a fast scan, which is a findability job, not a legibility one.

### The ink against the six theme accents

The ink is fixed, the accents are not. Cool slate against six warm accents is the whole reason for
the choice — **with one to check in build: Kaldheim's accent is the app's only cool one** and the
nearest neighbour to `#8FA6BE`. Marks and accent elements never sit adjacent on these rows, so the
risk is tonal rather than confusable, but it is the one theme to eyeball first.

## Half two — against the surface's own conventions

Contrast was never the deck-status marks' problem. **Distinguishability was.**

| Neighbour | Shares | Differs by |
|---|---|---|
| availability chip | — | a **box**, state colour, a count, two words |
| buy tag `$` | — | a **box**, `--warning`, a glyph-character |
| proxy `P` | — | a **box** with a dashed edge, neutral ink |
| two-faced `//` | — | plain text, no box, no colour |
| draft pair `1 → 2` | — | mono figures, `--accent`, no box |
| ownership dot | round-ish silhouette | 7px, solid, `--success`/`--fg-locked`, fixed left position |
| bracket mark | — | a **diamond glyph + numeral**, Ignition ramp, a 999px pill, deck-scoped |

Two axes separate the card mark from everything on this surface simultaneously:

1. **It is the only uncontained mark.** Every other mark on these rows sits in a box. That is the
   design rule, not a coincidence — **boxed means "about your copies", bare means "about the
   card"**.
2. **It is the only cool ink.** Every status colour in both themes is warm.

Either one alone would be sufficient. Neither depends on the other, and neither depends on the glow.

### Against the bracket mark specifically

The deck page carries both: the bracket chip in the header's meta row, card marks on the rows
below. They differ on **four axes at once** — form (diamond + numeral vs. three natural
silhouettes), ink (Ignition ramp vs. `--fact`), container (999px pill vs. none), scope (the deck vs.
the card). Round 0's floor also ships the bracket as a bare numeral below 20px, and a numeral
cannot be confused with a bolt, a peak or an arrow at any size.

## Type and size floors

The glyph floor is **12px** on the collection tile, with a 16px viewBox drawn at mass weight. No
text is introduced at any size on any dense surface — the words live in the key (11px, `--fg-muted`)
and in the modal (13px, `--fg-body`), both well above every floor.
