import sys
from PIL import Image
f=sys.argv[1]; W=int(sys.argv[2]) if len(sys.argv)>2 else 1400; ch=int(sys.argv[3]) if len(sys.argv)>3 else 1800
im=Image.open(f).convert('RGB'); w,h=im.size; s=W/w; im=im.resize((W,int(h*s))); H=im.size[1]
import os; b=os.path.splitext(f)[0]
for k,y in enumerate(range(0,H,ch)): im.crop((0,y,W,min(H,y+ch))).save(f'{b}_v{k}.jpg',quality=72); print(f'{b}_v{k}.jpg')
