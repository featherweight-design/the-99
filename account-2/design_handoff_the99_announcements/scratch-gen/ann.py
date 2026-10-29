"""Wizards announcements R1 (account 2, 2026-10-29): Home rows, the lead story, the opt-in, Settings.

Drawn with the small items kit (w4: Home B with the ✕ ending the action line, as shipped after #2285) and the push kit
(Settings' What's new on Home with the Push column), over src/components/feed/feed-item.tsx, home/lead-story.tsx,
home/whats-new.tsx and settings/news-section.tsx. Every string is shipped copy or a placeholder for /copy-review.
Post titles, summaries and heroes are fixtures: card art on file stands in for Wizards' hero images.
"""
import kit
import parts as P
import sr as S
import push as U
import w4
from kit import doc, board_head, frame, frames, img, ico

kit.CSS += r"""
/* ---- changed or new (annotation only: the app draws nothing here) ---- */
.chg{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:-2px;border-radius:8px}
.fi.chg{border-radius:0}
/* ---- an announcement row: the hero in the 46x64 slot ---- */
.hp{position:relative;width:46px;height:64px;border-radius:4px;overflow:hidden;flex:none;background:var(--surface-sunken);align-self:start}
.dk .hp{align-self:center}
.hp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.hp::after{content:'';position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
.hp.wide{width:86px}
.hp.none{display:flex;align-items:center;justify-content:center;border:1px solid var(--border-strong);background:var(--surface-raised);color:var(--fact)}
.hp.none::after{display:none}
.fi.wide{grid-template-columns:86px minmax(0,1fr)}
.dk .fi.wide{grid-template-columns:86px minmax(0,1fr) auto}
.fi.nopic{grid-template-columns:minmax(0,1fr)}
.dk .fi.nopic{grid-template-columns:minmax(0,1fr) auto}
.fi .dt.cl2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.fi .lc{font:10.5px 'IBM Plex Mono';color:var(--fg-muted);margin-top:1px}
.fi .ac .out{color:var(--fg-muted)}
.fi .ac .two{display:flex;flex-wrap:wrap;align-items:center;column-gap:16px;row-gap:0;min-width:0}
/* the lead story holding a post: the hero, landscape */
.ld.an{flex-direction:column;gap:14px}
.ld.an .hl{position:relative;height:164px;border-radius:8px;overflow:hidden;transform:rotate(-1.5deg);margin:4px 4px 0;box-shadow:0 10px 24px rgba(0,0,0,.55)}
.ld.an .hl img{width:100%;height:100%;object-fit:cover;display:block}
.dk .ld.an{flex-direction:row}
.dk .ld.an .hl{flex:none;width:272px;height:153px;transform:rotate(-3deg);margin:0}
.ld .la .gh{display:inline-flex;align-items:center;height:40px;padding:0 4px;font:500 13.5px 'IBM Plex Sans';color:var(--fg-muted)}
.dk .ld .la .gh{height:36px;font-size:13px}
.ld .la .yg2{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;min-width:0}
/* the offer, at the foot of What's new */
.ofr{border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;padding:6px 4px 6px 14px}
.ofr p{flex:1;min-width:0;font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.ofr p b{color:var(--fg);font-weight:500}
.ofr .pk{flex:none;min-height:44px;display:flex;align-items:center;gap:5px;padding:0 6px;font:500 13px 'IBM Plex Sans';color:var(--accent-text)}
.dk .ofr .pk{min-height:32px}
.ofr .x4{margin:0}
.ofo{border-top:1px solid var(--border);padding:12px 14px 14px;display:flex;flex-direction:column;gap:4px;position:relative}
.ofo .hd{display:flex;align-items:flex-start;gap:10px}
.ofo .hd p{flex:1;font-size:13px;line-height:1.55;color:var(--fg-muted)}
.ofo .hd p b{color:var(--fg);font-weight:500}
.ofo .hd .x4{margin:-10px -10px 0 0}
.ofo .cks{display:flex;flex-direction:column}
.dk .ofo .cks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px}
.dk .ofo .cks .ck:nth-child(2){border-top:0}
.ofo .sv{display:flex;margin-top:8px}
.ofo .sv .bp{flex:1;height:44px;border-radius:10px;opacity:.5;display:flex;align-items:center;justify-content:center;font:500 14px 'IBM Plex Sans';background:var(--fg);color:var(--bg)}
.dk .ofo .sv .bp{flex:none;height:32px;border-radius:8px;padding:0 14px;font-size:12.5px}
.ofo .foot{font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint);margin-top:8px}
.ofo .pk2{position:absolute;right:52px;top:12px;font:500 13px 'IBM Plex Sans';color:var(--accent-text)}
/* small cut-outs: a row box at a given width */
.cut{border:1px solid var(--border-strong);border-radius:16px;background:var(--bg);padding:14px;flex:none}
.cut .fd{border-radius:14px}
.cmp{display:flex;flex-direction:column;gap:6px}
.cmp h5{margin:0;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.opt{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.opt.rec{border-color:var(--accent)}
.opt h4{margin:0;font:600 15px 'IBM Plex Sans';color:var(--fg);display:flex;align-items:center;gap:10px}
.opt h4 .pill{font:600 9.5px 'IBM Plex Mono';letter-spacing:.06em;border-radius:4px;padding:2px 6px;background:var(--accent);color:#14110E}
.opt h4 .pill.alt{background:#3A3229;color:var(--fg-body)}
.opt p,.opt li{font-size:13px;line-height:1.6;color:var(--fg-body)}
.opt ul{margin:0;padding-left:18px}
.opt b{color:var(--fg)}
.calls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:1500px}
.call{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:16px 18px;display:flex;flex-direction:column;gap:8px}
.call em{font:normal 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--accent-text)}
.call h4{margin:0;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.call p,.call li{font-size:13px;line-height:1.6;color:var(--fg-body)}
.call ul{margin:0;padding-left:18px}
.call b{color:var(--fg)}
.tbl{border-collapse:collapse;width:100%;margin-top:8px}
.tbl td,.tbl th{border-top:1px solid var(--border);padding:8px 10px;text-align:left;vertical-align:top;font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.tbl th{font:500 10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.tbl td b{color:var(--fg)}
/* Settings: the three new rows */
.nws li.chg{outline-offset:-1px}
"""

POST = '<path d="M5 3.5h10a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 15 16.5H5A1.5 1.5 0 0 1 3.5 15V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M6.5 7h7M6.5 10h7M6.5 13h4"/>'
X = '<span class="x4">✕</span>'

# ---------------------------------------------------------------- fixtures (posts)
# key: kicker, title, summary, hero, stamp, unseen, lists (out, promised) or None
POSTS = {
    "sl": dict(kick="Secret Lair", title="Secret Lair x JAWS is live",
               sum="Five full-art cards: the shark, the boat and the beach. On sale until Nov 5 or while supplies last.",
               hero="jaws-rising.jpg", stamp="3h ago", unseen=True),
    "dl": dict(kick="Commander decklists", title="Foundations Commander: the decklists",
               sum="Every card in three of the five decks: Calling All Angels, Keen Engineering and Reign of Dragons. The last two follow next week.",
               hero="art-giada.jpg", stamp="5h ago", unseen=True, lists=(3, 5)),
    "dl6": dict(kick="Commander decklists", title="Foundations Commander: the decklists",
                sum="Every card in all five decks, from Calling All Angels to Wretched Ranks.",
                hero="art-giada.jpg", stamp="yesterday", unseen=False, lists=(5, 5)),
    "ot": dict(kick="Wizards news", title="Magic’s 2027 release schedule",
               sum="Every set and Commander product through next year, with dates.",
               hero="hero-aang.jpg", stamp="2d ago", unseen=False),
    "long": dict(kick="Secret Lair", title="Secret Lair x JAWS: five full-art cards for the film’s 51st anniversary, on sale for one week only",
                 sum="The shark, the Orca, Amity Island’s beach, the barrel and the tower, each a full-art printing of a card you know, "
                     "in traditional foil or non-foil. Drops Monday at 9am PT and stays up until Nov 5 or while supplies last.",
                 hero="jaws-rising.jpg", stamp="3h ago", unseen=True),
}


def pic(p, shape="card"):
    """The 46x64 slot. shape: card (the hero cropped to the slot) | wide (86x64) | none (no hero: the plate)."""
    if shape == "none" or not p.get("hero"):
        return f'<span class="hp none" aria-hidden="true">{ico(POST, 20, 1.5)}</span>'
    return f'<span class="hp{" wide" if shape == "wide" else ""}"><img src="{img(p["hero"])}" alt=""></span>'


def presses(p, k):
    if p.get("lists"):
        return ('<span class="two"><span class="lnk">See the lists ›</span>'
                '<span class="lnk out">Read the post ↗</span></span>')
    return '<span class="lnk">Read on Wizards ↗</span>'


def arow(key, desk=False, seen=None, shape="card", chg=True, p=None):
    p = dict(p or POSTS[key])
    if seen is not None:
        p["unseen"] = not seen
    un = '<span class="un"></span>' if p["unseen"] else ""
    kr = f'<div class="kr">{un}<span class="kd">{p["kick"]}</span><small>{p["stamp"]}</small></div>'
    lc = ""
    if p.get("lists"):
        o, n = p["lists"]
        lc = f'<div class="lc">{f"{o} of {n} lists so far" if o < n else f"All {n} lists"}</div>'
    ac = f'<div class="ac">{presses(p, key)}{X}</div>'
    body = (f'<div class="bd">{kr}<div class="tt">{p["title"]}</div><div class="dt cl2">{p["sum"]}</div>{lc}'
            f'{"" if desk else ac}</div>')
    cls = "fi" + (" seen" if not p["unseen"] else "") + (" wide" if shape == "wide" else "") + (" nopic" if shape == "nopic" else "") + (" chg" if chg else "")
    pc = "" if shape == "nopic" else pic(p, shape)
    return f'<div class="{cls}">{pc}{body}{ac if desk else ""}</div>'


def irow(key, desk=False, seen=None):
    """A shipped row (w4's 'new' mode), with the price drop's shipped press (#2286)."""
    I = w4.items()
    I["price"].update(act='<span class="lnk">Buy at Mana Pool ↗</span>')
    I["price2"] = dict(I["price"], vis=("card", "zada.jpg", None), title="Zada, Hedron Grinder is cheaper",
                       detail='<span class="mo"><s>$2.80</s> <span class="dn">↓ $1.45</span></span> at the cheapest printing.', stamp="2d ago")
    it = dict(I[key])
    if seen is not None:
        it["unseen"] = not seen
    h = w4.row(it, desk, "new")
    return h.replace('class="fi"', 'class="fi seen"', 1) if not it.get("unseen") else h


def feed(rows, n=None, foot="", choose=True):
    r = "".join(rows)
    head = (f'<h2 class="sh">What’s new{f" <em>· {n} new</em>" if n else ""}'
            + ('<span class="r">Choose what shows <i>›</i></span>' if choose else '') + '</h2>')
    return f'<section class="blk">{head}<div class="fd">{r}{foot}</div></section>'


def show_all(hidden, total):
    return f'<div class="fdf"><small>{hidden} more</small><span>Show all {total}</span></div>'


def home(desk, lead_html, feed_html, resume=1):
    head = P.home_head(desk)
    if desk:
        return head + (f'<div class="hb"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:11px">{lead_html}{P.resume(2)}{feed_html}</div>'
                       f'<div style="width:316px;flex:none;display:flex;flex-direction:column;gap:11px">{P.commitments()}{P.friends_home()}</div></div>')
    return head + '<div class="hb">' + lead_html + P.resume(resume) + feed_html + "</div>"


def ph(inner, h=None, over="", badges=None):
    return w4.ph(inner, "Home", "new", over=over, h=h).replace('{"Friends": 3}', "")


def dk(inner, h=900, over=""):
    return w4.dk(inner, "Home", "new", over=over, h=h)


# ---------------------------------------------------------------- the lead story
def lead_post(key, desk=False, chg=True):
    p = POSTS[key]
    if p.get("lists"):
        act = ('<span class="yg2"><span class="ba">See the lists</span><span class="gh">Read the post ↗</span></span>')
    else:
        act = '<span class="ba">Read on Wizards ↗</span>'
    o = ""
    if p.get("lists"):
        a, n = p["lists"]
        o = f'<span class="m" style="font-size:10.5px;color:var(--fg-muted)">{a} of {n} lists so far</span>'
    return (f'<section class="ld an{" chg" if chg else ""}" style="{"border-radius:14px" if chg else ""}"><div class="blur"><img src="{img(p["hero"])}" alt=""></div>'
            f'<span class="hl"><img src="{img(p["hero"])}" alt=""></span>'
            f'<div class="lt"><span class="lk">{p["kick"]}<small>{p["stamp"]}</small></span>'
            f'<h3>{p["title"]}</h3><p>{p["sum"]}</p>{o}<div class="la">{act}{X}</div></div></section>')


# ---------------------------------------------------------------- the offer (call 3)
OFF = [("New sets", "When a set comes out."), ("New precons", "When a Commander precon comes out."),
       ("Price drops on your wishlist", "A card you want gets cheaper."),
       ("Trade matches", "A friend has a spare of a card on your wishlist."),
       ("Combos you can make", "You now own both halves of a two-card combo.")]


def offer(opened=False):
    if not opened:
        return ('<div class="ofr chg"><p><b>Pick what else you want to hear about.</b> New sets, price drops, trade matches and more.</p>'
                f'<span class="pk">Pick ▾</span>{X}</div>')
    cks = "".join(f'<div class="ck"><span class="box"></span><span class="ct"><b>{n}</b><span>{l}</span></span></div>' for n, l in OFF)
    return ('<div class="ofo chg"><div class="hd"><p><b>Pick what else you want to hear about.</b> You can change it in Settings.</p>'
            f'{X}</div><div class="cks">{cks}</div><div class="sv"><span class="bp">Show these</span></div>'
            '<p class="foot">In the app only. No email, ever.</p></div>')


def quiet(names):
    return f'<div class="fq"><p><b>Nothing new right now.</b> You hear about {names} here.</p></div>'


# ---------------------------------------------------------------- Settings
NEW_KINDS = [("secret-lair", "Secret Lair drops", "When Wizards announces a Secret Lair drop."),
             ("commander-decklists", "Commander decklists", "When Wizards posts a Commander set’s decklists."),
             ("wizards-other", "Other Wizards news", "Everything else Wizards announces.")]
ALL_KINDS = U.KINDS[:2] + NEW_KINDS + U.KINDS[2:]
DEFAULT_HOME = ("secret-lair", "commander-decklists", "wizards-other", "spare-request")
DEFAULT_PUSH = ("secret-lair", "commander-decklists", "wizards-other", "spare-request")


LAYOUT = {"v": "cols"}   # R1b: cols (recommended) | chips | split | shipped

kit.CSS += r'''
/* ---- R1b · Settings: notifications with labelled columns ---- */
.an-nt .sech{display:flex;align-items:center}
.an-nt li.chg{outline-offset:3px}
.an-nt .dv{display:flex;align-items:flex-start;gap:12px;margin-top:10px;padding:10px 0 10px 12px;border-radius:10px;background:var(--surface-sunken);border:1px solid var(--border)}
.an-nt .dv .bell{flex:none;width:18px;height:18px;margin-top:1px;color:var(--fg-muted);display:flex;align-items:center;justify-content:center}
.an-nt .dv .pc{margin-left:0}
.an-nt .chd{display:flex;align-items:flex-end;justify-content:flex-end;padding:14px 0 6px;border-bottom:1px solid var(--border-strong)}
.an-nt .chd span{width:52px;flex:none;text-align:center;font:500 10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-muted)}
.an-nt ul{margin:0;padding:0;list-style:none}
.an-nt li{display:flex;align-items:flex-start}
.an-nt li+li{border-top:1px solid var(--border)}
.an-nt li .ct{padding:9px 0;min-height:44px}
.an-nt .cc{flex:none;width:52px;min-height:44px;display:flex;justify-content:center;padding-top:10px;position:relative}
.an-nt .cc.lit::before{content:'';position:absolute;inset:2px 4px auto 4px;height:40px;border-radius:10px;box-shadow:0 0 0 1.5px rgba(240,230,210,.7)}
.an-nt .ct{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.an-nt .ct b{font:500 14px 'IBM Plex Sans';color:var(--fg)}
.an-nt .ct span{font-size:12.5px;line-height:1.45;color:var(--fg-muted)}
.an-nt .foot{margin-top:10px;font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.an-nt .foot b{color:var(--fg-muted);font-weight:500}
.an-nt .chips{display:flex;gap:8px;margin-top:8px}
.an-nt .chip{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 11px 0 8px;border-radius:15px;border:1px solid var(--border-strong);font:500 12.5px 'IBM Plex Sans';color:var(--fg-body)}
.an-nt .chip.on{border-color:color-mix(in srgb,var(--accent) 55%,transparent);color:var(--fg)}
.an-nt .chip .pcb{width:16px;height:16px;font-size:11px}
.an-nt li.cl{display:block;padding:9px 0 11px}
.an-nt li.cl .ct{padding:0;min-height:0}
.an-nt .sub2{margin:22px 0 0}
.an-nt .hl2{display:flex;align-items:flex-start;gap:12px;flex:1;min-width:0;padding:9px 0;min-height:44px}
.an-nt .hl2 .pcb{margin-top:1px}
'''


def _box(on, lit=False):
    return f'<span class="cc{" lit" if lit else ""}"><span class="pcb{" on" if on else ""}"></span></span>'


def _line(k, l):
    dflt = k in ("secret-lair", "commander-decklists", "wizards-other", "spare-request")
    return f"{l} On from the start." if dflt else l


def _device(state, where, inner_box=True):
    title, line, box = U.master(state, where)
    b = _box(box == "on") if (box is not None and inner_box) else ""
    return (f'<div class="dv"><span class="bell">{ico(U.BELL, 18, 1.5)}</span><span class="ct" style="padding:0;min-height:0"><b>{title}</b><span>{line}</span></span>{b}</div>'), box is not None


def news_cols(state="on", where="phone", home=DEFAULT_HOME, push=DEFAULT_PUSH, column=True, lit=None, lit_home=None):
    dev, can = _device(state, where)
    col = column and can
    new = {a for a, _, _ in NEW_KINDS}
    rows = "".join(f'<li{" class=\"chg\"" if k in new else ""}><span class="ct"><b>{n}</b><span>{_line(k, l)}</span></span>'
                   f'{_box(k in home, lit_home == k)}{_box(k in push, lit == k) if col else ""}</li>' for k, n, l in ALL_KINDS)
    chd = f'<div class="chd"><span>In app</span>{"<span>Push</span>" if col else ""}</div>'
    foot = ('<p class="foot"><b>In app</b>: a count on Home and the list. '
            + ('<b>Push</b>: only to devices you turn on, never 9pm to 9am. ' if col else '') + 'No email, ever.</p>')
    return (f'<section class="sec an-nt"><div class="sech">Notifications</div>{dev}{chd}<ul>{rows}</ul>{foot}</section>')


def news_chips(state="on", where="phone", home=DEFAULT_HOME, push=DEFAULT_PUSH, column=True, lit=None, lit_home=None):
    dev, can = _device(state, where)
    col = column and can
    def chip(lab, on):
        return f'<span class="chip{" on" if on else ""}"><span class="pcb{" on" if on else ""}"></span>{lab}</span>'
    rows = "".join(f'<li class="cl"><span class="ct"><b>{n}</b><span>{_line(k, l)}</span></span>'
                   f'<span class="chips">{chip("In app", k in home)}{chip("Push", k in push) if col else ""}</span></li>' for k, n, l in ALL_KINDS)
    return (f'<section class="sec an-nt"><div class="sech">Notifications</div>{dev}<ul style="margin-top:6px">{rows}</ul>'
            '<p class="foot"><b>In app</b>: a count on Home and the list. <b>Push</b>: only to devices you turn on, never 9pm to 9am. No email, ever.</p></section>')


def news_split(state="on", where="phone", home=DEFAULT_HOME, push=DEFAULT_PUSH, column=True, lit=None, lit_home=None):
    dev, can = _device(state, where)
    def lst(on):
        return "<ul>" + "".join(f'<li><span class="hl2"><span class="pcb{" on" if k in on else ""}"></span><span class="ct" style="padding:0;min-height:0"><b>{n}</b>'
                                f'<span>{_line(k, l)}</span></span></span></li>' for k, n, l in ALL_KINDS) + "</ul>"
    return (f'<section class="sec an-nt"><div class="sech">In the app</div><p class="foot" style="margin:6px 0 4px">A count on Home and the list.</p>{lst(home)}</section>'
            f'<section class="sec an-nt sub2"><div class="sech">Push</div>{dev}{lst(push)}'
            '<p class="foot">Only to devices you turn on, never 9pm to 9am. No email, ever.</p></section>')


def news(state="on", where="phone", home=DEFAULT_HOME, push=DEFAULT_PUSH, column=True, lit=None, lit_home=None):
    v = LAYOUT["v"]
    if v != "shipped":
        return {"cols": news_cols, "chips": news_chips, "split": news_split}[v](state, where, home, push, column, lit, lit_home)
    return news_shipped(state, where, home, push, column, lit)


def news_shipped(state="on", where="phone", home=DEFAULT_HOME, push=DEFAULT_PUSH, column=True, lit=None):
    title, line, box = U.master(state, where)
    col = column and box is not None
    pm = (f'<li class="pm"><span class="hl"><span class="bell">{ico(U.BELL, 18, 1.5)}</span><span class="ct"><b>{title}</b><span>{line}</span></span></span>'
          + (U.cbx(box) if col else "") + "</li>")
    rows = []
    for k, n, l in ALL_KINDS:
        new = k in dict((a, 1) for a, _, _ in NEW_KINDS)
        dflt = k in ("secret-lair", "commander-decklists", "wizards-other", "spare-request")
        hb = '<span class="pcb on"></span>' if k in home else '<span class="pcb"></span>'
        pb = U.cbx("on" if k in push else "off", lit == k) if col else ""
        line = f"{l} On from the start." if dflt else l
        rows.append(f'<li{" class=\"chg\"" if new else ""}><span class="hl">{hb}<span class="ct"><b>{n}</b><span>{line}</span></span></span>{pb}</li>')
    head = f'<div class="sech">What’s new on Home{"<span class=\"pl\">Push</span>" if col else ""}</div>'
    foot = ('<p class="foot">Home: in the app, a count on Home and the list. '
            + ('<b>Push</b>: only to devices you turn on, and never 9pm to 9am. ' if col else '')
            + 'No email, ever.</p>')
    return f'<section class="sec nws">{head}<ul>{pm}{"".join(rows)}</ul>{foot}</section>'


def settings(desk=False, **kw):
    return (f'<div class="stp"><h1>Settings</h1><p class="sub">Saved as you change them</p>{news(**kw)}{U.spares_and_decks(desk)}</div>')
