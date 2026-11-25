from PIL import Image
import shutil
out = '/tmp/claude-0/-home-user/637c43c6-06fc-5df7-8b74-4facdeee8e9b/scratchpad/qf/art/'
for dev in 'pd':
    for st in ['r2-full', 'r2-sparse', 'r2-active', 'r2-combo-both', 'r2-combo-one']:
        f = f'qf-{dev}-{st}'; im = Image.open(f'out/shots/{f}.png').convert('RGB')
        im = im.crop((0, 0, 2600, 1900)).resize((1950, 1425)) if dev == 'd' else im.crop((0, 0, 780, 2000))
        im.save(out + f + '.webp', quality=82); shutil.copy(out + f + '.webp', '/mnt/project-files/collection-quick-filters/art/')
print('ok')
