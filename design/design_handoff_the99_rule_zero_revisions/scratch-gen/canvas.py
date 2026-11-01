"""python3 canvas.py OUT CANVASROOT: swap art/ for the canvas's /_blob/ urls and write project/canvas.json."""
import json, re, os, sys, datetime
out, root = sys.argv[1], sys.argv[2]
B = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blobs.json')))
os.makedirs(f'{root}/project', exist_ok=True)
L = [[('Main', 'Rule 0 revisions · the calls'), ('Key', '1 · The read’s key'), ('Picker', '2 + 3 · Your deck tonight')],
     [('Home', '4 · Home'), ('Notice', '6 · The notice and the push'), ('Table', '5 · Close and the end'), ('Errata', 'Errata · 24 hours')]]
boards = {}; order = []; y = 0
for row in L:
    x = 0; hmax = 0
    for n, t in row:
        s = open(f'{out}/{n}.dc.html').read()
        s = re.sub(r'src="art/([^"]+)"', lambda m: f'src="/_blob/{B[m.group(1)]}"', s)
        assert 'art/' not in s, n
        open(f'{root}/project/{n}.dc.html', 'w').write(s)
        w, h = map(int, re.search(r'"\$preview":\{"width":(\d+),"height":(\d+)\}', s).groups())
        boards[f'{n}.dc.html'] = {'x': x, 'y': y, 'w': w, 'h': h, 'title': t}; order.append(f'{n}.dc.html')
        x += w + 80; hmax = max(hmax, h)
    y += hmax + 120
idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')},
       'title': 'The 99 · Rule 0 revisions', 'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': {}}
json.dump(idx, open(f'{root}/project/canvas.json', 'w'), indent=1)
print(json.dumps(boards))
