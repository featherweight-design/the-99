"""Item 6a · two "your filters matched nothing" states (#412 §1). Cart-v2 kit shells (Low Sun)."""
import kit
from kit import board_head, frame, phone, desk, doc

CSS = r"""
.notes{display:grid;gap:16px;max-width:2400px}
.note h4{margin:0 0 4px;font:600 13px 'IBM Plex Sans';color:var(--fg)}
.pg{display:flex;flex-direction:column;min-height:100%}
.ph .pb{overflow:hidden}
.phd{padding:18px 16px 0;display:flex;flex-direction:column;gap:4px}
.dk .phd{padding:26px 34px 0}
.phd h1{margin:0;font:700 24px Cinzel,serif}
.dk .phd h1{font-size:28px}
.phd p{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.pls{display:flex;gap:22px;padding:12px 16px 0;border-bottom:1px solid var(--border);white-space:nowrap;overflow:hidden}
.dk .pls{padding:14px 34px 0}
.pls span{font-size:14px;color:var(--fg-muted);padding-bottom:11px;border-bottom:2px solid transparent}
.pls span.on{color:var(--fg);font-weight:600;border-bottom-color:var(--accent)}
.fb{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap}
.dk .fb{padding:14px 34px}
.fb .sf{flex:1;min-width:180px;max-width:520px;height:44px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-sunken);display:flex;align-items:center;gap:10px;padding:0 12px;font-size:15px;color:var(--fg)}
.dk .fb .sf{height:38px;font-size:14px}
.fb .sf svg{color:var(--fg-faint);flex:none}
.fb .fl{height:44px;padding:0 14px;border-radius:8px;border:1px solid var(--accent);color:var(--fg);display:flex;align-items:center;gap:7px;font-size:13.5px}
.dk .fb .fl{height:38px;font-size:13px}
.fb .fl em{font:normal 11px 'IBM Plex Mono';color:#14110E;background:var(--accent);border-radius:9px;padding:0 6px;line-height:17px}
.fb .chips{display:flex;gap:6px;flex-wrap:wrap;width:100%}
.dk .fb .chips{width:auto}
.fb .ch{height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--border-strong);display:flex;align-items:center;gap:6px;font-size:12px;color:var(--fg-body)}
.fb .ch i{font-style:normal;color:var(--fg-faint)}
.fb .ca{font:12px 'IBM Plex Mono';color:var(--accent-text);text-decoration:underline;text-underline-offset:3px}
/* today's collection NoResults (no-results.tsx) */
.nr{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:36px;background:radial-gradient(440px 260px at 50% 78%,color-mix(in oklab,var(--accent) 7%,transparent),transparent 70%)}
.dk .nr{padding:48px}
.crown{display:flex;gap:5px;align-items:center;margin-bottom:14px}
.crown i{width:8px;height:8px;background:var(--border-strong);transform:rotate(45deg);display:block}
.crown i:nth-child(2){width:11px;height:11px}
.nr h2{margin:0;font:700 21px Cinzel,serif;color:var(--fg)}
.dk .nr h2{font-size:26px}
.nr p{margin-top:10px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.dk .nr p{margin-top:12px;font-size:15px;line-height:1.6;max-width:360px}
.nr .bts{margin-top:22px;display:flex;flex-direction:column;gap:12px}
.dk .nr .bts{margin-top:26px;flex-direction:row}
.nr .pb2{border-radius:8px;background:var(--fg);color:var(--bg);font:600 13px 'IBM Plex Sans';padding:11px 20px}
.dk .nr .pb2{font-size:14px;padding:12px 22px}
.nr .gb2{display:none;border-radius:8px;border:1px solid var(--border-strong);color:var(--fg);font:600 14px 'IBM Plex Sans';padding:12px 22px}
.dk .nr .gb2{display:inline-block}
/* the shared ZeroState (filtered-empty.tsx) */
.zs{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px 22px;text-align:center}
.dk .zs{padding:34px 22px 38px}
.zs .dd{display:flex;gap:7px}
.zs .dd i{width:10px;height:10px;border:1px solid var(--border-strong);transform:rotate(45deg);display:block}
.zs h2{margin:0;font:600 19px Cinzel,serif;color:var(--fg)}
.zs p{font-size:13.5px;line-height:1.6;color:var(--fg-muted);max-width:520px}
.zs p b{font-weight:400;color:var(--fg-body)}
.zs p code{font:12.5px 'IBM Plex Mono';color:var(--fg-body)}
.zs .bts{margin-top:6px;display:flex;flex-direction:column;gap:9px;align-self:stretch}
.dk .zs .bts{margin-top:4px;flex-direction:row;align-self:auto}
.zs .zp,.zs .zg{display:flex;align-items:center;justify-content:center;height:48px;border-radius:10px;font:600 14px 'IBM Plex Sans'}
.dk .zs .zp,.dk .zs .zg{height:32px;border-radius:8px;padding:0 14px;font-size:12.5px}
.zs .zp{background:var(--fg);color:var(--bg)}
.zs .zg{border:1px solid var(--border-strong);color:var(--fg)}
.mark-new{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:-2px;border-radius:12px}
.cwrap{flex:1;display:flex;flex-direction:column;padding:12px 14px}
.dk .cwrap{padding:14px 34px 34px}
"""

SRCH = '<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.8"/><path d="M14 14 18 18"/></svg>'


def coll_top(desk_=False):
    tabs = "".join(f'<span class="{"on" if t == "Cards" else ""}">{t}</span>' for t in ["Cards", "Sets", "Proxies", "History", "Wishlist"])
    chips = '<span class="chips"><span class="ch">Gruul <i>✕</i></span><span class="ch">Creature <i>✕</i></span><span class="ch">Rare <i>✕</i></span><span class="ca">Clear all filters</span></span>'
    return (f'<div class="phd"><h1>Collection</h1><p>4,492 cards · read last week</p></div><div class="pls">{tabs}</div>'
            f'<div class="fb"><span class="sf">{SRCH}sol</span><span class="fl">Filters <em>3</em></span>{chips}</div>')


def cmd_top():
    tabs = "".join(f'<span class="{"on" if t == "For you" else ""}">{t}</span>' for t in ["For you", "Discover", "Help me choose"])
    chips = '<span class="chips"><span class="ch">Mono-red <i>✕</i></span><span class="ch">Set: Foundations <i>✕</i></span><span class="ca">Clear all filters</span></span>'
    return (f'<div class="phd"><h1>Commanders</h1><p>228 yours, not yet built · 3,068 to discover</p></div><div class="pls">{tabs}</div>'
            f'<div class="fb"><span class="sf">{SRCH}<span style="color:#7A715F">Search</span></span><span class="fl">Filters <em>2</em></span>{chips}</div>')


def nr_today():
    return ('<div class="nr"><span class="crown"><i></i><i></i><i></i></span><h2>Nothing matches “sol” in Gruul.</h2>'
            '<p>Nothing in your collection clears every filter. Drop one of them.</p>'
            '<div class="bts"><span class="pb2">Clear filters</span><span class="gb2">Keep only search</span></div></div>')


def zs(h, p, primary=None, ghost="Clear all filters", new=False):
    pr = f'<span class="zp">{primary}</span>' if primary else ""
    return (f'<div class="zs{" mark-new" if new else ""}"><span class="dd"><i></i><i></i><i></i></span><h2>{h}</h2><p>{p}</p>'
            f'<div class="bts">{pr}<span class="zg">{ghost}</span></div></div>')


def coll_one(new=True):
    return zs("Nothing matches “sol” in Gruul.", "Nothing in your collection clears every filter. Drop one of them.", "Keep only search", new=new)


def cmd_ship():
    return zs("Nothing in the pile matches",
              "<b>Krenko, Tin Street Kingpin</b> is in your commanders, but <code>Set: Foundations</code> excludes it. Drop the set filter and you get one row back.",
              "Drop Set: Foundations")


def ph_page(top, body, active):
    return phone(f'<div class="pg">{top}{body}</div>', active=active, h=844)


def dk_page(top, body, active, h=760):
    return desk(f'<div class="pg">{top}<div class="cwrap" style="padding:0">{body}</div></div>', active=active, h=h)


def board():
    head = board_head("Item 6a · two “filters matched nothing” states · #412 §1",
                      "One empty state for a filtered list: the commanders geometry, each surface’s own words",
                      "<code>/collection</code>’s NoResults and <code>/commanders</code>’ ZeroState say the same thing in two drawings: a filled crown on an accent vignette with a filled "
                      "<b>Clear filters</b>, against three hollow diamonds, no ground and a hairline <b>Clear all filters</b>. <b>Call: one component, the commanders geometry wins.</b> "
                      "It is already the app’s common shape (<code>/decks</code> and the set page use the same centred Cinzel heading and the same 44 → 32 hairline buttons), it sits quietly under "
                      "a filter chassis that is still on screen, and its first press names the one fix when there is one. What each surface keeps is its own wording: collection names the query "
                      "and colors it filtered by, commanders names the card a filter hides.", tag="R1")
    row1 = ('<div class="frames">'
            + frame("Today · /collection · 390", ph_page(coll_top(), nr_today(), "Collection"),
                    "The crown, the 7% vignette, a filled Clear filters. Keep only search is desktop-only.")
            + frame("<b>6a</b> · /collection · 390", ph_page(coll_top(), coll_one(), "Collection"),
                    "The shared ZeroState. Heading and body are collection’s shipped words. The one fix leads (<b>Keep only search</b>, now at both widths); <b>Clear all filters</b> follows, "
                    "full width at 48 on a phone, as commanders draws them.")
            + frame("Reference · /commanders · 390 (unchanged)", ph_page(cmd_top(), cmd_ship(), "Commanders"),
                    "The winner, as shipped.")
            + "</div>")
    row2 = ('<div class="frames">'
            + frame("Today · /collection · 1300", dk_page(coll_top(True), nr_today(), "Collection"), "")
            + frame("<b>6a</b> · /collection · 1300", dk_page(coll_top(True), coll_one(), "Collection"),
                    "Buttons hug their labels at 32 from 640, as commanders does.")
            + "</div>")
    row3 = ('<div class="frames">'
            + frame("Reference · /commanders · 1300 (unchanged)", dk_page(cmd_top(), cmd_ship(), "Commanders"), "")
            + "</div>")
    notes = ('<div class="notes" style="grid-template-columns:repeat(3,minmax(0,1fr))">'
             '<div class="note"><h4>What wins, and what stays</h4><ul><li>Geometry: <code>ZeroState</code> (three hollow 10px diamonds, Cinzel 600 19, body <code>--fg-muted</code> max 520, gap 12, buttons 48 full width on a phone, 32 from 640).</li>'
             '<li>Words: each surface’s own. Collection’s heading keeps its query and color (<code>noResults.heading</code>) and its caption.</li>'
             '<li>Collection’s crown and vignette retire here; the crown stays where it means “empty collection”.</li></ul></div>'
             '<div class="note"><h4>Collection’s presses</h4><ul><li>With a query and filters: <b>Keep only search</b> (primary, the one fix) then <b>Clear all filters</b> (hairline).</li>'
             '<li>Filters only: <b>Clear all filters</b> alone, as commanders’ no-single-fix case.</li>'
             '<li><i>Clear filters</i> becomes <i>Clear all filters</i>, the chassis’s word; <i>Keep only search</i> gets a copy key. For /copy-review.</li></ul></div>'
             '<div class="note"><h4>For engineering</h4><ul><li>Move <code>ZeroState</code> to a shared place (e.g. <code>ui/</code>) and render it from <code>no-results.tsx</code>; delete NoResults’ own markup.</li>'
             '<li>Collection’s breakpoint moves from md to sm with it.</li><li>/decks, precons and the set page are not in this call; they can fold in later.</li></ul></div></div>')
    return doc("Filtered empty", head + row1 + row2 + row3 + notes, 2900).replace("</style>", CSS + "</style>", 1)
