# MIGRATION — retiring two theme ids

`design/design_handoff_the99_theme_replacement/` · **R6** · 2026-09-06

Unchanged from R5 — the R6 chroma refit touched token hexes only. Ids, fallbacks and order of
operations stand.

**This is the only part of the pass that can break for an existing user.** Everything else is
hexes and display strings.

## What breaks

`data-theme` is persisted per user. Two of its six legal values stop existing:

| Persisted value | Was called | Status |
|---|---|---|
| `innistrad` | Moonlit | **removed** |
| `duskmourn` | Screen Glow | **removed** |
| `amonkhet` · `kamigawa` · `phyrexia` · `kaldheim` | renamed only | **ids unchanged, no migration** |

Keeping the plane prefix is what holds that last row to four. Had we dropped it, all six ids
would have moved and this document would be a much larger problem.

## The fallback: nearest survivor, not default

Do **not** fall back to `:root`/Amonkhet. Someone who chose Moonlit chose a cool, low-chroma,
desaturated theme; dropping them into brass is the loudest possible wrong answer.

```ts
const RETIRED: Record<string, string> = {
  innistrad: "phyrexia",   // Moonlit      → Oil Haze     (accents were 15° apart)
  duskmourn: "kaldheim",   // Screen Glow  → First Frost  (accents were 25° apart)
};

export function resolveTheme(persisted: string | null): string {
  if (!persisted) return "amonkhet";
  if (THEMES[persisted]) return persisted;
  const near = RETIRED[persisted];
  if (near) return near;
  return "amonkhet";        // unrecognised value from a future/rolled-back build
}
```

**The irony is the point:** the two themes are being removed *because* they were 15° and 25°
from a survivor. That same closeness is what makes the fallback nearly invisible — these users
land somewhere that looks like what they picked. It is the one time this redundancy is useful.

## Announce it once, then stop

On first load after migration, for affected users only, a single dismissible line in the theme
picker — not a modal, not a toast on every load:

> **Moonlit has been retired.** You're on Oil Haze, the closest theme to it. Have a look at
> Canopy and Witching Hour while you're here.

Persist the dismissal. If they change theme, the line has done its job — drop it.

## Order of operations

1. Ship `resolveTheme` with `RETIRED` populated, **while the two blocks still exist.** Harmless: no id hits the fallback yet.
2. Ship the two new blocks (`ixalan`, `eldraine`) and the renamed display strings.
3. **Then** delete the `innistrad` and `duskmourn` blocks.

Doing 3 before 1 gives every affected user an unstyled shell — `data-theme` set to a selector
that matches nothing, so no block wins and they get raw `:root` chrome under a theme name that
no longer exists.
