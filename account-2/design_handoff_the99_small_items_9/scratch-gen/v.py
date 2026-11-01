import sys
from PIL import Image
n=sys.argv[1]; W=int(sys.argv[2]) if len(sys.argv)>2 else 1000
im=Image.open(f'/home/user/si9/out/shots/{n}.png').convert('RGB'); w,h=im.size; s=W/w; im=im.resize((W,int(h*s))); H=im.size[1]
for k,y in enumerate(range(0,H,2000)): im.crop((0,y,W,min(H,y+2000))).save(f'/home/user/si9/v9_{n}_{k}.jpg',quality=70); print(f'/home/user/si9/v9_{n}_{k}.jpg')
