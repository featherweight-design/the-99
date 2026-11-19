OUT='/home/user/lt/canvas/project/'
I={
'Poison':('<path d="M12 2.5v19"/><ellipse cx="12" cy="12.5" rx="6.5" ry="6"/><path d="M7.5 5.5c1.2 1 2.8 1.5 4.5 1.5s3.3-.5 4.5-1.5"/>','Official: the Phyrexian symbol, which poison counters carry'),
'Energy':('<path d="M13.5 2.5L6 13h5.5l-1.5 8.5L18 10.5h-5.5z"/>','Official: the energy symbol {E}'),
'Tickets':('<path d="M3.5 7.5h17v3a1.8 1.8 0 0 0 0 3.6v3H3.5v-3a1.8 1.8 0 0 0 0-3.6z"/><path d="M14.5 7.5v10" stroke-dasharray="1.4 1.6"/>','Official: the ticket symbol {TK}'),
'Rad':('<circle cx="12" cy="12" r="1.6"/><path d="M10.20 8.88L7.50 4.21A9 9 0 0 1 16.50 4.21L13.80 8.88A3.6 3.6 0 0 0 10.20 8.88z"/><path d="M15.60 12.00L21.00 12.00A9 9 0 0 1 16.50 19.79L13.80 15.12A3.6 3.6 0 0 0 15.60 12.00z"/><path d="M10.20 15.12L7.50 19.79A9 9 0 0 1 3.00 12.00L8.40 12.00A3.6 3.6 0 0 0 10.20 15.12z"/>',"Fallout's Radiation card; MTGO and the Mana font use a rad icon"),
'Day / night':('<path d="M9 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 1 0 0-7.6z"/><path d="M9 2.5v2M9 19.5v2M2.5 12h2M4.4 7.4l1.4 1.4M4.4 16.6l1.4-1.4"/><path d="M15.5 4.5a7.5 7.5 0 1 1-2.6 14.6 6 6 0 0 0 2.6-14.6z" fill="currentColor" stroke-width="1.2"/>','Official: the sun and moon markers on daybound and nightbound cards'),
"City's blessing":('<path d="M3 20.5h18"/><path d="M4.5 20.5v-3h15v3"/><path d="M6.5 17.5v-3h11v3"/><path d="M8.5 14.5v-3h7v3"/><path d="M12 11.5V7"/><circle cx="12" cy="4.6" r="1.8"/>',"Ascend's golden city, Orazca, a stepped temple"),
'Dungeon':('<rect x="8.5" y="2.5" width="7" height="5" rx="1"/><rect x="3" y="16.5" width="7" height="5" rx="1"/><rect x="14" y="16.5" width="7" height="5" rx="1"/><path d="M10.5 7.5l-3.5 9M13.5 7.5l3.5 9"/>','Dungeon cards: rooms linked by paths down the card'),
'Initiative':('<path d="M4 4.5h5v4h4v4h4v4h3.5"/><path d="M4 20.5h16.5"/><path d="M7 11.5v6M4.5 15l2.5 2.5L9.5 15"/>','The initiative sends you down into the Undercity'),
'Monarch':('<path d="M3.5 18l2-10 4.3 4L12 5l2.2 7 4.3-4 2 10z"/><path d="M5 21h14"/>','The Monarch card; the crown is the shared shorthand'),
'Experience':('<path d="M6 20l6-4 6 4"/><path d="M6 14.5l6-4 6 4"/><path d="M6 9l6-4 6 4"/>','No official symbol; rank chevrons, since it only ever grows'),
'The Ring':('<ellipse cx="12" cy="12.5" rx="9" ry="6"/><ellipse cx="12" cy="11.3" rx="6.3" ry="3.8"/><path d="M6.2 15.4c1.6.8 3.6 1.2 5.8 1.2s4.2-.4 5.8-1.2" stroke-dasharray="1.1 1.5" stroke-width="1.2"/>', 'Official: the LotR set symbol, as the Companion uses (drawn: a stand-in)'),
'Speed':('<path d="M3.52 14.91A8.5 8.5 0 0 1 5.58 9.92"/><path d="M6.42 9.08A8.5 8.5 0 0 1 11.41 7.02"/><path d="M12.59 7.02A8.5 8.5 0 0 1 17.58 9.08"/><path d="M18.42 9.92A8.5 8.5 0 0 1 20.48 14.91" opacity=".35"/><path d="M12 15.5L15.73 10.18"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor"/>','No official symbol; speed runs 1 to 4, so the dial has four steps'),
'Storm':('<path d="M4 8.5h13"/><path d="M6 12h11"/><path d="M8.5 15.5h7"/><path d="M11 19h3.5"/><path d="M17 8.5c2 0 3-1.2 3-2.5S19 3.5 17 3.5H8"/>', 'No official symbol; a tornado'),
'Commander tax':('<circle cx="12" cy="12" r="8.5"/><path d="M12 16.5v-9M8.5 11l3.5-3.5 3.5 3.5"/>','No official symbol; it goes up by 2 each cast'),
}
def svg(p,s): return '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>'%(s,s,p)
tiles=''.join('<div class="t"><div class="big">%s</div><div class="sm">%s%s</div><b>%s</b><small class="%s">%s</small></div>'%(svg(p,56),svg(p,20),svg(p,14),n,'off' if note.startswith('Official') else '',note) for n,(p,note) in I.items())
open(OUT+'I1-Icons.dc.html','w').write('''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Icons · our counter set, researched</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
@font-face{font-family:"Cinzel";src:url(/_blob/92b49ae8bf36fee523d2c940101a47cd) format("woff2");font-weight:400 900}
@font-face{font-family:"IBM Plex Sans";src:url(/_blob/28a118a4f1d2d89f048ed8dda083f273) format("woff2");font-weight:100 700}
@font-face{font-family:"IBM Plex Mono";src:url(/_blob/ab35e14cb6458bb7fa4f3f54f8f02a5f) format("woff2");font-weight:500}
body{margin:0}
.scr{--bg:#14110E;--surface:#1E1A15;--border:#2B241B;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--accent:#CF8745;width:1180px;height:560px;box-sizing:border-box;padding:24px;background:var(--bg);font-family:"IBM Plex Sans",system-ui,sans-serif;color:var(--fg);display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:14px;align-content:start}
.t{border-radius:14px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border);padding:16px 12px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;height:240px;box-sizing:border-box}
.big{height:84px;display:flex;align-items:center;color:var(--accent)}
.sm{display:flex;align-items:center;gap:10px;color:var(--fg-body);height:22px}
.t b{font-size:14px;font-weight:600;margin-top:auto}
.t small{font-family:"IBM Plex Mono",monospace;font-size:10.5px;color:var(--fg-muted);line-height:1.35;min-height:28px}
.t small.off{color:var(--accent)}
</style>
</helmet>
<div class="scr">
%s
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1180,"height":560}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
'''%tiles)
