# Swap @@file@@ for the canvas's /_blob ids, set each board's $preview to its measured height, write canvas.json.
import json, re, sys, os, datetime
root, heights, blobs = sys.argv[1], sys.argv[2], sys.argv[3]
H = {k.replace('.dc.html', ''): v['h'] for k, v in json.load(open(heights)).items()}
B = json.load(open(blobs))
P = os.path.join(root, 'project')
for f in os.listdir(P):
    if not f.endswith('.dc.html'): continue
    s = open(os.path.join(P, f)).read()
    s = re.sub(r'@@([^@]+)@@', lambda m: '/_blob/' + B[m.group(1)], s)
    k = f[:-8]
    s = re.sub(r'"\$preview":\{"width":(\d+),"height":\d+\}', lambda m: f'"$preview":{{"width":{m.group(1)},"height":{H[k]}}}', s)
    assert '@@' not in s
    open(os.path.join(P, f), 'w').write(s)
ROWS = [('H1-OneGame', 'Home · one game to log'), ('H2-Several', 'Home · several games'), ('H3-Dismissed', 'Home · dismissed, with Undo'),
        ('N1-Push', 'The push'), ('C1-InWindow', 'Closed table · inside the week'), ('C2-Ended', 'Closed table · after the week'),
        ('L1-Logged', 'Logged'), ('L2-Device', 'The device that ran the game')]
boards = {'Main.dc.html': {'x': 0, 'y': 0, 'w': 880, 'h': H['Main'], 'title': 'R1 · Calls'}}
order = ['Main.dc.html']; notes = {}
y = 0; X0 = 1040
for i, (k, t) in enumerate(ROWS):
    ph, dh = H[k + '-Phone'], H[k + '-Desktop']
    notes[f'r{i}'] = {'x': X0, 'y': y - 0, 'text': t, 'kind': 'title1', 'maxW': 1770}
    by = y + 240
    boards[k + '-Phone.dc.html'] = {'x': X0, 'y': by, 'w': 390, 'h': ph}
    boards[k + '-Desktop.dc.html'] = {'x': X0 + 470, 'y': by, 'w': 1300, 'h': dh}
    order += [k + '-Phone.dc.html', k + '-Desktop.dc.html']
    y = by + max(ph, dh) + 160
now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': now}, 'title': 'Log-your-game reminder', 'launch': {'view': 'canvas'}, 'pages': [],
       'boards': boards, 'order': order, 'notes': notes, 'designSystems': []}
json.dump(idx, open(os.path.join(P, 'canvas.json'), 'w'), indent=1, ensure_ascii=False)
print(len(boards), 'boards')
