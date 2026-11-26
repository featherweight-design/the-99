# Copy editor addendum: insert a fill-in (2026-11-25). python3 gen_ins.py canvas|repo <outdir>
# canvas: backgrounds are the uploaded /_blob urls; repo: art/ce-*.webp beside the boards (R1 art, page under the editor).
import sys, os
mode, out = sys.argv[1], sys.argv[2]
BG = {"p": "/_blob/2c4a351cb28d78685b45740aa960a2fe", "d": "/_blob/e6304d724bb79d24ca23710608bf0885"} if mode == "canvas" else {"p": "art/ce-p-ed-fill.webp", "d": "art/ce-d-ed-fill-base.webp"}
FONT = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Chakra+Petch:wght@600;700&amp;display=swap" rel="stylesheet">'
# App tokens, first (default) theme, src/app/globals.css
BGc, SURF, RAISED, BS, FG, MUT, FAINT, ACC, DAN = "#14110E", "#1E1A15", "#211D18", "#3A3229", "#EDE6D8", "#A59C89", "#948B78", "#CF8745", "#C6533F"
A16, A55 = "rgba(207,135,69,.16)", "rgba(207,135,69,.55)"
MONO, SANS = "'IBM Plex Mono',monospace", "'IBM Plex Sans',sans-serif"

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

X = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
PLUS = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.5v7M1.5 5h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
CLOSE = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'

def chip(name, x=True, hover=False, hit=False):
    """The shipped chip (mono 12, accent on 16% accent, 55% border, radius 6, grip). New: a ✕ after the name."""
    xb = ""
    if x:
        ring = f"outline:1px dashed {ACC};outline-offset:10px;" if hit else ""
        xbg = A55 if hover else "transparent"
        xb = f'<button type="button" aria-label="Remove {name}" style="all:unset;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;margin-left:3px;border-radius:999px;background:{xbg};color:{ACC};cursor:pointer;{ring}">{X}</button>'
    return (f'<span style="display:inline-flex;align-items:center;margin:0 1px;padding:0 {3 if x else 6}px 0 6px;border:1px solid {A55};background:{A16};'
            f'border-radius:6px;font:400 12px/20px {MONO};color:{ACC};vertical-align:1px;white-space:nowrap">⠿&#160;{name}{xb}</span>')

def ghost(name):
    return (f'<span style="display:inline-flex;align-items:center;margin:0 1px;padding:0 6px;border:1px dashed {A55};border-radius:6px;font:400 12px/20px {MONO};'
            f'color:{ACC};opacity:.6;vertical-align:1px;white-space:nowrap">⠿&#160;{name}</span>')

CARET = f'<span style="display:inline-block;width:1.5px;height:19px;background:{FG};vertical-align:-4px;margin:0 1px"></span>'

def offer(name, value, phone, state=""):
    h = 40 if phone else 32
    bg = A16 if state in ("hover", "press") else "transparent"
    bd = "solid" if state in ("hover", "press") else "dashed"
    tr = "transform:scale(.97);" if state == "press" else ""
    val = f'<span style="font:400 13px {SANS};color:{MUT}">{value}</span>' if value else ""
    return (f'<button type="button" aria-label="Insert {name} at the cursor" style="all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:8px;height:{h}px;padding:0 12px;'
            f'border:1px {bd} {A55};border-radius:8px;background:{bg};font:400 12px {MONO};color:{ACC};cursor:pointer;{tr}">{PLUS}<span>{name}</span>{val}</button>')

def insert_row(offers):
    return (f'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px">'
            f'<span style="font:400 10.5px {MONO};letter-spacing:.04em;text-transform:uppercase;color:{FAINT};margin-right:2px">Insert at cursor</span>{"".join(offers)}</div>')

def lbl(t, mb=0): return f'<div style="font:400 10.5px {MONO};text-transform:uppercase;color:{FAINT};margin-bottom:{mb}px">{t}</div>'
def status(lines): return f'<div role="status" style="margin-top:6px;font-size:12px;line-height:1.5;display:flex;flex-direction:column;gap:2px">{"".join(f"<div style=\"color:{MUT}\">{l}</div>" for l in lines)}</div>'

NOTE = f'<code style="font:400 12px {MONO};color:{ACC}">{{colorNames}}</code> reads “White and Blue” here. Drag it to move it, or select ✕ to take it out.'

STATES = {
    "F1": dict(title="Removed, offered back",
               field=f"Any color identity.{CARET}",
               ins=lambda p: insert_row([offer("colorNames", "White and Blue", p)]),
               st=["3 words", "Preview: Any color identity."]),
    "F2": dict(title="Insert open, placing at the cursor",
               field=f"Any color identity with {CARET}{ghost('colorNames')} in it.",
               ins=lambda p: insert_row([offer("colorNames", "White and Blue", p, "press" if p else "hover")]),
               st=["6 words", "Preview: Any color identity with in it."]),
    "F3": dict(title="None left to insert",
               field=f"Any color identity with {chip('colorNames')} in it.{CARET}",
               ins=lambda p: "",
               st=["7 words", NOTE, "Preview: Any color identity with White and Blue in it."]),
}

def editor(k, phone):
    s = STATES[k]
    head = (f'<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px"><div style="min-width:0;flex:1">'
            f'<div style="font:400 12px {MONO};color:{MUT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">help-me-choose · intake.colorsAny</div>'
            f'<div style="font:400 10.5px {MONO};text-transform:uppercase;letter-spacing:.04em;color:{FAINT}">colorsAny</div></div>'
            f'<button type="button" aria-label="Close" style="all:unset;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;color:{MUT};cursor:pointer;flex:none">{CLOSE}</button></div>')
    now = f'{lbl("Now")}<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:{MUT}">Any identity that includes {chip("colorNames", x=False)}.</p>{lbl("New")}'
    field = (f'<div role="textbox" aria-label="New wording" style="box-sizing:border-box;min-height:44px;width:100%;border-radius:10px;border:1px solid {BS};background:{SURF};'
             f'padding:10px 12px;font-size:15px;line-height:1.45;color:{FG};box-shadow:0 0 0 2px {ACC}">{s["field"]}</div>')
    foot = (f'<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:16px">'
            f'<button type="button" style="all:unset;border:1px solid {BS};border-radius:999px;padding:6px 16px;font-size:13px;color:{FG};cursor:pointer">Cancel</button>'
            f'<button type="button" style="all:unset;border-radius:999px;padding:6px 16px;font-size:13px;font-weight:500;background:{ACC};color:{BGc};cursor:pointer">Add to edits</button></div>')
    return head + now + field + s["ins"](phone) + status(s["st"]) + foot

def phone_board(k):
    sheet = (f'<div role="dialog" aria-label="intake.colorsAny" style="position:absolute;left:0;right:0;top:440px;bottom:0;box-sizing:border-box;padding:16px 16px 24px;'
             f'border:1px solid {BS};border-bottom:0;border-radius:20px 20px 0 0;background:{RAISED};box-shadow:0 -12px 40px rgba(0,0,0,.6);display:flex;flex-direction:column">'
             f'<div style="flex:1">{editor(k, True)}</div></div>')
    body = f'<img src="{BG["p"]}" alt="Help me choose on a phone, under the scrim" style="position:absolute;left:0;top:0;width:390px;height:844px;display:block">{sheet}'
    return page(f"Phone {k}", 390, 844, body)

def desk_board(k):
    pop = (f'<div role="dialog" aria-label="intake.colorsAny" style="position:absolute;left:180px;top:259px;width:420px;box-sizing:border-box;padding:16px;'
           f'border:1px solid {BS};border-radius:14px;background:{RAISED};box-shadow:0 18px 50px rgba(0,0,0,.6)">{editor(k, False)}</div>')
    body = f'<img src="{BG["d"]}" alt="Help me choose on desktop" style="position:absolute;left:0;top:0;width:1300px;height:900px;display:block">{pop}'
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
            f'<div style="min-height:56px;display:flex;align-items:center;flex-wrap:wrap;gap:10px;color:{FG};font-size:15px">{inner}</div>'
            f'<p style="margin:0;font-size:13px;line-height:1.5;color:{MUT}">{cap}</p></div>')

def main_board():
    calls = [
        ("1", "The insert control", ul([
            "Sits right under the New field, before the word count and notes: it acts on the field, the notes only describe it.",
            f"{m('Insert at cursor')} then one button per fill-in the line can take and doesn’t use. No menu: the list is one or two, so the choices sit in view (inline options over an extra step).",
            "Selecting one drops the chip at the caret. Focus stays in the field (the button doesn’t take it), so on a phone the keyboard stays up. Never placed a caret: it lands at the end.",
            "Dashed border with a + = not in the text yet; the solid chip = in the text."])),
        ("2", "The chip’s ✕", ul([
            "Always shown, after the name, on both widths. Hover-only hides it on touch and from a first-time editor; a line rarely has more than two chips, so it adds no noise.",
            "Desktop: a 16px round target that fills with 55% accent on hover. Phone: same look, a 36px hit box centred on it, so a tap on the ✕ never starts a drag.",
            "Backspace or Delete beside a chip removes it too. The grip and the name still drag."])),
        ("3", "None left to insert", ul([
            "The row doesn’t show. No “nothing to insert” line: an editor who hasn’t removed anything has nothing to look for.",
            "The fill-in note already says ✕ takes it out; take one out and it appears under the field (F1). A line with no fill-ins shows neither."])),
        ("4", "What a fill-in shows today", ul([
            "Yes, in the note and on the insert button, never on the chip: the chip’s look is locked, and a value inside a sentence’s chip makes it read twice.",
            f"Note: {m('{colorNames}')} reads “White and Blue” here. Button: {m('+ colorNames')} White and Blue.",
            "The value is what this page shows, read from the visible text the line matched. A fill-in the page doesn’t show today gets the name alone."])),
        ("5", "The fill-in note, rewritten", ul([
            f"With a value: {m('{colorNames}')} reads “White and Blue” here. Drag it to move it, or select ✕ to take it out.",
            f"Without one: {m('{colorNames}')} is filled in by the app. Drag it to move it, or select ✕ to take it out.",
            "Was: “…Drag it to move it; it can’t be deleted.”"])),
    ]
    specimens = grid(4, [
        spec("In the field: grip, semantic name, ✕. Drags as today.", chip("colorNames")),
        spec("Desktop hover on the ✕: 55% accent fill.", chip("colorNames", hover=True)),
        spec("Phone: the dashed ring is the 36px hit box (not drawn in the app).", f'<span style="padding:10px">{chip("colorNames", hit=True)}</span>'),
        spec("Now keeps today’s chip, no ✕: Now can’t be edited.", chip("colorNames", x=False)),
        spec("Insert button, desktop 32px. Value in muted text.", offer("colorNames", "White and Blue", False)),
        spec("Hover (desktop) or press (phone): solid border, 16% fill.", offer("colorNames", "White and Blue", False, "hover")),
        spec("Phone, 40px tall.", offer("colorNames", "White and Blue", True)),
        spec("A fill-in the page doesn’t show today: name only.", offer("colorNames", "", False)),
    ])
    two = spec("When a line’s code supplies two and both are out, both buttons sit in the row and wrap under the label at phone width. Names from the brief’s example.",
               insert_row([offer("playerName", "Wren", False), offer("toolCount", "nine", False)]), 760)
    eng = ul([
        f"Insert list = the row’s supplied fill-ins minus those in the field’s current value, recomputed on every input. Values: the capture for each hole when the line matched as a pattern ({m('match.ts')}); none for a fill-in the page doesn’t show.",
        "Buttons cancel pointerdown so the field keeps focus and its caret; insert at the saved range, then put the caret after the chip. Keyboard: Tab reaches the buttons after the field, Enter inserts and returns to the field.",
        f"The validator no longer refuses a missing fill-in (Hugh’s 2026-11-25 ruling); braces naming a fill-in the code doesn’t supply are still refused.",
        f"Copy, for {m('src/lib/copy/copy-editor.ts')}: {m('editor.insert')} “Insert at cursor”, {m('editor.insertLabel(name)')} “Insert {{name}} at the cursor”, {m('editor.removeFill(name)')} “Remove {{name}}”, {m('editor.fill(name, value?)')} as call 5.",
    ])
    body = (H("Insert a fill-in · copy editor addendum · R1")
        + P("Editor with fill-ins (ed-fill), after Hugh’s 2026-11-25 ruling: a fill-in can be taken out and put in, like a variable. Drawn over the shipped editor on Help me choose (intake.colorsAny, renamed {colorNames}). Three states at each width, in the order an editor meets them: F1 a fill-in removed and offered back, F2 inserting it at the cursor, F3 none left to insert. Phone and Desktop boards sit to the right.")
        + sec("Calls for the five open items", grid(3, [card(n, t, b) for n, t, b in calls]))
        + sec("Chip and insert button, actual size", specimens)
        + sec("Two to insert", two)
        + sec("For engineering", card("E", "How it could work", eng)))
    inner = f'<div style="box-sizing:border-box;width:1600px;padding:48px 56px 64px;display:flex;flex-direction:column;gap:32px">{body}</div>'
    return page("Insert a fill-in, main", 1600, 1800, inner)

os.makedirs(out, exist_ok=True)
files = {"Main.dc.html": main_board()}
for k in STATES:
    files[f"Phone-{k}.dc.html"] = phone_board(k)
    files[f"Desktop-{k}.dc.html"] = desk_board(k)
for n, t in files.items():
    open(os.path.join(out, n), "w").write(t)
print(" ".join(files))
