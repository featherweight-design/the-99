# Brief: Rule 0 revisions (from Hugh's first friend game)

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Source:** Hugh's first game with friends using Rule 0, 2026-10-30 to 10-31.
**Existing handoff to extend:** `design/design_handoff_the99_rule_zero/` (README, `STATES-rule-zero.md`, R1 and R2
boards: the read, the swap picker, setup, the log, entry). Its decisions not named below are not reopened. Where a
shipped component and the handoff disagree, the component wins.
Related: `design/design_handoff_the99_menu_home/` (Home), `design/design_handoff_the99_deck_analysis/` (the finding
marks the read's key is made of).

## Hugh's rulings (2026-10-31), which bind every screen here

1. **The read's key uses the shared `MarkKey` grid, as `/collection` does.** The key is the legend of the five
   finding marks (Game changers, Mass land denial, Extra turns, Two-card infinites, Tutors). Today the Rule 0 read draws
   its own inline wrapping key (`CountsKey`, `src/components/rule-zero/read-card.tsx`). Instead it uses the shared
   `MarkKey` (`src/components/decks/mark-key.tsx`), where pages opt into phone columns: 3 columns on `/collection`'s
   key, 2 in the shopping key. Design picks the column count for the read's phone width. The bracket rail above it is
   not the key and is unchanged.
2. **In "Your deck tonight" (the swap picker), `seated` sits LEFT of the bracket chip** so the chips align down the
   list. Today the mono `seated` tag is at the far right after the chip
   (`src/components/rule-zero/change-deck.tsx`).
3. **Change deck is a modal on desktop.** Today it is an anchored 420px panel on desktop and a sheet on the phone.
4. **An open table sits at the top of Home, phone and desktop, when you are seated.** Today `HomeTableCard`
   (`src/components/rule-zero/home-table-card.tsx`, boards E3 and F3) sits at the head of the Friends section.
5. **The host can Close the table, and a table also ends the next morning.** Today there is no close action: a table
   lasts 24 hours from setup and then reads `This table has closed`.
6. **A seated player gets a push plus an in-app notice**, worded `<host> seated you at <pod>'s table`. **Visibility
   stays seated-only:** only seated players can open the table or see anyone's chosen deck.

Lane a6 builds the engineering half (the notice delivery and the expiry). Wording goes through `/copy-review`; this
brief fixes only the shape.

## What exists today

**The read.** One card per seat on a bracket rail (five columns, Exhibition to cEDH, seat faces stacked over their
bracket, a dashed `TABLE` band at the middle bracket), then the key for the five finding counts. Boards: phone T1 to
T10 (`R1 - Read-Phone.dc.html`), desktop D1 to D10 (`R2 - Read-Desktop.dc.html`).

**The picker.** Phone sheet S3, desktop panel W3. Rows: art, name over a sub-line, the deck row chip, then `seated`.
The seated row is marked and elevated; an unready row is at 45%.

**The table.** Any pod member sets one up; the setter (`rule_zero_tables.set_by`) is the only one who can reseat.
"Seated" is a row in `rule_zero_seats`. It is read live and polled every 20 seconds; the page, the pod row on Friends
and Home's card all disappear on the database clock at expiry. Boards: setup U1 to U4, V1 to V3; entry E1 to E4, F1 to F3.

**Notifications today.** Push is built on the Home feed's six kinds behind the push switch (new set, new precon,
price drop, trade match, spare request, combo), each with a settings tick; there is no Rule 0 kind. A device holds
pushes from 21:00 to 09:00 local and sends one release per kind. The only in-app notices a table has are the changed
dot, the "Since you looked" line, and the toast the swap uses (with Undo).

## The situations to design for

1. **Being seated while the app is closed.** The push arrives; tapping it must land on the table.
2. **Being seated while the app is open.** The in-app notice, on whatever screen the reader is on.
3. **Opening Home on the evening of the game.** The table is the first thing on Home.
4. **The host ends the night** and the others find the table gone or marked closed.
5. **Nobody closes it.** It ends the next morning by itself.
6. **Picking a deck on a laptop** and wanting the table visible behind the choice.

## Every state to draw

Each at 390 and on desktop unless noted.

**The read's key:**
1. The key as `MarkKey` in a grid, with all five marks, at the phone width Design chooses; and the desktop form.
2. A read where fewer than five marks apply, if the key only draws what the table has (compare `/collection`'s key).

**The picker:**
3. `seated` left of the chip: a seated row, an unseated row, an unready row, with the chips aligned.
4. The desktop modal: open over the read, the scrim, close, the busy and failed states, and Undo after a swap.

**Home:**
5. The open table at the top of Home on the phone and on desktop, with the setter, the seats and the closing time.
6. The same card when you set the table up yourself.
7. The card when you are seated and waiting to pick a deck.
8. No open table: Home unchanged, with no gap.
9. The card gone after a Close or at expiry, including a Home that was open when it happened.

**The notice:**
10. The in-app notice `<host> seated you at <pod>'s table`: where it appears, how it is dismissed, what it opens, and
    what it does when several arrive. Draw it on Home and on another screen.
11. The push, as the lock-screen line, and its landing.
12. The notice for a seat that was changed or removed (Design says whether this exists).

**Close and end:**
13. The host's Close control: where it lives, the confirm (if any), and the host's view after.
14. A seated player's view when the host closes the table while they are on it (the poll finds it closed).
15. The ended-next-morning table: how `This table has closed` reads when no one closed it, against when the host did.
16. A non-host never sees Close.
17. Logging after close: `Log this game` and the logged games stay (the shipped L4/H3 behavior).

## Open calls for Design

1. **The key's phone columns** (2 or 3), and whether it uses the shared component's opt-in unchanged.
2. **The in-app notice's form:** a banner at the top of the screen, a toast, a Home card state, or the table card
   itself becoming the notice. It should not stack with the push's lock-screen copy.
3. **Close:** a menu item on the table, a button on the Home card, or both; and whether it needs a confirm given a
   closed table cannot be reopened (a host would have to set up again).
4. **Home placement:** above or below the first-run and banner slots, and how it behaves for a reader seated at two
   tables, if that can occur (a pod has one open table, a reader can be in several pods).
5. **Modal on desktop:** how it treats the shell's search layer and the rail, and its width.
6. **Closed copy:** whether a host-closed table and an expired table read differently.

## Not in scope

- Who may be seated, how many seats, setup, the log form, or the deck analysis behind the read.
- Making a table visible to anyone not seated.
- Push settings (the kinds list and quiet hours stay as they are) unless Design finds the seated push needs a tick.
- The build of the notice delivery and the expiry (lane a6).
- An About entry: Hugh decides at launch.

## What eng builds before the handoff lands

Lane a6 builds the engineering half: the seated push and in-app notice delivery, and the next-morning expiry with a
host Close action. The UI waits on this handoff.
