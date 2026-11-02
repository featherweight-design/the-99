"""Errata · Small items 10: US spelling in Small items 9, and what this round supersedes on earlier boards."""
import lib10 as L
CSS = "<style>.board .grid9{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:1500px}</style>"


def build():
    b = L.head('Small items 10 · R1 · account 2 · 2026-11-02 · item 6 · errata', 'Errata: US spelling, and what this round supersedes',
               'Text-only fixes, applied in the handoff PR. No build work follows from E1 or E2; E3 to E5 point earlier boards at this round’s rule.')
    b += '<div class="grid9">'
    b += L.rule('E1 · Small items 9: “centred” → “centered”', [
        '<code>README.md</code>: item 2(a) <i>centered from <code>md</code></i>; B1 <i>The failed-read toast is the shared <code>ToastFrame</code>, centered, 358×54.</i>; B2 <i>The toast is centered with Undo underlined.</i>',
        '<code>READINESS.md</code>: B2 <i>toast centered</i>; the US English note marked done.',
        'Board annotations: <code>Report</code> (4), <code>Errata</code> (4), <code>Groups-Delete</code> (1) “centred” → “centered”; <code>Add-Card</code> (2) “centre” → “center”. The generator in <code>scratch-gen/</code> likewise. <code>Rule0</code>’s <i>central</i> is an SVG attribute and stays.'])
    b += L.rule('E2 · Buying credits, Plan-and-Cancel: US strings', [
        'The redrawn board (item 1) reads <i>Canceling keeps your…</i>, <i>Plan canceled.</i>, <i>K3 · Canceled</i> and <i>renews monthly until canceled</i>, as <code>credits-page.ts</code> ships.',
        'The other buying-credits boards (Billing-Page, Checkout-Return, Blocked-and-Off, Themes, Options, Picks, the R1 canvas, addendum-r4) still draw 60 and the UK forms. They are history; Plan-and-Cancel in this round is the reference for the plan’s count. The count is <code>PLANS.monthly.units</code> everywhere in the app.'])
    b += L.rule('E3 · Toasts on earlier boards', [
        '<code>game_history/Edges</code> (L3, X1, X2: 358 or 380 bottom right, radius 12, a status dot, ✕ beside Try again) and <code>hide_commander/Undo</code> (12: an outlined Try again, centered on the content) yield to the toast rule (<code>Toasts</code> board).',
        'Small items 9 B1 records the games toast as “358×54”: true at 390; from <code>md</code> it is 420, centered on the window.'])
    b += L.rule('E4 · Hide a commander', [
        '<code>hide_commander/Page</code> state 7: <i>Not ranked while hidden</i> in <code>--fg-faint</code> (item 3a). If (b) and (c) are taken, README §4’s “For you’s search gains the held state too” gains: <i>and the aside above a live list</i>; Discover reports only hides of commanders you don’t own.'])
    b += L.rule('E5 · Game history', [
        'README §3 gains the four filter defaults as confirmed (item 4), and the Played against mark: a filled tick on the chosen row only.'])
    b += '</div>'
    return L.doc('Small items 10 · Errata', CSS, b, 1612)
