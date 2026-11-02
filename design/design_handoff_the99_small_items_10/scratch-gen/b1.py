"""Item 1 · Buying credits: the monthly plan is 50 credits a month (was 60). Plan-and-Cancel redrawn from the shipped
handoff board (design_handoff_the99_buying_credits/R1 - Plan-and-Cancel.dc.html): count, mark and history line move to 50,
the board's UK spellings become the shipped US strings, and the settled A/B pick section goes."""
import lib10 as L, re
SRC = 'design_handoff_the99_buying_credits/R1 - Plan-and-Cancel.dc.html'


def build():
    s = L.load(SRC)
    n = {}
    def rep(old, new):
        nonlocal s
        n[old] = s.count(old); assert n[old], old
        s = s.replace(old, new)
    rep('>60 credits a month<', '>50 credits a month<')
    rep('<span class="dm"><b>60</b></span>', '<span class="dm"><b>50</b></span>')
    rep('>60 credits<', '>50 credits<')
    rep('Cancelling keeps your', 'Canceling keeps your')
    rep('Plan cancelled.', 'Plan canceled.')
    rep('K3 · Cancelled, still', 'K3 · Canceled, still')
    rep('renews monthly until cancelled', 'renews monthly until canceled')
    assert '>60' not in s and '60 credits' not in s, re.findall(r'.{40}\b60\b.{40}', s)[:3]
    # the settled A/B section (A was called, 2026-10-16)
    i = s.find('<div class="sec"><h3>Your pick'); s = s[:i] + s[i + len(L.block(s, i)):]
    # the board head: this round's
    i = s.find('<div class="bh">'); hb = L.block(s, i)
    head = ('<div class="bh"><span class="k">Small items 10 · R1 · account 2 · 2026-11-02 · item 1 · buying credits</span>'
            '<h2>The plan, and canceling it · 50 credits a month</h2><p class="cap" style="max-width:1500px">'
            '<b>The monthly plan is now 50 credits a month (was 60), still $5.</b> Every frame of the shipped Plan-and-Cancel board, redrawn: '
            'the card title <i>50 credits a month</i>, the crown’s diamond reads <b>50</b>, and a month in Purchase history reads <i>50 credits</i>. '
            'The app already reads both from <code>PLANS.monthly.units</code> (<code>packs.ts</code>: 60 became 50, Hugh 2026-11-01), '
            'so the build is the board only. Nothing else moves: $5, rollover with no cap, one-tap cancel (A, called 2026-10-16), Keep my plan. '
            'The board’s own spellings follow the shipped strings: <i>Canceling keeps your…</i>, <i>Plan canceled.</i> '
            'The 74 plan credits in the fixtures are a rollover balance, so they stand. The settled A/B pick section is dropped.</p></div>')
    s = s.replace(hb, head, 1)
    return s
