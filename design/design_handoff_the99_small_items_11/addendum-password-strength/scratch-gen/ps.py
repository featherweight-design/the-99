"""Live password strength R1 boards (account 2, 2026-11-15). Every frame is a PNG of SHIPPED components (FriendCard,
NewcomerColumn, Field, HINT, SIGN_ERR, press, OR, GOOGLE, LegalLinks) composed as sign-up-flow.tsx (Q1) and
sign-in-flow.tsx (K5) draw them, with the proposal (password-strength.tsx) in the hint's slot, rendered with the shipped
CSS from a scratch copy of main.
python3 ps.py <outdir>        -> boards with art/ paths (handoff folder)
python3 ps.py <outdir> blob   -> boards with /_blob urls (canvas)"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
BLOB = None  # R1c: the canvas serves art/ as its own files
os.makedirs(OUT, exist_ok=True)
def src(n): return f"/_blob/{BLOB[n]}" if BLOB else f"art/ps-{n}.webp"

CSS = r"""
body{margin:0;background:#0A0B0F}
*{box-sizing:border-box}
a{color:#E39A4F}a:hover{color:#F0B57A}
.board{padding:44px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:30px}
.bh{display:flex;flex-direction:column;gap:8px;max-width:1500px}
.bh h2{margin:0;font:700 28px 'Chakra Petch',sans-serif}
.k{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#8A8FA0}
.cap{font-size:13px;line-height:1.55;color:#A3A8B8;margin:0;text-wrap:pretty}
.cap b,.li b{color:#E6E8F0;font-weight:600}
code{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#E6E8F0;background:#171922;border:1px solid #262A35;border-radius:4px;padding:0 4px}
.row{display:flex;gap:40px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none;width:390px}
.fr.wide{width:640px}
.state{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pill{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;padding:3px 7px;border-radius:4px}
.pill.now{color:#0E0F14;background:#E39A4F}
.pill.was{color:#A3A8B8;border:1px solid #343843}
.pill.err{color:#0E0F14;background:#E06C5A}
.shot{display:block;width:390px;border-radius:28px;border:1px solid #262A35}
.shot.dk{width:640px;border-radius:12px}
.shot.crop{border-radius:10px}
.sub{font:600 17px 'Chakra Petch',sans-serif;color:#E6E8F0;margin:0}
.cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 44px}
.sec{display:flex;flex-direction:column;gap:10px}
.sec h3{margin:0;font:600 17px 'Chakra Petch',sans-serif;color:#E6E8F0}
ol.li,ul.li{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.55;color:#A3A8B8}
table{border-collapse:collapse;font-size:12.5px;color:#A3A8B8;width:100%}
th,td{border-top:1px solid #262A35;padding:7px 10px 7px 0;text-align:left;vertical-align:top}
th{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#8A8FA0}
td b{color:#E6E8F0}
.rec{border:1px solid rgba(227,154,79,.55);border-radius:12px;padding:16px 18px;background:#13110E;display:flex;flex-direction:column;gap:10px}
.tl{display:grid;grid-template-columns:150px repeat(5,390px);gap:16px 24px;align-items:center}
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

LIVE = [
 ("E", "Empty", "empty", "<b>Before any typing.</b> The three guides show from the start, so the player knows what's asked before the first key. The meter sits empty above them. Nothing moves when typing starts."),
 ("U", "Under 8", "short", "<b>colin9.</b> The guides tick live from the first key: <i>A number or symbol</i> is done. There's no word on the meter yet, because nothing is judged under 8."),
 ("W", "8+, weak", "weak", "<b>colinmtg.</b> One segment and <i>Weak</i> in quiet ink, never <code>--danger</code>. The two open guides say what to change."),
 ("G", "Acceptable", "good", "<b>Clerk level 2 passes.</b> All three ticked, two segments and <i>Good</i> in <code>--accent</code>. It makes no breach claim."),
 ("S", "Strong", "strong", "<b>copper fox casts ninety.</b> Strong with no number or symbol. The guides are help, not rules, and the meter is the judge. That's why a missing tick never blocks the press."),
]
PRESS = [
 ("Q2", "Too short, after press", "q2", "<b>Pressed under 8.</b> The shipped line goes under the meter, in the same slot as today, with the danger edge. The meter empties, and the guides stay under the line, so what to change is still in view."),
 ("Q3", "Too weak, after press", "q3", "<b>Clerk's answer wins.</b> The shipped refusal, and the open guides beneath it show what to fix. The next keystroke clears it, as today."),
 ("Q4", "Breached, after press", "q4", "<b>Only the press can know.</b> Every guide was ticked and it read <i>Good</i>. Clerk's breach line takes the slot and the meter empties, so nothing on screen still reads as good. The ticks stay, because they are still true."),
]

REASONS = [
 ("W·c", "Common, with a number", "weak-common", "<b>password1.</b> Two ticks, but <i>Not a common word, name or date</i> stays open. This is the guide that catches what a number or symbol can't fix."),
 ("W·d", "A name and a year", "weak-date", "<b>colin1994.</b> The same open guide. A name and a year read as common to Clerk too."),
 ("W·all", "All ticked, still weak", "weak-all", "<b>Kq#7mzpa.</b> The rare case where every guide is met and the estimator still says weak. One extra line appears under the guides: <i>Still easy to guess. Try a longer one, or a few words together.</i>"),
]

def screen_board(key, title, k, cap):
    body = head(k, title, cap)
    body += '<p class="sub">While typing</p><div class="row">' + "".join(frame(i, l, f"{key}-{s}-p", c) for i, l, s, c in LIVE) + "</div>"
    if key == "q1":
        body += '<p class="sub">Weak, and which guide is open</p><div class="row">' + "".join(frame(i, l, f"q1-{s}-p", c) for i, l, s, c in REASONS) + "</div>"
    body += '<p class="sub">After the press (Clerk is the judge)</p><div class="row">' + "".join(frame(i, l, f"{key}-{s}-p", c, pill="err") for i, l, s, c in PRESS)
    body += frame("Today", "Shipped, for reference", f"{key}-shipped-p", "<b>What ships now.</b> The hint alone, with no meter. A weak password is only found out after the press.", pill="was") + "</div>"
    return body

W = 5 * 390 + 4 * 40 + 112
BOARDS = {}
BOARDS["Main.dc.html"] = ("Q1 sign-up at 390", W, 3720, screen_board("q1", "Q1 · Make your account: a meter, and three guides from the empty field",
    "Live password strength · R1c · account 2 · 2026-11-15",
    "R1c (Hugh: give players something visual out of the gate). Under <b>Password</b> sit a three-segment meter with its word and three guides that tick as the player types: <i>8 or more characters</i>, <i>A number or symbol</i>, <i>Not a common word, name or date</i>. They replace <i>At least 8 characters.</i> The guides are help. The meter (an estimator that agrees with Clerk) and Clerk on the press are the judges. Every frame is the shipped sign-up rendered with the shipped CSS (Low Sun). Copy is DRAFT for /copy-review."))
BOARDS["K5.dc.html"] = ("K5 new password at 390", W, 2300, screen_board("k5", "K5 · Choose a new password: the same part",
    "Live password strength · R1 · sign-in's reset",
    "This is the same <code>StrengthPanel</code> under <b>New password</b>. <b>Save and sign in</b> stays pressable at every strength, because Clerk is the judge and the guides are only help. The sign-in password (K2) gets no meter."))

def desk(key, name):
    out = f'<p class="sub">{name}</p>'
    rows = [LIVE[:4], LIVE[4:] + PRESS]
    for r in rows:
        out += '<div class="row">' + "".join(frame(i, l, f"{key}-{s}-d", "", cls="dk", pill="err" if i.startswith("Q") else "now") for i, l, s, c in r) + "</div>"
    return out
DW = 4 * 640 + 3 * 40 + 112
BOARDS["Desktop.dc.html"] = ("Q1 and K5 at 1280", DW, 2380, head("Live password strength · desktop 1280×800",
    "Desktop: the same column, the same slot",
    "The sign-up and reset pages are one centred column at every width, so desktop draws the same part at the column's width. There's nothing desktop-only.") + desk("q1", "Q1 · Make your account") + desk("k5", "K5 · Choose a new password"))

THEMES = [("amonkhet", "Low Sun (Amonkhet)"), ("kamigawa", "Kamigawa"), ("ixalan", "Ixalan"), ("phyrexia", "Phyrexia"), ("eldraine", "Eldraine"), ("kaldheim", "Kaldheim")]
tl = '<div class="tl"><span></span>' + "".join(f'<span class="k">{l}</span>' for l in ["Empty", "Weak", "Good", "Strong", "Q4 breached"])
for t, name in THEMES:
    tl += f'<span class="k">{name}</span>' + "".join(f'<img class="shot crop" src="{src(f"crop-{t}-{s}")}" alt="{name} {s}">' for s in ["empty", "weak", "good", "strong", "q4"])
tl += "</div>"
BOARDS["Themes.dc.html"] = ("All six themes", 150 + 5 * 390 + 5 * 24 + 112, 2180, head("Live password strength · themes",
    "All six themes: three tokens, no new ones",
    "Unlit segments use <code>--border-strong</code>, weak uses <code>--fg-muted</code>, and good and strong use <code>--accent</code>. Open guide rings use <code>--fg-faint</code>, and ticked ones use <code>--accent</code> with the checkbox's ✓ in <code>--bg</code>. Each theme already has these tokens. Weak stays apart from unlit in every theme, and good never borrows a green that could read as a verdict. K5 at 390.") + tl)

CALLS = [
 "<b>Guides from the empty field (R1c).</b> Three rows show before any typing and tick live: <i>8 or more characters</i>, <i>A number or symbol</i>, <i>Not a common word, name or date</i>. They replace the shipped hint. The marks are 14px round marks (a ring, then <code>--accent</code> with the checkbox's ✓), so they never look like boxes to press.",
 "<b>Why a third guide.</b> Clerk scores how guessable a password is; it doesn't check character types. Length and a number alone would tick <i>Summer2024!</i> and <i>password1</i>, which Clerk refuses. The third guide is the estimator's: it ticks only at 8+ when no dictionary word, name, date, run or repeat matched. A guide never ticks for a password that pattern would sink.",
 "<b>The meter is the judge.</b> Three segments (the landing demo's 4px segment from <code>demo.tsx</code>) with the word at the end. Under 8 → no word. Below Clerk's level 2 → <i>Weak</i> (1, <code>--fg-muted</code>). Level 2 or 3 → <i>Good</i> (2, <code>--accent</code>). Level 4 → <i>Strong</i> (3). Guides don't add up to Good: only the estimator moves the meter, and it errs weak.",
 "<b>Weak is quiet ink before any press.</b> Red is only for Clerk's answer (Q2 to Q4).",
 "<b>All ticked, still weak.</b> One extra line under the guides, <i>Still easy to guess. Try a longer one, or a few words together.</i>, appears only then.",
 "<b>Hand-off to a refusal.</b> On the press Clerk's line goes under the meter (the hint's slot, shipped <code>role=\"alert\"</code>, danger edge), the meter empties, and the guides stay below it. The next keystroke clears the refusal, as today.",
 "<b>The press never locks.</b> Make my account and Save and sign in stay pressable whatever is ticked. Strong passphrases need no symbol, and Clerk judges.",
 "<b>Screen readers.</b> The guides are a real list, each with “done” or “not yet”. One polite live line (sr-only) says <i>Weak. 1 of 3 done.</i> only when the word or the count changes, once typing pauses for 1s. The field's <code>aria-describedby</code> names the list.",
 "<b>Busy (Q5).</b> As shipped, the sign-up's hint goes while Make my account is pressed, and the panel goes with it. K5 keeps it.",
]
STATES = [
 ("E", "Empty", "0, no word", "All three guides open"),
 ("U", "1–7 characters", "0, no word", "Guides tick live (number or symbol only; length and common stay open)"),
 ("W", "8+, below level 2", "1 · <i>Weak</i> · <code>--fg-muted</code>", "Open guides say what to change; all ticked → <i>Still easy to guess…</i>"),
 ("G", "Level 2 or 3", "2 · <i>Good</i> · <code>--accent</code>", "Usually all ticked"),
 ("S", "Level 4", "3 · <i>Strong</i>", "May leave <i>A number or symbol</i> open"),
 ("Q2", "Pressed under 8", "0, no word", "Shipped <code>tooShort</code> under the meter; guides below"),
 ("Q3", "Clerk: not strong enough", "0, no word", "Shipped <code>tooWeak</code>; guides below"),
 ("Q4", "Clerk: breached", "0, no word", "Shipped <code>breached</code>; guides below"),
]
GAPS = [
 "<b>G1 · Estimator.</b> A client estimator that matches Clerk's level 2. Recommended: <code>@zxcvbn-ts/core</code> with the common and English packs, loaded lazily on the field's first focus. Its match <code>sequence</code> drives the third guide (no dictionary, user-input, date, sequence or repeat match → ticked). Confirm Clerk's level 2 against Clerk with a fixed list.",
 "<b>G2 · <code>Field</code>'s description.</b> <code>Field</code> sets <code>aria-describedby</code> only when a refusal shows. It needs to name the guides list otherwise, and both while a refusal shows.",
 "<b>G3 · Agreement tests.</b> One per step boundary, one asserting that a password Clerk refuses as weak never shows Good or Strong, and one asserting the third guide stays open for each common pattern.",
]
COPY = [("guides.length", "8 or more characters"), ("guides.mix", "A number or symbol"), ("guides.common", "Not a common word, name or date"),
        ("word.weak / good / strong", "Weak · Good · Strong"), ("stillWeak", "Still easy to guess. Try a longer one, or a few words together."),
        ("announce (sr-only)", "{word}. {n} of 3 done."), ("—", "<i>At least 8 characters.</i> (newPasswordHint) is retired on Q1 and K5")]
def li(xs): return "".join(f"<li>{x}</li>" for x in xs)
spec = head("Live password strength · R1c", "Calls, states and gaps",
            "Brief: <code>docs/superpowers/design-briefs/2026-11-15-password-strength.md</code> (branch <code>brief/password-strength</code>). This extends <code>design_handoff_the99_small_items_11</code> (A2's Q1 and K5, which mirror <code>Sign-In.dc.html</code> and <code>Sign-In-Methods.dc.html</code>). Proposal code: <code>password-strength.tsx</code> and <code>strength.ts</code> in scratch-gen.")
spec += '<div class="rec"><span class="k">For Hugh · R1c</span><p class="cap"><b>Three guides from the empty field, ticking live, under a meter that judges.</b> The guides tell players what is asked before they type. The third guide (not a common word, name or date) is the one that keeps the ticks honest against Clerk. The meter and Clerk stay the judges, the press never locks, and Strong never claims breach safety. This is a short rules list, which the brief put out of scope. You asked for it, so it is drawn here.</p></div>'
spec += f'<div class="cols"><div class="sec"><h3>Calls</h3><ol class="li">{li(CALLS)}</ol></div><div class="sec"><h3>States</h3><table><tr><th>Frame</th><th>When</th><th>Meter</th><th>Under it</th></tr>' + "".join(f"<tr><td><b>{a}</b></td><td>{b}</td><td>{c}</td><td>{d}</td></tr>" for a, b, c, d in STATES) + '</table>'
spec += f'<h3 style="margin-top:14px">Gaps for engineering</h3><ul class="li">{li(GAPS)}</ul>'
spec += '<h3 style="margin-top:14px">New words (DRAFT for /copy-review)</h3><table><tr><th>Key (<code>strengthCopy</code>)</th><th>Copy</th></tr>' + "".join(f"<tr><td><code>{k}</code></td><td>{v}</td></tr>" for k, v in COPY) + '</table></div></div>'
BOARDS["Spec.dc.html"] = ("Calls, states and gaps", 1500, 1300, spec)

for name, (title, w, h, body) in BOARDS.items():
    open(os.path.join(OUT, name), "w").write(doc(title, w, h, body))
print({k: (v[1], v[2]) for k, v in BOARDS.items()})
