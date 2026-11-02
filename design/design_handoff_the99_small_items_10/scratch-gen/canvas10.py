import json, re, os, sys, datetime
# python3 canvas9.py <out dir> <canvas root>: swaps art/ for the canvas's /_blob/ urls and lays the boards out.
OUT, ROOT = sys.argv[1], sys.argv[2]
B = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blobs10.json')))
P = os.path.join(ROOT, 'project'); os.makedirs(P, exist_ok=True)
L = [('Main', 'Small items 10 · the calls'), ('Plan', '1 · Buying credits, 50 a month'), ('Toasts', '2 · Toasts, one rule'),
     ('Hide', '3 · Hide, color and searches'), ('Games-Filters', '4 · Game history filters'), ('Groups-FlyerOff', '5 · Delete a group, trial off'), ('Errata', '6 · Errata')]
rows = [[L[0], L[6], L[1]], L[2:6]]
boards = {}; order = []; y = 0
for row in rows:
    x = 0; hmax = 0
    for n, t in row:
        s = open(f'{OUT}/{n}.dc.html').read()
        s = re.sub(r'(["(\'])art/([^"\')]+)', lambda m: m.group(1) + B[m.group(2)], s)
        assert 'art/' not in s, n
        open(f'{P}/{n}.dc.html', 'w').write(s)
        w, h = map(int, re.search(r'"\$preview":\{"width":(\d+),"height":(\d+)\}', s).groups())
        boards[f'{n}.dc.html'] = {'x': x, 'y': y, 'w': w, 'h': h, 'title': t}; order.append(f'{n}.dc.html')
        x += w + 80; hmax = max(hmax, h)
    y += hmax + 120
idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}, 'title': 'The 99 · Small items 10',
       'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': {}}
json.dump(idx, open(f'{P}/canvas.json', 'w'), indent=1)
print(json.dumps(boards))
