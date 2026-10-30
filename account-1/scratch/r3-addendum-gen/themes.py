import re, json, sys
src = open('/home/claude/the-99/src/app/globals.css').read().split('\n')
blocks = {}
starts = {22: 'amonkhet', 123: 'kamigawa', 224: 'ixalan', 289: 'phyrexia', 356: 'eldraine', 421: 'kaldheim'}
for ln, key in starts.items():
    i = ln  # 1-based line ln -> index ln-1 ; amonkhet header spans 22-23
    depth = 0; toks = {}; started = False
    j = ln - 1
    while True:
        line = src[j]
        if '{' in line: depth += line.count('{'); started = True
        m = re.match(r'\s*--([\w-]+)\s*:\s*(.+?);', line)
        if m and depth == 1: toks[m.group(1)] = m.group(2).strip()
        if '}' in line: depth -= line.count('}')
        if started and depth == 0: break
        j += 1
    blocks[key] = toks
base = blocks['amonkhet']
out = {}
for k, t in blocks.items():
    d = dict(base); d.update(t); out[k] = d
json.dump(out, open('themes.json', 'w'), indent=1)
for k, d in out.items():
    print(k, len(blocks[k]), {x: d.get(x) for x in ['bg','surface','surface-raised','elevated','fg','fg-body','fg-muted','fg-faint','accent','warning','success','font-display']})
