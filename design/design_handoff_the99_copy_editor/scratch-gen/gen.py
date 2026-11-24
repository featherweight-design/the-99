# On-page copy editor R1 boards. python3 gen.py canvas|repo <outdir>
# canvas: images are the uploaded /_blob urls (blobs.json); repo: art/ce-*.webp beside the boards.
import json, sys, os
mode, out = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = json.load(open(os.path.join(HERE, "blobs.json"))) if mode == "canvas" else {}
def src(k): return BLOB[k] if mode == "canvas" else f"art/ce-{k}.webp"
SUPPORT = "./support.js"
FONT = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Chakra+Petch:wght@600;700&amp;display=swap" rel="stylesheet">'
A = "#E8A25C"
def page(title, w, h, body):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="{SUPPORT}"></script>
</head>
<body>
<x-dc>
<helmet>
{FONT}
<style>
body{{margin:0}}
</style>
</helmet>
<div style="width:{w}px;min-height:{h}px;box-sizing:border-box;padding:48px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:32px">
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
def m(t): return f'<span style="font-family:\'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</span>'
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1400px">{p}</p></div>'
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:{A}">{t}</span>'
def fig(k, w, h, cap, note, radius=14):
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{radius}px;border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def row(lbl, figs, gap=36): return f'<div style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start">{"".join(figs)}</div></div>'
def phone(k, cap, note, w=300): return fig(k, w, round(w * 844 / 390), cap, note, 24)
def desk(k, cap, note, w=700): return fig(k, w, round(w * 900 / 1300), cap, note)
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:{A}">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def grid(cols, items): return f'<div style="display:grid;grid-template-columns:repeat({cols},minmax(0,1fr));gap:20px">{"".join(items)}</div>'

S = [
 ("off", "Mode off", "Admin on staging: the page as players see it, plus the door. Desktop: the Edit copy pill, bottom right. Phone: a pencil in the header beside search. The amber dot says staging."),
 ("on", "Mode on", "Every editable text gets a dashed outline. It is a CSS outline, so nothing moves. Read-only text (the Dinosaurs chip) is dotted grey. The pill becomes the bar: Editing copy, staging, Done."),
 ("target", "Text targeted", "Desktop hover, or a phone's first tap: a solid outline and a tag with the file and key. Desktop clicks to edit; a phone taps again, so scrolling never opens an editor."),
 ("ed-plain", "Editor · plain", "Now above, New below, the cap for the key's kind live as you type (title: up to 8 words). The page previews the new words in place."),
 ("ed-fill", "Editor · with fill-ins", "{names} is a locked chip: it drags to a new spot and can’t be deleted. A line says what the app fills it with here, and a preview reads the whole sentence."),
 ("ed-var", "Editor · with variations", "One line’s variations edit together, each labelled by when it shows (n is 1 / otherwise) with today’s words beside it, and one preview of both."),
 ("ed-err", "Editor · rule error", "Problems mark the text and list under the field as you type: the em dash, the exclamation mark, 9 words on an 8-word title. Add to edits waits until they clear."),
 ("ed-ro", "Editor · read only", "Same frame, no field: a lock, today’s text and a one-line reason. Copy key and Close. Edit-in-code text gives the helper that builds it as its reason."),
 ("tray", "Tray with edits", "The bar’s ‘3 edits ›’ opens it. Old struck through, new below, key on top; Edit and Remove per row; Clear all; Open pull request."),
 ("submitting", "Submitting", "Rows lock and dim; the button spins: ‘Checking the rules, then pushing a branch’."),
 ("submitted", "Submitted", "PR number, branch, Open on GitHub. The page goes back to today’s staging text, and the bar keeps ‘PR #3301 open’ until it merges."),
 ("failed", "Failed", "No PR. Edits are kept. The edit at fault is flagged with its reason (here: changed on main since the page loaded) and Redo; Try again resubmits."),
]
P = {"ed-var": "History list (phone keeps runs on their own page)."}

def phone_board():
    rows = []
    for i in range(0, 12, 6):
        rows.append(row(f"States {i+1} to {i+6}", [phone(f"p-{k}", f"{i+j+1} · {c}", P.get(k, n) if k == "ed-var" else n) for j, (k, c, n) in enumerate(S[i:i+6])]))
    return page("Copy editor, phone", 2140, 1880, head("Phone · 390 · every state", "Help me choose, rendered from main with the mode drawn over it. Editors and the tray are bottom sheets; the page stays put under a scrim. The phone history list stands in for the variations target, since the phone form has no plural line above the fold.") + "".join(rows))

def desk_board():
    rows = []
    for i in range(0, 12, 3):
        rows.append(row(f"States {i+1} to {i+3}", [desk(f"d-{k}", f"{i+j+1} · {c}", n) for j, (k, c, n) in enumerate(S[i:i+3])]))
    return page("Copy editor, desktop", 2340, 2860, head("Desktop · 1300 · every state", "Editors are popovers anchored under the text (420px, flipping above when there is no room below). The tray opens above the bar, bottom right.") + "".join(rows))

def main_board():
    locked = [
        ("1", "Admins only, staging only", f"The door and the mode render only when the viewer is an admin and {m('adminEnvironment()')} reads {m('staging')}; players and production get nothing, not even the script. The bar says {m('staging')} beside Editing copy."),
        ("2", "Visible text only", "Only text on screen is outlined and clickable. No search, no list of hidden strings; screen-reader labels, alt text and placeholders are left for the review after submit."),
        ("3", "One tray, one PR", "Edits collect in the tray across pages until submitted. Open pull request makes one branch and one PR. The page previews edits locally; staging itself changes only on merge (Submitted says so)."),
        ("4", "Current wording, chips, variations, live rules", "Every editor shows Now above New. Fill-ins are locked chips that move but can’t be deleted. Variations edit together. The copy sheet’s refusals run as you type: length cap by kind, em dash, exclamation mark, tell words, British spellings, a changed fill-in."),
        ("5", "Read-only text is visibly not editable", "Dotted grey outline, a lock in the editor, and a one-line reason: data, not copy (theme names, card names in demo decks), or edit in code, naming the helper that builds it."),
    ]
    calls = [
        ("C1", "Marking editable text", ul(["A dashed 1px accent <b>outline</b> on each editable text, offset 2px. Outline draws outside the box model, so no layout shifts, wraps or scrollbars.", "Read-only: dotted, faint. Edited: solid accent plus a light wash, showing the new words in place.", "Hover (desktop) or first tap (phone): 2px solid and a tag with the file and key. While the mode is on, a click targets text instead of following links; Done gives the page back."])),
        ("C2", "Where the toggle lives", ul(["Desktop: a floating <b>Edit copy</b> pill, bottom right, that grows into the bar when on. Pages rarely put anything there on desktop.", "Phone: a pencil in the mobile header beside search (the bottom is taken by docks and the tab bar). When on, the bar pins under the header, over the page, without reflowing it."])),
        ("C3", "Popover or sheet", ul(["Desktop: a <b>popover</b> anchored to the text, so the line stays visible beside its editor.", "Phone: a <b>bottom sheet</b> under a scrim, with the targeted line left in view above it where it fits."])),
        ("C4", "The tray", ul(["The bar is the tray’s handle: ‘N edits ›’ opens it. Desktop: a 420px panel above the bar. Phone: a sheet.", "Rows read key, old (struck through), new; Edit reopens the editor, Remove drops it. Clear all, and one primary: Open pull request."])),
        ("C5", "After Submit", ul(["Submitting: rows lock, the button spins with what it is doing.", "Submitted: PR number, branch, Open on GitHub. Staging text stays until the merge; the bar shows ‘PR #3301 open’.", "Failed: no PR, edits kept, the edit at fault flagged with its reason and Redo, then Try again. A stale line (changed on main since load) is the case drawn; a rule refusal and a GitHub failure use the same banner with their own line."])),
    ]
    qs = [
        ("Q1", "Same words under two keys", "<b>A (recommended):</b> the editor lists both keys and asks which one this is. B: refuse, edit in the sheet."),
        ("Q2", "How long the tray keeps edits", "<b>A (recommended):</b> in this browser until submitted or cleared, across pages and reloads, so a batch can span the app. B: this page only."),
        ("Q3", "Links while the mode is on", "<b>A (recommended):</b> a click targets text; tap Done to use the page. B: plain clicks navigate, Alt-click or long-press targets."),
        ("Q4", "Preview edits on the page", "<b>A (recommended):</b> yes, solid outline marks them. B: no, the page keeps today’s text and only the tray shows edits."),
    ]
    hero = f'<div style="display:flex;gap:36px;align-items:flex-start">{desk("d-ed-fill", "Editor with a fill-in, desktop", "The popover sits under its line; the page keeps its layout under the outlines.", 980)}{phone("p-tray", "Tray, phone", "Three edits, one pull request.", 360)}</div>'
    body = (head("On-page copy editor · R1", "An admin-only, staging-only mode over every page: click visible text, edit it in place, and a batch of edits becomes one pull request. Drawn over Help me choose rendered from main; the pages themselves don’t change. Boards: this one, Phone (12 states) and Desktop (12 states).")
        + hero
        + f'<div style="display:flex;flex-direction:column;gap:14px">{label("The five locked points, and where each is met")}{grid(5, [call(n, t, b) for n, t, b in locked])}</div>'
        + f'<div style="display:flex;flex-direction:column;gap:14px">{label("Calls made for the open items")}{grid(3, [call(n, t, b) for n, t, b in calls])}</div>'
        + f'<div style="display:flex;flex-direction:column;gap:14px">{label("Open questions")}{grid(4, [call(n, t, b) for n, t, b in qs])}</div>'
        + f'<div style="display:flex;flex-direction:column;gap:14px">{label("For engineering")}{call("E", "How it could work", ul(["The submit is the copy sheet import run on the server: the same validate and land code (" + m("scripts/lib/copy-sheet/") + "), one branch " + m("copy-edit-&lt;utc&gt;") + ", one PR with the old to new table. The editor runs the same validator client-side for the live rules.", "Finding the key: staging ships the export’s rows (key, kind, current text, placeholders); the overlay matches text nodes against them, templates as patterns. No new attributes in the pages.", "Reuses the app tokens and the admin chrome’s staging chip colour (warning); nothing new in the palette."]))}</div>')
    return page("Copy editor, main", 1600, 2900, body)

os.makedirs(out, exist_ok=True)
for name, fn in [("Main.dc.html", main_board), ("Phone.dc.html", phone_board), ("Desktop.dc.html", desk_board)]:
    open(os.path.join(out, name), "w").write(fn())
print("ok")
