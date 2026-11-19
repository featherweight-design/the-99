# Table-orientation layouts: absolute cells, each rotated toward its player's edge.
OUT='/home/user/lt/canvas/project/'
ART={'Colin':'3a9cc48d946086f7a01702d812ad49a7','Peter':'de887acf2dd3696e7f72d8630ef63661','You':'019b993ea74dc7eef2d2e5a820befefa','Max':'747b6b5b0a287c64fc2a76924491c25e','Chris':'4a0fd5eea277545f56c74cbec6b0a96e','Jace':'f6a88812ca37544203f26249c2bff155'}
DECK={'Colin':'Ghalta Stompy','Peter':'Giada Angels','You':'Sai Thopters','Max':'Gisa Zombies','Chris':'Killian','Jace':'Jace'}
CAP=110
ROT={'B':0,'L':90,'T':180,'R':-90}
IC={'turn':'<path d="M5 12h12M13 6l6 6-6 6"/>','crown':'<path d="M3 18l2-10 4.5 4L12 5l2.5 7L19 8l2 10z"/>','shield':'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
'dice':'<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
'undo':'<path d="M9 7L4 12l5 5"/><path d="M4 12h10a5 5 0 010 10h-2"/>','up':'<path d="M6 15l6-6 6 6"/>'}
def ic(n,s=24,w=1.8): return '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>'%(s,s,w,IC[n])
CSS='''@font-face{font-family:"Cinzel";src:url(/_blob/92b49ae8bf36fee523d2c940101a47cd) format("woff2");font-weight:400 900}
@font-face{font-family:"IBM Plex Sans";src:url(/_blob/28a118a4f1d2d89f048ed8dda083f273) format("woff2");font-weight:100 700}
@font-face{font-family:"IBM Plex Mono";src:url(/_blob/ab35e14cb6458bb7fa4f3f54f8f02a5f) format("woff2");font-weight:500}
body{margin:0}
.scr{--bg:#14110E;--surface:#1E1A15;--elevated:#29241F;--border:#2B241B;--border-strong:#3A3229;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--fg-faint:#948B78;--accent:#CF8745;position:relative;overflow:hidden;background:var(--bg);font-family:"IBM Plex Sans",system-ui,sans-serif;color:var(--fg)}
.cell{position:absolute;border-radius:16px;overflow:hidden;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border)}
.cell.turn{box-shadow:inset 0 0 0 2px var(--accent)}
.rot{position:absolute}
.art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.turn .art{opacity:.72}
.wash{position:absolute;inset:0;background:rgba(20,17,14,.5)}
.pane{position:absolute;inset:0;box-sizing:border-box;padding:6px 8px 8px 14px;display:flex;flex-direction:column}
.who{position:relative;z-index:2;display:flex;align-items:center;gap:8px;height:44px;white-space:nowrap}
.who b{font-weight:600;font-size:16px}
.who i{font-style:normal;font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--fg-body)}
.endt{height:40px;padding:0 14px;border-radius:999px;border:0;background:var(--accent);color:#14110E;font-family:"IBM Plex Sans",sans-serif;font-weight:600;font-size:14px;display:flex;align-items:center;gap:6px}
.mk{margin-left:auto;flex:none;width:44px;height:44px;border-radius:50%;border:0;background:rgba(20,17,14,.85);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg);display:flex;align-items:center;justify-content:center}
.life{position:relative;flex:1;display:flex;align-items:center;justify-content:center}
.half{position:absolute;top:0;bottom:0;width:50%;background:none;border:0;color:var(--fg-muted);font-size:30px;font-family:"IBM Plex Sans",sans-serif;padding:0 4px;display:flex;align-items:center}
.minus{left:0;justify-content:flex-start}.plus{right:0;justify-content:flex-end}
.num{font-family:"Cinzel",serif;font-weight:700;line-height:1;pointer-events:none;text-shadow:0 2px 12px rgba(0,0,0,.6)}
.spine{position:absolute;border-radius:16px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border);display:flex;align-items:center;justify-content:center;gap:12px}
.spine.v{flex-direction:column}
.sb{position:relative;width:48px;height:48px;border-radius:50%;border:0;background:var(--elevated);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg-body);display:flex;align-items:center;justify-content:center}
.sb.on{color:var(--accent);box-shadow:inset 0 0 0 1.5px var(--accent)}
.sb.off{color:var(--fg-faint)}
.sb img{position:absolute;right:-5px;bottom:-5px;width:22px;height:22px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px var(--surface)}
.tn{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--accent);box-shadow:inset 0 0 0 2px var(--accent);font-family:"Cinzel",serif;font-weight:700;font-size:22px}
.rule{background:var(--border-strong)}.v .rule{width:26px;height:1px}.h .rule{width:1px;height:26px}'''
def cell(x,y,w,h,o,name,life,active=False):
    r=ROT[o]
    if r in (90,-90): rw,rh=h,w
    else: rw,rh=w,h
    left=(w-rw)/2; top=(h-rh)/2
    short=min(rw,rh); fs=int(min(CAP,max(60,short*0.56)))
    poss='Your' if name=='You' else name+"'s"
    lose,gain=('lose','gain') if name=='You' else ('loses','gains')
    deck='<i>%s</i>'%DECK[name] if rw>=300 else ''
    endt=('<button class="endt">End turn'+ic('turn',16,2.2)+'</button>') if active else ''
    return ('  <div class="cell%s" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx"><div class="rot" style="width:%dpx;height:%dpx;left:%gpx;top:%gpx;transform:rotate(%ddeg)">'
      '<img class="art" src="/_blob/%s" alt=""><div class="wash"></div><div class="pane">'
      '<div class="who"><b>%s</b>%s%s<button class="mk" aria-label="%s sheet">%s</button></div>'
      '<div class="life"><button class="half minus" aria-label="%s %s 1 life">−</button><span class="num" style="font-size:%dpx">%s</span><button class="half plus" aria-label="%s %s 1 life">+</button></div>'
      '</div></div></div>\n')%(' turn' if active else '',x,y,w,h,rw,rh,left,top,r,ART[name],name,deck,endt,poss,ic('up',20,2),name,lose,fs,life,name,gain)
def spine(x,y,w,h,rnd,who):
    d='v' if h>w else 'h'
    s='  <div class="spine %s" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx">'%(d,x,y,w,h)
    s+='<div class="tn" aria-label="Round %d, %s turn">%d</div><div class="rule"></div>'%(rnd,who,rnd)
    s+='<button class="sb on" aria-label="Monarch: Max. Tap to pass it">%s<img src="/_blob/%s" alt=""></button>'%(ic('crown'),ART['Max'])
    s+='<button class="sb off" aria-label="Initiative: nobody. Tap to pass it">%s</button>'%ic('shield')
    s+='<button class="sb off" aria-label="Day and night: not started. Tap to make it day">%s</button>'%ic('sun')
    s+='<button class="sb" aria-label="Roll dice or flip a coin">%s</button><div class="rule"></div>'%ic('dice')
    s+='<button class="sb" aria-label="Undo the last change">%s</button></div>\n'%ic('undo')
    return s
def page(fn,title,W,H,body):
    open(OUT+fn,'w').write('''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>%s</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
%s
</style>
</helmet>
<div class="scr" style="width:%dpx;height:%dpx">
%s</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":%d,"height":%d}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
'''%(title,CSS,W,H,body,W,H))
# Phone 390x844
page('L1-Phone4Around.dc.html','Layout · phone, 4 players, one on each side',390,844,
 cell(6,6,378,190,'T','Colin','31',True)+cell(6,202,155,440,'L','You','27')+spine(167,202,56,440,2,"Colin's")+cell(229,202,155,440,'R','Peter','36')+cell(6,648,378,190,'B','Max','40'))
page('L2-Phone3End.dc.html','Layout · phone, 3 players, one at the end',390,844,
 cell(6,6,155,636,'L','You','33')+spine(167,6,56,636,2,"Peter's")+cell(229,6,155,636,'R','Peter','38',True)+cell(6,648,378,190,'B','Colin','40'))
page('L3-Phone3Side.dc.html','Layout · phone, 3 players on one side',390,844,
 cell(6,6,316,273,'L','Colin','40',True)+cell(6,285,316,274,'L','You','40')+cell(6,565,316,273,'L','Peter','40')+spine(328,6,56,832,1,"Colin's"))
# Tablet 1180x820
CAP=150
page('L4-Tablet6Ends.dc.html','Layout · tablet, 6 players, one at each end',1180,820,
 cell(10,10,250,800,'L','Chris','40')+cell(270,10,315,358,'T','Colin','27',True)+cell(595,10,315,358,'T','Peter','34')+spine(270,378,640,64,2,"Colin's")+cell(270,452,315,358,'B','You','31')+cell(595,452,315,358,'B','Max','38')+cell(920,10,250,800,'R','Jace','40'))
page('L5-Tablet5End.dc.html','Layout · tablet, 5 players, one at the end',1180,820,
 cell(10,10,445,358,'T','Colin','27',True)+cell(465,10,445,358,'T','Peter','34')+spine(10,378,900,64,2,"Colin's")+cell(10,452,445,358,'B','You','31')+cell(465,452,445,358,'B','Max','38')+cell(920,10,250,800,'R','Chris','40'))
