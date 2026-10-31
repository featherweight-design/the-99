#!/usr/bin/env python3
"""Small items 7 · item 3: the cart's two toasts on a phone. Drawn over the All decks cart v2 By friend boards
(design_handoff_the99_all_decks_cart_v2/By-Friend.dc.html: its styles, its 390 and 1300 frames) with the deck
stack's toast parts from Small items 3 (Deck-Toasts). Usage: ct.py <By-Friend.dc.html> <out.dc.html> [blobs.json]"""
import re, sys, json

src, out = sys.argv[1], sys.argv[2]
blobs = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else None
s = open(src).read()


def block(start):
    d = 0
    for m in re.finditer(r'<(/?)div\b', s[start:]):
        d += -1 if m.group(1) else 1
        if d == 0:
            return s[start:s.find('>', start + m.start()) + 1]


helmet = s[s.find('<helmet>'):s.find('</helmet>')]
PH = block(s.find('<div class="ph" style="">'))
DK = block(s.find('<div class="dk" style="width:1300px;height:980px">'))

CSS = """<style>
.tstk{position:absolute;z-index:60;display:flex;flex-direction:column;gap:10px}
.tst{position:relative;display:flex;align-items:flex-start;gap:10px;min-height:52px;padding-left:14px;padding-right:6px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);box-shadow:0 12px 30px rgb(0 0 0/.45)}
.tst .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding:10px 0}
.tst .t{font-size:13.5px;line-height:1.35;color:var(--fg)}
.tst .d{font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.tst .b{font-size:12.5px;line-height:1.45;color:var(--fg-body)}
.tst .ac{flex:none;align-self:center;display:flex;gap:2px}
.tst .ac i{font-style:normal;display:inline-flex;height:44px;align-items:center;padding:0 10px;font-size:13.5px;color:var(--accent-text)}
.tst .ac i:last-child{font-weight:600}
.tst .tnote{position:absolute;right:8px;top:-9px;font:600 9px/16px 'IBM Plex Mono';letter-spacing:.06em;text-transform:uppercase;font-style:normal;padding:0 6px;border-radius:4px;background:var(--bg);border:1px solid var(--border-strong);color:var(--fg-faint)}
.tst.al .tnote{color:var(--warning)}
.hid{position:absolute;z-index:61;border:1.5px dashed var(--warning);border-radius:10px;pointer-events:none}
.hid em{position:absolute;left:8px;bottom:-9px;font:600 9px/16px 'IBM Plex Mono';letter-spacing:.06em;text-transform:uppercase;font-style:normal;padding:0 6px;border-radius:4px;background:var(--bg);border:1px solid var(--warning);color:var(--warning)}
.rule{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:20px 24px;max-width:1240px}
.rule h4{margin:0 0 10px;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.rule ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.rule b{color:var(--fg)}
.rule code{font:12px 'IBM Plex Mono';color:var(--fg-muted)}
</style>"""

RECEIPT = ('<div class="tst"><em class="tnote">receipt</em><span class="tx"><span class="t">Chaos Warp added · ×1</span>'
           '<span class="d">C21 #160 · Nonfoil</span><span class="b">HD - Goblins is covered.</span></span>'
           '<span class="ac"><i>History</i><i>Undo</i></span></div>')
ALERT = ('<div class="tst al"><em class="tnote">failed ask</em><span class="tx"><span class="t">We couldn’t send that. Try again.</span></span></div>')


def phone(overlay):
    return PH.replace('<div class="ph" style="">', '<div class="ph" style="height:844px">', 1).replace('<div class="pb" style="flex:none">', '<div class="pb" style="flex:1 1 auto;min-height:0">', 1).replace(
        '<div class="tbar">', overlay + '<div class="tbar">', 1)


def desk(overlay):
    return DK.replace('height:980px', 'height:900px', 1)[:-6] + overlay + '</div>'


def fr(lab, cap, inner):
    return f'<div class="fr"><div class="lab">{lab}</div>{inner}<p class="cap">{cap}</p></div>'


# The phone's tab bar is 74 tall: the cart slot is 10 above it (84), the shared toast's centre slot 16 above (90).
now = phone(f'<div class="tstk" style="bottom:90px;left:16px;right:16px">{ALERT}</div>'
            f'<div class="tstk" style="bottom:84px;left:16px;right:16px">{RECEIPT}</div>'
            '<span class="hid" style="left:12px;right:12px;bottom:86px;height:58px"><em>failed ask, under the receipt</em></span>')
stack = phone(f'<div class="tstk" style="bottom:84px;left:16px;right:16px">{ALERT}{RECEIPT}</div>')
alone = phone(f'<div class="tstk" style="bottom:90px;left:16px;right:16px">{ALERT}</div>')
dk = desk(f'<div class="tstk" style="bottom:24px;left:440px;width:420px">{ALERT}</div>'
          f'<div class="tstk" style="bottom:22px;right:22px;width:380px">{RECEIPT}</div>')

frames = (fr('<b>Now</b> · 390 · a failed ask while a receipt is up',
             'The failed ask mounts in the shared toast’s centre slot, 16px above the tab bar. The receipt holds the cart slot 10px above it at the same z and is taller, so it covers the failure whole (dashed). The player never hears the ask failed.', now)
          + fr('<b>Proposed</b> · 390 · one stack',
               'The receipt keeps the floor, because it holds <b>Undo</b>. The failed ask stands 10px above it, as the deck stack does (Small items 3). Both are pressable; the gap is not.', stack)
          + fr('<b>Proposed</b> · 390 · the receipt goes first',
               'When the receipt closes (its time runs out or Undo is done), the failed ask drops at once to its own shipped place and keeps its clock.', alone)
          + fr('<b>Unchanged</b> · 1300 · both up',
               'On desktop the two slots never meet: the failed ask is bottom centre, the receipt bottom right at 380. Drawn as shipped.', dk))

RULE = ('<div class="rule"><h4>The call</h4><ol>'
        '<li><b>Neither wins: they stack.</b> On a phone, while a cart receipt is up, a failed ask (<code>spareCopy.request.failed</code>, “We couldn’t send that. Try again.”) joins the cart slot <b>above</b> the receipt, 10px apart. The receipt keeps the floor because it holds Undo and the player’s last purchase.</li>'
        '<li><b>At most one of each.</b> A second failed ask replaces the first; a second receipt replaces the first (as shipped). The stack is never more than two.</li>'
        '<li><b>Each keeps its own clock.</b> When the receipt goes, the failed ask drops at once to its shipped place, 16px above the tab bar. When the failed ask goes, the receipt doesn’t move.</li>'
        '<li>The failed spares read is not part of this: it still waits for the receipt to close and is then said once, as shipped (cart v2 PR 7).</li>'
        '<li>Desktop is unchanged. No new string, token or motion; the stack is the deck stack’s (<code>deck-toast-stack.tsx</code>) in the cart slot.</li>'
        '</ol></div>')

board = ('<div class="board" style="width:2000px"><div class="bh"><div class="kick"><span class="tag">R1</span>3 · Cart · two toasts</div>'
         '<h2>A failed ask and a receipt, at once: they stack, receipt on the floor</h2>'
         '<p>On the phone, pressing <b>Ask</b> in By friend and then <b>buy</b> on another card can put both toasts up. Today the receipt draws over the failure. Drawn over the shipped By friend list at 390 and 1300.</p></div>'
         f'<div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">{frames}</div>{RULE}</div>')

html = s[:s.find('<x-dc>')] + '<x-dc>\n' + helmet + CSS + '</helmet>\n' + board + '\n</x-dc>\n' + s[s.find('<script type="text/x-dc"'):]
html = html.replace('<title>All decks cart v2 · By friend</title>', '<title>Small items 7 · Cart toasts</title>')
if blobs:
    for k, v in blobs.items():
        html = html.replace(f'art/{k}', v)
open(out, 'w').write(html)
