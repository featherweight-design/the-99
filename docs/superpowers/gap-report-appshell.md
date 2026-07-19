# Gap Report — #5 App Shell (feat/5-appshell)

Pre-PR design-review gate result. Agent 2 (dual-pass: visual properties + state
reachability, full table) → 17 visual + 4 state findings. Adjudicated against the
merged plan (PR #12) — the property table governs styling for in-scope elements;
the plan governs scope (what ships in #5 vs #6/#7/#8). Agent 3 confirm pass:
**0 gaps remain.**

## Fixed in this branch (commit 58e530c)

1. **Rail nav "Play" group label** — missing → added (mono 10px, 0.18em tracking,
   uppercase, `--fg-faint`, padding 6px 12px 8px) in `src/components/shell/nav.tsx`.
2. **Rail account trigger cursor** — missing `cursor-pointer` → added.
3. **Paste textarea caret color** — plan-drift token `--fg-mono-cursor` (#6E6353,
   not in table or globals.css) → table value `var(--fg-locked)` (#6A6152) in
   `src/components/collection/upload-entry.tsx`.
4. **Paste import button label** — static "Import list" → dynamic
   `Import {n} cards` via live client-side `parsePasteList` count, plus the
   `{lines} lines · {n} cards recognized` label per §Paste-List View.
5. **Paste import button hover** — inline `style` background blocked Tailwind
   `hover:` → moved to `bg-brass text-bg hover:bg-brass-hover` classes.
6. **Hero commander gradient base** — missing `var(--bg)` base layer under the
   repeating-linear-gradient → appended in `src/components/home/hero-commander.tsx`
   (both card + skeleton).

Also fixed earlier in the branch under the same bug class (inline style blocking
Tailwind variants): rail account trigger hover border (Task 6), dashboard
Update-collection button hover (Task 10), deck-row hover background (Task 10).

## Adjudicated deferrals (plan-scoped, not gaps in #5)

| Table item | Disposition |
|---|---|
| Branded account popover / mobile bottom-sheet | Plan: "#5 owns placement + skin only" — Clerk default popover ships; branded surface is follow-up (issue filed). |
| Hero right action area, type line, art caption | §Hero full spec lands with commanders surface — #7/#8. |
| Recommended commanders grid | #7 (interim label + "All commanders →" link only in #5). |
| "Commanders buildable" stat + stats-line commander count | Not computable in the header without running recs synchronously — would defeat the Suspense streaming boundary. Table content rows are mock examples; follow-up issue filed. |
| Collection empty-state CTA layout | Plan ships `UploadEntry` inline as the empty state (interim, replaced by #6's 3-step flow). |
| Commanders page always-empty interim | #7. |
| Deck status text | Table has styling rows but no content row — copy undefined; ships with decks surface #8. |

## State reachability

All four Agent 2 state findings resolved to the same plan-scope adjudications
above (hero action states, rec grid states) — no unreachable state in the code
that #5 ships.

**Verdict: 0 gaps remain — ready to ship.**
