import os, sys, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, gboards as B
os.makedirs("gout", exist_ok=True)
for n, fn, _ in B.BOARDS:
    open(f"gout/{n}.dc.html", "w").write(fn())
    print("wrote", n)
