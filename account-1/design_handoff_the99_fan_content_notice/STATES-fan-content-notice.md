# Fan Content notice R2 · states

Every surface at 390 and desktop unless marked. "Must not" lists what the build must not do there.

## The notice (every surface)

| State | Frames | Shows | Must not |
|---|---|---|---|
| Short page, signed in, at rest | Signed-In S1, S4 | nothing new: the page as shipped, the notice starting at the fold | show above the fold; leave an empty band; be fixed |
| Short page, signed in, scrolled | S1b, S4b | after the page, above the tab bar's reserve | sit under the tab bar |
| Long page, signed in | S2, S5 | after the page's last content, 20px under its hairline | stick to the screen; overlap a dock or sheet |
| Collection locked (88px bar) | S3, S3b | the same, the fold and the reserve at 88px | read the global 74px |
| Signed out, at rest | Signed-Out O1–O5, 390 at rest | the page exactly as shipped (`min-h-screen` kept) | appear above the fold; change the page's composition |
| Signed out, scrolled | O1–O5, scrolled | centered, after the page | be left-aligned on these pages |
| Legal page | Privacy-and-Terms L1–L8 | after the article | repeat inside the article |
| Every theme | Themes | `--fg-muted` text, `--border` hairline | use `--fg-faint`, `--accent` or a hex |

## The link

| State | Ink | Underline | Must not |
|---|---|---|---|
| Rest | `--fg-muted` | 1px `--fg-faint`, 2px offset, `↗` after | look like a button; be the only link-colored thing on the page |
| Hover / active | `--fg` | `--fg-muted` | change size or weight |
| Focus-visible | rest ink | rest | drop the 2px `--accent` ring at 2px offset |
| Visited | as rest | as rest | turn purple or accent |

Opens in a new tab, `rel="noopener noreferrer"`. Nothing else in the notice is a link.

## `/privacy` and `/terms`

| State | Frames | Shows | Must not |
|---|---|---|---|
| Signed out | L1, L3, L5, L7 | legal header (wordmark to `/`, `Sign in`), article, notice | use the primary button; draw the shell |
| Signed in | L2, L4, L6, L8 | inside the shell, no tab lit, article, notice | add a back control (the shell is the way back) |
| Jump to a section | all | phone: `On this page` rows; desktop: sticky column, diamond on the section in view | be `fixed`; hide the list behind a toggle |
