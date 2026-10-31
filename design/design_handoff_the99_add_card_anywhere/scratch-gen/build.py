import sys, os, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1]; names = sys.argv[2:]
for n in names:
    mod, board = n.split(':')
    html = importlib.import_module(mod).build()
    open(f'{out}/{board}.dc.html', 'w').write(html); print('wrote', board)
