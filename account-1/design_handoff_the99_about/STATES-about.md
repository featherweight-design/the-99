# STATES — /about

Every state of the page, the mark, the dismiss and the menu row, at both widths. "Wide" is
≥1000px (`CHASSIS_WIDE_MIN_PX`, the app's one breakpoint); "compact" is below it.

Invariants that hold in every state below:

- **One artifact.** No carousel, no tour, no second copy of any of this content anywhere.
- **`seen === 0` marks nothing.** Nothing is new to someone seeing all of it for the first time.
- **The mark lives only on `/about`.** No badge, dot or count on the avatar, the menu, the rail,
  the tab bar or Home.
- **The route on every entry is a concrete static href.** No dynamic segment is ever printed.
- **Nothing on the page changes after load.** No live region, no motion, no reduced-motion state.
- **Nothing uses `--fg-locked` or `--fg-disabled`.** There is nothing locked on this page.

---

## §1 The page — wide (≥1000px)

| # | State | Draws | Must not |
|---|---|---|---|
| W1 | Reader at version 0 | No eyebrow. `h1`, lede, four chapters, twenty-six entries, one closing hairline. 216px sticky index on the right, chapter 01 current. | Mark anything. Draw the dismiss. Draw a footer, a "that's everything", or a link back to Home. |
| W2 | Reader behind | Accent mono eyebrow `2 new since you were last here` above the `h1`; `N new` on each affected chapter heading; the plate on each affected entry; dismiss at the foot. | Move, sticky or duplicate the dismiss. Reorder chapters to bring new entries up. Collapse unchanged chapters. |
| W3 | Reader current, from the menu | Exactly W1. | Draw a disabled or "already read" stand-in where the button would be. Say the reader is up to date. |
| W4 | Index at rest | Four rows, 32px, mono numeral + title; current row is `--fg` on `--elevated` under a `--border-strong` ring. | Spend accent on selection. Draw a fifth row, a progress bar or a percentage. |
| W5 | Index, chapter with new entries | The chapter's row gains `N new` in accent mono on its trailing edge. | Use the plate skin at index size — the plate is an entry-level object. |
| W6 | A chapter with one entry | The heading, its blurb, its hairline, one row. | Balance it by merging chapters or padding the blurb. |
| W7 | Below 1000px | The index leaves the margin and becomes §2's in-flow list; everything else reflows on the same measure. | Keep a narrow sticky column. Switch at a Tailwind stop instead of 1000. |

## §2 The page — compact (<1000px)

| # | State | Draws | Must not |
|---|---|---|---|
| C1 | Contents list | Four 44px rows under the lede: numeral, title, entry count on the trailing edge. | Stick to the top. Track scroll. Become a chip row or any horizontal scroller. |
| C2 | Contents, chapter with new entries | The count is replaced by the plate carrying `2 NEW`. | Print both the count and the mark. |
| C3 | Entry row | Title 15px/600, route and opens-clause wrapping below it as needed, body 13px. Rows divided by nothing; the chapter hairline is the only rule. | Shrink the title below 15px. Truncate a body. Put the route on its own line by choice rather than by wrap. |
| C4 | Dismiss | Full-width 44px at the foot, mono destination clause centred beneath it. | Float, stick, or sit in a bar over the content. |
| C5 | Tab bar | Nothing — `/about` is not a nav pillar and claims no tab. | Light a tab. Add a fifth. |

## §3 The mark

| # | When | Draws | Must not |
|---|---|---|---|
| M1 | `seen > 0 && entry.since > seen` | The plate, between the title and the route. | Appear on more than one visit. Appear on any other route. |
| M2 | `seen === 0` | Nothing, anywhere on the page, including the eyebrow and the chapter counts. | Mark every `since: 1` entry — that is the whole page. |
| M3 | `entry.since === ABOUT_VERSION` and the reader is current | Nothing. | Keep the mark until it is manually cleared. |
| M4 | Several new entries in one chapter | One plate per entry, one `N new` on the heading, one total in the eyebrow. | Mark the chapter title itself with a plate. |
| M5 | Accessible name | `Shelves, /decks, new in this version` — the plate's `sr-only` span. | Rely on the accent fill to convey newness. |

## §4 The dismiss

| # | State | Draws | Must not |
|---|---|---|---|
| D1 | `seen < ABOUT_VERSION`, arrived by redirect with a valid `next` | `Got it` + `takes you to /decks/kinnan-ramp` | Print the raw `next` parameter. Print a path that failed validation. |
| D2 | `seen < ABOUT_VERSION`, `next` absent or invalid | `Got it` + `takes you home` | Say "invalid", "unsafe" or anything about a parameter. Refuse to render. |
| D3 | `seen === ABOUT_VERSION` | Nothing. | Render disabled. Render a "read" receipt. |
| D4 | Pressed | Writes `user_prefs.about_version_seen = ABOUT_VERSION`, navigates to the validated destination. | Navigate before the write resolves. Show a toast on the destination. |
| D5 | Action fails | The button returns to rest and stays pressable; the reader is not navigated. | Navigate anyway. Claim the version was acknowledged. |
| D6 | Reader scrolls away without pressing | Nothing happens, and the redirect does not repeat — the cookie already cleared the gate. | Prompt, confirm on exit, or re-redirect. |

## §5 The account menu row

| # | State | Draws | Must not |
|---|---|---|---|
| A1 | Popover, at rest | `About The 99` · `Manage account` · `Sign out`, in that order, accent diamond on the first two. | Reorder the shipped two. Sit between them. Take an icon or a third diamond colour. |
| A2 | Sheet, at rest | Same three, About in the no-rule slot; Manage account now carries a top rule. | Keep the old rule positions and leave About looking divided from nothing. |
| A3 | Either panel, reader behind | Exactly A1 / A2. | Badge, dot, count or accent title. The redirect is the notification. |
| A4 | Keyboard | ↓ / ↑ move across **three** items with wrap; exactly one is tabbable. | Leave `% 2` or the two-element ref tuple in place. |
| A5 | Pressed | The panel closes, then navigates. | Stay open behind the new page. |
| A6 | `busy` (sign-out in flight) | `aria-disabled` on the anchor, and the press is prevented. | Use the `disabled` attribute — it does not exist on an anchor. |
| A7 | Already on `/about` | The row is unchanged and still navigates. | Mark it current, disable it, or hide it. |

## §6 The gate, as the surface sees it

| # | Situation | The page | Must not |
|---|---|---|---|
| G1 | Redirected from a deep link | W2 / C-equivalent, dismiss present, `next` on the URL | Show a banner as well. Auto-write `seen` on render. |
| G2 | Reached from the menu while current | W3 | Carry a `next`, or offer a way back other than the browser and the rail. |
| G3 | Reached from the menu while behind | W2, `next` absent, dismiss present, clause reads `takes you home` | Refuse to render the dismiss because no redirect occurred — the reader is still behind. |
| G4 | Second device, already dismissed | W3 — `user_prefs` is the account-level answer | Re-prompt because this browser has no cookie. |
| G5 | Signed out | Never reached; `auth.protect()` has already sent them to the Account Portal | Render a public variant. |

## §7 Accessibility

- One `h1`, four `h2` chapter titles, entry titles as `h3` **inside** the link, so the whole page is
  navigable by heading and the link's name is the title.
- Each entry link's accessible name is title + route + mark, in that order. **The route is spoken,
  not decorative** — it is the fact the entry exists to deliver.
- The opens-clause is `--fg-faint`, so its content is always repeated in the body. It is never the
  only carrier.
- The index is a `nav` labelled *Contents*, with `aria-current="true"` on the tracked chapter.
- The dismiss is a submit button in a form posting the server action, with the validated `next` in a
  hidden field. Its accessible name is `Got it` plus the destination clause.
- No live region anywhere: nothing on this page changes after load, and the one mutation navigates.
