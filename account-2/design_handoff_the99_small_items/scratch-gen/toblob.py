import json, re, sys, os
B = json.load(open("blobs.json")); out = sys.argv[1]
for n in ["Main", "Cuts-Alternatives", "Draft-Note-Phone", "Spare-Answer-Sheet", "Dismiss-X", "Eng-Rulings", "Precon-Overview", "Friends-Desktop"]:
    s = open(f"out/{n}.dc.html").read()
    s = re.sub(r'art/([A-Za-z0-9._-]+)', lambda m: B[m.group(1)], s)
    assert "art/" not in s, n
    open(f"{out}/{n}.dc.html", "w").write(s); print(n, len(s))
