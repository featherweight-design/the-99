"""1 · The read's key as the shared MarkKey grid."""
import lib as L, re
P = L.rz('R1 - Read-Phone.dc.html'); DS = L.rz('R2 - Read-Desktop.dc.html')

KEY_CSS = """<style>
.zkey{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:12px;row-gap:6px;font:10px 'IBM Plex Mono',monospace;color:var(--fg-faint);align-items:center}
.zkey>span{display:inline-flex;align-items:center;gap:5px;color:var(--fg-faint)!important;white-space:nowrap}
.dk .zkey{font-size:10.5px}
</style>"""


def ph(s, lab):
    f = L.frame(s, f'<span class="k">{lab}')
    return L.first(f, '<div class="ph"')


def dk(s, lab):
    f = L.frame(s, f'<span class="k">{lab}')
    return L.first(f, '<div class="dk"')


def gridkey(x, mark=True):
    def rep(m):
        cls = 'zkey znew' if mark else 'zkey'
        return m.group(0).replace('class="rkey"', f'class="{cls}"', 1)
    return re.sub(r'<div class="rkey"[^>]*>', rep, x)


def oldmark(x):
    return x.replace('<div class="rkey"', '<div class="rkey zold"', 1)


def build():
    t2, t1, d2 = ph(P, 'T2 '), ph(P, 'T1 '), dk(DS, 'D2 ')
    body = L.head('1 · The read · its key',
                  'The key is the shared MarkKey, two columns, at both widths',
                  'Ruling 1: the read’s key of the five finding marks uses the shared <code>MarkKey</code> grid, as /collection’s key does, in place of the read’s own wrapping <code>CountsKey</code>. '
                  'Drawn over the shipped read (T2 and D2, Colin’s table, his Zimone Combo above the table). The rail above it is not the key and is unchanged.')
    body += L.row(
        L.fr('<b>Now</b> · 390 · T2', oldmark(t2), 'The key wraps where its words end: three entries, then two, at a different place on every width.', 390),
        L.fr('<b>Proposed</b> · 390 · T2', gridkey(t2), '<b>Two columns.</b> Five entries make three rows: Game changers and Mass land denial, Extra turns and Two-card infinites, Tutors. Words in <code>--fg-faint</code> at 10px, as MarkKey draws every key.', 390),
        L.fr('<b>Proposed</b> · 390 · T1 · zeros at the table', gridkey(t1), '<b>Always all five.</b> Every seat draws all five counts, a zero as a dim number, so every mark the key glosses is on screen. MarkKey’s rule (“never gloss a mark the reader cannot find”) keeps all five here, as /collection keeps its facts with none held.', 390))
    body += L.row(
        L.fr('<b>Now</b> · 1300 · D2', oldmark(d2), 'The read’s column is 392 wide on desktop, so the wrapped key breaks the same way there.', 1300))
    body += L.row(
        L.fr('<b>Proposed</b> · 1300 · D2', gridkey(d2), 'The same two columns in the read’s column, at MarkKey’s desktop 10.5px.', 1300))
    body += L.rule('The call', [
        '<b>Two columns, not three.</b> At 390 the read card’s inner width is about 330. Three columns give 102 each, and <i>Two-card infinites</i> with its mark needs about 120, so three would wrap inside an entry. /collection’s three fit because its words are short; the shopping key’s two is the precedent here.',
        '<b>Desktop holds the grid too.</b> MarkKey’s <code>phoneColumns</code> becomes a wrapping line from <code>md</code>, but the read on desktop sits in a 392px column, the same width problem. For engineering: MarkKey gains an opt-in that keeps its columns from <code>md</code> (for example <code>columns={2}</code> beside <code>phoneColumns</code>); every other key is unchanged. The read passes <code>columns={2}</code>.',
        '<b>Entries:</b> the five finding marks in <code>findings</code> order with <code>deckAnalysisCopy.findings.labels</code>, the sample being the same <code>FindingMark</code> the seats draw. <code>regionAria</code> = <code>ruleZeroCopy.read.keyLabel</code>. <code>CountsKey</code> retires. No new string.',
        '<b>Never fewer than five</b> (brief state 2): the read draws every count on every seat, zeros included, so the key does not thin out with the table.'])
    return L.doc('Rule 0 revisions · The read’s key', L.helmet(P) + KEY_CSS, body, 2000)
