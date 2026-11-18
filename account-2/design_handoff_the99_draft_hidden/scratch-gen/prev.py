import re,sys
for n in sys.argv[1:]:
    s=open(f"out/{n}.dc.html").read()
    h=re.search(r"<helmet>(.*?)</helmet>",s,re.S).group(1)
    body=re.search(r"</helmet>(.*?)</x-dc>",s,re.S).group(1)
    open(f"out/{n}.prev.html","w").write(f"<!doctype html><html><head><meta charset=utf-8>{h}</head><body>{body}</body></html>")
