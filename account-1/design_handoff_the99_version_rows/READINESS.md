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
