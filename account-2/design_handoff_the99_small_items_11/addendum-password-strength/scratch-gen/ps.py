"""Live password strength R1 boards (account 2, 2026-11-15). Every frame is a PNG of SHIPPED components (FriendCard,
NewcomerColumn, Field, HINT, SIGN_ERR, press, OR, GOOGLE, LegalLinks) composed as sign-up-flow.tsx (Q1) and
sign-in-flow.tsx (K5) draw them, with the proposal (password-strength.tsx) in the hint's slot, rendered with the shipped
CSS from a scratch copy of main.
python3 ps.py <outdir>        -> boards with art/ paths (handoff folder)
python3 ps.py <outdir> blob   -> boards with /_blob urls (canvas)"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
BLOB = dict(l.split() for l in open(os.path.join(HERE, "blobs.txt")) if l.strip()) if "blob" in sys.argv else None
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
 ("E", "Empty", "empty", "<b>Nothing typed.</b> The meter sits empty under the field, and the shipped hint stays word for word. The meter is there from the start, so nothing moves when typing begins."),
 ("U", "Under 8", "short", "<b>1 to 7 characters.</b> There's no estimate yet. The meter stays empty and the hint still says <i>At least 8 characters.</i> No counting and no red."),
 ("W", "8+, weak", "weak", "<b>Clerk would refuse it.</b> One segment lights in quiet ink (<code>--fg-muted</code>), never <code>--danger</code>, because typing is not an error. The line gives the same advice as Q3."),
 ("G", "Acceptable", "good", "<b>Clerk level 2 passes.</b> Two segments light in <code>--accent</code>. <i>Good.</i> is as far as the line goes, and it makes no breach claim."),
 ("S", "Strong", "strong", "<b>Comfortably past.</b> All three segments light in <code>--accent</code>. The word is <i>Strong.</i> and nothing more, so it never promises the password is safe from breaches."),
]
PRESS = [
 ("Q2", "Too short, after press", "q2", "<b>Pressed under 8.</b> The shipped line, the danger edge and the slot are unchanged. The meter empties while a refusal shows."),
 ("Q3", "Too weak, after press", "q3", "<b>Clerk's answer wins.</b> The weak line becomes the shipped refusal in <code>--danger</code>. The next keystroke clears it, as today, and the live line comes back."),
 ("Q4", "Breached, after press", "q4", "<b>Only the press can know.</b> This one read <i>Good.</i> while typing. On the press Clerk's breach refusal takes the slot and the meter empties, so nothing on screen still reads as good."),
]

def screen_board(key, title, k, cap):
    body = head(k, title, cap)
    body += '<p class="sub">While typing</p><div class="row">' + "".join(frame(i, l, f"{key}-{s}-p", c) for i, l, s, c in LIVE) + "</div>"
    body += '<p class="sub">After the press (Clerk is the judge)</p><div class="row">' + "".join(frame(i, l, f"{key}-{s}-p", c, pill="err") for i, l, s, c in PRESS)
    body += frame("Today", "Shipped, for reference", f"{key}-shipped-p", "<b>What ships now.</b> The hint alone, with no meter. A weak password is only found out after the press.", pill="was") + "</div>"
    return body

W = 5 * 390 + 4 * 40 + 112
BOARDS = {}
BOARDS["Main.dc.html"] = ("Q1 sign-up at 390", W, 2400, screen_board("q1", "Q1 · Make your account: a meter and a live line in the hint's slot",
    "Live password strength · R1 · account 2 · 2026-11-15",
    "A three-segment meter sits 8px under <b>Password</b>, and the hint line under it changes as the player types. Clerk still judges on the press: Q2 to Q4 take the same slot as today. Every frame is the shipped sign-up rendered with the shipped CSS (Low Sun), with the proposal in the hint's slot. Copy is DRAFT for /copy-review."))
BOARDS["K5.dc.html"] = ("K5 new password at 390", W, 2270, screen_board("k5", "K5 · Choose a new password: the same part",
    "Live password strength · R1 · sign-in's reset",
    "This is the same <code>StrengthLine</code> under <b>New password</b>. <b>Save and sign in</b> stays pressable at every strength, because Clerk is the judge and the line is only guidance. The sign-in password (K2) gets no meter."))

def desk(key, name):
    out = f'<p class="sub">{name}</p>'
    rows = [LIVE[:4], LIVE[4:] + PRESS]
    for r in rows:
        out += '<div class="row">' + "".join(frame(i, l, f"{key}-{s}-d", "", cls="dk", pill="err" if i.startswith("Q") else "now") for i, l, s, c in r) + "</div>"
    return out
DW = 4 * 640 + 3 * 40 + 112
BOARDS["Desktop.dc.html"] = ("Q1 and K5 at 1280", DW, 2300, head("Live password strength · desktop 1280×800",
    "Desktop: the same column, the same slot",
    "The sign-up and reset pages are one centred column at every width, so desktop draws the same part at the column's width. There's nothing desktop-only.") + desk("q1", "Q1 · Make your account") + desk("k5", "K5 · Choose a new password"))

THEMES = [("amonkhet", "Low Sun (Amonkhet)"), ("kamigawa", "Kamigawa"), ("ixalan", "Ixalan"), ("phyrexia", "Phyrexia"), ("eldraine", "Eldraine"), ("kaldheim", "Kaldheim")]
tl = '<div class="tl"><span></span>' + "".join(f'<span class="k">{l}</span>' for l in ["Empty", "Weak", "Good", "Strong", "Q4 breached"])
for t, name in THEMES:
    tl += f'<span class="k">{name}</span>' + "".join(f'<img class="shot crop" src="{src(f"crop-{t}-{s}")}" alt="{name} {s}">' for s in ["empty", "weak", "good", "strong", "q4"])
tl += "</div>"
BOARDS["Themes.dc.html"] = ("All six themes", 150 + 5 * 390 + 5 * 24 + 112, 1720, head("Live password strength · themes",
    "All six themes: three tokens, no new ones",
    "Unlit segments use <code>--border-strong</code>, weak uses <code>--fg-muted</code>, and good and strong use <code>--accent</code>. Each theme already has these tokens. Weak stays apart from unlit in every theme, and good never borrows a green that could read as a verdict. K5 at 390.") + tl)

CALLS = [
 "<b>Form: a meter plus a line.</b> Three segments (the landing demo's 4px segment from <code>demo.tsx</code>) and a one-line word with advice. The line carries the meaning and the meter is decoration (<code>aria-hidden</code>). Three steps match the three things a player can do: keep going, fine, done.",
 "<b>Placement: in the hint's slot.</b> The meter goes 8px under the field, and the line goes 6px under the meter, where <i>At least 8 characters.</i> is now. Below 8 the line still is that hint. Nothing goes beside the field or the label.",
 "<b>Weak is quiet ink before any press.</b> <code>--fg-muted</code>, never <code>--danger</code>. Red is only for Clerk's answer (Q2 to Q4).",
 "<b>Steps map to Clerk.</b> Under 8 → no estimate. Below Clerk's level 2 → Weak. Level 2 or 3 → Good. Level 4 → Strong. Engineering picks an estimator that agrees with Clerk's level 2 (zxcvbn score, same dictionaries). Where they could disagree, the estimator must err weak.",
 "<b>Hand-off to a refusal.</b> On the press, a refusal replaces the live line in the same slot (shipped <code>role=\"alert\"</code>, danger edge), and the meter empties. The next keystroke clears the refusal, as today, and the live line returns at the current strength.",
 "<b>The press never locks.</b> Make my account and Save and sign in stay pressable at every strength. The player chooses, and Clerk judges.",
 "<b>Screen readers.</b> The line is a polite live region (<code>aria-live=\"polite\"</code>) that the field names in <code>aria-describedby</code>. Its text only changes when the step changes, and it's set 1s after typing pauses, so a reader hears <i>Weak. Try a longer one…</i> once and not on every key. Each line starts with its word, so no hidden prefix is needed.",
 "<b>Busy (Q5).</b> As shipped, the sign-up's hint goes while Make my account is pressed. The meter and line go with it. K5 keeps them, as it keeps its hint today.",
]
STATES = [
 ("E", "Empty", "0 lit", "<i>At least 8 characters.</i> (shipped)"),
 ("U", "1–7 characters", "0 lit", "<i>At least 8 characters.</i> (shipped)"),
 ("W", "8+, below Clerk level 2", "1 · <code>--fg-muted</code>", "<i>Weak. Try a longer one, or a few words together.</i>"),
 ("G", "Level 2 or 3", "2 · <code>--accent</code>", "<i>Good. Longer is stronger.</i>"),
 ("S", "Level 4", "3 · <code>--accent</code>", "<i>Strong.</i>"),
 ("Q2", "Pressed under 8", "0 lit", "Shipped <code>tooShort</code>, <code>--danger</code>"),
 ("Q3", "Clerk: <code>form_password_not_strong_enough</code>", "0 lit", "Shipped <code>tooWeak</code>, <code>--danger</code>"),
 ("Q4", "Clerk: <code>form_password_pwned</code>", "0 lit", "Shipped <code>breached</code>, <code>--danger</code>"),
]
GAPS = [
 "<b>G1 · Estimator.</b> A client estimator that matches Clerk's level 2. Recommended: <code>@zxcvbn-ts/core</code> with the common and English packs, loaded lazily on the field's first focus so sign-in's first paint pays nothing. Engineering confirms what Clerk's level 2 is and tests it against Clerk with a small fixed list.",
 "<b>G2 · <code>Field</code>'s description.</b> <code>Field</code> sets <code>aria-describedby</code> only when a refusal shows. It needs to point at <code>password-strength</code> otherwise.",
 "<b>G3 · Agreement test.</b> One test per step boundary, and one asserting that a password Clerk refuses as weak never shows Good or Strong (the brief's lock).",
]
COPY = [("strength.short", "At least 8 characters. (shipped, unchanged)"), ("strength.weak", "Weak. Try a longer one, or a few words together."),
        ("strength.good", "Good. Longer is stronger."), ("strength.strong", "Strong.")]
def li(xs): return "".join(f"<li>{x}</li>" for x in xs)
spec = head("Live password strength · R1", "Calls, states and gaps",
            "Brief: <code>docs/superpowers/design-briefs/2026-11-15-password-strength.md</code> (branch <code>brief/password-strength</code>). This extends <code>design_handoff_the99_small_items_11</code> (A2's Q1 and K5, which mirror <code>Sign-In.dc.html</code> and <code>Sign-In-Methods.dc.html</code>). Proposal code: <code>password-strength.tsx</code> and <code>strength.ts</code> in scratch-gen.")
spec += '<div class="rec"><span class="k">For Hugh</span><p class="cap"><b>Meter plus line, in the hint\'s slot, weak in quiet ink.</b> The line does the talking and the meter only shows the step. Strong never claims breach safety, and Clerk\'s answer still takes the slot on the press. Two calls are worth your eye: the press stays pressable when the line says Weak, and under 8 shows no count.</p></div>'
spec += f'<div class="cols"><div class="sec"><h3>Calls</h3><ol class="li">{li(CALLS)}</ol></div><div class="sec"><h3>States</h3><table><tr><th>Frame</th><th>When</th><th>Meter</th><th>Line</th></tr>' + "".join(f"<tr><td><b>{a}</b></td><td>{b}</td><td>{c}</td><td>{d}</td></tr>" for a, b, c, d in STATES) + '</table>'
spec += f'<h3 style="margin-top:14px">Gaps for engineering</h3><ul class="li">{li(GAPS)}</ul>'
spec += '<h3 style="margin-top:14px">New words (DRAFT for /copy-review)</h3><table><tr><th>Key (<code>strengthCopy</code>)</th><th>Copy</th></tr>' + "".join(f"<tr><td><code>{k}</code></td><td>{v}</td></tr>" for k, v in COPY) + '</table></div></div>'
BOARDS["Spec.dc.html"] = ("Calls, states and gaps", 1500, 1160, spec)

for name, (title, w, h, body) in BOARDS.items():
    open(os.path.join(OUT, name), "w").write(doc(title, w, h, body))
print({k: (v[1], v[2]) for k, v in BOARDS.items()})
