"""Item 2 · Report a problem (/report): (a) a signed-in reader inside the shell, (b) the Fan Content notice signed out,
(c) the signed-out 90-day line. Drawn over Small items 8's Report frames (themselves Small items 7's Report-Crash) in
the flyer kit, with the shell lifted from Small items 7's CSV board."""
import re
import lib9 as L
r = L.load('small_items_8_Report.dc.html')
c = L.load('small_items_7_CSV.dc.html')
SC = 'rp9'
R1 = L.screen(L.frame_by_label(r, '<b>R1</b> · /report · 390'))
R3 = L.screen(L.frame_by_label(r, '<b>R3</b> · /report · 1300'))
C4 = L.screen(L.frame_by_label(c, '<b>C4</b>'))
C3 = L.screen(L.frame_by_label(c, '<b>C3</b>'))
MHD = L.block(C4, C4.find('<div class="mhd">'))
TBAR = L.block(C4, C4.find('<div class="tbar">'))
RAIL = L.block(C3, C3.find('<div class="rail">'))
CRW = L.block(R1, R1.find('<div class="cr7">'))
FORM = L.block(R1, R1.find('<div class="rp7">'))
FORMD = L.block(R3, R3.find('<div class="rp7">'))
NOCODE = '<p class="code7">Sent with error 7f3a91c2</p>'

FAN1 = ('The 99 is unofficial Fan Content permitted under the <u>Fan Content Policy ↗</u>. Not approved/endorsed by Wizards. '
        'Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.')
FAN2 = ('Card images and mana symbols are copyright Wizards of the Coast, LLC. Card data and images from Scryfall; prices from '
        'Mana Pool. Not affiliated with Wizards of the Coast, Scryfall or Mana Pool.')


def fan(desk=False):
    return f'<div class="fan9{" d" if desk else ""}"><div><p>{FAN1}</p><p>{FAN2}</p></div></div>'


NOTE = '<p class="anon9 new9">Reports sent while signed out are deleted after 90 days.</p>'

CSS = """<style>
.rp9 .fan9{flex:none;min-height:max-content;align-self:stretch;width:100%;border-top:1px solid var(--border);padding:20px 16px 24px}
.rp9 .fan9 div{max-width:720px;margin:0 auto;text-align:center;font:11px/16px 'IBM Plex Sans';color:var(--fg-muted)}
.rp9 .fan9.d{padding:22px 34px 28px}.rp9 .fan9.d div{font-size:12px;line-height:18px}
.rp9 .fan9 p{margin:0}.rp9 .fan9 p+p{margin-top:6px}
.rp9 .fan9 u{text-decoration-color:var(--fg-faint);text-underline-offset:2px}
.rp9 .anon9{margin:-4px 0 0;font:12.5px/1.5 'IBM Plex Sans';color:var(--fg-muted)}
.rp9 .two9{outline:1.5px dashed var(--danger);outline-offset:3px;border-radius:6px}
.rp9 .sc9{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.rp9 .grow9{flex:1}
</style>"""


def phone(inner, h=844):
    return f'<div class="ph" style="height:{h}px">{inner}</div>'


def desk(inner, h=820, rail=True):
    return f'<div class="dk" style="width:1300px;height:{h}px">{RAIL if rail else ""}<div class="main" style="display:flex;flex-direction:column">{inner}</div></div>'


def form(f, note=False, code=False):
    if not code:
        f = f.replace(NOCODE, '')
    if note:
        f = L.sub1(f, '<div class="rft">', NOTE + '<div class="rft">')
    return f


def build():
    b = L.head('2 · Report a problem · /report',
               'One wordmark, the legal line, and the 90-day line',
               '/report is drawn in the newcomer frame for every reader (<code>REPORT_MAIN</code>). Signed in, the shell wraps it, so two wordmarks show. '
               'Signed out, the shell’s bare branch adds the Fan Content notice under it. Drawn over Small items 8’s Report frames in the flyer kit; '
               'the shell is Small items 7’s. New pieces carry a dashed outline; today’s fault is outlined in red. Phones are 844 tall.')
    # (a) signed in
    today = phone(MHD + '<div class="pb">' + CRW.replace('class="cr7"', 'class="cr7 two9"') + form(FORM) + '</div>' + TBAR)
    a1 = phone(MHD + '<div class="pb">' + form(FORM) + '</div>' + TBAR)
    a2 = desk(form(FORMD))
    b += L.sec('2a · signed in: the shell is the frame')
    b += L.frames(
        L.fr('<span class="now">as shipped</span><b>A0</b> · 390 · signed in', today,
             'The shell’s header draws the wordmark, and the newcomer frame draws <code>CrashWordmark</code> under it. Two marks, and the form starts 150px down.', SC),
        L.fr('<span class="rec">call</span><b>A1</b> · 390 · signed in', a1,
             '<b>Signed in, the page is a shell page.</b> No <code>CrashWordmark</code>, no newcomer frame: the form sits in the shell’s content column under its header, with the tab bar. '
             '<i>‹ Back home</i> stays. Send failed keeps the shell’s toast slot above the tab bar, as the in-app sheet does.', SC),
        L.fr('<span class="rec">call</span><b>A2</b> · 1300 · signed in', a2,
             'The rail, and the same 520 column centred in the page. Nothing selected in the rail: /report is no place of its own.', SC, 760),
    )
    # (b) + (c) signed out
    o1 = phone('<div class="pb"><div class="sc9">' + CRW + form(FORM, note=True) + '<div class="grow9"></div>' + fan() + '</div></div>', 1090)
    o2 = desk('<div class="sc9">' + CRW + form(FORMD, note=True) + '<div class="grow9"></div>' + fan(True) + '</div>', 920, rail=False)
    b += L.sec('2b + 2c · signed out: the Fan Content notice, and the 90-day line')
    b += L.frames(
        L.fr('<span class="rec">call</span><b>B1</b> · 390 · signed out, scrolled to the end', o1,
             '<b>The notice stays.</b> It closes every page signed in or out (launch epic A1); the board left it out. It sits in the page’s flow under the form, centred, '
             'never fixed: a phone sees it only once scrolled to the end, as drawn (the phone is drawn 1090 tall here).<br><br>'
             '<b>The 90-day line</b> sits between the attachment line and Send, in the form, only for a signed-out reader: '
             '<i>Reports sent while signed out are deleted after 90 days.</i>' + L.DRAFT, SC),
        L.fr('<span class="rec">call</span><b>B2</b> · 1300 · signed out', o2,
             'No rail signed out. The notice centred under the column, 22/28 padding, 12px, as the signed-out shell draws it on <code>/join</code>.', SC, 760),
    )
    b += L.rule('The calls', [
        '<b>(a) Signed in:</b> /report draws as a shell page. The page drops <code>CrashWordmark</code> and <code>REPORT_MAIN</code> when <code>userId</code> is set; '
        'the form keeps its 520 column, centred from <code>md</code>, under <i>‹ Back home</i>. The tab bar and rail draw as on any page; the failed-send toast takes the shell’s own slot.',
        '<b>(b) Signed out:</b> confirm the shipped Fan Content notice under the page. It is the one legal line every page carries; the Small items 7 board simply ended at the form.',
        '<b>(c) The 90-day line</b>, signed out only, in <code>--fg-muted</code> 12.5/1.5, between the attachment line and Send: '
        '<i>Reports sent while signed out are deleted after 90 days.</i> (DRAFT, <code>reportCopy.anonRetention</code>; the sweep is <code>ANON_REPORT_RETENTION_DAYS</code>). '
        'Signed-in reports keep the account’s own rules, so no line.',
        'The crash screen (no shell, no router) and the sent and failed states are unchanged.'])
    return L.doc('Small items 9 · Report a problem', L.scope(L.helmet(r), SC) + CSS, b, 2000)
