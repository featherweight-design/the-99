"""Wizards announcements R1: the Precons boards (surface 3)."""
import kit
import pre as R
from kit import doc, board_head, frame, frames, img
from annb import note, col

FOLD = '<div class="fold" style="top:770px"><span>first screen ends</span></div>'


def ph(inner, over="", fold=False):
    return kit.phone(inner, "Decks", over=over + (FOLD if fold else ""))


def phh(inner, h=None, over=""):
    return kit.phone(inner, "Decks", over=over)


def dk(inner, h=None, over=""):
    return kit.desk(inner, "Decks", over=over, h=h)


# ================================================================ 6 · The Announced group with early lists
def announced_board():
    p = phh(R.list_page(), 1500)
    d = dk(R.list_page(True))
    rv = phh(R.list_page(ann=R.announced(False, R.rows_view_set()), yr="").replace('<span class="z-vtg"><span>≣</span><span class="on">▦</span></span>',
                                                                                  '<span class="z-vtg"><span class="on">≣</span><span>▦</span></span>'), 960)
    body = (board_head("Surface 3 · /decks/precons · the Announced group · 390 and 1300",
                       "Each early list is a precon tile in its set’s block",
                       "The shipped Announced group (open: the set is unseen, so it opens by itself) and the dashed set block. <b>Once Wizards posts a set’s lists, "
                       "each list is a precon tile</b> in the block’s own grid: the commander’s card, <i>you own N of M</i>, the list’s name, and on the sub-line its dots "
                       "and the words <b>early list</b> in <code>--fact</code> ink (call 5, R1b: no box). The tile opens the early list’s page. "
                       "A revealed commander whose list is still to come stays a revealed tile; a promised list with nothing yet is the shipped none plate’s note, "
                       "<i>1 more list to come</i> (state 2). The block’s meta counts lists: <i>3 of 5 lists so far</i>. The set stays in Announced until the release lists land.")
            + frames(frame("<b>390</b> · tiles · three of five lists out", p,
                           "Two across, as the block’s grid already lays revealed tiles. Lists first, then revealed commanders still waiting for their list, then the note."),
                     frame("<b>1300</b> · tiles", d,
                           "The decklists’ own auto-fill grid inside the block. The 2026 group below is untouched."))
            + frames(frame("<b>390</b> · rows view", rv,
                           "Rows view opens the set’s row to the same three lists as precon rows (the shipped <code>PreconRow</code> anatomy), each with <i>early list</i>, "
                           "then Ghalta revealed, then the note. The row’s line 2 counts lists before naming commanders."),
                     col(note("Call 5 · the early mark",
                              "<ul><li><b>Words, no box</b> (R1b): <i>early list</i> in <code>--fact</code> (the app’s ink for facts, as the arrivals "
                              "banner’s note uses), on the tile’s sub-line where the set and month go once released.</li>"
                              "<li><b>Not dashed</b>: dashed in this group means “not a precon, nothing to open”. An early list opens, so it keeps the tile’s solid edge.</li>"
                              "<li>The page says it in full (board 7).</li></ul>"),
                         note("Call 6 · a kind switched off",
                              "<b>Precons is unaffected</b>, as engineering prefers. The switch is about news on Home and pushes; the Announced group is the catalog, and a reader "
                              "who opens Precons came to see it. Turning off Commander decklists hides no list here."),
                         note("Seen and new",
                              "Early lists carry their own seen key (<code>early:&lt;code&gt;</code>), so seeing them never hides the release lists’ news. The block’s and the head’s "
                              "<i>new</i> (R1b: words in the meta line, board 10) light again when a further list lands (3 → 5)."), w=520)))
    return doc("Announced", body, 390 + 44 + 1300 + 112)


# ================================================================ 7 · The early list's page
def early_board():
    p = ph(R.early_page())
    d = dk(R.early_page(True))
    rel = phh(R.early_page(released=True, unmatched=False), 900)
    nc = phh(R.early_page(band=True, unmatched=False), 900)
    ld = phh(R.skeleton(), 844)
    rel_block = ('<div class="ph d4n" style="display:block;width:390px;height:auto;padding:0 0 14px;border-radius:16px">'
                 + R.announced(False, R.set_block(False, lists=R.LISTS, revealed=[], more=2, new=False, released=True), new=False) + "</div>")
    body = (board_head("Surface 3 · the early list’s page · 390 and 1300",
                       "The precon page, view-only until the release list",
                       "Built from <code>open-precon-view.tsx</code> with three things taken away and one added. <b>Gone</b>: Start with this precon, Link a deck, and the Overview "
                       "(ruling 5: no Overview and no power reading on an early list). <b>Kept</b>: the head, <i>You own N of M</i> and its bar, List or Cards, and "
                       "<code>DecklistGroup</code> read-only with the owned dot. <b>Added</b>: the eyebrow reads <i>Early decklist · view-only</i>, and a dashed "
                       "<code>--fact</code> band says what this is and when it changes, with <i>Read the post ↗</i>. Rows show no SET number: the post names cards, not printings.")
            + frames(frame("<b>1 · Early list</b> · 390", p,
                           "No dock at the foot: an early list has no Start. The band sits where the edition switch would."),
                     frame("<b>1 · Early list</b> · 1300", d,
                           "The head’s right end, where Link a deck and Start sit, is empty. The band runs one line with its link at the right."))
            + frames(frame("<b>4 · Released, release list not in</b> · 390", rel,
                           "The street date passed, MTGJSON has not listed the box: the page is unchanged but the band’s words. Still no Start."),
                     frame("<b>4 · The set block meanwhile</b>", rel_block,
                           "The shipped <i>out</i> meta, with <i>release lists not in yet</i> in place of <i>decklists not listed yet</i>: the lists are here, early."),
                     frame("<b>6 · No collection</b> · 390", nc,
                           "The shipped <code>EmptyCollectionBand</code> under the early band; every count reads 0, as on any precon."), gap=36)
            + frames(frame("<b>7 · Loading</b> · 390", ld,
                           "The precon page’s skeleton: head, two bands, rows. Nothing new."),
                     col(note("5 · Lines the catalog can’t match",
                              "<ul><li>A post can name a card before the catalog has it (a new card in a new set).</li>"
                              "<li>Today a precon drops such lines and says so in the own band (<i>2 cards in this precon aren’t in our catalog yet, so 66 are listed</i>). "
                              "An early list keeps that line <b>and lists them</b>, by the post’s words, in a last group: <b>Not in our catalog yet</b>, dashed rows with no dot, "
                              "no pips and no press (frame 1 shows it at the foot).</li>"
                              "<li>They count toward M, never toward what you own. When the card reaches the catalog the row moves to its type group.</li></ul>"),
                         note("Where the page lives",
                              "Its own address (engineering’s choice, e.g. <code>/decks/precons/early/&lt;code&gt;/&lt;slug&gt;</code>). When the release list arrives that "
                              "address sends the reader to the release list’s page (board 8)."), w=520), gap=36))
    return doc("Early list", body, 390 * 3 + 36 * 2 + 112 + 120 + 420)


# ================================================================ 8 · The release list arrives
def arrival_board():
    before = phh(R.early_page(unmatched=False), 1100)
    after = phh(R.release_page(), 1100, over=R.DOCK)
    dafter = dk(R.release_page(True))
    lb = phh(R.list_page(), 1100)
    new3 = "".join(R.precon_tile(n, im, ident, own, of, "FDC · Nov 2026", new=True) for n, c, im, ident, own, of in R.LISTS + R.RELEASED)
    la = phh(R.list_page(ann="", yr=R.year(False, R.YEAR[:1], n=39, extra=new3)), 1100)
    body = (board_head("Surface 3 · state 3 · the release list arrives",
                       "The release list replaces the early one",
                       "When MTGJSON lists the box (not on the street date), the release list <b>replaces</b> the early list: one precon, its shipped page, with Start, "
                       "Link a deck and the Overview built from the release list. The early list is gone, not kept beside it. On the list page the set leaves Announced and "
                       "its precons join their year with <i>new ·</i> for 14 days, as the arrivals already do.")
            + frames(frame("<b>Before</b> · 390 · the early list", before, ""),
                     frame("<b>After</b> · 390 · the release list", after,
                           "The shipped precon page: eyebrow <i>Precon decklist · read-only</i>, the Overview, rows with their SET number, Start docked."),
                     frame("<b>List page before</b> · 390", lb, ""),
                     frame("<b>List page after</b> · 390", la,
                           "Announced has nothing left, so it is not drawn. FDC’s five lead 2026 with <i>new ·</i>."), gap=36)
            + frames(frame("<b>After</b> · 1300", dafter, "Exactly today’s precon page."),
                     col(note("What carries over",
                              "<ul><li>Nothing the reader made: an early list has no deck, link or note.</li>"
                              "<li>The Home row stays as it was (it links to the post and, in-app, to the precons, which now open the release pages).</li>"
                              "<li>The release list’s news is its own: the arrivals banner and the <code>lists:&lt;code&gt;</code> seen key, untouched by the early key.</li>"
                              "<li>Lists that arrive in the release but were never posted early simply appear; an early list Wizards never released leaves with the set.</li></ul>"),
                         w=420), gap=36))
    return doc("Release arrival", body, 390 * 4 + 36 * 3 + 112 + 120)


BOARDS = [("Announced", announced_board, "6 · Precons: the Announced group"),
          ("Early-List", early_board, "7 · The early list’s page"),
          ("Release-Arrival", arrival_board, "8 · The release list arrives")]
