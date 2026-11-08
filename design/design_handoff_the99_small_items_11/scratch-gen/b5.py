"""Errata · Small items 11: what this round re-rules on earlier handoffs."""
import lib11 as L
CSS = "<style>.board .grid9{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:1500px}</style>"


def build():
    b = L.head('Small items 11 · R1 · account 2 · 2026-11-08 · errata', 'Errata: what this round re-rules',
               'Text-only edits to earlier handoffs, applied in the handoff PR. The build work for each sits with its item.')
    b += '<div class="grid9">'
    b += L.rule('E1 · Tuning hub: the free pass names no card', [
        '<code>tuning_hub/README.md:90</code> gains: <i>Exception (Small items 11, item 1): a role-overage row opens that role’s cards behind a press, A to Z, as the deck list shows them. The free pass still ranks and recommends no card: no cut order, no Cut button, no reason line.</i>',
        '<code>tuning_hub/READINESS-audit.md:176</code> (“names no card and shows no list”) gains the same pointer.'])
    b += L.rule('E2 · Small items 7, S4', [
        '<code>Sign-In</code> board S4 and <code>README.md:93</code>: <i>Make an account with this email</i> → <b>Use this email</b>, as READINESS item 3 already records for the build.',
        '<code>README.md</code> §5 gains: while sign-up is invitation-only, an uninvited email gets H2 of Small items 11; the invitation link lands on U3 (H3).',
        '<code>READINESS.md:8,16</code>: the invitation and sign-in-method questions point at Small items 11 item 4.'])
    b += L.rule('E3 · Add panel, shelf order', [
        '<code>add_panel/README.md:14</code> (“shelves ordered by the coverage the deck is short of”) gains: <i>roles at or over target follow the synergy shelf, folded; their head carries <b>your N →</b>, which opens the role’s list.</i>'])
    b += L.rule('E4 · Announcements', [
        '<code>announcements/README.md</code> What’s new section gains the foot entry <i>Past announcements ›</i> to <code>/announcements</code> (Small items 11, item 3). The Home rows, their ✕ and the Settings switches are unchanged.'])
    b += '</div>'
    return L.doc('Small items 11 · Errata', CSS, b, 1612)
