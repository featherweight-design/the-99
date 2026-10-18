"""Discovery onboarding · R3 addendum boards (items 12 to 14).

Home (1280 and 390) is the shipped dashboard as the Friends on Home addendum drew it (its parts are mounted, not
redrawn). The tour card, scrim and ring are transcribed from discovery/first-run-tour.tsx and lib/discovery/tour-steps.ts;
card details at 390 from cards/card-modal.tsx and the card carousel handoff (teaser top 532, full top 64).
"""
from common import *

D_CSS = r"""
.tc{position:absolute;z-index:71;display:flex;flex-direction:column;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface-raised);color:var(--fg-body);box-shadow:0 24px 60px rgba(0,0,0,.55);padding:14px 16px 16px;font-family:'IBM Plex Sans',sans-serif}
.tc.d{width:340px;padding:14px 16px 14px 18px}
.tc .kr{display:flex;align-items:center;justify-content:space-between;gap:10px}
.tc .ki{font:10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.tc .x{width:44px;height:44px;margin:-10px -12px -10px 0;display:flex;align-items:center;justify-content:center;font-size:15px;color:var(--fg-faint)}
.tc.d .x{width:32px;height:32px;margin:-6px -8px -6px 0;font-size:13px}
.tc h2{margin:8px 0 0;font:600 20px/1.2 var(--disp);color:var(--fg)}
.tc.d h2{margin-top:6px;font-size:19px}
.tc .bd{margin:6px 0 0;font-size:14px;line-height:1.55;text-wrap:pretty}
.tc.d .bd{font-size:13.5px}
.tc .ft{margin:10px 0 0;font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.tc .pic{margin-top:12px;height:128px;flex:none;overflow:hidden;border-radius:9px;border:1px solid var(--border-strong)}
.tc.d .pic{height:118px}
.tc .pic img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 0}
.tc .pc{margin-top:6px;font:10px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.tc .fr2{margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.tc .pg6{display:flex;align-items:center;gap:6px}
.tc .pg6 i{display:block;width:6px;height:6px;transform:rotate(45deg);background:var(--border-strong)}
.tc .pg6 i.on{width:8px;height:8px;background:var(--accent)}
.tc .pg6 i.dn{background:color-mix(in oklab,var(--accent) 45%,transparent)}
.tc .bt{display:flex;gap:8px;flex:none}
.tc .bk{height:44px;display:flex;align-items:center;border-radius:10px;border:1px solid var(--border-strong);padding:0 16px;font-size:14px;color:var(--fg)}
.tc .nx{height:44px;display:flex;align-items:center;border-radius:10px;background:var(--fg);padding:0 20px;font:600 14px 'IBM Plex Sans',sans-serif;color:var(--bg)}
.tc.d .bk{height:32px;border-radius:8px;padding:0 12px;font-size:12.5px}
.tc.d .nx{height:32px;border-radius:8px;padding:0 14px;font-size:12.5px}
.ring{position:absolute;z-index:70;pointer-events:none;box-shadow:0 0 0 2px color-mix(in oklab,var(--accent) 75%,transparent),0 0 0 6px color-mix(in oklab,var(--accent) 20%,transparent)}
.halo{box-shadow:0 0 0 2px color-mix(in oklab,var(--accent) 75%,transparent),0 0 0 6px color-mix(in oklab,var(--accent) 20%,transparent)}
.scrimsvg{position:absolute;inset:0;z-index:70;width:100%;height:100%}
.frm{position:relative;overflow:hidden;flex:none;border:1px solid var(--border-strong)}
/* card details at 390 */
.cd{position:relative;width:390px;height:844px;overflow:hidden;border-radius:30px;border:1px solid var(--border-strong);background:var(--surface-sunken);font-family:'IBM Plex Sans',sans-serif;color:var(--fg)}
.cd .blur{position:absolute;inset:-40px;width:470px;height:924px;object-fit:cover;filter:blur(28px);opacity:.55;transform:scale(1.25)}
.cd .shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.45))}
.cd .card{position:absolute;left:35px;top:64px;width:320px;height:447px;border-radius:14px;overflow:hidden;box-shadow:0 24px 50px rgba(0,0,0,.55)}
.cd .card img{display:block;width:100%;height:100%;object-fit:cover}
.cd .cnt{position:absolute;top:22px;left:18px;height:32px;display:flex;align-items:center;padding:0 12px;border-radius:16px;background:color-mix(in oklab,var(--bg) 55%,transparent);font:11px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.cd .cx{position:absolute;top:22px;right:18px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--bg) 55%,transparent);font-size:13px;color:var(--fg)}
.cd .csh{position:absolute;left:0;right:0;bottom:0;background:var(--surface-rail);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;box-shadow:0 -14px 34px rgba(0,0,0,.45);display:flex;flex-direction:column;overflow:hidden}
.cd .gr{height:22px;flex:none;display:flex;align-items:center;justify-content:center}
.cd .gr i{width:36px;height:4px;border-radius:2px;background:var(--border-strong)}
.cd .in{padding:0 20px;display:flex;flex-direction:column;flex:1;min-height:0}
.cd .nr{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.cd h3{margin:0;font:600 23px/1.15 var(--disp);color:var(--fg)}
.cd .ty{margin:4px 0 0;font-size:13px;color:var(--fg-muted)}
.cd .pips{display:flex;gap:4px;padding-top:6px}
.cd .pips i{width:16px;height:16px;border-radius:50%;display:block;box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)}
.cd .meta{margin-top:10px;display:flex;gap:10px;font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.cd .or{position:relative;margin-top:12px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.cd .or p{margin:0 0 6px}
.cd .fade{position:absolute;left:0;right:0;bottom:0;height:34px;background:linear-gradient(180deg,transparent,var(--surface-rail))}
.cd .all{margin-top:auto;margin-bottom:34px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid var(--border-strong);font-size:14px;font-weight:500;color:var(--fg)}
.cd .box{margin-top:14px;border-radius:10px;background:var(--surface-sunken);border:1px solid var(--border);padding:12px 16px;font-size:13.5px;line-height:1.6;color:var(--fg-body)}
.cd .box p{margin:0 0 8px}
.cd .box p:last-child{margin:0}
.cd .k10{font:10px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.cd .grid{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);border-radius:10px;overflow:hidden}
.cd .grid div{background:var(--surface);padding:10px 14px;font-size:13px}
.cd .lnk{height:44px;display:flex;align-items:center;font-size:14px;color:var(--fg-body);border-top:1px solid var(--border);margin-top:14px}
.door{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:14px;font-weight:500;color:var(--accent);border-radius:6px;padding:0 6px;margin-left:-6px;align-self:flex-start}
.door .gl{display:flex;gap:3px}
.door .gl i{display:block;width:6px;height:6px;transform:rotate(45deg);border:1.5px solid var(--accent)}
.door u{text-decoration:none;border-bottom:1px solid var(--accent-shadow)}
.flow{display:flex;align-items:center;gap:10px;font-size:13px;color:#C0B8A6}
.flow span{border:1px solid #3A3229;border-radius:9px;padding:8px 12px;background:#17140F;white-space:nowrap}
.flow span.hot{border-color:#CF8745;color:#EDE6D8}
.flow b{color:#8B8270;font-weight:400}
.geo{position:absolute;z-index:80;font:600 11px 'IBM Plex Mono',monospace;color:#FF8DBE;white-space:nowrap}
.gl1{position:absolute;z-index:80;background:#FF6FAE}
"""

ORACLE = ["Whenever you sacrifice a creature, draw a card. This ability triggers only once each turn.",
          "{2}, {T}, Sacrifice another creature: You gain X life and put X +1/+1 counters on target creature you control, where X is the sacrificed creature’s power."]


def card_sheet(state):
    pips = '<span class="pips"><i style="background:#CBC2B0;color:#14110E;font:600 10px/16px \'IBM Plex Mono\',monospace;text-align:center;font-style:normal">1</i><i style="background:var(--b)"></i><i style="background:var(--g)"></i></span>'
    name = ('<div class="nr"><div style="min-width:0"><h3>Dina, Essence Brewer</h3><p class="ty">Legendary Creature — Dryad Druid</p></div>' + pips + '</div>')
    base = ('<div class="cd th-amonkhet" data-check="cd-' + state + '"><img class="blur" src="art/card-dina.jpg" alt="">'
            '<div class="shade"></div><div class="card"><img src="art/card-dina.jpg" alt="Dina, Essence Brewer"></div>'
            '<span class="cnt">3 of 41</span><span class="cx">✕</span>')
    if state == "teaser":
        sh = ('<div class="csh" style="top:532px"><div class="gr"><i></i></div><div class="in">' + name
              + '<div class="meta"><span>SOC · 0001</span><span>×1</span></div>'
              + '<div class="or" style="height:63px;overflow:hidden"><p>' + ORACLE[0] + '</p><p>' + ORACLE[1] + '</p><div class="fade"></div></div>'
              + '<span class="all">All details</span></div></div>')
    else:
        sh = ('<div class="csh" style="top:64px"><div class="gr"><i></i></div><div class="in" style="padding-bottom:30px">' + name
              + '<div class="box"><p>' + ORACLE[0] + '</p><p>' + ORACLE[1] + '</p></div>'
              + '<div class="box" style="display:flex;align-items:center;padding:12px 16px"><div style="flex:1"><span class="k10">In your collection</span>'
              + '<div style="font:600 14px \'IBM Plex Mono\',monospace;color:var(--fg);margin-top:3px">×1</div></div>'
              + '<span style="font-size:13px;color:var(--accent);text-decoration:underline;text-underline-offset:3px">Edit copies</span></div>'
              + '<div class="grid"><div><span class="k10">Set</span><div style="margin-top:3px">SOC · 0001</div></div><div><span class="k10">Identity</span><div style="margin-top:3px">Golgari</div></div></div>'
              + '<div class="lnk">Buy any printing at Mana Pool <span style="font-size:.85em;color:var(--fg-muted);margin-left:4px">↗</span></div>'
              + '<span class="door halo new" data-door="1"><span class="gl"><i></i><i></i></span><u>Find a deck for it →</u></span>'
              + '</div></div>')
    return base + sh + '</div>'


def tour_card(step, desk_, x=None, y=None, bottom=None):
    if step == 1:
        kick, title = "1 of 6 · Collection", "Start with what you own"
        body = "Everything here is built from your collection. Drop in a new file whenever it changes."
        extra = '<p class="ft">Six stops · about a minute · ✕ skips the tour</p>'
    else:
        kick, title = "2 of 6 · Commanders", "See what you could build"
        body = "Every commander your cards can lead, ranked by how much of the 99 you already own."
        extra = ('<div class="pic"><img src="art/screen-commanders.jpg" alt="Commanders, on a real collection"></div>'
                 '<span class="pc">Commanders, on someone else’s cards</span>')
    pg = "".join(f'<i class="{"on" if i == step - 1 else "dn" if i < step - 1 else ""}"></i>' for i in range(6))
    back = '<span class="bk">Back</span>' if step > 1 else ""
    pos = (f"left:{x}px;top:{y}px" if desk_ else f"left:16px;right:16px;bottom:{bottom}px")
    return (f'<section class="tc{" d" if desk_ else ""} new" data-tour-card="{step}" style="{pos}"><div class="kr"><span class="ki">{kick}</span><span class="x">✕</span></div>'
            f'<h2>{title}</h2><p class="bd">{body}</p>{extra}'
            f'<div class="fr2"><span class="pg6">{pg}</span><span class="bt">{back}<span class="nx">Next</span></span></div></section>')


def scrim(w, h, cut):
    x, y, cw, ch, r = cut
    return (f'<svg class="scrimsvg" viewBox="0 0 {w} {h}" aria-hidden="true"><defs><mask id="m{x}{y}"><rect width="{w}" height="{h}" fill="white"/>'
            f'<rect x="{x}" y="{y}" width="{cw}" height="{ch}" rx="{r}" fill="black"/></mask></defs>'
            f'<rect width="{w}" height="{h}" fill="rgba(6,5,8,.66)" mask="url(#m{x}{y})"/></svg>'
            f'<div class="ring" style="left:{x}px;top:{y}px;width:{cw}px;height:{ch}px;border-radius:{r}px"></div>')


# Shipped geometry: the rail's Collection slot is (12, 110, 38 x 38) at 1280 (measured on HomeDesk); a slot is lit with 5px
# of room and a 14 corner. The card sits BESIDE (24) the slot, 32 above it. The unlocked tab bar is 74 tall: 8 top pad,
# 52px slots, 14 bottom; at 390 a slot is (390 - 16) / 5 wide.
SLOT_D = (12, 110, 38, 38)
TAB_W = (390 - 16) / 5


def cut_of(rect, pad=5, r=14):
    x, y, w, h = rect
    return (round(x - pad, 1), round(y - pad, 1), round(w + pad * 2, 1), round(h + pad * 2, 1), r)


def home_desk(step=1):
    cut = cut_of(SLOT_D)
    card = tour_card(1, True, x=SLOT_D[0] + SLOT_D[2] + 24, y=SLOT_D[1] - 32)
    return (f'<div class="frm th-amonkhet" data-check="hd" style="width:1280px;height:800px;border-radius:14px">'
            f'<dc-import name="HomeDesk" theme="amonkhet" state="many" hint-size="1280px,900px"></dc-import>'
            f'{scrim(1280, 800, cut)}{card}</div>')


def home_phone(step, geo=False):
    idx = {1: 1, 2: 2}[step]
    slot = (8 + TAB_W * idx, 844 - 74 + 8, TAB_W, 52)
    cut = cut_of(slot)
    over = ""
    if geo:
        bar_top = 844 - 74
        over = (f'<i class="gl1" style="left:0;right:0;top:{bar_top}px;height:1px;opacity:.7"></i>'
                f'<i class="gl1" style="left:0;right:0;top:{844 - 86}px;height:1px;opacity:.7"></i>'
                f'<span class="geo" style="right:6px;top:{844 - 86 - 16}px">card foot · 86 from the frame</span>'
                f'<span class="geo" style="right:6px;top:{bar_top + 2}px">bar top · 74</span>')
    return (f'<div class="frm th-amonkhet" data-check="hp{step}" style="width:390px;height:844px;border-radius:30px">'
            f'<dc-import name="HomePhone" theme="amonkhet" state="many" place="mid" hint-size="390px,2060px"></dc-import>'
            f'<div style="position:absolute;left:0;bottom:0;width:390px;z-index:5"><dc-import name="PhoneChrome" theme="amonkhet" part="tabs" hint-size="390px,74px"></dc-import></div>'
            f'{scrim(390, 844, cut)}{tour_card(step, False, bottom=86)}{over}</div>')


def zoom_foot():
    """The foot of the 390 frame at 3x: the card's foot, the ring, the bar."""
    s = 3
    bar_top = 770
    slot = (8 + TAB_W, bar_top + 8, TAB_W, 52)
    cx, cy, cw, ch, r = cut_of(slot)
    top = 730  # the crop starts here
    def Y(v): return (v - top) * s
    def X(v): return v * s
    card_foot = 844 - 86
    ring_top = cy - 6
    body = (f'<div style="position:relative;width:{390 * s}px;height:{(844 - top) * s}px;background:var(--bg);overflow:hidden">'
            f'<div style="position:absolute;left:0;top:{Y(bar_top)}px;width:{390 * s}px;height:{74 * s}px;background:var(--surface-rail);border-top:{s}px solid var(--border)"></div>'
            f'<div style="position:absolute;left:{X(slot[0])}px;top:{Y(slot[1])}px;width:{X(slot[2])}px;height:{52 * s}px;border-radius:{12 * s}px;background:var(--surface-inset)"></div>'
            f'<div style="position:absolute;left:{X(16)}px;width:{X(358)}px;top:0;height:{Y(card_foot)}px;border:{s}px solid var(--border-strong);border-top:0;border-radius:0 0 {14 * s}px {14 * s}px;background:var(--surface-raised)"></div>'
            f'<div style="position:absolute;inset:0;background:rgba(6,5,8,.66)"></div>'
            f'<div style="position:absolute;left:{X(cx)}px;top:{Y(cy)}px;width:{X(cw)}px;height:{ch * s}px;border-radius:{r * s}px;'
            f'box-shadow:0 0 0 {2 * s}px color-mix(in oklab,var(--accent) 75%,transparent),0 0 0 {6 * s}px color-mix(in oklab,var(--accent) 20%,transparent);background:var(--surface-inset)"></div>'
            f'<i class="gl1" style="left:{X(250)}px;width:{X(130)}px;top:{Y(card_foot)}px;height:2px"></i>'
            f'<i class="gl1" style="left:{X(250)}px;width:{X(130)}px;top:{Y(ring_top)}px;height:2px"></i>'
            f'<i class="gl1" style="left:{X(250)}px;width:{X(130)}px;top:{Y(bar_top)}px;height:2px;opacity:.6"></i>'
            f'<span class="geo" style="left:{X(262)}px;top:{Y(card_foot) - 22}px;font-size:14px">card foot · bottom 86</span>'
            f'<span class="geo" style="left:{X(262)}px;top:{Y(ring_top) - 20}px;font-size:14px">ring’s outer edge · 3 above the bar</span>'
            f'<span class="geo" style="left:{X(262)}px;top:{Y(bar_top) + 8}px;font-size:14px">bar top · 74</span>'
            f'<span class="geo" style="left:{X(200)}px;top:{(Y(card_foot) + Y(ring_top)) / 2 - 9}px;font-size:16px">9px clear</span>'
            f'</div>')
    return f'<div class="frm th-amonkhet" data-check="zoom" style="width:{390 * s}px;border-radius:14px">{body}</div>'


def b_landing():
    flows = ('<div style="display:flex;flex-direction:column;gap:12px">'
             '<div class="flow"><b>Shipped</b><span>Show me, Find a deck</span>→<span>/collection?avail=free</span>→<span>tap a card</span>→<span>teaser: no door</span>→<span>All details</span>→<span class="hot">door haloed</span></div>'
             '<div class="flow"><b>Called</b><span>Show me, Find a deck</span>→<span>/collection?avail=free</span>→<span>tap a card</span>→<span class="hot">full sheet, door haloed</span></div></div>')
    body = (head("Discovery onboarding · R3 addendum · item 12", "Find a deck’s landing at 390",
                 "Try it’s <code>?tool=find-a-deck</code> lands on <code>/collection?avail=free</code> and waits (a deferred landing, R2 gap 11): the door it haloes is "
                 "<code>Find a deck for it →</code>, which draws only inside a card’s details. At 1280 that is the modal’s footer, in view on open. At 390 card details "
                 "arrive as the teaser, which has no door, so the halo waits for All details. Card-Details.dc.html:47 drew the full sheet; this is what shipped.")
            + sec("12", "Should the landing open All details itself?", "call",
                  "Yes. While a Find a deck landing waits, the next card opened at 390 opens at the full sheet rather than the teaser, its door scrolled into view and haloed for 2.4s. "
                  "Once only: the landing ends there, and every later card opens at the teaser as it does today. Nothing is pressed: the read still starts only from the picker’s own press, so no credit moves.",
                  flows + '<div class="frames">'
                  + frame("390 · shipped: the first card opens at the teaser", card_sheet("teaser"),
                          "The door is not drawn in the teaser, so the halo has nothing to land on. A reader who asked to be shown sees no sign of it until they press All details.")
                  + frame("390 · called: the same tap opens the full sheet", card_sheet("full"),
                          "The landing raises the sheet as it opens (the teaser-to-full snap, <code>--motion-quick</code>; a cut under reduced motion). The door is in view under the Mana Pool link, haloed with R1’s ring. "
                          "Pull down or Escape returns to the teaser, as always.")
                  + '</div>',
                  "Why: a landing’s job is to put the tool in front of the reader in one go, and every other Show me does. Haloing All details first would be two halos for one landing. "
                  "The page already opens a tool’s tab and view for its landing; opening the sheet to its full height is the same kind of move. "
                  "For engineering: the deferred landing hands the provider a one-shot <code>openFull</code> for the next <code>load()</code> when the card carries a fits door; "
                  "a card without one (not Commander-legal, or the reader has no deck) opens at the teaser and the landing keeps waiting."))
    return doc("Discovery R3 addendum · Find a deck landing", body, 1500, 1500, kind="discovery", extra_css=D_CSS)


def b_replay():
    s13 = sec("13", "The tour taken again, step 1, on an account with data", "ok",
              "Drawn as shipped (R3·2): on a dashboard the first stop lights the Collection slot, the rail’s at 1280 and the tab bar’s at 390, "
              "with the replay’s body and no precon line. The footnote stays. The page reads from the top, since the slot is in the fixed nav.",
              '<div class="frames">'
              + frame("1280 · Home dashboard · step 1 of 6", home_desk(),
                      "The ring is the slot’s, with 5px of room and a 14 corner. The card sits 24 right of the slot and 32 above it (<code>placeCard</code>, beside).", width=1280)
              + frame("390 · Home dashboard · step 1 of 6", home_phone(1),
                      "The Collection tab under the scrim, the card docked above the bar.")
              + '</div>')
    s14 = sec("14", "The replay card over the unlocked tab bar: 86px, confirmed", "ok",
              "Confirmed, and drawn. The open bar is 74 tall, so the card’s foot sits 86 from the frame’s (12 above the bar), as <code>phoneDock</code> ships. "
              "The lit tab’s ring reaches 3px above the bar, which leaves 9px of scrim between it and the card. Step 2, the tallest card (its picture), clears the same way: the card grows upward.",
              '<div class="frames">'
              + frame("390 · step 1, with the measures", home_phone(1, geo=True), "")
              + frame("390 · step 2 of 6, the tallest card", home_phone(2), "Commanders lit; the card holds the capture and its caption.")
              + frame("The foot at 3×", zoom_foot(), "Card foot at 758, the ring’s outer edge at 767, the bar at 770.", width=1170)
              + '</div>',
              "The locked bar keeps 100 (12 above its 88px bar with the bracket), unchanged.")
    body = head("Discovery onboarding · R3 addendum · items 13–14", "The tour taken again, over a real dashboard",
                "<code>/?tour=1</code> from the account menu’s <code>Take the tour</code> or About’s head press, on an account that has cards and decks. "
                "Home here is the shipped dashboard, mounted from the Friends on Home handoff’s parts; the tour’s card, scrim and ring follow <code>first-run-tour.tsx</code>.") + s13 + s14
    return doc("Discovery R3 addendum · the tour again", body, 2900, 2200, kind="discovery", extra_css=D_CSS)


BOARDS = {"Discovery-Landing": b_landing, "Discovery-Replay": b_replay}
