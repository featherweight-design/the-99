# You have it R2 (2026-11-23): writes the boards twice, for the canvas (/_blob urls from blobs.json) and for the repo (art/).
# python3 gen.py repo <dir> | python3 gen.py canvas <dir>/project
import json, sys, os
from PIL import Image
mode, out = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, "..", "art")
BLOB = json.load(open(os.path.join(HERE, "blobs.json"))) if mode == "canvas" else {}
def src(k): return BLOB[k] if mode == "canvas" else f"art/yr2-{k}.webp"
def size(k): return Image.open(os.path.join(ART, f"yr2-{k}.webp")).size
FONT = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Chakra+Petch:wght@600;700&amp;display=swap" rel="stylesheet">'

def page(title, w, h, body):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONT}
<style>
body{{margin:0}}
a{{color:#FF6FAE}}a:hover{{color:#FF9AC6}}
</style>
</helmet>
<div style="width:{w}px;min-height:{h}px;box-sizing:border-box;padding:48px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:28px">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h1 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h1><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1300px">{p}</p></div>'
def label(t): return f'<h2 style="margin:0;font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:#FF6FAE">{t}</h2>'
def fig(k, w, cap, note, radius):
    iw, ih = size(k); h = round(w * ih / iw)
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{radius}px;border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def ph(k, cap, note): return fig(k, 292, cap, note, 22)
def dk(k, cap, note, w=650): return fig(k, w, cap, note, 12)
def row(lbl, figs, gap=40): return f'<section style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start;flex-wrap:wrap">{"".join(figs)}</div></section>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def call(n, t, items): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{ul(items)}</div></div>'
def m(t): return f'<span style="font-family:\'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</span>'
def q(n, t, body, rec): return f'<div style="display:flex;flex-direction:column;gap:6px;padding:16px 20px;border:1px solid #FF6FAE;border-radius:12px"><p style="margin:0;font:600 15px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div><p style="margin:0;font-size:13px;color:#959AAD"><b style="color:#E6E8F0">Recommended:</b> {rec}</p></div>'
def box(t, items): return f'<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #262A35;border-radius:14px">{label(t)}<div style="font-size:14px;line-height:1.6;color:#B1B6C7">{ul(items)}</div></div>'

CALL1 = [
  f"<b>The tabs split by who started it.</b> {m('You asked · Asked of you')} becomes {m('From you · To you')}: an offer you made sits with your asks, an offer made to you with the asks of you. The answering side is then always the other tab's, so every kicker keeps its meaning.",
  f"<b>The row is the shipped row</b> (card, friend's face, kicker, title, line). Same kickers and inks; the open offer reads {m('Offered')} where an ask reads {m('Requested')}. The <b>title's verb</b> and the line tell an offer from an ask: {m('You offered Lathliss to Colin')} vs {m('You asked Peter for Zimone')}; a closed offer's line is {m('Offered Nov 16')} where an ask's is {m('For Thopter Works · asked Nov 9')}. No new mark.",
  f"From you: {m('Offered')} ({m('13 days left. Withdraw it from Colin’s Wishlist tab.')}), {m('Accepted')} ({m('Colin said yes to Jace')}), {m('Declined')} ({m('Max passed on Tam')}), {m('No answer')}, {m('Withdrawn')} ({m('You withdrew your offer of The Wise Mothman to Colin')}). The yes and no titles are the Home item's and the push's own words.",
  f"To you: {m('Waiting on you')} ({m('Max offered you Lathliss')}, {m('Answer it under Waiting on you.')}), {m('Accepted')} / {m('Declined')} / {m('No answer')} with the ask's lines. A withdrawn offer never shows on the wanter's side, as a withdrawn ask never shows on the holder's.",
  "History still only shows: no Yes or No here (AnswerPresses stay on Waiting on you), the whole row opens card details.",
]
CALL2 = [
  f"The offerer's Home item ({m('Colin said yes to Jace')}) gains the press {m('Your offer ›')}, as the ask's answer has {m('Your request ›')}. Its kicker becomes {m('Your offer')}: shipped, it reads {m('Your request')}, which is wrong for an offer.",
  f"The press opens <b>Your offer</b> over Home: the ask's answer sheet shell ({m('ModalChrome')} 560, phone {m('fit')}), its body the <b>request-history row</b> for that offer, the foot {m('Request history ›')} to /friends/requests (From you).",
  f"Accepted: {m('Hand it over when you meet; your collection stays as it is until you change it.')} Declined: {m('Nothing else changes.')} Under it, mono: {m('Offered Nov 16 · 1 copy')}.",
  "<b>No Clear and no AnswerPresses.</b> The offerer has no Your requests row to clear and nothing to answer; the item's own ✕ hides the item, as today.",
  "Opening takes the item's diamond for the visit. A refused or failed open goes to Request history, as the ask's goes to /friends.",
]
CALL3 = [
  f"<b>The tile says so.</b> A card you hold spare copies of, but fewer than your Offer threshold, draws the same 26px press with the spare glyph in the <b>faint ink</b> and a <b>dashed</b> box: present, plainly not ready. No new control. Its name: {m('You have a spare Polyraptor, under your threshold of 2')}.",
  f"The key gains {m('under your threshold')} (faint glyph) when one is drawn. The filter's {m('You can spare · N')} counts only cards you can offer, and a below-threshold card stays out of it.",
  f"<b>The call-out still appears</b> when the only spares are under the threshold (Hugh's case): {m('You have 1 spare under your threshold')} / {m('Polyraptor. You offer a card from 2 spare copies; change it in Settings › Spares.')} No filter then. With offerable spares too, the body ends {m('2 more are under your threshold.')}",
  f"<b>The press opens You have this</b> with the row {m('1 spare')} / {m('under your threshold of 2')}, no Offer, and the foot {m('You offer a card only when you have 2 or more spare copies.')} {m('Change it in Settings ›')} (a link to Settings › Spares).",
  f"<b>Settings gets the pointer:</b> under {m('Offer a card only when I have [2] or more spare copies.')}, {m('This also decides which cards you can offer from a friend’s wishlist.')} The verb now names two things, so the sentence says it covers both.",
  "Kept back cards still draw nothing: keeping one back is a choice made per card, where the threshold is a blanket rule that is easy to forget.",
]

boards = {}
boards["Main.dc.html"] = (1700, 2080, "Main", page("You have it R2: main", 1700, 2080,
  head("You have it · R2 · the missing surfaces",
    "Three calls on top of the approved You have it (#3216, shipped): offers in Request history for both people, the offerer's answer sheet over Home, and the tile a card draws when you hold spares under your Offer threshold. Rendered from main 7563036 with the shipped request-history row, answer sheet shell, Wishlist tile press, call-out and Settings section; the proposal is <code>scratch-gen/proposal.diff</code>. You are Wren; friends are Colin, Max and Peter.")
  + '<div style="display:flex;gap:40px;align-items:flex-start"><div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">'
  + call("1", "Offers in Request history, for both people", CALL1)
  + call("2", "The offerer's answer sheet, from their Home item", CALL2)
  + call("3", "Spares under your Offer threshold, on a friend's wishlist", CALL3)
  + q("Q1", "Split the tabs by who started it, or by which way the card goes?",
      "By who started (drawn): From you holds your asks and your offers, and the other person always answers. By the card's way: an offer you made would sit with the asks of you (your card going out), so the tab would mix rows you answer with rows they answer.",
      "who started it. The kickers keep one meaning per tab, and the tab names are the only change.")
  + q("Q2", "Should a below-threshold spare still be offerable from the sheet?",
      "Drawn: no. The sheet explains and links to Settings; the Offer write's re-check stays as shipped. The alternative keeps Offer on the row, reading the threshold as what friends browse, not what you choose to hand over; that needs the write's rule changed and the Settings sentence reworded.",
      "keep the threshold (drawn). It is your own rule, worded as Offer, and the sheet now says so with a way to change it.")
  + box("Gaps for engineering (READINESS.md)", [
      "G1 Request history reads offers: the direction becomes who started it (initiated_by), and the non-starting side leaves out withdrawn rows.",
      "G2 The offer answer sheet: an open action that resolves the Home item to its offer row (holder = the viewer, live friendship).",
      "G3 The offerer's answer item kicker reads Your request today: one copy key.",
      "G4 loadHaveIt returns below-threshold cards with the threshold; the /friends chip and the filter keep counting offerable ones only.",
      "G5 Copy review of every new string (copy strings.ts).",
    ])
  + '</div><div style="display:flex;flex-direction:column;gap:28px;flex:none;width:640px"><div style="display:flex;gap:28px;flex-wrap:wrap">'
  + ph("p-h1full", "History · From you", "Offers among your asks.")
  + ph("p-s1", "Your offer · Accepted", "Opened from the Home item.")
  + ph("p-t1", "Under your threshold", "Hugh's case: 1 spare, threshold 2.")
  + '</div></div></div>'))

boards["History.dc.html"] = (1700, 2060, "History", page("You have it R2: history", 1700, 2060,
  head("Request history with offers",
    "The shipped page and rows. Tabs renamed From you · To you; offers sit with the asks of the same direction. Months, 30 a page, Show older, ex-friends' foot line: unchanged.")
  + row("Phone", [
      ph("p-h1full", "H1 · From you", "Offered (open, 13 days left, where to withdraw), an open ask for contrast, Accepted, Declined (2 copies), an accepted ask, No answer, Withdrawn, a declined ask."),
      ph("p-h2full", "H2 · To you", "Waiting on you (offer, then an ask), Accepted (2 copies), Declined, an accepted ask, No answer. No withdrawn offer here."),
      ph("p-h3a", "H3 · From you, empty", "Nothing from you yet / Ask a friend from a card’s spares in Shopping or on their Spares tab, or offer one from their Wishlist tab."),
      ph("p-h3b", "H4 · To you, empty", "Nothing to you yet / When a friend asks for one of your spares, or offers you one, it waits on you on Friends."),
    ], 36)
  + row("Desktop", [
      dk("d-h1full", "D1 · From you", "One column, 720 max, as shipped."),
      dk("d-h2full", "D2 · To you", "The same rows at md."),
    ])))

boards["Sheet.dc.html"] = (1700, 2280, "Sheet", page("You have it R2: answer sheet", 1700, 2280,
  head("The offerer's answer sheet",
    "From the offerer's What's new item. The ask's answer sheet shell with the request-history row; no Clear, nothing to answer. The foot goes to Request history.")
  + row("Phone", [
      ph("p-s0", "S0 · Home item", "Kicker Your offer (was Your request), press Your offer ›, ✕ hides the item."),
      ph("p-s1", "S1 · Accepted", "Colin said yes to Jace. Hand it over when you meet; your collection stays as it is until you change it. Offered Nov 16 · 1 copy."),
      ph("p-s2", "S2 · Declined", "Max passed on Tam. Nothing else changes. Offered Nov 12 · 2 copies."),
    ], 36)
  + row("Desktop", [
      dk("d-s0", "D0 · Home item", "The press sits in the row's action column."),
      dk("d-s1", "D1 · Accepted", "560 wide, centred; the foot link on the right."),
      dk("d-s2", "D2 · Declined", "The kicker in the faint ink, as history's."),
    ])
  + box("Other states", [
      "Opening: the press reads busy (aria-busy) while the read is out, as the ask's.",
      "Refused (the friendship ended, the row gone) or failed: the press goes to /friends/requests.",
      "Closed: focus returns to the press. Esc and the sheet's ✕ close.",
    ])))

boards["Threshold.dc.html"] = (1700, 3460, "Threshold", page("You have it R2: under your threshold", 1700, 3460,
  head("Spares under your Offer threshold",
    "Threshold 2 in Settings, one spare Polyraptor, on Colin's wishlist. Today nothing draws and the feature looks absent (T0). The shipped press, call-out and key carry it, with a faint glyph and a dashed box.")
  + row("Phone", [
      ph("p-t0", "T0 · Today", "Nothing on the tab: no call-out, no press. What Hugh saw."),
      ph("p-t1", "T1 · Only under the threshold", "Call-out You have 1 spare under your threshold, no filter, key under your threshold, the faint dashed press on Polyraptor."),
      ph("p-t2", "T2 · Mixed", "Lathliss offerable, Jace accepted, Polyraptor and Tam under: You have 2 to spare … 2 more are under your threshold. The filter counts 2."),
      ph("p-t3", "T3 · The sheet", "1 spare, under your threshold of 2, no Offer. Foot with Change it in Settings ›."),
      ph("p-g1", "G1 · Settings › Spares", "The pointer under the threshold sentence: This also decides which cards you can offer from a friend’s wishlist."),
    ], 36)
  + row("Desktop", [
      dk("d-t0", "D0 · Today", "Nothing drawn."),
      dk("d-t1", "D1 · Only under the threshold", "The call-out's row reads on one line from md."),
      dk("d-t2", "D2 · Mixed", "Filter and key on one line."),
      dk("d-t3", "D3 · The sheet", "640 modal, as shipped."),
      dk("d-g1", "D4 · Settings › Spares", "The same pointer."),
    ])))

os.makedirs(out, exist_ok=True)
for name, (w, h, t, html) in boards.items():
    open(os.path.join(out, name), "w").write(html)
x = 0; idx = {}
for name, (w, h, t, _) in boards.items():
    idx[name] = {"x": x, "y": 0, "w": w, "h": h, "title": t}; x += w + 120
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-23T15:40:00Z"}, "title": "You have it R2", "launch": {"view": "canvas"}, "pages": [],
          "boards": idx, "order": list(boards), "notes": {}, "designSystems": []}
open(os.path.join(out, "canvas.json"), "w").write(json.dumps(canvas, indent=1))
print("wrote", list(boards))
