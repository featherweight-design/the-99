import lib as L
def build():
    p = L.phone('<div class="list">'+L.crow('zimone',1,'rest')+L.crow('ghalta',2,'rest')+'</div>')
    d = L.desk('<div class="list">'+L.crow('zimone',1,'rest')+L.crow('ghalta',2,'rest')+'</div>')
    cap = '<img src="art/p-commanders.webp" width="390" style="border-radius:24px">'
    capd = '<img src="art/d-commanders.webp" width="1300">'
    return L.doc('calib', f'<div class="frames">{p}{cap}</div><div class="frames">{d}</div><div class="frames">{capd}</div>', 1500)
