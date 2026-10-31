"""Main: the four directions side by side, and the recommendation."""
from lib import *
import a, b, c, d

CSS_M = """<style>
.dirs{display:grid;grid-template-columns:repeat(4,390px);gap:56px;align-items:start}
.dir{display:flex;flex-direction:column;gap:14px}
.dir h3{margin:0;font:700 22px 'Cinzel',serif}
.dir h3 span{font:600 12px 'IBM Plex Mono';color:var(--accent);letter-spacing:.1em;margin-right:8px}
.dir .one{font-size:14px;line-height:1.55;color:var(--fg-body)}
.dir .pc{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:14px 16px;font-size:13px;line-height:1.55;color:var(--fg-body);display:flex;flex-direction:column;gap:8px}
.dir .pc b{color:var(--fg)}
.dir .pc .p::before{content:'+ ';color:var(--success);font-weight:700}
.dir .pc .m::before{content:'− ';color:var(--danger);font-weight:700}
.dir.rec .ph{outline:2px solid var(--accent);outline-offset:6px}
.recb{display:inline-flex;align-self:flex-start;font:600 10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;background:var(--accent);color:#14110E;border-radius:4px;padding:3px 7px}
</style>"""

def col_(key, title, one, phone, pros, cons, rec=False):
    pc = ''.join(f'<div class="p">{x}</div>' for x in pros) + ''.join(f'<div class="m">{x}</div>' for x in cons)
    r = '<span class="recb">Recommended</span>' if rec else ''
    return (f'<div class="dir{" rec" if rec else ""}"><h3><span>{key}</span>{title}</h3>{r}<p class="one">{one}</p>{phone}'
            f'<div class="pc">{pc}</div></div>')

def build():
    body = head('Add a card from anywhere · Round 1', 'Four ways in, side by side',
                'A friend opens a pack while looking at a deck and wants the cards in their collection without going to Collection. '
                'Each direction is drawn over the shipped app at 390 and 1300 on its own board, with every state the brief lists; the pack, the save and the way back are on <b>Shared</b>. '
                'Every direction opens the shipped Add cards sheet (or, from a card, the shipped Edit copies sheet), with its steps, copy and save rule unchanged. '
                'Pick one and it gets drawn in full in R2.')
    body += '<div class="dirs">'
    body += col_('A', 'Nav slot', 'Add as a sixth tab on the phone and a slot under Friends in the rail.', a.phone_rest(),
                 ['Most findable: one press, always on screen.', 'Same place on every page.'],
                 ['A slot that is not a place, in a bar of places.', 'Six tabs: every label tighter (62px slots, 57px at 360).'])
    body += col_('B', 'Header +', 'A + beside search in the phone header, under search in the rail.', b.phone_rest(),
                 ['Search and Add together: the shell’s two actions.', 'The nav is unchanged.'],
                 ['Fits at 390 only if the install slot steps aside below 379px.', 'Steps aside offline; hides on scroll with the header.'])
    body += col_('C', 'Search adds', 'Each search row gets a +; the open search has an Add several row for a pack.', c.p_typed(),
                 ['No new chrome: header and bar as shipped.', 'Where the reader already goes to find the card, ⌘K included.',
                  'The row they came from says ×1 owned after.'],
                 ['A second control on a search row.', 'Not visible until search is open.'], rec=True)
    body += col_('D', 'The card is the entry', 'Card details’ Add to collection on every surface, not only /collection.', d.p_card(),
                 ['The smallest change: one gate lifted on a shipped link.', 'Also the per-card route under A, B or C.'],
                 ['Only cards already on screen.', 'A pack is five sheets and five saves.'])
    body += '</div>'
    body += rule('Design recommends C, with D under it', [
        '<b>C.</b> The header has no room on a phone and the bar is full of places; search is already one press from every screen and is how a reader finds the card they just pulled. '
        'A + on the row adds that card; <i>Add several cards</i> at the top of the open search is the pack, with Scan one press further, inside the sheet.',
        '<b>D under it.</b> Card details draws Add to collection everywhere, so a card already on screen (a deck row, a friend’s deck, Shopping) needs no search at all. '
        'D is worth shipping whichever direction is picked.',
        '<b>The header (open call 2).</b> On a phone it is the wrong home. Something has to yield for a fourth glyph (the install slot below 379px, and the + itself offline), and the header leaves on scroll. If Hugh prefers B anyway, B5 has the exact rule.',
        '<b>Not explored:</b> an Add row in the account menu. It is the other reading of “a menu item”, but Hugh’s rule keeps rows out of the user menu, and it is two presses deep.',
    ])
    body += rule('Open questions for Hugh', [
        '<b>Pick a direction</b> (A, B, C or D, or C with D). R2 draws the pick in full, both widths, with its About line left to launch.',
        '<b>C’s keyboard add:</b> ⌘↵ on the active row, named in the foot line. Keep it, or mouse and touch only?',
        '<b>Reach:</b> a friend’s deck page carries the add (drawn as yes); the public card page does not. Agree?',
    ])
    return doc('Add card anywhere · the four directions', CSS_M.replace('<style>', '<style>') + body, 1900)
