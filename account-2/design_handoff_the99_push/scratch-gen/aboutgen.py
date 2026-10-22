"""Push notifications: its About entry. Drawn with the launch-end batch's kit (la.py over akit.py), so the Reference, the
window and the halo are the ones that batch measured. The picture is /settings rendered per theme by aframes.py,
standing in for a capture, with the five-slot bar."""
import json, os
import kit as mkit
import akit, la
from la import board_head, frame, doc, THEMES, hexa, RATIO

HERE = os.path.dirname(os.path.abspath(__file__))
akit.ICONS["friends"] = ('<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">'
                         '<circle cx="7.6" cy="7.4" r="2.7"/><path d="M2.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 4.8 4.5"/><path d="M12.4 4.9a2.4 2.4 0 1 1 1.3 4.5"/><path d="M14.6 11.6c1.5.5 2.4 1.9 2.7 4"/></svg>')
la.TABS[:] = [("home", "Home"), ("coll", "Collection"), ("cmd", "Commanders"), ("decks", "Decks"), ("friends", "Friends")]
# A new screen: Settings has no About screen yet (screenForPath returns null for /settings). Gap A1.
la.SCREENS.append(("settings", "Settings", "/settings", 0))
la.ADDED["settings"] = 1
la.TOTAL += 1

BOXES = json.load(open(f"{HERE}/frames/boxes.json"))
ID = "push"


def window(theme, w, label=None):
    x, y, bw, bh = BOXES[theme]
    win = 2 / 3
    centre = (y + bh / 2) * RATIO
    off = min(max(centre - win / 2, 0), RATIO - win)
    t = next(t for t in THEMES if t[0] == theme)
    halo = (f'<span class="halo" style="left:{x*w:.1f}px;top:{(y*RATIO-off)*w:.1f}px;width:{bw*w:.1f}px;height:{bh*RATIO*w:.1f}px;'
            f'box-shadow:0 0 0 2px {hexa(t[2],.75)},0 0 0 6px {hexa(t[2],.2)},0 0 0 2000px {hexa(t[3],.28)}"></span>')
    lab = f'<span class="wlab">{label}</span>' if label else ""
    return (f'<div class="frm" style="width:{w}px;height:{w*win:.1f}px"><img src="{mkit.img(f"settings-{theme}.png")}" alt="" '
            f'style="top:{-off*w:.1f}px;height:{RATIO*w:.1f}px">{halo}{lab}</div>')


la.window = lambda theme, key, w, **kw: window(theme, w)

TITLE = "Push notifications"
CAPTION = ("The 99 can tell your phone or computer when something new lands, even with the app closed. It sends the same news Home shows, and you choose each kind on its own:\n\n"
           "- A set or a precon that just came out\n- A price drop on a card on your wishlist\n- A combo you can now make with cards you own\n"
           "- A friend with a spare of a card on your wishlist\n- A friend asking for one of your spares\n\n"
           "In Settings, tick Push beside a kind. Your browser asks once before anything is sent, and each phone or computer has its own switch at the top of the column.\n\n"
           "On iPhone, add The 99 to your Home Screen first (Share, then Add to Home Screen), open it from there, and turn push on.")
KEYS = ["Only a friend asking for your spare starts ticked. Nothing is sent until you allow it on a device.",
        "Nothing comes between 9pm and 9am; it waits for the morning. Several at once arrive as one.",
        "A tap opens what it’s about and marks it seen on Home.",
        "No push while The 99 is open in front of you. No email, ever."]
LINES = [("- A price drop on a card on your wishlist", ["SOCIAL_WISHLIST_ENABLED"]),
         ("- A friend with a spare of a card on your wishlist", ["SOCIAL_FRIENDS_ENABLED", "SOCIAL_WISHLIST_ENABLED"]),
         ("- A friend asking for one of your spares", ["SOCIAL_FRIENDS_ENABLED"])]
KEYSW = [(KEYS[0], ["SOCIAL_FRIENDS_ENABLED"])]
E = dict(id=ID, title=TITLE, screen="settings", caption=CAPTION, keys=KEYS, rows=["OPEN"])

GAPS = [
    "A1 · <b>A new screen, <code>settings</code>.</b> /settings has no About screen today (<code>screenForPath</code> returns null, and the test says so). This entry needs one: <code>screenForPath('/settings') = 'settings'</code>, a <code>SCREEN_WHERE</code> line, and a capture.",
    "A2 · <b>Capture.</b> <code>settings</code> at 390×844 in six themes with <code>PUSH_ENABLED</code> and <code>HOME_FEED_ENABLED</code> on, the default ticks, and the device row reading Not on yet (headless Chromium reports “default” permission, which is that state). The pictures here stand in.",
    "A3 · <b>Locator.</b> The device row, e.g. <code>[data-push-device]</code>, scope main.",
    "A4 · <b>Stale key.</b> <code>whats-new</code>’s key “News stays in the app: a count on Home in the bar, and the list. No email, ever.” is no longer true with push on: with <code>PUSH_ENABLED</code> it reads “News shows on Home, and as push where you turn it on. No email, ever.”",
    "A5 · <b>Version.</b> A switched entry bumps nothing: <code>since</code> is the <code>ABOUT_VERSION</code> current when it ships (16 today), and it is announced by its id when <code>PUSH_ENABLED</code> flips.",
]


def sw(names):
    return " + ".join(f"<code>{n}</code>" for n in names)


def about_board():
    head = board_head("About · push · one entry · Settings", TITLE,
                      "One entry, on a new <b>Settings</b> screen (gap A1), chapter 04 beside the feed’s <code>whats-new</code>, following <code>PUSH_ENABLED</code>. Opened in the shipped Reference at 1300 and 390 (Neon Rain). "
                      "The halo is the <b>device row</b>, <i>Push on this phone</i>: the switch every reader meets first and the one the iPhone steps end at. The picture is /settings as this round draws it, standing in for a capture. Words are placeholders for <code>/copy-review</code>.")
    fr = [frame("Reference, entry open · desktop 1300 · Neon Rain", la.ref_desk(E)), frame("Reference, entry open · 390 · Neon Rain", la.ref_phone(E))]
    body = head + f'<div class="frames" style="max-width:{1300+390+44}px">' + "".join(fr) + "</div>"
    cells = "".join(f'<div class="six-c">{window(t, 250)}<span class="m six-l">{n} · {t}</span></div>' for t, n, *_ in THEMES)
    body += ('<div class="sec"><h3>The picture in all six themes</h3><p class="cap" style="margin:0;font-size:13px;color:var(--fg-muted)">/settings in each theme’s tokens and display face, '
             'windowed and haloed as <code>EntryFrame</code> draws it, the box measured per frame as the locator script does.</p>'
             f'<div class="six">{cells}</div></div>')
    lines = "".join(f"<tr><td>{l}</td><td>{sw(s)}</td></tr>" for l, s in LINES + KEYSW)
    gaps = "<ul>" + "".join(f"<li>{g}</li>" for g in GAPS) + "</ul>"
    body += ('<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px">'
             '<div class="sec"><h3>Line switches</h3><table class="tbl"><tr><th>Line or key</th><th>Drawn while on</th></tr>'
             f'<tr><td><i>the entry itself</i></td><td><code>PUSH_ENABLED</code></td></tr>{lines}</table></div>'
             f'<div class="note"><b>Gaps</b>{gaps}</div></div>')
    return doc(f"About · {TITLE}", body, 1300 + 390 + 44 + 112)
