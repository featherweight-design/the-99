import json, re, os, sys, datetime
OUT, ROOT = sys.argv[1], sys.argv[2]
B = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blobs.json')))
P = os.path.join(ROOT, 'project'); os.makedirs(P, exist_ok=True)
L = [('Main', 'Upgrade this precon · the calls'), ('Entry', '1 · Entry'), ('Picker', '2 · The picker and the confirm'), ('Wait', '3 · The wait and a failed run'),
     ('Results', '4 · Results'), ('Start', '5 · Start with the swaps'), ('Another', '6 · Another strategy'), ('Commander', '7 · Addendum A1 · who leads')]
rows = [L[0:2], L[2:4], L[4:6], L[6:8]]
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
