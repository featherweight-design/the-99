import os, sys
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
.fr.wide{width:650px}
.state{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pill{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;padding:3px 7px;border-radius:4px}
.pill.now{color:#0E0F14;background:#E39A4F}
.pill.was{color:#A3A8B8;border:1px solid #343843}
.pill.err{color:#0E0F14;background:#E06C5A}
.shot{display:block;width:390px;border-radius:28px;border:1px solid #262A35}
.shot.dk{width:650px;border-radius:12px}
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
def src(n): return f"art/fs-{n}.webp"
def frame(id_, label, img, cap, pill="now"):
    dk = img.endswith("-d") or "-d-" in img
    return (f'<div class="fr {"wide" if dk else ""}"><div class="state"><span class="pill {pill}">{id_}</span>'
            f'<span class="k">{label}</span></div><img class="shot {"dk" if dk else ""}" src="{src(img)}" alt="{label}"><p class="cap">{cap}</p></div>')
