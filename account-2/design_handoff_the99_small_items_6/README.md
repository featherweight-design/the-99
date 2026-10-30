# The 99 · Small items 6 (account 2, 2026-10-30)

Canvas: https://claude.ai/artifact/KwwT9g3hUxan4HQxqQTUtD
Status: R1b drawn (Hugh's feedback 2026-10-30), awaiting Hugh's review.

Six small undrawn states and errata on shipped surfaces, each drawn over the shipped surface at 390 and 1300, with what shipped beside it. Brief: Hugh's "Small items 6" design prompt, 2026-10-30.

| Board | Item | Call |
|---|---|---|
| `Main.dc.html` | The calls | |
| `Backup.dc.html` | 1 · Overview Game plan, the Backup line | One Backup card under Close (hollow diamond, lead card image), above the precon's Alternate commander, only when `plans.backups[0]` exists. R1b: each stage label masks the timeline line (`bg-[var(--surface-raised)] pr-[8px] relative z-[1]`), also an erratum to shipped `synopsis-stages.tsx` |
| `Notes-Confirm.dc.html` | 2 · Tuning, Additional notes | Confirm: label + ⓘ stay; #2414 merged with `labelRow` (a2), on main. The label-less box is v2's request box, by design |
| `About-Errata.dc.html` | 3 · Suggested changes v2 About errata | Pick card as one 250 column of real rows (Ghalta, ask for two); credits rows "Came back short or empty" / "Short by your price cap"; v2 Try it line behind the switch |
| `Critical.dc.html` | 4 · Overview weaknesses, Critical | Critical chip (ink #E07A65, danger edge 60%), Critical lines first |
| `Tag-States.dc.html` | 5 · Tag box undrawn states | (a) red frame focus = 2px red edge; (b) dashed header goes solid accent on focus; (c) describing in place accent on focus only; (d) ⓘ 8px after label, 6px label row to frame; (e) locked intake keeps the foot, key disabled; (f) key focus-visible = app ring, disabled = --border / --fg-locked |
| `Offer-Stacked.dc.html` | 6b · What's new offer line, stacked (R1b) | Words, then Pick ▾ on its own line; ✕ top right where the opened offer puts it; under rows, under the quiet line, alone; feed rows keep their shipped action line |
| `Every-Kind-Off.dc.html` | 6 · What's new, every kind off | The ✕ sticks; after it (and for a reader who turned everything off) head gets "Choose what shows ›", box reads "Nothing will show here. Every kind of news is off." (draft); offer only while `neverChose` |

The `.dc.html` files here are the canvas copies (images as `/_blob/` urls); `art/` holds the source images. Generators: `scratch-gen/si6.py` (boards 1–5 and Main, over `design/design_handoff_the99_overview_stages/scratch-gen/scg` plus `design_handoff_the99_small_items_5/scratch-gen/tg.py`) and `scratch-gen/w6.py` (board 6, over the announcements kit at `account-2/design_handoff_the99_announcements/scratch-gen`, `BMOD=w6 python3 build.py`).

Sources read: main @dd95b5c; PRs #2414, #2419, #2423, #2432, #2438; `src/components/cards/tagged-box.tsx`, `src/components/decks/{tuning-notes-field,tuning-panel,deck-description-field,spine-desktop,synopsis-stages}.tsx`, `src/components/intake/intake-form.tsx`, `src/components/about/pages/{rule-card,rule-diagrams,try-it}.tsx`, `src/lib/copy/{about-pages,discovery,feed}.ts`, `src/lib/feed/{home,prefs}.ts`, `src/components/home/whats-new.tsx`, `src/lib/synopsis/{stages,stages-view,prompt}.ts`.

New strings (drafts for copy review): Backup label; pick card text "Ask for two and you get three to add and three to cut; pick two of each."; credits rows "Came back short or empty", "Short by your price cap"; "Nothing will show here. Every kind of news is off."
