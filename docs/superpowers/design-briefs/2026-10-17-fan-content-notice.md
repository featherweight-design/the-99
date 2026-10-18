# Brief: The Fan Content notice, and the /privacy and /terms layout

2026-10-17. Launch epic A0 (`docs/superpowers/plans/2026-10-17-launch-epic.md`), rulings L1 and L4 by Hugh,
2026-10-17. Every item under "Locked" is his and is not reopened by Design.

**What this brief asks.** Where and how a small, muted notice sits at the foot of every page of the app, signed in or
out, in all six themes at 390 and 1300; and the layout of two plain prose pages, `/privacy` and `/terms`, that carry the
same notice. It proposes one Design round and one board.

## The problem

Wizards of the Coast's Fan Content Policy asks a fan site to say, with its Fan Content, that it is unofficial, not
approved by Wizards, and uses Wizards' property. A search of `src/` finds no such line today. The peers The 99 sits beside
(DeckCheck, EDHREC, Scryfall) all carry it in a footer on every page, often repeated in their terms. The 99 will carry
the same, nothing left out by omission (L1), and as quietly as a footer can be: it is a legal line, not a feature.

## What exists today, and stays

- **No page has a footer.** The root layout (`src/app/layout.tsx`) is `ClerkProvider` > `Shell` > `children`, in a
  `<body>` that is already `flex min-h-full flex-col`. `Shell` (`src/components/shell/shell.tsx`) returns `children`
  bare for a signed-out reader, and for a signed-in one draws the rail from `md` (`--rail-w`: 62px, 88px on a touch
  device) and the phone header and fixed tab bar below it (`--tabbar-h`: 74px, 88px while the collection is locked).
- **The surfaces that must carry it.** Signed in: every route inside the shell. Signed out and outside it: the landing
  (`/`), `/join/[token]`, `/sign-up`, the signed-out friend card (`/friend/[token]`), `/offline`, and the two new pages.
  `/offline` is served by the service worker with no layout of its own to lean on beyond the root's.
- **Six themes** (`src/lib/theme/themes.ts` names them; each one's tokens are a block in `src/app/globals.css`): Low Sun,
  Neon Rain, Canopy, Oil Haze, Witching Hour, First Frost. Muted text is `--fg-muted` and `--fg-faint`. `--fg-faint` is
  known to fall under 4.5:1 (two themes, Neon Rain and Oil Haze, lift the placeholder for that reason), so it is not a
  candidate; the notice needs a token measured to read in all six, `--fg-muted` being the obvious one.
- **Voice and vocabulary** are the app's; this is the one place the words are not ours (below).

## Locked (do not reopen)

1. **The text is fixed** (L4), two short passages, "The 99" named in the first:
   > The 99 is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions
   > of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
   >
   > Card images and mana symbols are copyright Wizards of the Coast, LLC. Card data and images from Scryfall; prices
   > from Mana Pool. Not affiliated with Wizards of the Coast, Scryfall or Mana Pool.

   Design sets it and may break it across lines; Design does not reword it. Any change to the words goes through
   Hugh and `/copy-review`.
2. **On every page, signed in or out**, and on /about and the Terms (the About placement is a later PR, A2, on the
   existing About layout; the Terms carry it in /terms below).
3. **Subtle:** small, muted, Scryfall-style footer text. It is not a banner, a bar that stays on screen, a modal or a
   toast, and nothing about it asks to be dismissed.
4. **It reads as text.** Real text a screen reader reaches, never an image; the contrast floor is the app's AA bar.
5. **No Wizards contact, no per-crop artist credit** (L1, L3): the card-art wash and blur are treated as covered and
   are not redrawn here.
6. **Mana and guild symbols stay out of the notice and the marks** (the FCP's own rule; A2 audits the logo, favicon and
   icons separately).

## Engineering notes

- **One component, mounted once** in the root layout (A1), after `<Shell>` and inside the body's flex column, so it is
  the last thing in the document and sits over nothing. The document scrolls (the rail is `sticky`, `<main>` is not a
  scroll container). The shell's own column is already a full viewport tall plus the phone's tab-bar reserve, so a
  footer mounted at the root always lands BELOW the fold: a short page does not show it until the reader scrolls.
  Putting it at the foot of the viewport on a short page would mean mounting it inside the shell's column and again in
  each bare branch. Design should say which it wants (Open 1); the root mount is the simpler and is the default.
- **It must never sit under the phone tab bar** or collide with a bottom sheet, the card search sheet or the About sheet,
  which already reserve `--tabbar-h` (and `--about-sheet-h`, while that sheet exists). The footer clears them by its own bottom padding; it is
  never `position: fixed`.
- **Every layout branch renders it** (A1 adds a test for that): the shell, the bare signed-out branch, the offline
  page. Design's board should show each branch so the test has a picture to match.
- **Contrast is a test, not a promise.** The component will take one token and a unit test will measure it against
  `--bg` in each theme, as `placeholder-contrast.test.ts` does for the placeholder. Name the token; do not give a hex.

## Open for Design to call

1. **Placement on each shell.** The end of the document (the root mount: below the fold on a short page), or the foot of
   the viewport on a short page (a second mount inside the shell). On desktop, beside the rail (62px or 88px): full width
   under the page, or aligned to the content column.
2. **Type:** size, weight, tracking, line length and the token (muted or faint) that clears AA in all six themes. The
   two passages are 33 words each, 66 together, so the line count at 390 (a 358px measure at 16px gutters) is the
   thing to get right: five or six lines at 11px is acceptable, a wall is not. Say whether the two passages run together or break.
3. **The "Fan Content Policy" words** and whether they draw as a link (see Open for Hugh); if so, the link treatment
   that stays quiet and still reads as one.
4. **The signed-out shells:** the landing, `/join`, `/sign-up`, the friend card and `/offline` each have their own
   composition. One footer treatment for all, or a tuned margin per shell, and how it sits under Clerk's sign-up card.
5. **`/privacy` and `/terms`.** One prose-page layout for both, signed in or out: title, a "Last updated" line, section
   headings, the measure of the text at 390 and 1300, a way to jump to a section if the page is long (plan B1 expects
   receipts, refunds, the admin PII line, data deletion, the AI vendor, the 18-or-older line), a way back to the app
   or to sign in, and the notice below it. Long prose is written with `/prose-pass` later; Design draws the container,
   not the words.

## Open for Hugh

- **Does "Fan Content Policy" link to Wizards' policy page?** A link is not contact (L1), and linking names the policy
  a reader might want to read, which is the opposite of leaving something out. The recommendation is to link it, to the
  policy page the research brief cites, in a new tab with `rel="noopener noreferrer"`, and to link nothing else in the
  notice.

## Every state to draw

One board, both widths, all six themes where the surface differs:

- Signed in, phone and desktop: a page with a short body and a long one, tab bar present, plus the locked-collection
  88px tab bar, drawn to whichever placement Open 1 settles (below the fold, or at the viewport foot).
- Signed out: the landing, `/join/[token]`, `/sign-up`, `/friend/[token]` (signed-out card), `/offline`.
- `/privacy` and `/terms`: one long page each at both widths, signed in and signed out.
- The footer alone, in each of the six themes, on `--bg`, with its measured contrast.

## Out of scope

- The words of the notice, /about's placement (A2), the artist-credit question (A3), and the pages' text (B1).
- The public card and commander pages (F2), which carry this same footer when they are built.
