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
    n = f"io-{n}.png"; return BLOB[n] if BLOB else f"art/{n}"

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
BOARDS["Main.dc.html"] = ("iPhone Safari, the row and its sheet", W1, 1910, head(
    "Install onboarding · R1 · account 2 · 2026-11-15", "iPhone in Safari: one quiet row, the shipped sheet",
    "The ask is an unnumbered row in the first-run checklist, under step 3. It uses the Friends row's live box, the header slot's install glyph, and a bare ✕. Selecting it opens the shipped how-to sheet for this browser. All frames are the shipped components rendered with the shipped CSS (Low Sun). Copy is DRAFT for /copy-review.") +
    '<div class="row">' +
    frame("I0", "First run, whole page", "home-safari-phone-full", "<b>Where it sits.</b> It goes under step 3 and above Add your friends and Choose your news. Those are the rows that sit outside the numbered path. Step 1 keeps the top of the page. The row never blocks a step, and it has no number, so the kicker stays at Step 1 of 3.", "tall") +
    frame("I1", "Safari · the row", "home-safari-phone", "<b>Install The 99.</b> The line reads <i>Full screen and one tap away, and it can send the alerts you choose.</i> Only Safari's line mentions alerts, because push from a Safari install is sure. The whole row is one press (44px tall at least), and the ✕ is its own 44×44 press. While the row shows, the header's Install slot is hidden, so there's one ask at a time.") +
    frame("I1s", "Safari · Select", "sheet-safari-phone", "<b>The shipped sheet, unchanged</b> (<code>IosInstallSheet</code>, Safari's step 1). Got it closes the sheet and the row stays, because opening the steps isn't the same as doing them. The row goes once the app is installed (call 6) or after its ✕.") +
    '</div>')

W2 = 4 * 390 + 3 * 40 + 112
BOARDS["Browsers.dc.html"] = ("iPhone Chrome and Firefox", W2, 1130, head(
    "Install onboarding · R1", "iPhone in Chrome and Firefox: same row, their own step 1",
    "Since iOS 16.4, both browsers can add to the Home Screen from Share (PR #2943's steps). Their line makes no promise about alerts, because push from a non-Safari install is unconfirmed. Selecting the row opens the shipped sheet for that browser.") +
    '<div class="row">' +
    frame("I2", "Chrome · the row", "home-chrome-phone", "Line: <i>Full screen and one tap away. It takes about 10 seconds.</i>") +
    frame("I2s", "Chrome · Select", "sheet-chrome-phone", "The shipped Chrome sheet: Share is in Chrome's address bar.") +
    frame("I3", "Firefox · the row", "home-firefox-phone", "Same line as Chrome.") +
    frame("I3s", "Firefox · Select", "sheet-firefox-phone", "The shipped Firefox sheet: open the ⋯ menu, then Share.") +
    '</div>')

W3 = 390 * 2 + 1040 + 2 * 40 + 112
BOARDS["Elsewhere.dc.html"] = ("Android, no row, desktop", W3, 1260, head(
    "Install onboarding · R1", "Android asks for itself, and everyone else sees no row",
    "Android gets the same row, and Select hands over to the prompt Chrome is holding. Every other player gets the checklist exactly as shipped.") +
    '<div class="row">' +
    frame("I4", "Android · the row", "home-android-phone", "<b>Only while a <code>beforeinstallprompt</code> is held.</b> Line: <i>Full screen and one tap away. Your phone asks once.</i> Select calls <code>prompt()</code>, and Chrome's own install dialog opens. It isn't drawn here, because it's the browser's UI. If the player accepts, the row goes on <code>appinstalled</code>. If they decline, the row goes for this visit, since Chrome holds no prompt again for a while. It comes back only when a prompt is held again.") +
    frame("N1", "No row", "home-none-phone", "<b>The checklist as shipped.</b> No row for: the installed app (<code>isStandalone</code>), an in-app web view such as Instagram or Facebook (it can't add, and we can't give steps that work), an iPad (Share is at the top, so the steps are wrong), Edge and other unsourced iPhone browsers, Android with no held prompt, after the row's ✕, and, with option A, an account that has opened the installed app.", pill="was") +
    frame("D1", "Desktop · 1300 · no row", "home-none-desktop", "<b>Desktop gets no row</b>, as with the header slot (d9 call 1). Desktop browsers show their own install button in the address bar, and The 99 recommends the installed app on the phone, where it's played at the table. The checklist at 1300 is unchanged.", "dk", pill="was") +
    '</div>')

CALLS = [
 "<b>A checklist row, not a tour stop.</b> The tour lights parts of the page to explain them. Installing means leaving the browser for the Share menu, and doing that in the middle of the tour's overlay would strand the tour. Welcome and the About line are banners. A Home card after the first deck comes too late, because by then the player has done the first visit in a tab. The row is live from the first visit, like Add your friends.",
 "<b>Under step 3, above the signature, Friends and news rows.</b> It's the one row that changes where the rest of the visit happens, so it leads the unnumbered rows. It has no number, so it isn't a step on the path to a first recommendation.",
 "<b>The row.</b> It's the Friends row's live box (radius 14, 56px floor, <code>--surface-inset</code> on <code>--border-strong</code>), with the header slot's install glyph in the numerals' 22px slot, title <i>Install The 99</i> (the slot's own name) and a browser line. There are two presses, like the header slot: the row and a bare ✕.",
 "<b>One ask at a time.</b> While the row is on screen, the header's Install slot is hidden. The row's ✕ removes the row for good. It also counts as one header-slot dismiss (<code>dismissOnce</code>), so the slot stays quiet for 30 days, comes back once, and a second ✕ retires it, as shipped. The player keeps a way back without being asked twice in one visit.",
 "<b>Copy by browser.</b> Safari's line mentions the alerts the player chooses, because push from a Safari install is sure. Chrome, Firefox and Android don't mention alerts. The sheet itself is shipped and unchanged.",
 "<b>How we know they installed: option A, a server flag (recommended, yours to call).</b> The flag is set the first time the installed app opens while signed in. It hides the row and the header slot in every browser session of that account. With option B (a local ✕ only), an installed player keeps being asked whenever a link opens in Safari, and friend invites and spare-request links arrive exactly that way, from Messages. The cost is one nullable column and one idempotent write. The first launch draws nothing: no toast, no moment.",
 "<b>No About entry</b> (the brief's default).",
]
STATES = [
 ("I1–I3", "iPhone Safari / Chrome / Firefox", "<code>iphoneInstallBrowser()</code> is set, not standalone, not dismissed, no <code>installedAt</code>", "The row. Select opens that browser's sheet."),
 ("I4", "Android", "A <code>beforeinstallprompt</code> is held, same gates", "The row. Select opens the browser's prompt."),
 ("N1", "Installed app", "<code>isStandalone()</code>", "No row. With option A, the first signed-in launch writes <code>installedAt</code>."),
 ("N1", "In-app view, iPad, Edge, other", "<code>iosBrowser()</code> is webview, other or iPad", "No row, as the header slot today."),
 ("N1", "Already installed (A)", "<code>installedAt</code> is set", "No row and no header slot, in any browser."),
 ("N1", "After ✕", "<code>the99-install-row</code> is retired in local storage", "No row for good. The header slot is quiet for 30 days."),
 ("D1", "Desktop", "No iPhone browser and no held prompt", "No row, as shipped."),
 ("—", "Cards arrive", "The first run ends (cards or a deck)", "The checklist and the row go. The header slot carries on under its own rules."),
]
GAPS = [
 "<b>G1 · <code>installedAt</code>.</b> A nullable timestamp on <code>user_prefs</code>. A client effect in the shell calls a server action once, when <code>isStandalone()</code> is true and the reader is signed in and has no stamp yet. The write is idempotent (<code>coalesce</code>).",
 "<b>G2 · One decision for row and slot.</b> A shared <code>useInstallAsk()</code> hook (browser, held prompt, dismissal, standalone, <code>installed</code> from the server) so the row and the slot never disagree. The slot hides while the row is mounted.",
 "<b>G3 · iOS storage.</b> The installed app keeps its own sign-in, separate from Safari, so the player signs in once more on the first launch. Hugh's call: should the sheet say so? It's left out of this round's copy.",
 "<b>G4 · Android decline.</b> After <code>userChoice</code> returns <code>dismissed</code>, the row goes for the visit. Nothing is stored, because Chrome itself decides when to offer the prompt again.",
 "All new copy is DRAFT in <code>install-onboarding · copy strings.ts</code> and goes through /copy-review before build.",
]
COPY = [("row.title", "Install The 99"), ("row.line.safari", "Full screen and one tap away, and it can send the alerts you choose."),
 ("row.line.chrome / firefox", "Full screen and one tap away. It takes about 10 seconds."), ("row.line.android", "Full screen and one tap away. Your phone asks once."),
 ("row.dismissAria", "Don’t show this again")]

def li(xs): return "".join(f"<li>{x}</li>" for x in xs)
spec = head("Install onboarding · R1", "Calls, states and the open question",
            "Brief: <code>docs/superpowers/design-briefs/2026-11-15-install-onboarding.md</code> (branch <code>brief/install-onboarding</code>). This mirrors <code>design_handoff_the99_first_run_onboarding</code> and reuses the shipped how-to sheet from <code>design_handoff_the99_push</code>.")
spec += '<div class="rec"><span class="k">Open with Hugh · how we know a player installed</span><p class="cap"><b>Recommendation: A, a server flag.</b> The installed app stamps <code>installedAt</code> on its first signed-in open, and every browser session of that account stops asking (the row and the header slot). <b>B</b> (a local ✕ only) costs nothing, but it keeps asking an installed player in every Safari tab a friend\'s link opens. That means every invite and spare request sent over Messages.</p></div>'
spec += f'<div class="cols"><div class="sec"><h3>Calls</h3><ol class="li">{li(CALLS)}</ol></div><div class="sec"><h3>States</h3><table><tr><th>Frame</th><th>Who</th><th>When</th><th>Shows</th></tr>' + "".join(f"<tr><td><b>{a}</b></td><td>{b}</td><td>{c}</td><td>{d}</td></tr>" for a, b, c, d in STATES) + '</table>'
spec += f'<h3 style="margin-top:14px">Gaps for engineering</h3><ul class="li">{li(GAPS)}</ul>'
spec += '<h3 style="margin-top:14px">New words (DRAFT)</h3><table><tr><th>Key (<code>pwaInstallCopy</code>)</th><th>Copy</th></tr>' + "".join(f"<tr><td><code>{k}</code></td><td>{v}</td></tr>" for k, v in COPY) + '</table></div></div>'
BOARDS["Spec.dc.html"] = ("Calls, states and the open question", 1500, 1400, spec)

for name, (title, w, h, body) in BOARDS.items():
    open(os.path.join(OUT, name), "w").write(doc(title, w, h, body))
print(list(BOARDS))
