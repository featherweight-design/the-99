import sys, importlib, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
for n in sys.argv[1:]:
    mod, board = n.split(':')
    html = importlib.import_module(mod).build()
    open(f'out/{board}.dc.html', 'w').write(html); print('wrote', board, len(html))
