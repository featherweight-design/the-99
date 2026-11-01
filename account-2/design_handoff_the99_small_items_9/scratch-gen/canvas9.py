import json, re, os, sys, datetime
# python3 canvas9.py <out dir> <canvas root>: swaps art/ for the canvas's /_blob/ urls and lays the boards out.
OUT, ROOT = sys.argv[1], sys.argv[2]
B = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blobs9.json')))
P = os.path.join(ROOT, 'project'); os.makedirs(P, exist_ok=True)
L = [('Main', 'Small items 9 · the calls'), ('Games-NoMatch', '1 · Game history, no games match'), ('Report', '2 · Report a problem, shell and 90 days'),
     ('CSV-Failed', '3 · Flyer CSV download fails'), ('Flags-Kill', '4 · Feature flags, kill a flag'), ('Rule0', '5 · Rule 0 defaults'),
     ('Add-Card', '6 · Add a card, ring, Remove, reopen, toasts'), ('Groups-Delete', '7 · Admin, delete a group'), ('Errata', 'Errata · confirm shared')]
rows = [L[:4], L[4:]]
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
idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}, 'title': 'The 99 · Small items 9',
       'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': {}}
json.dump(idx, open(f'{P}/canvas.json', 'w'), indent=1)
print(json.dumps(boards))
