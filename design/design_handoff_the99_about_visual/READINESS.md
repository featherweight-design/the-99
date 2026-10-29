# Readiness — About as six visual pages

**Verdict: Green.** R3 approved by Hugh on 2026-10-28. He ruled that the two missing screenshots are engineering's to
take during development. No open item blocks the build, and every open item already has a drawn default.

## For Hugh

1. **Copy.** Every label, rule and page string is still a draft and needs `/copy-review`. All of them are in
   `copy-strings.ts`, written to the voice rules in `docs/superpowers/about-visual/walk-rulings-2026-10-27.md`.
2. **Launch rule.** Stays discretionary, as you ruled in the workshop.

## For engineering

1. **Captures (G1, G2).** Every section needs a capture at 390x844 and one at 1300x900, in all six themes, and each
   capture must hold every one of its section's label regions. When one capture cannot hold them all, take a second
   shot of the same screen; the boards show this on the phone deck top, Analysis Tuning and Home, and on the desktop
   deck top and list, Describe and the precon Versions. Desktop captures also need a tool-card crop for each tool.
   `capture:about` shoots 390 only today. Two regions had no data on the audit account, so the boards flag them:
   phone Analysis "What is in this deck", which needs a stored analysis, and desktop Friends "Rule 0 check", which
   needs a pod. The capture fixtures must create both. The audit account's About was marked seen during the design
   captures (`about_version_seen` 16).
2. **Anchors (G3).** Each label names a region, through `data-about-region` or today's locator in
   `about-locators.mjs`, and the region is measured per capture into `shots.generated.ts`. A label that is visible
   but has no box fails readiness.
3. **Pins (G6).** A pin is a 24px accent disc placed 14px inside its region's top-left corner. Numbers run in reading
   order across a screen's shots. A picture holds five pins at most; past that, the screen gets another shot. When two
   pins sit closer than 28px, the later one slides right along its region's top edge. Two regions that overlap fully
   are one label.
4. **The picture matches the device.** A phone reader sees phone captures and a desktop reader sees desktop captures,
   never the other width. That covers the tool card pictures, the index tiles and the banner crop. Each desktop
   section is three blocks in this order: the labelled screen with its labels beside it, Good to know as a grid of
   three, then Try it.
5. **Seen and launches (G4).** The unit that gets announced becomes the label or the rule (audit option B), each with
   its switch and `since`. Legacy seen ids are translated so nobody is told about something twice.
6. **Tool cards (G5).** "How it works ›" becomes "Show me ›", aimed at a label id. The press on the card is still
   Try it. Before that, the cut entry ids that the showcase hangs on need new targets.
7. **The ?** opens its area's page scrolled to its screen, with a "‹ Back to {screen}" bar held at the top. The ?
   panel and its search retire.
8. **States.** When a feature is off for the reader, its label disappears entirely (pin, line and rule card) and the
   remaining numbers close up; nothing is greyed out. While a capture loads, the frame keeps the capture's known size
   and shows a quiet skeleton with no pins. A screen with no rules gets no Good to know heading.

## Not drawn

Light themes beyond the dark reference. The boards draw one theme, and the captures for the other five follow G2.

---

## Engineering readiness audit (2026-10-27, against origin/main at b3dee1a8a)

**Engineering verdict: Yellow, now Green:** the four items below are ruled (Addendum A1, 2026-10-28). Design's Green stands for what the boards draw, and every code claim in
the README checks out except the two noted below. Four items are not drawn and need a ruling before the
build plan can name them; everything else is engineering's to resolve, listed with its resolution.

### Claims checked

- `capture:about` shoots 390x844 only, six themes: true (`scripts/capture-about.mjs`).
- Boxes measured per capture into `shots.generated.ts` through `scripts/lib/about-locators.mjs`: true.
  `data-about-region` does not exist yet; the build adds it or extends the locators (G3).
- Tool card "How it works ›" opens the Reference: true (`tool-card.tsx`, `copy/discovery.ts`).
- "About The 99" first in the account menu: true. `ABOUT_VERSION` is 16: true.
- Correction: the banner's "New in the app" heading draws only when About items and arrivals show together;
  About items alone draw "N new in About:" (`arrivals-banner.tsx`, `copy/about.ts`). Call 7's two-launch form
  follows the drawn band either way.
- Correction: "the shipped tab strip" for the six-page strip is read as `PlaceStrip` (the Collection and
  Commanders places' strip); `about-tabs.tsx` is only Tools and Reference.

### Counts

`copy-strings.ts` holds 43 labels and 15 rules: Home 4/0, Collection 5/3, Commanders 4/0, Decks 19/6,
Shopping 6/3, Friends 5/3. It places 12 of the 14 shipped tools.

### Not drawn: needs a ruling — RULED (Addendum A1, approved by Hugh 2026-10-28)

1. **Two tools have no section.** Both stay. `precons` is a label and Try it card on Decks › Your decks (the
   shipped Precons button / "Commander precons" box); `mana-balance` is a label and Try it card on Decks ›
   Analysis (the Tuning tile; desktop pin on the second Analysis shot). Board 8, README "Addendum A1".
2. **The ? on screens with no section.** Each lands on a page section, never the index, with one label or rule
   lit (halo, no New tag) under the back bar: `ABOUT_Q_LANDINGS` in `copy-strings.ts` and the README table.
   `account` has no landing: `screenForPath` never returns it, so a ? pressed with the menu open answers for the
   page under it. `card-details` is desktop only (at 390 card details covers the ?).
3. **How it works** retires with the Reference (Hugh's ruling).
4. **The one-time About sheet** retires (Hugh's ruling). Nothing drawn.

### Resolved by engineering

- **Links into the Reference** (`CREDITS_HREF = /about?tab=reference#credits`, the version redirect's
  `/about?tab=reference&next=…`, the banner's `#new`): each retargets to the page that now holds its content,
  through the same scroll-to target the ? uses (credits: the Decks page's credits rule).
- **Switched forms of rules.** Several rules carry a sentence that belongs to a switch unset in production
  (the spare's 14-day lapse under `SPARE_REQUESTS_ENABLED`, the proxy rule's token sentence under
  `DECK_TOKENS_ENABLED`, the friends-see rule's signature-card and friend-deck clauses), and the audit keeps
  switch-off forms with no home in the strings (import's replace-only line, Sync's keys, buying credits under
  `PAYMENTS_ENABLED`). A rule or label gets per-switch sentences inside its drawn card, as today's entries
  split their captions; the words go through `/copy-review`.
- **Audit facts with no string** (decklist `$`/`P` marks, bracket classifiers being partial, which AGENTS.md
  requires on every bracket surface, auto-fill's staples, wishlist counts never shown to friends, the tour
  re-run, upload-choice's doubling and empty-Collection keys): written into the drawn label or rule they
  belong to, through `/copy-review`. No new card is placed.
- "Play styles" and "The curve" labels have no audit source; they describe shipped controls and stay.
- **Showcase targets (G5):** remapped label by label before any entry is removed, in the build's first PR.
- **Seen state (G4):** a translation table from today's bare ids and `<id>@<SWITCH>` variants to label and
  rule keys, so no account is told twice; `/api/about/entries` and the ? panel's search retire with the panel.
- **Probes and inventories** that open entries by hash are re-pointed in the PR that removes the entry.

### Engineering audit of Addendum A1 (2026-10-28, against origin/main)

**Verdict: Green.** Every code claim the addendum makes holds:

- `screenForPath` never returns `account` (`src/lib/about/screen-for-path.ts`): no branch names it.
- `/decks/new`, `/decks/import` and `/decks/precons/**` all return `new-deck`, and `/commanders/choose` returns
  `new-deck` too, so the three new-deck landings split on the path, not on the screen. The build keys
  `ABOUT_Q_LANDINGS` by path for that one screen.
- `CREDITS_HREF` lands on the Decks › Analysis credits rule, as planned in PR 6a.
- Mana Balance is free: the Tuning hub's own pill says `free` (`src/lib/copy/tuning-hub.ts`). The precons label
  matches the shipped box ("with how many of its cards you already own", `src/lib/copy/precons.ts`).

Two consequences for the build, neither a gap:

- Analysis now holds six labels and Your decks four. Analysis therefore needs its second shot at both widths
  (phone: the Tuning shot; desktop: the second Analysis shot), as the boards draw, to stay within five pins
  per picture.
- The two new labels and the landings table go through `/copy-review` with the rest of the strings.

### Engineering audit of Addendum R4 (2026-10-28, against origin/main d30bc70cb)

**Verdict: Yellow, every gap resolved in engineering.** The addendum's code claims hold:

- Pins are pointer-only (`labelled-screen.tsx`: `aria-hidden`, `tabIndex={-1}`); the label line is the keyboard
  control. The dock adds a pointer path only and keeps that split.
- Today's pin sits `PIN_INSET` (14px) inside its region's top-left (`pins.ts`), which is why it covers small targets.
  The gutter rule replaces `placePins`' slide and is fully defined in `build.py` `picture()`; `HALO_REACH = 8` is new.
- The halo is drawn inside the frame's `overflow-hidden` rounded edge, which is what cut Recommended mix's ring.
- The Try it list already opens in place with Show fewer (#2355); the fold stays.

Rulings (orchestrator audit): Board 4's panels, band and kicker apply on desktop too; the band is `--bg`, not the
canvas's `--table`; the kicker takes `--accent-text`; Show fewer takes the more button's style and the peeks draw
only while folded.

Rulings on the nine undrawn cases (orchestrator, 2026-10-29; Hugh can override):

1. A deck card's `+N` (other decks that fit): dropped. Board 5 draws none.
2. The credit chip, a none card's line and `card.note` keep the shipped order: the chip beside the name, the mono
   lines under the description and above the Where line, without the old footer rule.
3. The first section's top keeps today's single rule; the band is drawn only between screens.
4. A one-section page (Friends) omits the "· screen n of total" suffix: its kicker is the page's name alone.
5. Lit stays press-only: no hover or focus lighting.
6. Phone dock: built as the README draws it, above the tab bar, with no scroll. It can cover a tapped region in the
   bottom ~150px of the viewport; accepted. No top dock or other placement.
7. Pins that slide past the capture's foot are clamped to the frame (`placePins`); `pins.test.ts` asserts it, and the
   shipped-pages sweep asserts no shipped capture reaches it at any drawn width.
8. Exactly one more tool: built as drawn, two peek edges.
9. The dock while its section scrolls out of view (or On this page is opened) stays while its region is lit.

Resolved in engineering:

- A deck card's one button reads "Try it on {deck}" (`showcaseCopy.tryOn`, its shipped accessible name, so the visible
  label equals the accessible name); a page card's, its press label. `showcaseCopy.opens` retires.
- A none card's door is its one button in the secondary (`.morebtn`) style, never the solid accent; a none card with
  no door has no button and its mono line says why.
- The dock is capped at `max-h-[40dvh]` (the words scroll inside it); its ✕ (`Close`) returns focus to the label's
  line with `preventScroll`; it sits at `z-[34]`, under every shell layer; one dock per page (`PinDockProvider`);
  no `useDockClearance` (transient, like `edit-toast.tsx`).
- The tool card's line takes a new key, `toolWhere`; `LandingShowMe` keeps `toolShowMe` ("Show me ›").

Copy through `/copy-review`: "{area} · screen {n} of {total}" kept; "Show {n} more tool(s)" tightened to "{n} more
tool(s)" and "Where it is on the screen above ↑" to "Show it above ↑" (the in-app button and link cap); "Close" kept;
the stale `tryItSub` becomes "Each button opens the tool for real". No About entry; the hash re-pins with no version bump.
