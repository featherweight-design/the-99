import json, re, os, datetime
B = json.load(open('blobs8.json'))
os.makedirs('canvas/project', exist_ok=True)
L = [('Main', 'Small items 8 · the calls'), ('Banner', '1 · Home banner, glyph not screenshot'), ('Ticket', '2 · Sign-up with a ticket'),
     ('Cart-Tablet', '3 · Cart toasts at 768–1223'), ('Beads', '4 · Results beads, 1–4 games'), ('SC-Off', '5 · v2 run with v2 off'),
     ('Report', '6 · Report a problem after a crash'), ('Errata', 'Errata i–iv')]
rows = [L[:4], L[4:]]
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
idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}, 'title': 'The 99 · Small items 8',
       'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': {}}
json.dump(idx, open('canvas/project/canvas.json', 'w'), indent=1)
print(json.dumps(boards)[:600])
