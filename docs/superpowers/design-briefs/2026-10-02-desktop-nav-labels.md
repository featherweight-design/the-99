# Desktop navigation: say what each icon is

Design brief, 2026-10-02. A change to an existing surface (the desktop rail); no new destination.

## The finding

Hugh, walking the app on 2026-10-02 (intake item H3): on desktop the rail is **icons only**, so
the only way to learn what an icon opens is to press it. The phone's tab bar carries a label under
every icon, so the two widths have drifted apart on the one piece of chrome every page shares.

Today the rail is 62px wide (`nav.tsx`, `NavRail`), with five 38px icon slots (Home, Collection,
Commanders, Discover, Decks), the crowned 99 at its head and the account control at its foot. Each
slot's name lives only in `aria-label` and `title`. A screen reader hears it, but a sighted reader
waits for the browser's native tooltip, which takes about a second to appear and is styled by the
OS, not by us.

## Why it is icons only (the record)

Adjudication #1 originally made the rail Diamond plus label, with no icons. The 2026-09-07
refresh retired that on client instruction, adding 19px stroke icons. At 62px there was no room
for labels, so they moved into `aria-label` and `title` (`nav.tsx`, the comment above `ITEMS`; source:
`design/design_handoff_the99_refresh/CHROME-rail-and-tabs.md`). That comment also records the
constraint this brief has to answer: **"If the ruling is ever reinstated, the rail widens to hold
labels and the icons come out. A 62px rail with labels is not a third option."** This brief
reopens that question with the icons kept.

## The ask

Make every rail destination nameable at a glance on desktop. Hugh named two shapes, and either is
open:

1. **An expanded rail with labels**: wider, icon plus label per slot, at all times or behind a
   toggle that the app remembers.
2. **Labels on hover (and on keyboard focus)**: the rail stays 62px, and a drawn label appears
   beside the slot. This replaces the browser's `title` tooltip, which must not show as well.

Design picks one, or proposes a third that meets the same bar, and says why.

## Open for Design

1. **Which shape.** If expanded: the rail's width, whether it collapses (and where the toggle sits),
   and what happens to each page's content width. Every desktop layout today is measured against a
   62px rail (the commanders, decks and deck-page handoffs all subtract it in their column
   arithmetic). If on hover: the delay, where the label sits relative to the slot, and how it
   behaves when the pointer moves down the rail from one slot to the next (one label following,
   or each opening on its own delay).
2. **Keyboard and touch.** A label that only a mouse can reveal leaves keyboard readers where they
   are today. Focus must reveal the same label. Touch-capable desktops (a tablet at `md` and up)
   have no hover: say what they see.
3. **The states the rail already has**, which every option must keep:
   - **Active:** the current destination's slot takes a surface fill (`bg-elevated`, the `active`
     branch in `NavRail`), never a colored label.
   - **Pending:** the navigation-pending pip (`pending-pip.tsx`, the nav-pending handoff), a 4px
     diamond under a pressed destination that is still loading. Its horizontal centering is a
     separate open bug (H5, the diamonds sit right of their icons), so draw it centered.
   - **First-run locked:** before a collection exists, the four lockable slots draw as padlocks in a
     sunken 48px group, each opening a note naming the slot (`nav.tsx`, `RailLock`).
     A label for a locked slot must not read as an invitation the note then refuses.
4. **Parity with the phone.** The tab bar's labels are the vocabulary. The rail uses the same five
   words (`ITEMS` in `nav.tsx`), and nothing new.

Out of scope: the phone tab bar (unchanged), the account menu's contents, the order of the
destinations, and any new destination.

## Where it lives

- `src/components/shell/nav.tsx`: `ITEMS`, `NavSlot` (the `title` and `aria-label`), `NavRail`, the locked group (`RailLock`).
- `src/components/shell/nav-icons.tsx`: the five 19px glyphs.
- `src/components/shell/pending-pip.tsx`: the pending mark.
- `src/components/shell/shell.tsx`: where the rail sits beside `<main>`.
- `design/design_handoff_the99_refresh/CHROME-rail-and-tabs.md`: the current rail and tab bar.
- Intake: H3 (this brief) and H5 (the diamond centering bug, fixed separately).
