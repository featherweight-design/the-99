set -e
W=/tmp/claude-0/-home-user/e13841c8-0759-5199-a33a-1f81c03c401e/scratchpad/si7; cd $W
python3 b7.py local $W/o7 >/dev/null
node render.js $W/o7 Main Launch-Date No-Codes Revoke-Failed CSV Print-Revoked Friend-Order | cut -c1-220
python3 b7.py blob $W/canvas/project >/dev/null
python3 - <<'PY'
import json,re,sys
W='/tmp/claude-0/-home-user/e13841c8-0759-5199-a33a-1f81c03c401e/scratchpad/si7'
sys.path.insert(0,W)
sz=json.load(open(W+'/o7/shots/sizes.json'))
for n,v in sz.items():
    for d in (W+'/canvas/project/',W+'/o7/'):
        p=d+n+'.dc.html'; s=open(p).read()
        s=re.sub(r'"\$preview":\{[^}]*\}','"$preview":{"width":%d,"height":%d}'%(v['w'],v['h']),s)
        open(p,'w').write(s)
import si7
titles={n:t for n,(f,t,w) in si7.W.items()}
pos={"Main":(0,0),"Launch-Date":(1692,0)}
x=0;y=max(sz["Launch-Date"]["h"],sz["Main"]["h"])+120
for n in ["No-Codes","Revoke-Failed","CSV","Print-Revoked","Friend-Order"]:
    pos[n]=(x,y); x+=sz[n]["w"]+80
b={}
for n in ["Main","Launch-Date","No-Codes","Revoke-Failed","CSV","Print-Revoked","Friend-Order"]:
    b[n+".dc.html"]={"x":pos[n][0],"y":pos[n][1],"w":sz[n]["w"],"h":sz[n]["h"],"title":titles[n]}
c={"v":3,"createdOnFiles":{"v":1,"at":"2026-10-30T20:10:00Z"},"title":"The 99 · Small items 7","launch":{"view":"canvas"},"pages":[],"boards":b,"order":list(b),"notes":{},"designSystems":[]}
json.dump(c,open(W+'/canvas/project/canvas.json','w'),indent=1,ensure_ascii=False)
PY
