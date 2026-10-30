from kit import *

GRID = ["lathliss", "ghalta", "miku", "killian", "ashling", "dina", "invisible-woman", "quintorius", "rootha",
        "heroes", "sai", "captain-america", "lathliss", "ghalta", "miku"]


def tiles(keys, have=True):
    out = []
    for k in keys:
        c = CARDS[k]
        nm = c.get("flavor") or c["name"]
        out.append(f'<div class="tile"><div class="ar"><img src="art/{k}.jpg" alt=""></div><div class="cpt"><span class="cn">{nm}</span>'
                   f'<span class="cs">×{max(c["owned"], 1)} · {"in a deck" if c["decks"] else "free"}</span></div></div>')
    return f'<div class="pgrid">{"".join(out)}</div>'


def coll_top():
    return ('<div class="ptabs"><span class="tab on">Cards</span><span class="tab">Sets</span><span class="tab">Proxies</span>'
            '<span class="tab">History</span><span class="tab">Wishlist</span><span class="re">↻</span></div>')


def filt(sticky_top=None, focused=False):
    st = f'position:absolute;left:0;right:0;top:{sticky_top}px;z-index:5;' if sticky_top is not None else ''
    f = ('<div class="psf" style="border-color:var(--accent);color:var(--fg)">' + ico_search(18) + 'ghal<span style="width:1.5px;height:18px;background:var(--accent);margin-left:-8px"></span></div>'
         if focused else '<div class="psf">' + ico_search(18) + 'Search your cards…</div>')
    return (f'<div class="pfh" style="{st}">{f}<div class="pchips"><span>Color ▾</span><span>Type ▾</span><span>Free ▾</span><span>Name ▾</span></div></div>')


def board():
    # ---- the header at rest ----
    hp1 = phone(header() + '<div class="pb">' + coll_top() + filt() + tiles(GRID[:9]) + '</div>' + tabbar("Collection"))
    hp2 = phone(header(offline=True, install=True) + '<div class="pb">' + coll_top() + filt() + tiles(GRID[:9]) + '</div>' + tabbar("Collection"))
    hp3 = phone(header(offline=True, install=False) + '<div class="pb">' + coll_top() + filt() + tiles(GRID[:9]) + '</div>' + tabbar("Collection"), cls="w360")
    zoom = ('<div style="width:390px;border:1px solid var(--border-strong);border-radius:14px;overflow:hidden;position:relative">'
            + header(offline=True, install=True) +
'</div>')

    # ---- quick return on Collection ----
    mid = tiles(GRID[3:15])
    q1 = phone(header() + '<div class="pb">' + coll_top() + filt() + tiles(GRID[:9]) + '</div>' + tabbar("Collection"))
    q2 = phone('<div class="pb">' + filt(sticky_top=0) + '<div style="padding-top:120px">' + mid + '</div></div>' + tabbar("Collection"))
    q3 = phone('<div class="pb">' + header(float_=True) + filt(sticky_top=73) + '<div style="padding-top:150px">' + mid + '</div></div>' + tabbar("Collection"))
    sheet = ('<div class="scrim"></div><div style="position:absolute;left:0;right:0;top:52px;bottom:0;z-index:8;background:var(--surface-raised);border-radius:14px 14px 0 0;border-top:1px solid var(--border-strong)">'
             '<div style="display:flex;align-items:center;height:48px;padding:0 6px 0 16px;border-bottom:1px solid var(--border)"><b style="font:700 15px \'Chakra Petch\',sans-serif">Filter your cards</b><span style="margin-left:auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint)">✕</span></div>'
             '<div style="padding:16px;display:flex;flex-direction:column;gap:12px">' + "".join(
                 f'<div style="height:48px;border-radius:10px;background:var(--elevated);display:flex;align-items:center;padding:0 14px;font-size:14.5px;color:var(--fg-body)">{t}</div>'
                 for t in ["Color", "Type", "Availability", "Rarity", "Set"]) + '</div></div>')
    q4 = phone('<div class="pb">' + header(float_=True) + filt(sticky_top=73) + '<div style="padding-top:150px">' + mid + '</div>' + sheet + '</div>' + tabbar("Collection"))
    q5 = phone('<div class="pb">' + filt(sticky_top=0, focused=True) + '<div style="padding-top:120px">' + mid + '</div>' + kbd() + '</div>')

    motion = (
        '<div class="note" style="width:820px"><b>Quick return, the rule (open item 3)</b><ul>'
        '<li><b>At the top</b>, the header is in the page as it ships, 73px, and never hides. Rubber-band overscroll is ignored.</li>'
        '<li><b>Away</b> once the page has scrolled past the header and has moved <b>8px</b> down since the last turn. It slides up 160ms, <code>cubic-bezier(.4,0,1,1)</code>.</li>'
        '<li><b>Back</b> as soon as the page moves <b>12px</b> up from the lowest point, wherever you are. It slides down 200ms on the sheet curve, <code>cubic-bezier(.2,.7,.2,1)</code>, over the page with a shadow (<code>0 10px 28px rgba(0,0,0,.5)</code>). It never pushes the page down.</li>'
        '<li><b>Sticky page heads ride under it.</b> Collection’s filter head pins to the top while the header is away, and moves down by the header’s 73px when it returns, in the same 200ms.</li>'
        '<li><b>Under a sheet or modal</b> it freezes where it was, under the scrim, because the page can’t scroll. It stays put when the sheet closes.</li>'
        '<li><b>With the keyboard up</b> (any text field on the page has focus) it doesn’t return, and a returned header slides away when the field takes focus. Same reason the tab bar hides for a deck note (<code>data-hide-on-note-focus</code>).</li>'
        '<li><b>A new page</b> arrives with the header in place. Only the reader’s own scrolling moves it: a scroll the app makes (bringing a row into view, restoring a position on Back) doesn’t (G4).</li>'
        '<li><b>Reduced motion</b>: no slide. It appears and goes in one frame, with the same thresholds.</li>'
        '<li>The header’s focus order is unchanged, and Tab to it while it’s away brings it back.</li></ul></div>')

    f_rest = [
        frame("HP1 · at rest", hp1, "The search icon sits left of the account button. A bare 20px glyph in <code>--fg-muted</code> on a 44px press: no box, no fill, so the avatar stays the loudest thing in the header."),
        frame("HP2 · with the offline pill and the install slot", hp2, "All three of the cluster’s controls at 390, the width the brief asks for. The icon takes 44px and the wordmark keeps 21px of air (zoom, right). The pill and the install slot keep their shipped sizes."),
        frame("HP3 · offline at 360", hp3, "Below 390 there isn’t room for all four (6px of air at 375, none at 360), so while the pill shows, the install slot steps aside. Installing needs the network anyway, and the slot comes back the moment the pill goes. Online at 360 the cluster leaves 87px. (G5)", width=390),
    ]
    f_qr = [
        frame("Q1 · at the top", q1, "In the page, as shipped. Not sticky, so it costs nothing at the top."),
        frame("Q2 · scrolled down", q2, "Gone after 8px of downward travel past it. Collection’s filter head pins to the top as it does today."),
        frame("Q3 · back on a small scroll up", q3, "12px up brings it back over the page with a shadow, and the filter head moves down under it. The icon is in reach mid-page (lock 5)."),
        frame("Q4 · under a sheet", q4, "A sheet is up, so the page can’t scroll and the header stays where it was, under the scrim. Closing the sheet doesn’t move it."),
        frame("Q5 · keyboard up", q5, "The Collection’s own field has focus. The header won’t return until the keyboard goes, so it never covers what the reader is typing into."),
    ]
    body = (
        '<div class="bh"><span class="k">Card search · the phone header · round 1</span><h2>The header icon and quick return · phone</h2>'
        '<p class="cap" style="max-width:1500px">The shipped <code>MobileHeader</code>: 20px top, the 38px account button, 14px bottom and a 1px rule, 73px in all. '
        'One new control in its right-hand cluster, and one new behavior on every phone screen. Drawn over Collection, the busiest page for a header to sit over.</p></div>'
        '<div class="sec"><h3>The icon in the cluster (open item 6)</h3><div class="frames">' + "".join(f_rest) +
        f'<div class="fr" style="width:390px"><span class="k">HP2 zoomed · the cluster’s room</span>{zoom}'
        '<p class="cap" data-gapcap>Measured in the browser with the shipped type: the cluster is 268px with all three, which leaves the wordmark <b>21px</b> of air at 390. At 375 it would be 6px and at 360 none, which is why HP3’s rule exists. Order, left to right: offline pill, install slot, search, account. Search sits next to the account button because both open something over the page, and so a hand reaching for one finds the other.</p></div>'
        '</div></div>'
        '<div class="sec"><h3>Quick return (lock 5, open item 3)</h3><div class="frames">' + "".join(f_qr) + '</div>' + motion + '</div>'
    )
    return doc("Header and quick return, phone", body, 2330, 2400)
