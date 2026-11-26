# Readiness Review — Deck details refresh

**Verdict:** 🟢 Green (Design-side note; a cold audit may replace it)
**Reviewed:** 2026-11-26
**Related ticket(s):** none (Hugh's ask; audit doc approved, canvas approved 2026-11-26 after R1c)
**Plan PR target:** TBD

## Summary
Deck details moves onto the Home / Games section pattern: the HomeSectionHead ◆ head in the band of a SectionPanel box,
keys at the box foot, and "why" text and cross-links in a footer band. Each area is drawn at desktop and phone. Notes,
Suggested changes and Proposed cuts keep their layouts, and Games is as approved in the Games tabs handoff. Parts that do
not change are drawn as shipped, so What is in this deck and How it plays keep their tiles. No new tokens.

## Notes for the plan
- 🟡 **Strategy moves to Tuning.** The deck's strategy block leaves Analysis and becomes the first box on the Tuning
  landing, shown for every deck (its read is free). Suggested changes shows the picked focus as one FOCUS line with Change ›.
- 🟡 **Phone tool picker.** It replaces the "‹ Tuning" back row on every phone tool screen. It opens a Tuning sheet with
  All tools and the five tools, each with its status line. An inert tool (Proposed cuts at 100 or below) uses the inert
  tile treatment and the `notOffered` reason without "This one is at N".
- 🟡 **History** drops its 420px inner scroll for month boxes, with Show 20 more in the last box's footer.
- 🟡 **Recommended mix:** Why these numbers? opens inside the box as one tile per role (icon, target, "you have N",
  shipped rationale copy). A role over its target says "N over" in its cell foot, in the shipped colors (no amber, which means short).
- ✅ **No migration, no new data.** Every figure drawn is already on the page.
- ✅ **Phone Consider shelves** show 2 tiles, with Show all in the box footer.
- 🟡 **Copy.** New strings ("N over", the picker's "All tools" line, "Tuning" sheet title) are DRAFT for `/copy-review`.

## R4 — heading sweep beyond Deck details (approved 2026-11-26)
Boards `R4-*.dc.html` show the shipped screen (Before) above the change (After). Both are the real components rendered
with shipped CSS. `scratch-gen/r4/proposal.diff` is the source change against main (22 files): it is a reference for the
build, not code to apply blindly.
- 🟡 **Precons** (list, From a precon pick view, open precon): Announced and each release year become `DeckBox` +
  `DeckBoxBand`; the precon Overview label becomes a band with View full overview in `DeckBoxFoot`.
- 🟡 **Decks › All cart:** the deck-select label becomes a ◆ Decks band. New copy `selections.title` "Decks" and
  "N of M selected" is DRAFT for `/copy-review`. The checkout total box is unchanged.
- 🟡 **Export:** tabs use `SegmentedSwitch`, Shopping rows use `DecklistRow readOnly`, the i callout becomes one plain line,
  the footer's repeated "Moxfield · Archidekt ready" goes, and the close is a bare ✕.
- 🟡 **Social bands and Settings:** `BAND` (section-panel) and `SECTION_HEAD` (friends-list, used by every Settings section
  and Open links) move to the display face with the ◆ (`BandText` splits "Title · N"). Kept back follows.
- 🟡 **Home at zero decks:** No decks yet uses `HomeSectionHead`. Ready to build is not touched: it left Home with What's new.
- 🟡 **Analysis before a read:** the Overview label becomes a box band around the ring.
- 🟡 **Help me choose results:** ◆ heads and no divider hairline. After a read, when the rest divider comes first, More
  commanders is not drawn, so two heads never stack (a test asserting both heads would change).
- ✅ No new data, tokens or migrations.
