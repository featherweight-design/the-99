import json
C = {
 "round": ("Round", "Goes up when play gets back to whoever went first."),
 "monarch": ("Monarch", "Tap it, then tap who takes the crown."),
 "initiative": ("Initiative", "Tap it, then tap who takes it."),
 "day": ("Day and night", "Off until a card starts it. Tap for day, tap again to flip."),
 "dice": ("Dice", "Roll a d6 or a d20, or flip a coin."),
 "undo": ("Undo", "Takes back the last change, one at a time."),
 "menu": ("Menu", "This guide, and back to the table."),
 "end": ("End turn", "Only on the player whose turn it is. Their edge is lit."),
 "sheet": ("Your sheet", "Damage, counters, tax, mana, history."),
 "badges": ("What's on you", "Damage and counters you carry. Tap one to change it."),
 "life": ("Life", "Tap − or + for 1. Hold for 10 at a time. It settles after 2 seconds."),
}
HEAD = ("What's what", "Every panel works like yours. Tap anywhere to go back to the game.")
P = {
 "round": "Counts rounds, not turns.",
 "monarch": "Tap, then tap who's crowned.",
 "initiative": "Tap, then tap who takes it.",
 "day": "Tap for day, again to flip.",
 "dice": "A d6, a d20 or a coin.",
 "undo": "Takes back the last change.",
 "menu": "This guide, and back to the table.",
 "end": "Passes play on.",
 "sheet": "Damage, counters and more.",
 "life": "Tap − or + for 1. Hold for 10.",
}
def it(k, x, y, w, **kw):
    sel = {"end": "[data-testid=end-turn]"}.get(k, f"[data-testid=strip-{k}]")
    d = {"t": C[k][0], "l": C[k][1], "sel": sel, "x": x, "y": y, "w": w, "round": True}
    if d["round"]: d["pad"] = 2
    if k == "end": d.update(round=False, r=24)
    if k == "sheet": d.update(sel="[data-testid=panel-sheet]", panel=0)
    if k == "badges": d.update(sel="[data-testid=panel-badges]", panel=0, round=False, r=12, pad=3)
    if k == "life": d.update(targets=[{"panel":0,"sel":"[data-testid=half-minus] > span:last-child"},{"panel":0,"sel":"[data-testid=half-plus] > span:last-child"}], round=False, r=14, pad=10)
    d.update(kw); return d
def head(x, y, w): return {"t": HEAD[0], "l": HEAD[1], "x": x, "y": y, "w": w}
seats = ["you","colin","peter","max"]
# tablet: strip callouts in a row over the top panels
tx = [20,185,350,515,680,845,1010]
strip = ["round","monarch","initiative","day","dice","undo","menu"]
def tab_items(badges):
    items = [it(k, tx[i], 236, 150) for i, k in enumerate(strip)]
    items += [it("end", 24, 540, 200)]
    if badges:
        items += [it("badges", 236, 540, 190), it("sheet", 380 if False else 438, 540, 0)]
    items += [it("life", 150, 700, 290)]
    return items
def tab(badges):
    items = [it(k, tx[i], 236, 150) for i, k in enumerate(strip)]
    items.append(it("end", 24, 540, 196))
    if badges: items.append(it("badges", 232, 540, 172))
    items.append(it("sheet", 412 if badges else 330, 540, 168))
    items.append(it("life", 150, 712, 300))
    return {"items": items, "head": head(660, 560, 440)}
def phone(badges):
    L, R = 8, 232
    ph = lambda k, x, y, w, **kw: it(k, x, y, w, l=P[k], **kw)
    items = [ph("round", L, 212, 150), ph("initiative", L, 338, 150), ph("dice", L, 455, 150), ph("menu", L, 586, 150),
             ph("monarch", R, 276, 150), ph("day", R, 395, 150), ph("undo", R, 524, 150),
             ph("end", 96, 706, 122), ph("sheet", 222, 706, 118)]
    items.append(ph("life", 90, 786, 210))
    return {"items": items, "head": head(12, 30, 366), "small": True}
MJ = open("menu.js").read()
S = [
 {"id":"T1-first","w":1180,"h":820,"seats":seats,"layout":"tablet-4","log":"FRESH","first":0,"legend":tab(False)},
 {"id":"T2-menu","w":1180,"h":820,"seats":seats,"layout":"tablet-4","log":"LOGY3","menu":True,"menuJs":MJ},
 {"id":"T3-mid","w":1180,"h":820,"seats":seats,"layout":"tablet-4","log":"LOGY3","legend":tab(True)},
 {"id":"P1-first","w":390,"h":844,"seats":seats,"layout":"phone-4-around","log":"FRESH","first":0,"legend":phone(False)},
 {"id":"P2-menu","w":390,"h":844,"seats":seats,"layout":"phone-4-around","log":"LOGY3","menu":True,"menuJs":MJ},
]
order = ["lifeg","end","sheet","badges","round","monarch","initiative","day","dice","undo","menu"]
CC = dict(C); CC["lifeg"] = C["life"]
import json as _j
MOD = "window.__C=" + _j.dumps([[k, CC[k][0], CC[k][1]] for k in order]) + ";" + open("modal.js").read()
S.append({"id":"B1-modal","w":1180,"h":820,"seats":seats,"layout":"tablet-4","log":"LOGY3","js":MOD})
json.dump(S, open("specs.json","w"), indent=1)
