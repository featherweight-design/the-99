"""Account in Settings R1 (account 2, 2026-11-14). Boards over the SHIPPED Settings page, account menu, shell and landing,
SSR-rendered with the shipped CSS from a scratch copy of main plus the proposal as code (scratch-gen/proposal/).
python3 acc.py <out> [blob]   (blob: /_blob urls for the canvas; else art/<name>.webp for the repo)"""
import json, os, sys
OUT = sys.argv[1]; BLOB = "blob" in sys.argv
HERE = os.path.dirname(os.path.abspath(__file__))
B = json.load(open(f"{HERE}/blobs.json"))
os.makedirs(OUT, exist_ok=True)


def src(n): return f"/_blob/{B[n]}" if BLOB else f"art/{n}.webp"


CSS = """body{margin:0}
.b{box-sizing:border-box;background:#17130F;color:#EDE6D8;font-family:'IBM Plex Sans',sans-serif;padding:56px 64px;display:flex;flex-direction:column;gap:36px}
.tag{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#CF8745}
.h1{font-size:34px;font-weight:600;margin:6px 0 10px}
.lede{font-size:15px;line-height:1.6;color:#C9BEA8;max-width:1180px;margin:0}
.notes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.note{background:#1E1A15;border:1px solid #2A241D;border-radius:10px;padding:14px 16px;font-size:13.5px;line-height:1.55;color:#C9BEA8}
.note b{color:#EDE6D8}
.note code,.cap code,.lede code{font:12px 'IBM Plex Mono',monospace;color:#E3A56A}
.nh{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#A89B84;margin:0 0 10px}
.frames{display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap}
.f{display:flex;flex-direction:column;gap:10px}
.fl{font:500 11.5px 'IBM Plex Mono',monospace;color:#A89B84}
.fl b{color:#EDE6D8;font-weight:600}
.shot{display:block;border-radius:14px;border:1px solid #3A3229}
.cap{font-size:13px;line-height:1.5;color:#C9BEA8;margin:0}
.cap b{color:#EDE6D8}
.draft{font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 6px}
.empty{box-sizing:border-box;border:1.5px dashed #3A3229;border-radius:14px;padding:22px;font-size:13.5px;line-height:1.6;color:#C9BEA8}
.empty b{color:#EDE6D8}
"""


def doc(title, body, w, h):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&amp;family=IBM+Plex+Sans:wght@400;600&amp;display=swap">
<style>
{CSS}</style>
</helmet>
<div class="b" style="width: {w}px; min-height: {h}px">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
"""


def head(tag, title, lede): return f'<div><div class="tag">{tag}</div><div class="h1">{title}</div><p class="lede">{lede}</p></div>'
def notes(h, items): return f'<div><p class="nh">{h}</p><div class="notes">' + "".join(f'<div class="note">{i}</div>' for i in items) + "</div></div>"


def P(label, name, cap, theme="amonkhet"):
    n = f"{theme}-p-{name}"
    return f'<div class="f" style="width: 390px"><div class="fl">{label}</div><img class="shot" src="{src(n)}" alt="" style="width: 390px; height: 844px"><p class="cap">{cap}</p></div>'


def D(label, name, cap):
    n = f"amonkhet-d-{name}"
    return f'<div class="f" style="width: 975px"><div class="fl">{label}</div><img class="shot" src="{src(n)}" alt="" style="width: 975px; height: 675px"><p class="cap">{cap}</p></div>'


def frames(*fs): return '<div class="frames">' + "".join(fs) + "</div>"
def EMPTY(label, html, w=390, h=300): return f'<div class="f" style="width: {w}px"><div class="fl">{label}</div><div class="empty" style="min-height: {h}px">{html}</div></div>'


DR = '<span class="draft">DRAFT</span>'
T = "Account in Settings · R1"
W = 2280
boards = {}

# ---- Main: the calls --------------------------------------------------------------------------------------------
CALLS = [
 "<b>1 · Placement: a section, last on Settings.</b> <code>/settings</code> gains <b>Account</b> after Your decks, in the shipped section pattern (mono head over a rule, rows split by <code>--border</code>). Last, because Delete account belongs at the foot of the page and the other three sections are what a player visits most. No <code>/settings/account</code> page and no sheet: settings stay in one place.",
 "<b>2 · The menu's Manage account row leaves.</b> Settings (already in the menu) is the one door. The menu goes About, Take the tour, Settings, Sign out (Admin where it applies). Nothing is lost: everything Manage account reached is in the section or behind its More account options link.",
 "<b>3 · In the app: name, devices, delete.</b> Email, password and Google stay on Clerk's hosted page behind <b>More account options ›</b>, which leaves the app as Manage account does today. None of Clerk's prebuilt UI is loaded.",
 "<b>4 · One name, two doors.</b> The name is the one Friends already edits (friends-head.tsx: \"the ONE place a player sets their name\"). Account's Change opens that same field with its shipped copy and write; Friends keeps its Change. The write also sets Clerk's first name so Clerk's page and emails agree (gap G2).",
 "<b>5 · Devices.</b> <b>Signed in on · N</b>: one row per Clerk session, browser on device, when it was last active and where. This device is marked and has no Sign out (the menu's Sign out is that). Every other row has its own Sign out. No \"sign out of all\": one control per action.",
 "<b>6 · Delete is one modal with two screens.</b> The shipped SocialModal (sheet on the phone, 440 dialog from md). D1 says what goes in plain words, the pods line, the paid-credits split when held, and <b>It can't be undone</b>; the player types <b>delete</b>, then Keep / Delete account (the app's shipped Keep-then-danger pair). D2 is Clerk's step-up, with ‹ back to D1.",
 "<b>7 · The confirm gesture is the typed word.</b> Clerk only asks to re-verify when the last check is older than its window, so a player who signed in minutes ago never sees D2: the word is the gesture that always runs. A hold is hard with a switch or a screen reader; a second press is one slip.",
 "<b>8 · After: the public landing, signed out, with a toast.</b> <b>Your account is deleted.</b> in the shipped toast, then gone. No goodbye page and no banner. Friends are not told.",
]
body = head(T, "Account in Settings: the calls",
            "Settings gains an Account section, and deleting an account happens in the app, in our own UI. Every frame is the SHIPPED page, menu, modal and landing, rendered with the shipped CSS; the new section and the delete screens are written as code over them (<code>scratch-gen/proposal/</code>). Copy marked " + DR + " passes /copy-review before build.")
body += notes("Calls", CALLS)
body += frames(
    P("SETTINGS · ACCOUNT · 390", "s-default", "Scrolled to Account, the last section. Big rows, 44px targets."),
    P("ACCOUNT MENU · 390", "m-after", "Manage account is gone; Settings is the door."),
    P("D1 · DELETE · 390", "d1", "What goes, then the word. Delete account wakes when <b>delete</b> is typed."),
    P("D2 · CONFIRM IT'S YOU · 390", "d2-code", "Clerk's step-up, drawn in our sign-in parts."),
    P("AFTER · 390", "x-landing", "The public landing, signed out, with the shipped toast."),
)
boards["Main"] = (body, W, "Account in Settings · the calls")

# ---- Placement ------------------------------------------------------------------------------------------------------
body = head("1 · 2 · 3 · 4 · 5 · " + T, "Placement: Settings' last section, and the menu",
            "The section sits under Your decks in the same 720 column, at every width one element (only sizes move at md). The menu loses Manage account and keeps Settings in its row.")
body += frames(
    P("SETTINGS · ACCOUNT · 390", "s-default", "Your name with Change; Email and sign-in with More account options ›; Signed in on with a Sign out per other device; Delete account with its outline press, full width on the phone."),
    P("SHIPPED MENU · 390", "m-before", "Today: Manage account leaves for Clerk's hosted page."),
    P("PROPOSED MENU · 390", "m-after", "Four rows. The sheet is otherwise as shipped."),
)
body += frames(
    D("SETTINGS · ACCOUNT · 1300", "s-default", "Change and Sign out sit at the row's right edge (32px tall at md, 44 on the phone). More account options keeps a short line after it at md saying what it reaches."),
    D("PROPOSED MENU · POPOVER · 1300", "m-after", "The rail popover without Manage account."),
)
body += notes("Rows", [
 "<b>Your name.</b> A muted label, the name in <code>--fg</code> 14/500, the line <i>Friends see it with your signature card.</i> " + DR + " Change opens the shipped name field in place of the row (next board).",
 "<b>Email and sign-in.</b> The primary email and how the account signs in (<i>Signs in with Google and email code.</i>, <i>password and email code</i>). It tells a player which step-up D2 will ask for. <b>More account options ›</b> calls Clerk's <code>redirectToUserProfile()</code>, as Manage account does now.",
 "<b>Signed in on · N.</b> The Kept back sub-head pattern. Each row: a device glyph (phone, tablet, laptop; stroke 1.6, <code>--fg-muted</code>), <code>{browser} on {device}</code>, then <i>This device</i> in <code>--accent-text</code> or <i>Last active 2 days ago</i>, then city and country from Clerk's session activity.",
 "<b>Delete account.</b> Under its own rule, 22px below the devices. The press is the outline (<code>--border-strong</code>) with <code>--danger</code> words, 44px full width on the phone, 36px at md. The filled danger press waits for D1, after the word.",
])
boards["Placement"] = (body, W, "1–5 · Placement and the menu")

# ---- Section states ------------------------------------------------------------------------------------------------
body = head("STATES · " + T, "The section's states",
            "Every state below has a trigger in the build: the name field, Clerk's session read (<code>user.getSessions()</code>, client side, after the page draws), and a device's revoke.")
body += frames(
    P("NAME · EDITING · 390", "s-editing", "The shipped name field: <i>Your name, as friends see it</i>, the 30-character hint, Cancel / Save. Save, Return or a blur commits; Escape or Cancel puts it back. A failed save is Friends' shipped toast."),
    P("DEVICES · LOADING · 390", "s-loading", "The sub-head without a count and a mono line, <i>Finding your devices…</i> " + DR + " The rest of the section is drawn at once."),
    P("DEVICES · READ FAILED · 390", "s-failed", "<i>We couldn't load your devices.</i> with Try again. " + DR + " Nothing else on the page is held."),
    P("DEVICE · SIGNING OUT · 390", "s-signing-out", "The row dims to .55 and Sign out becomes <i>Signing out…</i>. On success the row leaves; a failure puts it back with the shipped toast, <i>We couldn't sign out that device. Try again.</i> " + DR),
)
body += frames(
    P("ONE DEVICE · 390", "s-one-device", "Only this device: one row, no Sign out. The explainer still shows, so the section reads the same."),
    P("PASSWORD ACCOUNT · 390", "s-password", "The sign-in line names what the account has: <i>password and email code</i>. D2 then asks for the password."),
    D("NAME · EDITING · 1300", "s-editing", "At md the field is 420 wide in the column, as on Friends."),
)
boards["Section-States"] = (body, W, "States · the section")

# ---- Delete flow ---------------------------------------------------------------------------------------------------
body = head("6 · 7 · 8 · " + T, "The delete flow, end to end",
            "Delete account… opens the modal on D1. Typing <b>delete</b> wakes the danger press. Delete account calls <code>user.delete()</code> through <code>useReverification</code>: inside Clerk's window it runs at once (Deleting… on D1); outside it, D2 asks for the account's factor, then Confirm and delete runs it. Success signs the session out and lands on <code>/</code>.")
body += frames(
    P("D1 · NO PAID CREDITS · 390", "d1", "Four plain lines of what goes, the pods line, then <b>It can't be undone.</b> Delete account sits at .45 until the word is typed."),
    P("D1 · TYPED · 390", "d1-typed", "The word, any case, spaces trimmed. The field is a plain input with autocapitalize and autocorrect off."),
    P("D1 · PLAN SUBSCRIBER WITH PACKS · 390", "d1-held", "The shipped deletion warning's split, moved inside the flow, then <i>You have 114 paid credits. Deleting your account forfeits them: 74 plan credits and 40 pack credits. Your plan ends now and won't renew.</i> and the refund line, widened to a plan's first month. " + DR),
    P("D1 · PACKS ONLY · 390", "d1-packs", "Only what is held is drawn (D2 of buying credits). No plan line, and the shipped refund line as it is."),
)
body += frames(
    P("D2 · EMAIL-CODE ACCOUNT · 390", "d2-code", "Outside Clerk's window: Confirm it's you, with ‹ back to D1. More on the next board."),
    P("D2 · DELETING · 390", "d2-busy", "<i>Deleting…</i> on the press; ‹ and ✕ stay but the field is held. Inside the window the same busy press shows on D1."),
    P("AFTER · 390", "x-landing", "Clerk's delete ends the session; the app does a full load of <code>/?deleted=1</code>, the shipped toast says <i>Your account is deleted.</i> " + DR + " and the param leaves the address bar (<code>mirrorUrl</code>). The toast sits 16px off the foot (no tab bar here)."),
)
body += frames(
    D("D1 · PLAN SUBSCRIBER · 1300", "d1-held", "The 440 dialog at 10% from the top, as SocialModal draws every modal."),
    D("AFTER · 1300", "x-landing", "The landing's hero with the toast centred at the foot."),
)
body += notes("What D1 says, and why", [
 "<b>What goes</b> is the purge, in a player's words: Collection and wishlist; every deck with its versions, games and notes; friends, pods and friend links; tool results, credits and settings. " + DR,
 "<b>The pods line</b> is the one effect on other people: <i>A pod you own passes to its longest-standing member. Friends aren't told; you leave their lists.</i> " + DR,
 "<b>What a plan subscriber is told</b>: <i>Your plan ends now and won't renew.</i> Deleting the Stripe customer cancels the subscription at once; there is nothing to manage first. The refund line names a plan's first month too, because the shipped refunds rule refunds it within 14 days.",
 "<b>The Manage account sentence is gone</b> from the shipped <code>del.says</code> (\"Nothing else in Manage account touches them\"): the warning now lives in the delete itself.",
])
boards["Delete-Flow"] = (body, W, "6–8 · The delete flow")

# ---- Re-verify -------------------------------------------------------------------------------------------------------
body = head("STEP-UP · " + T, "Confirm it's you: password, email code, Google",
            "D2 is drawn from the in-app sign-in's own parts (<code>auth-parts.tsx</code>, <code>join-parts.tsx</code>): the field, the six code boxes, the link row, the refusal lines. Its one press is the danger one, because it runs the delete.")
body += frames(
    P("PASSWORD ACCOUNT · 390", "d2-password", "<i>Enter the password for sam@example.com.</i> " + DR + " Confirm and delete waits for a password. <i>Email me a code instead</i> (shipped) switches to the code screen."),
    P("PASSWORD · TYPED · 390", "d2-password-typed", "Typed: the accent edge, the press wakes."),
    P("EMAIL-CODE ACCOUNT · 390", "d2-code", "Clerk sends the code when D2 opens. <i>We sent a 6-digit code to wren@example.com. It works for 10 minutes.</i> " + DR + " The shipped resend countdown."),
    P("GOOGLE ACCOUNT · 390", "d2-google", "Clerk's step-up has no Google step, so a Google account confirms by a code to its Google email: <i>You sign in with Google, so we sent a 6-digit code to …</i> " + DR + " (gap G3)."),
)
body += frames(
    D("PASSWORD ACCOUNT · 1300", "d2-password", "The same screen in the 440 dialog."),
    D("GOOGLE ACCOUNT · 1300", "d2-google", "Code boxes centred, as the sign-in draws them."),
)
boards["Re-Verify"] = (body, W, "Step-up · password, code, Google")

# ---- Delete states ---------------------------------------------------------------------------------------------------
body = head("STATES · " + T, "The delete's states",
            "Every line sits where the sign-in puts its refusals (8px under what it refuses, <code>--danger</code>, <code>role=alert</code>). Nothing is ever half deleted: a failure before the purge erased nothing, and the purge itself is one transaction.")
body += frames(
    P("STEP-UP CANCELLED · 390", "d1-cancelled", "‹ on D2 (Clerk's <code>cancel</code>) returns to D1 with the word kept and a quiet mono <i>Nothing was deleted.</i> " + DR + " ✕ closes the modal; the account is untouched."),
    P("WRONG PASSWORD · 390", "d2-password-wrong", "<i>That password isn't right. Try again, or email yourself a code.</i> " + DR + " with the danger edge on the field. The link below is the code."),
    P("WRONG CODE · 390", "d2-code-wrong", "The shipped <code>codeWrong</code> line under the boxes, the boxes in <code>--danger</code>. An expired code takes the shipped <code>codeExpired</code>."),
    P("FAILED DELETE · 390", "d1-failed", "<code>user.delete()</code> refused or the network dropped after the step-up: back on D1, <i>We couldn't delete your account. Nothing was deleted. Try again.</i> " + DR + " The word stays; Delete account is live again."),
)
body += frames(
    P("RATE LIMITED · D1 · 390", "d1-limited", "Our limit (<code>src/lib/rate/rules.ts</code>) or Clerk's 429: <i>Too many tries. Wait a few minutes, then try again.</i> " + DR),
    P("RATE LIMITED · D2 · 390", "d2-code-limited", "The same line under the boxes, which keep the typed code but not the danger edge: the code wasn't wrong."),
    EMPTY("LAST SIGN-IN METHOD · NOT DRAWN",
          "<b>No trigger in the app.</b> Removing an email or disconnecting Google stays on Clerk's page (product call), and Clerk refuses to remove the last way in there. Nothing in the Account section can remove a sign-in method, so no state is drawn for it.<br><br>If a later round brings email or Google in-app, its remove press is drawn disabled on the last method with the line <i>This is the only way into your account.</i> " + DR, 390, 360),
)
boards["Delete-States"] = (body, W, "States · the delete")

# ---- Themes ----------------------------------------------------------------------------------------------------------
TH = [("amonkhet", "Low Sun"), ("kamigawa", "Neon Rain"), ("ixalan", "Canopy"), ("phyrexia", "Oil Haze"), ("eldraine", "Witching Hour"), ("kaldheim", "First Frost")]
body = head("THEMES · " + T, "All six themes",
            "Nothing new is coloured by hand: the section and the modal use <code>--fg</code>, <code>--fg-muted</code>, <code>--accent-text</code>, <code>--danger</code>, <code>--border</code> and <code>--surface-raised</code>, so each theme draws itself. The danger press's words are <code>--bg</code> on <code>--danger</code>, as every shipped delete.")
body += frames(*[P(f"{n.upper()} · SECTION", "s-default", "", t) for t, n in TH])
body += frames(*[P(f"{n.upper()} · D1 WITH CREDITS", "d1-held", "", t) for t, n in TH])
boards["Themes"] = (body, 2880, "Themes")

order = ["Main", "Placement", "Section-States", "Delete-Flow", "Re-Verify", "Delete-States", "Themes"]
for n in order:
    body, w, t = boards[n]
    open(f"{OUT}/{n}.dc.html", "w").write(doc(f"{t}", body, w, 1000))
json.dump({n: boards[n][2] for n in order}, open(f"{OUT}/titles.json", "w"))
print("wrote", order)
