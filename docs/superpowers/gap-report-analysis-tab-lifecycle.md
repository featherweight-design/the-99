# Gap report: Analysis tab, the lifecycle surface (PR C2)

Table: `docs/superpowers/design-tables/analysis-tab-lifecycle.md`. I verified it row by row against:
- components: `analysis-banner.tsx`, `analysis-panel.tsx`, `analysis-empty.tsx`, `verdict-block.tsx`, `use-deck-profile.ts`, `use-header-bracket.ts`, `builder-shell.tsx`
- actions: `profile-actions.ts`, `declaration-actions.ts`
- copy: `deck-analysis.ts`
- data: `stored.ts`

## Pass 1 summary

These rows match:

- **Tab body:** padding, gap, and the banner as the first child above an unchanged grid.
- **Banner container:**
  - role `status` for 2i, `alert` for 2d (conflict C4)
  - a column with gap 12 at 390, a row with gap 18 at 1300
  - padding 14 15 / 14 16 14 20, radius 11, `--surface-rail`, 1px `--border-strong`
  - no icon, stripe or tag
- **Banner sentence:** 13 / 13.5px, `--fg-body`, flex 1 on desktop.
- **Banner button:** stretched on the phone, intrinsic on desktop. 44 / 36px tall, padding 0 18, radius 8. Enabled `--fg` on `--bg`, 600. Busy is the `ctaBusy` look.
- **The held reading:** whole. The version row is suppressed, and 2d's body is identical to 2i's.
- **The date line:** mono 10 `--fg-faint`, in three forms (asked, committed, stale). The date reads `18 Sep`.
- **Ask chips:** a stale range withholds them, and the server refuses a declaration on a dirty reading.
- **The chip:** the header and the tile both hold, with no staleness mark.
- **An illegal deck:** Analyze disabled with the line, or a held reading kept with Re-analyze disabled.
- **Conflicts C1–C10:** all implemented as resolved.

## Visual gaps

1. **A retry from 2d changed the banner while busy** (`analysis-panel.tsx`). Its label, sentence and role flipped to 2i's. **Fixed:** `loading` carries `retry`, so a press from 2d keeps `failedHeld`, `role="alert"` and `Try again`, disabled in place. Tested.
2. **The illegal line sat under the CTA row** (`analysis-empty.tsx`). **Fixed:** it now sits inside the row, on its own line (`md:basis-full`).

## State reachability gaps

1. **The server's `illegal` refusal outlived the deck being made whole** (`analysis-panel.tsx`). **Fixed:** the shell's own count decides whenever one is handed in. Tested.
2. **`change` on a stale answered range withheld the whole section** (`verdict-block.tsx`). **Fixed:** a stale range keeps its answer, and `change` does nothing until the re-read. Tested, and a mutation reverting it fails.
3. **A dirty row an older `PROFILE_VERSION` wrote reads as nothing** (`stored.ts`). **Declined.** An old document's shape is never shown: version.ts records that it reads NaN. Such a row is rebuilt only over the list it read, on a clean legal deck. On a dirty deck the tab offers the press, and the header's chip still holds its permits, which are two integers rather than a document. It is transitional: one deploy's worth of rows, each gone at its next press.
4. **Loading over 2d rendered as 2i.** This is the state side of visual gap 1, and fixed with it.

VERDICT: 0 open visual gaps (2 fixed), 0 open state gaps (3 fixed, 1 declined).

## Evidence

- **`probe:verdict-block`** walks 2i at 1300 and 390:
  - the banner is above the reading, as a row with a 36px button at 1300 and a column with a full-width 44px button at 390
  - the date line reads `before your changes`
  - the header's chip holds
  - with the banner's stale condition removed, both widths read `no banner`
- **Unit tests:**
  - `analysis-panel.test`: 2i, loading over a held reading, 2d, the retry banner, the illegal line both ways, and the refusal clearing
  - `use-deck-profile.test`: an edit marks the reading stale; a failed re-read holds it
  - `declaration.test`: a stale range withholds its chips and keeps an answer
  - `declaration-actions.test`: `stale` refused
