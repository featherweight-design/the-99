# Version card rows — readiness (R1, H31)

**Status:** reviewed with Hugh, 2026-10-03 (LGTM). Frames 1b–1d at 390, 1e–1f at 1300, calls 1a, states 1g.

| Part | Readiness | Note |
|---|---|---|
| Ownership dot on In rows | **Ready** | `OwnershipDot owned={ownedNow > 0} size={7}`, two states only. |
| Buy tag on short In rows | **Ready** | `BuyTag variant="row"`: `density="full"` from md, `"collapsed"` below. Shown when `ownedNow < to`. |
| `own N of M` | **Ready** | Partly owned only. Mono 10.5px `--fg-faint`, after the name. |
| Out rows | **Ready** | No dot, no tag. Modal and preview only. |
| Card modal | **Ready** | `CardDetailTrigger` plus `useRowOpen`. Siblings run In then Out. |
| Hover preview | **Ready** | `HoverPreviewProvider` around the columns. Desktop and `hover: hover` only. |
| `todayNote` | **Ready** | Replaces `diffNote`. Above the columns, both widths, only when In has rows. |
| Payload | **Eng** | `VersionDiffCard` gains `imageUri`, `ownedNow` and `price`, plus `newestAsOf` per payload, read in `getVersionDiff`. |
| v1 / `noChange` / unavailable | **Ready, no change** | |
| Copy | **To /copy-review** | `version-rows · copy strings.ts`: three strings. |
| About `versions` | **No change** | An optional bullet is offered (Hugh's call). |

## Gap report

1. **Ruling touched:** deck versioning decision 7 is half reversed. Dots and prices are now on In rows; pull offers stay out. Rewrite the file comment at the head of `version-diff.tsx`.
2. **Theme coverage:** only Kaldheim is drawn. Every token used is an existing one.
3. **Group-header rule:** the 1300 screenshot shows a mauve rule where the code says `--border`. Drawn as shipped and not changed here, so check it.

## What a green looks like

- Opening v3 at 1300: Aang and Earthshape draw a filled dot and no tag. Bumi draws a dashed dot and `buy · $2.40`. Petitioners draws a filled dot, `own 1 of 4` and `buy · $0.35`. `Plains 6 → 7` draws a filled dot. The Out column draws no dots.
- Resting on a row opens the 252×352 preview at 240ms. Clicking anywhere on the row opens the modal, and Next from the last In card lands on the first Out card.
- At 390 the same rows are one 44px line with `$`. No preview on touch.
- The today line reads `ownership and prices are today’s, not v3’s` and is absent on a cuts-only version and on v1.

## Engineering audit (2026-10-03, against origin/main 2cddcdb77)

**Supersedes the "Buy tag on short In rows" row above.** The tag is `density="full"` from `lg` (not `md`) and `"collapsed"` below it, and collapsed draws the live figure (`$2.40`), with a bare `$` only when there is no live price (findings 1 and 2).

**Verdict: 🟢 GREEN.** Buildable as drawn. Every named component and token exists, the payload is plumbing other loaders already do, and every state is reachable. Nothing below needs a Design round.

Verified: `OwnershipDot` (`src/components/ui/ownership-dot.tsx:25-50`), `BuyTag` `variant="row"` with `density` and `newestAsOf` (`buy-tag.tsx:141-192`), `CardDetailTrigger` siblings paging any list (`card-detail-provider.tsx:932`, In-then-Out as `review-changes.tsx:644` does), the Versions tab inside the deck page's `CardDetailProvider` (`builder-shell.tsx:1615`), `HoverPreviewProvider` / `usePreviewRow` (`hover-preview.tsx:166`, `:353`, none on the Versions tab today), the decision-7 comment (`version-diff.tsx:3-9`) and `diffNote` (`:440`). `useRowOpen` and `ROW_PLATE_HOVER` exist but are module-private (`update-diff-row.tsx:287`, `:105`). Every `var(--x)` exists in `globals.css`.

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | Below md, `density="collapsed"` draws the live figure (`$2.40`), not a bare `$`; only a no-price or sold-out card draws `$` (`buy-tag.tsx:258-272`, and its comment says why). README call 2 and STATES rows 8–11 say `$`. | Medium | Eng: use the component as it is. The phone name keeps ~125px rather than ~150px. STATES corrected in the build PR. |
| 2 | 768–~1100px is not drawn. At 820 a partly owned In row's fixed parts take ~277px of a ~320px column, leaving the name ~40px. | Medium | Eng: the tag stays `collapsed` below `lg`, and the probe reads an 820px name floor (the `probe:review` held-row lesson). |
| 3 | The canvas draws `Persistent Petitioners` without its pair; an add of 0→4 prints `0 → 4` (`printsPair`, `draft-shape.ts:251`). At 390 the ellipsis takes the pair. | Low | Accepted: rows already behave this way, and the modal has the whole name. |
| 4 | STATES calls `own N of M` "the decklist's short figure"; that figure is claim-relative (`decklist-row.tsx:605-625`). | Low | Eng: README note 1's definition, `sum(collection_items.quantity)` across printings, scoped to the diff's oracle ids. |
| 5 | Payload sources. | Low | Eng: `loadPrices(oracleIds)` for price and `newestAsOf` (`price-query.ts:67`); basics forced owned and left out of the price read; art and `printedName` from `resolveOwnedPrintings` (`owned-printings.ts:31`) with `cards.image_uri` fallback; `loadVersionDiff` (`versions.ts:505`) gains `userId`. |
| 6 | README says `todayNote` shows "only when In has rows"; canvas 1c (phone, Out pressed) omits it. | Low | Eng: follow the canvas; hidden while the phone shows Out. |
| 7 | The 1300 screenshot's mauve group rule (`#4A3C4C`, `dc.html:222`) is not the code's `--border` (`decklist-group-header.tsx:61`). | Low | Unchanged this round, as the handoff says. |
| 8 | `probe:versions` fails any transition inside `#panel-versions` (`probe-version-history.mjs:131-139`). | Low | Eng: the new parts carry none; the probe keeps asserting it. |
| 9 | `diffNote` is pinned by `deck-versioning.test.ts:30`, `version-diff.test.tsx:109-116,199` and `design-tables/deck-versioning-surface-4-5.md:57,623`; `versions.ts:482` restates decision 7. | Low | Eng: swept in the build PR. |

**Copy:** `todayNote(version)`, `partialOwned(owned, asked)` and `partialA11y(owned, asked)` under `deckVersioningCopy.history`; `diffNote` retired. Interpolations match. Wording goes to `/copy-review`.

**About:** the `versions` entry (`src/lib/copy/about.ts:624-637`, `ABOUT_VERSION` 9) stays true. This round gives the version rows treatments the app already draws on other rows, so it is cosmetic: no entry, no bump. The optional bullet is Hugh's call. As a caption sentence it is an ordinary edit. As a key line it needs a numeral on the figure (`about-page.test.tsx:1746`), and the `versions` specimen draws the rail closed (`ch01-figures.tsx:1280-1300`), so it would also need an opened diff drawn from fixtures.
