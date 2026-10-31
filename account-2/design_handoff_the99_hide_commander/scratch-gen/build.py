import sys, os, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for n in sys.argv[2:]:
    mod, board = n.split(':')
    importlib.reload(importlib.import_module(mod)) if mod in sys.modules else None
    open(f'{out}/{board}.dc.html', 'w').write(importlib.import_module(mod).build()); print('wrote', board)
