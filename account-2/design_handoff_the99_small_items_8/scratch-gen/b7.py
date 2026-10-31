"""Errata i to iv: the 2-credit lines as built, the cap input sizes, the sticky head and the offer layers."""
import lib8 as L
s = L.load('design_handoff_the99_small_items_7/SC-Cost.dc.html')
CSS = """<style>
.er8{display:grid;grid-template-columns:150px 358px 760px;gap:18px 34px;align-items:start;max-width:1400px}
.er8 .eh{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.er8 .st{font-size:13px;line-height:1.5;color:var(--fg-body)}
.er8 .st b{color:var(--fg);display:block;font-weight:600}
.row8{border:1px solid var(--border);border-radius:10px;background:var(--surface-sunken);padding:12px 14px}
.row8.p{display:flex;flex-direction:column;gap:8px;align-items:stretch}
.row8.d{display:flex;align-items:center;gap:14px}
.btn8{box-sizing:border-box;border:1px solid var(--accent);border-radius:8px;color:var(--accent-text);font:600 13.5px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;height:44px}
.row8.d .btn8{height:auto;padding:11px 20px;font-size:14px;flex:none}
.btn8.off{border-color:var(--border-strong);color:var(--fg-locked)}
.ln8{font:9.5px/1.55 'IBM Plex Mono';color:var(--fg-faint);text-align:center}
.row8.d .ln8{font-size:11px;line-height:1.5;text-align:left}
.ln8 .w{color:var(--fg-body)}
.ln8 .n{color:var(--warning)}
.ln8 .pd{background:rgba(207,135,69,.14);border-radius:3px;padding:0 2px}
.stop8{display:flex;flex-direction:column;gap:6px;font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint);text-align:left}
.stop8 b{font:500 12.5px/1.5 'IBM Plex Sans';color:var(--fg)}
.stop8 .r{display:flex;gap:14px}
.stop8 .r i{font:600 12.5px 'IBM Plex Sans';font-style:normal;color:var(--accent-text);min-height:32px;display:flex;align-items:center}
.cap8{display:flex;flex-direction:column;gap:6px}
.cap8 small{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.cap8 .f{display:flex;align-items:center;gap:6px;height:40px;border-radius:9px;border:1px solid var(--border-strong);background:var(--surface);padding:0 10px;font-family:'IBM Plex Mono'}
.cap8 .f i{font-style:normal;color:var(--fg-faint);font-size:14px}
.cap8 .f span{color:var(--fg)}
.ok8{display:inline-block;font:600 9px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#6FA368;border-radius:3px;padding:1px 5px;margin-top:6px}
</style>"""
HINT = 'usually about 40 seconds'


def p(line, two=True, btn='Suggest changes', off=False):
    h = f'<br>{HINT}' if two else f' · {HINT}'
    return f'<div class="row8 p"><span class="btn8{" off" if off else ""}">{btn}</span><span class="ln8">{line}{h}</span></div>'


def d(line, off=False):
    return f'<div class="row8 d"><span class="btn8{" off" if off else ""}">Suggest changes</span><span class="ln8">{line} · {HINT}</span></div>'


def stop(sentence, standing, ph):
    more = '<i>Get more credits</i>'
    box = f'<div class="stop8"><b>{sentence}</b><div class="r"><i>Change to 10</i>{more}</div><span>{standing}</span></div>'
    if ph:
        return f'<div class="row8 p"><span class="btn8 off">Suggest changes</span>{box}</div>'
    return f'<div class="row8 d" style="align-items:flex-start"><span class="btn8 off">Suggest changes</span>{box}</div>'


def row(head, state, ph, dk):
    return f'<span class="st"><b>{head}</b>{state}</span>{ph}{dk}'


B = 'Uses 2 welcome credits. <span class="w">A free credit covers up to 10.</span> 1 of 1 free · 15 welcome.'
Bn = '<span class="n">trying again usually works</span> · ' + B
D = 'Uses 2 paid credits. <span class="w">A free credit covers up to 10.</span> 0 of 1 free · reset at 2:01 AM · 8 paid.'
E0 = 'Uses 2 free credits. <span class="w">A run above 10 counts 2.</span> 5 of 5 left, 3 after this run.'
E1 = 'Uses 2 free credits. <span class="w">A run above 10 counts 2.</span> 4 of 5 free, 2 after this run · reset at 2:01 AM <span class="pd">· 8 paid</span>.'
ONE = 'Uses a credit. 1 of 1 free · 15 welcome.'
C_FREE = 'A run of 12 uses 2 credits. A free credit covers up to 10.'
C_LOT = 'This run costs 2 credits. Ask for 10 changes or fewer to use 1.'


def build():
    body = L.head('Errata i–iv · for the record',
                  'Small items 7’s 2-credit lines as built, and three confirmations',
                  'Each line below is the shipped string, composed as <code>tuning-panel.tsx</code> composes it today. '
                  'Where Small items 7 drew it differently, this board replaces that drawing. Phone (358 wide, the line centred) and desktop (left) for each.', tag='ERRATA')
    g = '<div class="er8"><span class="eh">State</span><span class="eh">390</span><span class="eh">1300</span>'
    g += row('(i) C · only the free run left',
             'No credit used today, so no reset time: the standing line is <i>1 of 1 free</i>. <span class="ok8">CONFIRMED</span>',
             stop(C_FREE, '1 of 1 free', True), stop(C_FREE, '1 of 1 free', False))
    g += row('(i) E · nothing used yet',
             '<i>· reset at</i> joins only once a credit is used. <span class="ok8">CONFIRMED</span>', p(E0), d(E0))
    g += row('(ii) E · with paid credits held',
             'The paid segment follows <i>N after this run</i> (and the reset). <span class="ok8">CONFIRMED</span>', p(E1), d(E1))
    g += row('(ii) B · a state note',
             'The state’s own note (here a failure’s) stays first, then the 2-credit line. <span class="ok8">CONFIRMED</span>', p(Bn), d(Bn))
    g += row('(ii) D · paid, free spent',
             'The source line, then the count; the reset shows because a credit was used.', p(D), d(D))
    g += row('(ii) the wait hint, 1 credit',
             'On the phone the hint takes its own line only on a 2-credit line; a 1-credit line keeps it inline. <span class="ok8">CONFIRMED</span>', p(ONE, two=False), d(ONE))
    g += row('(ii) C · no free run, one lot credit',
             'With nothing free to spend, C reuses the shipped <code>costsTwo</code> sentence; <code>costsTwoFree</code> only while the free allowance holds one. <span class="ok8">CONFIRMED</span>',
             stop(C_LOT, '0 of 1 free · reset at 2:01 AM · 1 welcome', True), stop(C_LOT, '0 of 1 free · reset at 2:01 AM · 1 welcome', False))
    cap = lambda sz, v: f'<div class="row8"><div class="cap8"><small>Most per card</small><span class="f"><i>$</i><span style="font-size:{sz}px">{v}</span></span></div></div>'
    g += row('(iii) the limit box cap',
             '16px on a phone, so iOS doesn’t zoom on focus; 14px from <code>md</code>. As built it is 14px only at <code>md</code> with a fine pointer, so an iPad keeps 16. <span class="ok8">CONFIRMED</span>',
             cap(16, '5'), cap(14, '5'))
    g += '</div>'
    body += g
    body += L.rule('(iv) and the record', [
        '<b>(iv) Results’ sticky list head</b> is opaque on <code>--surface-sunken</code>, as History’s (#2491; Small items 7 addendum 3). Confirmed; nothing to redraw.',
        '<b>(iv) Small items 6, 6b</b>: on the closed What’s new offer, Pick is layered above the ✕ with both positions unchanged (#2476; Small items 7 addendum 9). Confirmed.',
        '<b>(i)</b> replaces Small items 7 <code>SC-Cost</code> C and E, which showed <i>· reset at 2:01 AM</i> before any credit was used.',
        '<b>(ii)</b> replaces SC-Cost B and D’s why line (<i>Your free run covers up to 10</i>) with the copy-reviewed <code>whyLot</code>, <i>A free credit covers up to 10.</i>',
        '<b>(iii)</b> records the fine-pointer condition, which the erratum’s “14px at md and up” leaves out. Recommend keeping it.'])
    return L.doc('Small items 8 · Errata', L.helmet(s) + CSS, body, 1500)
