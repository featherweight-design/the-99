import json, re, os, datetime
B = json.load(open('blobs.json'))
os.makedirs('canvas/project', exist_ok=True)
L = [('Main', 'Game history · the calls'), ('Place', '1 · Where it lives'), ('Populated', '2 · Every game, every deck'),
     ('Rows', '3 · The row'), ('Few', '4 · A few games'), ('Edges', '5 · Empty, long, failure, deleted deck')]
rows = [L[:3], L[3:]]
boards = {}; order = []; y = 0
for row in rows:
    x = 0; hmax = 0
    for n, t in row:
        s = open(f'out/{n}.dc.html').read()
        s = re.sub(r'src="art/([^"]+)"', lambda m: f'src="{B[m.group(1)]}"', s)
        assert 'art/' not in s, n
        open(f'canvas/project/{n}.dc.html', 'w').write(s)
        w, h = map(int, re.search(r'"\$preview":\{"width":(\d+),"height":(\d+)\}', s).groups())
        boards[f'{n}.dc.html'] = {'x': x, 'y': y, 'w': w, 'h': h, 'title': t}; order.append(f'{n}.dc.html')
        x += w + 80; hmax = max(hmax, h)
    y += hmax + 120
idx = {'v': 3, 'createdOnFiles': json.load(open('canvas/project/canvas.json'))['createdOnFiles'] if os.path.exists('canvas/project/canvas.json') else {'v': 1, 'at': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}, 'title': 'The 99 · Game history',
       'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': {}}
json.dump(idx, open('canvas/project/canvas.json', 'w'), indent=1)
print(json.dumps(boards))
