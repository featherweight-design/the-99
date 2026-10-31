import json, re, os, datetime, sys
H = sys.argv[1]
B = json.load(open('blobs.json'))
os.makedirs(f'{H}/canvas/project', exist_ok=True)
L = [('Main', 'Hide a commander · the calls'), ('Rows', '1–2 · The Hide control on a row'), ('Undo', '3 · Undo in place · 12 · failures'),
     ('Hidden', '4–6 · The Hidden list'), ('Page', '7–8 · The commander’s page'), ('Edges', '9–11 · Help me choose, pairs, short lists'), ('Placement', 'R1c · Hide on the row: three placements')]
rows = [L[:3], L[3:6], [L[6]]]
boards = {}; order = []; y = 0
for row in rows:
    x = 0; hmax = 0
    for n, t in row:
        s = open(f'{H}/out/{n}.dc.html').read()
        s = re.sub(r'src="art/([^"]+)"', lambda m: f'src="{B[m.group(1)]}"', s)
        assert 'art/' not in s, n
        open(f'{H}/canvas/project/{n}.dc.html', 'w').write(s)
        w, h = map(int, re.search(r'"\$preview":\{"width":(\d+),"height":(\d+)\}', s).groups())
        boards[f'{n}.dc.html'] = {'x': x, 'y': y, 'w': w, 'h': h, 'title': t}; order.append(f'{n}.dc.html')
        x += w + 80; hmax = max(hmax, h)
    y += hmax + 120
idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}, 'title': 'The 99 · Hide a commander',
       'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': {}}
json.dump(idx, open(f'{H}/canvas/project/canvas.json', 'w'), indent=1)
print(json.dumps(boards))
