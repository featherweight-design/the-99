CSS = """body{margin:0}
.board{box-sizing:border-box;padding:48px 56px 64px;background:#0D0B09;font-family:'IBM Plex Sans',sans-serif;color:#EDE6D8;display:flex;flex-direction:column;gap:30px}
.bh{display:flex;flex-direction:column;gap:9px;max-width:1500px}
.kick{display:flex;align-items:center;gap:10px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#8F8676}
.kick .tag{background:#CF8745;color:#14110E;border-radius:5px;padding:4px 8px;font-weight:600}
.bh h2{margin:0;font:700 30px 'Cinzel',serif}
.bh p,.note{font-size:14px;line-height:1.6;color:#C0B8A6;margin:0;text-wrap:pretty}
.bh p b,.note b{color:#EDE6D8}
.frames{display:flex;gap:44px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none}
.lab{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#8F8676}
.lab b{color:#CF8745;font-weight:600}
.cap{font-size:13px;line-height:1.55;color:#A59C89;text-wrap:pretty}
.cap b{color:#EDE6D8;font-weight:600}
.shot{display:block;border:1px solid #3A3229;border-radius:6px}
.rec{outline:2px solid #CF8745;outline-offset:6px;border-radius:6px}
.notes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.note{border:1px solid #3A3229;border-radius:12px;background:#15120F;padding:16px 18px}
.note h4{margin:0 0 6px;font:600 13px 'IBM Plex Sans',sans-serif;color:#EDE6D8}
.note ul{margin:6px 0 0;padding-left:18px}.note li{margin:4px 0}
code{font:12px 'IBM Plex Mono',monospace;color:#EDE6D8;background:#211D18;border-radius:4px;padding:1px 4px}
.tbl{border-collapse:collapse;font-size:13px;color:#C0B8A6;width:100%}
.tbl th{text-align:left;font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#8F8676;padding:8px 10px;border-bottom:1px solid #3A3229}
.tbl td{padding:9px 10px;border-bottom:1px solid #2B241B;vertical-align:top;line-height:1.5}
.tbl td b{color:#EDE6D8}"""
FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Cinzel:wght@600;700;800&amp;display=swap"
def doc(title, w, h, inner):
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
<link rel="stylesheet" href="{FONTS}">
<style>
{CSS}
</style>
</helmet>
<div class="board" style="width: {w}px; min-height: {h}px">
{inner}
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
def head(kick, title, body):
    return f'<div class="bh"><div class="kick"><span class="tag">A4</span>{kick}</div><h2>{title}</h2><p>{body}</p></div>'
def frame(k, w, lab, cap, rec=False, scale=1):
    dw = int(w*scale); dh = int(H[k]*scale)
    return (f'<div class="fr" style="width: {dw}px"><div class="lab">{lab}</div>'
            f'<img class="shot{" rec" if rec else ""}" src="{src(k)}" alt="{re.sub("<[^>]+>","",lab)}" width="{dw}" height="{dh}" style="width: {dw}px; height: {dh}px">'
            f'<div class="cap">{cap}</div></div>')
def notes(*ns): return '<div class="notes">' + "".join(f'<div class="note"><h4>{t}</h4>{b}</div>' for t, b in ns) + '</div>'



