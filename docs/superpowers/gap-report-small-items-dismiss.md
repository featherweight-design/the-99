# Gap report: Small items 4 (dismiss ✕ and kicker time)

Table: `docs/superpowers/design-tables/small-items-dismiss.md`. Verified 2026-10-27 against the worktree `small-items/dismiss-in-line`.

## PASS 1: property by property

### What's new / Waiting on you row (`.fi`): FeedItemRow `feed-item.tsx:249`, ASK_ROW `waiting-on-you.tsx:51`
| Property | Result |
|---|---|
| display grid | ✅ |
| grid-template-columns `46px minmax(0,1fr)` / `+ auto` | ✅ |
| gap 12 / 14 | ✅ (`gap-x`; phone action line uses the accepted mt-5 equivalence) |
| padding 12 14 / 12 16 | ✅ |
| align-items stretch / center | ✅ (`md:items-center`) |
| position relative | ✅ |
| border-top `.fi+.fi` | ✅ (`whats-new.tsx:47` `[&>li+li]`, `waiting-on-you.tsx:48` `[&+&]`) |
| border-top after day head 0 | ✅ (day head precedes a new `<ul>`; first li has none) |
| no padding-right reserve | ✅ |
| DOM order vis/combo, bd, ac | ✅ |
| `.ac` placement | ✅ (accepted equivalence: col 2 under text on phone, col 3 from md) |

### Container (`.fd`)
| Property | Result |
|---|---|
| flex column, border, radius 14, surface-inset, overflow hidden | ✅ (`whats-new.tsx:78`, `waiting-on-you.tsx:88`) |
| margin-top 12 | ✅ Waiting on you `mt-[12px]`; What's new via section `gap-[12px]` ✅ at 390, ❌ at 1300: `min-[1180px]:gap-[11px]` gives 11px (pre-existing menu-home rule) |

### Preview (`.vis`) / `.fa`
| Property | Result |
|---|---|
| relative, 46×64 | ✅ (Picture in feed-item, waiting-on-you) |
| `.fa` right -6 bottom -5, 24×24, radius 7, border 1.5 surface-inset, overflow hidden | ✅ |
| `.fa img` 100%, cover | ✅ |

### Combo tile
| 46×64, radius 4, border-strong, surface-raised, flex center, `--fact` | ✅ |

### Text column (`.bd`)
| flex column, gap 3, min-w-0, no pr, children kr/tt/dt | ✅ (FeedItemRow, AskRow, TradeRow, ReceiptRow) |

### Kicker (`.kr`)
| flex, center, gap 7, min-w-0, order un/kd/small | ✅ |

### Unread mark
| 6×6, accent, rotate 45, flex none, unread only | ✅ |

### Kind (`.kd`)
| Property | Result |
|---|---|
| mono 9.5 / 500 / .12em / uppercase / truncate | ✅ |
| default fg-faint | ✅ |
| `.w` accent-text (spare request) | ✅ |
| `.ok` success (Accepted / receipt yes) | ✅ |
| `.seen` fg-locked | ✅ FeedItemRow; ❌ TradeRow `waiting-on-you.tsx:214` always `--fg-faint`, seen or not (file header cites the PR 7b contrast ruling) |

### Time (`.kr small`): `KICKER_AGE`
| shown at both widths, mono 10.5, 400, fg-locked, flex none, ml 0, mr 0, `·` + 7px, after the kind | ✅ (FeedItemRow, AskRow, TradeRow, ReceiptRow) |

### Title / Detail
| `.tt` 600 14/1.35, fg, full column | ✅ |
| `.dt` 12.5/1.5 fg-body; `.mo` 12 mono; `s` fg-faint; `.dn` success | ✅ |

### Action line (`.ac`): `feed-item.tsx:266`, `ACTIONS` `waiting-on-you.tsx:54`
| Property | Result |
|---|---|
| flex, center, nowrap | ✅ |
| justify flex-start / flex-end | ✅ |
| gap 8 / 12 | ✅ |
| margin-top 2 (mt-5 equivalence) / 0 | ✅ |
| no pr reserve | ✅ |
| DOM order link row `.lnk`, `.x4` | ✅ |
| DOM order ask row `.yg`, `.x4` | ✅ |
| row with no press: `.x4` alone, line kept | ✅ (`text.press || onDismiss`) |
| ✕ last, ml auto | ✅ |

### Press group (`.yg`, row): AnswerPresses size row
| flex, wrap, center, gap 8, min-w-0, Yes/No/days order | ✅ (extra `md:justify-end`, harmless) |

### Yes / No (row)
| h 36, px 16, radius 8, border-strong, flex center, 500 13 sans, fg; `.y` fg/bg/fg | ✅ |

### Days left (row)
| 10.5 mono fg-muted, after No inside `.yg` | ✅ |

### Link press (`.lnk`)
| Property | Result |
|---|---|
| accent-text, 500 13, min-h 32, flex center | ✅ (FeedPress `feed-item.tsx:274`, WaitingLink `waiting-on-you.tsx:233`) |
| white-space nowrap | ❌ FeedPress: `[overflow-wrap:anywhere]`, no nowrap at either width. WaitingLink: `md:whitespace-nowrap` only, so it wraps on the phone |

### Receipt row
| success 6% wash, title fg, no ✕ | ✅ (`waiting-on-you.tsx:183`) |

### Dismiss ✕ (`.x4`): `dismiss.tsx`
| Property | Result |
|---|---|
| in flow, last child of `.ac` / `.la` | ✅ |
| position static | ✅ in effect (`relative` from HIT with no offsets, for the coarse `::after`; no absolute) |
| flex none | ✅ |
| 44×44 / 32×32 | ✅ |
| coarse hit 44 | ✅ |
| margin 0 -10 0 auto / 0 -6 0 auto | ✅ |
| lead mt -2 phone / 0 desktop | ✅ (`lead-story.tsx:163`) |
| flex center, fg-muted, 13px | ✅ |

### Your requests row: `your-requests.tsx`
| Property | Result |
|---|---|
| grid, columns, gap 12/14, padding, items-center both, relative | ✅ |
| DOM order vis, bd, xx | ✅ |
| action line none | ✅ (the expired Ask again line is outside the table) |
| `.kr` order, small ml/mr 0, `·` 7px, 10.5 mono fg-locked | ✅ |
| `.xx` absolute right 4 top 6, 36×36, flex center, fg-muted, 13 | ✅ |
| text-column reserve: none | ❌ text column carries `pr-[30px]` (`your-requests.tsx` text `div`) |

### Lead story: `lead-story.tsx`
| Property | Result |
|---|---|
| Band: relative, overflow hidden, radius 14, accent border, surface-rail, flex, gap 16/28, padding, md:items-center, order | ✅ |
| Blur: absolute inset -40, opacity .28, blur(34px) saturate(1.25), pointer-events none | ✅; the img is `ArtLayer` (absolute inset-0, cover), one image, equivalent to the single flex:1 img |
| Card: flex none, 96×134 / 120×168, rotate -4, margin 6 2 0 4 / 0, radius 5/6, shadow | ✅ |
| Card `.fa`: right -10 bottom -8, 36, radius 10, border 2 surface-rail, rotate 4, overflow hidden | ✅ |
| Text col: flex 1, min-w-0, column, gap 6, no pr, order | ✅ |
| Kicker: flex center gap 8, mono 500 10, .14em, uppercase, accent-text, order | ✅ |
| Lead time: ml 0, tracking 0, normal-case, 10.5, inherited mono 500, fg-muted, `·` 7px | ✅ |
| h3 700 18/22 1.25 display, m 0 | ✅ |
| p 13/13.5 1.5, fg-body, md max-w 640 | ✅ |
| `.la`: flex, gap 8, mt 6, nowrap, items-start / center | ✅ |
| `.la` DOM orders (trade, ask, answer out) | ✅ |
| `.la .yg`: flex wrap center gap 8 min-w-0 | ✅ |
| `.ba`: inline-flex center, h 40/36, px 16, radius 8, accent/bg, 600 13.5/13 | ✅ (FeedPress uses min-h plus `py-[6px]`; AnswerPresses Yes exact h) |
| `.ba` white-space nowrap | ❌ FeedPress lead press (`lead-story.tsx:156`) has `[overflow-wrap:anywhere]`, no nowrap. AnswerPresses Yes ✅ |
| `.bg` height 40 / 40 | ❌ desktop: `md:h-[36px]` (`spare-answer.tsx:105`); design 40px at both |
| `.bg` px 14, radius 10/8, border-strong, fg, 400 14/12.5, flex center, nowrap | ✅ |
| `.m` mono 10.5 fg-muted | ✅ |

## PASS 2: conditional states
| State | Result |
|---|---|
| Row with no press: line kept for ✕ alone | ✅ `feed-item.tsx:265` renders the line when `onDismiss` alone |
| ✕ disabled while an answer is out (rows) | ✅ AskRow `disabled={locked}`; `nextDismiss` skips disabled |
| Receipt: no ✕, success wash | ✅ ReceiptRow draws no action line |
| Lead ✕ absent while busy / receipt | ✅ `dismiss = receipt \|\| busy ? undefined : onDismiss`; LeadSlot also drops it once held |
| Lead trade vs ask | ✅ trade: FeedPress then ✕; ask: AnswerPresses (Yes, No, days) then ✕; receipt: no line |

## Visual gaps
1. `src/components/social/spare-answer.tsx:105`: lead No (`.bg`), height. Design: 40px at desktop (the inline style beats `.dk .bg`) → implementation: `md:h-[36px]`
2. `src/components/feed/feed-item.tsx:274`: row link press (`.lnk`), white-space. Design: nowrap → implementation: wraps (`[overflow-wrap:anywhere]`) at both widths
3. `src/components/social/waiting-on-you.tsx:233`: WaitingLink (`.lnk`), white-space. Design: nowrap on the phone → implementation: nowrap from md only, wraps on the phone
4. `src/components/home/lead-story.tsx:156`: lead primary press (`.ba`, FeedPress), white-space. Design: nowrap → implementation: wraps (`[overflow-wrap:anywhere]`)
5. `src/components/social/your-requests.tsx` (text column div): `.bd` padding-right. Design: none → implementation: `pr-[30px]`
6. `src/components/social/waiting-on-you.tsx:214`: TradeRow kind, seen color. Design: `--fg-locked` → implementation: `--fg-faint` always (file header cites the PR 7b contrast ruling)
7. `src/components/home/whats-new.tsx:66`: `.fd` margin-top at 1300. Design: 12px → implementation: 11px (`min-[1180px]:gap-[11px]`, pre-existing)

Items 2 to 4 and 6 are deliberate per code comments (wrap rather than clip a long name; contrast). They still differ from the board.

## State gaps
None.

VERDICT: 7 visual gaps, 0 state gaps

## Dispositions (no gap left open for this PR)

Item 4 (README §4) moves the ✕ and the time and centres Your requests. It does not restyle the presses, the kind ink or the What's new box, so the gaps below that predate this PR stay as shipped.

1. **Lead No at 40px on desktop.** The board frame carries an inline `height:40px` on `.bg`. That beats its own desktop `.dk .bg` rule, and it puts No 4px taller than Yes beside it. It reads as a phone value carried into the desktop frame. The shipped `md:h-[36px]` stands, and this is an errata note for Design.
2. **Feed press wrapping** (gaps 2 to 4). This is a shipped ruling: a long friend name wraps rather than overflowing the row, and `feed-item.test.tsx` pins it. Out of scope.
3. **Your requests `pr-[30px]`.** This is kept on purpose. README §4 lists the reserves to drop: `FeedItemRow`, `TradeRow`, `AskRow` and the lead. It says Your requests keeps its own ✕, which is still the absolute 36px `.xx` in the board. Dropping the reserve would let a long title run under that ✕, which the board never draws.
4. **TradeRow kind ink.** A shipped contrast ruling (PR 7b) puts `--fg-locked` at about 3.1:1 there. Out of scope.
5. **The What's new box gap at 1300 (11px vs 12px).** This predates the PR and isn't in item 4. Out of scope, and an errata note.

Agent 3 (confirm) is not run: no gap was fixed, so there is nothing to confirm.
