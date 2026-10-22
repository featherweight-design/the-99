"""Push notifications R1: the boards. Each returns a whole .dc.html."""
import kit
import parts as P
import sr as S
import push as U
from kit import doc, board_head, frame, frames, phone, desk, img

FOLD = '<div class="fold" style="top:770px"><span>first screen ends</span></div>'
BADGE = {"Home": 2, "Friends": 1}


def ph(inner, active=None, h=None, over="", fold=False, badges=BADGE, tabs=True):
    return phone(inner, active, h=h, badges=badges, tabs=tabs, over=(over or "") + (FOLD if fold and not h else ""))


def dk(inner, active=None, h=None, over="", badges=BADGE):
    return desk(inner, active, badges=badges, over=over, h=h)


def with_safari(phone_html, lit=False):
    i = phone_html.rindex("</div>")
    return phone_html[:i] + U.safari_bar(lit) + phone_html[i:]


def note(t, b):
    return f'<div class="note"><h4>{t}</h4>{b}</div>'


# ================================================================ Main
CALLS = [
    ("1", "One column beside the kinds",
     "Settings’ <b>What’s new on Home</b> keeps its six shipped rows; each gains a second box on the right under a <b>Push</b> head. The left box is Home (as shipped), the right box is push. They are independent: push can be on with Home off. "
     "Every push box starts off except <b>Friends asking for your spares</b> (ruling). Ticks are the account’s and follow you to every device."),
    ("2", "The device switch heads the column",
     "The first row of the section is <b>Push on this phone</b> (<i>this browser</i> on a computer, <i>this iPhone</i> when installed): one box in the same column, so the whole column reads top to bottom. "
     "It is this device only; it never changes the ticks. States: <b>not on yet</b>, <b>on</b>, <b>off here</b> (you unticked it), <b>blocked</b> (box disabled, how to undo it), <b>needs the Home Screen</b> (iPhone in Safari), <b>can’t</b> (no box, no column)."),
    ("3", "The ask comes from a tick, never a load",
     "The app never asks on load, on Home, or in the inline opt-in. It asks the moment a reader ticks a push box (the device switch or any kind) and push isn’t allowed yet: the press is the browser’s user gesture, and the browser’s own prompt is the ask. "
     "No pre-prompt of our own: the tick already said yes. Allow: the device switch ticks. Block: it shows blocked, and the kind ticks are kept. Closed without a choice: still not on yet, and the next tick asks again."),
    ("4", "iPhone in Safari: Home Screen first",
     "In Safari (not installed) the device row reads <i>On iPhone, push works once The 99 is on your Home Screen. How ›</i>. How, or any push tick, opens one sheet with three steps (Share, Add to Home Screen, open it from there). "
     "The tick is saved, so once installed the reader only allows. iOS before 16.4: no box, one line. Other browsers on iPhone follow the same rule (they are Safari underneath)."),
    ("5", "The notification is the feed item",
     "Title and body are the feed item’s own words, with the kind in the title where the item alone wouldn’t say it (<i>You can make a combo</i>). The icon is the app’s; a card image rides along where the system shows one (Android, desktop). "
     "No action buttons: Yes and No need the request in front of you. A tap lands where the feed item’s press lands and marks that item seen."),
    ("6", "Recommended: send each, bursts as one, nights held",
     "<b>Open for Design, our pick (A):</b> a push goes when the event happens. Several of one kind from one job (a price run, one upload’s combos, one friend’s spares) go as one push that lands on Home’s What’s new. "
     "<b>Nothing is sent 9pm to 9am</b> in the device’s time zone; what waited goes at 9am, one per kind. No quiet-hours setting: the phone’s own Focus and Do Not Disturb cover the rest. B (a daily digest) is drawn on Delivery."),
    ("7", "Quiet when you’re looking",
     "With The 99 open and in front, no push shows: the badge and Home already say it. Installed apps also carry the Home slot’s count on the app icon (unseen What’s new), cleared the same way."),
    ("8", "Settings’ foot says where it goes",
     "The foot line gains push: <i>Home: in the app, a count on Home and the list. Push: only to devices you turn on, and never 9pm to 9am. No email, ever.</i> On a device that can’t push, the push clause leaves."),
]
GAPS = [
    ("G1", "Subscriptions", "<code>push_subscriptions</code>: user_id, endpoint (unique), p256dh, auth, user_agent label, time_zone (IANA, from the browser), created_at, last_ok_at. One row per device. The device switch adds or deletes this device’s row. A 404/410 from the push service deletes the row; the next visit with permission still granted re-subscribes silently."),
    ("G2", "Push prefs", "<code>user_prefs.push_kinds</code> beside <code>feed_kinds</code>, same closed set (<code>FEED_KINDS</code>). Unset reads as <code>[\"spare-request\"]</code>, the ruling’s default. A kind whose switch is off is absent, as on Home."),
    ("G3", "Sending", "The writers that already record feed items (<code>recordFeedItem</code>, the catalog read for sets and precons) enqueue a push per subscribed device when the kind is in <code>push_kinds</code>. Catalog kinds fan out from the ingest job’s end, never under the <code>catalog-ingest</code> lock. VAPID keys in env."),
    ("G4", "Collapse and hold", "Per (user, kind, job run) one push; <code>tag</code> = kind so a later one replaces an unread one. Between 21:00 and 09:00 in the row’s <code>time_zone</code> a push waits, and at 09:00 the waiting ones go, one per kind (collapsed copy when more than one). Spare requests collapse never; they still wait for 09:00."),
    ("G5", "Landing and seen", "The payload carries the route and the feed item key. The worker focuses an open window or opens one at the route; the page marks that key seen. Opening Home closes delivered notifications for items it marks seen (<code>getNotifications</code> by tag)."),
    ("G6", "Foreground and badge", "The worker skips <code>showNotification</code> when a focused client exists. Installed apps call <code>setAppBadge(unseen)</code> from the worker and from Home’s seen write; <code>clearAppBadge</code> at zero."),
    ("G7", "Sign out", "Signing out deletes this device’s subscription row, so a shared computer stops getting someone else’s pushes."),
    ("G8", "Switch", "<code>PUSH_ENABLED</code>. Off: no column, no device row, no sends; the foot is today’s."),
]


def main_board():
    flow = ('<div class="flow2">'
            '<div class="st"><em>1 · Choose</em><b>Tick Push beside a kind</b><span>In Settings, under What’s new on Home. “Friends asking for your spares” is ticked already.</span></div>'
            '<div class="st"><em>2 · Allow</em><b>The browser asks, once per device</b><span>Only from that tick (or the device switch). Never on load. iPhone in Safari: add to the Home Screen first.</span></div>'
            '<div class="st"><em>3 · Get</em><b>The feed item, as a push</b><span>Each as it happens; a burst as one; nothing 9pm to 9am. None while the app is in front.</span></div>'
            '<div class="st"><em>4 · Tap</em><b>Lands where the feed press lands</b><span>The set, the precon, the card, the friend’s spares, Waiting on you. That item is marked seen.</span></div>'
            '</div>')
    calls = "".join(note(f"{n} · {t}", b) for n, t, b in CALLS)
    gaps = "".join(f'<tr><td><b>{g}</b></td><td><b>{t}</b></td><td>{b}</td></tr>' for g, t, b in GAPS)
    idx = ("<ul><li><b>Settings</b>: the page with the push column, 390 and 1300.</li>"
           "<li><b>Device-States</b>: the device row in every state, at 390.</li>"
           "<li><b>The-Ask</b>: tick, the browser’s prompt, allowed or blocked, on Android, a computer and an installed iPhone.</li>"
           "<li><b>iPhone</b>: Safari’s Home Screen guidance, then the installed app.</li>"
           "<li><b>Notifications</b>: every kind’s title, body and landing, on a lock screen, the Android shade and a desktop banner.</li>"
           "<li><b>Delivery</b>: the open call (each event or a digest, and quiet hours).</li>"
           "<li><b>About</b>: the entry in the Reference.</li></ul>")
    body = (board_head("Push notifications · R1", "Push is a second box beside each kind; the browser asks only when you tick one",
                       "Builds on Settings’ <b>What’s new on Home</b> and the feed (<code>design_handoff_the99_menu_home</code>, shipped in <code>news-section.tsx</code>), the spare request (<code>design_handoff_the99_spare_requests</code>) and the combo kind. "
                       "Hugh’s rulings held: push carries the feed’s six kinds; each kind has its own push box, separate from its Home box, all off but a friend wanting your spare; web push only, on iPhone once added to the Home Screen (iOS 16.4+). "
                       "Orange dashed outlines mark what is new against the shipped page. System UI is drawn approximately. Copy is placeholder for /copy-review.")
            + flow
            + f'<div class="notes">{calls}</div>'
            + '<div class="notes" style="grid-template-columns:2fr 1fr">'
            + f'<div class="note"><h4>Gaps for engineering</h4><table class="tbl">{gaps}</table></div>'
            + note("The boards", idx)
            + "</div>")
    return doc("Push notifications · R1", body, 1612)


# ================================================================ Settings
def settings_board():
    p1 = ph(U.settings("ask"), fold=True)
    p2 = ph(U.settings("on", push=("spare-request", "price-drop")), fold=True)
    d1 = dk(U.settings("on", "browser", desk=True, push=("spare-request", "price-drop")))
    body = (board_head("Settings · /settings", "The push column sits beside the boxes you already have",
                       "The shipped page: title, sub line, <b>What’s new on Home</b>, Spares, Your decks. Only the section changes: the head gains <b>Push</b> over a 44px column, the device row leads it, and each kind gains its push box. "
                       "The shipped <code>Checkbox</code> (18px) in both columns; the row’s text stays the Home box’s press, the push cell is its own 44px press. No tab is lit: Settings is reached from the avatar.")
            + frames(frame("<b>First visit</b> · 390 · not on yet", p1,
                           "The default: Home has three kinds on; push has only <b>Friends asking for your spares</b>, by ruling. Nothing has been asked, so nothing is sent yet."),
                     frame("<b>After allowing</b> · 390 · on", p2,
                           "The reader ticked Price drops; the browser asked; they allowed. The device row ticks itself. Spares and Your decks follow, unchanged."),
                     frame("<b>On</b> · 1300 · this browser", d1,
                           "The 720 column. On a computer the row names <i>this browser</i>: a subscription belongs to the browser profile, not the machine.")))
    return doc("Settings · push", body, 2290)


# ================================================================ Device states
STATES = [("ask", "phone", "Not on yet", "Permission never asked on this device. Ticking the box, or any kind’s push box, asks."),
          ("on", "phone", "On", "Allowed and subscribed. Unticking it unsubscribes this device only; the ticks stay."),
          ("paused", "phone", "Off here", "Allowed, but the reader unticked the device row. Ticking it again needs no prompt."),
          ("blocked", "phone", "Blocked", "The reader chose Block, or the browser blocks it. The box is disabled (the shipped 50%), the line says where to undo it. Kind ticks stay."),
          ("install", "iphone", "iPhone in Safari", "Push needs the Home Screen. The box and How › open the guidance sheet (board iPhone)."),
          ("unsupported", "phone", "Can’t", "No Push API (an old browser, iOS before 16.4: same row, “Needs iOS 16.4 or later”). No box and no column; Home is as shipped.")]


def states_board():
    fs = []
    for st, where, lab, cap in STATES:
        push = ("spare-request", "price-drop") if st in ("on", "paused", "blocked") else U.PUSH_DEFAULT
        pg = ph(U.settings(st, where, full=False, push=push))
        if st == "install":
            pg = with_safari(pg)
        fs.append(frame(f"<b>{lab}</b> · 390", pg, cap))
    body = (board_head("Settings · the device row", "One row, six states, one box in the push column",
                       "Each frame is Settings’ first section (Spares and Your decks follow as on board Settings). The row’s box is the only control; its line is the only thing that explains. "
                       "The iPhone frame shows Safari’s own bar under the app, because it is in Safari.")
            + frames(*fs[:3]) + frames(*fs[3:]))
    return doc("Settings · device row states", body, 1430)


# ================================================================ The ask
def ask_board():
    push1 = ("spare-request", "price-drop")
    a1 = ph(U.settings("ask", full=False, push=push1, lit="price-drop"))
    a2 = ph(U.settings("ask", full=False, push=push1), h=844, over=U.android_prompt(330))
    a3 = ph(U.settings("on", full=False, push=push1))
    a4 = ph(U.settings("blocked", full=False, push=push1))
    i1 = ph(U.settings("ask", "iphone", full=False, push=push1), h=844, over=U.ios_prompt(330))
    d1 = U.browser(dk(U.settings("ask", "browser", desk=True, full=False, push=push1)), over=U.chrome_prompt(80, 60))
    body = (board_head("The ask · when and where", "A tick asks; the browser’s prompt is the only prompt",
                       "Never on first load, never on Home, never in Home’s inline opt-in (which stays in-app only). The reader ticks a push box in Settings; if this device hasn’t allowed push, that same press calls the browser’s permission prompt. "
                       "There is no pre-prompt of ours: the tick is the reader saying yes, and a second question would be one too many.")
            + frames(frame("<b>1 · Tick</b> · Android", a1, "Price drops’ push box, pressed. The tick shows at once (it is saved whatever the browser says)."),
                     frame("<b>2 · The browser asks</b>", a2, "Android’s own prompt, over the page. We draw nothing of our own around it."),
                     frame("<b>3a · Allow</b>", a3, "The device row ticks itself and reads On. No toast: the box is the receipt."),
                     frame("<b>3b · Don’t allow</b>", a4, "Blocked: the device box disables, the line says where to undo it. Both kind ticks stay, ready for when it’s allowed. Closing the prompt without a choice leaves Not on yet, and the next tick asks again."))
            + frames(frame("<b>A computer</b> · 1300 · Chrome", d1, "The prompt hangs from the address bar, as Chrome draws it. Same outcomes as 3a and 3b."),
                     frame("<b>An installed iPhone</b> · iOS’s prompt", i1, "Once on the Home Screen, the same tick calls iOS’s own alert. Don’t Allow is undone in iPhone Settings, which the blocked line names.")))
    return doc("The ask · push permission", body, 2160)


# ================================================================ iPhone
def iphone_board():
    s1 = with_safari(ph(U.settings("install", "iphone", full=False)))
    s2 = ph(U.settings("install", "iphone", full=False), h=844, over=U.guide_sheet(84) + U.safari_bar(True, True))
    s3 = ph(U.settings("ask", "iphone", full=False))
    s4 = ph(U.settings("on", "iphone", full=False, push=("spare-request", "price-drop")))
    body = (board_head("iPhone · Safari, then the Home Screen", "On iPhone, push starts with Add to Home Screen",
                       "iOS sends web push only to a site added to the Home Screen (iOS 16.4+), and there’s no native app. In Safari the device row says so and How › opens one sheet. "
                       "Any push tick in Safari is saved and opens the same sheet, so nothing is lost on the way. Installed, the row behaves as on Android.")
            + frames(frame("<b>1 · In Safari</b> · 390", s1, "Safari’s own bar sits under the app. The device box is live: it and How › both open the sheet."),
                     frame("<b>2 · The sheet</b>", s2, "The shipped sheet box with a ✕. Three steps, Safari’s own glyphs. No screenshots of iOS, which change every year."),
                     frame("<b>3 · Installed</b> · from the Home Screen", s3, "Opened from its icon, there’s no Safari bar. The row reads Not on yet and names this iPhone; the ticks made in Safari are there."),
                     frame("<b>4 · Allowed</b>", s4, "After iOS’s own prompt (board The-Ask). From here it is the same as every other device.")))
    return doc("iPhone · Add to Home Screen", body, 1960)


# ================================================================ Notifications
def notes_board():
    N = {k: (t, b, im) for k, t, b, im, *_ in U.NOTE}
    lock = U.lock_screen([(N["spare-request"][0], N["spare-request"][1], "now"),
                          (N["price-drop"][0], N["price-drop"][1], "9:00"),
                          ("3 cards on your wishlist got cheaper", "Jace, Dina and 1 more.", "9:00")])
    shade = U.shade([(N["spare-request"][0], N["spare-request"][1], "lathliss.jpg", False),
                     (N["trade-match"][0], N["trade-match"][1], "gisa.jpg", False),
                     (N["combo"][0], N["combo"][1], None, False),
                     (N["new-precon"][0], N["new-precon"][1], None, False)])
    macb = U.mac([(N["price-drop"][0], N["price-drop"][1], "jace.jpg"), ("You can make 4 new combos", "From the cards you just added.", None)])
    land = ph(S.friends_page(False, asks=False), "Friends", fold=True)
    rows = "".join(f'<tr><td><b>{k}</b></td><td><b>{t}</b><br>{b}</td><td>{l}</td><td>{c}</td></tr>' for k, t, b, im, l, c in U.NOTE)
    tbl = (f'<div class="note" style="max-width:1500px"><h4>Every kind: the words, where a tap lands, and a burst</h4><table class="tbl">'
           '<tr><th>Kind</th><th>Title · body</th><th>A tap lands on</th><th>When several come at once</th></tr>' + rows + '</table>'
           '<p style="margin-top:10px">Title and body are the feed item’s (<code>feedCopy.home.title</code> / <code>line</code>), reworded only where a push stands alone: the price drop spells was and now (no strike in a notification), the combo names its kind, the spare request says where to answer. '
           'Every landing marks that item seen. The app’s icon is <code>public/icons/icon-192.png</code>; the card image is the feed item’s own picture.</p></div>')
    body = (board_head("The notification · title, body, where it lands", "Each push is the feed item, sent",
                       "Drawn on the three surfaces most readers will see: an iPhone lock screen (installed app), the Android shade (Chrome) and a macOS banner (Chrome). "
                       "No action buttons, so the same push works everywhere. Times show the overnight hold: what came in the night arrived at 9:00, collapsed.")
            + frames(frame("<b>iPhone</b> · lock screen", lock, "iOS shows the app’s icon and name; no card image. The two at 9:00 waited out the night (Delivery)."),
                     frame("<b>Android</b> · the shade", shade, "Android and desktop show the feed item’s card at card shape beside the words (never an art crop). Order is the system’s."),
                     frame("<b>The spare request’s landing</b> · /friends", land, "Waiting on you, the request in view with Yes and No. The badge drops when it’s answered, as shipped."))
            + frames(frame("<b>A computer</b> · macOS banner", macb, "Chrome names the site under the app. A burst of combos from one upload is one banner."))
            + tbl)
    return doc("Notifications · per kind", body, 1430)


# ================================================================ Delivery
def timeline(events):
    """A day as rows: when it happened, what happened, what the reader gets and when."""
    rows = "".join(f'<tr><td class="m">{t}</td><td>{ev}</td><td>{"<b>" + got + "</b>" if push else got}</td></tr>' for t, ev, got, push in events)
    return f'<table class="tbl"><tr><th>When</th><th>What happened</th><th>What shows</th></tr>{rows}</table>'


def delivery_board():
    a_tl = timeline([("02:20", "The price run: 3 wishlist drops", "Held for the night", False),
                     ("09:00", "", "One push: 3 cards on your wishlist got cheaper", True),
                     ("13:12", "Peter asks for your spare", "One push, at once", True),
                     ("14:09", "An upload completes 4 combos", "One push: You can make 4 new combos", True),
                     ("22:40", "A new precon is out", "Held until 09:00 tomorrow", False)])
    b_tl = timeline([("02:20 to 22:40", "Drops, Peter’s ask, 4 combos, the precon", "Nothing yet; all of it waits", False),
                     ("09:00 next day", "", "One digest push, landing on Home", True)])
    dig = U.ios_note("Today on The 99", "Peter asks for your spare Lathliss · 3 price drops · 4 combos · Colin has a spare.", "9:00")
    a = ('<div class="opt rec"><h4><span class="pill">RECOMMENDED · A</span>Each as it happens, bursts as one, nights held</h4>'
         + a_tl +
         '<ul><li>In the day, a push goes when its event is written: a spare request reaches the friend within minutes, which matters on a 14-day clock.</li>'
         '<li>Several of one kind from <b>one job</b> (a price run, one upload’s combos, one friend’s new spares) are <b>one push</b> that lands on Home’s What’s new. Bursts are the real noise, and they come from jobs.</li>'
         '<li><b>Nothing 9pm to 9am</b> in the device’s own time zone. What waited goes at 9:00, one per kind. Fixed, no setting: the phone’s Focus covers the rest.</li>'
         '<li>Settings gains nothing for it; the foot line says it.</li></ul></div>')
    b = (f'<div class="opt"><h4><span class="pill alt">B</span>One digest a day</h4>{b_tl}'
         '<ul><li>One push at 9:00 listing yesterday’s kinds, landing on Home. Quietest.</li>'
         '<li>A spare request waits up to a day, and the friend sees its 14 days running down. It would need to be the exception, which makes two rules.</li>'
         '<li>A digest wants a time picker in Settings: a new control for one line.</li></ul>'
         f'<div style="width:370px;background:#2a1c14;border-radius:22px;padding:8px;font-family:-apple-system,sans-serif;color:#fff">{dig}</div></div>')
    q = ('<div class="opt"><h4><span class="pill alt">QUIET HOURS</span>A fixed night, not a setting</h4>'
         '<ul><li><b>Our call:</b> the 9pm to 9am hold in A is the quiet hours. One rule, no control, nothing to explain beyond the foot line.</li>'
         '<li><b>Not picked:</b> a from/to picker. Every phone and computer already has Do Not Disturb and Focus, and they work for every app at once.</li>'
         '<li>Spare requests wait too: nothing in The 99 is urgent at 2am.</li></ul></div>')
    body = (board_head("Delivery · open for Design", "Send each, collapse the bursts, keep the night quiet",
                       "Hugh left two things open: batch (one a day) or each event, and quiet hours. Both drawn; A is our pick. Each option is drawn as one day; bold is a push the reader sees.")
            + f'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;max-width:1500px">{a}{b}{q}</div>')
    return doc("Delivery · each or digest", body, 1612)


BOARDS = [("Main", main_board, "R1 · the flow, calls, gaps"),
          ("Settings", settings_board, "Settings · the push column"),
          ("Device-States", states_board, "Settings · the device row’s states"),
          ("The-Ask", ask_board, "The ask · tick, prompt, allow or block"),
          ("iPhone", iphone_board, "iPhone · Add to Home Screen first"),
          ("Notifications", notes_board, "The notification · per kind, and where a tap lands"),
          ("Delivery", delivery_board, "Delivery · each event or a digest, quiet hours")]

import aboutgen
BOARDS.append(("About", aboutgen.about_board, "About · the push entry in the Reference"))
