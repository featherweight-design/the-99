# The 99 · Clear all of What's new (account 2, 2026-11-21)

Canvas: https://claude.ai/artifact/4UwLDRoJ3zAc1UHxjmKmiP
Status: **R1 APPROVED by Hugh 2026-11-20** ("This LGTM").

Hugh's ask: a way to clear all notifications at once. Today each What's new item on Home (the lead story and every
row) has its own ✕ (`feed/dismiss.tsx`), so a reader with nine items presses nine times. Drawn at 390 and 1300 over the
shipped Home (`home/whats-new.tsx`, `feed/show-all.tsx` `ShowAllFooter`, `social/social-toast.tsx`'s centre toast) with the
announcements kit and the approved What's new empty state (B). New pieces carry a dashed copper outline. Strings marked
DRAFT go through `/copy-review`.

To view a board, open `Main.dc.html` or `States.dc.html` with `support.js` and `art/` beside them. `scratch-gen/cl.py` is
the generator, over the announcements kit (`account-2/design_handoff_the99_announcements/scratch-gen`) plus `w6.py`
(small_items_6) and `wn.py` (whats_new_empty): `BMOD=cl python3 build.py local`.

| Board | What |
|---|---|
| `Main.dc.html` | C1 nine items, C2 after Clear all, C3 Show all pressed (390); C4, C5 (1300); the calls |
| `States.dc.html` | S1 two items, S2 one item, S3 announcements off, S4 Upcoming drops, S5 write failed, S6 after Undo |

## The design

- **Where.** `Clear all` is a text press in What's new's foot (`ShowAllFooter`), between the archive entry
  (*Past announcements ›*, left) and *Show all N* (right). Same 44px (phone) / 36px (desktop) press as Show all, in
  `--fg-muted` ink so Show all stays the foot's main press. After Show all is pressed, Show all leaves and Clear all stays.
  With the announcements switch off (no archive entry), the foot draws for Clear all alone, on the right.
- **When.** Whenever What's new holds **two or more** items, the lead included. With one item, its ✕ is the same press,
  so no Clear all (one control per action).
- **What it clears.** Every item What's new counts: the lead story, the rows shown, the rows under Show all and Upcoming
  drops. The same dismissals the ✕s would write (`feed_dismissals`), so nothing cleared comes back to Home. Posts stay in
  *Past announcements*; a friend's ask stays on Friends › Waiting on you (its `ask:` key is not written, as the Home ✕
  never answers or hides the ask there).
- **The press.** Optimistic, as the ✕: the lead slot, rows, head count and Home slot badge go at once; the box shows the
  approved quiet state (fan B); focus moves to the box's head (as after the last ✕). No confirm step.
- **Undo.** The shipped centre toast (`SocialToast`, role status) with its action press: *Cleared {n} from What's new.*
  · *Undo*. Undo puts every item back as it was (unread stays unread) and focus returns to Clear all. The toast holds while
  hovered or focused, as shipped.
- **Failure.** Every item comes back, count and badge with them; the shared toast (role alert) says *We couldn't clear
  those. Try again.* No Undo.

## Copy (DRAFT, `/copy-review`)

- Press: *Clear all*; accessible name *Clear all of What's new*.
- Toast: *Cleared {n} from What's new.* with *Undo*.
- Failure toast: *We couldn't clear those. Try again.*

## For the build

- One server action dismisses every key in one statement (all of them, not just the five shown), revalidating `/` and
  `/friends` as `dismissFeedItemAction` does. Undo needs its inverse: delete the reader's own `feed_dismissals` rows for
  those keys.
- Out of scope: Waiting on you on `/friends` keeps its own ✕s; push notifications are untouched.
