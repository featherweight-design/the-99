"""Push notifications R1 (account 2, 2026-10-22): the pieces.

Drawn over the shipped /settings (src/app/settings/page.tsx, components/settings/news-section.tsx, the shared
ui/checkbox.tsx box: 18px, 1.5px --fg-faint, 4px radius, a ✓) in Low Sun tokens, with menu-home's kit for the shell,
spare requests' kit for the sheet, the modal, the toast and /friends, and friend decks' Your decks section.
System UI (the browser's permission prompt, the lock screen, the shade, the desktop banner) is drawn approximately
and labelled so. Every string is shipped copy or a placeholder for /copy-review.
"""
import kit, parts as P, sr as S, fdk as F
from kit import img, ico

kit.CSS += r"""
/* ---------- the shipped Checkbox (ui/checkbox.tsx) ---------- */
.pcb{flex:none;width:18px;height:18px;border-radius:4px;border:1.5px solid var(--fg-faint);display:flex;align-items:center;justify-content:center;font:700 12px/1 'IBM Plex Sans';color:var(--bg)}
.pcb.on{background:var(--accent);border-color:var(--accent)}
.pcb.on::after{content:'✓'}
.pcb.dis{opacity:.5}
/* ---------- What's new on Home, with the push column ---------- */
.nws .sech .pl{width:44px;text-align:center;flex:none}
.nws ul{margin:4px 0 0;padding:0;list-style:none}
.nws li{display:flex;align-items:flex-start}
.nws li+li{border-top:1px solid var(--border)}
.nws li .hl{flex:1;min-width:0;display:flex;align-items:flex-start;gap:12px;min-height:44px;padding:8px 0}
.nws li .hl .pcb{margin-top:1px}
.nws .ct{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.nws .ct b{font:500 14px 'IBM Plex Sans';color:var(--fg)}
.nws .ct span{font-size:12.5px;line-height:1.45;color:var(--fg-muted)}
.nws .pc{flex:none;width:44px;min-height:44px;display:flex;justify-content:center;padding-top:9px;margin-left:8px;position:relative}
.nws .pc.lit::before{content:'';position:absolute;inset:2px 2px auto 2px;height:40px;border-radius:10px;box-shadow:0 0 0 1.5px rgba(240,230,210,.7)}
.nws li.pm .hl{gap:12px}
.nws li.pm .bell{flex:none;width:18px;height:18px;margin-top:1px;color:var(--fg-muted);display:flex;align-items:center;justify-content:center}
.nws li.pm .ct span .lnk{font-size:12.5px}
.nws li.pm .ct span.warn{color:var(--fg-body)}
.nws .foot{margin-top:10px;font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.nws .foot b{font-weight:500;color:var(--fg-muted)}
.pnew{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:2px;border-radius:6px}
/* ---------- system UI (approximate) ---------- */
.sys{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif}
.slab{position:absolute;z-index:60;font:600 9px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:#0D0B09;background:#B9B2A4;border-radius:3px;padding:1px 5px;white-space:nowrap}
.pbrw{display:flex;flex-direction:column;border-radius:12px;overflow:hidden;border:1px solid var(--border-strong);width:1300px;flex:none;position:relative}
.pbrw .bar{height:40px;background:#202124;display:flex;align-items:center;gap:10px;padding:0 14px;flex:none}
.pbrw .bar i{width:10px;height:10px;border-radius:50%;background:#4a4c50;display:block}
.pbrw .bar .url{margin-left:18px;flex:0 1 560px;height:26px;border-radius:13px;background:#35363a;display:flex;align-items:center;gap:8px;padding:0 12px;font:13px -apple-system,Roboto,sans-serif;color:#e8eaed}
.pbrw .bar .url svg{color:#bdc1c6}
.pbrw .dk{border:0;border-radius:0}
.cprm{position:absolute;z-index:50;width:330px;background:#2d2e31;border-radius:10px;box-shadow:0 10px 32px rgba(0,0,0,.6);padding:16px 16px 14px;color:#e8eaed}
.cprm .t{font-size:14px;color:#e8eaed}
.cprm .r{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:13.5px;color:#bdc1c6}
.cprm .bt{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.cprm .bt span{height:32px;padding:0 16px;border-radius:16px;display:flex;align-items:center;font-size:13px;font-weight:500;border:1px solid #5f6368;color:#8ab4f8}
.cprm .bt span.p{background:#8ab4f8;color:#202124;border-color:#8ab4f8}
.aprm{position:absolute;z-index:50;left:24px;right:24px;background:#2b2c2f;border-radius:24px;padding:22px 22px 16px;color:#e3e3e3;box-shadow:0 16px 40px rgba(0,0,0,.6)}
.aprm .ic{width:24px;height:24px;margin:0 auto 12px;color:#a8c7fa;display:flex;justify-content:center}
.aprm .t{font-size:17px;line-height:1.35;text-align:center}
.aprm .bt{display:flex;flex-direction:column;gap:8px;margin-top:18px}
.aprm .bt span{height:40px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;background:#3c3d40;color:#a8c7fa}
.aprm .bt span.p{background:#a8c7fa;color:#062e6f}
.iprm{position:absolute;z-index:50;left:50%;transform:translateX(-50%);width:270px;background:rgba(44,44,46,.96);border-radius:14px;color:#fff;text-align:center;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.5)}
.iprm .tx{padding:18px 16px 16px}
.iprm .t{font-size:16px;font-weight:600;line-height:1.3}
.iprm .s{font-size:13px;line-height:1.35;margin-top:4px;color:rgba(255,255,255,.85)}
.iprm .bt{display:flex;border-top:.5px solid rgba(255,255,255,.2)}
.iprm .bt span{flex:1;height:44px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#0a84ff}
.iprm .bt span+span{border-left:.5px solid rgba(255,255,255,.2);font-weight:600}
.sdim{position:absolute;inset:0;z-index:49;background:rgba(0,0,0,.42)}
/* Safari's bottom bar (iPhone, not installed) */
.sfb{height:84px;flex:none;background:rgba(30,30,32,.98);border-top:.5px solid rgba(255,255,255,.12);display:flex;flex-direction:column;gap:8px;padding:8px 14px 20px;font-family:-apple-system,sans-serif}
.sfb .url{height:36px;border-radius:12px;background:#3a3a3c;display:flex;align-items:center;justify-content:center;font-size:15px;color:#fff}
.sfb .tb{display:flex;justify-content:space-between;padding:0 10px;color:#0a84ff}
.sfb .tb span.lit{position:relative}
.sfb .tb span.lit::after{content:'';position:absolute;inset:-7px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(240,230,210,.8)}
/* the guidance sheet (ui/sheet.tsx box, spare requests' .sht) */
.gst{position:absolute;z-index:31;left:0;right:0;bottom:0;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:14px 14px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.6);display:flex;flex-direction:column}
.gst .gr{width:40px;height:4px;border-radius:2px;background:var(--border-strong);margin:8px auto 0}
.gst .mb p.ln{font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.gsteps{margin:4px 0 0;padding:0;list-style:none;display:flex;flex-direction:column}
.gsteps li{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--border)}
.gsteps li:first-child{border-top:0}
.gsteps li i{flex:none;width:22px;height:22px;border-radius:50%;border:1px solid var(--border-strong);font:500 11px/20px 'IBM Plex Mono';font-style:normal;text-align:center;color:var(--fg-muted)}
.gsteps li span{font-size:14px;line-height:1.5;color:var(--fg)}
.gsteps li span small{display:block;font-size:12.5px;color:var(--fg-muted)}
.gsteps .gl{display:inline-flex;vertical-align:-3px;color:#0a84ff}
/* ---------- lock screen, shade, banner ---------- */
.lks{width:390px;height:844px;flex:none;border-radius:34px;overflow:hidden;position:relative;border:1px solid var(--border-strong);
 background:radial-gradient(120% 70% at 30% 10%,#5a3b22 0%,#2a1c14 45%,#120d0a 100%);font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff}
.lks .clk{text-align:center;padding-top:70px}
.lks .clk small{display:block;font-size:17px;font-weight:500;opacity:.85}
.lks .clk b{display:block;font-size:84px;font-weight:600;line-height:1;letter-spacing:-1px;margin-top:4px}
.lks .stk{position:absolute;left:10px;right:10px;bottom:120px;display:flex;flex-direction:column;gap:8px}
.ntf{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:20px;background:rgba(60,48,40,.62);backdrop-filter:blur(20px);position:relative}
.ntf img.ai{width:38px;height:38px;border-radius:9px;flex:none;display:block}
.ntf .tx{flex:1;min-width:0}
.ntf .tp{display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:600}
.ntf .tp small{font-weight:400;font-size:13px;opacity:.7;white-space:nowrap}
.ntf .bd{font-size:14px;line-height:1.3;opacity:.92;margin-top:1px}
.ntf.back{transform:scale(.95);margin-top:-52px;opacity:.6;z-index:-1;height:52px}
.lks .hint{position:absolute;bottom:34px;left:0;right:0;text-align:center;font-size:12px;opacity:.6}
.shade{width:390px;flex:none;border-radius:34px;overflow:hidden;border:1px solid var(--border-strong);background:#1b1b1f;font-family:Roboto,'Segoe UI',sans-serif;color:#e3e3e3;padding:14px 10px 24px;display:flex;flex-direction:column;gap:6px}
.shade .sb{display:flex;justify-content:space-between;padding:22px 14px 10px;font-size:13px;color:#c4c6d0}
.and{background:#2b2d31;border-radius:22px;padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px}
.and .ah{display:flex;align-items:center;gap:6px;font-size:12px;color:#c4c6d0}
.and .ah img{width:18px;height:18px;border-radius:50%;display:block}
.and .ab{display:flex;gap:12px;align-items:flex-start}
.and .ab .tx{flex:1;min-width:0}
.and .ab b{display:block;font-size:15px;font-weight:500;color:#e3e3e3}
.and .ab span{display:block;font-size:14px;line-height:1.35;color:#c4c6d0;margin-top:2px}
.and .ab img.th{width:40px;height:56px;border-radius:3px;object-fit:cover;flex:none;display:block}
.and .big{width:100%;height:150px;border-radius:12px;object-fit:cover;object-position:center 30%;display:block;margin-top:6px}
.mac{width:620px;height:300px;flex:none;border-radius:12px;overflow:hidden;position:relative;border:1px solid var(--border-strong);background:linear-gradient(160deg,#2c3446,#141820);font-family:-apple-system,BlinkMacSystemFont,sans-serif}
.mac .mb2{height:24px;background:rgba(20,20,24,.6);display:flex;align-items:center;justify-content:flex-end;gap:14px;padding:0 14px;font-size:12px;color:#ddd}
.mstk{position:absolute;right:14px;top:36px;width:344px;display:flex;flex-direction:column;gap:8px}
.mban{width:344px;border-radius:16px;background:rgba(58,58,62,.82);backdrop-filter:blur(20px);padding:12px 14px;display:flex;gap:10px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.mban img.ai{width:36px;height:36px;border-radius:8px;flex:none;display:block}
.mban .tx{flex:1;min-width:0}
.mban .tp{display:flex;justify-content:space-between;font-size:13px;font-weight:600}
.mban .tp small{font-weight:400;opacity:.65;font-size:12px}
.mban .sub2{font-size:12px;opacity:.65;margin-top:1px}
.mban .bd{font-size:13px;line-height:1.3;margin-top:2px;opacity:.95}
.mban img.th{width:36px;height:50px;border-radius:3px;object-fit:cover;flex:none}
/* ---------- boards ---------- */
.ptl{position:relative;height:84px;margin:8px 0 4px;border-radius:10px;background:var(--surface-rail);border:1px solid var(--border)}
.ptl .hold{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(135deg,rgba(143,166,190,.10) 0 6px,transparent 6px 12px);border-left:1px dashed rgba(143,166,190,.6);border-right:1px dashed rgba(143,166,190,.6)}
.ptl .hold span{position:absolute;top:6px;left:8px;font:500 10px 'IBM Plex Mono';color:#8FA6BE;white-space:nowrap}
.ptl .h{position:absolute;bottom:4px;font:10px 'IBM Plex Mono';color:var(--fg-faint);transform:translateX(-50%)}
.ptl .ev{position:absolute;top:30px;width:2px;height:22px;background:var(--fg-muted)}
.ptl .ev.s{background:var(--accent);height:26px;top:26px;width:3px}
.ptl .ev em{position:absolute;top:-16px;left:4px;font:normal 10px 'IBM Plex Mono';color:var(--fg-muted);white-space:nowrap}
.opt{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.opt.rec{border-color:var(--accent)}
.opt h4{margin:0;font:600 15px 'IBM Plex Sans';color:var(--fg);display:flex;align-items:center;gap:10px}
.opt h4 .pill{font:600 9.5px 'IBM Plex Mono';letter-spacing:.06em;border-radius:4px;padding:2px 6px;background:var(--accent);color:#14110E}
.opt h4 .pill.alt{background:#3A3229;color:var(--fg-body)}
.opt p,.opt li{font-size:13px;line-height:1.6;color:var(--fg-body)}
.opt ul{margin:0;padding-left:18px}
.opt b{color:var(--fg)}
.flow2{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;max-width:1500px}
.flow2 .st{border:1px solid var(--border-strong);border-radius:12px;padding:12px 14px;background:#15120F;display:flex;flex-direction:column;gap:4px}
.flow2 .st em{font:normal 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--accent-text)}
.flow2 .st b{font-size:14px}
.flow2 .st span{font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
"""

BELL = '<path d="M5.6 8.4a4.4 4.4 0 0 1 8.8 0c0 3.7 1.6 5.2 1.6 5.2H4s1.6-1.5 1.6-5.2z"/><path d="M8.3 16.2a1.8 1.8 0 0 0 3.4 0"/>'
LOCKI = '<rect x="5" y="9" width="10" height="7.5" rx="1.5"/><path d="M7 9V6.8a3 3 0 0 1 6 0V9"/>'
SHARE = '<path d="M10 2.8v10"/><path d="M6.6 6 10 2.6 13.4 6"/><path d="M6.4 9H5a1.2 1.2 0 0 0-1.2 1.2v6A1.2 1.2 0 0 0 5 17.4h10a1.2 1.2 0 0 0 1.2-1.2v-6A1.2 1.2 0 0 0 15 9h-1.4"/>'
PLUSSQ = '<rect x="3.5" y="3.5" width="13" height="13" rx="3"/><path d="M10 7v6M7 10h6"/>'

# Shipped feedCopy.news.kinds, in FEED_KINDS order
KINDS = [("new-set", "New sets", "When a set comes out."),
         ("new-precon", "New precons", "When a Commander precon comes out."),
         ("price-drop", "Price drops on your wishlist", "A card you want gets cheaper."),
         ("trade-match", "Trade matches", "A friend has a spare of a card on your wishlist."),
         ("spare-request", "Friends asking for your spares", "A friend asks for a card you have spare."),
         ("combo", "Combos you can make", "You now own both halves of a two-card combo.")]

HOME_ON = ("price-drop", "trade-match", "spare-request")
PUSH_DEFAULT = ("spare-request",)

# The master row, per state: (where-word, line html, box: None | "off" | "on" | "dis")
def master(state, where="phone"):
    on_w = {"phone": "this phone", "browser": "this browser", "iphone": "this iPhone"}[where]
    title = f"Push on {on_w}"
    if state == "ask":
        line, box = f"Not on yet. Tick here or beside a kind, and your {'iPhone' if where == 'iphone' else 'browser'} asks first.", "off"
    elif state == "on":
        line, box = "On. Sends what you tick under Push. Your other devices have their own switch.", "on"
    elif state == "paused":
        line, box = "Off on this device. Your ticks are kept.", "off"
    elif state == "blocked":
        if where == "iphone":
            line = '<span class="warn">Turned off in iPhone Settings › Notifications › The 99.</span> Allow it there, then come back.'
        else:
            line = '<span class="warn">Blocked in this browser.</span> Allow notifications for the-99.dev in the browser’s site settings, then come back.'
        box = "dis"
    elif state == "install":
        line, box = 'On iPhone, push works once The 99 is on your Home Screen. <span class="lnk">How ›</span>', "off"
    elif state == "old-ios":
        line, box = "Needs iOS 16.4 or later. Home still shows everything.", None
    else:  # unsupported
        line, box = "This browser can’t get push notifications. Home still shows everything.", None
    return title, line, box


def cbx(state, lit=False):
    cls = {"on": "pcb on", "off": "pcb", "dis": "pcb dis"}[state]
    return f'<span class="pc{" lit" if lit else ""}"><span class="{cls}"></span></span>'


def news(state="ask", where="phone", home=HOME_ON, push=PUSH_DEFAULT, lit=None, mark=True):
    """Settings' What's new on Home with the push column. `lit` = the push box being pressed ('master' or a kind)."""
    title, line, box = master(state, where)
    col = box is not None
    pm = (f'<li class="pm{" pnew" if mark else ""}"><span class="hl"><span class="bell">{ico(BELL, 18, 1.5)}</span><span class="ct"><b>{title}</b><span>{line}</span></span></span>'
          + (cbx(box, lit == "master") if col else "") + "</li>")
    rows = []
    for k, n, l in KINDS:
        hb = '<span class="pcb on"></span>' if k in home else '<span class="pcb"></span>'
        pb = cbx("on" if k in push else "off", lit == k) if col else ""
        rows.append(f'<li><span class="hl">{hb}<span class="ct"><b>{n}</b><span>{l}</span></span></span>{pb}</li>')
    head = f'<div class="sech">What’s new on Home{"<span class=\"pl" + (" pnew" if mark else "") + "\">Push</span>" if col else ""}</div>'
    foot = ('<p class="foot">Home: in the app, a count on Home and the list. '
            + ('<b>Push</b>: only to devices you turn on, and never 9pm to 9am. ' if col else '')
            + 'No email, ever.</p>')
    return f'<section class="sec nws" aria-label="What’s new on Home">{head}<ul>{pm}{"".join(rows)}</ul>{foot}</section>'


def spares_and_decks(desk=False):
    h = P.settings_page(desk)
    i = h.index('<section class="sec"><div class="sech">Spares')
    sp = h[i:h.rindex("</div>")]
    dk = F.decks_section(True, False).replace('class="sec new"', 'class="sec"', 1)
    return sp + dk


def settings(state="ask", where="phone", desk=False, full=True, **kw):
    rest = spares_and_decks(desk) if full else ""
    return (f'<div class="stp"><h1>Settings</h1><p class="sub">Saved as you change them</p>'
            f'{news(state, where, **kw)}{rest}</div>')


# ---------------------------------------------------------------- system prompts (approximate)
def chrome_prompt(left=330, top=48):
    return (f'<div class="cprm sys" style="left:{left}px;top:{top}px"><div class="t">the-99.dev wants to</div>'
            f'<div class="r">{ico(BELL, 18, 1.5)}Show notifications</div>'
            '<div class="bt"><span>Block</span><span class="p">Allow</span></div></div>'
            f'<span class="slab" style="left:{left}px;top:{top - 18}px">BROWSER’S OWN PROMPT · APPROX.</span>')


def android_prompt(top=300):
    return ('<div class="sdim"></div>'
            f'<div class="aprm sys" style="top:{top}px"><div class="ic">{ico(BELL, 24, 1.6)}</div>'
            '<div class="t">Allow The 99 to send you notifications?</div>'
            '<div class="bt"><span class="p">Allow</span><span>Don’t allow</span></div></div>'
            f'<span class="slab" style="left:24px;top:{top - 18}px">ANDROID’S OWN PROMPT · APPROX.</span>')


def ios_prompt(top=330):
    return ('<div class="sdim"></div>'
            f'<div class="iprm sys" style="top:{top}px"><div class="tx"><div class="t">“The 99” Would Like to Send You Notifications</div>'
            '<div class="s">Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.</div></div>'
            '<div class="bt"><span>Don’t Allow</span><span>Allow</span></div></div>'
            f'<span class="slab" style="left:60px;top:{top - 18}px">iOS’S OWN PROMPT · APPROX.</span>')


def browser(inner_desk, url="the-99.dev/settings", over=""):
    return (f'<div class="pbrw"><div class="bar"><i></i><i></i><i></i><span class="url">{ico(LOCKI, 14, 1.5)}{url}</span></div>'
            f'{inner_desk}{over}</div>')


def safari_bar(lit=False, abs_=False):
    st = ' style="position:absolute;left:0;right:0;bottom:0;z-index:40"' if abs_ else ''
    return (f'<div class="sfb"{st}><div class="url">the-99.dev</div><div class="tb">'
            f'<span>{ico("<path d=\"M12.5 4 6.5 10l6 6\"/>", 22, 1.8)}</span><span>{ico("<path d=\"M7.5 4l6 6-6 6\"/>", 22, 1.8)}</span>'
            f'<span class="{"lit" if lit else ""}">{ico(SHARE, 22, 1.6)}</span><span>{ico("<path d=\"M4 5.5h12v11H4z\"/><path d=\"M7 3.5h10v10\"/>", 22, 1.6)}</span></div></div>')


def guide_sheet(bottom=0):
    steps = [
        (f'Tap <span class="gl">{ico(SHARE, 17, 1.6)}</span> Share in Safari’s bar.', ""),
        (f'Choose <b>Add to Home Screen</b> <span class="gl">{ico(PLUSSQ, 17, 1.6)}</span>.', "Scroll the list if you don’t see it."),
        ("Open The 99 from your Home Screen.", "Then come back here and tick Push. Your iPhone asks once."),
    ]
    lis = "".join(f'<li><i>{i + 1}</i><span>{t}{f"<small>{s}</small>" if s else ""}</span></li>' for i, (t, s) in enumerate(steps))
    return ('<div class="scrim"></div>' + f'<div class="gst" style="bottom:{bottom}px">' + '<div class="gr"></div><div class="mh"><b>Add The 99 to your Home Screen</b><span class="x">✕</span></div>'
            '<div class="mb"><p class="ln">iPhone sends push only to apps on the Home Screen. It takes a moment, and your ticks are kept.</p>'
            f'<ol class="gsteps">{lis}</ol>'
            '<p class="foot m" style="font-size:10.5px;color:var(--fg-faint)">Needs iOS 16.4 or later.</p></div></div>')


# ---------------------------------------------------------------- the notifications
ICON = "app-icon.png"
# kind -> title, body, image key (or None), lands, collapse
NOTE = [
    ("new-set", "Edge of Eternities is out", "281 cards. See the set.", None,
     "The set’s page, <code>/collection/sets/{code}</code> (the feed item’s link)", "One set is one push."),
    ("new-precon", "Counter Intelligence precon is out", "You own 31 of its 100 cards.", None,
     "The precon on <code>/decks/precons</code> (the feed item’s link)", "Two precons from one release: <i>2 new precons are out</i>, lands on <code>/decks/precons</code>."),
    ("price-drop", "Jace, Multiverse Architect is cheaper", "Was $8.40, now $5.10 at the cheapest printing.", "jace.jpg",
     "Home, with the card’s details open over it (the feed press)", "Several from one price run: <i>3 cards on your wishlist got cheaper</i> · <i>Jace, Dina and 1 more.</i> Lands on Home’s What’s new."),
    ("trade-match", "Colin has a spare Ghoulcaller Gisa", "It’s on your wishlist.", "gisa.jpg",
     "Colin’s page, Spares tab, <code>/friends/{publicId}</code>", "Several from one friend’s upload: <i>Colin has 3 spares you want</i>. Same landing."),
    ("spare-request", "Peter asks for your spare Lathliss, Dragon Queen", "Peter wants 1 for Dragons of Tarkir. Answer in Friends.", "lathliss.jpg",
     "<code>/friends</code>, Waiting on you, the request scrolled into view with Yes and No", "Never collapsed: each one waits on an answer."),
    ("combo", "You can make a combo", "Thassa’s Oracle + Demonic Consultation. You added Demonic Consultation.", None,
     "Home, with the first piece’s details open (the feed press)", "Several from one write: <i>You can make 4 new combos</i> · <i>From the cards you just added.</i> Lands on Home’s What’s new."),
]


def ios_note(title, body, when="now"):
    return (f'<div class="ntf"><img class="ai" src="{img(ICON)}" alt=""><div class="tx"><div class="tp"><span>The 99</span><small>{when}</small></div>'
            f'<div class="bd"><b>{title}</b><br>{body}</div></div></div>')


def lock_screen(notes, hint="Tap one to open it in The 99"):
    stk = "".join(ios_note(*n) for n in notes)
    return (f'<div class="lks"><div class="clk"><small>Thursday 23 October</small><b>9:02</b></div>'
            f'<div class="stk">{stk}</div><div class="hint">{hint}</div>'
            '<span class="slab" style="left:16px;top:16px">iPHONE LOCK SCREEN · APPROX.</span></div>')


def and_note(title, body, im=None, big=False, when="now"):
    th = f'<img class="th" src="{img(im)}" alt="">' if im and not big else ""
    bg = f'<img class="big" src="{img("crop-" + im)}" alt="">' if im and big else ""
    return (f'<div class="and"><div class="ah"><img src="{img(ICON)}" alt="">The 99 · {when}</div>'
            f'<div class="ab"><div class="tx"><b>{title}</b><span>{body}</span></div>{th}</div>{bg}</div>')


def shade(notes):
    return ('<div class="shade" style="position:relative"><div class="sb"><span>9:02</span><span>Thu, Oct 23</span></div>'
            + "".join(and_note(*n) for n in notes)
            + '<span class="slab" style="left:16px;top:10px">ANDROID SHADE · APPROX.</span></div>')


def mac(notes):
    bans = "".join(f'<div class="mban"><img class="ai" src="{img(ICON)}" alt=""><div class="tx"><div class="tp"><span>The 99</span><small>now</small></div>'
                   f'<div class="sub2">the-99.dev</div><div class="bd"><b>{t}</b><br>{b}</div></div>'
                   + (f'<img class="th" src="{img(im)}" alt="">' if im else "") + '</div>' for t, b, im in notes)
    return (f'<div class="mac"><div class="mb2"><span>Thu 23 Oct 14:10</span></div><div class="mstk">{bans}</div>'
            '<span class="slab" style="left:14px;top:34px">macOS BANNER (CHROME) · APPROX.</span></div>')
