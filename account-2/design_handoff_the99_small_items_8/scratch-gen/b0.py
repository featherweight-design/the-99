import lib8 as L
s = L.load('design_handoff_the99_small_items_7/Dates.dc.html')
CSS = """<style>.grid8{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:1500px}</style>"""
def build():
    body = L.head('Small items 8 · R1 · account 2 · 2026-10-31', 'Six small states and four errata: the calls',
                  'Each item is drawn at 390 and 1300 (item 3 at 768 and 1024, where the problem is) over the shipped boards it extends. '
                  'Strings marked DRAFT go to <code>/copy-review</code>. Sources: main @ebfb3e1.')
    body += '<div class="grid8">'
    body += L.rule('1 · Home, New in the app (<code>Banner</code>)', [
        '<b>No screenshot.</b> Each About line draws the glyph of the page Show me opens, in the banner mark’s plate: 28px in the band, 36px for a launch alone.',
        '<b>One sentence a line:</b> the label’s lead and the first sentence of its rest. The top story drops to three lines on a phone.',
        'Crops, their theme refresh and the capture fetch retire. Unblocks v2’s About New mark.'])
    body += L.rule('2 · Sign-up with a ticket (<code>Ticket</code>)', [
        'The name step is drawn under the ticket’s own card, on the page the reader is on: the invite QR and flyer after their code on <code>/join</code>, the invitation email at <code>/sign-up</code> with its ticket.',
        'The email link skips the code (the ticket proves it) and shows the address locked.',
        'Three body lines are DRAFT.'])
    body += L.rule('3 · Cart toasts at 768–1223 (<code>Cart-Tablet</code>)', [
        'They overlap below 1224. While a receipt is up, the failed ask joins it in the receipt’s corner, 10px above, at 380.',
        'Alone, each keeps its place. From 1224 unchanged.'])
    body += L.rule('4 · Results beads, 1–4 games (<code>Beads</code>)', [
        '<b>Redraw:</b> the ends line is drawn from five beads. Under five, the span line beside the record already names the first and last game.'])
    body += L.rule('5 · v2 run with v2 off (<code>SC-Off</code>)', [
        'Drawn as History C: the shipped past-run box (<i>A past run, read-only. Nothing here can be applied now.</i>), rows Added, Cut or Not picked, no Pick, Apply or Undo.',
        'Replaces Small items 7 addendum 2’s “no line”. No new string.'])
    body += L.rule('6 · Report a problem after a crash (<code>Report</code>)', [
        '<b>Confirmed:</b> Small items 7 addendum 8 drew both (crash screen, <code>/report</code>); carried unchanged.',
        'Added: send failed (shared toast), sent at 1300, and <code>/report</code> with no error code.'])
    body += L.rule('Errata (<code>Errata</code>)', [
        '(i) <i>· reset at</i> only once a credit is used: confirmed, C and E redrawn.',
        '(ii) paid segment after <i>N after this run</i>, state note first, phone hint own line on 2-credit lines only, C uses <code>costsTwo</code> with no free run: confirmed and drawn as built.',
        '(iii) cap input 16 / 14: confirmed, noting 14 needs <code>md</code> and a fine pointer as built.',
        '(iv) sticky head opaque on <code>--surface-sunken</code>; Pick above ✕: confirmed.'])
    body += L.rule('Open for Hugh', [
        'Item 1: glyphs (recommended) vs no art at all. Both drop the screenshot; the glyph keeps a picture where the band had one.',
        'Item 2: should the invitation email’s name step also show its card’s ✓? Drawn without, since no code was typed.'])
    body += '</div>'
    return L.doc('Small items 8 · Calls', L.helmet(s) + CSS, body, 1612)
