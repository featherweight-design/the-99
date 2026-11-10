"""Upgrade this precon R1 (account 2, 2026-11-10), over the Wizards announcements kit (kit.py, pre.py).

Drawn over src/components/decks/precons/open-precon-view.tsx (head at 64x89 / 84x117, own box, PreconOverview, list-note
line, read-only DecklistGroup rows), start-precon.tsx (S1), and Suggested changes v2's confirm, Wait and bar. Strategy
glyphs are src/components/decks/strategy-icon.tsx's. Fixture: Prismari Artistry (Rootha, UR), illustrative, as the
announcements round listed it; card images are real cards from the design folders.
"""
import kit
import pre as R
from kit import img, doc, board_head, frame, frames

kit.CSS += r"""
.dk .z-pp .z-tx{padding-top:2px}
.vfx{position:absolute;left:0;right:0;bottom:0;height:110px;background:linear-gradient(to bottom,rgba(20,17,14,0),var(--bg) 78%);z-index:4;pointer-events:none}
.ph .vfx{bottom:136px}
.vfx::after{content:"scrolls on";position:absolute;left:0;right:0;bottom:14px;text-align:center;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.vtop{font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);text-align:center;padding:10px 0 2px}
.new9{outline:1.5px dashed var(--accent);outline-offset:6px;border-radius:10px}
.draft8{font:600 9px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 5px;margin-left:6px;vertical-align:2px}
/* ---- the section ---- */
.up{display:flex;flex-direction:column;gap:10px}
.up .lh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.up .lbl{font:500 10.5px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.up .lh small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.up .ld{font-size:14px;line-height:1.6;color:var(--fg-body);max-width:760px}
.ucs{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
.dk .ucs{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.dk .ucs.one{grid-template-columns:minmax(0,420px)}
.uc{position:relative;display:flex;flex-direction:column;gap:10px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface);padding:12px 13px 13px;text-align:left}
.uc.on{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--surface))}
.uc.off{opacity:.45}
.uc .t1{display:flex;align-items:center;gap:10px;padding-right:30px}
.uc .md{width:34px;height:34px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:var(--elevated);border:1px solid var(--border-strong);color:var(--fg)}
.uc.on .md{color:var(--accent-text);border-color:color-mix(in srgb,var(--accent) 60%,transparent)}
.uc .nm{font:600 15px 'IBM Plex Sans';color:var(--fg)}
.uc .n{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);display:block;margin-top:1px}
.uc .rd{position:absolute;top:12px;right:12px;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--border-strong)}
.uc.on .rd{border-color:var(--accent)}
.uc.on .rd::after{content:'';position:absolute;inset:4px;border-radius:50%;background:var(--accent)}
.uc .bl{font-size:13.5px;line-height:1.5;color:var(--fg-body)}
.uc .bk{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.uc .bk span{display:flex;flex-direction:column;gap:5px;font-size:11.5px;line-height:1.3;color:var(--fg-muted);min-width:0}
.uc .bk img{width:52px;height:73px;border-radius:3px;object-fit:cover;display:block;box-shadow:0 2px 6px rgba(0,0,0,.45)}
.uc .mo{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.uc .src{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);border-top:1px solid var(--border);padding-top:8px}
.uc .run{font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.uact{display:flex;flex-direction:column;gap:8px}
.dk .uact{flex-direction:row;align-items:center;gap:14px}
.ubt{height:48px;border-radius:10px;background:var(--accent);color:var(--bg);font:600 15px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;padding:0 18px;flex:none}
.dk .ubt{height:40px;border-radius:8px;font-size:13.5px}
.ubt.dis{background:var(--elevated);color:var(--fg-locked)}
.ubt.gh{background:transparent;border:1px solid var(--border-strong);color:var(--fg);font-weight:500;font-size:13.5px}
.uln{font:11px/1.55 'IBM Plex Mono';color:var(--fg-faint)}
.uln b{font-weight:500;color:var(--fg-body)}
.uln a{color:var(--accent-text);text-decoration:underline;text-underline-offset:2px}
.ulk{font:500 13px 'IBM Plex Sans';color:var(--accent-text);min-height:44px;display:inline-flex;align-items:center}
.dk .ulk{min-height:32px}
.uerr{font:11px/1.55 'IBM Plex Mono';color:var(--danger)}
/* wait (v2's clock) */
.uw{display:flex;flex-direction:column;gap:6px;border-radius:10px;border:1px solid var(--border);background:var(--surface-sunken);padding:12px 14px;position:relative;overflow:hidden}
.uw .r1{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.uw .clk{font:600 22px 'IBM Plex Mono';color:var(--fg)}
.uw .r1 span{font-size:13.5px;color:var(--fg-body)}
.uw .r1 span b{color:var(--fg);font-weight:600}
.uw p{font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.uw::after{content:'';position:absolute;left:0;bottom:0;height:2px;width:62%;background:linear-gradient(90deg,var(--accent),transparent)}
.usk{display:flex;flex-direction:column;gap:6px}
.usk i{display:block;height:36px;border-radius:8px;background:var(--surface-rail)}
/* results */
.ures{display:flex;flex-direction:column;gap:12px;border-radius:12px;border:1px solid var(--border-strong);background:var(--surface-sunken);padding:14px 14px 16px}
.dk .ures{padding:16px 18px 18px}
.ures .hd{display:flex;flex-direction:column;gap:5px}
.ures h3{margin:0;font:400 18px 'Cinzel',serif;color:var(--fg);display:flex;align-items:center;gap:10px}
.ures h3 .md{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--accent) 60%,transparent);color:var(--accent-text);flex:none}
.ures .tl{display:flex;flex-wrap:wrap;gap:4px 14px;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.ures .tl b{font-weight:500;color:var(--fg)}
.ures .tl .up2{color:var(--accent-text)}
.ures .sub{font-size:13px;line-height:1.55;color:var(--fg-body)}
.ugh{display:flex;align-items:baseline;gap:8px;font:600 14px 'IBM Plex Sans';color:var(--fg);margin-top:4px}
.ugh em{font:normal 11px 'IBM Plex Mono';color:var(--fg-muted)}
.upr{display:flex;flex-direction:column;gap:4px;padding:8px 0 10px;border-bottom:1px solid var(--border)}
.upr .rw{display:flex;flex-direction:column;gap:4px}
.dk .upr .rw{flex-direction:row;align-items:center;gap:8px}
.dk .upr .rw .z-rr{flex:1;min-width:0}
.upr .ar{font:12px 'IBM Plex Mono';color:var(--fg-faint);flex:none;width:16px;text-align:center}
.ph .upr .ar{display:none}
.upr .z-rr .sg{font:600 13px 'IBM Plex Mono';width:10px;flex:none;text-align:center}
.upr .z-rr.o .sg{color:var(--fg-faint)}
.upr .z-rr.o .z-nm{color:var(--fg-body)}
.upr .z-rr.i .sg{color:var(--accent-text)}
.upr .z-rr .pr{flex:none;font:11px 'IBM Plex Mono';color:var(--fg-body)}
.upr .z-rr .pr.own{color:var(--fg-faint)}
.upr .why{font-size:12.5px;line-height:1.5;color:var(--fg-muted);padding:0 2px}
.ufo{display:flex;flex-direction:column;gap:8px;padding-top:4px}
.dk .ufo{flex-direction:row;align-items:center;gap:16px}
.ufo .sp{flex:1}
/* compact picker */
.ucp{display:flex;flex-direction:column;gap:6px}
.dk .ucp{flex-direction:row;gap:8px}
.ucr{display:flex;align-items:center;gap:10px;min-height:48px;padding:6px 12px 6px 8px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface);flex:1;min-width:0}
.ucr.on{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--surface))}
.ucr .md{width:28px;height:28px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:var(--elevated);color:var(--fg)}
.ucr.on .md{color:var(--accent-text)}
.ucr .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.ucr .tx b{font:600 14px 'IBM Plex Sans';color:var(--fg)}
.ucr .tx span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.ucr .tx span.dn{color:var(--fg-muted)}
.ucr .rd{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--border-strong);position:relative;flex:none}
.ucr.on .rd{border-color:var(--accent)}
.ucr.on .rd::after{content:'';position:absolute;inset:3.5px;border-radius:50%;background:var(--accent)}
/* ask once (v2 Intake D) */
.uask{display:flex;flex-direction:column;gap:10px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface);padding:12px 14px}
.uask p{font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.uask .bts{display:flex;gap:8px;flex-wrap:wrap}
.uask .bts span{height:44px;border-radius:9px;display:flex;align-items:center;padding:0 14px;font:500 13.5px 'IBM Plex Sans'}
.dk .uask .bts span{height:36px}
.uask .bts .a{background:var(--accent);color:var(--bg);font-weight:600}
.uask .bts .b{border:1px solid var(--border-strong);color:var(--fg)}
/* empty */
.uem{border-radius:10px;border:1px dashed var(--border-dashed);padding:12px 14px;display:flex;flex-direction:column;gap:4px}
.uem b{font:600 14px 'IBM Plex Sans';color:var(--fg-body)}
.uem p{font-size:13px;line-height:1.55;color:var(--fg-muted)}
/* S1 */
.scrim{position:absolute;inset:0;background:rgba(16,13,10,.74);z-index:20}
.sdl{position:absolute;z-index:21;background:var(--surface);border:1px solid var(--border-strong);display:flex;flex-direction:column;gap:16px}
.ph .sdl{left:0;right:0;bottom:0;border-radius:16px 16px 0 0;padding:10px 18px 18px}
.dk .sdl{left:50%;top:70px;transform:translateX(-50%);width:500px;border-radius:14px;padding:24px 24px 20px}
.sdl .gr{width:36px;height:4px;border-radius:2px;background:var(--border-strong);margin:0 auto}
.dk .sdl .gr{display:none}
.sdl .tt{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.sdl h2{margin:0;font:400 20px 'Cinzel',serif;color:var(--fg)}
.sdl .x{width:36px;height:36px;border-radius:50%;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--fg-muted);flex:none}
.ph .sdl .x{display:none}
.sdl .cmd{display:flex;align-items:center;gap:11px;border-radius:10px;background:var(--surface-sunken);padding:10px 12px}
.sdl .cmd img{width:34px;height:48px;border-radius:3px;object-fit:cover}
.sdl .cmd b{display:block;font:400 15px 'Cinzel',serif;color:var(--fg);font-weight:400}
.sdl .cmd span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.sdl .fl{display:flex;flex-direction:column;gap:6px}
.sdl .fl span{font:9.5px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--fg-faint)}
.sdl .fl i{font-style:normal;display:block;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-sunken);padding:9px 11px;font-size:15px;color:var(--fg)}
.sdl .ck{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.45;color:var(--fg-body)}
.sdl .ck i{width:18px;height:18px;border-radius:4px;border:1.5px solid var(--border-strong);flex:none;margin-top:1px}
.sdl .sw{font-size:12.5px;line-height:1.55;color:var(--fg-body)}
.sdl .facts{display:flex;flex-direction:column}
.sdl .fc{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:1px solid var(--border);padding:9px 0}
.sdl .fc span{font-size:12.5px;color:var(--fg-muted)}
.sdl .fc em{font:normal 11px 'IBM Plex Mono';color:var(--fg-body);text-align:right}
.sdl .bt{display:flex;gap:8px}
.dk .sdl .bt{justify-content:flex-end}
.sdl .bt span{height:46px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 14px;font-size:13px;flex:1}
.dk .sdl .bt span{height:40px;flex:none}
.sdl .bt .c{border:1px solid var(--border-strong);color:var(--fg-body)}
.sdl .bt .s{background:var(--accent);color:var(--bg);font-weight:600}
/* notes */
.bnote{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:18px 22px;max-width:1240px}
.bnote h4{margin:0 0 10px;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.bnote ol,.bnote ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.bnote b{color:var(--fg)}
.sec9{font:600 11px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--accent-text);border-top:1px solid var(--border);padding-top:18px}
"""

DRAFT = '<span class="draft8">DRAFT</span>'


def glyph(k, size=18):
    G = {
        "spells": '<path d="M13.5 2.5L5 13.5h6l-1.5 8 8.5-11h-6z"/>',
        "artifacts": '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5M5.3 5.3l2.4 2.4M16.3 16.3l2.4 2.4M18.7 5.3l-2.4 2.4M7.7 16.3l-2.4 2.4"/>',
        "tokens": '<circle cx="12" cy="12" r="9"/><path d="M12 6.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>',
    }[k]
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{G}</svg>')


# ---------------------------------------------------------------- fixture
PRE = "Prismari Artistry"
CMD = "Rootha, Mastering the Moment"
META = "UR · SOC · Secrets of Strixhaven Commander · Apr 24, 2026"
OWN, OF = 41, 85
OV = ("<b>Rootha, Mastering the Moment</b> leads a blue-red spells deck that copies its instants and sorceries. It trades early with cheap "
      "answers, makes Dragon and Elemental tokens off its spells, and finishes with burn.")

ST = {
    "spells": dict(name="Spells", n=31, blurb="Cast cheap instants and sorceries, and let Rootha copy the best of them.",
                   cards=[("Counterspell", "c-counterspell.jpg"), ("Swan Song", "c-swan-song.jpg"), ("Searing Touch", "c-searing-touch.jpg")], src="edhrec"),
    "artifacts": dict(name="Artifacts", n=9, blurb="Play artifacts that make Thopters, and get paid for each one that lands.",
                      cards=[("Sai, Master Thopterist", "c-sai.jpg"), ("Brudiclad, Telchor Engineer", "c-brudiclad.jpg"), ("Wizard’s Staff", "c-wizards-staff.jpg")], src="edhrec"),
    "tokens": dict(name="Tokens", n=7, blurb="Make Dragon and Elemental tokens off your spells, then attack with the crowd.",
                   cards=[("Lathliss, Dragon Queen", "c-lathliss.jpg"), ("Ashling, the Limitless", "c-ashling.jpg"), ("Brudiclad, Telchor Engineer", "c-brudiclad.jpg")], src="overview"),
}
ORDER = ["spells", "artifacts", "tokens"]

# (cut, cut cost, cut owned, add, add cost, add owned, add cents or None, reason, from)
PAIRS = [
    ("Opt", "U", True, "Thopter Spy Network", "2UU", False, "$2.40", "A Thopter each upkeep while you have an artifact, and a card each time one connects.", "Spells"),
    ("Thrill of Possibility", "1R", True, "Whirler Rogue", "2UU", True, None, "Two Thopters on arrival, and tapping two artifacts gets Rootha through unblocked.", "Spells"),
    ("Big Score", "3R", False, "Saheeli, Sublime Artificer", "1UR", False, "$1.10", "Turns the spells you still cast into Servos, so they build the artifact count too.", "Tokens"),
    ("Expressive Iteration", "UR", False, "Unwinding Clock", "4", False, "$9.80", "Untaps every artifact on each other player’s turn: twice the mana and the blockers.", "Spells"),
    ("Magma Opus", "6UR", False, "Padeem, Consul of Innovation", "3U", False, "$0.80", "Keeps your artifacts safe from targeted removal and draws while you hold the biggest.", "Spells"),
    ("Rousing Refrain", "3RR", False, "Retrofitter Foundry", "3", False, "$3.20", "Spare mana becomes Servos, then Thopters, then 4/4 Constructs.", "Spells"),
    ("Galvanic Iteration", "UR", False, "Thought Monitor", "6U", False, "$0.90", "Costs about two with your artifacts out, and draws two.", "Spells"),
    ("Arcane Bombardment", "4RR", True, "Foundry Inspector", "3", True, None, "Every artifact costs one less.", "Spells"),
    ("Prismari Pledgemage", "UR", False, "Pia Nalaar", "2RR", False, "$0.30", "A Thopter on arrival, and she gets an artifact attacker through.", "Spells"),
    ("Spectacular Pileup", "3RR", False, "Mechanized Production", "2UU", False, "$5.60", "Copies your best artifact every upkeep.", "Spells"),
    ("Crackling Drake", "UURR", True, "Etherium Sculptor", "1U", True, None, "Another artifact discount, on a body that blocks.", "Spells"),
    ("Thundering Raiju", "2RR", False, "Emry, Lurker of the Loch", "2U", False, "$4.50", "Casts an artifact back from your graveyard every turn.", "Spells"),
    ("Elemental Masterpiece", "5UR", True, "Efficient Construction", "3U", True, None, "A Thopter for every artifact spell you cast.", "Tokens"),
    ("Lightning Runner", "3R", False, "Reckless Fireweaver", "1R", False, "$0.30", "Each artifact that lands deals 1 damage to every opponent.", "Spells"),
]
PAIRS.sort(key=lambda p: p[8] != "Spells")
TOKEN_PAIRS = [
    ("Opt", "U", True, "Young Pyromancer", "1R", False, "$0.40", "An Elemental for every instant and sorcery you cast.", "Spells"),
    ("Thrill of Possibility", "1R", True, "Murmuring Mystic", "3U", True, None, "A Bird for every instant or sorcery, and they block.", "Spells"),
    ("Galvanic Iteration", "UR", False, "Krenko, Tin Street Kingpin", "2R", False, "$0.80", "Goblins that grow in number each time it attacks.", "Spells"),
    ("Expressive Iteration", "UR", False, "Third Path Iconoclast", "UR", False, "$0.90", "A Soldier token for every noncreature spell.", "Spells"),
    ("Magma Opus", "6UR", False, "Hordeling Outburst", "1RR", True, None, "Three Goblins for three mana.", "Spells"),
    ("Big Score", "3R", False, "Goblin Instigator", "1R", True, None, "Two Goblins for two mana.", "Spells"),
    ("Arcane Bombardment", "4RR", True, "Hellrider", "2RR", False, "$0.90", "Each attacking token deals 1 damage as it attacks.", "Spells"),
    ("Wizard’s Staff", "2R", False, "Talrand’s Invocation", "2UU", False, "$0.25", "Two 2/2 flying Drakes for four mana.", "Artifacts"),
    ("Sai, Master Thopterist", "2U", True, "Ral, Crackling Wit", "2UR", False, "$0.70", "An Otter for every noncreature spell you cast.", "Artifacts"),
]
BUY = sum(float(p[6][1:]) for p in PAIRS if p[6])
NBUY = sum(1 for p in PAIRS if p[6])
OWNED_ADDS = len(PAIRS) - NBUY

CREDIT = "12 to 18 swaps · uses 2 credits · this run uses 2 of 15 welcome"


def nm_from(k):
    return ST[k]["name"]


# ---------------------------------------------------------------- pieces
def card(k, on=False, off=False, run=None, desk=False, mark_src=True):
    s = ST[k]
    bk = "".join(f'<span><img src="{img(f)}" alt="">{n}</span>' for n, f in s["cards"])
    more = s["n"] - 3
    src = ('<p class="src">the Overview’s read</p>' if s["src"] == "overview" and mark_src else "")
    rn = f'<p class="run">{run}</p>' if run else ""
    cls = "uc" + (" on" if on else "") + (" off" if off else "")
    return (f'<div class="{cls}"><span class="rd"></span><div class="t1"><span class="md">{glyph(k)}</span><span><span class="nm">{s["name"]}</span>'
            f'<span class="n">{s["n"]} of its cards</span></span></div><p class="bl">{s["blurb"]}</p><div class="bk">{bk}</div>'
            f'<p class="mo">and {more} more · press a card for its details</p>{rn}{src}</div>')


def cards(keys, sel=None, dim=False, runs=None, cls="", mark_src=True):
    runs = runs or {}
    return (f'<div class="ucs {cls}">' + "".join(card(k, on=(k == sel), off=(dim and k != sel), run=runs.get(k), mark_src=mark_src) for k in keys) + "</div>")


def label(aside="pick a direction · 2 credits a run"):
    return f'<div class="lh"><span class="lbl">Upgrade this precon</span><small>{aside}</small></div>'


LEAD = ('<p class="ld">Pick where to take this deck. We swap 12 to 18 of its cards toward that strategy, and no card we add costs over $12.' + DRAFT + '</p>')


def act(sel=None, state="ready"):
    if state == "none" or sel is None:
        return f'<div class="uact"><span class="ubt dis">Upgrade</span><p class="uln">Select a direction to upgrade toward.{DRAFT}</p></div>'
    n = nm_from(sel)
    if state == "spent":
        return (f'<div class="uact"><span class="ubt dis">Upgrade toward {n}</span><p class="uln">0 of 1 left · reset at 2:01 AM · <a>What uses credits?</a><br>'
                '<a>Get more credits</a></p></div>')
    if state == "one":
        return (f'<div class="uact"><span class="ubt dis">Upgrade toward {n}</span><p class="uln">An upgrade uses 2 credits, and a free credit covers 1.{DRAFT}<br>'
                '1 of 1 free · reset at 2:01 AM · <a>Get more credits</a></p></div>')
    if state == "again":
        return (f'<div class="uact"><span class="ubt">Upgrade toward {n}</span><p class="uln">Another upgrade · 12 to 18 swaps · uses 2 credits · '
                f'<b>Artifacts stays here</b>{DRAFT}</p></div>')
    return f'<div class="uact"><span class="ubt">Upgrade toward {n}</span><p class="uln">{CREDIT}{DRAFT}</p></div>'


def wait(sel, t="0:04"):
    return (f'<div class="uw"><div class="r1"><span class="clk">{t}</span><span>Finding swaps toward <b>{nm_from(sel)}</b></span>'
            '<span class="uln">usually about 6 seconds</span></div>'
            '<p>Leave whenever you like: the upgrade keeps going and shows here when it’s done.' + DRAFT + '</p></div>'
            '<div class="usk"><i></i><i></i><i></i></div>')


def failed(sel):
    return (f'<div class="uact"><span class="ubt">Try again</span><p class="uln">2 credits · same direction, {nm_from(sel)}</p></div>'
            '<p class="uerr">That upgrade didn’t come through. Both credits are back.' + DRAFT + '</p>')


def rr(sg, cls, name, cst, owned, price=None):
    pr = (f'<span class="pr">{price}</span>' if price else ('<span class="pr own">you own it</span>' if cls == "i" else ""))
    return (f'<div class="z-rr {cls}"><span class="sg">{sg}</span><span class="z-ow{"" if owned else " no"}"></span>'
            f'<span class="z-nm">{name}</span>{R.cost(cst)}{pr}</div>')


def pair(p):
    cut, cc, co, add, ac, ao, price, why, _ = p
    return (f'<div class="upr"><div class="rw">{rr("−", "o", cut, cc, co)}<span class="ar">→</span>{rr("+", "i", add, ac, ao, price)}</div>'
            f'<p class="why">{why}</p></div>')


def results(sel="artifacts", pairs=PAIRS, short=False, foot=True, n_show=None, ask=False, date="Nov 10"):
    n = len(pairs)
    buy = sum(float(p[6][1:]) for p in pairs if p[6])
    nb = sum(1 for p in pairs if p[6])
    if short:
        tl = (f'<span class="up2">bracket stays 2 · Core</span><span><b>{nb} to buy · ${buy:.2f}</b> · each under $12</span><span>{n - nb} you own</span>')
        sub = (f'<p class="sub">Fewer than 12 fit this deck, so both credits are back. These {n} are still yours to start with.{DRAFT}</p>')
    else:
        tl = (f'<span class="up2">bracket 2 → 3 · Upgraded</span><span><b>{nb} to buy · ${buy:.2f}</b> · each under $12</span><span>{n - nb} you own</span>')
        sub = ""
    froms = {}
    for p in pairs:
        froms.setdefault(p[8], []).append(p)
    body = ""
    shown = 0
    for f, ps in froms.items():
        if n_show is not None and shown >= n_show:
            break
        ps2 = ps if n_show is None else ps[: max(0, n_show - shown)]
        shown += len(ps2)
        body += f'<div class="ugh">Cuts from {f}<em>{len(ps)}</em></div>' + "".join(pair(p) for p in ps2)
    rest = (f'<p class="uln">{n - shown} more swaps below</p>' if n_show is not None and shown < n else "")
    ft = ""
    if foot:
        if ask:
            ft = ('<div class="uask new9"><p>You upgraded toward Artifacts on Nov 10, on this same list. Another run uses 2 credits and will likely name many of the same swaps.'
                  + DRAFT + '</p><div class="bts"><span class="a">Run it again</span><span class="b">Keep Nov 10’s</span></div></div>')
        else:
            ft = (f'<div class="ufo"><span class="ubt">Start the deck with these {n} swaps</span><span class="sp"></span>'
                  f'<span class="ulk">Run {nm_from(sel)} again</span></div>')
    return (f'<div class="ures"><div class="hd"><h3><span class="md">{glyph(sel, 16)}</span>{n} swaps toward {nm_from(sel)}</h3>'
            f'<div class="tl">{tl}<span>{date}</span></div>{sub}</div>{body}{rest}{ft}</div>')


def compact(sel, runs, expand=None):
    rows = ""
    for k in ORDER:
        if k == expand:
            rows += card(k, on=True)
            continue
        st = runs.get(k)
        line = f'<span class="dn">{st}</span>' if st else f'<span>{ST[k]["n"]} of its cards · 2 credits</span>'
        rows += (f'<div class="ucr{" on" if k == sel else ""}"><span class="md">{glyph(k, 16)}</span><span class="tx"><b>{ST[k]["name"]}</b>{line}</span>'
                 '<span class="rd"></span></div>')
    return f'<div class="ucp">{rows}</div>'


def section(inner, aside="pick a direction · 2 credits a run", lead=True, new=True):
    return f'<section class="up{" new9" if new else ""}">{label(aside)}{LEAD if lead else ""}{inner}</section>'


# ---------------------------------------------------------------- the page
def head(desk):
    st = '<span class="z-lkd">Link a deck</span><span class="z-st">Start with this precon</span>' if desk else ""
    return (f'<span class="z-bk">‹ Commander precons</span><div class="z-tp"><span class="z-th"><img src="{img("c-rootha.jpg")}" alt=""></span>'
            f'<div class="z-tx"><span class="z-ey">Precon decklist · read-only</span><h1>{PRE}</h1><span class="z-cm">{CMD}</span>'
            f'<span class="z-mt">{R.dots("UR")}{META}</span></div>{st}</div>'
            + R.own_band(OWN, OF, unmatched=False)
            + f'<section class="z-pov"><div class="z-lh"><span class="z-lbl">Overview</span><small>written for this precon’s list</small></div><p class="z-ovp">{OV}</p><span class="z-lk">View full overview →</span></section>')


LIST = [("Commander", "you own it", [(CMD, True, "3UR")]),
        ("Creatures", "you own 9 of 21", [("Ashling, the Limitless", True, "3R"), ("Brudiclad, Telchor Engineer", False, "4UR"), ("Crackling Drake", True, "UURR")])]


def lst():
    out = ""; k = 0
    for g, note, rows in LIST:
        out += f'<div class="z-dgp"><h4>{g}<em>{note}</em></h4>'
        for n, o, c in rows:
            out += R.rr(n, o, c, 1, "SOC " + str(10 + k * 7)); k += 1
        out += "</div>"
    return f'<div class="z-lst">{out}</div>'


def page(desk, sec):
    ln = ('<div class="z-ln"><span>' + ("By type, A–Z within each group · press a card for its details, hover for its art · each row shows the precon’s printing" if desk else "By type · press a card for its details")
          + '</span><span class="z-vt"><span class="on">List</span><span>Cards</span></span></div>')
    return f'<div class="z-pp"><div class="z-phd">{head(desk)}{sec}{ln}</div>{lst()}</div>'


DOCK = (f'<div class="z-dock"><small>{PRE} · 100 cards · you own {OWN} of {OF}</small>'
        '<div class="z-row2"><span class="z-l">Link a deck</span><span class="z-s">Start with this precon</span></div></div>')


def ph_full(sec):
    return kit.phone(page(False, sec), "Decks", over=DOCK + '<div class="vfx"></div>')


def dk_full(sec, h=None):
    return kit.desk(page(True, sec), "Decks", h=h, over='<div class="vfx"></div>')


def ph_at(sec, over="", dock=True, extra_h=None):
    """The phone scrolled to the section: the app header, then the section."""
    inner = f'<p class="vtop">↑ the head, You own and the Overview</p><div style="padding:6px 16px 170px;display:flex;flex-direction:column;gap:12px">{sec}</div>'
    return kit.phone(inner, "Decks", h=extra_h, over=(DOCK if dock else "") + over)


def dk_at(sec, over="", h=None):
    inner = (f'<div class="z-pp"><div class="z-phd" style="border-bottom:0">{head(True)}{sec}</div></div>')
    return kit.desk(inner, "Decks", h=h, over='<div class="vfx"></div>' + over)


def note(title, items, ordered=False):
    t = "ol" if ordered else "ul"
    return f'<div class="bnote"><h4>{title}</h4><{t}>' + "".join(f"<li>{x}</li>" for x in items) + f"</{t}></div>"


def sec(t):
    return f'<div class="sec9">{t}</div>'


# ================================================================ boards
def b_main():
    calls = [
        "<b>Entry: a section on the open precon page, under the Overview, above the list-note line.</b> Phone and desktop alike: the Overview says what the deck does, and the next thing the page offers is where to take it. "
        "The head’s Start and Link a deck, the own box and the view switch do not move. Label <code>Upgrade this precon</code> in the Overview’s label style; one lead sentence; the strategy cards; one press. "
        "Not drawn on an early list (view-only, no Start), with the switch off, or for a precon with no Overview yet when it backs nothing (empty state below).",
        "<b>The picker is the strategy cards themselves, nothing pre-selected.</b> Each card: the shipped strategy glyph on a medallion, the name, <code>N of its cards</code>, one plain sentence of what this deck does with it, "
        "three of its own cards as art with names (each opens card details), <code>and N more</code>. Pressing a card selects it (radio ring, accent edge); pressing it again unselects. Three in a row on desktop, stacked on a phone. "
        "One backed strategy: one card, still a pick. None: a dashed line saying why, and no press.",
        "<b>The Overview’s own plan is marked, as a source, not a recommendation:</b> a foot line <code>the Overview’s read</code> in mono faint, the same weight as <code>N of its cards</code>. "
        "The player has just read that paragraph above; the line tells them this card is the same idea, so they don’t read it as a fourth one. It is never first by rule, never accented, and never selected.",
        "<b>The credit confirm is the press, asked once.</b> The press names the strategy (<code>Upgrade toward Artifacts</code>), and its line carries the range and the cost (<code>12 to 18 swaps · uses 2 credits · …</code>), "
        "so the chosen strategy, 2 credits and 12 to 18 are in front of the player as they press. No dialog for a first run. The one ask is v2’s same-inputs rule: running a strategy already run on this precon asks once, inline.",
        "<b>The wait is v2’s clock, short:</b> the press row becomes the clock box (<code>0:04 · Finding swaps toward Artifacts · usually about 6 seconds</code>), the other cards dim and hold, three skeleton rows below. No streaming: one call lands the set whole.",
        "<b>Results, in place under the picker:</b> a head with the glyph and <code>14 swaps toward Artifacts</code>, then one mono line: <code>bracket 2 → 3 · Upgraded</code> (v2’s bar wording), <code>10 to buy · $28.90 · each under $12</code>, <code>4 you own</code>, the date. "
        "Pairs are grouped by the theme the cut came from (<code>Cuts from Spells 12</code>, <code>Cuts from Tokens 2</code>), which shows the rule at a glance. "
        "Each pair is the page’s own read-only DecklistRow twice, out then in (side by side with an arrow on desktop), owned dot and cost on both, the add’s price at the right or <code>you own it</code>, one reason under. Every name opens card details.",
        "<b>No Pick toggle.</b> Pairs come as a set: a cut’s slot is filled by its own add, so a picked half-set would leave the deck off 100 or keep a cut with nothing in its place. "
        "Taking the set or starting over is the honest choice, and the 12-to-18 floor is part of what was paid for.",
        "<b>After results (the open call): Start the deck with the swaps applied.</b> <code>Start the deck with these 14 swaps</code> opens S1 with its facts updated. Why: a read-only list leaves a new owner retyping 28 changes, which is the job they paid for; "
        "the started deck links to the precon, so v0 is still the box as it came and v1’s diff shows exactly the 14 swaps (R3 K10); and nothing is applied to anything that already exists. The head’s Start stays as it is, for the box unchanged.",
        "<b>Another strategy:</b> once a result exists, the cards fold to one row each (glyph, name, status: <code>14 swaps · Nov 10</code> or <code>N of its cards · 2 credits</code>). "
        "Selecting a run one shows its stored result at no cost; selecting an unrun one opens its card and the press, whose line says <code>Another upgrade · … · uses 2 credits · Artifacts stays here</code>. Every kept result stays one press away.",
    ]
    gaps = [
        "<b>G1 · Short runs are not stored as results.</b> <code>readUpgrades</code> returns only done, unrefunded runs, and a short run is refunded (<code>charge.ts</code>). The board shows a short result as kept and startable; "
        "engineering either keeps refunded-short runs readable (recommended) or the short state says it isn’t kept.",
        "<b>G2 · The buy total.</b> <code>buyTotalCents</code> sums every add. The head counts only adds the player doesn’t own (<code>10 to buy · $28.90</code>), as Shopping does; ownership is read at draw time, so the stored total isn’t the shown one.",
        "<b>G3 · Strategy glyphs.</b> Detection keys on EDHREC slugs (<code>detect.ts</code>), the glyphs on strategy keys (<code>strategy-icon.tsx</code>). Slugs with no glyph draw the shipped dashed fallback; a slug → glyph map is owed.",
        "<b>G4 · Blurb copy.</b> <code>detect.ts</code>’s fixed blurbs are generic (“Play many artifacts and reward each one.”). The brief asks for what <i>this deck</i> does with it, for someone who has never played it. Drawn sentences are deck-specific and DRAFT; either the blurbs gain a commander-aware form or the generic ones ship. /copy-review.",
        "<b>G5 · Start with swaps</b> needs <code>createDeckFromPrecon</code> to take a run id and apply its pairs to the draft, linking the deck so v0 stays the box. The I own this precon box still adds the box’s 100 cards and tokens.",
        "<b>G6 · Bracket after.</b> <code>bracket_after</code> may come back equal; the line then reads <code>bracket stays 2 · Core</code> (v2’s wording), drawn on the short state.",
    ]
    body = (board_head("Upgrade this precon · the calls · 390 and 1300", "Pick a direction, then take the swaps",
                       "Hugh’s five rulings are closed: the player picks the direction (nothing pre-selected), strategies come from stored data, one run is one checked call, "
                       "12 to 18 swaps with cuts from the other themes and no added card over $12, 2 credits a run. These are Design’s calls. Fixture: <b>Prismari Artistry</b> (Rootha, UR), "
                       "illustrative, as earlier precon rounds; you own 41 of 85. Copy marked DRAFT goes through /copy-review. Dashed outlines mark what is new on a shipped page.")
            + note("Design calls", calls, True) + note("Gaps for engineering", gaps)
            + frames(frame("<b>The section</b> · 1300 · fresh", dk_full(section(cards(ORDER) + act()), h=1180),
                           "Under the Overview, above the list-note line. Nothing selected; the press waits for a pick.")))
    return doc("Upgrade calls", body, 1300 + 112)


def b_entry():
    body = (board_head("1 · Entry · three, one and no strategy", "Where the upgrade starts",
                       "The section sits between the Overview and the list. Three backed strategies draw three cards; one draws one card, still a pick; none draws a dashed line and no press. Nothing is ever selected on arrival.")
            + sec("E1 · Three strategies")
            + frames(frame("<b>E1</b> · 390 · scrolls", ph_full(section(cards(ORDER) + act())),
                           "Stacked cards. The dock stays the head’s Start and Link a deck."), gap=36)
            + frames(frame("<b>E1</b> · 1300", dk_full(section(cards(ORDER) + act()), h=1180)))
            + sec("E2 · One strategy · E3 · None")
            + frames(frame("<b>E2</b> · 390 · one backed strategy", ph_at(section(cards(["spells"]) + act(), aside="pick a direction · 2 credits a run")),
                           "Only Spells has 5 or more of the deck’s own cards behind it. One card, unselected: the player still chooses to spend."),
                     frame("<b>E3</b> · 390 · nothing backed", ph_at(section('<div class="uem"><b>No direction to upgrade toward yet</b><p>This precon’s cards don’t lean far enough into one strategy for an upgrade to aim at.'
                                                                           + DRAFT + '</p></div>', aside="pick a direction", lead=False)),
                           "No cards, no press, no credit line. The label stays so the page reads the same for every precon."), gap=36)
            + frames(frame("<b>E2</b> · 1300", dk_at(section(cards(["spells"], cls="one") + act()), h=900),
                           "One card keeps a third’s width (420 at most), left-aligned, so it doesn’t read as a banner.")))
    return doc("Entry", body, 1300 + 112)


def b_pick():
    body = (board_head("2 · The picker and the credit confirm", "Select a direction, then press once",
                       "Pressing a card selects it; pressing it again unselects it. The press names the pick and its line carries the range and the 2 credits: that is the confirm for a first run. "
                       "Out of credits, or holding only the free credit, the press is off and the shipped lines say why.")
            + sec("P1 · Selected")
            + frames(frame("<b>P1</b> · 390 · Artifacts selected", ph_at(section(cards(ORDER, sel="artifacts") + act("artifacts"))),
                           "Accent edge and filled ring on the pick. The press reads <code>Upgrade toward Artifacts</code>; its line: range, 2 credits, which lot pays."))
            + frames(frame("<b>P1</b> · 1300", dk_at(section(cards(ORDER, sel="artifacts") + act("artifacts")), h=900),
                           "Pressing Artifacts again unselects it and the press returns to E1’s <code>Upgrade</code>, off."))
            + sec("P2 · Out of credits · P3 · One credit only · P4 · Signed out")
            + frames(frame("<b>P2</b> · 390 · none left", ph_at(section(cards(ORDER, sel="artifacts") + act("artifacts", "spent"))),
                           "The shipped spent line and <code>Get more credits</code>. The pick is kept."),
                     frame("<b>P3</b> · 390 · only the free credit", ph_at(section(cards(ORDER, sel="artifacts") + act("artifacts", "one"))),
                           "One lot funds a run, and the free daily credit is 1, so it can’t pay for an upgrade alone. Said before the press, as v2’s 2-credit rule does."),
                     frame("<b>P4</b> · 390 · back from sign-in", ph_at(section(cards(ORDER, sel="artifacts") + act("artifacts"))),
                           "The page needs a session. A press after it lapsed goes to the shipped sign-in and returns here with the pick kept (<code>?upgrade=artifacts</code>), not spent; the player presses again."),
                     gap=36))
    return doc("Picker", body, 1300 + 112)


def b_run():
    body = (board_head("3 · The wait and a failed run", "About six seconds, then the set",
                       "v2’s clock in the press row’s place. The other cards dim and hold their place; the picked one stays lit. Leaving the page doesn’t stop it. A failure gives both credits back and keeps the pick for Try again.")
            + sec("W · Waiting")
            + frames(frame("<b>W</b> · 390 · 0:04", ph_at(section(cards(ORDER, sel="artifacts", dim=True) + wait("artifacts")))),
                     frame("<b>W</b> · 1300", dk_at(section(cards(ORDER, sel="artifacts", dim=True) + wait("artifacts")), h=1000),
                           "Three skeleton rows stand where the pairs land. No streaming: the set arrives whole."), gap=36)
            + sec("F · Failed, refunded whole")
            + frames(frame("<b>F</b> · 390", ph_at(section(cards(ORDER, sel="artifacts") + failed("artifacts")))),
                     frame("<b>F</b> · 1300", dk_at(section(cards(ORDER, sel="artifacts") + failed("artifacts")), h=900),
                           "The shipped failed line, mono 11 <code>--danger</code>, under the press, which becomes <code>Try again</code> with the same line of cost. Nothing on the page names what failed inside."), gap=36))
    return doc("Wait and failed", body, 1300 + 390 + 36 + 112)


RUNS1 = {"artifacts": "14 swaps · Nov 10"}


def b_results():
    res_d = section(compact("artifacts", RUNS1) + results(), lead=False)
    res_p = section(compact("artifacts", RUNS1) + results(n_show=6), lead=False)
    short_pairs = TOKEN_PAIRS
    short = section(compact("tokens", {"tokens": "9 swaps · Nov 10"}) + results("tokens", short_pairs, short=True, n_show=5), lead=False)
    body = (board_head("4 · Results", "Fourteen swaps toward Artifacts",
                       "The cards fold to one row each and the result opens under them. The head gives the bracket move, what the buys cost and what you already own. "
                       "Pairs group by the theme the cut came from. Each half is the page’s own row; every name opens card details. No Pick: the set or nothing.")
            + sec("R1 · Fourteen swaps")
            + frames(frame("<b>R1</b> · 1300 · the whole set", dk_at(res_d, h=2160),
                           "Out on the left, in on the right. The add’s price sits where the row’s printing would; an owned add says <code>you own it</code> and adds nothing to the total. "
                           "<code>Start the deck with these 14 swaps</code> is the one primary; <code>Run Artifacts again</code> asks once (board 6)."))
            + frames(frame("<b>R1</b> · 390 · scrolls", ph_at(res_p),
                           "The two rows stack, out then in, with the reason under. The Start press sits at the result’s foot; the dock keeps the box’s Start."),
                     frame("<b>R2</b> · 390 · short, 9 swaps", ph_at(short),
                           "Under 12: counted and honest. Both credits back, the bracket line says it stays, and the 9 can still start a deck. See G1: today a short run isn’t stored."), gap=36))
    return doc("Results", body, 1300 + 112)


def sdl(desk):
    x = '<span class="x">✕</span>'
    return (f'<div class="scrim"></div><div class="sdl"><span class="gr"></span><div class="tt"><h2>Start a deck from {PRE}</h2>{x}</div>'
            f'<div class="cmd"><img src="{img("c-rootha.jpg")}" alt=""><span><b>{CMD}</b><span>UR · 99 cards beside it</span></span></div>'
            f'<label class="fl"><span>Deck name</span><i>{PRE}</i></label>'
            '<div class="ck"><i></i>I own this precon. Add its cards and tokens to my collection.</div>'
            f'<p class="sw new9">With the 14 swaps toward Artifacts. The precon as it came stays your deck’s v0, so you can always see what changed.{DRAFT}</p>'
            '<div class="facts">'
            '<div class="fc"><span>Cards</span><em>all 100 · 14 swapped</em></div>'
            '<div class="fc"><span>Bracket</span><em>2 → 3 · Upgraded</em></div>'
            '<div class="fc"><span>You own</span><em>39 of 85 · basic lands not counted</em></div>'
            '<div class="fc"><span>Printings</span><em>this precon’s copies; yours for the 14 added</em></div></div>'
            '<div class="bt"><span class="c">Cancel</span><span class="s">Start the deck</span></div></div>')


def b_start():
    body = (board_head("5 · After results · Start the deck with the swaps", "S1, with the swaps in it",
                       "The open call, settled: the swaps go into a new draft through the shipped Start dialog. One sentence says what is different and that v0 keeps the box; the facts gain Bracket and count the swaps. "
                       "Start the deck lands on Your deck with the shipped arrival strip; Versions shows v0 the box and the draft’s 14 swaps against it.")
            + frames(frame("<b>S1</b> · 390 · sheet", ph_at(results(n_show=2), over=sdl(False), dock=False, extra_h=844),
                           "The shipped sheet: no ✕ on a phone, Cancel and Start the deck at the foot."),
                     frame("<b>S1</b> · 1300 · dialog", kit.desk(f'<div class="z-pp"><div class="z-phd" style="border-bottom:0">{head(True)}</div></div>', "Decks", h=760, over=sdl(True)),
                           "<code>You own</code> counts the deck as started: 41, less the 6 owned cuts, plus the 4 owned adds."), gap=36)
            + note("Why start, not a read-only list", [
                "A new owner asked for an upgraded deck and paid 2 credits for it. A read-only list hands them 28 changes to make by hand on a deck that doesn’t exist yet.",
                "Nothing existing is touched: the swaps go into a new draft only, and the precon page’s own Start still makes the box unchanged.",
                "The draft is linked to the precon (R3), so v0 stays the box and v1’s diff is exactly these swaps. The player can see and undo any of them on Your deck with the shipped tools.",
                "The result stays on the precon page after Start, so a second deck (or a friend’s) can start from the same set without another run.",
            ]))
    return doc("Start with swaps", body, 1300 + 390 + 36 + 112)


def b_another():
    runs2 = {"artifacts": "14 swaps · Nov 10"}
    a1 = section(compact("tokens", runs2, expand="tokens") + act("tokens", "again"), lead=False)
    a2 = section(compact("artifacts", {"artifacts": "14 swaps · Nov 10", "tokens": "15 swaps · Nov 10"}) + results(n_show=3, foot=False), lead=False)
    a3 = section(compact("artifacts", runs2) + results(n_show=2, ask=True), lead=False)
    body = (board_head("6 · Running another strategy", "Each direction is its own run",
                       "After a result the cards are one row each. A run direction shows its swaps and date and opens its result free; an unrun one opens its card and the press, at 2 credits again. "
                       "Running the same direction again asks once, as v2 asks on the same request.")
            + frames(frame("<b>A1</b> · 390 · Tokens selected", ph_at(a1),
                           "Tokens opens to its full card in its row’s place, so the player reads what it means before spending. The line says the Artifacts result stays."),
                     frame("<b>A2</b> · 390 · two kept", ph_at(a2),
                           "Both rows carry their results; selecting one swaps the result in place. No cost, no wait."),
                     frame("<b>A3</b> · 390 · Run Artifacts again", ph_at(a3),
                           "The ask replaces the foot: <code>Run it again</code> spends; <code>Keep Nov 10’s</code> closes it. The new run, when it lands, replaces Nov 10’s as this direction’s result."), gap=36)
            + frames(frame("<b>A1</b> · 1300", dk_at(section(compact("tokens", runs2) + cards(["tokens"], sel="tokens", cls="one") + act("tokens", "again"), lead=False), h=960),
                           "Desktop keeps the three rows in one line, as the cards were, and opens the selected card under them. On a phone it opens in its own row’s place.")))
    return doc("Another strategy", body, 1300 + 112)


BOARDS = [("Main", b_main, "Upgrade this precon · the calls"), ("Entry", b_entry, "1 · Entry"), ("Picker", b_pick, "2 · The picker and the confirm"),
          ("Wait", b_run, "3 · The wait and a failed run"), ("Results", b_results, "4 · Results"), ("Start", b_start, "5 · Start with the swaps"),
          ("Another", b_another, "6 · Another strategy")]
