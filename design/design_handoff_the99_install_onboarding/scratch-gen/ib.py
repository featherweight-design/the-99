"""Install onboarding R1 boards (account 2, 2026-11-15). Every phone/desktop frame is a PNG of SHIPPED components
(FirstRunChecklist, MobileHeader, TabBar, NavRail, the IosInstallSheet body) rendered with the shipped CSS (Low Sun)
from a scratch copy of main with iopatch.diff applied (the proposal as code, reference only).
python3 io.py <outdir>        -> boards with art/ paths (handoff folder)
python3 io.py <outdir> blob   -> boards with /_blob urls (canvas)"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; BLOB = json.load(open(os.path.join(HERE, "ioblobs.json"))) if "blob" in sys.argv else None
os.makedirs(OUT, exist_ok=True)
def src(n):
    n = (n[4:] + ".png") if n.startswith("raw:") else (f"io-{n}.png" if n.startswith("home-none") else f"ib-{n}.png"); return BLOB[n] if BLOB else f"art/{n}"

CSS = r"""
body{margin:0;background:#0A0B0F}
*{box-sizing:border-box}
a{color:#E39A4F}a:hover{color:#F0B57A}
.board{padding:44px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:26px}
.bh{display:flex;flex-direction:column;gap:8px;max-width:1500px}
.bh h2{margin:0;font:700 28px 'Chakra Petch',sans-serif}
.k{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#8A8FA0}
.cap{font-size:13px;line-height:1.55;color:#A3A8B8;margin:0;text-wrap:pretty}
.cap b,.li b{color:#E6E8F0;font-weight:600}
code{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#E6E8F0;background:#171922;border:1px solid #262A35;border-radius:4px;padding:0 4px}
.row{display:flex;gap:40px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none;width:390px}
.fr.wide{width:1040px}
.state{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pill{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;padding:3px 7px;border-radius:4px}
.pill.now{color:#0E0F14;background:#E39A4F}
.pill.was{color:#A3A8B8;border:1px solid #343843}
.shot{display:block;width:390px;border-radius:28px;border:1px solid #262A35}
.shot.dk{width:1040px;border-radius:14px}
.shot.tall{border-radius:22px}
.cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 44px}
.sec{display:flex;flex-direction:column;gap:10px}
.sec h3{margin:0;font:600 17px 'Chakra Petch',sans-serif;color:#E6E8F0}
ol.li,ul.li{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.55;color:#A3A8B8}
table{border-collapse:collapse;font-size:12.5px;color:#A3A8B8;width:100%}
th,td{border-top:1px solid #262A35;padding:7px 10px 7px 0;text-align:left;vertical-align:top}
th{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#8A8FA0}
td b{color:#E6E8F0}
.rec{border:1px solid rgba(227,154,79,.55);border-radius:12px;padding:16px 18px;background:#13110E;display:flex;flex-direction:column;gap:10px}
"""
FONTS = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Chakra+Petch:wght@500;600;700&amp;display=swap" rel="stylesheet">'

def doc(title, w, h, body):
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
{FONTS}
<style>{CSS}</style>
</helmet>
<div class="board" style="width: {w}px; min-height: {h}px">
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
"""

def head(k, h, cap):
    return f'<div class="bh"><span class="k">{k}</span><h2>{h}</h2><p class="cap">{cap}</p></div>'

def frame(id_, label, img, cap, cls="", pill="now"):
    return (f'<div class="fr {"wide" if "dk" in cls else ""}"><div class="state"><span class="pill {pill}">{id_}</span>'
            f'<span class="k">{label}</span></div><img class="shot {cls}" src="{src(img)}" alt="{label}"><p class="cap">{cap}</p></div>')

BOARDS = {}
W1 = 3 * 390 + 2 * 40 + 112
BOARDS["Main.dc.html"] = ("iPhone Safari, the tour's Install stop", W1, 1280, head(
    "Install onboarding · R1b · account 2 · 2026-11-15", "iPhone in Safari: the tour ends on the Install button",
    "R1b, after your note: no new row. The first-run tour gets one more stop, the last, on phones. It lights the header's shipped Install button and says why to use it. Select that button and you get the shipped how-to sheet. Every frame is the shipped components rendered with the shipped CSS (Low Sun). The tour card is TourRun's own markup. Copy is DRAFT for /copy-review.") +
    '<div class="row">' +
    frame("B1", "Safari · last stop", "tour-safari-phone", "<b>8 of 8 · Install</b> (7 of 7 when there's no Credits stop). The cutout and ring are the slot treatment (5px room, 14 corner) around the whole shipped slot: Install and its ✕. Title <i>Play it from your home screen</i>. Only Safari's body mentions alerts. The foot says the button stays and its ✕ hides it. Back and Finish as shipped. <b>On this stop the lit button can be selected:</b> that ends the tour and does the button's own press.") +
    frame("B1a", "Safari · after Finish", "home-safari-phone", "<b>Nothing new is left behind.</b> The tour closes and the shipped header button stays where the player just saw it, under its shipped rules (✕ = quiet 30 days, a second ✕ retires it). No row, banner or toast.", pill="was") +
    frame("B1s", "Safari · Select the button", "sheet-safari-phone", "<b>The shipped sheet, unchanged</b> (<code>IosInstallSheet</code>, Safari's step 1), from the lit button on the stop or from the header any time after.") +
    '</div>')

W2 = 4 * 390 + 3 * 40 + 112
BOARDS["Browsers.dc.html"] = ("iPhone Chrome and Firefox", W2, 1160, head(
    "Install onboarding · R1b", "iPhone in Chrome and Firefox: same stop, their own step 1",
    "Since iOS 16.4, both browsers can add to the Home Screen from Share (PR #2943's steps). Their body makes no promise about alerts, because push from a non-Safari install is unconfirmed.") +
    '<div class="row">' +
    frame("B2", "Chrome · last stop", "tour-chrome-phone", "Body: <i>Install puts The 99 on your home screen: full screen and one tap away. It takes about 10 seconds.</i>") +
    frame("B2s", "Chrome · Select", "sheet-chrome-phone", "The shipped Chrome sheet: Share is in Chrome's address bar.") +
    frame("B3", "Firefox · last stop", "tour-firefox-phone", "Same body as Chrome.") +
    frame("B3s", "Firefox · Select", "sheet-firefox-phone", "The shipped Firefox sheet: open the ⋯ menu, then Share.") +
    '</div>')

W3 = 390 * 2 + 1040 + 2 * 40 + 112
BOARDS["Elsewhere.dc.html"] = ("Android, no stop, desktop", W3, 1220, head(
    "Install onboarding · R1b", "Android hands over to Chrome, and everyone else gets the tour as shipped",
    "The stop exists only where the header button exists, so the two can never disagree.") +
    '<div class="row">' +
    frame("B4", "Android · last stop", "tour-android-phone", "<b>Only while a <code>beforeinstallprompt</code> is held</b>, which is when the header button draws. Body ends <i>Your phone asks once.</i> Selecting the lit button calls <code>prompt()</code>, and Chrome's own install dialog opens (the browser's UI, not drawn). Chrome's ⋮ menu also keeps its own Install app item.") +
    frame("N1", "No stop", "home-none-phone", "<b>The tour ends at What's new, as shipped</b>, whenever the header button doesn't draw: the installed app, in-app web views (Instagram, Facebook), iPad, Edge and other unsourced iPhone browsers, Android with no held prompt, a dismissed button, and, with option A, an account that has opened the installed app.", pill="was") +
    frame("D1", "Desktop · 1300 · no stop", "home-none-desktop", "<b>Desktop has no header button (d9 call 1), so it gets no stop.</b> The browser's own address-bar button covers it. The tour at 1300 is unchanged.", "dk", pill="was") +
    '</div>')

W4 = 3 * 390 + 2 * 40 + 112
BOARDS["Fallback.dc.html"] = ("Skipped the tour: the fallback row", W4, 1220, head(
    "Install onboarding · R1c", "Skipped the tour: R1's row comes back as the fallback",
    "Hugh's note: what if they skip the tour? A player who leaves the tour before the Install stop (its ✕, or closing it early) gets R1's row in the first-run checklist. Anyone who saw the stop never gets it. It goes for good as soon as they select it or the header button, or tap its ✕.") +
    '<div class="row">' +
    frame("F1", "Skipped · the row", "raw:io-home-safari-phone", "<b>Install The 99</b>, under step 3, in the Friends row's live box, with the browser line from R1 (only Safari's mentions alerts). While it's on screen, the header button steps aside, so there's one ask at a time. Android gets the same row with its own line while a prompt is held.") +
    frame("F1s", "Select the row", "raw:io-sheet-safari-phone", "<b>The same shipped sheet</b> (or Chrome's prompt on Android). Selecting it retires the row for good, and the header button comes back as the one place to install.") +
    frame("F2", "After select or ✕", "raw:io-home-none-phone", "<b>The checklist as shipped</b>, with the header button under its shipped rules. The row's ✕ also counts as one header dismiss (quiet for 30 days). The row only ever lives on the first-run checklist, so it's gone once cards are in.", pill="was") +
    '</div>')

CALLS = [
 "<b>The header button is the ask; the tour points at it.</b> R1's checklist row is gone, so there's one control for one action. The stop explains the button the way the other stops explain the nav. I'd ruled out a tour step before because installing sends the player out to Share mid-tour. As the last stop, the tour is already over when they go.",
 "<b>Last, after What's new, on phones only.</b> The stop is added when the run starts if the header button draws then. That's decided once, like the Credits stop. The kicker and diamonds count it (8 with Credits, 7 without), and step 1's foot reads one stop more (G3).",
 "<b>Lit as a slot.</b> The cutout covers the whole shipped slot, Install and its ✕ (5px room, 14 corner), so the ✕ the foot mentions is visible. The card docks above the tab bar as every phone stop does.",
 "<b>The lit button can be selected on this stop.</b> A press there ends the tour (stamped as finished, like Finish) and does the button's own press: the sheet on iPhone, <code>prompt()</code> on Android. Finish just closes the tour, and the button stays. The tour's ✕ skips as shipped.",
 "<b>R1c · a fallback row for players who skip the tour.</b> It shows only when the tour ended before the Install stop (skipped with ✕, or the stop never came because the button didn't draw at the start but does now). It's R1's checklist row (Fallback board). It's retired for good once the player selects it or the header button, or taps its ✕. The header button steps aside while it's on screen. A player who saw the stop never gets it, so nobody is asked twice.",
 "<b>No new dismissal.</b> The button keeps its shipped rules: its ✕ means quiet for 30 days, and a second ✕ retires it. The stop never shows again, because the tour runs once (and on a replay only if the button draws).",
 "<b>Copy by browser.</b> Only Safari's body mentions alerts. The sheet is shipped and unchanged.",
 "<b>How we know they installed: option A, a server flag (recommended, yours to call).</b> The installed app stamps <code>installedAt</code> on its first signed-in open, and the header button (so the stop too) stays away in every browser session of that account. Under B, an installed player still sees the button in every Safari tab a friend's link opens. The first launch draws nothing.",
 "<b>No About entry</b> (the brief's default). If About's tour entry counts stops, it says one more where the stop can show (Hugh's call at the next About batch).",
]
STATES = [
 ("B1–B3", "iPhone Safari / Chrome / Firefox", "first-run tour starts and the header slot draws (<code>iphoneInstallBrowser()</code>, not standalone, not dismissed, no <code>installedAt</code>)", "last stop lights the slot. Selecting it opens that browser's sheet"),
 ("B4", "Android", "same, with a held <code>beforeinstallprompt</code>", "last stop. Selecting it opens Chrome's prompt"),
 ("B1a", "After Finish", "the tour ends", "the header button as shipped"),
 ("N1", "Installed app, in-app view, iPad, Edge, no prompt, dismissed", "the slot doesn't draw", "the tour as shipped, ending at What's new"),
 ("N1", "Installed elsewhere (A)", "<code>installedAt</code> is set", "no header button and no stop, in any browser"),
 ("F1", "Skipped the tour", "the tour ended before the Install stop, the slot would draw, row not retired, still first run", "R1's row under step 3. The header button steps aside"),
 ("F2", "Row selected or ✕", "<code>the99-install-row</code> retired", "no row, ever. The header button as shipped"),
 ("D1", "Desktop", "md and up", "the tour as shipped"),
]
GAPS = [
 "<b>G1 · <code>installedAt</code></b> (option A only). A nullable timestamp on <code>user_prefs</code>, written once by the installed app's first signed-in open (<code>isStandalone()</code>), idempotent. The header slot reads it from the shell and draws nothing when it's set.",
 "<b>G2 · The stop.</b> <code>INSTALL</code> in <code>tour-steps.ts</code> (target <code>tour:install</code>, registered by <code>InstallSlot</code>; kind slot), appended by <code>withInstallStop</code> when the slot's target exists at the run's start at 390. On this stop only, the cutout passes presses to the slot (lift the slot above the scrim, or give the scrim a hole). A press ends the tour with <code>onEnd(false)</code> and then runs the slot's <code>onPress</code>.",
 "<b>G3 · Counts.</b> Step 1's foot gains <code>footSeven</code>/<code>footEight</code> variants for the stop. The diamonds and kicker come from the step list as shipped.",
 "<b>G4 · iOS keeps the installed app's sign-in separate from Safari</b>, so the player signs in once more on the first launch. Hugh's call: should the sheet say so? It's left out.",
 "<b>G6 · The fallback's trigger.</b> Reaching the Install stop writes a local <code>the99-install-row</code> = <code>seen</code>. The row draws when the tour is stamped done, the slot would draw, and the key is neither <code>seen</code> nor <code>retired</code>. Selecting the row or the header button, or the row's ✕, writes <code>retired</code>. The row's ✕ also calls <code>dismissOnce()</code>.",
 "<b>G5 · The header's quick-return.</b> The stop scrolls the page to the top before lighting, so the header is fully in view.",
 "All new copy is DRAFT (<code>tourCopy.steps.install</code>, in <code>install-onboarding · copy strings.ts</code>) for /copy-review.",
]
COPY = [("place", "Install"), ("title", "Play it from your home screen"),
 ("body.safari", "Install puts The 99 on your home screen: full screen, one tap away, and it can send the alerts you choose."),
 ("body.chrome / firefox", "Install puts The 99 on your home screen: full screen and one tap away. It takes about 10 seconds."),
 ("body.android", "Install puts The 99 on your home screen: full screen and one tap away. Your phone asks once."),
 ("foot", "Select the button up top now, or any time. Its ✕ hides it."), ("lit.install", "the Install button"),
 ("row.title (pwaInstallCopy)", "Install The 99"), ("row.line.safari", "Full screen and one tap away, and it can send the alerts you choose."),
 ("row.line.chrome / firefox", "Full screen and one tap away. It takes about 10 seconds."), ("row.line.android", "Full screen and one tap away. Your phone asks once."), ("row.dismissAria", "Don’t show this again")]

def li(xs): return "".join(f"<li>{x}</li>" for x in xs)
spec = head("Install onboarding · R1c", "Calls, states and the open question",
            "Brief: <code>docs/superpowers/design-briefs/2026-11-15-install-onboarding.md</code>. R1b replaces R1's checklist row (Hugh, 2026-11-15: focus on the header button). It extends the first-run tour (<code>design_handoff_the99_discovery_onboarding</code>) and reuses the shipped sheet (<code>design_handoff_the99_push</code>).")
spec += '<div class="rec"><span class="k">Open with Hugh · how we know a player installed</span><p class="cap"><b>Recommendation: A, a server flag.</b> The installed app stamps <code>installedAt</code> on its first signed-in open, and the header button and its tour stop stay away in every browser session of that account. <b>B</b> (no flag) costs nothing, but an installed player keeps seeing the button in every Safari tab a friend\'s link opens, and invites and spare requests arrive that way from Messages.</p></div>'
spec += f'<div class="cols"><div class="sec"><h3>Calls</h3><ol class="li">{li(CALLS)}</ol></div><div class="sec"><h3>States</h3><table><tr><th>Frame</th><th>Who</th><th>When</th><th>Shows</th></tr>' + "".join(f"<tr><td><b>{a}</b></td><td>{b}</td><td>{c}</td><td>{d}</td></tr>" for a, b, c, d in STATES) + '</table>'
spec += f'<h3 style="margin-top:14px">Gaps for engineering</h3><ul class="li">{li(GAPS)}</ul>'
spec += '<h3 style="margin-top:14px">New words (DRAFT)</h3><table><tr><th>Key (<code>tourCopy.steps.install</code>)</th><th>Copy</th></tr>' + "".join(f"<tr><td><code>{k}</code></td><td>{v}</td></tr>" for k, v in COPY) + '</table></div></div>'
BOARDS["Spec.dc.html"] = ("Calls, states and the open question", 1500, 1870, spec)

for name, (title, w, h, body) in BOARDS.items():
    open(os.path.join(OUT, name), "w").write(doc(title, w, h, body))
print(list(BOARDS))
