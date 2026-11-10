import lib11 as L, kit as K

def rows():
    R = K.PH_ROWS
    return (K.day('Upcoming drops') + K.up_row(K.U['queue'], new=False) + K.up_row(K.U['shark'], new=False)
            + K.day('Today') + K.unchg(R[1]) + K.foot(more=None))

def build():
    S = [L.head('Drop alerts · R1 · account 2 · 2026-11-10 · six themes',
                'The group in every theme',
                'The same box in all six themes, with the pre-queue state so both new inks show: <i>pre-queue open</i> in <code>--accent-text</code> and the sale line in '
                '<code>--fg</code>. No new colour: every ink is a shipped token. Phyrexia reads its own, lighter <code>--accent-text</code>.')]
    fr = []
    for t in K.THEMES:
        b = K.box(rows(), 358, "1 new").replace('style="width:390px;', f'style="{K.theme_vars(t)};width:390px;', 1)
        fr.append(L.fr(f'<b>{t.capitalize()}</b> · 390', b, '', w=390))
    S.append(L.frames(*fr[:3])); S.append(L.frames(*fr[3:]))
    return L.doc('Drop alerts · Themes', K.HR_HELM + K.CSS, ''.join(S), 1500)
