"""Flyer trial R1 boards."""
import kit, fly as F, sr as S
from kit import frame, frames, doc


def bh(k, t, c):
    return kit.board_head(k.replace("R1 ·", "R1b ·"), t, c, tag="R1b")

W = {}


def board(name, title, width):
    def deco(fn):
        W[name] = (fn, title, width)
        return fn
    return deco


def note(h, body):
    return f'<div class="note"><h4>{h}</h4>{body}</div>'


def lab(n, t):
    return f'<b>{n}</b> · {t}'


# ---------------------------------------------------------------- Main
@board("Main", "R1 · the trial, calls, questions, gaps", 1612)
def main():
    head = bh("Flyer trial · R1b · account 2 · 2026-10-30", "A card-store flyer trial",
              "A printed flyer whose QR opens a sign-up for that store, codes Hugh makes and revokes in /admin, and two ways "
              "players tell us things: a problem report and a check-in. Drawn over the shipped /join, /admin, error screen, "
              "About index and Home. Hugh’s rulings are locked; Design’s calls are below with the three questions he left open.")
    locks = ('<table class="tbl"><tr><th>Locked (Hugh, 2026-10-29)</th><th>Where it holds</th></tr>'
             '<tr><td>Personal invites unchanged (the QR still befriends; per-user limits stay)</td><td>Nothing on Add a friend changes. Flyer pieces sit beside, never inside, the invite flow.</td></tr>'
             '<tr><td>A flyer code is long-lived, revocable, on Hugh’s account, draws his invites, never befriends Hugh, ends at launch</td><td>Admin 4 (section meta “from your invites, 37 left”; Revoke), tree node “no friend link to Hugh”, Join 2 Expired.</td></tr>'
             '<tr><td>A label per store, max 50 sign-ups</td><td>Admin 4 Store column, Sign-ups “n of 50”; Join 2 All taken.</td></tr>'
             '<tr><td>Sign-ups land in the store’s group (3 free runs a day, 15 welcome credits), get 3 invites; their invitees join the group and befriend them</td><td>Admin 4 form facts and tree; Join 2 fine print.</td></tr>'
             '<tr><td>Feedback in-app only, read in /admin, no Discord</td><td>Report 7–8, Survey 9–10, Admin 11.</td></tr></table>')
    calls = note("Design’s calls", "<ol>"
                 "<li><b>The flyer is the brand’s card fan in one ink</b>: crowned 99 and THE, a kicker, the pitch in Cinzel, three card outlines with the QR printed on the front card, the URL with its code underlined, three facts at the foot. Black on goldenrod; any light stock works (board 1).</li>"
                 "<li><b>A code is six readable characters</b> (no 0/O, 1/I) on the invite route: <code>the-99.dev/join/MOX4QK</code>. Short enough to type off a corkboard.</li>"
                 "<li><b>/join keeps the shipped newcomer column.</b> No sender, so the card is face up as an Invitation from The 99 itself: the crowned 99 in the art box, “From a flyer” on the credit line. The email and code steps are unchanged; only the lines that named a sender change. Ended codes show the card back and name nobody.</li>"
                 "<li><b>The store label never reaches a player.</b> It is Hugh’s note; the page and the flyer don’t print it.</li>"
                 "<li><b>Admin: Flyer codes is a section at the top of Invites</b>, not a new tab. New flyer code opens a form in place; Revoke confirms in ModalChrome (a sheet on phone); Print opens the flyer at letter size. The tree gains a flyer node under Hugh.</li>"
                 "<li><b>Report a problem</b>: one row on About’s index (menu › About The 99) and a quiet “Tell us what happened” on the error screen. Both open one short form, a sheet on phone and a modal on desktop.</li>"
                 "<li><b>The check-in opens only on Home</b>, after the page settles, as the shipped sheet (phone) or modal (desktop). Not now brings it back later; ✕ ends this check-in.</li>"
                 "<li><b>Admin Feedback is an eighth tab</b>: both kinds in one list, filter pills, an unread dot, the flyer store’s group on each row.</li>"
                 "<li>Failures are the shared toast with Try again; text and answers are kept.</li></ol>")
    qs = note("For Hugh (the three left open, plus one)", "<ol>"
              "<li><b>Where Report a problem lives.</b> Recommend About’s index, the row under the six pages (board 7). Not a user-menu row, per your rule. Alternative: a row at the foot of Settings.</li>"
              "<li><b>The check-in’s placement and dismissal.</b> Recommend Home only, as a sheet / modal; <b>Not now</b> snoozes, <b>✕</b> closes this round for good. Alternative: an inline card on Home like the welcome strip (quieter, easy to scroll past).</li>"
              "<li><b>The pitch line</b> (to /copy-review). Recommend “Build Commander decks from the cards you already own.” Two others on board 1.</li>"
              "<li><b>Tear-off tabs?</b> Drawn as B on board 1. Recommend A: the QR is the fast way in, and tabs shrink it.</li></ol>")
    gaps = note("Gaps for engineering", "<ol>"
                "<li><b>Route.</b> <code>/join/[token]</code> tells a 6-character code from a 43-character invite token; codes match case-insensitively. Rate-limit lookups per IP.</li>"
                "<li><b>The hold.</b> Send code claims one of the 50 for the code’s 10 minutes, as the QR claim holds an invite; released if unproven.</li>"
                "<li><b>Hugh’s count.</b> Each sign-up spends one of Hugh’s invites. At 0 every code reads All taken until he tops up.</li>"
                "<li><b>Launch.</b> One switch retires every code; the landing then reads Open to everyone and goes to sign-up.</li>"
                "<li><b>Groups.</b> Make code creates the group (daily credits 3) or joins an existing one; a flyer sign-up’s invitees inherit the group.</li>"
                "<li><b>Feedback store.</b> kind, account, answers, page, device, error digest, read_at. Admin shows names, never emails.</li>"
                "<li><b>Check-in timing</b> lives in code (e.g. 14 days and 5 visits); Not now snoozes a few days; ✕ closes the round.</li>"
                "<li><b>Root errors</b> (<code>global-error.tsx</code>) draw no shell: the link opens the same form as a page.</li></ol>")
    r1b = note("R1b · Hugh’s notes, 2026-10-30", "<ol>"
               "<li><b>Naming Magic.</b> The flyer names it: the kicker reads “Magic: The Gathering · Commander”. In the store “Commander” is enough, but a flyer gets photographed and shared, and outside the store “Commander” alone means nothing. Naming Wizards’ game brings the locked Fan Content line (passage one) to the flyer’s foot in small print.</li>"
               "<li><b>No “invite only”.</b> The flyer asks people to try it before launch (a sub-line under the pitch; foot “Free to try”). /join’s title is “Try The 99 before it launches”.</li>"
               "<li><b>Launch list.</b> Used-up and ended flyers take an email and say they’ll tell them at launch (Join 2, E1 to E3). Admin shows the count per flyer and a CSV (board 4).</li>"
               "<li><b>No lone last words.</b> Every heading balances and every line of copy wraps to avoid one word on its own line; checked on every board.</li>"
               "<li><b>Quieter warnings.</b> The error screen loses “Your decks and collection are fine” (a change to shipped copy, <code>shellCopy.errorBoundary.body</code>); the report form loses “Nothing else.”</li>"
               "<li><b>Report sent</b> reads “We’ll be in touch if we need any more insight.”</li>"
               "<li><b>Check-in pills</b> are one size: a three-column grid; “Building decks” becomes “Decks”, Precons joins as the sixth, and “Not yet” folds into Maybe.</li></ol>")
    return head + r1b + locks + f'<div class="notes">{calls}{qs}{gaps}</div>'


# ---------------------------------------------------------------- 1 Flyer
@board("Flyer", "1 · The flyer (letter, one ink)", 2420)
def flyer_b():
    head = bh("1 · print · letter 8.5 × 11 in, drawn at 96 px/in", "The flyer",
              "One colour of ink on coloured paper, from the brand handoff: the crowned 99 with THE, Cinzel for the pitch, Plex Mono for the URL. "
              "The card fan (the brand’s secondary mark for marketing) carries the QR on its front card. Every flyer prints from its code’s page in /admin (board 6), so the QR and URL are that store’s.")
    a = frame(lab("A", "recommended"), F.flyer(), "Wordmark, kicker naming the game, pitch, the try-before-launch line, the fan with the QR, <b>or type</b> the URL, three facts, the Fan Content line. Nothing names the store.")
    b = frame(lab("B", "with tear-off tabs"), F.flyer(tabs=True), "Eight tabs carry the URL. The fan shrinks to fit; the Fan Content line would sit on the tabs’ edge. Not recommended.")
    minis = ('<div class="swl">' + F.mini("#E7B54A", "goldenrod") + F.mini("#9CC3E4", "sky") + F.mini("#EFA6B6", "pink")
             + F.mini("#B9D88F", "lime") + F.mini("#F1ECE0", "white") + '</div>')
    pitch = '<div class="pitch">' + "".join(
        f'<div class="p{" rec" if i == 0 else ""}"><i>{i + 1}</i><span><b>{t}</b><small>{c}</small></span></div>'
        for i, (t, c) in enumerate(F.PITCHES)) + '</div>'
    side = (f'<div style="display:flex;flex-direction:column;gap:30px;width:560px">'
            f'{frame("Paper", minis.replace("swl", "swl\" style=\"flex-wrap:wrap;width:560px;gap:20px 26px"), "Black ink holds on each; the QR needs a light stock (not dark red, navy or black).")}'
            f'{frame("The pitch · for /copy-review", pitch)}</div>')
    return head + frames(a, b, side, gap=56)


# ---------------------------------------------------------------- 2 Join phone
@board("Join-Phone", "2 · /join for a flyer code · 390", 3314)
def join_phone():
    head = bh("2 · /join/[code] · phone 390 · signed out", "The flyer’s landing",
              "The shipped newcomer page (NEWCOMER_MAIN, NewcomerColumn, the compact FriendCard), with no sender. A live code shows the card face up; "
              "the email and code steps are the shipped ones. Ended codes show the back and name nobody, as an ended invite QR does. A signed-in reader goes Home, as today.")
    fs = [frame(lab("V1", "valid"), F.join_phone("valid"), "Title and fine print are new; the body, field and Send code are shipped."),
          frame(lab("V2", "the code"), F.join_phone("code"), "Unchanged (shipped N3 to N5)."),
          frame(lab("V3", "proven"), F.join_phone("proven"), "The body loses the sender: it names what they start with."),
          frame(lab("E1", "used up"), F.join_phone("full"), "50 sign-ups reached, or Hugh is out of invites. One field for the launch list."),
          frame(lab("E1b", "on the list"), F.join_phone("listed"), "Their email, once, the day The 99 opens. A failed save is the shared toast."),
          frame(lab("E2", "revoked"), F.join_phone("revoked"), "No reason given; the same launch list."),
          frame(lab("E3", "expired · after launch"), F.join_phone("ended"), "Every code retires at public launch. The press goes to sign-up; the back is dimmed as the shipped expired card is.")]
    return head + frames(*fs, gap=44)


# ---------------------------------------------------------------- 3 Join desktop
@board("Join-Desktop", "3 · /join for a flyer code · desktop", 1412)
def join_desk():
    head = bh("3 · /join/[code] · desktop 1300", "The landing on desktop",
              "The join steps are one scale at every width (shipped): the same column, centred under the desktop wash. Drawn for the valid code and one ended state; the others follow the phone.")
    return head + frame(lab("V1", "valid"), F.join_desk("valid", 760)) + frame(lab("E1", "used up"), F.join_desk("full", 700))


# ---------------------------------------------------------------- 4 Admin desktop
@board("Admin-Desktop", "4 · /admin Invites: flyer codes · desktop", 1412)
def admin_desk():
    head = bh("4 · /admin/invites · desktop 1300", "Flyer codes in the Invites tab",
              "A section above the shipped tree, built from the admin pieces (SectionHead, the 12px cards, accent text buttons, the group chip). "
              "Sign-ups read “n of 50” with a bar; full turns --warning; revoked rows stay, dimmed, with their date. The tree gains a flyer node under Hugh, tagged with its code, its sign-ups under it.")
    body1 = F.codes_head() + F.codes_table() + F.launch_list() + '<div class="sech2"><div class="t"><h2>Who invited whom</h2><small>founders · accounts from before launch</small></div></div>' + F.tree_rows()
    f1 = frame(lab("A1", "the section and the tree"), F.admin_desk(body1))
    body2 = F.codes_head(True) + F.new_form() + F.codes_table()
    f2 = frame(lab("A2", "New flyer code"), F.admin_desk(body2),
               "Opens in place. <b>Store</b> is Hugh’s label. <b>Group</b> defaults to a new group named from the store with daily credits 3; any existing group can be picked. The chips are fixed by the rulings. Make code adds the row on top.")
    f3 = frame(lab("A3", "Revoke"), F.admin_desk(F.codes_head() + F.codes_table(), h=640, over=F.confirm(True, 170)),
               "ModalChrome, bare ✕. Revoking ends new sign-ups only; who joined keeps everything.")
    return head + f1 + f2 + f3


# ---------------------------------------------------------------- 5 Admin phone
@board("Admin-Phone", "5 · /admin Invites: flyer codes · 390", 1460)
def admin_phone():
    head = bh("5 · /admin/invites · phone 390", "Flyer codes on a phone",
              "Each code is a stacked row: store and code, the bar and group, the date, then Print and Revoke at 44px. The head’s eyebrow and title scroll away; the tab strip stays (shipped).")
    fs = [frame(lab("P1", "the list"), F.admin_phone(F.codes_head() + F.codes_phone() + F.launch_list().replace("grid-template-columns:minmax(0,1fr) auto", "grid-template-columns:minmax(0,1fr)"))),
          frame(lab("P2", "New flyer code"), F.admin_phone(F.codes_head(True) + F.new_form(True) + F.codes_phone(F.CODES[:2]))),
          frame(lab("P3", "Revoke"), F.admin_phone(F.codes_head() + F.codes_phone(), over=F.confirm(False)))]
    return head + frames(*fs)


# ---------------------------------------------------------------- 6 Print
@board("Print", "6 · Print a flyer", 1412)
def print_b():
    head = bh("6 · /admin/invites/flyers/[code] · desktop", "Print a flyer",
              "Print on a code’s row opens its flyer at letter size with a screen-only bar: <b>Print</b> (the browser’s dialog; the bar doesn’t print) and <b>Download QR</b> (a PNG, for a sticker or a table tent). Revoked codes have no Print.")
    return head + frame(lab("PV", "the print page"), F.print_view())


UNDER = f'<div style="flex:1;display:flex">{F.error_screen()}</div>'

# ---------------------------------------------------------------- 7 Report phone
@board("Report-Phone", "7 · Report a problem · 390", 3364)
def report_phone():
    head = bh("7 · feedback (a) · phone 390", "Report a problem",
              "Two ways in, one form. The error screen gains a quiet third line under its two buttons; About’s index (menu › About The 99) gains one row above Terms and Privacy. "
              "The form is the shipped sheet: two boxes, the second optional, and a line saying what we attach. Sent replaces the form; a failed send is the shared toast.")
    err = kit.phone(UNDER, active="Decks", h=844)
    aix = kit.phone(F.about_index(), active=None)
    fs = [frame(lab("R1", "the error screen"), err, "“Tell us what happened” sits under Try again and Back home, 44px tall. It carries the error code into the form."),
          frame(lab("R2", "About’s index"), aix, "One row under the six pages: <b>Report a problem</b>. Reachable anytime, two presses from any page."),
          frame(lab("R3", "the form"), kit.phone(UNDER, active="Decks", h=844, over=F.report_sheet("empty")), "Send stays dim until the first box has text."),
          frame(lab("R4", "typed, sending"), kit.phone(UNDER, active="Decks", h=844, over=F.report_sheet("sending")), "Sending… holds the press; the sheet can’t close mid-send."),
          frame(lab("R5", "sent"), kit.phone(UNDER, active="Decks", h=844, over=F.report_sheet("sent")), "The sheet shortens to the thanks. Close or ✕."),
          frame(lab("R6", "failed"), kit.phone(UNDER, active="Decks", h=844, over=F.report_sheet("typed") + S.toast("We couldn’t send that. Try again.", 470).replace("<b>✕</b>", '<b style="width:auto;padding:0 10px;color:var(--accent-text);font-weight:600">Try again</b>')), "The shared toast; the text stays.")]
    return head + frames(*fs)


# ---------------------------------------------------------------- 8 Report desktop
@board("Report-Desktop", "8 · Report a problem · desktop", 2730)
def report_desk():
    head = bh("8 · feedback (a) · desktop 1300", "Report a problem on desktop",
              "The same two ways in. The form is ModalChrome, 520 wide, with Cancel beside Send.")
    err = F.error_screen(desk=True)
    d1 = kit.desk(f'<div style="flex:1;display:flex">{err}</div>', active="Decks", h=640)
    d2 = kit.desk(F.about_index(desk=True), active=None)
    d3 = kit.desk(f'<div style="flex:1;display:flex">{err}</div>', active="Decks", h=640, over=F.report_modal("typed", 70))
    d4 = kit.desk(f'<div style="flex:1;display:flex">{err}</div>', active="Decks", h=640, over=F.report_modal("sent", 150))
    return (head + frames(frame(lab("D1", "the error screen"), d1), frame(lab("D2", "About’s index"), d2))
            + frames(frame(lab("D3", "the form, typed"), d3), frame(lab("D4", "sent"), d4)))


# ---------------------------------------------------------------- 9 Survey phone
@board("Survey-Phone", "9 · Check-in · 390", 2246)
def survey_phone():
    head = bh("9 · feedback (b) · phone 390 · over the shipped Home", "The check-in",
              "Opens on Home only, after it settles, once a player qualifies (timing in code). Three short questions and a box. "
              "<b>Not now</b> brings it back in a few days; <b>✕</b> ends this check-in. Send needs the first answer.")
    fs = [frame(lab("S1", "opens on Home"), F.shot_phone("p-home.webp", F.survey_sheet("empty"))),
          frame(lab("S2", "answered"), F.shot_phone("p-home.webp", F.survey_sheet("answered"))),
          frame(lab("S3", "sent"), F.shot_phone("p-home.webp", F.survey_sheet("sent")), "Thanks, then Close."),
          frame(lab("S4", "failed"), F.shot_phone("p-home.webp", F.survey_sheet("answered") + S.toast("We couldn’t send that. Try again.", 610).replace("<b>✕</b>", '<b style="width:auto;padding:0 10px;color:var(--accent-text);font-weight:600">Try again</b>')), "Answers kept.")]
    return head + frames(*fs)


# ---------------------------------------------------------------- 10 Survey desktop
@board("Survey-Desktop", "10 · Check-in · desktop", 2730)
def survey_desk():
    head = bh("10 · feedback (b) · desktop 1300 · over the shipped Home", "The check-in on desktop",
              "ModalChrome, 560 wide, over Home. Same questions; the presses sit right with a mono hint on the left.")
    return head + frames(frame(lab("S5", "answered"), F.shot_desk("d-home.webp", F.survey_modal("answered", 60))),
                         frame(lab("S6", "sent"), F.shot_desk("d-home.webp", F.survey_modal("sent", 230))))


# ---------------------------------------------------------------- 11 Admin feedback
@board("Admin-Feedback", "11 · /admin Feedback", 2000)
def admin_fb():
    head = bh("11 · /admin/feedback · desktop 1300 and phone 390", "Reading feedback",
              "An eighth tab, <b>Feedback</b>: both kinds newest first, pills to narrow, a dot until Hugh has seen a row, and the player’s group when it is a store’s. "
              "Problems carry their context chips (page, error code, device, where it came from). Names only; emails stay masked as elsewhere in admin.")
    sub = "What players told us: problem reports and check-ins, newest first."
    d = F.admin_desk(F.fb_bar() + F.fb_rows(), tab="Feedback", sub=sub, extra_tab="Feedback")
    p = F.admin_phone(F.fb_bar("Problems").replace('<span class="sum">', '<span class="sum" style="margin-left:0;flex-basis:100%">') + F.fb_rows([r for r in F.FB if r[0] == "pb"], True),
                      tab="Feedback", sub=sub, extra_tab="Feedback")
    return head + frames(frame(lab("F1", "all"), d), frame(lab("F2", "problems, phone"), p))


BOARDS = [(n, (lambda n=n: doc(W[n][1], W[n][0](), W[n][2])), W[n][1]) for n in W]
