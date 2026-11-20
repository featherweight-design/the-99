# Writes the phone game boards for flow R2: panels either side of a slim shared strip.
import sys
OUT='/home/user/lt/canvas/project/'
ART={'Colin':'/_blob/3a9cc48d946086f7a01702d812ad49a7','Peter':'/_blob/de887acf2dd3696e7f72d8630ef63661','You':'/_blob/019b993ea74dc7eef2d2e5a820befefa','Max':'/_blob/747b6b5b0a287c64fc2a76924491c25e'}
CSS='''@font-face{font-family:"Cinzel";src:url(/_blob/92b49ae8bf36fee523d2c940101a47cd) format("woff2");font-weight:400 900}
@font-face{font-family:"IBM Plex Sans";src:url(/_blob/28a118a4f1d2d89f048ed8dda083f273) format("woff2");font-weight:100 700}
@font-face{font-family:"IBM Plex Mono";src:url(/_blob/ab35e14cb6458bb7fa4f3f54f8f02a5f) format("woff2");font-weight:500}
body{margin:0}
.scr{--bg:#14110E;--surface:#1E1A15;--elevated:#29241F;--border:#2B241B;--border-strong:#3A3229;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--fg-faint:#948B78;--accent:#CF8745;--warning:#DEAA29;width:390px;height:844px;box-sizing:border-box;padding:6px;background:var(--bg);display:grid;grid-template-columns:155px 56px 155px;grid-template-rows:413px 413px;gap:6px;position:relative;font-family:"IBM Plex Sans",system-ui,sans-serif;color:var(--fg)}
.cell{position:relative;overflow:hidden;border-radius:16px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border)}
.rot{position:absolute;width:413px;height:155px;left:-129px;top:129px}
.r90{transform:rotate(90deg)}.r270{transform:rotate(-90deg)}
.art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.6}
.wash{position:absolute;inset:0;background:rgba(20,17,14,.5)}
.pane{position:absolute;inset:0;box-sizing:border-box;padding:6px 8px 8px 14px;display:flex;flex-direction:column}
.who{display:flex;align-items:center;gap:6px;height:44px;white-space:nowrap}
.who b{font-weight:600;font-size:16px;margin-right:4px}
.bd{display:flex;align-items:center;gap:5px;height:24px;padding:0 9px 0 4px;border-radius:999px;background:rgba(20,17,14,.82);box-shadow:inset 0 0 0 1px var(--border-strong);font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--fg-body)}
.bd img{width:18px;height:18px;border-radius:50%;object-fit:cover}
.bd svg{margin-left:3px}
.bd.acc{color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.mk{margin-left:auto;flex:none;width:44px;height:44px;border-radius:50%;border:0;background:rgba(20,17,14,.85);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg);display:flex;align-items:center;justify-content:center}
.life{position:relative;flex:1;display:flex;align-items:center;justify-content:center}
.half{position:absolute;top:0;bottom:0;width:50%;background:none;border:0;color:var(--fg-muted);font-size:30px;font-family:"IBM Plex Sans",sans-serif;padding:0 4px;display:flex;align-items:center}
.minus{left:0;justify-content:flex-start}.plus{right:0;justify-content:flex-end}
.num{position:relative;font-family:"Cinzel",serif;font-weight:700;font-size:88px;line-height:1;pointer-events:none;text-shadow:0 2px 12px rgba(0,0,0,.6)}
.delta{position:absolute;left:100%;top:8px;margin-left:6px;font-family:"IBM Plex Mono",monospace;font-size:18px;color:var(--accent)}
.press{background:rgba(207,135,69,.18)!important;color:var(--accent)!important}
.turn{box-shadow:inset 0 0 0 2px var(--accent)}
.out .art{opacity:.22;filter:grayscale(1)}
.out .wash{background:rgba(20,17,14,.78)}
.gone{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center}
.gone strong{font-family:"Cinzel",serif;font-weight:700;font-size:26px}
.gone span{font-size:12.5px;color:var(--fg-body)}
.undo{height:44px;padding:0 20px;border-radius:10px;border:0;background:rgba(20,17,14,.8);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg);font-family:"IBM Plex Sans",sans-serif;font-size:14px;margin-top:4px}
.pick .art{opacity:.35}
.pick .wash{background:rgba(20,17,14,.6)}
.crown{flex:1;margin:0 6px 2px 0;border-radius:12px;border:0;background:rgba(20,17,14,.7);box-shadow:inset 0 0 0 1.5px var(--accent);color:var(--accent);font-family:"IBM Plex Sans",sans-serif;font-weight:600;font-size:16px;display:flex;align-items:center;justify-content:center;gap:10px}
.crown.now{background:rgba(107,72,42,.75);color:var(--fg);box-shadow:inset 0 0 0 2px var(--accent)}
.spine{grid-column:2;grid-row:1 / span 2;border-radius:16px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
.sb{position:relative;width:48px;height:48px;border-radius:50%;border:0;background:var(--elevated);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg-body);display:flex;align-items:center;justify-content:center;font-family:"Cinzel",serif;font-weight:700;font-size:22px}
.sb.t{width:50px;height:50px;color:var(--accent);box-shadow:inset 0 0 0 2px var(--accent)}
.sb.on{color:var(--accent);box-shadow:inset 0 0 0 1.5px var(--accent)}
.sb.off{color:var(--fg-faint)}
.sb.act{background:var(--accent);color:#14110E;box-shadow:none}
.sb img{position:absolute;right:-5px;bottom:-5px;width:22px;height:22px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px var(--surface)}
.rule{width:26px;height:1px;background:var(--border-strong)}
.dim{opacity:.4}
button.bd{border:0;position:relative;cursor:pointer}
button.bd::after{content:"";position:absolute;inset:-10px -3px}
.art.pl{right:50%;width:50%}.art.pr{left:50%;width:50%}
.seam{position:absolute;top:0;bottom:0;left:50%;width:2px;margin-left:-1px;background:var(--bg);opacity:.8}
.endt{height:40px;padding:0 14px;border-radius:999px;border:0;background:var(--accent);color:#14110E;font-family:"IBM Plex Sans",sans-serif;font-weight:600;font-size:14px;display:flex;align-items:center;gap:6px}
.tn{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--accent);box-shadow:inset 0 0 0 2px var(--accent);font-family:"Cinzel",serif;font-weight:700;font-size:22px}'''
ICON={
'turn':'<path d="M5 12h12M13 6l6 6-6 6"/>',
'crown':'<path d="M3 18l2-10 4.5 4L12 5l2.5 7L19 8l2 10z"/>',
'shield':'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
'moon':'<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
'undo':'<path d="M9 7L4 12l5 5"/><path d="M4 12h10a5 5 0 010 10h-2"/>',
'poison':'<circle cx="12" cy="12" r="7"/><path d="M12 3v18"/>',
'tax':'<path d="M12 4v16M5 11l7-7 7 7"/>',
'up':'<path d="M6 15l6-6 6 6"/>',
'dice':'<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>'}
def ic(n,s=24,w=1.8):
    return '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>'%(s,s,w,ICON[n])
def badge(kind,text,acc=False,img=None):
    inner=('<img src="%s" alt="">'%img) if img else ic(kind,12,2.1)
    return '<button class="bd%s" aria-label="%s. Open it in the sheet">%s%s</button>'%(' acc' if acc else '',text,inner,text)
POS={'Colin':('1','1','r90'),'Peter':('3','1','r270'),'You':('1','2','r90'),'Max':('3','2','r270')}
ENDT='<button class="endt">End turn'+ic('turn',16,2.2)+'</button>'
PARTNER={}
def panel(name,life,badges='',cls='',body=None,delta=None,press=False):
    col,row,r=POS[name]
    who='You' if name=='You' else name
    poss='Your' if name=='You' else name+"'s"
    if body is None:
        mn='half minus press' if press else 'half minus'
        d='<span class="delta">%s</span>'%delta if delta else ''
        lose='lose' if name=='You' else 'loses'; gain='gain' if name=='You' else 'gains'
        body='<div class="life"><button class="%s" aria-label="%s %s 1 life">−</button><span class="num">%s%s</span><button class="half plus" aria-label="%s %s 1 life">+</button></div>'%(mn,who,lose,life,d,who,gain)
    return '''  <div class="cell %s" style="grid-column:%s;grid-row:%s">
    <div class="rot %s">
      %s
      <div class="wash"></div>
      <div class="pane">
        <div class="who"><b>%s</b>%s<button class="mk" aria-label="%s sheet: commander damage, counters, tax, mana, table">%s</button></div>
        %s
      </div>
    </div>
  </div>
'''%(cls,col,row,r,('<img class="art pl" src="%s" alt=""><img class="art pr" src="%s" alt=""><div class="seam"></div>'%PARTNER[name]) if name in PARTNER else '<img class="art" src="%s" alt="">'%ART[name],who,badges,poss,ic('up',20,2),body)
def spine(turn,turnwho,mon=None,ini=None,dn='off',active=None,dim=False):
    d=' dim' if dim else ''
    s='  <div class="spine">\n'
    s+='    <div class="tn%s" aria-label="Round %s, %s turn">%s</div>\n'%(d,turn,turnwho,turn)
    s+='    <div class="rule"></div>\n'
    if active=='crown': c='sb act'
    else: c='sb on' if mon else 'sb off'
    s+='    <button class="%s%s" aria-label="Monarch: %s. Tap to pass it">%s%s</button>\n'%(c,'' if active=='crown' else d,mon or 'nobody',ic('crown'),('<img src="%s" alt="">'%ART[mon]) if mon and active!='crown' else '')
    s+='    <button class="%s%s" aria-label="Initiative: %s. Tap to pass it">%s%s</button>\n'%('sb on' if ini else 'sb off',d,ini or 'nobody',ic('shield'),('<img src="%s" alt="">'%ART[ini]) if ini else '')
    if dn=='off': s+='    <button class="sb off%s" aria-label="Day and night: not started. Tap to make it day">%s</button>\n'%(d,ic('sun'))
    else: s+='    <button class="sb on%s" aria-label="It is %s. Tap to make it %s">%s</button>\n'%(d,dn,'night' if dn=='day' else 'day',ic('sun' if dn=='day' else 'moon'))
    s+='    <button class="sb%s" aria-label="Roll dice or flip a coin">%s</button>\n'%(d,ic('dice'))
    s+='    <div class="rule"></div>\n'
    s+='    <button class="sb%s" aria-label="Undo the last change">%s</button>\n'%(d,ic('undo'))
    s+='  </div>\n'
    return s
def page(fn,title,cells):
    h='''<!doctype html>
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
<div class="scr">
%s</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
'''%(title,CSS,cells)
    open(OUT+fn,'w').write(h)
# 3 · the game starts
page('F03-First.dc.html','3 · The game starts',
 panel('Colin','40')+panel('Peter','40',ENDT,'turn')+panel('You','40')+panel('Max','40')+spine(1,"Peter's"))
# 4 · your own life
page('F04-Life.dc.html','4 · Changing your own life',
 panel('Colin','40')+panel('Peter','40',ENDT,'turn')+panel('You','37',delta='−3',press=True)+panel('Max','40')+spine(1,"Peter's"))
# 4b · passing the monarch
def crownbody(name,now=False):
    if now: return '<button class="crown now" aria-pressed="true">%sMonarch now</button>'%ic('crown',22)
    lab='Take the crown' if name=='You' else 'Crown %s'%name
    return '<button class="crown">%s%s</button>'%(ic('crown',22),lab)
page('F13-Monarch.dc.html','4b · Passing the monarch',
 panel('Colin','24','','pick turn',crownbody('Colin'))+panel('Peter','18','','pick',crownbody('Peter'))+panel('You','31','','pick',crownbody('You'))+panel('Max','36','','pick',crownbody('Max',True))+spine(2,"Colin's",mon='Max',active='crown',dim=True))
# 10 · a player is out
outbody='<div class="gone"><strong>Out</strong><span>21 commander damage from Ghalta · round 3</span><button class="undo">Undo</button></div>'
page('F10-Out.dc.html','10 · A player is out',
 panel('Colin','22',ENDT,'turn')+panel('Peter','0','','out',outbody)+panel('You','19',badge('poison','Poison 2'))+panel('Max','33')+spine(3,"Colin's",mon='Max',ini='Colin',dn='night'))

PARTNER['Peter']=('/_blob/bb888cc90f29787c182064325351ec87','/_blob/19bb8d7da561dd80c3ebe0a4888cb8c8')
page('F14-Partner.dc.html','4c · A partner deck at the table',
 panel('Colin','29',ENDT,'turn')+panel('Peter','33',badge('tax','Tax +2'))+panel('You','27',badge('poison','Poison 2'))+panel('Max','35')+spine(3,"Colin's",mon='Max',dn='day'))
