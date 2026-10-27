# About, the visual redo: inputs for Design prompt 21

These three documents are the input to Design prompt 21, which redraws About as six visual one-pagers built from real screenshots, in place of today's 83 text entries. They were written on 2026-10-27 and copied here unchanged, except that references to files outside the repository were rewritten and three mentions of the author's local tooling (a home-directory skill path and two private notes) were removed from the audit.

- [`workshop-2026-10-27.md`](workshop-2026-10-27.md): Hugh's workshop rulings for the redo. It covers the six areas, screenshot-based pictures, "good to know" rules, launches on the banner, the "?" panel and the launch rule.
- [`audit-2026-10-27.md`](audit-2026-10-27.md): the necessity and consolidation audit of all 83 entries. It gives each entry a keep, merge or cut verdict, the hidden-rule facts each area must carry, and the process changes that follow.
- [`walk-rulings-2026-10-27.md`](walk-rulings-2026-10-27.md): the voice rules from Hugh's walk of the entries, plus the entries ruled before the walk paused for the audit.

## Known errata in the audit

The audit is copied as written. Two counts in it are off, and the conclusions it draws from them do not change:

- §"Folded lines lose their announcement" says seven of the 43 switched entries are off in production. Two of those seven, `COMMANDERS_PLACE_ENABLED` and `SPARE_REQUESTS_ENABLED`, switch a caption line or a variant, not a whole entry. The true count is five: friend decks, push, near combos, strategy focus and upcoming precons.
- "All 23 places (17 screens and 7 deck views)" adds up to 24. The test counts `ABOUT_SCREENS.length - 1 + DECK_VIEWS.length`, because the deck screen is replaced by its views, so 23 is right: 16 non-deck screens plus 7 views.
- Option B (an entry as a container of lines) says that keeping each merged line's id and `since` as its former entry's "keeps every current reader exactly as seen as today". For an unswitched line that holds. For a switched line it does not on its own. Such a line is seen by the new key `<entry>#<line>`, while `about_seen_ids` holds the old bare entry id, or `<id>@<SWITCH>` for a variant, so the line would be announced again. Keeping seen state also needs the new keys to accept the legacy ones, or a one-time translation of them.
