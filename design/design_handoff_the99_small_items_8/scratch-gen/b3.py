"""Item 3 · Cart toasts at 768 to 1223: the failed ask and the receipt overlap; they stack in the receipt's slot."""
import lib8 as L, re
SRC = 'design_handoff_the99_small_items_7/Cart-Toasts.dc.html'
s = L.load(SRC)
DKF = L.frame_by_label(s, '<b>Unchanged</b>')
PHF = L.frame_by_label(s, '<b>Proposed</b> · 390 · one stack')
DK = DKF[DKF.find('<div class="dk"'):DKF.rfind('<p class="cap">')]
# strip the existing toasts from the desktop frame
DK = DK[:DK.find('<div class="tstk"')] + '</div>'
PH_LBOX = L.block(PHF, PHF.find('<div class="lbox"'))
DK_LBOX = L.block(DK, DK.find('<div class="lbox"'))
RECEIPT = ('<div class="tst"><em class="tnote">receipt</em><span class="tx"><span class="t">Chaos Warp added · ×1</span>'
           '<span class="d">C21 #160 · Nonfoil</span><span class="b">HD - Goblins is covered.</span></span>'
           '<span class="ac"><i>History</i><i>Undo</i></span></div>')
ALERT = re.search(r'<div class="tst al">.*?</span></span></div>', s).group(0)
D8 = '<span class="draft8">DRAFT</span>'

CSS = """<style>
.dk.t8 .cg{grid-template-columns:280px minmax(0,1fr)}
.dk.t8 .lbox{overflow:hidden}
.ovl{position:absolute;z-index:62;border:1.5px dashed var(--danger);border-radius:10px;pointer-events:none;background:rgba(198,83,63,.08)}
.ovl em{position:absolute;left:8px;top:-9px;font:600 9px/16px 'IBM Plex Mono';letter-spacing:.06em;text-transform:uppercase;font-style:normal;padding:0 6px;border-radius:4px;background:var(--bg);border:1px solid var(--danger);color:var(--danger)}
.rul8{position:absolute;bottom:4px;height:12px;border-left:1px solid var(--fact);border-right:1px solid var(--fact);z-index:63}
</style>"""


def tablet(w, overlay, h=820):
    d = DK.replace('width:1300px;height:900px', f'width:{w}px;height:{h}px', 1).replace('class="dk"', 'class="dk t8"', 1)
    lb = PH_LBOX.replace('height:1180px', 'height:auto', 1)
    d = d.replace(DK_LBOX, lb, 1)
    return d[:-6] + overlay + '</div>'


def centre(w):
    tw = min(w - 32, 420)
    return f'<div class="tstk" style="bottom:24px;left:{(w - tw) // 2}px;width:{tw}px">{ALERT}</div>'


RCP = '<div class="tstk" style="bottom:22px;right:22px;width:380px">' + RECEIPT + '</div>'
STACK = '<div class="tstk" style="bottom:22px;right:22px;width:380px">' + ALERT + RECEIPT + '</div>'


def now(w):
    tw = min(w - 32, 420); l = (w - tw) // 2; r = w - 22 - 380
    ov = f'<span class="ovl" style="left:{r}px;width:{l + tw - r}px;bottom:18px;height:90px"><em>{l + tw - r}px overlap</em></span>'
    return tablet(w, centre(w) + RCP + ov)


def build():
    body = L.head('3 · Cart · two toasts between the phone and desktop',
                  'From 768 to 1223, the stack moves to the receipt’s corner',
                  'From <code>md</code> the failed ask (<code>spareCopy.request.failed</code>) is the shared toast, bottom centre at up to 420 wide, '
                  'and a cart receipt is bottom right at 380. They clear each other only from 1224 (half of 420, plus 380 and 22 from the right edge, each side of centre). '
                  'Below that they overlap. Drawn over the shipped By friend list (cart v2) at 768 and 1024; the list at these widths is the phone’s rows in the desktop columns.')
    body += '<div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>Now</b> · 1024 · both up', now(1024),
                 'The failed ask (centre, 302–722) and the receipt (622–1002) share 100px. Whichever mounts last covers the other’s end.')
    body += L.fr('<b>Proposed</b> · 1024 · one stack', tablet(1024, STACK),
                 'While a receipt is up, the failed ask stands 10px above it in the receipt’s slot, at the receipt’s 380. The receipt keeps the floor because it holds Undo.')
    body += '</div><div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>Now</b> · 768 · both up', now(768),
                 'At 768 they overlap by 228px: the receipt hides most of the failure.')
    body += L.fr('<b>Proposed</b> · 768 · one stack', tablet(768, STACK), 'The same stack. The list under it scrolls as shipped.')
    body += L.fr('<b>Proposed</b> · 768 · the receipt goes first', tablet(768, centre(768)),
                 'When the receipt closes, the failed ask drops back to its shipped centre at once and keeps its clock.')
    body += '</div>'
    body += L.rule('The call', [
        '<b>One stack below 1224.</b> From <code>md</code> to 1223px, while a cart receipt is up, a failed ask joins the receipt’s stack: bottom right, 22px in, 380 wide, the failed ask 10px above the receipt. The phone’s rules carry over (Small items 7, item 3): at most one of each, each keeps its own clock, a press takes a toast and never the gap.',
        '<b>Alone, each keeps its place.</b> A failed ask with no receipt is the shared toast at bottom centre. A receipt with no failed ask is unchanged.',
        '<b>From 1224 unchanged:</b> the slots never meet, so the two stay apart as Small items 7 drew.',
        '<b>For engineering:</b> <code>useCartPhone</code> becomes “cart stack”: true below <code>(min-width: 76.5rem)</code> instead of below <code>md</code>, and from <code>md</code> the stack container takes the receipt’s fixed slot (<code>bottom-[22px] right-[22px] w-[380px]</code>) in place of the phone’s <code>CART_SLOT</code>. No new string.'])
    return L.doc('Small items 8 · Cart toasts at tablet', L.helmet(s) + CSS, body, 2000)
