# Copy editor addendum: unsent edits on Done (2026-11-27). python3 gen_done.py canvas|repo <outdir> [blobs.json]
# canvas: backgrounds are uploaded /_blob urls from blobs.json; repo: art/ce-*-off.webp beside the boards (R1 art, mode off).
import sys, os, json
mode, out = sys.argv[1], sys.argv[2]
if mode == "canvas":
    B = json.load(open(sys.argv[3]))
    BG = {"p": B["ce-p-off"], "d": B["ce-d-off"]}
else:
    BG = {"p": "art/ce-p-off.webp", "d": "art/ce-d-off.webp"}
FONT = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Chakra+Petch:wght@600;700&amp;display=swap" rel="stylesheet">'
# App tokens, first (default) theme, src/app/globals.css
BGc, SURF, RAISED, ELEV, BS, FG, MUT, FAINT, ACC, DAN, WARN = "#14110E", "#1E1A15", "#211D18", "#29241F", "#3A3229", "#EDE6D8", "#A59C89", "#948B78", "#CF8745", "#C6533F", "#DEAA29"
A16, A55 = "rgba(207,135,69,.16)", "rgba(207,135,69,.55)"
MONO, SANS = "'IBM Plex Mono',monospace", "'IBM Plex Sans',sans-serif"
SHADOW = "0 18px 50px rgba(0,0,0,.6)"

def page(title, w, h, body, bg="#0A0B0F"):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONT}
<style>
body{{margin:0}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
</style>
</helmet>
<div style="width:{w}px;height:{h}px;position:relative;overflow:hidden;box-sizing:border-box;background:{bg};font-family:{SANS};color:{FG}">
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
'''

CLOSE = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
PENCIL = lambda s: (f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                    '<path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z"/><path d="M13.5 7.5l3 3"/></svg>')
SPIN = f'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="{BGc}" stroke-width="3" aria-hidden="true" style="animation:spin 1s linear infinite"><path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round"/></svg>'
DOT = f'<span aria-hidden="true" style="display:inline-block;width:8px;height:8px;border-radius:999px;background:{WARN};flex:none"></span>'

def btn(t, primary=False, extra=""):
    if primary:
        return f'<button type="button" style="all:unset;display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:6px 16px;font-size:13px;font-weight:500;background:{ACC};color:{BGc};cursor:pointer;white-space:nowrap;{extra}">{t}</button>'
    return f'<button type="button" style="all:unset;border:1px solid {BS};border-radius:999px;padding:5px 15px;font-size:13px;color:{FG};cursor:pointer;white-space:nowrap;{extra}">{t}</button>'

def xbtn(label="Close"):
    return f'<button type="button" aria-label="{label}" style="all:unset;display:flex;align-items:center;justify-content:center;width:32px;height:32px;margin:-6px -6px 0 0;border-radius:999px;color:{MUT};cursor:pointer;flex:none">{CLOSE}</button>'

N = 3
WAITING = f"{N} edits waiting"

# ---------- the door, with the waiting count ----------
def waiting_chip(): return f'<span style="display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;background:{A16};color:{ACC};font-size:12px;font-weight:500;white-space:nowrap">{WAITING}</span>'

def pill():
    """Desktop door. Today: pencil, Edit copy, staging dot. New: the waiting chip after the dot."""
    return (f'<button type="button" aria-label="Edit copy, {WAITING}" style="all:unset;box-sizing:border-box;position:absolute;right:24px;bottom:24px;height:40px;display:flex;align-items:center;gap:8px;'
            f'padding:0 8px 0 16px;border:1px solid {BS};border-radius:999px;background:{RAISED};box-shadow:{SHADOW};font-size:13px;color:{FG};cursor:pointer">'
            f'{PENCIL(16)}<span>Edit copy</span>{DOT}{waiting_chip()}</button>')

def phone_door():
    """Phone door, drawn over the art's pencil (x 178, y 22, 40px). The count badge takes the dot's corner; the dot moves to the foot."""
    cover = f'<div style="position:absolute;left:174px;top:18px;width:48px;height:48px;background:{BGc}"></div>'
    door = (f'<button type="button" aria-label="Edit copy, {WAITING}" style="all:unset;box-sizing:border-box;position:absolute;left:178px;top:22px;width:40px;height:40px;border-radius:999px;'
            f'border:1px solid {BS};display:flex;align-items:center;justify-content:center;color:{FG};cursor:pointer">{PENCIL(20)}'
            f'<span aria-hidden="true" style="position:absolute;right:-7px;top:-6px;min-width:18px;height:18px;box-sizing:border-box;padding:0 5px;border-radius:999px;background:{ACC};'
            f'border:2px solid {BGc};color:{BGc};font:600 11px/14px {SANS};text-align:center">{N}</span>'
            f'<span aria-hidden="true" style="position:absolute;right:2px;bottom:2px;width:8px;height:8px;border-radius:999px;background:{WARN};border:2px solid {BGc}"></span></button>')
    return cover + door

# ---------- the notice ----------
def notice(phone):
    pos = "left:12px;right:12px;top:86px" if phone else "right:24px;bottom:84px;width:360px"
    return (f'<div role="status" aria-label="Copy edits" style="position:absolute;{pos};box-sizing:border-box;padding:14px 16px 14px;border:1px solid {BS};border-radius:14px;background:{RAISED};box-shadow:{SHADOW}">'
            f'<div style="display:flex;align-items:flex-start;gap:12px"><div style="min-width:0;flex:1">'
            f'<div style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:500;color:{FG}"><span aria-hidden="true" style="width:8px;height:8px;border-radius:999px;background:{ACC};flex:none"></span>{WAITING}, not sent</div>'
            f'<p style="margin:4px 0 0;font-size:13px;line-height:1.45;color:{MUT}">They stay in this browser until you open a pull request or clear them.</p></div>{xbtn()}</div>'
            f'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">{btn("Review")}{btn("Open pull request", True)}</div></div>')

# ---------- the tray, Submitting (C5), with the mode off ----------
def chip(name): return (f'<span style="display:inline-flex;align-items:center;margin:0 1px;padding:0 6px;border:1px solid {A55};background:{A16};border-radius:6px;'
                         f'font:400 12px/20px {MONO};color:{ACC};vertical-align:1px;white-space:nowrap">⠿&#160;{name}</span>')
ROWS = [("help-me-choose · intake.title", "Help me choose", "Help me pick"),
        ("help-me-choose · intake.colorsAny", f"Any identity that includes {chip('colorNames')}.", f"Any color identity with {chip('colorNames')} in it."),
        ("help-me-choose-history · row.picks", f"{chip('n')} pick / {chip('n')} picks", f"{chip('n')} fit / {chip('n')} fits")]

def tray(phone):
    rows = "".join(f'<li style="list-style:none;border:1px solid {BS};border-radius:10px;padding:8px 12px">'
                   f'<div style="font:400 11px {MONO};color:{FAINT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{k}</div>'
                   f'<div style="font-size:13px;color:{FAINT};text-decoration:line-through">{a}</div><div style="font-size:14px;color:{FG}">{b}</div>'
                   f'<div style="margin-top:4px;display:flex;gap:12px;font-size:12px"><span style="color:{ACC};text-decoration:underline">Edit</span><span style="color:{MUT};text-decoration:underline">Remove</span></div></li>' for k, a, b in ROWS)
    inner = (f'<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px"><div style="flex:1"><div style="font-size:15px;font-weight:500">Copy edits · {N}</div>'
             f'<p style="margin:2px 0 0;font-size:12px;color:{MUT}">One pull request for all of them. Staging doesn’t change until it merges.</p></div>{xbtn()}</div>'
             f'<ul aria-busy="true" style="margin:0;padding:0;display:flex;flex-direction:column;gap:8px;opacity:.55">{rows}</ul>'
             f'<div style="display:flex;align-items:center;gap:8px;margin-top:16px"><span style="margin-right:auto;font-size:12px;color:{MUT}">Checking the rules, then pushing a branch</span>'
             f'{btn(SPIN + "Opening pull request…", True)}</div>')
    if phone:
        return (f'<div aria-hidden="true" style="position:absolute;inset:0;background:rgba(8,6,4,.55)"></div>'
                f'<div role="dialog" aria-label="Copy edits" style="position:absolute;left:0;right:0;bottom:0;box-sizing:border-box;padding:16px 16px 28px;border:1px solid {BS};border-bottom:0;border-radius:20px 20px 0 0;background:{RAISED};box-shadow:0 -12px 40px rgba(0,0,0,.6)">{inner}</div>')
    return f'<div role="dialog" aria-label="Copy edits" style="position:absolute;right:24px;bottom:84px;width:420px;box-sizing:border-box;padding:16px;border:1px solid {BS};border-radius:14px;background:{RAISED};box-shadow:{SHADOW}">{inner}</div>'

# ---------- the bar, before Done (for the Main board's strip) ----------
def bar_specimen(pressed=False):
    ring = f"box-shadow:0 0 0 3px {A55};" if pressed else ""
    return (f'<div style="display:inline-flex;align-items:center;gap:12px;height:40px;padding:0 6px 0 16px;border:1px solid {BS};border-radius:999px;background:{RAISED};font-size:13px;color:{FG}">'
            f'{DOT}<span style="font-weight:500">Editing copy</span><span style="font:400 11px {MONO};color:{MUT}">staging</span>'
            f'<span style="color:{ACC}">{N} edits ›</span>{btn("Done", True, "font-size:12px;padding:4px 12px;" + ring)}</div>')

STATES = {
    "W1": dict(title="Done with edits waiting: the notice", show=lambda p: notice(p)),
    "W2": dict(title="Notice closed, or the next page: the count stays", show=lambda p: ""),
    "W3": dict(title="Open pull request from the notice: C5 Submitting, mode off", show=lambda p: tray(p)),
}

def phone_board(k):
    body = (f'<img src="{BG["p"]}" alt="Help me choose on a phone, copy editor off" style="position:absolute;left:0;top:0;width:390px;height:844px;display:block">'
            f'{phone_door()}{STATES[k]["show"](True)}')
    return page(f"Phone {k}", 390, 844, body)

def desk_board(k):
    body = (f'<img src="{BG["d"]}" alt="Help me choose on desktop, copy editor off" style="position:absolute;left:0;top:0;width:1300px;height:900px;display:block">'
            f'<div style="position:absolute;left:1146px;top:828px;width:138px;height:54px;background:#120E0B"></div>{pill()}{STATES[k]["show"](False)}')
    return page(f"Desktop {k}", 1300, 900, body)

# ---------- Main board ----------
def H(t): return f'<h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2>'
def P(t, w=1380): return f'<p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:{w}px">{t}</p>'
def L(t): return f'<span style="font:500 11px {MONO};letter-spacing:.12em;text-transform:uppercase;color:#E8A25C">{t}</span>'
def m(t): return f'<span style="font-family:{MONO};color:#E6E8F0">{t}</span>'
def card(n, t, b): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px {SANS};color:#E6E8F0"><span style="font-family:{MONO};color:#E8A25C">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{b}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def grid(c, items): return f'<div style="display:grid;grid-template-columns:repeat({c},minmax(0,1fr));gap:20px">{"".join(items)}</div>'
def sec(t, inner): return f'<div style="display:flex;flex-direction:column;gap:14px">{L(t)}{inner}</div>'
def spec(cap, inner, w=None):
    ws = f"width:{w}px;" if w else ""
    return (f'<div style="{ws}display:flex;flex-direction:column;gap:12px;padding:22px;border:1px solid {BS};border-radius:14px;background:{RAISED};font-family:{SANS}">'
            f'<div style="min-height:56px;display:flex;align-items:center;flex-wrap:wrap;gap:10px;color:{FG};font-size:15px;position:relative">{inner}</div>'
            f'<p style="margin:0;font-size:13px;line-height:1.5;color:{MUT}">{cap}</p></div>')

def main_board():
    options = [
        ("A", "Done asks: send, keep or discard", "Not picked. Done is also how you use the page mid-batch (Q3: links don’t work while the mode is on), so a question would stop every hop between pages, the batch Q2 exists for. Discard beside Send is one wrong tap from losing the work."),
        ("B", "Done sends", "Not picked. Same hop problem, and worse: leaving a page to edit the next one would open a pull request with half the batch, and the submit route allows one a minute. Opening a PR is a send, it shouldn’t ride on a button that means “give me the page”."),
        ("C", "Done leaves; the door shows a count", "Half of it. The count keeps the edits visible later, but it is passive: at the moment Hugh pressed Done he was looking at the page, not the corner."),
        ("Pick", "C, plus a notice at the moment of Done", "Done leaves as today, never asks and never sends. When edits are waiting, a small notice says so right where the bar was, with Open pull request one press away; it doesn’t block the page. After it closes, the door keeps the count."),
    ]
    calls = [
        ("D1", "Done with edits waiting", ul([
            "The mode ends exactly as today: outlines off, the page given back, the page shows today’s text again (Q4 previews are mode-only), focus back on the door.",
            f"A notice opens where the tray sits (desktop: 360px, 84px above the bottom, right 24) or under the phone header (12px gutters, 8px below it). {m('role=status')}, so it is announced once; it never takes focus.",
            f"Title {m(WAITING + ', not sent')} with an accent dot, one line on where they are, then {m('Review')} and {m('Open pull request')} (primary), and ✕.",
            "It doesn’t block or dim anything. It closes on ✕, Esc, either button, or the next page. Clicking the page behind it leaves it up."])),
        ("D2", "The door carries the count", ul([
            f"Desktop pill: pencil, {m('Edit copy')}, staging dot, then a chip {m(WAITING)} (accent text on 16% accent, 24px, radius 999).",
            "Phone pencil: an accent count badge (18px, the number in --bg, 2px --bg ring) takes the top corner; the staging dot moves to the bottom corner, so staging still reads.",
            f"Label: {m('Edit copy, ' + WAITING)}. Shown whenever the tray holds unsent edits, on every page, from this browser’s storage, before the mode is ever turned on.",
            "Pressing the door turns the mode on as today; the bar already reads " + m(f"{N} edits ›") + "."])),
        ("D3", "Sending from the notice", ul([
            f"{m('Open pull request')} opens the tray straight in C5 Submitting, mode still off: no outlines, the page stays usable behind the desktop panel. Submitted, Failed and Try again are C5 unchanged.",
            f"{m('Review')} opens the tray (C4) the same way, mode off. Edit in a row opens the editor without a target, as reopening from the tray does today.",
            "Closing the tray leaves the mode off. Once the PR opens the tray is empty, so the count goes away."])),
        ("D4", "What stays as it is", ul([
            "Done with an empty tray: unchanged, no notice, no count.",
            "Esc that ends the mode is Done: same notice.",
            "Done while Submitting: unchanged (no notice; the edits are already going). A Failed tray still holds its edits, so they count as waiting.",
            "The bar, the tray, C4 and C5 are as the README draws them."])),
    ]
    specimens = grid(3, [
        spec("Before: the bar with three edits. Pressing Done today gives the page back and says nothing.", bar_specimen(True)),
        spec("Desktop door after Done: the waiting chip.", f'<div style="position:relative;width:100%;height:40px">{pill().replace("position:absolute;right:24px;bottom:24px;", "position:absolute;left:0;top:0;").replace("box-shadow:" + SHADOW + ";", "")}</div>'),
        spec("Phone door after Done: count badge, staging dot at the foot.", f'<div style="position:relative;width:60px;height:48px;background:{BGc};border-radius:8px">{phone_door().split("</div>", 1)[1].replace("left:178px;top:22px;", "left:10px;top:4px;")}</div>'),
    ])
    eng = ul([
        f"The count can’t wait for the overlay chunk: the provider reads {m('localStorage[\"the99.copyEdits\"]')} itself (length only, no import of {m('edits.ts')}, which pulls in the validator) on mount, on Done, and on the {m('storage')} event for other tabs.",
        f"{m('stop()')} gets the count at the moment of Done; edits &gt; 0 and no submission in flight shows the notice. The overlay renders nothing while off, so the notice and an off-mode tray live outside its {m('on')} gate (the overlay stays mounted after first load).",
        "Notice: polite status, no focus move (focus still goes to the door, as today). Esc closes it before anything else.",
        f"Copy for {m('src/lib/copy/copy-editor.ts')}: {m('doorWaiting(n)')}, {m('doorLabel(n)')}, {m('waiting.title(n)')}, {m('waiting.body(n)')}, {m('waiting.review')}, {m('waiting.send')}, {m('waiting.close')}. Text in ADDENDUM-done-unsent.md and copy strings.ts.",
    ])
    body = (H("Unsent edits on Done · copy editor addendum · R1")
        + P("In a live test Hugh filled the tray, pressed Done, and nothing said the edits were still waiting; he expected Done to send them. This adds the one state the R1 boards don’t draw: Done with unsent edits. Drawn over the R1 Help me choose page with the mode off and three edits in the tray. W1 the notice right after Done, W2 later (notice closed or another page), W3 Open pull request pressed from the notice. Phone and Desktop boards sit to the right.")
        + sec("The three options, and the pick", grid(4, [card(n, t, b) for n, t, b in options]))
        + sec("Calls", grid(2, [card(n, t, b) for n, t, b in calls]))
        + sec("Bar and door, actual size", specimens)
        + sec("For engineering", card("E", "How it could work", eng)))
    inner = f'<div style="box-sizing:border-box;width:1600px;padding:48px 56px 64px;display:flex;flex-direction:column;gap:32px">{body}</div>'
    return page("Unsent edits on Done, main", 1600, 1560, inner)

os.makedirs(out, exist_ok=True)
files = {"Done-Main.dc.html": main_board()}
for k in STATES:
    files[f"Done-Phone-{k}.dc.html"] = phone_board(k)
    files[f"Done-Desktop-{k}.dc.html"] = desk_board(k)
for n, t in files.items():
    open(os.path.join(out, n), "w").write(t)
print(" ".join(files))
