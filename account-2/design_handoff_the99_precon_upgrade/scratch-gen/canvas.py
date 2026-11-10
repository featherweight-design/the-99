import json, re, os, sys, datetime
OUT, ROOT = sys.argv[1], sys.argv[2]
B = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blobs.json')))
P = os.path.join(ROOT, 'project'); os.makedirs(P, exist_ok=True)
L = [('Main', 'R2 · the calls'), ('Entry', '1 · The page'), ('Intro', '2 · What to expect'), ('Commander', '3 · Step 1 · Commander'),
     ('Bracket', '4 · Step 2 · Bracket'), ('Strategy', '5 · Step 3 · Strategy'), ('Wait', '6 · Wait and failed'), ('Results', '7 · Results'), ('Start', '8 · Start the deck')]
rows = [L[0:3], L[3:6], L[6:9]]
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
idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}, 'title': 'The 99 · Upgrade this precon',
       'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': {}, 'designSystems': []}
json.dump(idx, open(f'{P}/canvas.json', 'w'), indent=1)
print(json.dumps(boards))
