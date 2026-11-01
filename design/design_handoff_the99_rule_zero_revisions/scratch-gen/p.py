"""2 + 3 · Your deck tonight: seated left of the chip; Change deck as a modal on desktop."""
import lib as L, re
P = L.rz('R1 - Swap-Phone.dc.html'); DS = L.rz('R2 - Swap-Desktop.dc.html')

CSS = """<style>
.dopt .zst{font:10px 'IBM Plex Mono',monospace;color:var(--fg-faint);flex:none;width:38px;text-align:right}
.zscrim{position:absolute;inset:0;z-index:20;background:color-mix(in oklab,var(--bg) 72%,transparent)}
.zmod{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:21;width:480px;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface-raised);box-shadow:0 40px 100px rgba(0,0,0,.7);display:flex;flex-direction:column;overflow:hidden}
.zmod .zmh{display:flex;align-items:center;justify-content:space-between;min-height:43px;padding:10px 8px 0 20px}
.zmod .zmh b{font:600 16px 'IBM Plex Sans';color:var(--fg)}
.zmod .zx{width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:14px}
.zmod .zml{margin:2px 20px 0;font-size:13px;line-height:1.55;color:var(--fg-muted)}
.zmod .zmb{padding:12px 12px 14px;display:flex;flex-direction:column;gap:2px}
.zload{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:230px;text-align:center;border-radius:10px;background:radial-gradient(380px 200px at 50% 70%,color-mix(in oklab,var(--accent) 8%,transparent),transparent 70%)}
.zload h3{margin:20px 0 0;font:700 18px 'Cinzel',serif;color:var(--fg)}
.zload p{margin:8px 0 0;font:12px 'IBM Plex Mono';color:var(--fg-faint)}
.zfail{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:14px 8px 6px}
.zfail p{margin:0;font-size:13.5px;color:var(--fg-body)}
.ztoast{position:absolute;right:22px;bottom:22px;width:380px;z-index:12;display:flex;align-items:center;gap:12px;min-height:52px;padding:6px 6px 6px 16px;border-radius:12px;background:#29241F;border:1px solid var(--border-strong);box-shadow:0 16px 40px rgba(0,0,0,.6);font-size:13.5px;color:var(--fg)}
.ztoast span{flex:1}
</style>"""
CROWN = ('<svg width="34" height="28" viewBox="0 0 20 16" fill="none" stroke="var(--accent)" stroke-width="1.3" stroke-linejoin="round">'
         '<path d="M2 13 3.4 4.5l3.2 3.6L10 2l2.4 6.1 3.2-3.6L17 13z"/><path d="M2 15h15"/></svg>')


def frame(s, lab):
    return L.frame(s, f'<span class="k">{lab}')


S3 = frame(P, 'S3 ')
PH_NOW = L.first(S3, '<div class="ph"')
ROWS = re.findall(r'<button class="dopt[^"]*".*?</button>', PH_NOW)
SEATED = '<span class="mono" style="font-size:10px;color:var(--fg-faint);margin-left:6px">seated</span>'


def fix(row):
    """seated moves left of the chip into a fixed slot, so every chip's right edge lines up."""
    seated = SEATED in row
    row = row.replace(SEATED, '')
    slot = f'<span class="zst">{"seated" if seated else ""}</span>'
    i = row.find('<span class="chip"')
    if i < 0:  # an unready row: no chip, the slot sits where the chip would end
        return row
    return row[:i] + slot + row[i:]


NEW_ROWS = [fix(r) for r in ROWS]
PH_NEW = PH_NOW
for a, b in zip(ROWS, NEW_ROWS):
    PH_NEW = PH_NEW.replace(a, b, 1)
PH_NEW = PH_NEW.replace('<div class="shb"', '<div class="shb znew"', 1)
PH_NOW = PH_NOW.replace('<div class="shb"', '<div class="shb zold"', 1)

W1 = L.first(frame(DS, 'W1 '), '<div class="dk"')
W2 = L.first(frame(DS, 'W2 '), '<div class="dk"')
W3 = L.first(frame(DS, 'W3 '), '<div class="dk"')
W3 = re.sub(r'(<div class="[^"]*apanel|<div class="pnl)', r'\1', W3)


def modal(body, lead=True):
    ld = '<p class="zml">Nearest the table first. Everyone sees the change on their next look.</p>' if lead else ''
    return ('<div class="zscrim"></div><div class="zmod znew" role="dialog"><div class="zmh"><b>Your deck tonight</b><span class="zx">✕</span></div>'
            f'{ld}<div class="zmb">{body}</div></div>')


def over(dk, extra):
    return dk[:-6] + extra + '</div>'


ROWS_HTML = "".join(NEW_ROWS)
LOADING = f'<div class="zload">{CROWN}<h3>Finding your decks</h3></div>'
FAILED = ('<div class="zfail"><p role="alert">We couldn’t load your decks. Try again.</p>'
          '<button class="btn gho sm" type="button">Try again</button></div>')
TOAST_FAIL = '<div class="ztoast" role="alert"><span>We couldn’t change your deck. Try again.</span></div>'


def build():
    body = L.head('2 + 3 · Your deck tonight',
                  '“seated” sits left of the chip; on desktop the picker is a modal',
                  'Ruling 2: in Change deck’s list the mono <code>seated</code> tag moves left of the bracket chip, so every chip ends at the same edge. '
                  'Ruling 3: from <code>md</code> Change deck opens the shipped <code>ModalChrome</code> at 480 over a scrim, in place of the 420px anchored panel. '
                  'Drawn over S3 and W1–W3 (Colin’s table, your Zimone Combo seated).')
    body += L.row(
        L.fr('<b>Now</b> · 390 · S3', PH_NOW, '<code>seated</code> sits after the chip, so the seated row’s chip stands 44px left of the others.', 390),
        L.fr('<b>Proposed</b> · 390 · seated, unseated, unready', PH_NEW,
             '<b>One slot before the chip.</b> Every row keeps a 38px slot left of its chip, holding <code>seated</code> on the seated row and nothing on the others, so the chips’ right edges line up and their marks share a column. The seated row keeps its <code>--elevated</code> ground. An unready row (Temur Pile, 94 of 100) has no chip and stays at 45%; seated and unready, its slot holds <code>seated</code> at the right edge.', 390))
    body += L.row(L.fr('<b>Now</b> · 1300 · W3 · the anchored panel', W3, 'Hangs from the link under your seat and covers the next seats; the read stays visible beside it.', 1300))
    body += L.row(L.fr('<b>Proposed</b> · 1300 · the modal over the table', over(W1, modal(ROWS_HTML)),
                       '<b>ModalChrome, 480.</b> Title <i>Your deck tonight</i> in the 43px head with a bare ✕; <code>swap.sheetSub</code> as its lead (it already says nearest first, so the panel’s <i>nearest first</i> head goes). The same rows as the phone. The scrim covers the rail and the page at 72% <code>--bg</code>, so the table stays readable behind the choice. Escape, the scrim or ✕ close it and return focus to Change deck; picking a row closes it and swaps.', 1300))
    body += L.row(L.fr('<b>Proposed</b> · 1300 · busy · the list is loading', over(W1, modal(LOADING)),
                       '<b>Opens at once.</b> The modal opens on the press and holds the shipped <code>SheetLoading</code> (compact) until the list arrives, so the press always answers. Heading <i>Finding your decks</i>' + L.DRAFT + '.', 1300))
    body += L.row(L.fr('<b>Proposed</b> · 1300 · failed · the list did not arrive', over(W1, modal(FAILED)),
                       '<b>Said in the modal.</b> <code>swap.loadFailed</code> as an alert, and <i>Try again</i> (the ghost button the app uses) reloads in place. A lapsed grant is not this: it answers null and the page’s next check draws the closed table, as shipped.', 1300))
    body += L.row(L.fr('<b>Unchanged</b> · 1300 · after a pick · W2', W2,
                       'Picking Sai Thopters closes the modal and swaps: the read redraws, the seat says <i>changed just now</i>, and the shared toast says <code>swap.toast</code> with Undo, bottom right.', 1300))
    body += L.row(L.fr('<b>Proposed</b> · 1300 · the swap was refused', over(W1, TOAST_FAIL),
                       'A swap or Undo the server refused: the shared toast, <code>swap.failed</code>, role alert. The modal is already closed and the seat keeps its deck.', 1300))
    body += L.rule('The calls', [
        '<b>Seated slot:</b> a fixed slot (38px, right-aligned mono 10px <code>--fg-faint</code>) between the name and the chip on every row, empty unless seated. Engineering: in <code>change-deck.tsx</code> <code>Row</code>, render the tag span before <code>DeckRowChip</code> on every row with its fixed width.',
        '<b>Modal from <code>md</code>:</b> <code>ModalChrome</code> <code>width={480}</code>, <code>fit</code>, title <code>swap.sheetTitle</code>, <code>lead</code> <code>swap.sheetSub</code>, close <code>swap.close</code>. Below <code>md</code> the shipped Sheet is unchanged (S3 as proposed above). <code>useAnchoredPanel</code> and the outside-click handler leave Change deck.',
        '<b>Rail and search:</b> the modal is the app’s modal layer, above the rail and the search layer, like every ModalChrome sheet: nothing new. The width is 480, the narrowest ModalChrome step, because a row is art, two lines and a chip.',
        '<b>Busy on the phone</b> stays as shipped (the link is <code>aria-busy</code>; the failed line sits beside it). Only the modal opens before its list.'])
    return L.doc('Rule 0 revisions · Your deck tonight', L.helmet(P) + CSS, body, 2000)
