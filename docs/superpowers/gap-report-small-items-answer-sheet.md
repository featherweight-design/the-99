# Gap report — Small items 3 (answer sheet)

Table: `docs/superpowers/design-tables/small-items-answer-sheet.md`. Implementation read: `src/components/home/answer-sheet.tsx`, `src/components/decks/receipt-modal.tsx` (`ModalChrome` / `ModalPanel`, default header path: no `eyebrow`, no `back`, no `overCard`, no `titleClassName`), `src/components/social/your-requests.tsx`, `src/components/feed/feed-item.tsx`, `src/components/home/whats-new.tsx`, `src/lib/copy/social.ts`, `src/lib/copy/feed.ts`, `src/components/feed/kicker-age.ts`, `src/app/friends/spare-actions.ts` (`openAnswerAction`).

## PASS 1 — properties

### AnswerSheet (ModalChrome) — Container
| Property | Result |
|---|---|
| Component | ✅ MATCH — `ModalChrome width={560} fit` |
| Position | ✅ MATCH — scrim `fixed inset-0 flex items-end justify-center md:items-center`; dialog `w-full` on phone, centred from md (board `top:210px` is scaffolding) |
| Width | ✅ MATCH — `w-full` / `md:w-[560px]` |
| Height | ✅ MATCH — `fit`: `max-h-[calc(100%-52px)]`, hugs content; `md:h-auto md:max-h-[85dvh]` |
| Background | ✅ MATCH — `ground` default `var(--surface-raised)` (not behind a card) |
| Border | ✅ MATCH — `border-t` phone, `md:border`, `--border-strong` |
| Radius | ✅ MATCH — `rounded-t-[18px]` (fit) / `md:rounded-[14px]` |
| Shadow | ❌ MISMATCH — design: `0 -14px 40px rgba(0,0,0,.6)` phone / `0 24px 60px rgba(0,0,0,.6)` desktop / implementation: `var(--modal-shadow)` = `0 40px 100px rgba(0,0,0,.7)` at both widths (ModalChrome default) |
| Layout | ✅ MATCH — `flex flex-col overflow-hidden` |
| z-index | ✅ MATCH — dialog inside the `z-50` scrim, above it |

### Scrim
| Property | Result |
|---|---|
| Position | ✅ MATCH — `fixed inset-0 z-50` over tab bar / rail |
| Background | ✅ MATCH — `color-mix(in oklab, var(--bg) 72%, transparent)` |

### Header
| Property | Result |
|---|---|
| Layout | ❌ MISMATCH — design: gap 10px at both widths / implementation: `gap-[9px] md:gap-[10px]` (phone 9px) |
| Min-height | ❌ MISMATCH (desktop) — design: 43px / implementation: phone `h-[43px]` ✅; desktop `md:h-auto md:py-[14px]` with the close at `md:-my-[14px]` → about 48px (28 + 16px × leading-tight line) |
| Padding | ❌ MISMATCH — design: `0 4px 0 16px` both widths / implementation: `px-[16px]` phone, `md:px-[18px] md:py-[14px]`; close `-mr-[10px]` gives an effective right inset of 6px phone, 8px desktop; desktop left 18px |
| Border | ✅ MATCH — `border-b` `--border` |
| DOM order | ✅ MATCH — title, then close |

### Title
| Property | Result |
|---|---|
| String | ✅ MATCH — `m.sheet.title` "Your request" |
| Font | ❌ MISMATCH — design: 600 15px / 16px IBM Plex Sans / implementation: `font-display font-bold` (the theme's display face: Cinzel, Chakra Petch, Trirong…, weight 700); sizes 15 / `md:16` ✅. The sheet passes no `titleClassName`, and `ModalPanel` prepends `font-display font-bold` unconditionally |
| Color | ✅ MATCH — `var(--fg)` |
| Flex | ✅ MATCH (equivalent) — close carries `ml-auto`, so the title sits left and the close right |

### Close ✕
| Property | Result |
|---|---|
| Box | ✅ MATCH — 44 × 44 flex centred |
| Glyph size | ❌ MISMATCH — design: 15px `✕` / implementation: `text-[14px]` `×` (mono) |
| Color | ❌ MISMATCH — design: `var(--fg-muted)` / implementation: `var(--fg-faint)` |
| Behaviour | ✅ MATCH — `onClose` → `setOpen(null)`; the row has no ✕, so it is the only one on screen |

### Body
| Property | Result |
|---|---|
| Padding | ✅ MATCH — row margins `mt-14 mx-16 mb-16` / `md:mt-16 md:mx-18 md:mb-18` stand in for body padding |
| Content | ✅ MATCH — one row, this request |

### Your requests row — Row container
| Property | Result |
|---|---|
| Display | ✅ MATCH — `grid-cols-[46px_minmax(0,1fr)]` |
| Gap | ✅ MATCH — row 0 (default), `gap-x-[12px]` / `md:gap-x-[14px]` |
| Padding | ✅ MATCH — `pt-12 px-14 pb-6` / `md:px-16` |
| Background | ✅ MATCH — `--surface-inset` |
| Border | ✅ MATCH — 1px `--border` |
| Radius | ✅ MATCH — 14px |
| DOM order | ✅ MATCH — picture, text, Clear |
| ✕ on row | ✅ MATCH — absent |
| Ask instead | ✅ MATCH — absent |

### Picture
| Property | Result |
|---|---|
| Grid placement | ✅ MATCH — `row-span-2` in column 1 |
| Align | ✅ MATCH — `self-center` |
| Box | ✅ MATCH — `relative h-[64px] w-[46px]` |
| Card image | ✅ MATCH — 46 × 64, radius 3, cover, `0 2px 6px rgba(0,0,0,.45)` |
| Owner face | ✅ MATCH — `-right-[6px] -bottom-[5px]`, 24 × 24, radius 7, overflow hidden, 1.5px `--surface-inset`, img cover |
| Face is | ✅ MATCH — `request.holder` (the friend who answered) |

### Text column
| Property | Result |
|---|---|
| Layout | ✅ MATCH — `flex min-w-0 flex-col gap-[3px]` |
| Right reserve | ✅ MATCH — no `className` passed (no `pr-[30px]`) |
| DOM order | ✅ MATCH — kicker, title, detail |

### Kicker line
| Property | Result |
|---|---|
| Layout | ✅ MATCH — `flex items-center gap-[7px]` |
| Unread diamond | ✅ MATCH — `openAnswerAction` returns `{ ...request, unseen: false }`, so `RequestText` draws none |
| Kind label | ✅ MATCH — `m.kind.yes` / `m.kind.no` |
| Kind font | ✅ MATCH — mono 9.5px 500 `.12em` uppercase |
| Kind color, accepted | ✅ MATCH — `--success` |
| Kind color, declined | ✅ MATCH — `--fg-faint` |
| Time | ✅ MATCH — `feedAge(text.at, now)` after the kind |
| Time font | ✅ MATCH — `KICKER_AGE` mono 10.5px, 400 |
| Time color | ✅ MATCH (accepted deviation a) — `--fg-faint` against the board's `--fg-locked` |
| Separator | ✅ MATCH — `before:content-['·'] before:mr-[7px]` |
| Time alignment | ✅ MATCH — inline, `flex-none`, no `ml-auto` |

### Title / Detail
| Property | Result |
|---|---|
| Title font / color / string | ✅ MATCH — 14px 600 / 1.35 `--fg`; `m.canSpare` / `m.keeping` |
| Detail font / color | ✅ MATCH — 12.5px / 1.5 `--fg-body` |
| Accepted | ✅ MATCH — `m.acceptedDetail` (with `acceptedDetailNoBuy` when the item's `answerDetail.canBuy` is false or the ask was standalone, the shipped rule) |
| Declined | ✅ MATCH — `m.othersHave(first, more)` |
| Declined, no other spare | ✅ MATCH (accepted deviation c) — `m.nobodyElse` |

### Clear
| Property | Result |
|---|---|
| Grid placement | ✅ MATCH — `col-start-2`, auto-placed in row 2 |
| Justify | ✅ MATCH — `justify-self-start` |
| Display | ✅ MATCH — `flex items-center` |
| Height | ✅ MATCH — `min-h-[44px]` / `md:min-h-[32px]` |
| Margin | ✅ MATCH — `-ml-[2px]`, `md:mt-[4px]` |
| Padding | ✅ MATCH — `px-[2px]` |
| Font | ✅ MATCH — sans 13px 500 |
| Color | ✅ MATCH — `--fg-muted` |
| Border / background | ✅ MATCH — `border-0 bg-transparent` |
| String | ✅ MATCH — `m.sheet.clear` "Clear" |
| Accessible name | ✅ MATCH — `m.clearAria(friend, card)` |

### Sheet foot
| Property | Result |
|---|---|
| Pinned | ✅ MATCH — ModalChrome `foot` (`flex-none` under the scrolling body) |
| Border | ✅ MATCH — top 1px `--border` |
| Layout | ✅ MATCH — `flex items-center`, `md:justify-end` |
| Min-height | ✅ MATCH — 52 / `md:46` |
| Padding | ✅ MATCH — `px-16 pb-8` / `md:px-18 md:pb-0` |
| Link position | ✅ MATCH — left / right |
| Destination | ✅ MATCH — `/friends#your-requests` (the section's `h2` id) |
| Link display / font / color | ✅ MATCH — `flex min-h-[44px] items-center`, 13.5px 500 sans, `--accent-text` |
| Glyph | ✅ MATCH — `m.sheet.all` "All your requests ›" |

### Home feed item
| Property | Result |
|---|---|
| Kind label | ✅ MATCH — `c.answerKicker` "Your request" |
| Press label | ✅ MATCH — `c.press.answer` "Your request" + ` ›` from `FeedItemRow` |
| Press font | ❌ MISMATCH (minor) — design: nowrap / implementation: `[overflow-wrap:anywhere]`, no `whitespace-nowrap` on the press (the action line is `flex-nowrap`, but the label itself can wrap). 13px 500 sans, `min-h-[32px]` ✅ |
| Press color | ✅ MATCH — `--accent-text` |
| Press behaviour | ✅ MATCH — `FeedPress` answer branch calls `answers.open`; falls back to `/friends` off the provider or on a refused open |
| Press position | ❌ MISMATCH (minor) — design: phone margin-top 6px / implementation: `mt-[5px]` on the action line (desktop col 3 ✅). The action line is item 4's shipped geometry (#2296), which the table defers the ✕ to; flag for that table rather than this PR |
| Item's own ✕ | ✅ MATCH — `DismissButton` → `useFeedDismiss` hides only |
| ✕ placement | ✅ MATCH — end of the action line (§4) |
| Detail line (accepted) | ✅ MATCH — `answerText` → `m.acceptedDetail` |

## PASS 2 — state coverage

| State | Verdict | Reason |
|---|---|---|
| Item, unseen | REACHABLE | `FeedItemRow` draws the diamond while `item.unseen`; head's `c.newCount(count)`; press is the answer button |
| Sheet open, accepted | REACHABLE | `openAnswerAction` → `markAnswerSeen`; `onSeen` adds the key to `opened`, `withoutOpened` clears the diamond and drops the count; row draws `--success` Accepted, `acceptedDetail`, Clear, foot |
| Sheet open, declined | REACHABLE | `requestText` `no` branch; no Ask instead in the sheet |
| Seen | REACHABLE | per key in `opened` (one by one); server write persists it past the visit |
| Close | REACHABLE | ✕ / scrim / Escape → `setOpen(null)`; item stays; request untouched |
| Clear success | REACHABLE | `closeSpareAction` ok → `onCleared` → `dismissed.dismiss(key, row's [data-feed-dismiss])`, so the item leaves and focus moves as the shipped ✕ |
| Clear failure | REACHABLE | `toast.fail()`; sheet stays open (toast node is inside the mounted sheet) |
| Foot link | REACHABLE | `Link` to `/friends#your-requests` |
| Item ✕ | REACHABLE | shipped dismiss; `/friends` rows keep their ✕ |
| Answered row | REACHABLE | sheet row renders no Ask instead for any state |

## Gaps

1. Sheet shadow is ModalChrome's `--modal-shadow`, not the board's two width-specific shadows.
2. Header gap 9px on phone (board 10px).
3. Header desktop: about 48px tall with `18px` side padding and `14px` vertical padding (board 43px, `0 4px 0 16px`); effective right inset 6 / 8px against 4px.
4. Title is `font-display font-bold` (theme display face, 700), not 600 IBM Plex Sans; `ModalPanel` hard-codes it ahead of `titleClassName`.
5. Close glyph `×` 14px `--fg-faint` against `✕` 15px `--fg-muted`.
6. (Minor, item 4 surface) Home press label can wrap (no nowrap), and the phone action line sits 5px under the detail against 6px.

Gaps 1–5 are ModalChrome's shared default header and shadow; fixing them in place changes every sheet, so they need either a sheet-level override (a `titleClassName` that ModalPanel lets replace the face, a `shadow` prop) or a ruling that the board's `.yr-*` stand-ins defer to ModalChrome's defaults, as (d) does for scrim and Escape.

## Accepted deviations

- (a) Sheet kicker time `--fg-faint` (the /friends Your requests contrast ruling) against the board's `--fg-locked`.
- (b) The Home item's diamond is dropped once the sheet opens (opening marks it seen), though the board's sheet-open frames still draw it behind the sheet.
- (c) Declined with no other spare draws the shipped `nobodyElse` line.
- (d) Scrim and Escape follow ModalChrome's defaults.

## Verdict

🟡 Yellow — every state is reachable and the row, foot and Home press match; five header and shadow properties in the sheet follow ModalChrome's defaults, not the board. Rule on them (override or defer to ModalChrome) before the PR opens.

## Dispositions

- **Gaps 1 to 5** (shadow, header padding and gap, title face, the close glyph) are ModalChrome's shared defaults, which every sheet in the app draws. The board's `.yr-*` header is a stand-in for ModalChrome. The sheet follows ModalChrome, the same ruling as deviation (d) for the scrim and Escape. Nothing in this PR overrides one sheet's chrome, and these go to Design as errata.
- **Gap 6** (the Home item's press wrapping, and 5px under the detail on a phone) belongs to item 4's table (#2296). Out of scope here.
- **Walk finding, fixed**: closing the sheet cleared every diamond on Home. `openAnswerAction` revalidated `/friends` inside the action, which redraws the page it was pressed on, and Home's visit had already moved its cursor. The revalidation now runs in `after()`, and `spare-actions.test.ts` pins it.

Agent 3 (confirm) is not run: the one fix was outside the property table, and it is pinned by a test.
