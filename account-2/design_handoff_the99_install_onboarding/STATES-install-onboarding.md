# States: Install onboarding (R1)

Each state is drawn at 390, and desktop at 1300. The frame ids are the canvas badges.

| Frame | Who | Shown when | Shows | Select / ✕ |
|---|---|---|---|---|
| I1 | iPhone Safari | first run, `iphoneInstallBrowser() === "safari"`, not standalone, row not retired, no `installedAt` | the row, Safari line | opens the shipped sheet (I1s) / retires the row and calls `dismissOnce()` |
| I2 | iPhone Chrome | same, `"chrome"` | the row, Chrome line | Chrome sheet (I2s) / same |
| I3 | iPhone Firefox | same, `"firefox"` | the row, Firefox line | Firefox sheet (I3s) / same |
| I4 | Android | first run, a `beforeinstallprompt` held, same gates | the row, Android line | `prompt()`. Accepted: the row goes (`appinstalled`). Declined: the row goes for the visit. / same ✕ |
| N1 | Installed app | `isStandalone()` | no row | with option A, the first signed-in launch writes `installedAt` (draws nothing) |
| N1 | In-app web view, iPad, Edge or another unsourced browser | `iosBrowser()` is `webview` or `other`, or the device is an iPad | no row | — |
| N1 | Installed elsewhere (option A) | `installedAt` is set | no row, and no header slot | — |
| N1 | After ✕ | `the99-install-row` retired in local storage | no row, ever. The header slot is quiet for 30 days, then follows its shipped rules | — |
| D1 | Desktop | no iPhone browser and no held prompt at phone width (d9 call 1) | no row | — |
| — | First run ends | cards or a deck arrive | the checklist and the row unmount. The header slot carries on | — |

While the row is mounted, the header's Install slot draws nothing.
