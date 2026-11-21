# L2: the open table on the device that ran the game (life tracker U5 boards): someone else logged, you have not.
# "Not logged yet" becomes "You haven't logged it yet", so it reads right beside "Colin logged this game".
import re, sys, json, os
SRC, OUT, MAP = sys.argv[1], sys.argv[2], sys.argv[3]
m = json.load(open(MAP))
CHECK_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/></svg>'
NOTE_CSS = ('.note{display:flex;gap:10px;align-items:flex-start;border-radius:10px;background:var(--surface-sunken);box-shadow:inset 0 0 0 1px var(--border);'
            'padding:10px 12px;font-size:13px;line-height:1.5;color:var(--fg-body)}.note svg{flex:none;margin-top:2px;color:var(--fg-muted)}\n'
            '.last p.mine{color:var(--fg-body)}.last p.mine b{color:var(--fg);font-weight:600}\n</style>')
for v, t in (('Phone', 'L2 · The device that ran it: you haven’t logged yet'), ('Desktop', 'L2 · The device that ran it, desktop')):
    s = open(f'{SRC}/U5-Card-{v}.dc.html').read()
    s = re.sub(r'/_blob/([0-9a-f]{32})', lambda x: '@@' + m[x.group(1)] + '@@', s)
    s = re.sub(r'<title>[^<]*', '<title>' + t, s)
    s = re.sub(r'<button class="und".*?</button>', f'<div class="note">{CHECK_IC}<span>Colin logged this game at 10:41 pm, so this ending stays.</span></div>', s, count=1, flags=re.S)
    s = s.replace('<p>Not logged yet: Log this game fills it in.</p>', '<p class="mine">You haven’t logged it yet: <b>Log this game</b> fills it in.</p>')
    s = s.replace('</style>', NOTE_CSS, 1)
    assert 'class="und"' not in s.split('</helmet>')[1] and 'mine' in s
    open(f'{OUT}/L2-Device-{v}.dc.html', 'w').write(s)
print('ok')
