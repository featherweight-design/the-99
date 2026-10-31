import json, re, os, datetime
B = {"c-dina.jpg":"9f1d824b248ab60b10dfc93f9f21b82e","c-ghalta.jpg":"0df93217a18476f04bc34d26468b24ec","c-giada.jpg":"c9fd6b05467bb6213f01c0a2472037cb","c-killian.jpg":"05313fe851ce58c303b664640f5d2c94","c-lathliss.jpg":"1c985a641e7d7399430b8ee35563b204","c-miku.jpg":"8fbd47c4e916d02eebf157b1b5ac6b30","c-sai.jpg":"f794f4d6a1f8e207108933c85c3a818c","c-zimone.jpg":"3663cbfff7f1f83722cca5d27822889f","d-collection2.webp":"451eb7daf2a388b0c35e350b4ae5322a","d-deck-list.webp":"8abe57499890662c88c62f8aba8fd7eb","d-home.webp":"3ce424b18e1b1735b6bddd534c8c10e7","p-collection.webp":"1339ffe4de8445047f7793a64eebe9d4","p-deck-top.webp":"3c3bc04f9ada7a6dc2e2ea9aab7004b7","p-deck-your-deck.webp":"6d4aa6b522cfd0285fff3b680d4ad4e8","p-decks.webp":"eb0f22cd226f5046ee8db89a703cd2cb","p-home.webp":"a8942633c90feba783627e824bb11976"}
B = {k: '/_blob/' + v for k, v in B.items()}
json.dump(B, open('out/blobs.json', 'w'), indent=0)
os.makedirs('canvas/project', exist_ok=True)
L = [('Main', 'Add a card from anywhere · the four directions'), ('A-Nav', 'A · Nav slot'), ('B-Header', 'B · Header +'),
     ('C-Search', 'C · Search adds (recommended)'), ('D-Card', 'D · The card is the entry'), ('Shared', 'Shared · the pack, the save, the way back'), ('Dock', 'R2 · the deck’s own search (dock bridge)')]
rows = [L[:3], L[3:6], L[6:]]
boards = {}; order = []; y = 0
for row in rows:
    x = 0; hmax = 0
    for n, t in row:
        s = open(f'out/{n}.dc.html').read()
        s = re.sub(r'art/([A-Za-z0-9._-]+)', lambda m: B[m.group(1)], s)
        assert 'art/' not in s, n
        open(f'canvas/project/{n}.dc.html', 'w').write(s)
        w, h = map(int, re.search(r'"\$preview":\{"width":(\d+),"height":(\d+)\}', s).groups())
        boards[f'{n}.dc.html'] = {'x': x, 'y': y, 'w': w, 'h': h, 'title': t}; order.append(f'{n}.dc.html')
        x += w + 80; hmax = max(hmax, h)
    y += hmax + 120
prev = json.load(open('canvas/project/canvas.json')) if os.path.exists('canvas/project/canvas.json') else None
idx = {'v': 3, 'createdOnFiles': prev['createdOnFiles'] if prev else {'v': 1, 'at': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}, 'title': 'The 99 · Add a card from anywhere',
       'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': {}, 'designSystems': []}
json.dump(idx, open('canvas/project/canvas.json', 'w'), indent=1)
print(json.dumps(boards))
