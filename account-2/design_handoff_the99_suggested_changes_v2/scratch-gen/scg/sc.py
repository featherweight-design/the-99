"""Suggested changes v2 R1 (account 2, 2026-10-28): the pieces.

Drawn over the shipped Tuning hub (tuning-hub.tsx, tuning-panel.tsx, tuning-limits-box.tsx, tuning-notes-field.tsx,
tuning-history.tsx) in Low Sun tokens. Rows are the shipped two-list line (graph.line, from tuning-panel.tsx), with
Add/Reject replaced by one Pick toggle. Fixture: HD - Half Shell, Heroes in a Half Shell (five colors, so every card
is legal), 99 + 1, Core, focus +1/+1 counters. Every card image is a real card from earlier rounds' captures.
"""
import kit
import parts as P
from kit import img

P.LOCAL.update({"b2": "art/bracket-2-core-ink.svg", "b1": "art/bracket-2-core-ink.svg"})

# ---------------------------------------------------------------- fixture
CMDR = "Heroes in a Half Shell"
DECK = "HD - Half Shell"
FOCUS = "+1/+1 counters"
REQ10 = ("More removal, and lean into the counters. Cut the legends that never attack.")
REQ3 = "Cut the clunky stuff for cheaper threats."
REQ20 = "Rebuild around the counters: more ways to grow the team, and cut every legend that isn’t a Turtle or a payoff."

# (key, name, role, owned, price, why, cites[, flag])
ADDS = [
    ("swords", "Swords to Plowshares", "removal", True, None, "One mana, instant, and it answers any creature. The deck runs 6 removal of a target 10.",
     [("you asked", "more removal"), ("mix", "removal 6 of 10")]),
    ("avabruck-caretaker", "Avabruck Caretaker", "other", False, "$0.89", "Two +1/+1 counters on another creature every combat, with hexproof on itself.",
     [("focus", "+1/+1 counters 14 → 15"), ("you asked", "lean into the counters")]),
    ("path", "Path to Exile", "removal", True, None, "The other one-mana answer that hits anything, at instant speed.",
     [("you asked", "more removal"), ("mix", "removal 6 of 10")]),
    ("arlinn", "Arlinn, the Pack’s Hope", "other", False, "$1.40", "Gives the team flash and makes two bodies a turn for the counters to land on.",
     [("focus", "+1/+1 counters 15 → 16")]),
    ("heartless-act", "Heartless Act", "removal", True, None, "Kills a creature with no counters, or strips three from one that has them.",
     [("you asked", "more removal"), ("games", "lost to a big blocker in 2 of 4")]),
    ("avenger-of-zendikar", "Avenger of Zendikar", "other", False, "$1.85", "A board of Plants, and every land after it grows each one.",
     [("focus", "+1/+1 counters 16 → 17"), ("list", "39 lands of 99")]),
    ("atreus", "Atreus, Impulsive Son", "draw", True, None, "Draws a card a turn once the experience counters stack up.",
     [("mix", "draw 7 of 10")]),
    ("searing-touch", "Searing Touch", "removal", False, "$0.25", "A cheap answer to small creatures that comes back for more.",
     [("you asked", "more removal")]),
    ("all-will-be-one", "All Will Be One", "other", False, "$1.20", "Every counter you put down also deals that much damage.",
     [("focus", "+1/+1 counters 17 → 18")]),
    ("zimone", "Zimone, Infinite Analyst", "draw", True, None, "Grows on the first spell each turn and draws off it.",
     [("mix", "draw 7 of 10"), ("note", "“ran out of cards by turn 7”")]),
    ("counterspell", "Counterspell", "removal", True, None, "Two mana, and the answer to the wipe that ends your board.",
     [("games", "board wiped in 2 of 4")]),
    ("captain-america", "Captain America, Team Leader", "other", False, "$1.10", "Puts a +1/+1 counter on the team each time a creature joins it.",
     [("focus", "+1/+1 counters 18 → 19")]),
    ("gleaming-splendor", "Gleaming Splendor", "ramp", False, "$31.05", "A Treasure each turn an opponent draws twice.",
     [("mix", "ramp 8 of 10")]),
    ("all-is-dust", "All Is Dust", "wipes", False, "$4.50", "Clears every colored permanent but your lands. The deck runs 1 wipe of a target 3.",
     [("mix", "wipes 1 of 3")]),
    ("alrund", "Alrund, God of the Cosmos", "draw", True, None, "Card advantage every turn from the top of the library.",
     [("mix", "draw 7 of 10")]),
    ("polyraptor", "Polyraptor", "other", False, "$1.95", "A body that copies itself when it’s dealt damage.",
     [("list", "11 creatures with trample of 99")]),
    ("ghalta", "Ghalta, Primal Hunger", "other", True, None, "Cheap with a wide board, and twelve trampling power for the counters to sit on.",
     [("focus", "+1/+1 counters 19 → 20")]),
    ("mystical-tutor", "Mystical Tutor", "other", False, "$6.80", "Finds the instant that saves the board.",
     [("you asked", "more removal")], True),
    ("jace", "Jace, Multiverse Architect", "draw", False, "$0.70", "Draws on arrival and keeps drawing each turn it’s defended.",
     [("mix", "draw 7 of 10")]),
    ("swan-song", "Swan Song", "removal", True, None, "One mana answer to the wipe or the combo piece.",
     [("games", "board wiped in 2 of 4")]),
    ("quintorius", "Quintorius, History Chaser", "other", False, "$0.55", "Turns cards leaving the graveyard into Spirits.",
     [("list", "4 recursion of 99")]),
    ("jasmine-tea-shop", "Jasmine Dragon Tea Shop", "land", False, "$0.40", "Any color for the creatures, and a land that makes a body late.",
     [("mix", "lands 36 of 37")]),
    ("bard-king-of-dale", "Bard, King of Dale", "draw", False, "$0.30", "Turns extra draws into tempo while the team attacks.",
     [("mix", "draw 7 of 10")]),
    ("brudiclad", "Brudiclad, Telchor Engineer", "other", False, "$0.95", "Turns every token into a copy of the biggest one each combat.",
     [("list", "12 token makers of 99")]),
    ("firebending-lesson", "Firebending Lesson", "removal", True, None, "A cheap burn spell that scales when kicked.",
     [("you asked", "more removal")]),
    ("beorn", "Beorn the Fierce", "other", False, "$0.35", "Trample and a counter every combat.",
     [("focus", "+1/+1 counters 20 → 21")]),
    ("ajani-unrelenting", "Ajani Unrelenting", "other", False, "$2.40", "A planeswalker that puts counters on the team each turn.",
     [("focus", "+1/+1 counters 21 → 22")]),
    ("miku", "Miku, Song of the People", "other", False, "$0.60", "Life and a counter whenever a creature enters.",
     [("focus", "+1/+1 counters 22 → 23")]),
    ("moonmist", "Moonmist", "other", True, None, "A fog for the turn they swing back, so the board survives.",
     [("games", "lost the board on the swing back in 1 of 4")]),
    ("lathliss", "Lathliss, Dragon Queen", "other", False, "$1.75", "A flier that grows every Dragon that joins it.",
     [("list", "3 fliers of 99")]),
]

CUTS = [
    ("flickering-hound", "Flickering Hound", "other", "Pays off on creature spells, and the deck casts most of its 31 from the command zone and play.",
     [("list", "on none of the top 5")]),
    ("bloodline-keeper", "Bloodline Keeper", "other", "A Vampire payoff in a deck with 2 Vampires of 99.",
     [("list", "on none of the top 5"), ("you asked", "legends that never attack")]),
    ("wizards-staff", "Wizard’s Staff", "other", "Equipment that pays off on Wizards, and the deck runs four.",
     [("list", "4 Wizards of 99")]),
    ("gisa", "Ghoulcaller Gisa", "other", "Sacrifices the creatures the counters are on, to make Zombies.",
     [("you asked", "legends that never attack")]),
    ("assimilation-aegis", "Assimilation Aegis", "removal", "Five mana across two turns to do what one-mana removal does.",
     [("mix", "removal 6 of 10")]),
    ("giada", "Giada, Font of Hope", "other", "An Angel payoff with 3 Angels of 99.",
     [("list", "on none of the top 5"), ("you asked", "legends that never attack")]),
    ("cemetery-prowler", "Cemetery Prowler", "other", "Its discount needs creature cards in graveyards, and nothing here puts them there.",
     [("list", "on none of the top 5")]),
    ("zada", "Zada, Hedron Grinder", "other", "Copies targeted spells onto Goblins, and the deck runs 2 Goblins of 99.",
     [("you asked", "legends that never attack")]),
    ("auntie-ool", "Auntie Ool, Cursewretch", "removal", "Blights creatures slowly; the deck wants them gone now.",
     [("mix", "removal 6 of 10")]),
    ("card-sai", "Sai, Master Thopterist", "draw", "Draws only by sacrificing artifacts, and the deck holds 9 of 99.",
     [("list", "9 artifacts of 99")]),
    ("cayth", "Cayth, Famed Mechanist", "other", "Servos and proliferate, when the Turtles already grow themselves.",
     [("you asked", "legends that never attack")]),
    ("dina", "Dina, Essence Brewer", "other", "A sacrifice engine in a deck that wants every body on the board.",
     [("list", "on none of the top 5")]),
    ("doctor-doom", "Doctor Doom, King of Latveria", "other", "Discard payoff in a deck with 1 discard outlet of 99.",
     [("you asked", "legends that never attack")]),
    ("killian", "Killian, Decisive Mentor", "draw", "Draws off Auras, and the deck runs 2 of 99.",
     [("list", "2 Auras of 99")]),
    ("invisible-woman", "Invisible Woman", "other", "A wall-maker for a deck that attacks every turn.",
     [("list", "on none of the top 5")]),
    ("samut", "Samut, Tyrant of Naktamun", "other", "Split second for instants and sorceries, and the deck runs 14.",
     [("you asked", "legends that never attack")]),
    ("rootha", "Rootha, Mastering the Moment", "draw", "A spells payoff in a creature deck.",
     [("list", "14 instants and sorceries of 99")]),
    ("hakoda", "Hakoda, Selfless Commander", "other", "Pays off on Allies, and the deck runs 5 of 99.",
     [("list", "5 Allies of 99")]),
    ("sokka", "Sokka, Tenacious Tactician", "other", "Ally tokens from noncreature spells: off the plan.",
     [("list", "on none of the top 5")]),
    ("appa-loyal", "Appa, Loyal Sky Bison", "other", "A flier that wants Allies around it.",
     [("you asked", "legends that never attack")]),
    ("appa-steadfast", "Appa, Steadfast Guardian", "other", "Flash protection for Allies the deck barely has.",
     [("list", "5 Allies of 99")]),
    ("aang-swift-savior", "Aang, Swift Savior", "other", "Airbends one creature a turn and never connects.",
     [("you asked", "legends that never attack")]),
    ("fire-lord-zuko", "Fire Lord Zuko", "other", "Pays off on casting from exile, which the deck does 3 times of 99.",
     [("list", "on none of the top 5")]),
    ("avatar-aang", "Avatar Aang", "other", "Needs all four bending kinds in a turn, and the deck holds 6 of 99.",
     [("you asked", "legends that never attack")]),
    ("ashling", "Ashling, the Limitless", "other", "An Elemental engine with 3 Elementals of 99.",
     [("list", "on none of the top 5")]),
    ("alibou", "Alibou, Ancient Witness", "other", "Pays off on artifact creatures, and the deck runs 4 of 99.",
     [("list", "4 artifact creatures of 99")]),
    ("tchalla", "T’Challa, the Black Panther", "removal", "Removal only off an artifact spell, and the deck casts 9.",
     [("mix", "removal 6 of 10")]),
]

TYPE_OF = {
    "swords": "inst", "avabruck-caretaker": "cre", "path": "inst", "arlinn": "pw", "heartless-act": "inst", "avenger-of-zendikar": "cre",
    "atreus": "cre", "searing-touch": "inst", "all-will-be-one": "ench", "zimone": "cre", "counterspell": "inst", "captain-america": "cre",
    "gleaming-splendor": "art", "all-is-dust": "sorc", "alrund": "cre", "polyraptor": "cre", "ghalta": "cre", "mystical-tutor": "inst",
    "jace": "pw", "swan-song": "inst", "quintorius": "cre", "jasmine-tea-shop": "land", "bard-king-of-dale": "cre", "brudiclad": "cre",
    "firebending-lesson": "sorc", "beorn": "cre", "ajani-unrelenting": "pw", "miku": "cre", "moonmist": "inst", "lathliss": "cre",
    "wizards-staff": "art", "assimilation-aegis": "art",
}
# The deck page's type groups, in its order (CARD_TYPE_GROUP_ORDER), with the deck's own count of each (99).
TYPES = [("cre", "Creatures"), ("inst", "Instants"), ("sorc", "Sorceries"), ("art", "Artifacts"), ("ench", "Enchantments"),
         ("pw", "Planeswalkers"), ("land", "Lands")]
TYPE_HAVE = {"cre": 34, "inst": 9, "sorc": 5, "art": 7, "ench": 6, "pw": 2, "land": 36}
GROUP_LABELS = {"type": "By type", "role": "By role"}


def type_of(k):
    return TYPE_OF.get(k, "cre")


def group_switch(on="type", ph=False):
    """The deck toolbar's grouping well (group-toggle.tsx, SegmentedSwitch), the same stored choice."""
    seg = "".join(f'<span class="{"on" if k == on else ""}">{v}</span>' for k, v in GROUP_LABELS.items())
    return f'<div class="gsw"><span class="gl">Group</span><div class="gw">{seg}</div></div>'


ROLES = [("removal", "Removal"), ("draw", "Draw"), ("ramp", "Ramp"), ("wipes", "Wipes"), ("land", "Land"), ("other", "Threats & synergy")]
HAVE = {"removal": (6, 10), "draw": (7, 10), "ramp": (8, 10), "wipes": (1, 3), "land": (36, 37), "other": (31, None)}

CREDIT = "Uses a credit. 4 of 5 left · next one at 14:20."
OWN_DOT = '<span class="od2"></span>'


def bchip2(b=2, name="Core"):
    ink = {1: "var(--fg-muted)", 2: "var(--fg-body)", 3: "var(--bracket-3)", 4: "var(--bracket-4)"}[b]
    key = {1: "b2", 2: "b2", 3: "b3", 4: "b4"}[b]
    return (f'<span class="bc" style="color:{ink};background:color-mix(in oklab,{ink} 12%,var(--bg));'
            f'box-shadow:inset 0 0 0 1px color-mix(in oklab,{ink} 55%,transparent)"><img src="{img(key)}" alt="">{name}</span>')


# ---------------------------------------------------------------- CSS
CSS = r"""
.sc{display:flex;flex-direction:column;gap:16px}
.sc h3{margin:0;font:400 19px 'Cinzel',serif;color:var(--fg);font-variant:small-caps}
.ph .sc h3{font-size:17px}
.sc .hrow2{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.sc .hrow2 h3{flex:1}
.sc .lead{font-size:13px;line-height:1.6;color:var(--fg-body);max-width:760px}
.sc .lead b{color:var(--fg);font-weight:600}
.nb{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border-radius:7px;border:1px solid var(--accent);color:var(--accent);font:600 12.5px 'IBM Plex Sans';white-space:nowrap}
.ph .nb{height:44px}
.stp{display:flex;flex-direction:column;gap:10px}
.stp .sth{display:flex;align-items:baseline;gap:9px}
.stp .sth .n{font:600 11px 'IBM Plex Mono';color:var(--accent);flex:none}
.stp .sth .t{font-size:14px;font-weight:600;color:var(--fg)}
.stp .sth .s{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.ph .stp .sth{flex-wrap:wrap}
.ph .stp .sth .s{flex-basis:100%;padding-left:20px}
.cnt2{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.stpr{display:flex;align-items:center;height:40px;border-radius:9px;border:1px solid var(--border-strong);background:var(--surface);overflow:hidden}
.ph .stpr{height:44px}
.stpr span{width:40px;height:100%;display:flex;align-items:center;justify-content:center;font:15px 'IBM Plex Mono';color:var(--fg-body)}
.ph .stpr span{width:44px}
.stpr span.dis{color:var(--fg-disabled)}
.stpr b{min-width:44px;height:100%;display:flex;align-items:center;justify-content:center;font:600 16px 'IBM Plex Mono';color:var(--fg);border-left:1px solid var(--border);border-right:1px solid var(--border)}
.cnt2 .ex{font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.cnt2 .ex b{color:var(--fg);font-weight:600}
.cnt2 .ex .mt{font-size:10.5px;color:var(--fg-faint)}
.rq{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:18px;align-items:start}
.ph .rq{grid-template-columns:1fr;gap:12px}
.ta{border-radius:9px;border:1px solid var(--border-strong);background:var(--surface);min-height:112px;padding:10px 12px;font-size:14px;line-height:1.55;color:var(--fg);display:flex;flex-direction:column}
.ta.focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 18%,transparent)}
.ta .ph0{color:var(--fg-placeholder,#6E6654)}
.ta .tx{flex:1}
.ta .tx .add{background:color-mix(in oklab,var(--accent) 16%,transparent);border-radius:3px;box-shadow:0 0 0 2px color-mix(in oklab,var(--accent) 16%,transparent)}
.ta .tx .car{display:inline-block;width:1.5px;height:17px;background:var(--accent);vertical-align:-3px;margin-left:1px}
.ta .ft2{display:flex;align-items:center;gap:10px;margin-top:8px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.ta .ft2 .tg{border:1px solid var(--border-strong);border-radius:6px;padding:2px 7px;color:var(--fg-muted)}
.ta .ft2 .c{margin-left:auto}
.ntc{display:flex;flex-direction:column;gap:8px}
.ntc .nh{font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.ntc .ns{font-size:12px;line-height:1.5;color:var(--fg-muted)}
.chs{display:flex;flex-direction:row;flex-wrap:wrap;gap:6px}
.chp{display:flex;align-items:center;gap:8px;min-height:40px;border-radius:9px;border:1px solid var(--border-strong);background:var(--surface-sunken);padding:6px 10px;font-size:12.5px;line-height:1.35;color:var(--fg-body)}
.ph .chp{min-height:44px}
.chp .k{font:9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-locked);flex:none}
.chp .pl{margin-left:auto;font:14px 'IBM Plex Mono';color:var(--accent);flex:none;padding-left:4px}
.chp.used{border-style:dashed;background:transparent;color:var(--fg-faint)}
.chp.used .pl{color:var(--success);font-size:12px}
.chp.hot{box-shadow:0 0 0 2px color-mix(in oklab,var(--accent) 45%,transparent)}
.brk{border-radius:10px;border:1.5px dashed color-mix(in oklab,var(--accent) 60%,transparent);padding:12px;display:flex;flex-direction:column;gap:9px;position:relative}
.brk .ot{position:absolute;top:-9px;right:10px;font:600 9px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:#0D0B09;background:var(--accent);border-radius:4px;padding:2px 6px}
.brk .bh2{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.brk .bh2 b{font-size:13px;font-weight:600;color:var(--fg)}
.brk .bh2 span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.brk .bo{display:flex;gap:6px;flex-wrap:wrap}
.brk .bo span{display:flex;align-items:center;gap:6px;height:36px;padding:0 10px 0 6px;border-radius:8px;border:1px solid var(--border);background:var(--surface-sunken);font-size:12.5px;color:var(--fg-muted)}
.ph .brk .bo span{height:44px}
.brk .bo span img{width:20px;height:20px}
.brk .bo span.on{border-color:var(--accent);background:var(--elevated);color:var(--fg);font-weight:600}
.brk .bn{font-size:12px;line-height:1.5;color:var(--fg-muted)}
.lim{display:flex;flex-direction:column;gap:14px;border-radius:10px;border:1px solid var(--border);background:var(--surface-sunken);padding:14px}
.dkm .lim{display:grid;grid-template-columns:200px 200px minmax(0,320px);gap:16px;align-items:end;max-width:820px}
.lim .lh{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.dkm .lim .lh{grid-column:1/-1}
.lim .fl{display:flex;flex-direction:column;gap:6px}
.lim .fl .lh{grid-column:auto}
.lim .box{display:flex;align-items:center;gap:6px;height:40px;border-radius:9px;border:1px solid var(--border-strong);background:var(--surface);padding:0 10px;font:14px 'IBM Plex Mono';color:var(--fg)}
.lim .box .d{color:var(--fg-faint)}
.lim .box .pl0{color:#6E6654}
.lim .box .cv{margin-left:auto;color:var(--fg-faint);font-size:12px}
.lim .tg2{display:flex;gap:6px}
.lim .tg2 span{flex:1;height:40px;display:flex;align-items:center;justify-content:center;border-radius:7px;border:1px solid var(--border);background:var(--surface-sunken);font-size:13px;color:var(--fg-muted)}
.lim .tg2 span.on{border-color:var(--accent);background:var(--elevated);color:var(--fg);font-weight:600}
.send{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px}
.ph .send{flex-direction:column;align-items:stretch}
.sbt2{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 18px;border-radius:8px;border:1px solid var(--accent);color:var(--accent);font:600 13px 'IBM Plex Sans'}
.sbt2.fill{background:var(--accent);color:#14110E}
.sbt2.dis{border-color:var(--border-strong);color:var(--fg-disabled)}
.ph .sbt2{height:44px}
.scl2{font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.ph .send .scl2{text-align:center}
.also{font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint);border-top:1px solid var(--border);padding-top:12px;display:block!important}
.also .bb2{color:var(--fg-muted);font-weight:500;display:inline!important}
.also .lk{font-size:10.5px}
.same{border-radius:10px;border:1px solid var(--border-strong);border-left:3px solid var(--accent);background:var(--elevated-hover);padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.same p{font-size:13px;line-height:1.55;color:var(--fg-body)}
.same p b{color:var(--fg)}
.same .bb{display:flex;gap:8px;flex-wrap:wrap}
.ph .same .bb>*{flex:1}
.gb2{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);color:var(--fg-muted);font:500 13px 'IBM Plex Sans'}
.ph .gb2{height:44px}
/* not at 99: the pointer inside an inert tile */
.tile .ptr{display:inline-flex;align-items:center;min-height:32px;font:11.5px 'IBM Plex Mono';color:var(--accent);text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--accent-shadow);align-self:flex-start}
.ph .tile .ptr{min-height:44px}
.tile.run{border-color:var(--accent)}
.tile .wd{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 25%,transparent)}
.drift{border-radius:10px;border:1px solid var(--border-strong);border-left:3px solid var(--warning);background:var(--elevated-hover);padding:11px 14px;font-size:12.5px;line-height:1.55;color:var(--fg-body);display:flex;flex-direction:column;gap:4px}
.drift b{color:var(--fg)}
/* the request, echoed */
.ask{border-radius:10px;border:1px solid var(--border);background:var(--surface-rail);padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.ask .k{font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.ask q{font-size:13.5px;line-height:1.55;color:var(--fg);quotes:'“' '”'}
.ask .none{font-size:13px;color:var(--fg-muted);font-style:italic}
.ask .pm{font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.ask .pm b{color:var(--fg-muted);font-weight:500}
/* the lists */
.cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}
.lcol{display:flex;flex-direction:column;gap:8px;min-width:0}
.lch{display:flex;align-items:center;gap:10px;min-height:32px;position:sticky;top:0}
.lch h4{margin:0;font-size:14px;font-weight:600;color:var(--fg);display:flex;align-items:baseline;gap:7px}
.lch h4 em{font:normal 11px 'IBM Plex Mono';color:var(--fg-faint)}
.cc{margin-left:auto;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;font:11px 'IBM Plex Mono';color:var(--fg-muted);border:1px solid var(--border-strong);white-space:nowrap}
.cc b{color:var(--fg);font-weight:600}
.cc.full{color:var(--success);border-color:color-mix(in oklab,var(--success) 50%,transparent)}
.cc.full b{color:var(--success)}
.lsub{font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint);margin-top:-4px}
.grh{display:flex;align-items:baseline;gap:8px;padding:8px 2px 2px;border-top:1px solid var(--border);margin-top:4px}
.grh:first-of-type{border-top:0;margin-top:0}
.grh b{font-size:12.5px;font-weight:600;color:var(--fg-body)}
.grh span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.grh span em{font-style:normal;color:var(--accent)}
.seg2{display:flex;align-items:center;border:1px solid var(--border-strong);border-radius:12px;padding:4px;gap:4px;position:sticky;top:0;background:var(--bg);z-index:3}
.seg2 span{flex:1;height:44px;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:8px;font-size:13.5px;color:var(--fg-muted)}
.seg2 span em{font:normal 11px 'IBM Plex Mono';color:var(--fg-faint)}
.seg2 span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.seg2 span.full em{color:var(--success)}
.ln2{display:flex;flex-direction:column;gap:7px;border-radius:9px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);position:relative}
.ph .ln2{gap:9px;padding:12px}
.ln2 .l1{display:flex;align-items:center;gap:9px;min-width:0}
.ln2 .sg1{width:12px;flex:none;text-align:center;font:600 14px 'IBM Plex Mono'}
.ln2 .th{width:22px;height:31px;border-radius:2.5px;object-fit:cover;flex:none;border:1px solid var(--border-strong)}
.ln2 .nm{font-size:13px;border-bottom:1px dotted var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.ln2 .nm.a{font-weight:600;color:var(--fg)}
.ln2 .nm.c{color:var(--fg-body)}
.ln2 .od2{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.ln2 .od2.no{background:transparent;border:1.5px dashed var(--fg-faint)}
.ln2 .buy{font:10px 'IBM Plex Mono';color:var(--fg-faint);border:1px solid var(--border-strong);border-radius:5px;padding:1px 6px;flex:none;white-space:nowrap}
.ln2 .pk{margin-left:auto;flex:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;min-width:78px;padding:0 12px;border-radius:7px;border:1px solid var(--accent);color:var(--accent);font:600 12.5px 'IBM Plex Sans'}
.ph .ln2 .pk{height:44px;min-width:88px}
.ln2 .pk .bx{width:13px;height:13px;border-radius:3px;border:1.5px solid currentColor}
.ln2.on{border-color:var(--accent-shadow);background:color-mix(in oklab,var(--accent) 7%,var(--surface));box-shadow:inset 3px 0 0 var(--accent)}
.ln2.on .pk{background:var(--accent);color:#14110E}
.ln2.off .pk{border-color:var(--border);color:var(--fg-disabled)}
.ln2.off{opacity:.78}
.ln2 p{margin:0;font-size:12.5px;line-height:1.55;color:var(--fg-body)}
.ln2 .cts{display:flex;flex-wrap:wrap;gap:5px}
.ln2 .ct{display:flex;align-items:baseline;gap:5px;border-radius:5px;padding:3px 7px;font:9.5px 'IBM Plex Mono';background:var(--surface-sunken);border:1px solid var(--border)}
.ln2 .ct span:first-child{text-transform:uppercase;letter-spacing:.1em;color:var(--fg-locked)}
.ln2 .ct span+span{color:var(--fg-muted)}
.ln2 .ct.fo{border:1px dashed var(--accent)}
.ln2 .ct.fo span:first-child{color:var(--accent)}
.ln2 .ct.fo span+span{color:var(--fg)}
.ln2 .ct.ya{border-color:color-mix(in oklab,var(--fact) 55%,transparent)}
.ln2 .ct.ya span:first-child{color:var(--fact)}
.ln2 .flg{font-size:12px;color:var(--fg-body);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ln2 .done{margin-left:auto;display:flex;align-items:center;gap:8px;font:600 13px 'IBM Plex Sans';color:var(--success);flex:none;height:32px;padding:0 4px}
.ln2 .done i{width:20px;height:20px;border-radius:5px;border:1.5px solid var(--success);background:color-mix(in oklab,var(--success) 16%,transparent);font:700 13px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;font-style:normal}
.ph .ln2 .done{height:44px}
.gsw{display:flex;align-items:center;gap:10px;justify-content:flex-end}
.ph .gsw{justify-content:flex-start}
.gsw .gl{font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.gw{display:flex;gap:2px;border:1px solid var(--border-strong);border-radius:9px;padding:3px}
.gw span{height:28px;padding:0 12px;display:flex;align-items:center;border-radius:6px;font-size:12.5px;color:var(--fg-muted)}
.ph .gw span{height:38px;padding:0 14px}
.gw span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.ln2.apd{background:var(--surface-rail)}
.ln2.apd .nm.c{text-decoration:line-through;text-decoration-color:var(--fg-locked)}
.ln2 .rot{margin-left:auto;font:10px 'IBM Plex Mono';color:var(--fg-faint);flex:none}
.skl{height:84px;border-radius:9px;border:1px dashed var(--border-strong);background:linear-gradient(90deg,var(--surface-sunken) 0,var(--surface) 50%,var(--surface-sunken) 100%)}
/* the apply bar */
.vp .abar::before{content:"";position:absolute;left:0;right:0;top:-72px;height:72px;background:linear-gradient(to bottom,transparent,var(--bg));pointer-events:none}
.vfade{position:sticky;bottom:0;height:96px;margin-top:-96px;flex:none;background:linear-gradient(to bottom,transparent,var(--bg));pointer-events:none;z-index:2}
.vfade::after{content:"scrolls on";position:absolute;left:0;right:0;bottom:12px;text-align:center;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.abar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-radius:11px;border:1px solid var(--border-strong);background:var(--elevated-hover);padding:10px 12px 10px 16px;position:sticky;bottom:0;box-shadow:0 -10px 24px rgba(0,0,0,.35)}
.ph .abar{border-radius:0;border-width:1px 0 0;margin:0 -16px;padding:10px 16px 12px;flex-direction:column;align-items:stretch;gap:8px}
.abar .tl{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.abar .tl .a{font:600 13px 'IBM Plex Mono';color:var(--fg);display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
.abar .tl .a .g{color:var(--success)}
.abar .tl .a .r{color:var(--avail-over-fg)}
.abar .tl .a .q{font-weight:400;font-size:11px;color:var(--fg-faint)}
.abar .tl .w{font-size:12px;line-height:1.5;color:var(--fg-muted)}
.abar .tl .w b{color:var(--fg);font-weight:600}
.abar .tl .w.warn{color:var(--warning)}
.abar .ab2{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 16px;border-radius:8px;background:var(--accent);color:#14110E;font:600 13px 'IBM Plex Sans';white-space:nowrap}
.ph .abar .ab2{height:44px}
.abar .ab2.dis{background:transparent;border:1px solid var(--border-strong);color:var(--fg-disabled)}
.abar.done{border-left:3px solid var(--success)}
.abar .ub2{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);color:var(--fg-body);font:500 13px 'IBM Plex Sans'}
.ph .abar .ub2{height:44px}
/* short run */
.shrt{border-radius:10px;border:1px solid var(--border-strong);border-left:3px solid var(--warning);background:var(--elevated-hover);padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.shrt .h{font-size:13.5px;font-weight:600;color:var(--fg)}
.shrt p{font-size:12.5px;line-height:1.55;color:var(--fg-body)}
.shrt .m{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);display:flex;gap:12px;flex-wrap:wrap;align-items:center}
/* the wait */
.wt{display:flex;flex-direction:column;gap:12px;border-radius:12px;border:1px solid var(--border);background:var(--surface-rail);padding:14px 16px}
.wt .wh{display:flex;align-items:baseline;gap:12px}
.wt .clk{font:600 26px 'IBM Plex Mono';color:var(--fg);letter-spacing:.02em}
.wt .usu{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.wt .stop{margin-left:auto;font-size:12.5px;color:var(--fg-muted);min-height:32px;display:flex;align-items:center;padding:0 10px;border:1px solid var(--border-strong);border-radius:7px}
.ph .wt .stop{min-height:44px}
.wst{display:flex;flex-direction:column;gap:6px}
.wst>div{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:10px;min-height:44px;border-radius:8px;background:var(--surface);border:1px solid var(--border);padding:6px 12px;font-size:13px;color:var(--fg-body);position:relative;overflow:hidden}
.wst>div .mk{width:14px;height:14px;border-radius:4px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:9px}
.wst>div.ok .mk{border-color:var(--success);color:var(--success)}
.wst>div.on{border-color:var(--accent-shadow);color:var(--fg)}
.wst>div.on .mk{border:0;width:8px;height:8px;margin-left:3px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px color-mix(in oklab,var(--accent) 22%,transparent)}
.wst>div.wait{color:var(--fg-faint)}
.wst>div .r{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap}
.wst>div.on .r{color:var(--accent)}
.wst>div .wsub{grid-column:2/-1;font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-muted);margin-top:-2px}
.wst>div.on:after{content:'';position:absolute;left:0;bottom:0;height:2px;width:46%;background:linear-gradient(90deg,transparent,var(--accent),transparent)}
.fan{display:flex;align-items:center;gap:0;padding-left:4px}
.fan img{width:30px;height:42px;border-radius:3px;border:1px solid var(--border-strong);margin-left:-9px;box-shadow:2px 0 6px rgba(0,0,0,.5);object-fit:cover}
.fan img:first-child{margin-left:0}
.wnote{font-size:12px;line-height:1.5;color:var(--fg-muted)}
.wnote b{color:var(--fg)}
/* history */
.hrow .hs q{color:var(--fg);quotes:'“' '”'}
.hrow .oc.sh{color:var(--warning);border-color:color-mix(in oklab,var(--warning) 45%,transparent)}
.hrow .oc.rf{color:var(--fg-muted);border-color:var(--border-strong)}
.hrow .oc.rn{color:var(--accent);border-color:var(--accent-shadow)}
.hrow .tier.rf{color:var(--fg-faint);text-decoration:line-through}
.hrow .hs .mt{font-size:10.5px;color:var(--fg-faint)}
.pastm{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pastm .b{height:44px;display:flex;align-items:center;font-size:13px;font-weight:500;color:var(--fg-muted)}
.pastm .m{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.stale{border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-sunken);padding:11px 14px;font-size:12.5px;line-height:1.55;color:var(--fg-body);display:flex;flex-direction:column;gap:8px}
.stale b{color:var(--fg)}
.tagp{font:10px 'IBM Plex Mono';border-radius:999px;padding:1px 8px;border:1px solid var(--border-strong);color:var(--fg-faint);white-space:nowrap;margin-left:auto;flex:none}
.tagp.ok{color:var(--success);border-color:color-mix(in oklab,var(--success) 45%,transparent)}
/* board notes */
.tbl2{border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;max-width:1500px}
.tbl2 .tr{display:grid;grid-template-columns:44px 260px minmax(0,1fr);gap:16px;padding:12px 16px;border-top:1px solid var(--border);font-size:13px;line-height:1.55;color:var(--fg-body)}
.tbl2 .tr:first-child{border-top:0}
.tbl2 .tr>div:first-child{font:600 12px 'IBM Plex Mono';color:var(--accent)}
.tbl2 .tr>div:nth-child(2){color:var(--fg);font-weight:600}
.tbl2 .tr b{color:var(--fg)}
.tbl2 .tr.q>div:first-child{color:var(--fact)}
.cpin{position:absolute;z-index:8;font:600 10px 'IBM Plex Mono';color:#0D0B09;background:var(--fact);border-radius:4px;padding:2px 6px;white-space:nowrap}
"""
kit.CSS += CSS


# ---------------------------------------------------------------- small helpers
def stp(n, title, sub=""):
    return f'<div class="sth"><span class="n">{n}</span><span class="t">{title}</span>{f"<span class=s>{sub}</span>" if sub else ""}</div>'


def pool(n):
    return -(-3 * n // 2)


def lim(cap=None, sets="Any set", own=False, ph=False):
    capv = f'<span class="d">$</span>{cap}' if cap else '<span class="d">$</span><span class="pl0">No cap</span>'
    tg = f'<div class="tg2"><span class="{"" if own else "on"}">Any card</span><span class="{"on" if own else ""}">Only cards I own</span></div>'
    return ('<div class="lim"><span class="lh">Kept for this deck</span>'
            f'<div class="fl"><span class="lh">Most per card</span><div class="box">{capv}</div></div>'
            f'<div class="fl"><span class="lh">Set</span><div class="box" style="font-family:IBM Plex Sans;font-size:13px">{sets}<span class="cv">▾</span></div></div>'
            f'<div class="fl"><span class="lh">Cards to add</span>{tg}</div></div>')


CHIPS = [
    ("removal", "Short on removal", "6 of 10", "More removal: the deck runs 6 of a target 10."),
    ("focus", "Lean into +1/+1 counters", "the focus", "Lean into +1/+1 counters, the deck’s focus."),
    ("game", "“ran out of cards by turn 7”", "Oct 24", "Last game I ran out of cards by turn 7."),
    ("draw", "Draw is 7 of 10", "", "More card draw: 7 of a target 10."),
]


def chips(used=(), hot=None, ph=False):
    out = []
    for k, label, sub, _ in CHIPS:
        cls = "chp" + (" used" if k in used else "") + (" hot" if k == hot else "")
        pl = "✓" if k in used else "+"
        sb = f' <span class="mt" style="font-size:10.5px;color:var(--fg-faint)">· {sub}</span>' if sub else ""
        out.append(f'<span class="{cls}"><span class="k">{ {"removal": "role", "focus": "focus", "game": "game", "draw": "role"}[k]}</span><span>{label}{sb}</span><span class="pl">{pl}</span></span>')
    return ('<div class="ntc"><span class="nh">What we noticed</span><span class="ns">Tap one to add its words to your request. Change them as you like.</span>'
            f'<div class="chs">{"".join(out)}</div></div>')


def textarea(text=None, focus=False, count=0, ph=False):
    if text:
        body = f'<div class="tx">{text}<span class="car"></span></div>' if focus else f'<div class="tx">{text}</div>'
    else:
        body = '<div class="tx"><span class="ph0">In your own words, or leave it empty.</span></div>'
    return (f'<div class="ta{" focus" if focus else ""}">{body}<div class="ft2"><span class="tg">[[ ]]</span>'
            f'<span>tag a card</span><span class="c">{count} / 500</span></div></div>')


def bracket_piece(on=None, ph=False):
    opts = [(1, "Exhibition"), (3, "Upgraded"), (4, "Optimized")]
    o = "".join(f'<span class="{"on" if on == b else ""}"><img src="{img("b2" if b < 3 else ("b3" if b == 3 else "b4"))}" alt="">'
                f'{"Down to" if b < 2 else "Up to"} {b} · {n}</span>' for b, n in opts)
    note = ("Additions favor what takes the deck to Upgraded. The app shows the bracket each pick lands on."
            if on == 3 else "Leave it, and the run keeps the bracket where the cards put it.")
    return (f'<div class="brk"><span class="ot">optional · ships later (Q7)</span><div class="bh2"><b>Move to a bracket</b><span>now 2 · Core</span></div>'
            f'<div class="bo">{o}</div><div class="bn">{note}</div></div>')


def counter(n=3, ph=False):
    minus = "dis" if n <= 1 else ""
    plus = "dis" if n >= 20 else ""
    ex = (f'<b>{n} in, {n} out.</b> You’ll pick from about {pool(n)} of each.'
          + (' <span class="mt">· 20 at most</span>' if n >= 20 else ' <span class="mt">· 1 to 20</span>'))
    return f'<div class="cnt2"><div class="stpr"><span class="{minus}">−</span><b>{n}</b><span class="{plus}">+</span></div><span class="ex">{ex}</span></div>'


WAIT_HINT = {3: "usually under 20 seconds", 10: "usually about 40 seconds", 20: "usually about a minute, now and then two"}


def intake(ph=False, n=3, text=None, used=(), focus=False, count=0, bracket=True, bon=None, cap=None, send=None, hot=None, last=True):
    lead = "Say how many cards to change and what you’re after. You get more of each than you asked for, and you pick."
    s1 = f'<div class="stp">{stp("1", "How many cards?", "cards in · the same number come out")}{counter(n, ph)}</div>'
    box = textarea(text, focus, count, ph)
    right = chips(used, hot, ph) + (bracket_piece(bon, ph) if bracket else "")
    if ph:
        s2 = f'<div class="stp">{stp("2", "What are you looking to change?")}{box}{right}</div>'
    else:
        s2 = f'<div class="stp">{stp("2", "What are you looking to change?")}{box}{right}</div>'
    s3 = f'<div class="stp">{stp("3", "Any restrictions?", "kept for this deck, so the next run starts with them")}{lim(cap, ph=ph)}</div>'
    hint = WAIT_HINT.get(n, "usually under a minute")
    if send is None:
        send = (f'<div class="send"><span class="sbt2">Suggest changes</span>'
                f'<span class="scl2">{CREDIT}{"<br>" if ph else " · "}{hint}</span></div>')
    also = ('<div class="also">Your words lead. The run also reads <span class="bb2">the overview</span> · <span class="bb2">focus +1/+1 counters</span> · <span class="bb2">your description</span> · '
            '<span class="bb2">4 games</span>, in that order.' + (' <span class="lk">Last run Oct 26 · History ›</span>' if last else "") + '</div>')
    return f'<div class="sc"><h3>Suggested changes</h3><p class="lead">{lead}</p>{s1}{s2}{s3}{send}{also}</div>'


def same_confirm(ph=False):
    return ('<div class="same"><p><b>Same request as your Oct 26 run</b>, on the same list. A new run uses a credit and will '
            'likely name many of the same cards.</p><div class="bb"><span class="sbt2">Run it again</span><span class="gb2">Open Oct 26’s run</span></div></div>')


# ---------------------------------------------------------------- tiles (the landing)
def tiles(state="ready", ph=False):
    tm = P.tool_mark
    if state == "ready":
        sc = (f'<div class="tile"><div class="t1"><span class="tm">{tm("suggested")}</span><span class="tn">Suggested changes</span><span class="tc">›</span></div>'
              '<span class="tp">Say what you want changed. You get more cards to add and to cut than you need, and pick.</span>'
              f'<span class="tf"><span class="cost">1 credit per run</span><span class="st">last run Oct 26{"" if ph else " · 3 in, 3 out applied"}</span></span></div>')
    elif state == "running":
        sc = (f'<div class="tile run"><div class="t1"><span class="tm" style="color:var(--accent)">{tm("suggested")}</span><span class="tn">Suggested changes</span><span class="tc">›</span></div>'
              '<span class="tp">Say what you want changed. You get more cards to add and to cut than you need, and pick.</span>'
              '<span class="tf"><span class="wd"></span><span class="st" style="color:var(--accent)">choosing cuts · 0:41</span></span></div>')
    elif state == "short":
        sc = (f'<div class="tile inert"><div class="t1"><span class="tm">{tm("suggested")}</span><span class="tn">Suggested changes</span></div>'
              '<span class="tp">Swaps cards in and out of a deck at 99. This one is at 96: top it off first.</span>'
              '<span class="ptr">Top off on Your deck →</span></div>')
    else:
        sc = (f'<div class="tile inert"><div class="t1"><span class="tm">{tm("suggested")}</span><span class="tn">Suggested changes</span></div>'
              '<span class="tp">Swaps cards in and out of a deck at 99. This one is 3 over: cut it to 99 first.</span>'
              '<span class="ptr">Proposed cuts →</span></div>')
    mana = (f'<div class="tile"><div class="t1"><span class="tm">{tm("mana")}</span><span class="tn">Mana Balance</span><span class="tc">›</span></div>'
            '<span class="tp">Counts every source of each color against what your spells ask for.</span>'
            '<span class="tf"><span class="cost">free</span><span class="st">last run Oct 12</span></span></div>')
    if state == "over":
        cuts = (f'<div class="tile"><div class="t1"><span class="tm">{tm("cuts")}</span><span class="tn">Proposed cuts</span><span class="tc">›</span></div>'
                '<span class="tp">Counts where the deck runs long. A deeper look names the cuts.</span>'
                '<span class="tf"><span class="cost">free · look deeper 1 credit</span><span class="st">this deck is 3 over</span></span></div>')
    else:
        tot = 97 if state == "short" else 100
        cuts = (f'<div class="tile inert"><div class="t1"><span class="tm">{tm("cuts")}</span><span class="tn">Proposed cuts</span></div>'
                f'<span class="tp">Offered once the deck passes 100 cards. This one is at {tot}.</span></div>')
    hist = (f'<div class="tile"><div class="t1"><span class="tm">{tm("history")}</span><span class="tn">History</span><span class="tc">›</span></div>'
            f'<span class="tp">Every run of every tool on this deck, newest first.</span><span class="tf"><span class="st">7 runs{" · 1 running" if state == "running" else ""}</span></span></div>')
    return f'<section class="hub"><h2>Tuning</h2><div class="tiles">{sc}{mana}{cuts}{hist}</div></section>'


# ---------------------------------------------------------------- rows
def row(side, it, ph, state="", flag_on=True):
    """state: '' unpicked, 'on' picked, 'off' side full, 'ap' applied, 'ro' read-only unpicked."""
    if side == "add":
        k, n, role, owned, price, why, cites = it[:7]
        flag = len(it) > 7
    else:
        k, n, role, why, cites = it[:5]
        owned, price, flag = True, None, False
    sg = ('<span class="sg1" style="color:var(--accent)">+</span>' if side == "add"
          else '<span class="sg1" style="color:var(--fg-faint)">−</span>')
    th = f'<img class="th" src="{P.card(k)}" alt="">'
    od = ""
    buy = ""
    if side == "add":
        od = '<span class="od2"></span>' if owned else '<span class="od2 no"></span>'
        buy = f'<span class="buy">buy {price}</span>' if (price and not owned and not ph) else ""
    nm = f'<span class="nm {"a" if side == "add" else "c"}">{n}</span>'
    if state == "ap":
        ctl = f'<span class="done"><i>✓</i>{"Added" if side == "add" else "Cut"}</span>'
    elif state == "ro":
        ctl = '<span class="rot">Not picked</span>'
    elif state == "rop":
        ctl = '<span class="rot" style="color:var(--fg-muted)">Picked, not applied</span>'
    elif state == "on":
        ctl = '<span class="pk">✓ Picked</span>'
    else:
        ctl = '<span class="pk"><span class="bx"></span>Pick</span>'
    def ck(kk):
        return " fo" if kk == "focus" else (" ya" if kk == "you asked" else "")
    ct = "".join(f'<span class="ct{ck(kk)}"><span>{kk}</span><span>{v}</span></span>' for kk, v in cites)
    if ph and price and not owned and side == "add":
        ct += f'<span class="ct"><span>buy</span><span>{price}</span></span>'
    fl = (f'<div class="flg">Applying it raises the deck’s bracket to {bchip2(3, "Upgraded")}</div>' if (flag and flag_on) else "")
    cls = "ln2" + {"on": " on", "off": " off", "ap": " apd"}.get(state, "")
    return (f'<div class="{cls}"><div class="l1">{sg}{th}{od}{nm}{buy}{ctl}</div><p>{why}</p>{fl}'
            f'<div class="cts">{ct}</div></div>')


def group_rows(side, items, ph, states, grouped):
    if not grouped:
        return "".join(row(side, it, ph, states.get(it[0], "")) for it in items)
    out = []
    if grouped != "role":
        for tk, tn in TYPES:
            g = [it for it in items if type_of(it[0]) == tk]
            if not g:
                continue
            have = TYPE_HAVE[tk]
            picked = sum(1 for it in g if states.get(it[0]) in ("on", "ap"))
            mv = have + picked if side == "add" else have - picked
            fig = f'{have} in the deck' + (f' · <em>{mv} with your picks</em>' if picked else "")
            out.append(f'<div class="grh"><b>{tn}</b><span>{len(g)} · {fig}</span></div>')
            out += [row(side, it, ph, states.get(it[0], "")) for it in g]
        return "".join(out)
    for rk, rn in ROLES:
        g = [it for it in items if it[2] == rk]
        if not g:
            continue
        have, target = HAVE[rk]
        picked = sum(1 for it in g if states.get(it[0]) in ("on", "ap"))
        if target:
            mv = have + picked if side == "add" else have - picked
            fig = f'you have {have} of {target}' + (f' · <em>{mv} with your picks</em>' if picked else "")
        else:
            mv = have + picked if side == "add" else have - picked
            fig = f'{have} in the deck' + (f' · <em>{mv} with your picks</em>' if picked else "")
        out.append(f'<div class="grh"><b>{rn}</b><span>{len(g)} · {fig}</span></div>')
        out += [row(side, it, ph, states.get(it[0], "")) for it in g]
    return "".join(out)


def side_head(side, total, n, picked, ph=False, capn=None):
    name = "Additions" if side == "add" else "Cuts"
    full = picked >= (capn or n)
    cc = f'<span class="cc{" full" if full else ""}"><b>{picked}</b> of {capn or n} chosen</span>'
    return f'<div class="lch"><h4>{name}<em>{total}</em></h4>{cc}</div>'


def states_for(items, picked_keys, full_n=None, applied=()):
    st = {}
    for it in items:
        if it[0] in applied:
            st[it[0]] = "ap"
        elif it[0] in picked_keys:
            st[it[0]] = "on"
        elif full_n is not None and len(picked_keys) >= full_n:
            st[it[0]] = "off"
    return st


def abar(na, nc, n, ph=False, bracket=None, done=False, maxn=None):
    m = maxn or n
    if done:
        return (f'<div class="abar done"><div class="tl"><span class="a"><span class="g">+{na} in</span><span class="r">−{nc} out</span><span class="q">back at 99</span></span>'
                f'<span class="w">Applied as one change. The rest stay here: pick another equal set to take more.</span></div><span class="ub2">Undo all {na + nc}</span></div>')
    if na == nc and na > 0:
        br = (f' · bracket goes to <b style="color:var(--bracket-3)">Upgraded</b>' if bracket else " · bracket stays Core")
        lab = f'Apply {na} + {nc}'
        w = f'Nothing moves until you apply. One Undo puts all {na + nc} back.'
        return (f'<div class="abar"><div class="tl"><span class="a"><span class="g">+{na} in</span><span class="r">−{nc} out</span><span class="q">stays at 99{br}</span></span>'
                f'<span class="w">{w}</span></div><span class="ab2">{lab}</span></div>')
    if na == 0 and nc == 0:
        return (f'<div class="abar"><div class="tl"><span class="a"><span class="q" style="font-size:12px">0 in · 0 out</span></span>'
                f'<span class="w">Pick up to {m} of each. The two counts must match, so the deck stays at 99.</span></div><span class="ab2 dis">Apply</span></div>')
    more_side = "cuts" if na > nc else "additions"
    diff = abs(na - nc)
    w = (f'<b>{na} in, {nc} out.</b> Pick {diff} more {more_side if diff > 1 else more_side[:-1]} to apply, '
         'so the deck stays at 99.')
    return (f'<div class="abar"><div class="tl"><span class="a"><span class="g">+{na} in</span><span class="r">−{nc} out</span><span class="q">the deck would go to {99 + na - nc}</span></span>'
            f'<span class="w warn">{w}</span></div><span class="ab2 dis">Apply</span></div>')


def ask(text, n, cap=None, params=None):
    q = f'<q>{text}</q>' if text else '<span class="none">No request. The run worked from the deck’s own gaps.</span>'
    pm = params or (f'<b>{n} in, {n} out</b> · {"most $" + str(cap) + " a card" if cap else "no cap"} · any set · any card')
    return f'<div class="ask"><span class="k">You asked</span>{q}<span class="pm">{pm}</span></div>'


READ = "read from 4 games · 2 game notes · 99 cards · the overview · focus +1/+1 counters · your collection"


def results(ph, n, adds, cuts, pa=(), pc=(), grouped=False, tab="add", req=REQ10, cap=None, bracket=None, done=False, applied=(),
            lead=None, short=None, maxn=None, extra_top="", newrun=True, readonly=False, head=None, bar=True):
    m = maxn or n
    sa = states_for(adds, set(pa), m if not readonly else None, applied)
    sc_ = states_for(cuts, set(pc), m if not readonly else None, applied)
    if readonly:
        sa = {it[0]: ("ap" if it[0] in applied else "ro") for it in adds}
        sc_ = {it[0]: ("ap" if it[0] in applied else "ro") for it in cuts}
    if done:
        sa = {k: ("ap" if k in applied else "") for k in [it[0] for it in adds]}
        sc_ = {k: ("ap" if k in applied else "") for k in [it[0] for it in cuts]}
    if lead is None:
        lead = (f'<b>{len(adds)} to add and {len(cuts)} to cut.</b> Pick any {n} of each. Nothing moves until you apply.')
    nb = '<span class="nb">New run</span>' if newrun else ""
    hd = head if head is not None else f'<div class="hrow2"><h3>Suggested changes</h3>{nb}</div>'
    top = (hd + extra_top + ask(req, n, cap) + (short or "") + f'<p class="lead">{lead}</p>'
           + f'<span class="scl2" style="margin-top:-8px">{READ}</span>')
    if grouped:
        top += group_switch("role" if grouped == "role" else "type", ph)
    na = len([k for k in pa]) if not done else len([k for k in applied if k in [it[0] for it in adds]])
    nc = len([k for k in pc]) if not done else len([k for k in applied if k in [it[0] for it in cuts]])
    if done:
        na = nc = len([k for k in applied if k in [it[0] for it in adds]])
    hA = side_head("add", len(adds), n, len(pa) if not done else 0, ph, maxn)
    hC = side_head("cut", len(cuts), n, len(pc) if not done else 0, ph, maxn)
    if done:
        nA = len([k for k in applied if k in [it[0] for it in adds]])
        hA = f'<div class="lch"><h4>Additions<em>{len(adds)}</em></h4><span class="cc full"><b>{nA}</b> applied</span></div>'
        hC = f'<div class="lch"><h4>Cuts<em>{len(cuts)}</em></h4><span class="cc full"><b>{nA}</b> applied</span></div>'
    if readonly:
        hA = f'<div class="lch"><h4>Additions<em>{len(adds)}</em></h4><span class="cc">{len([a for a in applied if a in sa])} applied</span></div>'
        hC = f'<div class="lch"><h4>Cuts<em>{len(cuts)}</em></h4><span class="cc">{len([a for a in applied if a in sc_])} applied</span></div>'
    A = group_rows("add", adds, ph, sa, grouped)
    C = group_rows("cut", cuts, ph, sc_, grouped)
    b = "" if (readonly or not bar) else abar(na, nc, n, ph, bracket, done, maxn)
    if ph:
        def segs(k, nm, tot, pk):
            full = pk >= m
            return f'<span class="{"on" if tab == k else ""}{" full" if full else ""}">{nm}<em>{pk} of {m}</em></span>'
        if readonly:
            seg = (f'<div class="seg2"><span class="{"on" if tab == "add" else ""}">Additions<em>{len(adds)}</em></span>'
                   f'<span class="{"on" if tab == "cut" else ""}">Cuts<em>{len(cuts)}</em></span></div>')
        else:
            seg = f'<div class="seg2">{segs("add", "Additions", len(adds), len(pa) if not done else 0)}{segs("cut", "Cuts", len(cuts), len(pc) if not done else 0)}</div>'
        if done:
            seg = (f'<div class="seg2"><span class="{"on" if tab == "add" else ""} full">Additions<em>{na} applied</em></span>'
                   f'<span class="{"on" if tab == "cut" else ""} full">Cuts<em>{nc} applied</em></span></div>')
        lst = (hA + A) if tab == "add" else (hC + C)
        return f'<div class="sc">{top}{seg}<div class="lcol">{lst}</div>{b}</div>'
    return f'<div class="sc">{top}<div class="cols"><div class="lcol">{hA}{A}</div><div class="lcol">{hC}{C}</div></div>{b}</div>'


# ---------------------------------------------------------------- the wait
def wait(ph, phase, n=10, adds=None, cuts=None, pa=()):
    clock, usual = {1: ("0:09", "usually about 40 seconds"), 2: ("0:41", "usually about 40 seconds"),
                    3: ("1:52", "taking longer than usual · it’s still working")}[phase]
    p = pool(n)
    s1 = '<div class="ok"><span class="mk">✓</span><span>Read your deck and your request</span><span class="r">0:03</span></div>'
    if phase == 1:
        s2 = (f'<div class="on"><span class="mk"></span><span>Choosing cards to add</span><span class="r">asked for {p}</span>'
              '<span class="wsub">each one checked as it lands: colors, price, the rules</span></div>')
        s3 = '<div class="wait"><span class="mk"></span><span>Making room: choosing cards to cut</span><span class="r">next</span></div>'
    elif phase == 2:
        fan = "".join(f'<img src="{P.card(it[0])}" alt="">' for it in (adds or [])[:9])
        s2 = (f'<div class="ok"><span class="mk">✓</span><span>{len(adds)} cards to add</span><span class="r">0:29</span>'
              f'<span class="wsub" style="display:flex;align-items:center;gap:10px"><span class="fan">{fan}</span>ready to pick below</span></div>')
        s3 = (f'<div class="on"><span class="mk"></span><span>Making room: choosing cards to cut</span><span class="r">asked for {p}</span>'
              f'<span class="wsub">read against the {len(adds)} coming in</span></div>')
    else:
        s2 = f'<div class="ok"><span class="mk">✓</span><span>{len(adds)} cards to add</span><span class="r">0:29</span></div>'
        s3 = (f'<div class="on"><span class="mk"></span><span>Topping up the cuts</span><span class="r">13 held up · asking for 2 more</span>'
              '<span class="wsub">2 didn’t pass the checks, so we asked again with the reasons</span></div>')
    note = ("Leave whenever you like: the run keeps going, its tile shows it, and it lands in History."
            if phase != 3 else "<b>It’s still working.</b> A refill adds a call. You can leave: the run lands in History either way.")
    wt = (f'<div class="wt"><div class="wh"><span class="clk">{clock}</span><span class="usu">{usual}</span><span class="stop">Stop</span></div>'
          f'<div class="wst">{s1}{s2}{s3}</div><p class="wnote">{note}</p></div>')
    top = (f'<div class="hrow2"><h3>Suggested changes</h3></div>' + ask(REQ10, n))
    if phase == 1:
        return f'<div class="sc">{top}{wt}</div>'
    # adds are in: pickable already; cuts still writing
    sa = states_for(adds, set(pa), n)
    A = group_rows("add", adds, ph, sa, n > 5)
    hA = side_head("add", len(adds), n, len(pa), ph)
    skl = "".join('<div class="skl"></div>' for _ in range(3))
    hC = '<div class="lch"><h4>Cuts<em>writing</em></h4><span class="cc">0 of %d chosen</span></div>' % n
    lead = f'<p class="lead"><b>{len(adds)} to add are in.</b> Start picking; the cuts follow.</p>'
    if ph:
        seg = (f'<div class="seg2"><span class="on">Additions<em>{len(pa)} of {n}</em></span><span>Cuts<em>writing…</em></span></div>')
        return f'<div class="sc">{top}{wt}{lead}{seg}<div class="lcol">{hA}{A}</div></div>'
    return (f'<div class="sc">{top}{wt}{lead}<div class="cols"><div class="lcol">{hA}{A}</div>'
            f'<div class="lcol">{hC}{skl}</div></div></div>')


# ---------------------------------------------------------------- history
def hrow(date, summary, tier, oc, occls="", new=False):
    trc = "tier cr" if tier.startswith("1") else ("tier rf" if tier == "refunded" else "tier")
    tr = f'<span class="{trc}">{"<i></i>" if tier.startswith("1") else ""}{tier}</span>'
    return (f'<div class="hrow{" nw" if new else ""}"><span class="hd">{date}</span><span class="ht"><span style="color:var(--fg-body);display:flex">{P.tool_mark("suggested", 14)}</span>Suggested</span>'
            f'<span class="hs">{summary}</span>{tr}<span class="oc {occls}">{oc}</span></div>')


def history_list(ph=False):
    rows = [
        ('<div class="hmon">October 2026</div>', None),
        (hrow("Oct 28 · 14:02", '<q>More removal, and lean into the counters…</q><br><span class="mt">10 in, 10 out · choosing cuts</span>', "1 credit", "running", "rn", True), None),
        (hrow("Oct 27 · 21:40", '<q>Rebuild around the counters…</q><br><span class="mt">20 asked · 14 + 21 found under $2 · 14 + 14 applied</span>', "1 credit", "short", "sh"), None),
        (hrow("Oct 27 · 09:15", '<span style="color:var(--fg-muted)">No request</span><br><span class="mt">10 asked · 8 + 15 found · nothing applied</span>', "refunded", "short", "rf"), None),
        (hrow("Oct 26 · 18:22", '<q>Cut the clunky stuff for cheaper threats.</q><br><span class="mt">3 in, 3 out · 5 + 5 found · 3 + 3 applied</span>', "1 credit", "ok"), None),
        (P.hist_row("Oct 22", "mana", "Mana", "Green short: 14 sources for 31 pips", "free"), None),
        ('<div class="hmon">September 2026</div>', None),
        (hrow("Sep 30", '5 in, 5 out · 2 added, 2 cut, 4 rejected', "1 credit", "ok"), None),
    ]
    chipsr = '<div class="hchips"><span class="on">All</span><span>Suggested</span><span>Mana</span><span>Cuts</span></div>'
    body = "".join(r for r, _ in rows)
    return (f'<div class="hist"><div class="hh"><h3>History</h3><span>every run of every tool · newest first</span></div>{chipsr}'
            f'<div style="display:flex;flex-direction:column;gap:6px">{body}</div>'
            '<span class="scl2">Kept for as long as the deck is. A free count is recorded once per version of the list.</span></div>')
