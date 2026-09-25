# READINESS audit — About R6: the sheet, the index, the jump, the contents and search

**Audited:** 2026-09-25, against brief `docs/superpowers/design-briefs/2026-09-25-about-rethink.md`
(merged as #957: §3 rulings 1–6, §4.0 readings, §5 calls, §6 locks). Handoff files:
- `STATES-about-r6.md` (§N–§R9);
- `READINESS-r6.md`;
- `The 99 - About Page (R6).dc.html`;
- the README's R6 pointer.

Code references were read on `origin/main` at the branch point of `design/about-r6`.

## Verdict: 🟢 Green (Hugh answered Q1 and Q2 on 2026-09-25; §4)

Every ruling holds. None of the six rulings is broken, and every §5 call is made. Nothing needs a
design round trip. Two things wait on Hugh (§4, Q1–Q2). The eng findings (E1–E9) are wording the plan must
pin down, not design changes. Two of them (E8, E9) settle gaps in R6 itself, and each has only
one defensible answer. R6's own open item (rail length) is a measurement engineering owes.
Hugh answered both on 2026-09-25, so it is Green.

## §1 The six rulings

| Ruling | Where R6 answers it | Holds? |
|---|---|---|
| 1. No redirect; one-time sheet with Show me and Later | §N1–N9. READINESS "Retires" drops `dismissAbout`, `next` and `safeNext` on the page | ✅ No redirect is drawn or kept anywhere |
| 2. What's-new index at the top; entries stay in chapters | §O1–O4. O1 forbids captions, figures and keys (S1), and O2 forbids moving the entry (H3) | ✅ |
| 3. Seen once opened (or Show me) | O4 builds the index from the pre-visit `seen`, then writes. N6: Show me goes to `/about` | ✅ with E2 (when the write happens) |
| 4. Contents list every entry, plus search that filters the list only | §Q and §R. R2 forbids hiding, dimming, collapsing or reordering "any part of the page". §R says "Ruling 4 held without help" | ✅ **Search never touches page chapters**, so nothing goes back to Hugh on this |
| 5. Feature pills later | None drawn | ✅ |
| 6. Ships before the analysis bump | R9.2 plans for the batched entries | ✅ with E3 (version number) |

## §2 The §4.0 readings

| Reading | R6 | Holds? |
|---|---|---|
| Show me opens `/about` on the index, built from the pre-visit `seen` | N6, O4 | ✅ |
| Later records nothing, and the sheet doesn't return in this browser | N7 (Later and Escape), N8 | ✅ |
| Never on `/about`, signed out, or exempt routes | N9 cites `gate.ts:81-91` | ✅ |
| A brand-new account gets a one-line introduction | N3: `What The 99 does` plus one line; no count, no titles | ✅ |
| Got it retires | READINESS "Retires", and §R7 retires STATES §4 and G1–G3 | ✅ |

## §3 The §5 calls and the §6 locks

- **§5.1, container:** a non-modal 340px card beside the avatar (N4), and full width above the tab bar
  on a phone (N5). It correctly does not reuse the modal `Sheet` (`ui/sheet.tsx`). ✅
- **§5.2, how many titles:** all titles up to four; at five or more, three titles and then "and N more",
  never "and 1 more" (N2). ✅
- **§5.3, the jump mark:** an `--elevated` fill on the title line, held while the entry is in the band
  the rail already watches (`contents-rail.tsx:66`, `rootMargin: "0px 0px -70% 0px"`). It is
  client-only and never persisted (P4, P5). M1 holds. ✅
- **§5.4, expanded contents:**
  - on desktop, every chapter is open in a list that scrolls inside the rail (Q1);
  - on a phone, chapters are disclosures that start collapsed (Q4, Q7). That collapses the *list*,
    not the page, and stays inside ruling 4. ✅
- **§5.5, search:** a `SearchField` (`ui/text-field.tsx:75`) at the top of the contents. The empty state
  says the page is unchanged (R3). ✅
- **§5.6, the eyebrow and the "N new" markers:** the eyebrow retires into the index heading, reusing
  `newSinceEyebrow` (`about.ts:61`). The chapter rows' "N new" is kept. ✅
- **§6 lock, nothing on the menu, rail, tab bar or Home (H1):** N4 places the card on the page beside
  the avatar, "not on the rail, the avatar or the menu". Its 9px diamond in a 28px tinted tile is a
  **new mark** in the family of the menu's 6×6 item diamond (A1, `STATES-about.md:65`;
  `account-menu.tsx:31`), which leads both About The 99 and Manage account. The new mark sits on the
  card, not on the menu, so H1 holds. ✅
- **§6 lock, no redirect:** ✅, as for ruling 1.

**One addition beyond the brief.** §P0 moves the NEW pill before the title and gives a new entry a 2px
`--accent` top rule. That is a new way to emphasize new entries, which Hugh asked for, but it spends
more `--accent`, and the first round asked for the NEW plate's accent to be ratified (`READINESS.md:33`). It is **Q1 for Hugh**.

## §4 Questions for Hugh — answered 2026-09-25

- **Q1: approved.** The accent emphasis stands exactly as drawn: the pill before the title and a 2px
  `--accent` top rule, on new entries only.
- **Q2: no new About entry.** The existing entry that covers the About page is edited, at the next
  version.

The questions as asked:

1. **Accept §P0's new-entry emphasis?** It moves the NEW pill before the title and adds a 2px accent
   rule across the top of each new entry. It is not a design problem, but it adds accent on the page,
   and the original About round asked for accent use to be ratified.
2. **Does this change owe an About entry?** R6's READINESS item 3 and the brief's §8 leave it to you.
   The recommendation is an edit to an existing entry, not a new one: it changes how the page is
   reached, not what the app can do.

## §5 Engineering findings (for the plan, not Design)

- **E1, the legacy cookie.** N8 says "the cookie means 'sheet shown for N'" (READINESS-r6's "State"
  names no cookie). The
  brief's §7 requires a **new cookie name, or an explicit version marker**, never the old `about_v`.
  Browsers redirected but never acknowledged hold `about_v = <userId>.9` (`gate.ts:13`), and reading
  that as "shown" would suppress the sheet for readers who are still behind. **The plan names the new
  cookie. R6's "the cookie" is read as that one.**
- **E2, when `seen` is written.** O4 says the page builds the index and "then calls `markAboutSeen`".
  Per brief §7 (round-1 fix), that call happens on an **actual open**: a client effect or an action
  after mount, **never at render**. `/about` is a `<Link>` in the account menu, so a render-time write
  could record a prefetch.
- **E3, a version number.** R9.2 and READINESS item 2 say "On version 9 the sheet lists both".
  `ABOUT_VERSION` is 9 today (`src/lib/copy/about.ts:34`), and the analysis bump makes it **10**. Read
  as version 10.
- **E4, rail length (R6's own open item).** Measure the scrolling rail at 1300×820 with 39 entries. If
  less than about 60% of it is visible, R9.1's fallback applies: the rail opens only the current
  chapter. That collapses the list, not the page, and is still inside ruling 4. It is the plan's first
  measurement.
- **E5, the probes.** **12** `scripts/probe-*.mjs` write `about_version_seen` forward: card-mark,
  bracket-chip, brackets-sheet, card-captions, declaration-ask, swap-shopping, synopsis-ui,
  upgrade-path, verdict-block, verdict-findings, verdict-lean and version-comparison. The brief's
  report said 11. Every one must also clear the sheet, and the new cookie, before measuring. A card drawn over a measured page corrupts the reading.
- **E6, copy.** R6 adds strings to `src/lib/copy/about.ts` (§R8) and retires four. They go through
  `/copy-review`, and the `about.test.ts` content hash is re-pinned deliberately. The claim "the
  redirect is the notification" is made in three places, and all three become "the sheet is the
  notification":
  - the `aboutMenuCopy` comment (`about.ts:743-744`, as §R7 notes);
  - `account-menu.tsx:24-26`;
  - `STATES-about.md:67` (A3).
- **E8, the sheet between 768px and 999px.** R6 keys "wide" to the About page's 1000px breakpoint
  (STATES-r6 line 9), so from 768px to 999px it would apply N5's phone card. That card sits 12px from
  the left edge, over the 62px nav rail (`nav.tsx:148`, `md:flex`), and 84px above a tab bar that isn't
  drawn (`--tabbar-h` is an unconditional 74px, `globals.css:495`). The sheet sits over any route, so
  **it follows the shell's breakpoint, not the About page's.** At `md` (768px) and up it uses N4's
  placement (rail + 20px, bottom 20px). Below that it uses N5. This is the only placement that respects
  the chrome that is actually drawn, so it needs no design round.
- **E9, a superseded invariant R7 doesn't list.** `STATES-about.md:13` says "Nothing on the page changes
  after load. No live region, no motion, no reduced-motion state". R6's search (live filtering and a
  polite count), the jump wash (P1, P4) and the sheet's animation (N11) all break it. Ruling 4 (a
  search that filters as the reader types) makes that unavoidable, so the invariant is **superseded by
  R6**, and the plan treats it as retired. This is recorded here because §R7 omits it.
- **E7, the animation.** N11 names `anim-sheet-in`, which exists (`src/app/globals.css:699`) with its
  reduced-motion guard (`:747`). ✅ No new token.

## §6 Intake notes

- The export went to the main checkout. The orchestrator backed it up and restored main. This branch
  takes the three new files. It also takes Design's README change, a 16-line R6 pointer prepended above
  the R4 text, deliberate and additive.
- **`READINESS-r5-audit.md` is kept.** The export deleted it, which is how the export tool behaves, not
  Design's intent. `git diff --stat` on this branch shows no deletions.
