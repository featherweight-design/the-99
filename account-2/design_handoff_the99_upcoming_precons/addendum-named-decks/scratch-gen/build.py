import os, sys, json, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
mode = sys.argv[1] if len(sys.argv) > 1 else "local"
if mode == "blob":
    kit.MODE["blob"] = True; kit.BLOB.update(json.load(open("blobs.json")))
B = __import__(os.environ.get("BMOD","boards"))
out = "out" if mode == "local" else sys.argv[2]
os.makedirs(out, exist_ok=True)
if mode == "local":
    shutil.copytree("art", f"{out}/art", dirs_exist_ok=True)
# R1b: the link-out mark is the standard box-and-arrow icon, smaller than the old ↗ glyph. Every ↗ drawn becomes it;
# a board that shows the OLD glyph writes the entity &#8599; so it survives.
XL = ('<svg class="xl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      '<path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/><path d="M15 3h6v6"/><path d="M10.5 13.5 21 3"/></svg>')
XL_CSS = ".xl{display:inline-block;width:.72em;height:.72em;vertical-align:-.02em;margin-left:.3em;flex:none}"
for n, fn, _ in B.BOARDS:
    h = fn()
    head, sep, body = h.replace("</style>", XL_CSS + "</style>", 1).partition("<body")
    h = head + sep + body.replace("&nbsp;↗", "↗").replace("\u00a0↗", "↗").replace(" ↗", "↗").replace("↗", XL)
    open(f"{out}/{n}.dc.html", "w").write(h); print("wrote", n)
