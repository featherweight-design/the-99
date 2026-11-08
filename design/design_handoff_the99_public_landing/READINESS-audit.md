# READINESS audit: Public landing page (R4)

Audited 2026-11-08 against `docs/superpowers/design-briefs/2026-11-07-public-landing.md`, the plan
`docs/superpowers/plans/2026-11-08-public-landing-demo.md`, and the repo at `origin/main` (8c647c75f) with this handoff
rebased on it. Design's own self-check is `READINESS.md` in this folder. The boards were read as extracted text, not
rendered.

## Verdict: YELLOW

PR 4 (the page) and PR 7 (Bring your collection and the first run) can start once the copy corrections below are applied;
none needs a redraw. PR 5 (the demo) waits on one missing frame (Top off) and a plan rewrite for option B. Nothing here
needs the handoff re-issued.

## What was checked

- **Settled 1-7.**
  - 1, invite-only now plus the open-sign-up state: drawn at the 390 hero, 390 close and 1300 hero (`Hero-States`). The
    1300 close is not drawn; it is the same component.
  - 2, public pages on at ship: the Written-for-real links go to `/commander/<slug>`.
  - 3, the button reads Tell me at launch, later Sign up free; Sign in is secondary.
  - 4, credit counts on the page, prices one link away: counts are there. The "What credits cost" sheet and modal carry
    `$5` and `$5 a month` (finding 1).
  - 5, demo on a fictional player with every tool scripted: every tool is shown except Top off (finding 2).
  - 6, collection first, per source, with a first-timer path: `Collection` and `First-Run`.
  - 7, no About entry: README and READINESS agree, and say the first-run changes touch the collection About captures
    (re-take with `pnpm capture:about` when PR 7 lands).
- **States 1-10 and Open calls 1-8:** all answered. Upload failed, partial match, sending and "numbers unavailable" are
  drawn at 390 only; each is one component at both widths, so they are not escalated.
- **Code facts, confirmed:** `.anim-gentle-in`, `.anim-reveal`, the `--motion-*` tokens and `CountUp` exist;
  `token-refusal-toast`, `credits-toast` and `social-toast` carry no ✕ and `deleted-group-toast` does; `kind="receipt"`
  exists in `edit-toast.tsx`; "I own these cards" starts unticked (`import-entry.tsx:105`), so the first-run tick is a real
  change; the first-run strings match `refresh.ts:249-262`; `landing-stats.ts` and `precon-overview.ts` exist and the
  strip's five figures map onto the stat keys; the footer passages match `fan-content-notice.ts` verbatim.
- **Numbers.** The boards show the brief's 2026-11-06 snapshot (3,469 commanders, 3,379 with prose, 206 precons, 114,223
  combos, 35,986 cards). They are placeholders; the build reads the loader.
- **Tokens.** Every hex colour on five boards was compared with `globals.css` and the tokens handoff. All ship except
  `#E07A66` (finding 8) and four decorative colours in neither `src/` nor the tokens handoff (`#C9B98A`, `#9C9384`,
  `#F5EEDF`, `#B9C7D6`).
- **Fiction.** No real person, username or email appears; the only addresses are `sam@example.com` and
  `name@example.com`. `art/` is reference only and is not referenced from `public/`.

## Findings

1. **CORRECTION: dollar figures sit on the page.** The "What credits cost" sheet (390) and modal (1300) show `$5` and
   `$5 a month`. Settled 4 says credit counts on the page and prices one link away. Fix: Hugh rules whether the sheet
   counts as the link. If not, drop the sheet and link out; that goes back to Design only on a no.
2. **GAP, goes back to Design: Top off is not drawn.** Step 7 names it in prose only (`Demo-390.txt:229`). It needs one
   frame at 390 and one at desktop. Mana Balance is drawn but shows "Red sources 37 of 37, nothing to fix", a result with
   nothing to show; a frame with a real fix is optional.
3. **GAP: the demo contradicts itself.** Step 4 shows 99/99 with 97 owned, step 7 says "This deck is 3 over", and step 3
   says "38 of the 99 are in Sam's binder" for the same deck. The tools need different deck states (100, over 100,
   under 100) and the boards show one deck. Fix without a redraw: change the step 7 caption to a second deck, with a
   Design nod.
4. **CORRECTION: "drawn from shipped components".** The `Main` board says so, and README says `scratch-gen/app.py`
   generates the screens. Under B the build reuses the real components, so the boards are the target, not the source.
   PR 5 says so.
5. **GAP: the splits are understated.** README lists "about nine". The demo also draws Help me choose
   (`intake/choose-results.tsx`, 306 lines), Top off (`top-off-list.tsx`, 1,769 lines), Mana Balance
   (`mana-balance-panel.tsx`, 183 lines) and card details with marks; Which deck lives inside `card-modal.tsx` (3,482
   lines, `fits-view.tsx` 634). That is twelve or more. The plan's PR table needs rewriting before PR 5, with the PR
   boundaries named up front.
   - **PR 6 is not "not needed".** Under B something must still export the stored outputs on `br-damp-darkness-a6o4o64t`
     into a committed file with the name-scan test, and that branch is kept until then.
   - **Regeneration.** PR 3's outputs sit on the earlier fixture; a final fixture means a second paid run under the $5
     ledger cap.
6. **CORRECTION: the Moxfield note.** Moxfield answers 403 behind Cloudflare (`docs/superpowers/spike-moxfield-fetch.md`);
   "they're working on a way, and The 99 will connect as soon as it's ready" is an unsupported claim about a third party
   and a promise. Import a deck has no link mode (`import-entry.test.tsx:3-4`), so "under the box where a pasted link
   would fail" is a new detection state that is not drawn. Fix: cut the second sentence (copy table). Design says whether
   the note is permanent or appears when a URL is detected; that is a call, not a redraw.
7. **UNVERIFIED: per-app claims.** "TCGplayer, Dragon Shield, Delver and others: any CSV with a Name and a Quantity
   column" is not proven: the parser names ManaBox, Moxfield, Archidekt and Deckbox (`parse.ts:3`), and PR 1b's fixtures
   have not landed (their layouts are unconfirmed against a real export). Every export-guide path is drafted from
   memory (README "Owed"). Fix: gate PR 7's guides on 1b and a live check; until then "Another app" reads "any CSV with
   a Name and a Quantity column" with no brand names.
8. **NOTE: error colour.** The launch error uses `#E07A66`; `join-flow.tsx:50` uses `var(--danger)`. Use the shipped one.
   The four decorative colours above need a token ruling, not a silent add.
9. **GAP: the precon link has no destination.** "Open the precon's list ›" goes to `/decks/precons/[fileName]`, which is
   signed-in only (`proxy.ts:40`). Fix: no link on the precon card, or send it to sign-in. Public precon pages are out
   of scope.
10. **GAP: switch-gated promises.** The page promises 15 welcome credits (`WELCOME_CREDITS_ENABLED`, `welcome.ts:7`),
    Precons I own (`PRECONS_ENABLED`), friends' spares and Mana Pool prices, and links 404 while `PUBLIC_PAGES_ENABLED`
    is off. README names only `PUBLIC_LANDING_ENABLED`. Fix: PR 4 reads each claim's switch through `resolveFlags(null)`,
    and Hugh confirms which switches are on in production at launch.
11. **CORRECTION: copy overclaims.** "Every commander page opens with why it's worth building" (3,379 of 3,469 have
    prose); "Every precon has an Overview" (182 of 206; 182 of 186 plain); "No credits, no limits" (the core is free, not
    limitless); "+1 free credit every day" (the shipped rule is one free credit that returns 24 hours after use, it does
    not accrue: `about-entries.ts:1806`, `allowance-rule.ts`); "enough to run every writing tool three times"
    (Suggested changes costs 2 above 10 swaps).
12. **NOTE: the footer repeats a data credit.** "Card data and images from Scryfall; prices from Mana Pool" appears in
    the Design line and inside locked passage two. Shorten the Design line to EDHREC and Commander Spellbook.
13. **NOTE: vocabulary.** "Binder" runs through the page and demo ("Sam's binder"); `availability.ts:14`,
    `card-assignments.ts:29` and `proxies.ts:10` say "never boxes, binders or sleeves", while the flyer (`join.ts:69`)
    already says "your binder". `/copy-review` rules; keep it out of the demo's app screens. "Box" also appears on the
    page.
14. **NOTE: "free, always" is said three times** in the loop lead-in (a "Free" chip, "Free, always", "No credits, no
    limits").
15. **NOTE: the fixture.** The player is Wren Calloway there and Sam on the boards, so one is renamed. The boards need
    Jace, Multiverse Architect; Y'shtola, Night's Blessed; Tam, the Possibility; Ashling, the Limitless; Giada, Font of
    Hope; and a Swords to Plowshares whose best deck is Giada's. None is in `scripts/lib/fictional-fixture` today; si10
    pins them or the boards accept the picks the generator makes (the layout holds any three). The fixture holds about
    3,000 rows and five decks named "Lanternlight Tinkers" and the like, not commander names, so the plan's name-scan
    test cannot assume commander-named decks.

## Copy (every proposed string; `/copy-review` rules, project voice Kitchen Table)

No em dashes, `unlock`, fake urgency or British spellings in any board string. Verdicts other than KEEP:

| String | Surface | Verdict |
|---|---|---|
| "reads... shows... builds..." hero line | Hero | TIGHTEN (tricolon): "The 99 shows every commander your cards can build, then builds the deck from them. You buy only what's missing." |
| "All four are free, always. No credits, no limits." | Loop | TIGHTEN: "All four are free." |
| Moxfield note, second sentence | First run | TIGHTEN: "Moxfield deck links don't import. Export the list and paste it or upload the file." |
| "How to export" on four rows | Collection | TIGHTEN: say it once on the section |
| "Another app: TCGplayer, Dragon Shield, Delver..." | Collection | HOLD (finding 7) |
| "Start with the cards you already own" plus "Start here" | First run | TIGHTEN: drop "Start here" |
| "+1 free credit every day / for as long as you're a member" | Free and credits | DEFECT: "1 free credit a day", and say it returns 24 hours after use |
| "enough to run every writing tool three times" | Free and credits | TIGHTEN: add "(Suggested changes, up to 10 swaps)" or drop |
| "Every commander page opens with..." / "Every precon has an Overview" | Written for real | DEFECT: "Most commander pages open with... Almost every precon has an Overview." |
| "What credits cost" `$5` / `$5 a month` | Sheet, modal | HOLD (finding 1) |
| "Card data and images from Scryfall; prices from Mana Pool" | Footer Design line | TIGHTEN (finding 12) |

All other strings KEEP: the Fan Content passages (verbatim), the first-run lines checked against `refresh.ts`, the five
tooltips, the demo captions, and the numbers labels. "Binder" and "box" go to `/copy-review` (finding 13).

## Gaps by PR

**PR 4, the page.** Not drawn or not stated: the page with Try it absent (the boards show it present); what a
switched-off claim looks like (finding 10); `observeAnonymousHit` on the signed-out branch. The launch action's order
(per-visitor cap, then `overAnonymousCeiling`) matches the plan. It likely exceeds 20 files or 800 lines and the handoff
names no boundary: propose hero and launch, then free-and-credits and tooltips. Motion: the Motion board says sections
"fade and rise" through `.anim-reveal`'s stagger, but `.anim-reveal` is opacity-only and uses `--reveal-n`; use
`.anim-gentle-in` with a computed delay.

**PR 5, the demo.** Needs the plan rewritten for B (finding 5) and the Top off frame (finding 2). The tools lack the exact
data shapes the stored outputs must fit. "Press any card" and mark presses need card details: `card-modal.tsx` is a
per-player component, so say whether those presses are inert or split. The collection tabs History and Wishlist are drawn
but read per-player data.

**PR 6.** Becomes an output-export step plus the About captures (finding 5).

**PR 7.** Guides gated on 1b and a live check (finding 7); the first-timer count line needs the scan index in production;
the "I own these cards" default needs the caller to pass it; the Moxfield note needs its trigger specified; the no-column
error covers one column and the both-missing case is not drawn.

## Questions for Hugh

1. Does the "What credits cost" sheet satisfy "prices one link away", or does it become a real link?
2. Which switches are on in production at launch (welcome credits, precons, friends)?
3. May the demo carry a second deck for Look deeper (finding 3), or do the boards change?
