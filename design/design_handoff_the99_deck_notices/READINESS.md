# Readiness — deck notices R1

## For Hugh

1. **A second place that offers Re-analyze.** Notices' foot offers it when there is no banner (notice only).
   This amends the analysis tab's "only the banner" rule; without it a notice-only deck has no way to
   re-analyze, since a current reading shows no control. Fallback: the foot links to the tab, and the tab grows
   a Re-analyze for this case, which would be a second banner.
2. **Withheld vs passable (§4.6).** Drawn as withheld. The case for passable is rule 0 (a table that allows a
   banned card). If that wins, the same note gains *Write it anyway* and the credit note returns beside it.
3. **About entry** drawn although the brief's §7 left it out; it rides the batch's bump.

## For engineering

1. `/decks` needs an enum, not the brief's boolean: `none | unread | notLegal` (the tile shows the face).
2. **Banned vs not legal.** Keep `legalities.commander` if *Banned in Commander.* is wanted; the frames use the
   line the boolean can state.
3. **Read state** is new storage: a read sequence per deck beside the high-water mark. Opening the sheet is the
   read; a stacked card does not change it.
4. **The foot's Re-analyze on an unchanged list** must still recompute against the current catalog and advance
   the mark, not short-circuit to the stored reading because the fingerprint matches.
5. `--danger` text at mono 10 / 11 on `--bg` is ~3.1:1 in amonkhet, as the tile's `4 over` already is. Flag for
   the contrast gate; the dot and hairline carry it at 3:1.

## For copy-review

*notices* as the tag's noun (not *updates*, which collides with *Update from a list* in the same header); the
reason lines; the two foot sentences; the check note. All in `deck-notices · copy strings.ts`.

## Fixtures

The rules entry (*Upgraded now allows up to four…*) is invented to show the form. No bracket rules change is
implied.
