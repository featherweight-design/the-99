"""Strategy focus R2 boards (Hugh, 2026-10-22): a free focus pick on Analysis, Suggested changes aims at it, and
less on screen. Fixture: HD - Avatar Aang (Hugh's deck, v2, 99/99, Upgraded), cards cut from his captures."""
import kit
import parts as P
import graph as G
from kit import doc, board_head, frame


def row(label_p, ph, label_d, dk, cap_p="", cap_d=""):
    return f'<div class="frames">{frame(label_p, ph, cap_p)}{frame(label_d, dk, cap_d)}</div>'


def sec(title, sp, body):
    return f'<div class="sec"><h3>{title}</h3><p class="sp">{sp}</p>{body}</div>'


CUT = "Analysis tab · past How it plays"


def bph(block, cut=CUT, hub=True):
    return P.phone(f'<div class="at">{block}{P.hub_landing(True) if hub else ""}</div>', head=False, cut=cut, nav=False)


def bdk(block, cut=CUT, hub=True):
    return P.desk(f'<div class="at">{block}{P.hub_landing() if hub else ""}</div>', head=False, cut=cut)


def both(title, sp, ph_block, dk_block, hub=True, lp="<b>390</b>", ld="<b>1300</b>"):
    return sec(title, sp, row(lp, bph(ph_block, hub=hub), ld, bdk(dk_block, hub=hub)))


def tool_ph(panel, cut="Analysis tab · Tuning · Suggested changes"):
    return P.phone(f'<div class="at">{P.hub_open(panel, True, active="suggested")}</div>', head=False, cut=cut, nav=False)


def tool_dk(panel, cut="Analysis tab · Tuning · Suggested changes"):
    return P.desk(f'<div class="at">{P.hub_open(panel, active="suggested")}</div>', head=False, cut=cut)


CALLS = [
    ("1", "Focus is a free pick on Analysis", "Press a strategy to make it the deck’s focus; <i>Keep it balanced</i> clears it. Saved on the deck, like what the "
     "deck is for. One line under the graph says what it does. No model, no credit."),
    ("2", "Suggested changes aims at it", "No new tool and no second credit. The panel gains one manifest row (<i>This deck’s focus · Tokens</i>) and one "
     "sentence in its lead. Additions lean toward the focus; cuts come from cards on none of the top strategies. A focus change counts as something "
     "new to read, so <i>Suggest again</i> is offered."),
    ("3", "Swaps show the shift", "Each addition toward the focus carries one more citation chip in the shipped pattern: <i>focus · Tokens 11 → 12</i>. "
     "Applying moves the graph for real: the new cards land on the Tokens pile, outlined, with <i>11 +2</i>."),
    ("4", "The graph", "<b>Card piles</b> (picked): each strategy a stack of its cards with a real card face up, height by count. Clear (taller is more), "
     "card-shaped, and it gives the shift somewhere to land. Ring, strip and R1’s bars drawn beside it."),
    ("5", "Less on screen", "R1’s separate read (how it wins, how the strategies fit, weak links, its own swaps) is dropped. Analysis gets one block; "
     "Tuning keeps its four tools."),
]


def calls_tbl():
    return '<div class="tbl">' + "".join(f'<div class="tr"><div>{n}</div><div>{t}</div><div>{b}</div></div>' for n, t, b in CALLS) + '</div>'


def main():
    ph = P.phone('<div class="at">' + P.overview() + P.vbox().replace('class="vbx"', 'class="vbx" style="padding:16px"') + P.climb_phone()
                 + P.findings_phone() + P.howplays_phone() + G.block("piles", True) + P.hub_landing(True) + '</div>')
    dk_body = ('<div class="at"><div class="grid"><div style="grid-column:1;grid-row:1">' + P.overview() + '</div>'
               '<div style="grid-column:2;grid-row:1/3">' + P.vbox() + '</div><div style="grid-column:1;grid-row:2">' + P.climb() + '</div></div>'
               + P.findings() + P.howplays() + G.block("piles") + P.hub_landing() + '</div>')
    body = (board_head("Strategy focus · R2 · 2026-10-22 · account 2", "Pick a focus, and Suggested changes aims at it",
                       "Hugh’s ruling after R1: one swap engine. The free graph on Analysis shows what the deck is built around and lets the player pick a "
                       "focus; Suggested changes (shipped, 1 credit) reads the focus and its swaps show how far they move it. Less information on screen "
                       "than R1. Drawn over the shipped Analysis tab on Hugh’s <b>HD - Avatar Aang</b>, in Low Sun; every card is cut from Hugh’s captures. "
                       "Orange dashed outline = new. Counts are fixtures until eng’s read runs on staging.")
            + sec("The calls", "", calls_tbl())
            + sec("The Analysis tab with a focus picked", "One new block, last in the reading, under How it plays and above Tuning. Tokens is the "
                  "focus: its pile is lit and the line under it says what that does.",
                  row("<b>390</b> · Analysis tab, whole", ph, "<b>1300</b> · Analysis tab, whole", P.desk(dk_body))))
    return doc("Main", body, 1900)


def options():
    names = ('<div class="tbl" style="max-width:900px">' + "".join(f'<div class="tr" style="grid-template-columns:44px 260px 1fr"><div>{k}</div><div>{v}</div><div>{n}</div></div>' for k, v, n in [
        ("type", "Artifacts · Enchantments · Vehicles", "front face"), ("type", "Equipment and Auras", "the brief’s voltron axis"),
        ("type", "Creatures costing 6+", "never “big”, which promises power"), ("typal", "Allies · Elves · Dinosaurs", "the type’s plural"),
        ("theme", "Spells matter · Tokens · +1/+1 counters …", "the swap tools’ job names")]) + '</div>')
    body = (board_head("Strategy focus · R2", "The graph: four ways to show it",
                       "All four with Tokens as the focus, at both widths. Every one is pressable per strategy (44px on the phone) and reads the same five "
                       "counts. A card can count toward two strategies, so a form that adds up to a whole (ring, strip) slightly overstates a share.")
            + both("A · Card piles (picked)", "A stack per strategy, height by count, the top card a real card from the deck in that strategy. The focus pile "
                   "is lit. It reads like a deck on the table, needs no scale, and an applied swap lands on its pile (Focus-Flow board).",
                   G.block("piles", True), G.block("piles"), hub=False)
            + both("B · Ring around the commander", "The commander’s art at the centre, each strategy an arc sized by its count, the focus pulled out in "
                   "accent; a legend beside it carries names and counts. The most decorative, and the hardest to compare two close counts.",
                   G.block("ring", True), G.block("ring"), hub=False)
            + both("C · One strip", "One ribbon split by count, names inside on desktop, a legend under it on the phone. Compact, but small strategies "
                   "turn into slivers.", G.block("strip", True), G.block("strip"), hub=False)
            + both("D · Bars (R1)", "For comparison: the clearest, and the plainest.", G.block("bars", True), G.block("bars"), hub=False)
            + sec("Names", "How each axis reads (placeholders for /copy-review).", names))
    return doc("Graph-Options", body, 1900)


def focus_flow():
    body = (board_head("Strategy focus · R2", "The focus, end to end",
                       "Five steps: no focus, Suggested changes ready, its swaps, two applied, and the graph after. Suggested changes is the shipped panel "
                       "(manifest, two lists, Apply all, tally); the only additions are the focus row, one lead sentence and the focus chip.")
            + both("1 · No focus yet", "The default for every deck. The line says Suggested changes keeps the deck balanced. Pressing a pile makes it "
                   "the focus (Main board).", G.block("piles", True, focus=None), G.block("piles", focus=None))
            + sec("2 · Suggested changes, ready, with a focus", "One new manifest row and one sentence. Nothing else in the panel moves.",
                  row("<b>390</b>", tool_ph(G.ready(True)), "<b>1300</b>", tool_dk(G.ready(False))))
            + sec("3 · Its swaps", "Each addition toward the focus carries the focus chip (dashed accent, the shipped citation shape) with the count it "
                  "moves to. Cuts cite as shipped. Apply all and the tally are unchanged.",
                  row("<b>390</b>", tool_ph(G.results(True)), "<b>1300</b>", tool_dk(G.results(False))))
            + sec("4 · Two applied", "The shipped answered rows with Undo, and Apply the rest.",
                  row("<b>390</b>", tool_ph(G.results(True, applied=2)), "<b>1300</b>", tool_dk(G.results(False, applied=2))))
            + both("5 · The graph after them", "Back on the block, the two new cards (Avenger of Zendikar, Bloodline Keeper) land face up on the Tokens pile, outlined, and the count reads <i>11 +2</i> until "
                   "the deck is next committed. Nothing else changes.", G.block("piles", True, added=2), G.block("piles", added=2)))
    return doc("Focus-Flow", body, 1900)


def states():
    two = [("Allies", 22, "aang-swift-savior"), ("Spells matter", 9, "swords")]
    elves = [("Elves", 44, "avabruck-caretaker"), ("Tokens", 13, "jasmine-tea-shop"), ("Pump", 8, "moonmist")]
    world = [("Insects", 9, "gleaming-splendor"), ("Landfall", 11, "avenger-of-zendikar"), ("Tokens", 8, "jasmine-tea-shop"),
             ("Creatures costing 6+", 6, "beorn")]
    s3 = ('<div class="bstate">Nothing in this list runs past what Commander cards run at large, so there is nothing to pick. '
          'Suggested changes keeps the deck balanced.</div>')
    s4 = '<div class="bstate">This list has <b>18 cards besides lands</b>. What it’s built around shows from 30.</div>'
    body = (board_head("Strategy focus · R2", "The graph’s own states",
                       "Drawn in card piles. The graph describes and never judges: no state says focused or spread thin. "
                       "(Top cards for the Elves and World Shaper fixtures are stand-ins from Hugh’s captures.)")
            + both("One to four strategies", "Only what scores; not padded to five.", G.block("piles", True, focus=None, rows=two), G.block("piles", focus=None, rows=two))
            + both("Nothing over the floor", "A statement in the graph’s place, no pick.", G.block(ph=True, state=s3, sub=False), G.block(state=s3, sub=False))
            + both("Too small to read", "Under 30 nonland cards.", G.block(ph=True, state=s4, sub=False), G.block(state=s4, sub=False))
            + sec("A creature type replaces tribal, and a landfall deck as-is", "HD - Elves reads one Elves pile, never a second Tribal pile. "
                  "World Shaper reads Insects ahead of Landfall: lands aren’t counted, so landfall under-reads, and the player can still pick it.",
                  f'<div class="frames">{frame("<b>390</b> · HD - Elves", bph(G.block("piles", True, focus=None, rows=elves)))}'
                  f'{frame("<b>390</b> · World Shaper", bph(G.block("piles", True, focus="Landfall", rows=world)))}</div>'))
    return doc("Graph-States", body, 1900)


def about():
    cap = ("What is this deck built around? Under Analysis, <i>What it’s built around</i> stacks up the five things the deck runs most, counted from "
           "the list against every Commander card: a creature type, a theme like Tokens, or a card type. Press one to make it the deck’s focus.</p>"
           "<p>With a focus picked, Suggested changes aims at it: its additions lean toward the focus, and each says how far it moves it. "
           "Apply one and the pile grows.")
    keys = ["The graph and the focus are free. Suggested changes uses a credit, as it always has.",
            "Keep it balanced clears the focus.",
            "Lands aren’t counted, so a landfall deck reads its payoffs, not its lands."]
    kl = "".join(f'<li>{k}</li>' for k in keys)
    pic = P.phone('<div class="at">' + G.block("piles", True).replace('class="fb new"', 'class="fb halo"') + P.hub_landing(True) + '</div>',
                  head=False, cut="the entry’s picture · halo on the block", nav=False)
    entry = (f'<div style="width:760px;display:flex;flex-direction:column;gap:12px;border-top:2px solid var(--accent);padding-top:16px">'
             '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="pill" style="background:var(--accent);color:#14110E;height:18px;font-size:9.5px">NEW</span>'
             '<b style="font-size:18px">Giving a deck a focus</b><span class="mt" style="color:var(--accent);font-size:11px">/decks</span>'
             '<span class="mt" style="color:var(--fg-faint);font-size:10.5px">opens a deck’s Analysis tab</span></div>'
             f'<div style="display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.65;color:var(--fg-body)"><p>{cap}</p></div>'
             f'<ul class="mt" style="margin:0;padding-left:16px;font-size:11px;line-height:1.8;color:var(--fg-muted)">{kl}</ul>'
             '<div class="tbl" style="margin-top:10px"><div class="tr"><div>id</div><div>deck-focus · 04</div><div>after mana-balance · plate · screen deck, view analysis</div></div>'
             '<div class="tr"><div>sw</div><div>the feature’s switch</div><div>eng names it; announced when it flips, since 16, no ABOUT_VERSION bump, marksPending</div></div>'
             '<div class="tr"><div>pic</div><div>locator halo</div><div>the block on the phone Analysis capture; a recapture with the switch on is owed</div></div></div></div>')
    body = (board_head("Strategy focus · R2", "The About entry",
                       "Per-entry template, chapter 04 after Reading your deck’s mana. Suggested changes’ own entry gains one line (placeholder: “It aims at "
                       "the deck’s focus when one is picked.”).")
            + f'<div class="frames">{entry}<div style="position:relative">{pic}</div></div>')
    return doc("About", body, 1900)


BOARDS = [
    ("Main", main, "R2 · the calls, the Analysis tab with a focus"),
    ("Graph-Options", options, "Piles, ring, strip, bars"),
    ("Focus-Flow", focus_flow, "No focus to two swaps applied"),
    ("Graph-States", states, "The graph’s own states"),
    ("About", about, "The About entry"),
]
