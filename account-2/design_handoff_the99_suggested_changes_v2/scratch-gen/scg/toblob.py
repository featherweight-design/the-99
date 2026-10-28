"""Post-process local boards into canvas boards: art/<file> -> /_blob/<id> from blobs.json."""
import json, re, sys, os
B = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "blobs.json")))
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for f in sys.argv[3:]:
    s = open(os.path.join(src, f)).read()
    miss = set()
    def rep(m):
        n = m.group(1)
        if n not in B: miss.add(n); return m.group(0)
        return B[n]
    s = re.sub(r'(?:\./)?art/([A-Za-z0-9._-]+)', rep, s)
    assert not miss, (f, miss)
    open(os.path.join(dst, f), "w").write(s)
    print("blob", f)
