"""Item 2 · Toasts, app-wide: one rule. Hide's failed toast (hide_commander/Undo) and game history's failed read
(game_history/Edges X1, X2) redrawn on the shipped ToastFrame centre, plus the rule and the specimens."""
import lib10 as L
U = L.load('design_handoff_the99_hide_commander/Undo.dc.html')
G = L.load('design_handoff_the99_game_history/Edges.dc.html')
H1, G1 = 'hc10', 'gh10'
TRY = 'Try again'


def hide(lab, phone):
    f = L.frame_by_label(U, lab); scr = L.unmark(L.screen(f))
    i = scr.find('<div class="toast"'); old = L.block(scr, i)
    scr = scr.replace(old, L.toast('We couldn’t hide Ghalta, Primal Hunger.', TRY, phone))
    if not phone:
        i = scr.find('<div class="dk"'); scr = scr[:i] + scr[i:].replace('>', '>' + L.centre_line(), 1)
    return scr


def games(lab, phone):
    f = L.frame_by_label(G, lab); scr = L.screen(f)
    i = scr.find('<div class="tst2"'); old = L.block(scr, i)
    scr = scr.replace(old, L.toast('We couldn’t load your games.', TRY, phone))
    if not phone:
        i = scr.find('<div class="dk"'); scr = scr[:i] + scr[i:].replace('>', '>' + L.centre_line(), 1)
    return scr


def build():
    b = L.head('Small items 10 · R1 · account 2 · 2026-11-02 · item 2 · toasts, app-wide',
               'One toast: the shipped one',
               'Recent boards drew three toasts: 358 wide over the main column at radius 12 (game history, a status dot and ✕ too), and Hide’s with an outlined '
               '<i>Try again</i>. The app ships one: <code>ToastFrame</code> (<code>edit-toast.tsx</code>), 420 wide, centered on the window, radius 10, with a plain '
               '<i>Try again</i>. <b>The call: the shipped toast is the rule, on every board.</b> On a 390 phone the two agree (420 is capped at the window less 32, which is 358); '
               'they part at 1300, where the boards centered on the content and the app centers on the window. Nothing new is built; three toasts come into line.')
    b += L.sec('The rule, at 390 and 1300')
    b += L.frames(
        L.fr('<b>T1</b> · 390 · Hide refused on a For you row', hide('<b>12 · Hide failed</b> · 390', True),
             'Hide’s toast with the shipped action: <b>Try again</b> as a text press in <code>--accent-text</code>, 600 13.5, underlined, 44px tall. '
             'The outlined 36px button goes. The line is the shipped <code>rowHideRefused</code>; the press carries the retry, so the line does not repeat it.', H1),
        L.fr('<b>T3</b> · 390 · game history, the read failed', games('<b>X1</b>', True),
             'The same frame for Games: no status dot, no ✕ beside Try again. A failure says so in its words; the press is the way out, and the toast leaves on its clock '
             '(<code>TOAST_MS</code>, held on hover and focus).', G1),
    )
    b += L.frames(
        L.fr('<b>T2</b> · 1300 · Hide refused', hide('<b>12 · Hide failed</b> · desktop', False),
             '420 wide, its center on the window’s (650), not the content’s: the board’s 31px nudge goes. 24px from the foot. Same press.', H1, 1300),
    )
    b += L.frames(
        L.fr('<b>T4</b> · 1300 · Games, the read failed', games('<b>X2</b>', False),
             'Game history’s board drew this bottom right at 380 (the cart’s slot). The shipped <code>games-failed-toast.tsx</code> already takes the center slot: the board yields.', G1, 1300),
    )
    spec = ('<div style="display:flex;flex-direction:column;gap:18px;padding:28px 32px;border:1px solid var(--border-strong);border-radius:12px;background:#14110E;width:520px">'
            + L.toast('We couldn’t load your games.', 'Try again', inline=True, new=False)
            + L.toast('Sol Ring removed · 1 copy', 'Undo', inline=True, new=False)
            + L.toast('Deleted 1337-testers.', None, inline=True, close=True, new=False) + '</div>')
    b += L.sec('The three shapes a toast takes')
    b += L.frames(L.fr('<b>T5</b> · specimens, 1:1, 420 wide', spec,
                       'A failure carries <b>Try again</b>; a receipt carries <b>Undo</b>; a toast with no action carries the bare ✕ (as <i>Deleted {group}.</i> ships). '
                       'Never both a text press and ✕. One line where it fits, 13.5 <code>--fg</code>.', None, 520))
    b += L.rule('The rule (every toast, every page)', [
        '<b>Frame:</b> the shared <code>ToastFrame</code>. Radius 10, <code>--elevated</code> on a 1px <code>--border-strong</code> edge, the shipped shadow. No status dot, no colored edge.',
        '<b>Slot:</b> bottom center of the <b>window</b>, <code>min(420px, 100% − 32px)</code>, 16px over the tab bar on a phone, 24px from the foot from <code>md</code>. Not centered on the main column.',
        '<b>Where a page has a foot a toast would cover</b>, its shipped stack keeps the same frame: the deck stack over the quick-add dock, the cart stack over the cart’s foot. Those are the only other slots.',
        '<b>/credits</b> joins the center slot. Its bottom-left 440 slot is the deck slot as it shipped before the stack; /credits has no dock, so nothing needs it.',
        '<b>Action:</b> one text press, <code>--accent-text</code> 600 13.5, underlined at 2px, 44px tall: <i>Try again</i> or <i>Undo</i>. No outlined or filled button in a toast.',
        '<b>Close:</b> the bare ✕ (44px, <code>--fg-faint</code>) only on a toast with no action. Every toast still leaves on <code>TOAST_MS</code>, held on hover and focus.',
        '<b>Build:</b> <code>hide-commander.tsx</code> drops the outlined Try again for the press above; <code>social-toast.tsx</code> underlines its action; '
        '<code>admin/show-button.tsx</code> takes 600 and the underline; <code>credits-toast.tsx</code> moves to <code>center</code>. The boards that drew 358 over the content, the radius 12 and the ✕ beside Try again are superseded on this point (errata on this round).'])
    helm = L.scope(L.helmet(U), H1) + L.scope(L.helmet(G), G1)
    return L.doc('Small items 10 · Toasts', helm, b, 1440)
