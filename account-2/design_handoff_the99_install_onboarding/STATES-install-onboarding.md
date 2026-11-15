# States: Install onboarding (R1c)

These are the canvas badges at 390, plus desktop at 1300. R1's checklist row (I-frames) is withdrawn.

| Frame | Who | Shown when | Shows |
|---|---|---|---|
| B1 / B2 / B3 | iPhone Safari / Chrome / Firefox | the first-run tour starts at 390 and the header slot draws (`iphoneInstallBrowser()`, not standalone, not dismissed, no `installedAt`) | a last stop lighting the slot, with that browser's body. Selecting the lit button ends the tour and opens the shipped sheet (B1s, B2s, B3s) |
| B4 | Android | same, with a held `beforeinstallprompt` | a last stop. Selecting the lit button ends the tour and calls `prompt()` |
| B1a | After Finish | the tour ends | the shipped header button, unchanged |
| N1 | Installed app, in-app view, iPad, Edge or other, no prompt, slot dismissed | the slot doesn't draw at the run's start | the tour as shipped (ends at What's new) |
| N1 | Installed elsewhere (option A) | `installedAt` is set | no slot and no stop, in any browser |
| F1 | Skipped the tour | the tour ended before the Install stop, the slot would draw, `the99-install-row` neither `seen` nor `retired`, still first run | R1's row under step 3. The header slot steps aside |
| F2 | Row or header button selected, or row ✕ | `the99-install-row` = `retired` | no row, ever. The header slot as shipped |
| D1 | Desktop | md and up | the tour as shipped (no slot, d9 call 1) |

The stop is decided once, at the run's start. A slot dismissed mid-run (its ✕ is inside the cutout on the stop) just goes, and Finish ends the tour.
