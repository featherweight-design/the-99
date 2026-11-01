"""Board 0 · The calls."""
import ghlib as G, lib8 as L


def build():
    body = L.head('Game history · R1 · account 2 · 2026-10-31', 'Game history: the calls',
                  'Brief <code>docs/superpowers/design-briefs/2026-10-31-game-history.md</code>. Aligned with <code>game_log</code> (the row, the low-N ladder), <code>deck_stats_view</code> and <code>lineup</code> (Stats on /decks, the recency card), <code>social_r3</code> (vs line, trophy, snapshots) and <code>rule_zero</code> (Log this game). '
                  'A history, not a live tracker: nothing here starts, runs or scores a game. Every frame is drawn at 390 and 1300 over the shipped Decks page; the deck’s own Games tab is the About capture.')
    body += L.rule('R1b (Hugh, 2026-11-01)', [
        '<b>Each game row leads with its deck’s commander art</b> (26px, radius 6, the deck tile’s art crop, a pair’s first commander), not the identity mark. Phone: the row’s first line; desktop: the 230px deck column. The identity mark stays only where Stats already draws it (the recency card).',
    ])
    body += L.rule('The calls (brief §Open calls)', [
        '<b>Placement (1):</b> a third segment on the Decks view row, <b>Tiles · Stats · Games</b> (<code>?view=games</code>), beside the switch that already exists. It displaces nothing: no rail item, no user-menu row, no Home section, Me page untouched. One door in: <i>See every game ›</i> on Stats’ <i>When each deck last played</i> card, the one card that already counts games across decks. Board 1.',
        '<b>Content (2):</b> the row is the shipped history row with its deck (commander art and name) added (first line on the phone, a 230px column on desktop, the Stats lanes’ width) and the ✕ removed. Result, <i>N-player · date</i>, version stamp, worked and hurt marks, vs line and note all stay, so a game reads the same here as on its deck. Board 3.',
        '<b>Filters (3):</b> Deck, Result, Played against (friends first, then commanders). Phone: the deck picker sits where the shelf picker sits, and Result and Played against are in the shipped filter sheet behind <i>Filter games</i>. Desktop: three dropdowns on the view row. Active filters are chips on the shipped <i>No filters on</i> line. Grouped by month, newest first. Board 2.',
        '<b>Relation to the deck’s Games tab (4):</b> a row opens that deck’s Games tab at that game, which scrolls into view and is ringed for two seconds. The tab stays the only place to log, correct or delete; this view is read-only. Rule 0 games are ordinary rows: there is no table id and a table expires after 24 hours, so a row has no Rule 0 link. Rule 0 is pointed to from the empty state.',
        '<b>Aggregates (5):</b> a headline in the Games tab’s voice (<i>23 games logged. 9–12–2.</i>), then counts: decks, pod sizes, span, and <i>most played X, 8 of 23</i> (from 3 games, when one deck leads outright). Filters scope it, which answers “how has Sai done with Colin at the table?”: <i>5 games logged. 2–3.</i> and <i>Colin won 2 of the 3 you lost</i>. No percentages, no rates, no ranking of decks, never <code>net</code>.',
        '<b>Low N:</b> below 3 games, a count and one line on where games come from, no filters. From 3, the filter row and most played. Board 4.',
        '<b>Long history:</b> fifty games a read with <i>Show 50 more</i> at the foot; month heads count the whole month. Board 5.',
        '<b>Failure:</b> a failed first read leaves Tiles drawn (as Stats does) and adds the shared toast with Try again; a failed <i>Show 50 more</i> keeps the list and toasts. Board 5.',
        '<b>Social games off:</b> no vs lines and no Played against; the view is otherwise whole. Board 3.',
        '<b>A deleted deck:</b> games cascade with it today and the shipped delete confirm says so; the view assumes that and draws no tombstone. A friend’s deleted deck lives on in the reader’s rows as its snapshot. Board 5.',
    ])
    body += L.rule('Open for Hugh', [
        '<b>Q1 · The door.</b> Is <i>See every game ›</i> on the recency card enough, or should the deck’s Games tab also link out (a quiet <i>Every deck’s games ›</i> beside <i>History · newest first</i>)? Drawn: the recency card only.',
        '<b>Q2 · Marks in the row.</b> Kept, to match the shipped row. On a phone they make a row about 20px taller. Drop them here and keep them on the deck’s tab?',
        '<b>Q3 · Copy.</b> Two DRAFT lines (empty state body, the 1–2 game line) for <code>/copy-review</code>.',
    ])
    body += L.rule('Engineering notes (not drawn)', [
        'The brief’s cross-deck read: owner-only, joined to deck name, identity and opponents, windowed 50 by <code>played_at</code> desc, filtered on the server (deck, result, opponent friend id or commander oracle id), with month counts and the summary figures computed over the filter, not the window.',
        '<code>?view=games</code> joins <code>DecksView</code>; the cookie may remember it as it remembers Stats. Filters mirror to the URL (<code>deck</code>, <code>result</code>, <code>vs</code>).',
        'Deck tab landing: <code>?tab=games&amp;game=&lt;id&gt;</code> scrolls to the row and sets a 2s ring (reduced motion: no fade, ring removed at 2s).',
        'No About entry (Hugh decides at launch). No new logged fields.',
    ])
    return G.build_doc('Game history · the calls', body, 1612)
