import sys
from PIL import Image
n=sys.argv[1]; step=int(sys.argv[2]) if len(sys.argv)>2 else 1500
im=Image.open('shots/'+n+'.png'); w,h=im.size
for i,y in enumerate(range(0,h,step)): im.crop((0,y,w,min(h,y+step))).save(f'shots/{n}-{i}.png')
print(n,w,h,(h+step-1)//step)
