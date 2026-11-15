# States: Install onboarding (R1b)

These are the canvas badges at 390, plus desktop at 1300. R1's checklist row (I-frames) is withdrawn.

| Frame | Who | Shown when | Shows |
|---|---|---|---|
| B1 / B2 / B3 | iPhone Safari / Chrome / Firefox | the first-run tour starts at 390 and the header slot draws (`iphoneInstallBrowser()`, not standalone, not dismissed, no `installedAt`) | a last stop lighting the slot, with that browser's body. Selecting the lit button ends the tour and opens the shipped sheet (B1s, B2s, B3s) |
| B4 | Android | same, with a held `beforeinstallprompt` | a last stop. Selecting the lit button ends the tour and calls `prompt()` |
| B1a | After Finish | the tour ends | the shipped header button, unchanged |
| N1 | Installed app, in-app view, iPad, Edge or other, no prompt, slot dismissed | the slot doesn't draw at the run's start | the tour as shipped (ends at What's new) |
| N1 | Installed elsewhere (option A) | `installedAt` is set | no slot and no stop, in any browser |
| D1 | Desktop | md and up | the tour as shipped (no slot, d9 call 1) |

The stop is decided once, at the run's start. A slot dismissed mid-run (its ✕ is inside the cutout on the stop) just goes, and Finish ends the tour.
