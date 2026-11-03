# What's new, nothing new (R1) · account 2 · 2026-11-03

Hugh's ask (2026-11-03): redesign Home's What's new empty state (kinds on, nothing in the window) for phone and desktop,
with restraint in the copy: tease a couple of kinds, don't list them all. The head's link becomes **Choose your notifications**.

Canvas: https://claude.ai/artifact/PqDhfsAtR7UhKRYhkhkFrM (boards Main, States).
Drawn over shipped `src/components/home/whats-new.tsx` (`Quiet`) and `src/lib/copy/feed.ts` (`home.quietLead`, `quietRest`, `choose`).

## Directions
- **A** centered: a fan of two tilted 46x64 picture plates (the feed row's slot, post-glyph plate style) over the lead and one line.
- **B** (recommended): the same fan in the row's picture slot, words beside it. Reads as an empty row; phone box keeps today's height.
- **C** words only: the shipped box with the shorter line.

## Copy (drafts for /copy-review)
- Lead stays: "Nothing new right now."
- Line: "We'll tell you here when {a} or {b}." The first two kinds on, in TEASE_ORDER:
  new-precon, trade-match, secret-lair, spare-request, price-drop, new-set, commander-decklists, combo, wizards-news.
  Phrases: a precon drops / a friend has a spare you want / a Secret Lair drop is announced / a friend asks for your spare /
  a wishlist card gets cheaper / a new set comes out / Commander decklists go up / you can make a new combo / Wizards has news.
  One kind on: that phrase alone.
- `home.choose`: "Choose your notifications" (every state that draws the head link).

## States (board States)
Never chose with defaults on: B, then the shipped stacked offer line. One kind on: back plate falls back to the post glyph.
Every kind off: shipped off line, no fan. With rows: rows unchanged, link renamed.

Generator: scratch-gen/wn.py over the announcements kit (`BMOD=wn python3 build.py local|blob <out>`), needs w6.py from small_items_6.
