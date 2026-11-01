"""Errata (B) · where engineering shipped a shared component or default in place of the board. Each is drawn as the
board had it and as built, measured from the shipped classes, with the call. All are confirmed as built."""
import lib9 as L

CSS = """<style>
.er9{display:flex;flex-direction:column;gap:18px;max-width:1880px}
.er9 .it{display:grid;grid-template-columns:300px 1fr 1fr;gap:28px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:20px 24px;align-items:start}
.er9 .it h4{margin:0 0 6px;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.er9 .it .v{display:inline-block;margin-top:10px;font:600 10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:#14110E;background:var(--success);border-radius:4px;padding:3px 7px}
.er9 .it p{margin:0;font-size:13px;line-height:1.55;color:var(--fg-body)}
.er9 .it p+p{margin-top:6px}
.er9 .sp{display:flex;flex-direction:column;gap:10px}
.er9 .sl{font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.er9 .sl.b{color:var(--accent-text)}
.er9 .st{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:12px;align-items:flex-start;position:relative;min-height:90px}
.er9 .ms{font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
/* segmented */
.er9 .well{display:inline-flex;gap:3px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-sunken);padding:2px}
.er9 .well span{display:inline-flex;align-items:center;padding:0 13px;border-radius:7px;color:var(--fg-muted);height:40px}
.er9 .well span.on{background:var(--elevated);color:var(--fg)}
.er9 .well.bd span{font-size:14px;padding:0 14px}
.er9 .well.bt span{font-size:13px}
.er9 .hair{width:1px;height:28px;background:var(--border-strong);display:inline-block;margin:0 10px;vertical-align:middle}
/* toast */
.er9 .tst{display:flex;align-items:center;gap:12px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:10px;padding:0 6px 0 14px;box-shadow:0 10px 26px rgba(0,0,0,.45);font-size:13.5px;color:var(--fg)}
.er9 .tst .ok{color:var(--success)}
.er9 .tst a{margin-left:auto;font:600 13.5px 'IBM Plex Sans';color:var(--accent-text);padding:0 10px;min-height:44px;display:flex;align-items:center}
.er9 .tst a.u{text-decoration:underline;text-underline-offset:2px}
.er9 .tst .x{color:var(--fg-faint);padding:0 8px}
.er9 .slot{width:100%;height:120px;border:1px dashed var(--border-strong);border-radius:8px;position:relative}
.er9 .slot .tst{position:absolute;bottom:12px}
/* sheet + select */
.er9 .sel{height:44px;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border-strong);border-radius:9px;padding:0 12px;font-size:16px;color:var(--fg)}
.er9 .sel.b{font-size:14px;height:40px}
.er9 .lnk{font-size:13.5px;color:var(--accent-text);text-decoration:underline;display:inline-flex;align-items:center;border:1px dashed var(--border);border-radius:4px}
/* modal */
.er9 .md{width:100%;max-width:420px;border:1px solid var(--border-strong);background:var(--surface);box-shadow:0 18px 40px rgba(0,0,0,.5)}
.er9 .md .hd{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);padding:0 6px 0 18px}
.er9 .md .hd b{color:var(--fg)}
.er9 .md .hd i{font-style:normal;color:var(--fg-muted);display:flex;align-items:center;justify-content:center}
.er9 .md .bd{padding:16px 18px;font-size:13px;color:var(--fg-body);display:flex;flex-direction:column;gap:10px;align-items:center}
.er9 .crown{font-size:20px;color:var(--accent-text)}
.er9 .dia3{display:flex;gap:6px}.er9 .dia3 i{width:7px;height:7px;transform:rotate(45deg);background:var(--accent);opacity:.5}.er9 .dia3 i:nth-child(2){opacity:1}
.er9 .key{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;font-size:11.5px;color:var(--fg-muted);border:1px solid var(--border);border-radius:8px;padding:10px 12px;width:330px}
.er9 .key span{display:flex;align-items:center;gap:7px}
.er9 .key i{display:inline-block;border:1.5px solid var(--fg-muted);transform:rotate(45deg);flex:none}
</style>"""


def item(title, body, board, built, verdict='Confirmed as built'):
    return (f'<div class="it"><div><h4>{title}</h4>{body}<span class="v">{verdict}</span></div>'
            f'<div class="sp"><span class="sl">Board</span><div class="st">{board}</div></div>'
            f'<div class="sp"><span class="sl b">As built · the handoff follows</span><div class="st">{built}</div></div></div>')


def seg(cls, labels=('Decks', 'Games', 'Stats'), on=1, hair=False):
    s = ''.join(f'<span class="{"on" if i == on else ""}">{t}</span>' for i, t in enumerate(labels))
    return f'<div><span class="well {cls}">{s}</span>{"<span class=hair></span>" if hair else ""}</div>'


def toast(txt, undo='Undo', u=False, w=356, h=58, ok=True, x=False):
    return (f'<div class="tst" style="width:{w}px;min-height:{h}px">{"<span class=ok>✓</span>" if ok else ""}<span>{txt}</span>'
            f'<a class="{"u" if u else ""}">{undo}</a>{"<span class=x>✕</span>" if x else ""}</div>')


def slot(t, where):
    pos = {'right': 'right:12px', 'centre': 'left:50%;transform:translateX(-50%)', 'phone': 'left:12px;right:12px'}[where]
    return f'<div class="slot">{t.replace("<div class=\"tst\" style=\"", f"<div class=\"tst\" style=\"{pos};")}</div>'


def modal(title_font, x, hh, r, loader):
    return (f'<div class="md" style="border-radius:{r}px"><div class="hd" style="height:{hh}px"><b style="font:{title_font}">Your deck tonight</b>'
            f'<i style="width:{x}px;height:{x}px">✕</i></div><div class="bd">{loader}<span>Finding your decks</span></div></div>')


def key(px, h):
    labs = ['Game changers', 'Mass land denial', 'Extra turns', 'Two-card infinites', 'Tutors']
    return f'<div class="key" style="min-height:{h}px">' + ''.join(f'<span><i style="width:{px*0.7:.0f}px;height:{px*0.7:.0f}px"></i>{t}</span>' for t in labs) + '</div>'


def build():
    b = L.head('Errata (B) · shared components shipped in place of the board',
               'All ten confirmed as built',
               'Where engineering used the app’s shared component or default instead of a board’s one-off, the shared piece wins: '
               'it is what every other page draws, and Hugh’s standing rule is to match the shipped UI. Each is drawn as the board had it and as built (from the shipped classes). '
               'The handoff PR adds these errata to the three handoffs; no build work follows.')
    rows = []
    rows.append(L.sec('B1 · Game history (<code>design_handoff_the99_game_history</code>)'))
    rows.append(item('Decks · Games · Stats switch',
                     '<p>Built as the shared compact <code>SegmentedSwitch</code> (the /decks switch’s own): 195×46 with 13px text, plus the view row’s hairline between it and the deck select.</p>'
                     '<p>Board: 207×46, 14px, no hairline. The shared one matches Cart’s and Matchups’ switches.</p>',
                     seg('bd') + '<span class="ms">207 × 46 · 14px</span>', seg('bt', hair=True) + '<span class="ms">195 × 46 · 13px · hairline before the select</span>'))
    rows.append(item('The failed-read toast',
                     '<p>Built as the shared <code>ToastFrame</code>, centred, 358×54. Board: pinned right, 356×58.</p><p>Every other desktop toast outside a deck page sits centred; the deck stack is the one exception (item 6d).</p>',
                     slot(toast('We couldn’t load your games.', 'Try again', ok=False, w=356, h=58), 'right'),
                     slot(toast('We couldn’t load your games.', 'Try again', u=True, ok=False, w=358, h=54), 'centre')))
    rows.append(item('Filters and the deck select',
                     '<p>Filter games uses the shared <code>Sheet</code> (grip, head, foot) the board traced. The deck select is 16px below <code>md</code> so iOS doesn’t zoom on focus, as every input in the app.</p>',
                     '<span class="sel b">HD - Sai ▾</span><span class="ms">14px at 390</span>',
                     '<span class="sel">HD - Sai ▾</span><span class="ms">16px below md, 14px from md with a fine pointer</span>'))
    rows.append(L.sec('B2 · Add a card from anywhere (<code>design_handoff_the99_add_card_anywhere</code>)'))
    rows.append(item('The save toast',
                     '<p>Built as <code>ToastFrame</code> on <code>--surface-raised</code>, centred, Undo underlined (the shared action link). Board: bottom right on desktop, 12px sides on the phone, a success ✓, Undo plain.</p>'
                     '<p>The ✓ stays (the shared success tone); Undo underlined; centred. On a deck page it joins the deck stack instead (item 6d).</p>',
                     slot(toast('Saved. Ghalta, Primal Hunger ×1.', w=356, h=58), 'right'),
                     slot(toast('Saved. Ghalta, Primal Hunger ×1.', u=True, w=358, h=54), 'centre')))
    rows.append(item('The receipt’s link (Add to collection / Edit copies)',
                     '<p>Built as the shared text link: regular weight, underline offset 2, 44px tall on the phone (the touch rule), padding 18/20. Board: 500, offset 3, 32px, 14/16.</p>',
                     '<span class="lnk" style="font-weight:500;text-underline-offset:3px;height:32px;padding:0 16px">Add to collection</span><span class="ms">500 · offset 3 · 32 tall</span>',
                     '<span class="lnk" style="font-weight:400;text-underline-offset:2px;height:44px;padding:0 20px">Add to collection</span><span class="ms">400 · offset 2 · 44 tall on the phone</span>'))
    rows.append(L.sec('B3 · Rule 0 revisions (<code>design_handoff_the99_rule_zero_revisions</code>)'))
    rows.append(item('Close confirm chrome',
                     '<p>Built on the app’s shared <code>ModalChrome</code> (desktop) and <code>Sheet</code> (phone) chrome, as the README asked; the board drew its own copies of them.</p>',
                     '<span class="ms">hand-drawn sheet and 480 modal</span>', '<span class="ms">ModalChrome 480 · Sheet fit · shared head, 44px ✕</span>'))
    rows.append(item('One toast column',
                     '<p>The seat toast shares the desktop bottom-right slot with the cart receipt, so one column holds both, 10px apart, the receipt (Undo) on the floor.</p>',
                     slot(toast('Colin seated you at Thursday night’s table.', 'Open', ok=False, w=380, h=58, x=True), 'right'),
                     '<div class="slot" style="height:150px"><div class="tst" style="position:absolute;right:12px;bottom:76px;width:380px;min-height:54px"><span>Colin seated you at Thursday night’s table.</span><a class="u">Open</a><span class="x">✕</span></div>'
                     '<div class="tst" style="position:absolute;right:12px;bottom:12px;width:380px;min-height:54px"><span class="ok">✓</span><span>Added to the cart.</span><a class="u">Undo</a></div></div>'))
    rows.append(item('The read’s key marks',
                     '<p><code>MarkKey</code>’s marks are 16px (board 12), so the key is 60px tall, not 51. The shared key is the same in every view.</p>',
                     key(12, 51) + '<span class="ms">12px marks · 51 tall</span>', key(16, 60) + '<span class="ms">16px marks · 60 tall</span>'))
    rows.append(item('Change deck modal',
                     '<p>Shared <code>ModalChrome</code>: Cinzel title, 44px ✕, 49px head, radius 14, and <code>SheetLoading</code>’s three diamonds. Board: Plex Sans 16, 36px ✕, 46px head, radius 10, a crown.</p>',
                     modal("600 16px 'IBM Plex Sans'", 36, 46, 10, '<span class="crown">♛</span>'),
                     modal("400 18px 'Cinzel',serif", 44, 49, 14, '<span class="dia3"><i></i><i></i><i></i></span>')))
    b += '<div class="er9">' + ''.join(rows) + '</div>'
    b += L.rule('The call', [
        '<b>Confirm all as built.</b> The shared component is the design; the boards drew one-offs before the shared piece was picked. No code change.',
        'The handoff PR records each in the three handoffs’ READMEs as an erratum pointing here, so the next round draws from the built sizes.',
        'One rule going forward: a board that uses a toast, sheet, modal, switch, key or text link draws the shared one at its shipped size.'])
    return L.doc('Small items 9 · Errata', CSS, b, 1880)
