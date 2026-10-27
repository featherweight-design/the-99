"""Proposed cuts offers alternatives (account 2, 2026-10-27): the shipped cuts panel (cuts-panel.tsx, cuts-free-count.tsx)
inside the Tuning hub, redrawn from src, plus ONE new strip on each pending row. Fixture: HD - Avatar Aang at 101,
cards cut from Hugh's own captures (the strategy-focus art)."""
import kit
import parts as P
from kit import doc, board_head, frame

kit.CSS += r"""
/* ---- shipped: CutsFrame, CutsFreeCount, ResultBlock, CutRow ---- */
.pcf{border-radius:11px;padding:16px 14px;background:var(--surface-sunken);border:1px solid var(--border);display:flex;flex-direction:column}
.dkm .pcf{border-radius:12px;padding:18px 20px}
.pcf .ph1{display:flex;flex-direction:column;gap:3px}
.dkm .pcf .ph1{flex-direction:row;align-items:baseline;gap:12px}
.pcf .ph1 h3{margin:0;font:600 17px 'Cinzel',serif;color:var(--fg)}
.dkm .pcf .ph1 h3{font-size:19px}
.pcf .ph1 span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.pcf .pld{margin-top:8px;font-size:13px;line-height:1.5;color:var(--fg-body)}
.pcf .pld b{color:var(--fg);font-weight:600}
.prb{margin-top:14px;border-radius:10px;padding:14px 12px;background:var(--surface);border:1px solid var(--border)}
.dkm .prb{padding:14px}
.prb .prh{display:flex;flex-direction:column;gap:3px}
.dkm .prb .prh{flex-direction:row;align-items:baseline;gap:10px}
.prb .prh b{font-size:14px;font-weight:600}
.prb .prh span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.prb ul{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.prb .prf{margin-top:12px;font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint)}
.pcr{display:flex;flex-direction:column;gap:9px;border-radius:9px;padding:11px 12px;background:var(--surface-sunken);border:1px solid var(--border)}
.pcr .ptop{display:flex;flex-direction:column;gap:9px}
.dkm .pcr .ptop{flex-direction:row;align-items:center;justify-content:space-between;gap:12px}
.pcr .pid{display:flex;align-items:center;gap:10px;min-width:0}
.pcr .psug{width:86px;flex:none;border-radius:999px;padding:2px 8px;text-align:center;font:9px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--accent-text);border:1px solid color-mix(in oklab,var(--accent) 55%,transparent)}
.pcr .ptb{width:22px;height:31px;flex:none;border-radius:3px;overflow:hidden;border:1px solid var(--border-strong)}
.pcr .ptb img{width:100%;height:100%;object-fit:cover;display:block}
.pcr .pnm{font-size:13px;font-weight:600;color:var(--fg);border-bottom:1px dotted var(--accent);white-space:nowrap}
.pcr .pbt{display:flex;gap:8px}
.pcr .pbt span{height:44px;flex:1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px}
.pcr .pbt .c{color:var(--accent-text);border:1px solid var(--accent);font-weight:600}
.pcr .pbt .k{color:var(--fg-muted);border:1px solid var(--border-strong);font-weight:500}
.dkm .pcr .pbt{gap:7px;flex:none}
.dkm .pcr .pbt span{height:auto;flex:none;border-radius:7px;padding:6px 13px;font-size:12.5px}
.dkm .pcr .pbt .k{padding:6px 12px}
.pcr .pcw{font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.dkm .pcr .pcw,.dkm .pcr .pchips,.dkm .pcr .alt{margin-left:96px}
.pcr .pchips{display:flex;flex-wrap:wrap;gap:6px}
.dkm .pcr .pchips{gap:5px}
.pcr .pchips span{display:flex;align-items:baseline;gap:5px;border-radius:5px;padding:3px 7px;font:9.5px 'IBM Plex Mono';background:var(--surface-sunken);border:1px solid var(--border)}
.pcr .pchips span i{font-style:normal;text-transform:uppercase;letter-spacing:.1em;color:var(--fg-locked)}
.pcr .pchips span em{font-style:normal;color:var(--fg-muted)}
.pca{display:flex;flex-wrap:wrap;align-items:center;gap:9px;border-radius:9px;padding:9px 12px;background:var(--surface);border:1px solid var(--success)}
.pca .pck{width:15px;height:15px;border-radius:4px;border:1px solid var(--success);color:var(--success);font-size:9px;display:flex;align-items:center;justify-content:center}
.pca .pal{font:9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--success)}
.pca .pan{font-size:13px;color:var(--fg-body);text-decoration:line-through;text-decoration-color:var(--fg-locked);border-bottom:1px dotted var(--border-strong)}
.pca .pub{margin-left:auto;min-height:32px;border-radius:7px;padding:6px 11px;font-size:12px;font-weight:500;color:var(--fg-muted);border:1px solid var(--border-strong);display:flex;align-items:center}
.pcn{margin-top:18px}
.pcn .pdv{display:flex;align-items:center;gap:10px;margin-bottom:10px;font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.pcn .pdv i{flex:1;height:1px;background:var(--border)}
.pcn .ch{display:flex;flex-direction:column;gap:3px}
.dkm .pcn .ch{flex-direction:row;align-items:baseline;gap:10px}
.pcn .ch b{font-size:13.5px;font-weight:600}
.pcn .ch span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.pcn ul{list-style:none;margin:8px 0 0;padding:0;border-top:1px solid var(--border)}
.pcn li{display:grid;grid-template-columns:64px 1fr auto;align-items:baseline;gap:0 12px;padding:9px 0;border-bottom:1px solid var(--border)}
.dkm .pcn li{grid-template-columns:84px 1fr auto 220px;gap:0 16px}
.pcn li .s{font:9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-locked)}
.pcn li .l{font-size:13px;color:var(--fg)}
.pcn li .l small{display:block;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.dkm .pcn li .l small{display:none}
.pcn li .f{font:600 13px 'IBM Plex Mono';color:var(--fg);text-align:right}
.pcn li .n{display:none;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.dkm .pcn li .n{display:inline}
.pcn .pnv{margin-top:10px;font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint)}

/* ---- NEW: the alternatives strip ---- */
.alt{display:flex;flex-direction:column;gap:8px;border-top:1px dashed var(--border);padding-top:10px}
.alt .ak{font:9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.alt .ag{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.alt .at2{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 6px 9px;border-radius:9px;border:1px solid var(--border-strong);background:var(--surface);min-height:44px;position:relative}
.alt .at2 img{width:72px;height:100px;border-radius:4px;object-fit:cover;display:block;box-shadow:0 2px 6px rgba(0,0,0,.45)}
.alt .at2 span{font-size:11.5px;line-height:1.3;color:var(--fg-body);text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.alt .at2.was{border-style:dashed;border-color:var(--accent-shadow);background:color-mix(in oklab,var(--accent) 6%,var(--surface))}
.alt .at2.was span{color:var(--fg)}
.alt .at2.hov{border-color:var(--accent)}
.dkm .alt{flex-direction:row;align-items:center;gap:14px}
.dkm .alt .ak{flex:none;width:118px;line-height:1.5}
.dkm .alt .ag{display:flex;gap:8px}
.dkm .alt .at2{flex-direction:row;width:228px;padding:6px 10px 6px 6px;gap:10px;justify-content:flex-start}
.dkm .alt .at2 img{width:40px;height:56px;border-radius:3px}
.dkm .alt .at2 span{text-align:left;font-size:12.5px;-webkit-line-clamp:2}
.dkm .alt .at2 small{display:block;font:10px 'IBM Plex Mono';color:var(--fg-faint);margin-top:2px}
.pcr.swapped{box-shadow:inset 3px 0 0 var(--accent)}
.flip{position:absolute;z-index:3;width:52px;height:72px;border-radius:4px;overflow:hidden;box-shadow:0 10px 22px rgba(0,0,0,.6);transform:perspective(400px) rotateY(-28deg) rotate(-6deg);border:1px solid var(--accent)}
.flip img{width:100%;height:100%;object-fit:cover}
.pin{position:absolute;z-index:20;width:22px;height:22px;border-radius:50%;background:var(--accent);color:#14110E;font:600 11px/22px 'IBM Plex Mono';text-align:center;box-shadow:0 0 0 3px rgba(13,11,9,.85)}
.prev{position:absolute;z-index:25;width:150px;border-radius:10px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.65)}
.prev img{width:150px;height:209px;display:block}
"""

C = P.card
TYPE = {"assimilation-aegis": "Artifact · Equipment", "heartless-act": "Instant", "path": "Instant", "searing-touch": "Instant",
        "cemetery-prowler": "Creature · Wolf", "flickering-hound": "Creature · Dog", "wizards-staff": "Artifact · Equipment",
        "moonmist": "Instant"}
NAME = {"assimilation-aegis": "Assimilation Aegis", "heartless-act": "Heartless Act", "path": "Path to Exile",
        "searing-touch": "Searing Touch", "cemetery-prowler": "Cemetery Prowler", "flickering-hound": "Flickering Hound",
        "wizards-staff": "Wizard’s Staff", "moonmist": "Moonmist"}
WHY = {
    "assimilation-aegis": ("It costs three, and two more to equip, to do what Swords to Plowshares does here for one.",
                           [("cost", "mana value 3"), ("role", "removal 11 · target 8")]),
    "heartless-act": ("The deck runs 11 removal against a target of 8, and this one misses any creature with counters on it.",
                      [("role", "removal 11 · target 8"), ("inclusion", "31%")]),
    "cemetery-prowler": ("Its discount needs creature cards in graveyards, and nothing in the Ally plan puts them there.",
                         [("cost", "mana value 3"), ("inclusion", "0.4%"), ("curve", "three-drops 19")]),
}
ALTS = {"assimilation-aegis": ["heartless-act", "path", "searing-touch"],
        "cemetery-prowler": ["flickering-hound", "wizards-staff", "moonmist"]}


def chips(k):
    return '<div class="pchips">' + "".join(f'<span><i>{a}</i><em>{b}</em></span>' for a, b in WHY[k][1]) + "</div>"


def strip(alts, was=None, hov=None, desk=False):
    """NEW. Up to three. `was` = the card that was named, back in the slot its replacement left."""
    def tile(k):
        cls = "at2" + (" was" if k == was else "") + (" hov" if k == hov else "")
        sub = f'<small>{"named first" if k == was else TYPE[k]}</small>' if desk else ""
        return f'<span class="{cls}"><img src="{C(k)}" alt=""><span>{NAME[k]}{sub}</span></span>'
    return (f'<div class="alt new"><span class="ak">Or cut one of these instead</span>'
            f'<div class="ag">{"".join(tile(k) for k in alts)}</div></div>')


def row(k, alts, was=None, swapped=False, hov=None, desk=False):
    return (f'<li><article class="pcr{" swapped" if swapped else ""}"><div class="ptop"><span class="pid"><span class="psug">Suggestion</span>'
            f'<span class="ptb"><img src="{C(k)}" alt=""></span><span class="pnm">{NAME[k]}</span></span>'
            '<span class="pbt"><span class="c">Cut</span><span class="k">Keep</span></span></div>'
            f'<p class="pcw">{WHY[k][0]}</p>{chips(k)}{strip(alts, was, hov, desk) if alts else ""}</article></li>')


def done(k):
    return (f'<li><div class="pca"><span class="pck">✓</span><span class="pal">cut</span><span class="pan">{NAME[k]}</span>'
            '<span class="pub">Undo</span></div></li>')


COUNT = [("role", "Removal", "11", "target 8 for this commander"), ("curve", "Three-drops", "19", "average deck has 14"),
         ("edhrec", "Off Avatar Aang’s list", "9", "cards under 1% inclusion")]


def count(divider="The count"):
    li = "".join(f'<li><span class="s">{s}</span><span class="l">{l}<small>{n}</small></span><span class="f">{f}</span><span class="n">{n}</span></li>'
                 for s, l, f, n in COUNT)
    return (f'<div class="pcn"><div class="pdv">{divider}<i></i></div><div class="ch"><b>What we counted</b>'
            '<span>from 101 cards · EDHREC for Avatar Aang, 2,184 decks · bracket 3, as declared · free</span></div>'
            f'<ul>{li}</ul><p class="pnv">Never named: Avatar Aang, the 6 cards you locked and the 4 Key cards.</p></div>')


def panel(rows, lead, desk=False, foot=True):
    return (f'<section class="pcf"><div class="ph1"><h3>Proposed cuts</h3><span>free count · look deeper 1 credit</span></div>'
            f'<p class="pld"><b>Two over the ninety-nine.</b> {lead}</p>'
            '<div class="prb"><div class="prh"><b>Two to cut</b><span>named by a deeper look · read the count below and your description</span></div>'
            f'<ul>{rows}</ul><p class="prf">2 of 2 named · each figure checked against the count · 11 credits left</p></div>'
            + (count() if foot else "") + "</section>")


CUT = "Analysis tab · Tuning · Proposed cuts"
LEAD_NAMED = "Two cards named. Cut writes to the list straight away."
LEAD_ONE = "One cut, none kept. Two were named, so one is left open."


def tool_ph(p, extra=""):
    return P.phone(f'<div class="at">{P.hub_open(p, True, active="cuts")}</div>{extra}', head=False, cut=CUT, nav=False)


def tool_dk(p, extra=""):
    return P.desk(f'<div class="at">{P.hub_open(p, active="cuts")}</div>{extra}', head=False, cut=CUT)


def s_named(desk=False):
    return panel(row("assimilation-aegis", ALTS["assimilation-aegis"], desk=desk)
                 + row("cemetery-prowler", ALTS["cemetery-prowler"], desk=desk), LEAD_NAMED, desk)


def s_swapped(desk=False, hov=None):
    return panel(row("heartless-act", ["assimilation-aegis", "path", "searing-touch"], was="assimilation-aegis", swapped=True, desk=desk)
                 + row("cemetery-prowler", ALTS["cemetery-prowler"], hov=hov, desk=desk), LEAD_NAMED, desk)


def s_cut(desk=False):
    return panel(done("heartless-act") + row("cemetery-prowler", ALTS["cemetery-prowler"], desk=desk), LEAD_ONE, desk, foot=False)


def sec(title, sp, body):
    return f'<div class="sec"><h3>{title}</h3><p class="sp">{sp}</p>{body}</div>'


def frames(*fs):
    return '<div class="frames">' + "".join(fs) + "</div>"


def note(t, b, w=None):
    st = f' style="width:{w}px"' if w else ""
    return f'<div class="note"{st}><b>{t}</b>{b}</div>'


def board():
    prev = ('<div class="prev" style="left:1110px;top:610px"><img src="' + C("wizards-staff") + '" alt=""></div>')
    body = (board_head("Proposed cuts · alternatives · addendum", "Keep the card you like, cut another instead",
                       "Your rule from today: give the player a choice and never lock them in. Each named cut now carries <b>three other cards "
                       "the run could cut in its place</b>, as card tiles under the reason. Press one and it becomes the row’s suggestion, "
                       "with its own reason and figures; the card it replaced drops into the slot it left, so you can switch back. "
                       "<b>Cut</b> and <b>Keep</b> are unchanged and still the only way anything leaves the list. Everything else is the shipped panel "
                       "(Tuning hub R2, canvas C), redrawn from <code>cuts-panel.tsx</code>. Copy is placeholder for /copy-review.", tag="R1")
            + sec("1 · Named, with alternatives",
                  "The run named two. Each row gains one strip under its figures: <i>Or cut one of these instead</i> and three tiles. "
                  "Phone: three card tiles across (72 × 100, the card’s own shape), the name under each. Desktop: the strip sits on the reason’s "
                  "96px indent, tiles in a row with the card, its name and its type line. A tile is one press: it swaps.",
                  frames(frame("<b>390</b>", tool_ph(s_named())),
                         frame("<b>1300</b>", tool_dk(s_named(True)))))
            + sec("2 · Picked one: Heartless Act in place of Assimilation Aegis",
                  "The row now suggests Heartless Act with <b>its own reason and figures</b> (the run wrote them with the rest). An accent edge marks "
                  "a row you changed. Assimilation Aegis sits in the slot Heartless Act left, outlined in accent and labelled <i>named first</i> on "
                  "desktop, so switching back is one press. On the way in, the picked card flips into the row’s thumbnail. Nothing is written to the "
                  "deck: Cut still does that.",
                  frames(frame("<b>390</b>", tool_ph(s_swapped())),
                         frame("<b>1300</b> · hovering a tile shows the shipped card preview", tool_dk(s_swapped(True, hov="wizards-staff"), prev))))
            + sec("3 · Then Cut",
                  "Cut takes the card the row shows. The answered row is the shipped one (cut, the name struck, Undo); its strip goes with it. "
                  "Undo brings the row back as you left it, Heartless Act and all. The lead counts as it does today.",
                  frames(frame("<b>390</b>", tool_ph(s_cut())),
                         frame("<b>1300</b>", tool_dk(s_cut(True))),
                         '<div style="display:flex;flex-direction:column;gap:14px;width:420px">'
                         + note("How many: three", "<ul><li>Three tiles fit across the phone’s row at a card size you can recognise, with no scrolling. "
                                "Four would shrink the cards to stamps; a list would bury the reason.</li><li>Fewer when the run can’t back three "
                                "with figures it checked. None: the strip is absent, and the row is as shipped.</li><li>Never a locked card, a Key card, "
                                "the commander, or a card already named on another row.</li></ul>")
                         + note("Where they come from", "<ul><li>The same Look deeper run, at the same one credit: for each cut it also names up to three "
                                "runners-up, each with a reason held to the same rules (checked figures, no bracket claims).</li><li>A tile press is a "
                                "light write (the row remembers your pick), so History and a reload show the card you chose, not the one first named.</li>"
                                "<li>A tile whose card has since left the list, or been locked, is dropped from the strip.</li></ul>")
                         + note("Kept and History", "<ul><li><b>Keep</b> is unchanged: the row closes as kept, and <i>Show it again</i> brings it "
                                "back with its strip.</li><li>A past run reopened from History shows its strips too; picking re-checks the card, as Cut "
                                "does there.</li></ul>")
                         + "</div>")))
    return doc("Proposed cuts · alternatives", body, 2160)


BOARDS = [("Cuts-Alternatives", board, "Proposed cuts · three alternatives per cut")]
