# Writes the R5 boards (before | after) next to the other boards. python3 gen_r5.py OUT_DIR
import sys, os
OUT = sys.argv[1]
CSS = '''body{margin:0;background:#0f0d0a;font-family:system-ui,sans-serif;color:#EDE6D8}
.b{padding:40px}.t{font-size:28px;font-weight:600;margin:0 0 8px}.n{font-size:16px;color:#C0B8A6;max-width:1500px;line-height:1.5;margin:0 0 28px}
.cols{display:flex;gap:100px;align-items:flex-start}.col{display:flex;flex-direction:column}
.lab{font:600 15px ui-monospace,monospace;letter-spacing:.12em;margin:0 0 12px;color:#948B78}.lab.a{color:#CF8745}
.row{display:flex;gap:60px;align-items:flex-start}.f{display:flex;flex-direction:column;gap:8px}.f span{font:13px ui-monospace,monospace;color:#948B78}
.f img{display:block;border:1px solid #2B241B}'''
H = {'A': (1740, 2460), 'S': (1540, 2160), 'K': (3130, 4890)}
def board(name, title, note, k):
    dh, ph = H[k]
    def col(lab, cls, d):
        return (f'<div class="col"><p class="lab {cls}">{lab}</p><div class="row">'
                f'<div class="f"><span>Desktop</span><img src="art/r5/{d}{k}-desk.jpg" width="1300" height="{dh}" alt=""></div>'
                f'<div class="f"><span>Phone</span><img src="art/r5/{d}{k}-phone.jpg" width="390" height="{ph}" alt=""></div></div></div>')
    w = 40 + 1750 + 100 + 1750 + 40
    h = 40 + 34 + 8 + 80 + 28 + 27 + 21 + max(dh, ph) + 40
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{name}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet><style>{CSS}</style></helmet>
<div class="b"><p class="t">{title}</p><p class="n">{note}</p><div class="cols">{col("BEFORE · SHIPPED (KEY AT THE FOOT)", "", "before/")}{col("AFTER · R5 (KEY AT THE TOP)", "a", "")}</div></div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
    open(os.path.join(OUT, name + '.dc.html'), 'w').write(html)
    return w, h
sizes = {
 'R5-All': board('R5-All', 'R5 Your deck › All · key back at the top',
   'The keys box moves from the foot of the list back to the top, under the toolbar and above the first group. It keeps the R3 box (hairline, 12px radius) and the Lock cards swap in the same slot. Card view (the grid toggle) gets the same move. Nothing else changes.', 'A'),
 'R5-Shopping': board('R5-Shopping', 'R5 Your deck › Shopping · keys back at the top',
   'The keys box (to buy and over marks, then the marks the rows draw) moves to the top of the list, under the To buy box and above the first group. The empty Shopping list puts its key at the top too. The To buy box, heads and rows are unchanged.', 'S'),
 'R5-Consider': board('R5-Consider', 'R5 Tuning › Consider · key back at the top',
   'The one key for the panel moves from below the last shelf to above the first one, so the marks are learned before the first tile. Same box and the same two lines (Add, Folded shelves). Shelves are unchanged.', 'K'),
}
print(sizes)
