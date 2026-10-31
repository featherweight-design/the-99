"""Item 5 · A stored Suggested changes v2 run, opened with v2 switched off: read-only, drawn as History C."""
import lib8 as L, re
s = L.load('design_handoff_the99_suggested_changes_v2/History.dc.html')
idx = [m.start() for m in re.finditer('<div class="fr"', s)]
PC, DC = L.block(s, idx[4]), L.block(s, idx[5])
STALE = 'A past run, read-only. The list has changed by 7 cards since; nothing here can be applied now.'
UNC = 'A past run, read-only. Nothing here can be applied now.'
D8 = '<span class="draft8">DRAFT</span>'


def body_of(f):
    return f[f.find('<div class="lab">'):f.rfind('<p class="cap">')] if '<p class="cap">' in f else f[f.find('<div class="lab">'):-6]


def applied(f):
    f = f.replace(STALE, UNC).replace('Oct 19 · version 3 · 1 credit', 'Oct 26 · version 4 · 1 credit').replace('applied on Oct 19', 'applied on Oct 26')
    return f[f.find('</div>', f.find('<div class="lab">')) + 6:]


def unapplied(f):
    f = applied(f)
    f = re.sub(r'<span class="done"><i>✓</i>(Added|Cut)</span>', '<span class="rot">Not picked</span>', f)
    f = f.replace('<b>5 to add and 5 to cut</b> · 2 + 2 applied on Oct 26.', '<b>5 to add and 5 to cut</b> · nothing applied.')
    f = re.sub(r'<span class="cc">\d+ applied</span>', '', f)
    f = f.replace(' apd"', '"')
    return f


def strip(f):
    # drop the trailing caption of the source frame
    f = f[:-6]
    return f[:f.rfind('<p class="cap">')] if '<p class="cap">' in f[-1200:] else f


def build():
    body = L.head('5 · Suggested changes v2 · a stored run with v2 switched off',
                  'With v2 off, a v2 run opens as a past run: History C, read-only',
                  'The v2 actions refuse a reader whose <code>SUGGESTED_CHANGES_V2_ENABLED</code> is off, so a stored v2 run is drawn read-only '
                  '(<code>tuning-panel.tsx</code>, ruling F2(a)). Drawn over the shipped History boards (Suggested changes v2 <code>History</code>, C), '
                  'on a run that is still the deck’s version: there is no drift to count.')
    body += '<div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>Applied</b> · 390 · v2 off', strip(applied(PC)),
                 'The shipped past-run box with <code>pastNoteUncounted</code>. Rows keep what happened: Added, Cut, Not picked. No Pick, no Apply bar, no Undo.')
    body += L.fr('<b>Applied</b> · 1300 · v2 off', strip(applied(DC)), 'The same at 1300: request beside the outcome, both lists, no bar.')
    body += '</div><div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>Never applied</b> · 390 · v2 off', strip(unapplied(PC)),
                 'A run nobody applied: every row reads Not picked and the outcome says nothing was applied (History’s list wording).')
    body += L.fr('<b>Never applied</b> · 1300 · v2 off', strip(unapplied(DC)), '')
    body += '</div>'
    body += L.rule('The call', [
        '<b>v2 off draws a v2 run as History C</b>, the stale run: the shipped past-run box first, then the request, the outcome and both lists, read-only. It replaces Small items 7 addendum 2’s “no line explaining why”: without the box, rows with no Pick read as broken.',
        '<b>The box says</b> <code>tuningHubCopy.history.pastNoteUncounted</code>, <i>A past run, read-only. Nothing here can be applied now.</i> It never names the switch. When the list has also moved, <code>pastNote(n)</code> as shipped.',
        '<b>Rows</b> read Added or Cut where the run was applied and Not picked elsewhere (the shipped <code>rot</code> label). No Pick, no Apply bar, no Undo, no bracket controls.',
        '<b>New run</b> opens the intake the reader has: with v2 off, the shipped one-list Suggested changes.',
        '<b>For engineering:</b> the run view takes <code>past.stale</code>’s box whenever <code>v2 === null</code> (today it shows History B’s live line, which promises a check that can’t be applied). Reached from History, or from the tile while the run is the deck’s last. No new string.'])
    return L.doc('Small items 8 · v2 off run', L.helmet(s), body, 2000)
