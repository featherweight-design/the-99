from kit import *

ACSS = """<style>
.row{display:flex;gap:44px;align-items:flex-start}
.keys{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px}
.keys li{display:flex;align-items:flex-start;gap:8px}
.keys .dot{width:14px;flex:none;font:10.5px 'IBM Plex Mono',monospace;color:#6F7486;text-align:center}
.keys .t{font:10.5px/1.5 'IBM Plex Mono',monospace;color:#6F7486}
.acap{font-size:13.5px;line-height:1.55;color:#B1B6C7;display:flex;flex-direction:column;gap:8px;margin-top:6px}
.acap p{margin:0}
.newpill{display:inline-flex;align-items:center;margin-right:8px;border-radius:4px;padding:2px 7px;font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;background:#FF4D9A;color:#0E0F14;vertical-align:middle}
.afig{margin:10px 0 0;border:1px solid #181C26;border-radius:8px;background:#101219;padding:16px;display:flex;gap:16px;align-items:center}
.spec{width:420px;flex:none}
.spec .dres{box-shadow:none}
.spec .dfld{box-shadow:none;margin-bottom:8px}
</style>"""

TITLE = "Looking up any card"
ROUTE = "any page · opens Search all cards"
CAPTION = [
    "Saw a card across the table, or in a friend’s deck? Look it up by name from any page: the search icon at the top of your phone, or the field at the top of the side rail on a computer (⌘K, or Ctrl K).",
    "Each card says how many you own, which of your decks hold it, and whether it’s on your wishlist. Press one for its full details.",
]
KEYS = [
    "Search reads card names only, including the names printed on Secret Lair cards.",
    "The last 8 cards you opened from search wait in the field before you type.",
    "On a deck’s page, “Add a card” adds to that deck, in its colors. “Search all cards” finds any card.",
    "On a phone, the top bar comes back as soon as you scroll up a little.",
]


def entry(phone_=False):
    from b_rail import fld
    rows = ["ashling", "invisible-woman", "zimone"] if not phone_ else ["ashling", "zimone"]
    spec = (f'<div class="spec" style="width:{"100%" if phone_ else "420px"}">{fld("in", caret=False).replace("dfld", "dfld", 1)}'
            f'<div class="dres" style="padding:0">' + "".join(row(k, "in", first=(i == 0)) for i, k in enumerate(rows)) + '</div></div>')
    keys = "".join(f'<li><span class="dot">·</span><span class="t">{k}</span></li>' for k in KEYS)
    cap = "".join(f"<p>{c}</p>" for c in CAPTION)
    return (f'<div style="border-top:2px solid #FF4D9A;padding-top:13px"><div style="display:flex;flex-wrap:wrap;align-items:baseline;column-gap:10px;row-gap:2px">'
            f'<h3 style="margin:0;font:600 15.5px \'Chakra Petch\',sans-serif"><span class="newpill">NEW</span>{TITLE}</h3>'
            f'<a href="#" style="font:11.5px \'IBM Plex Mono\',monospace;text-decoration:none">{ROUTE}</a></div>'
            f'<div class="acap">{cap}</div><figure class="afig" aria-label="Specimen: a search with three results" style="{"flex-direction:column;align-items:stretch" if phone_ else ""}">{spec}</figure>'
            f'<ol class="keys">{keys}</ol></div>')


def board():
    d = ('<div class="dk" style="height:auto;min-height:0" data-check="about-desktop"><div style="flex:1;padding:28px 0 32px"><div style="max-width:1088px;margin:0 auto;padding:0 34px;display:flex;gap:40px">'
         '<article style="width:760px;flex:none"><div style="padding-bottom:14px;border-bottom:1px solid #181C26"><h3 style="margin:0;font:600 15.5px \'Chakra Petch\',sans-serif;color:#959AAD">A closer look at any card</h3>'
         '<p class="cap" style="margin-top:6px">… the shipped entry, unchanged, ends here.</p></div><div style="margin-top:14px">' + entry() + '</div></article>'
         '<nav style="width:216px;flex:none;font-size:12.5px;color:#959AAD;display:flex;flex-direction:column;gap:6px"><span class="k">Contents</span>'
         '<span>01 Your Collection <span style="color:#FF4D9A;font:10.5px IBM Plex Mono,monospace">1 new</span></span>'
         '<span style="padding-left:20px">Where a new copy goes</span><span style="padding-left:20px">A closer look at any card</span>'
         '<span style="background:#20222A;color:#E6E8F0;border-radius:6px;padding:4px 10px 4px 20px">Looking up any card <span style="color:#FF4D9A;font:10.5px IBM Plex Mono,monospace">new</span></span>'
         '<span style="padding-left:20px">Changing how many you own</span></nav></div></div></div>')
    p = f'<div class="ph" style="height:auto;padding:22px 18px 26px" data-check="about-phone">{entry(True)}</div>'
    body = (ACSS +
            '<div class="bh"><span class="k">Card search · R1 · About entry · per-entry template · Kamigawa</span><h2>Looking up any card</h2>'
            '<p class="cap" style="max-width:1600px">Drawn on the §G per-entry template (<code>design_handoff_the99_about/</code>). Copy is in <b>about · card search.ts</b>, owed to /copy-review.</p></div>'
            '<div class="row"><div class="fr" style="width:1300px"><span class="k">A1 · /about, desktop · chapter 01, after “A closer look at any card”</span>' + d +
            '<p class="cap">Follows <b>CARD_SEARCH_ENABLED</b> (G1). A new entry, so it is announced when the switch flips, and bumps nothing. The specimen is the real result rows at their own size under the field. '
            'Whether it ships with the feature or joins the discovery line’s showcase is Hugh’s call.</p></div>'
            '<div class="fr" style="width:390px"><span class="k">A2 · phone reduction</span>' + p +
            '<p class="cap">The specimen keeps the field and two rows; the caption and all four keys stay.</p></div></div>')
    return doc("About entry, card search", body, 1846, 1100)
