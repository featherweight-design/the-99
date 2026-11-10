# The 99 · Drop alerts (account 2, 2026-11-10)

A light addendum on the Announcements handoff: an **Upcoming drops** row and the words for a drop's sale-time push.
Source of truth: `docs/superpowers/design-briefs/2026-11-10-drop-alerts.md` (#2783). Closed by the brief: no per-drop
"remind me", no model call, no link to Wizards' own "Get notified"; item 4 closed by Hugh (the drop push goes through the
overnight hold). Engineering built the push (#2785, #2786), off behind `SALE_PUSH_LIVE`.
Canvas: https://claude.ai/artifact/BUSXYAB7VBWsBfznYrU8X4
Status: **R1, awaiting Hugh's review.**

## Start here

| Board | For |
|---|---|
| `Main.dc.html` | The five calls, call 1's three shapes (A recommended, B, C), gaps for engineering. |
| `Home.dc.html` | A on the shipped Home, 390 and 1300. |
| `States.dc.html` | Day only, day and time (with and without pre-queue, no hero), tomorrow, pre-queue open, sale live, sale passed, time changed, zone unknown, another day in your zone; 390 and 1300 each. |
| `Archive.dc.html` | `/announcements`: the post's own row carries the sale lines; 390 and 1300. |
| `Push.dc.html` | Android and iPhone; the words table; lead time; what never sends. |
| `Settings.dc.html` | The Secret Lair line and the push foot; 390 and 1300. |
| `Themes.dc.html` | The group in all six themes. |
| `STATES-drop-alerts.md` | The state matrix. |

Dashed copper outlines mark what is new against the shipped page; the app draws nothing there. Frames B and C are for comparison.
Fixture: today Tue Nov 10, 2026; the reader is in New York (ET). Drops are invented: *Secret Lair x Avatar: The Last Airbender*
(Mon Nov 16, 9 a.m. PT, pre-queue 8 a.m. PT), *Secret Lair: Shark Week* (Mon Nov 23, day only), *Secret Lair: Ultimate Edition*
(Thu Nov 12, 9 a.m. PT, no pre-queue, no hero).

## Calls (recommended, awaiting Hugh)

1. **The row.** A: a group, **Upcoming drops**, at the top of Home's What's new box (the shipped `fday` label, as Today and
   Earlier), soonest sale first. One row per announced drop whose sale has not started; it leaves an hour after `on_sale_at`
   (a day-only drop at the end of its sale day in the store's zone). The row is the shipped `FeedItemRow` of the same post,
   moved out of its place below (never drawn twice): hero, `Secret Lair` kicker with the age slot saying how far off, title,
   and the sale lines in place of the summary; the post's own seen state, diamond, ✕ and press (Read on Wizards). Outside the
   five-row count; the rest keeps Today/Earlier labels (always labelled while the group shows). After the sale the post goes
   back to a plain Secret Lair row by age, while the window holds it. **Archive:** no group; the row in its month carries the
   same lines while the sale is ahead, then its summary again. **Lead story:** a post that leads Home is not repeated in the group.
2. **Words.** Sale line (`--fg`): "On sale Mon Nov 16, 12 p.m. your time". Pre-queue line (body ink), its own line, read from
   `pre_queue_at`: "Pre-queue opens at 11 a.m." / "Pre-queue opened at 11 a.m.". Mono line: "9 a.m. PT on the US store".
   Day only: "On sale Mon Nov 23, time to be announced" + "US store". Zone unknown or equal to the store's: "On sale Mon Nov 16,
   9 a.m. PT" + "Pre-queue opens at 8 a.m. PT" + "US store". Your day differs from the store's: "On sale Tue Nov 17, 2 a.m. your
   time" + "Mon 9 a.m. PT on the US store". Kicker age slot: `in N days`, `tomorrow`, `today`, `pre-queue open`
   (`--accent-text`), `on sale now` (`--success`, line "On sale since 12 p.m. your time"). No countdown, whole clock times.
3. **The push.** One per drop (as built). Title leads with the hour: "Pre-queue opens at 11 a.m." / "On sale at 12 p.m.". Body:
   "{title}. On sale at 12 p.m. on the US store." / "{title}, on the US store." Device zone, unlabelled; unknown (none, or the
   default `UTC`): store zone, labelled. A time on another day than the push takes its weekday ("opens Tue at 12 a.m.").
   **`SALE_PUSH_LEAD_MS` = 15 minutes**: the words name a time ahead and the cron is 15 minutes, so it always lands before the
   hour. At 0 a drop with no pre-queue never sends (`salePushDue` needs now < `on_sale_at` = the send instant). No second push at
   the sale. Nothing sends with no hour. Image and tap as the announcement push (hero; the post's out route).
4. **Overnight hold.** Closed (Hugh): through the hold. Nothing drawn.
5. **Settings.** Rides the `secret-lair` ticks, no new toggle: In app = the Upcoming drops row, Push = both pushes.
   `feedCopy.news.kinds["secret-lair"].line` → "When Wizards announces a Secret Lair drop, and again before it goes on sale."
   `pushSettingsCopy.foot` → ": only to devices you turn on, never 9pm to 9am except a Secret Lair drop going on sale."
   About push key → "Nothing comes between 9pm and 9am, except a Secret Lair drop going on sale; the rest waits for the morning."

All copy is DRAFT for `/copy-review`.

## Gaps for engineering

- The row is server-drawn; the reader's zone is the browser's. Recommend a zone cookie set on first visit so first paint is
  not state 7.
- Push words per device zone (`push_subscriptions.time_zone`); `saleClock` today formats in the post's zone with a label and the
  weekday. `pushCopy.one.sale` takes (queue, sale) clocks for the title and (title, queue, sale) for the body.
- No "time changed" mark: no previous value is stored, and the brief asks for none.

## Generator

`scratch-gen/`: `kit.py` (pieces over `announcements/Home-Rows`), `b_*.py` (one per board), `b3.py`, `lib10.py`, `lib11.py`
from small items 11. Build: `DESIGN=<repo>/design python3 mk.py b_main:Main b_home:Home ...` (writes `out/`), render with
`node render.js $PWD/out <names>`, `python3 canvas.py out <canvas root>` swaps `art/` for the canvas's `/_blob/` urls (`blobs.json`).
