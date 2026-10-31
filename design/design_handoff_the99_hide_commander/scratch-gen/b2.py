"""State 3 · straight after hiding: the row turns into an Undo row in place. State 12 · a hide or an undo that fails."""
import lib as L
G = 'Ghalta, Primal Hunger'

def build():
    body = L.head('Hide a commander · R1 · account 2 · 2026-10-31', 'State 3 · Undo in place · state 12 · failures',
        'No confirm step: the Hidden list is the safety net, and a hide is one press to take back. The row turns into the deck builder’s shipped '
        '<b>Undo row</b> (<code>decklist-row.tsx</code> <code>UndoRow</code>, decision 5 of the add-panel addendum): the sunken dashed strip, '
        '<i>Ghalta, Primal Hunger hidden</i>, and <b>Undo</b>. No toast, no timer. It stays until the reader leaves the tab; hide several and each keeps its own. '
        'The rows below keep their numbers while it stands; the next load ranks the list without it.')
    u = '<div class="list">' + L.undo_row(G) + L.crow('zimone', 2, 'rest') + L.crow('lathliss', 3, 'rest') + '</div>'
    u2 = ('<div class="list">' + L.undo_row(G) + L.undo_row('Zimone, Infinite Analyst') + L.crow('lathliss', 3, 'rest')
          + L.crow('giada', 4, 'rest') + '</div>')
    ud = '<div class="list">' + L.undo_row('Dina, Essence Brewer') + L.crow('miku', 2, 'rest', lane='disc') + L.crow('quintorius', 3, 'rest', lane='disc') + '</div>'
    body += '<div class="frames">'
    body += L.fr('<b>3 · For you</b> · 390 · just hidden', L.phone(u, count=3),
                 'Ghalta leaves; the Undo row takes its place. The <b>Hidden</b> tab’s count goes 2 → 3. <b>Undo</b> puts the row back as rank 1, at once (optimistic, as the builder’s undo is).')
    body += L.fr('<b>3 · For you</b> · 390 · two hidden in a row', L.phone(u2, count=4),
                 'Each hide keeps its own Undo row, as the builder’s cut does. Lathliss keeps its 3 until the next load.')
    body += L.fr('<b>3 · Discover</b> · 390 · just hidden', L.phone(ud, strip_on='discover', head='discover', count=3),
                 'Same in Discover. The row says <i>hidden</i> and nothing more: where it went is the tab two inches above it.')
    fail = '<div class="list">' + L.crow('ghalta', 1, 'rest') + L.crow('zimone', 2, 'rest') + '</div>'
    t = L.toast('We couldn’t hide Ghalta, Primal Hunger. Try again.<span class="draft">DRAFT</span>')
    body += L.fr('<b>12 · Hide failed</b> · 390', L.phone(fail, count=2, toast=t),
                 'The write was refused: the row comes back where it was and the shared toast says so (<code>ToastFrame</code>, centre, role alert), with Try again. The count stays 2.')
    ue = '<div class="list">' + L.undo_row(G, err='Couldn’t bring that back. Unhide it from Hidden.<span class="draft">DRAFT</span>') + L.crow('zimone', 2, 'rest') + '</div>'
    body += L.fr('<b>12 · Undo failed</b> · 390', L.phone(ue, count=3),
                 'As the builder’s undo fails: the button goes and one line under the row says where to go instead. Ghalta is still hidden, so Hidden has it.')
    body += '</div><div class="frames">'
    ud2 = '<div class="list">' + L.undo_row(G) + L.crow('zimone', 2, 'rest') + '</div>'
    body += L.fr('<b>3 · For you</b> · desktop 1300 · just hidden', L.desk(ud2, count=3),
                 'Desktop: the same Undo row across the list’s width, 44px tall.')
    body += L.fr('<b>12 · Hide failed</b> · desktop 1300', L.desk(fail, count=2, toast=t),
                 'The toast at its desktop slot, bottom centre of the content.')
    body += '</div>'
    return L.doc('Hide · Undo', body, 2900)
