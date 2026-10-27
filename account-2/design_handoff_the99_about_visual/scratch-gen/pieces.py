"""About as six visual pages R1: the page's pieces, drawn in Low Sun (amonkhet) tokens over the shipped About page
(src/app/about/page.tsx, components/about/tools/about-tabs.tsx, tool-card.tsx), the ? panel's chips (help-panel.tsx)
and Home's banner (components/home/arrivals-banner.tsx)."""
import json
import kit
from kit import img, ico
import os
from data import AREAS, SECTIONS, RULES, TOOLS, TOOL_DESK

HALOS = json.load(open("halos.json"))
PH_RATIO = 844 / 390
DK_RATIO = 900 / 1300

CSS = r"""
/* ---- the About page ---- */
.ap{display:flex;flex-direction:column;background:var(--bg)}
.ap-head{padding:18px 16px 0;display:flex;flex-direction:column;gap:6px}
.dk .ap-head{padding:30px 0 0}
.ap-head .kk{font:500 10px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.ap-head h1{margin:0;font:600 27px 'Cinzel',serif;color:var(--fg)}
.dk .ap-head h1{font-size:34px;letter-spacing:.01em}
.ap-head p{font-size:14.5px;line-height:1.5;color:var(--fg-body)}
.ap-head .tour{font:600 14.5px 'IBM Plex Sans';color:var(--accent-text);white-space:nowrap}
.back{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px 0 9px;border-radius:999px;border:1px solid var(--border-strong);background:var(--surface);font:500 13px 'IBM Plex Sans';color:var(--fg-body);align-self:flex-start}
.strip{position:relative;display:flex;gap:24px;padding:0 16px;border-bottom:1px solid var(--border);margin-top:14px;overflow:hidden;white-space:nowrap}
.dk .strip{padding:0;margin-top:22px;gap:28px}
.strip span{padding:10px 2px 12px;font-size:16px;color:var(--fg-muted);border-bottom:2px solid transparent;margin-bottom:-1px;flex:none}
.strip span.on{color:var(--fg);border-color:var(--accent)}
.strip .fade{position:absolute;right:0;top:0;bottom:1px;width:44px;background:linear-gradient(90deg,rgba(20,17,14,0),var(--bg));padding:0;border:0}
.onp{display:flex;flex-wrap:wrap;gap:8px;padding:14px 16px 4px;align-items:center}
.dk .onp{padding:16px 0 4px}
.onp .t{font:500 10.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-muted);margin-right:4px;width:100%}
.dk .onp .t{width:auto}
.chip{height:34px;display:inline-flex;align-items:center;border-radius:999px;border:1px solid var(--border-strong);background:var(--surface);padding:0 12px;font-size:13px;color:var(--fg-body);white-space:nowrap}
.chip.on{border-color:var(--accent);color:var(--fg)}
.sec{display:flex;flex-direction:column;gap:16px;padding:26px 16px 30px;border-top:1px solid var(--border);margin-top:18px}
.sec+.sec{margin-top:0}
.dk .sec{padding:34px 0 40px;gap:20px}
.sec .sh2{display:flex;flex-direction:column;gap:3px}
.sec .sh2 .k{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.sec h2{margin:0;font:600 21px 'Cinzel',serif;color:var(--fg)}
.dk .sec h2{font-size:24px}
.sec .sh2 p{font-size:13.5px;color:var(--fg-muted)}
.sbody{display:flex;flex-direction:column;gap:16px}
.dk .sbody{flex-direction:row;gap:36px;align-items:flex-start}
.dk .sbody .lc{flex:1;min-width:0;display:flex;flex-direction:column;gap:16px}

/* the screenshot frame */
.shot{position:relative;flex:none;overflow:hidden;background:var(--surface-sunken);border:1px solid var(--border-strong)}
.shot.ph{border-radius:20px;align-self:center}
.shot.dkf{border-radius:12px}
.shot>img{position:absolute;left:0;top:0;width:100%;display:block}
.pin{position:absolute;z-index:3;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;background:var(--accent);color:#14110E;font:600 12px/24px 'IBM Plex Mono';text-align:center;box-shadow:0 0 0 2px var(--bg),0 3px 10px rgba(0,0,0,.55)}
.pin.hl{box-shadow:0 0 0 2px var(--bg),0 0 0 6px rgba(207,135,69,.38),0 3px 10px rgba(0,0,0,.55)}
.reg{position:absolute;z-index:2;border-radius:8px;box-shadow:0 0 0 2px rgba(207,135,69,.75),0 0 0 6px rgba(207,135,69,.2),0 0 0 2000px rgba(20,17,14,.34)}
.skel{position:absolute;inset:0;background:linear-gradient(110deg,#18140F 30%,#211D18 45%,#18140F 60%);}
.skel i{position:absolute;left:8%;right:8%;height:10px;border-radius:5px;background:#231E18}

/* the label list */
.lbl{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px}
.lbl li{display:flex;gap:12px;align-items:flex-start;padding:9px 10px;margin:0 -10px;border-radius:10px;border:1px solid transparent}
.lbl li .n{flex:none;width:22px;height:22px;border-radius:50%;background:var(--accent);color:#14110E;font:600 11px/22px 'IBM Plex Mono';text-align:center;margin-top:1px}
.lbl li p{font-size:14px;line-height:1.5;color:var(--fg-body);text-wrap:pretty}
.lbl li p b{color:var(--fg);font-weight:600}
.lbl li.hl{background:var(--surface);border-color:rgba(207,135,69,.55)}
.newtag{display:inline-block;margin-left:6px;vertical-align:1px;font:600 9.5px/16px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:#14110E;background:var(--accent);border-radius:4px;padding:0 5px}
.showme{display:inline-block;margin-top:4px;font:500 12px 'IBM Plex Mono';color:var(--accent-text)}

/* good to know */
.gk-h{display:flex;align-items:center;gap:9px;font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-muted)}
.mark{box-sizing:border-box;display:flex;flex:none;width:22px;height:22px;align-items:center;justify-content:center;border-radius:6px;background:rgba(207,135,69,.16);border:1px solid rgba(207,135,69,.45)}
.mark i{width:7px;height:7px;background:var(--accent);transform:rotate(45deg);display:block}
.gk-row{display:flex;gap:12px;overflow:hidden;margin-right:-16px}
.gk-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.gk{flex:none;width:292px;display:flex;flex-direction:column;border-radius:14px;border:1px solid var(--border);background:var(--surface);overflow:hidden}
.gk-grid .gk{width:auto}
.gk .dg{height:150px;flex:none;border-bottom:1px solid var(--border);background:var(--bg);position:relative;display:flex;align-items:center;justify-content:center;padding:12px;overflow:hidden}
.gk>p{padding:13px 14px 15px;font-size:13.5px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
.dots{display:flex;gap:6px;justify-content:center;padding-top:2px}
.dots i{width:6px;height:6px;border-radius:50%;background:var(--border-strong)}
.dots i.on{background:var(--fg-muted)}

/* diagram atoms (shipped shapes: deck tile wash, one-line card row, buy tag, status pill) */
.dt{width:84px;border-radius:9px;overflow:hidden;border:1px solid var(--border-strong);background:var(--surface-raised);display:flex;flex-direction:column}
.dt .a{height:46px;background-size:cover;background-position:center}
.dt .nm{font:600 11px 'IBM Plex Sans';color:var(--fg);padding:5px 7px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dt .st{margin:0 7px 7px;align-self:flex-start;font:500 9px/15px 'IBM Plex Mono';border-radius:4px;padding:0 5px}
.st.ok{background:rgba(111,163,104,.16);color:#8EC487}
.st.dr{background:rgba(148,139,120,.18);color:var(--fg-muted)}
.st.tb{background:rgba(207,135,69,.16);color:var(--accent-text)}
.cr{display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;border-radius:7px;background:var(--surface-raised);border:1px solid var(--border);font-size:12.5px;color:var(--fg);white-space:nowrap}
.cr .od{width:8px;height:8px;border-radius:50%;background:#6FA368;flex:none}
.cr .od.no{background:transparent;border:1.5px dashed var(--fg-faint)}
.cr .tg{margin-left:auto;font:500 10px 'IBM Plex Mono';color:var(--fg-muted)}
.cr .tg.sh{color:#E07A65}
.cr .tg.ac{color:var(--accent-text)}
.bt{display:inline-flex;align-items:center;gap:6px;height:20px;border:1px solid rgba(207,135,69,.6);border-radius:5px;padding:0 6px;font:500 10px 'IBM Plex Mono';color:var(--accent-text)}
.bt b{color:var(--fg);font-weight:500}
.mono{font:500 10px 'IBM Plex Mono';color:var(--fg-faint);letter-spacing:.04em}
.arrow{color:var(--fg-faint);font:400 16px 'IBM Plex Sans'}
.medal{width:46px;height:46px;transform:rotate(45deg);border:1.5px solid var(--accent);border-radius:6px;display:flex;align-items:center;justify-content:center;background:rgba(207,135,69,.08)}
.medal span{transform:rotate(-45deg);font:700 16px 'Cinzel',serif;color:var(--accent)}
.medal.dim{border-color:var(--border-strong);background:transparent}
.medal.dim span{color:var(--fg-muted)}
.cell{width:78px;border:1px solid var(--border);border-radius:9px;background:var(--surface-raised);padding:7px 8px;display:flex;flex-direction:column;gap:3px}
.cell .k{font:500 8.5px 'IBM Plex Mono';letter-spacing:.12em;color:var(--fg-faint)}
.cell .v{font:500 15px 'IBM Plex Mono';color:var(--accent)}
.cell .v small{font-size:10px;color:var(--fg-faint)}
.bar{height:4px;border-radius:2px;background:var(--border)}
.bar i{display:block;height:100%;border-radius:2px;background:var(--accent)}
.pchip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:999px;border:1px solid var(--border-strong);font-size:11.5px;color:var(--fg-body);white-space:nowrap}
.pchip.no{border-style:dashed;color:var(--fg-faint);text-decoration:line-through;text-decoration-color:rgba(165,156,137,.6)}

/* the shipped tool card (tool-card.tsx), its footer's left link now Show me */
.tc{display:flex;flex-direction:column;border-radius:14px;border:1px solid var(--border);background:var(--surface);overflow:hidden}
.tc .pic{position:relative;aspect-ratio:3/2;overflow:hidden;border-bottom:1px solid var(--border);background:var(--bg)}
.tc .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.tc .pic .halo{position:absolute;border-radius:9px;box-shadow:0 0 0 2px rgba(207,135,69,.75),0 0 0 6px rgba(207,135,69,.2),0 0 0 2000px rgba(20,17,14,.28)}
.tc .bd{display:flex;flex-direction:column;gap:8px;padding:14px 14px 12px}
.tc .hd{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.tc h3{margin:0;font:600 16px/1.3 'IBM Plex Sans';color:var(--fg)}
.tc .cp{flex:none;white-space:nowrap;border-radius:999px;border:1px solid var(--border-strong);padding:2px 9px;font:400 11px 'IBM Plex Mono';color:var(--fg-muted)}
.tc .ln{font-size:14px;line-height:1.5;color:var(--fg-body)}
.tc .ft{display:flex;align-items:center;gap:10px;min-height:40px;border-top:1px solid var(--border);padding-top:8px;margin-top:2px}
.tc .ft .sm{font:400 12px 'IBM Plex Mono';color:var(--fg-muted);padding:10px 0;white-space:nowrap}
.tc .ft .go{margin-left:auto;font-size:13.5px;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tc .ft .ar{flex:none;width:30px;height:30px;border-radius:50%;border:1px solid var(--accent);color:var(--accent-text);display:flex;align-items:center;justify-content:center;font-size:15px}
.tc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
.tc.on{border-color:var(--accent);box-shadow:0 0 0 2px rgba(207,135,69,.45)}
.pend{display:flex;align-items:center;justify-content:center}
.pend .pt{position:relative;z-index:2;font:500 12px 'IBM Plex Mono';letter-spacing:.06em;color:var(--fg-muted);background:rgba(20,17,14,.85);border:1px dashed var(--border-strong);border-radius:8px;padding:10px 14px}
.dk .blk{display:flex;flex-direction:column;gap:14px}
.try-h{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-muted)}

/* canvas-only annotations */
.gap{outline:1.5px dashed rgba(143,166,190,.85);outline-offset:3px;border-radius:8px;position:relative}
.gapnote{display:inline-flex;align-items:center;gap:6px;font:600 9.5px 'IBM Plex Mono';letter-spacing:.04em;color:#0D0B09;background:#8FA6BE;border-radius:4px;padding:2px 6px;margin-left:6px;vertical-align:1px;white-space:nowrap}

/* index tiles */
.ix{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:16px}
.dk .ix{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:22px 0 0}
.it{border-radius:14px;border:1px solid var(--border);background:var(--surface);overflow:hidden;display:flex;flex-direction:column}
.it .pv{position:relative;aspect-ratio:4/3;overflow:hidden;border-bottom:1px solid var(--border);background:var(--bg)}
.it .pv img{position:absolute;left:0;top:0;width:100%;display:block}
.it .tx{padding:11px 12px 12px;display:flex;flex-direction:column;gap:4px}
.it h3{margin:0;font:600 15.5px 'IBM Plex Sans';color:var(--fg)}
.it .mt{font:400 11px 'IBM Plex Mono';color:var(--fg-faint)}
.dk .it .tx p{font-size:13.5px;line-height:1.5;color:var(--fg-body)}

/* the release banner (arrivals-banner.tsx), its Mark swapped for a crop */
.bn{box-sizing:border-box;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-rail);display:flex;align-items:flex-start;gap:12px;padding:10px 4px 10px 10px}
.bn .crop{position:relative;flex:none;width:64px;height:48px;border-radius:7px;overflow:hidden;border:1px solid var(--border-strong);background:var(--bg)}
.bn .crop img{position:absolute;display:block}
.bn .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding-top:1px}
.bn .tx p{font-size:14px;line-height:1.45;color:var(--fg-body)}
.bn .tx p b{color:var(--fg);font-weight:400}
.bn .tx a{font-size:14px;color:var(--fg);text-decoration:underline;text-decoration-color:rgba(207,135,69,.55);text-underline-offset:3px;align-self:flex-start}
.bn .x{flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:14px;margin-top:-6px}
.dk .bn{align-items:center;padding:7px 8px 7px 8px}
.dk .bn .tx{flex-direction:row;align-items:baseline;gap:14px;flex-wrap:wrap}
.dk .bn .tx p,.dk .bn .tx a{font-size:13.5px}
.dk .bn .crop{width:56px;height:38px}
.dk .bn .x{width:32px;height:32px;margin:0}
.bn2{box-sizing:border-box;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-rail);padding:2px 4px 6px 14px;display:flex;flex-direction:column}
.bn2 .hh{display:flex;align-items:center;gap:10px}
.bn2 h2{margin:0;flex:1;font:600 14.5px/1.4 'IBM Plex Sans';color:var(--fg)}
.bn2 ul{margin:0 10px 0 0;padding:0;list-style:none}
.bn2 li{display:flex;align-items:center;gap:10px;border-top:1px solid var(--border);padding:8px 0;font-size:14px;line-height:1.45;color:var(--fg-body)}
.bn2 li .crop{position:relative;flex:none;width:44px;height:32px;border-radius:5px;overflow:hidden;border:1px solid var(--border-strong);background:var(--bg)}
.bn2 li .crop img{position:absolute;display:block}
.bn2 li b{color:var(--fg);font-weight:400}
.bn2 li a{color:var(--fg);text-decoration:underline;text-decoration-color:rgba(207,135,69,.55);text-underline-offset:3px;white-space:nowrap}
"""


def mark():
    return '<span class="mark"><i></i></span>'


# ---------------------------------------------------------------------------------------------------------------
# the screenshot frame
def place_pins(boxes, w, h):
    """Pin centre = the region's top-left corner, nudged 14px inside the frame; a pin within 28px of an earlier one
    moves right along its region's top edge."""
    out = []
    for n, (x, y, bw, bh) in boxes:
        px, py = x * w + 4, y * h + 4
        px = min(max(px, 14), w - 14); py = min(max(py, 14), h - 14)
        for (_, qx, qy) in out:
            if abs(qx - px) < 28 and abs(qy - py) < 28:
                px = min(qx + 30, w - 14)
        out.append((n, px, py))
    return out


def shot(key, w, kind="ph", pins=(), hl=None, loading=False, offset=0.0, hfrac=None):
    """A capture at width w. pins: [(number, box)]. hl: the number whose region is lit (landing / a pressed label).
    offset/hfrac: a window of the capture (fractions of its height), for a long capture shown short."""
    ratio = PH_RATIO if kind == "ph" else DK_RATIO
    full_h = w * ratio
    h = full_h * (hfrac or 1.0)
    top = -offset * full_h
    cls = "ph" if kind == "ph" else "dkf"
    if loading:
        bars = "".join(f'<i style="top:{t}%;width:{wd}%"></i>' for t, wd in [(12, 52), (19, 80), (34, 84), (52, 70), (60, 84), (76, 60)])
        return f'<div class="shot {cls}" style="width:{w}px;height:{h:.0f}px"><div class="skel">{bars}</div></div>'
    inner = [f'<img src="{img(key + ".webp")}" alt="" style="top:{top:.1f}px;height:{full_h:.1f}px">']
    shifted = [(n, (b[0], (b[1] - offset) / (hfrac or 1.0), b[2], b[3] / (hfrac or 1.0))) for n, b in pins]
    for n, (x, y, bw, bh) in shifted:
        if hl == n:
            inner.append(f'<span class="reg" style="left:{x*w:.1f}px;top:{y*h:.1f}px;width:{bw*w:.1f}px;height:{bh*h:.1f}px"></span>')
    for n, px, py in place_pins(shifted, w, h):
        inner.append(f'<span class="pin{" hl" if hl == n else ""}" style="left:{px:.1f}px;top:{py:.1f}px">{n}</span>')
    return f'<div class="shot {cls}" style="width:{w}px;height:{h:.0f}px">{"".join(inner)}</div>'


def crop(key, box, cw, ch, kind="ph"):
    """A crop of a capture centred on a label's region (the banner's picture)."""
    ratio = PH_RATIO if kind == "ph" else DK_RATIO
    x, y, bw, bh = box
    # scale so the region plus a margin fills the crop
    s = min(cw / (bw * 1.25), ch / (bh * ratio * 1.25))
    W = s; H = s * ratio
    cx = (x + bw / 2) * W; cy = (y + bh / 2) * H
    left = min(max(cw / 2 - cx, cw - W), 0); top = min(max(ch / 2 - cy, ch - H), 0)
    return f'<img src="{img(key + ".webp")}" alt="" style="left:{left:.1f}px;top:{top:.1f}px;width:{W:.1f}px;height:{H:.1f}px">'


# ---------------------------------------------------------------------------------------------------------------
# labels, rules, tools
def label_list(labels, kind, hl=None, hidden=(), tool_after=None, gaps=True):
    """Numbers run in the order labels are listed, skipping hidden ones (a label whose feature is off is gone, and
    the next one takes its number)."""
    items = []; n = 0
    for lab in labels:
        lid, lead, rest, pbox, dbox, sw = lab
        if lid in hidden:
            continue
        n += 1
        box = pbox if kind == "ph" else dbox
        flag = "" if box or not gaps else '<span class="gapnote">not in today’s capture</span>'
        new = '<span class="newtag">New</span>' if hl == lid else ""
        sm = '<br><span class="showme">Show me ›</span>' if hl == lid else ""
        items.append(f'<li class="{"hl" if hl == lid else ""}"><span class="n">{n}</span><p><b>{lead}</b>{rest}{new}{flag}{sm}</p></li>')
        if tool_after and hl == lid:
            items.append(f'<li style="display:block;padding:4px 0 8px;margin:0">{tool_after}</li>')
    return f'<ol class="lbl">{"".join(items)}</ol>'


def pins_for(labels, kind, hidden=()):
    out = []; n = 0
    for lab in labels:
        lid, lead, rest, pbox, dbox, sw = lab
        if lid in hidden:
            continue
        n += 1
        box = pbox if kind == "ph" else dbox
        if box:
            out.append((n, box))
    return out


def number_of(labels, lid, hidden=()):
    n = 0
    for lab in labels:
        if lab[0] in hidden:
            continue
        n += 1
        if lab[0] == lid:
            return n
    return None


def have(key):
    return f"{key}.webp" in kit.BLOB if kit.MODE["blob"] else os.path.exists(f"art/{key}.webp")


def desk_pic(key, box):
    """A 3:2 desktop crop around box, positioned in % so it fills a fluid card; the region haloed."""
    cw, ch = 380.0, 253.3
    ratio = DK_RATIO
    x, y, bw, bh = box
    s = max(min(cw / (bw * 2.2), ch / (bh * ratio * 2.2), cw * 2.6), cw * 1.7)
    W, H = s, s * ratio
    cx = (x + bw / 2) * W; cy = (y + bh / 2) * H
    left = min(max(cw / 2 - cx, cw - W), 0); top = min(max(ch / 2 - cy, ch - H), 0)
    pad = 6
    hx, hy = left + x * W - pad, top + y * H - pad
    hw, hh = bw * W + 2 * pad, bh * H + 2 * pad
    pc = lambda v, d: f"{v / d * 100:.2f}%"
    return (f'<img src="{img(key + ".webp")}" alt="" style="left:{pc(left, cw)};top:{pc(top, ch)};width:{pc(W, cw)};height:{pc(H, ch)};object-fit:fill">'
            f'<span class="halo" style="left:{pc(hx, cw)};top:{pc(hy, ch)};width:{pc(hw, cw)};height:{pc(hh, ch)}"></span>')


def tool_card(tid, w=None, kind="ph", on=False):
    name, line, credit, footer = TOOLS[tid]
    if kind == "dk":
        key, box = TOOL_DESK[tid]
        if have(key) and box:
            pic = desk_pic(key, box)
        else:
            pic = '<div class="skel"></div>'
    else:
        hx, hy, hw, hh = HALOS["tool-" + tid]
        pic = (f'<img src="{img("p-tool-" + tid + ".webp")}" alt="">'
               f'<span class="halo" style="left:{hx*100:.1f}%;top:{hy*100:.1f}%;width:{hw*100:.1f}%;height:{hh*100:.1f}%"></span>')
    cp = f'<span class="cp">{credit}</span>' if credit else ""
    style = f' style="width:{w}px"' if w else ""
    return (f'<article class="tc{" on" if on else ""}"{style}><div class="pic">{pic}</div>'
            f'<div class="bd"><div class="hd"><h3>{name}</h3>{cp}</div><p class="ln">{line}</p>'
            f'<div class="ft"><span class="sm">Show me ›</span><span class="go">{footer}</span><span class="ar">→</span></div></div></article>')


def gk_card(rid):
    text, sw = RULES[rid]
    return f'<div class="gk"><div class="dg">{DIAGRAMS[rid]()}</div><p>{text}</p></div>'


def gk_block(rules, kind):
    if not rules:
        return ""
    head = f'<div class="gk-h">{mark()}Good to know</div>'
    if kind == "ph":
        cards = "".join(gk_card(r) for r in rules)
        dots = "" if len(rules) < 2 else '<div class="dots">' + "".join(f'<i class="{"on" if i == 0 else ""}"></i>' for i in range(len(rules))) + "</div>"
        return f'{head}<div class="gk-row">{cards}</div>{dots}'
    return f'<div class="blk">{head}<div class="gk-grid">' + "".join(gk_card(r) for r in rules) + "</div></div>"


def tools_block(tools, kind, skip=(), on=None):
    tools = [t for t in tools if t not in skip]
    if not tools:
        return ""
    if kind == "ph":
        return '<div class="try-h">Try it</div>' + "".join(tool_card(t) for t in tools[:1]) + (
            f'<div class="mono" style="text-align:center">{len(tools) - 1} more below</div>' if len(tools) > 1 else "")
    return ('<div class="blk"><div class="try-h">Try it</div><div class="tc-grid">'
            + "".join(tool_card(t, kind="dk", on=(t == on)) for t in tools) + "</div></div>")


# ---------------------------------------------------------------------------------------------------------------
# the diagrams: each built from the app's own shapes
def deck_tile(name, art, status, cls):
    return (f'<div class="dt"><div class="a" style="background-image:url({img(art)})"></div><div class="nm">{name}</div>'
            f'<span class="st {cls}">{status}</span></div>')


def d_one_copy():
    return ('<div style="display:flex;align-items:center;gap:12px">'
            '<div style="display:flex;flex-direction:column;gap:6px;align-items:center"><div class="cr" style="width:96px"><span class="od"></span>Sol Ring</div>'
            '<span class="mono">you own ×1</span></div><span class="arrow">→</span>'
            '<div style="display:flex;flex-direction:column;gap:5px">'
            '<div class="cr" style="width:150px">Ghalta<span class="tg">committed 1st ✓</span></div>'
            '<div class="cr" style="width:150px">Sai<span class="tg sh">short 1</span></div>'
            '<div class="cr" style="width:150px">Zimone<span class="tg">in a draft</span></div></div></div>')


def d_never_decklist():
    return ('<div style="display:flex;flex-direction:column;gap:8px;width:250px">'
            '<span class="mono">COLLECTION</span><div class="cr" style="opacity:.55;text-decoration:line-through">Arcane Signet ×1<span class="tg">removed</span></div>'
            '<span class="mono">GHALTA’S LIST</span><div class="cr"><span class="od no"></span>Arcane Signet<span class="tg sh">short</span>'
            '<span class="bt" style="margin-left:6px">buy <b>$0.89</b></span></div></div>')


def d_replace():
    def col(t, rows, extra=""):
        r = "".join(f'<div class="cr" style="height:22px;font-size:11px;{extra if i >= 3 else ""}">{x}</div>' for i, x in enumerate(rows))
        return f'<div style="display:flex;flex-direction:column;gap:4px;width:78px"><span class="mono">{t}</span>{r}</div>'
    return ('<div style="display:flex;gap:10px;align-items:flex-start">'
            + col("NOW", ["Sol Ring", "Swords", "Cultivate", "Thrasios"], "")
            + col("FILE", ["Sol Ring", "Swords", "Cultivate"])
            + '<div style="display:flex;flex-direction:column;gap:4px;width:84px"><span class="mono">REPLACE</span>'
            + "".join(f'<div class="cr" style="height:22px;font-size:11px">{x}</div>' for x in ["Sol Ring", "Swords", "Cultivate"])
            + '<div class="cr" style="height:22px;font-size:11px;opacity:.5;text-decoration:line-through">Thrasios</div></div></div>')


def d_autofill():
    seg = [("Your Collection", 86, "var(--success)"), ("Staples", 10, "var(--fact)"), ("To buy", 3, "var(--accent)")]
    bar = "".join(f'<i style="display:block;flex:{n};background:{c};height:100%"></i>' for _, n, c in seg)
    leg = "".join(f'<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--fg-body)"><i style="width:9px;height:9px;border-radius:2px;background:{c};display:block"></i>{t}<span class="mono" style="margin-left:auto">{n}</span></span>' for t, n, c in seg)
    return (f'<div style="width:250px;display:flex;flex-direction:column;gap:10px"><span class="mono">GHALTA · 99 CARDS</span>'
            f'<div style="display:flex;height:12px;border-radius:4px;overflow:hidden;gap:2px">{bar}</div>'
            f'<div style="display:flex;flex-direction:column;gap:5px">{leg}</div></div>')


def d_lock():
    lockic = ('<svg width="10" height="13" viewBox="0 0 11 14" aria-hidden="true"><path d="M2.5 6V4a3 3 0 0 1 6 0v2" fill="none" '
              'stroke="currentColor" stroke-width="1.4"/><rect x=".5" y="6" width="10" height="7.5" rx="1.5" fill="currentColor"/></svg>')
    chips = "".join(f'<span class="pchip no">{t}</span>' for t in ["Suggested changes", "Proposed cuts", "Clear all auto", "Pull it"])
    return (f'<div style="width:256px;display:flex;flex-direction:column;gap:10px"><div class="cr"><span class="od"></span>Craterhoof Behemoth'
            f'<span class="tg ac" style="display:flex;align-items:center;gap:4px">{lockic} locked</span></div>'
            f'<span class="mono">EVERY TOOL SKIPS IT</span><div style="display:flex;flex-wrap:wrap;gap:6px">{chips}</div></div>')


def d_targets():
    def cell(k, v, t, f, c="var(--accent)", note=""):
        return (f'<div class="cell"><span class="k">{k}</span><span class="v" style="color:{c}">{v} <small>/ {t}</small></span>'
                f'<div class="bar"><i style="width:{f}%;background:{c}"></i></div><span class="mono" style="font-size:9px">{note}</span></div>')
    return ('<div style="display:flex;flex-direction:column;gap:8px;align-items:center"><span class="mono">KINNAN · TARGETS FROM KINNAN DECKS</span>'
            '<div style="display:flex;gap:8px">' + cell("RAMP", 18, 16, 100, "var(--success)", "over is fine")
            + cell("DRAW", 9, 10, 90) + cell("WIPES", 1, 3, 33, "var(--accent)", "consider →") + "</div></div>")


def d_intent():
    return ('<div style="display:flex;flex-direction:column;gap:12px;align-items:center"><div style="display:flex;gap:30px;align-items:center">'
            '<div style="display:flex;flex-direction:column;align-items:center;gap:12px"><div class="medal"><span>1</span></div><span class="mono">EXHIBITION</span></div>'
            '<span class="mono" style="color:var(--fg-muted)">or</span>'
            '<div style="display:flex;flex-direction:column;align-items:center;gap:12px"><div class="medal"><span>2</span></div><span class="mono">CORE</span></div></div>'
            '<span class="mono">SQUIRRELS · NO GAME CHANGERS · YOU PICK</span></div>')


def d_credits():
    return ('<div style="display:flex;flex-direction:column;gap:7px;width:250px">'
            '<div class="cr">Read the bracket<span class="tg" style="color:#8EC487">free</span></div>'
            '<div class="cr">Suggested changes run<span class="tg ac">1 credit</span></div>'
            '<div class="cr">Look deeper<span class="tg ac">1 credit</span></div>'
            '<div class="cr" style="opacity:.75">Came back empty-handed<span class="tg" style="color:#8EC487">credit back</span></div></div>')


def d_commit():
    return ('<div style="display:flex;align-items:center;gap:6px">'
            '<div style="display:flex;flex-direction:column;gap:5px;width:108px"><span class="mono">GHALTA · PENDING</span>'
            '<div class="cr" style="border-left:2px solid var(--accent)"><span class="od"></span>Sol Ring<span class="tg ac">+</span></div>'
            '<div class="cr" style="border-left:2px solid var(--accent)">Mind Stone<span class="tg">cut</span></div></div>'
            '<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><span class="arrow">→</span><span class="mono">commit</span></div>'
            '<div style="display:flex;flex-direction:column;gap:5px;width:106px"><span class="mono">SAI SEES IT</span>'
            '<div class="cr">Sol Ring<span class="tg sh">short</span></div><span class="mono" style="color:var(--fg-muted)">v2 · today</span></div></div>')


def d_own_it():
    return ('<div style="display:flex;align-items:center;gap:10px">'
            + deck_tile("Ghalta", "crop-ghalta.jpg", "has Sol Ring", "ok")
            + '<span class="arrow">≠</span>'
            + '<div style="display:flex;flex-direction:column;gap:5px;width:150px"><span class="mono">SAI · SHOPPING</span>'
              '<div class="cr"><span class="od no"></span>Sol Ring<span class="bt" style="margin-left:auto">buy <b>$1.49</b></span></div>'
              '<span class="mono" style="color:var(--fg-muted)">your copy is in Ghalta</span></div></div>')


def d_prices():
    tags = [('buy <b>$54.16</b>', "today’s price"), ('buy <b>$2.10 foil</b>', "only in foil"), ('<b>sold out</b>', "none right now"), ('buy', "no price at all")]
    rows = "".join(f'<div style="display:flex;align-items:center;gap:10px"><span class="bt" style="min-width:96px;justify-content:center">{t}</span><span class="mono">{n}</span></div>' for t, n in tags)
    return f'<div style="display:flex;flex-direction:column;gap:7px">{rows}</div>'


def d_proxy():
    return ('<div style="display:flex;flex-direction:column;gap:7px;width:250px">'
            '<div class="cr"><span class="od no"></span>Gaea’s Cradle<span class="tg ac">P</span><span class="tg" style="margin-left:6px">no copy used</span></div>'
            '<div class="cr"><span class="od"></span>Treasure token<span class="tg" style="color:#8EC487">I have one ✓</span></div>'
            '<span class="mono" style="text-align:center">BOTH LEAVE EVERY SHOPPING LIST</span></div>')


def d_friends_see():
    see = "".join(f'<span class="pchip">{t}</span>' for t in ["Your name", "Signature card", "Wishlist", "Decks you open to them"])
    never = "".join(f'<span class="pchip no">{t}</span>' for t in ["Your collection", "Prices", "Buy list", "Notes"])
    return (f'<div style="width:262px;display:flex;flex-direction:column;gap:7px"><span class="mono">FRIENDS SEE</span>'
            f'<div style="display:flex;flex-wrap:wrap;gap:5px">{see}</div><span class="mono">NEVER</span>'
            f'<div style="display:flex;flex-wrap:wrap;gap:5px">{never}</div></div>')


def d_hidden():
    return ('<div style="display:flex;align-items:center;gap:12px">'
            + deck_tile("Ghalta", "crop-ghalta.jpg", "Complete", "ok")
            + '<div style="width:84px;height:94px;border-radius:9px;border:1.5px dashed var(--border-dashed);display:flex;align-items:center;justify-content:center;text-align:center" class="mono">hidden:<br>no tile</div>'
            + '<div style="display:flex;flex-direction:column;gap:5px"><span class="mono">ITS CARDS</span><div class="cr" style="width:104px">Sol Ring<span class="tg">in use</span></div><span class="mono">not spares</span></div></div>')


def d_invites():
    return ('<div style="display:flex;flex-direction:column;gap:9px;align-items:center;width:250px">'
            '<div class="cr" style="width:100%">colin@example.com<span class="tg" style="color:#8EC487">Invitation sent</span></div>'
            '<div class="cr" style="width:100%">someone-already-here@…<span class="tg" style="color:#8EC487">Invitation sent</span></div>'
            '<span class="mono">3 INVITES LEFT · GIVEN, NEVER BOUGHT</span></div>')


DIAGRAMS = {
    "one-copy": d_one_copy, "never-decklist": d_never_decklist, "replace": d_replace, "autofill": d_autofill,
    "lock": d_lock, "targets": d_targets, "intent": d_intent, "credits": d_credits, "commit": d_commit,
    "own-it": d_own_it, "prices": d_prices, "proxy": d_proxy, "friends-see": d_friends_see, "hidden-deck": d_hidden,
    "invites": d_invites,
}


# ---------------------------------------------------------------------------------------------------------------
# a section, an area page, at either width
def section(area, sec, kind, hl=None, hidden=(), loading=False, tool_hl=None, gaps=True, short=None):
    labels = sec["labels"]
    key = sec["phone"] if kind == "ph" else sec["desk"]
    pins = pins_for(labels, kind, hidden)
    hln = number_of(labels, hl, hidden) if hl else None
    w = 268 if kind == "ph" else 700
    if kind == "dk" and not have(key):
        pic = (f'<div class="shot dkf pend" style="width:{w}px;height:{w * DK_RATIO:.0f}px"><div class="skel"></div>'
               f'<span class="pt">1300 capture of {sec["name"]} on its way</span></div>')
    else:
        pic = shot(key, w, kind, pins, hln, loading=loading, hfrac=short)
    tl = tool_card(tool_hl) if (tool_hl and kind == "ph") else None
    labs = label_list(labels, kind, hl, hidden, tl, gaps and (kind == "ph" or have(key)))
    head = (f'<div class="sh2"><span class="k">{dict((a, n) for a, n, _ in AREAS)[area]} · {sec["name"]}</span>'
            f'<h2>{sec["name"]}</h2><p>{sec["sub"]}</p></div>')
    if kind == "ph":
        tools = tools_block(sec["tools"], kind, skip=(tool_hl,) if tool_hl else ())
        body = f'<div class="sbody">{pic}{labs}{gk_block(sec["rules"], kind)}{tools}</div>'
    else:
        tools = tools_block(sec["tools"], kind, on=tool_hl)
        body = f'<div class="sbody">{pic}<div class="lc">{labs}</div></div>{gk_block(sec["rules"], kind)}{tools}'
    return f'<section class="sec" id="{sec["id"]}">{head}{body}</section>'


def strip(active):
    sp = "".join(f'<span class="{"on" if a == active else ""}">{n}</span>' for a, n, _ in AREAS)
    return f'<div class="strip">{sp}<span class="fade"></span></div>'


def onpage(area, on=None, kind="ph"):
    chips = "".join(f'<span class="chip{" on" if s["id"] == on else ""}">{s["name"]}</span>' for s in SECTIONS[area])
    return f'<div class="onp"><span class="t">On this page</span>{chips}</div>'


def area_head(area, back=None, kind="ph"):
    name, lede = next((n, l) for a, n, l in AREAS if a == area)
    b = f'<span class="back">‹ {back}</span>' if back else ""
    return (f'<div class="ap-head">{b}<span class="kk">About The 99</span><h1>{name}</h1><p>{lede}</p></div>')


def area_page(area, kind, sections=None, on=None, hl=None, back=None, hidden=(), tool_hl=None, from_sec=0, head=True, upto=None):
    secs = SECTIONS[area][from_sec:upto]
    parts = []
    if head:
        parts += [area_head(area, back, kind), strip(area), onpage(area, on, kind)]
    for s in secs:
        parts.append(section(area, s, kind, hl=hl if s["id"] == on else None, hidden=hidden,
                             tool_hl=tool_hl if s["id"] == on else None))
    inner = "".join(parts)
    if kind == "dk":
        return f'<div class="ap" style="padding:0 30px"><div style="max-width:1180px;width:100%">{inner}</div></div>'
    return f'<div class="ap">{inner}</div>'
