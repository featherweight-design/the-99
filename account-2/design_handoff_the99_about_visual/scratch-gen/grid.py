import sys
from PIL import Image, ImageDraw
src,out=sys.argv[1],sys.argv[2]; W=int(sys.argv[3]) if len(sys.argv)>3 else 1300
im=Image.open(src).convert('RGB'); im=im.resize((W,int(im.height*W/im.width)))
d=ImageDraw.Draw(im)
for i in range(1,20):
  x=int(W*i/20); d.line([(x,0),(x,im.height)],fill=(0,255,255),width=1); d.text((x+2,2),f"{i*5}",fill=(0,255,255))
  y=int(im.height*i/20); d.line([(0,y),(W,y)],fill=(255,0,255),width=1); d.text((2,y+2),f"{i*5}",fill=(255,0,255))
im.save(out)
