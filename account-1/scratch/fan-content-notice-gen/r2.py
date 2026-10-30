# R2: the notice below the fold on every page (Hugh, 2026-10-17). Reuses R1's generator and replaces the
# signed-in, signed-out and main boards; privacy/terms and themes are unchanged.
import os
import build as B
from build import (notice, mheader, tabbar, rail, tiles, fr, page, crown, DECKS_ZERO, FIRST_RUN, ALL,
                   hero, signup, join, friend, offline, P1A, P1B, P2, FCP_URL)

R2CSS = """
.r2fold{position:absolute;left:0;right:0;height:0;border-top:1.5px dashed #E0913C;z-index:9}
.r2fold span{position:absolute;right:10px;top:-22px;font:600 10px 'IBM Plex Mono',monospace;color:#E0913C;background:#0A0B0F;padding:2px 6px;border-radius:4px;white-space:nowrap}
.scroll{position:absolute;right:8px;top:12px;z-index:9;font:600 10px 'IBM Plex Mono',monospace;color:#8FA6BE;background:#0A0B0F;padding:2px 6px;border-radius:4px}
.so.end{justify-content:flex-end}
.so.end>.pg{flex:none}
.r1tag{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:6px;border:1px solid #3A3D48;color:#959AAD;font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.06em;text-transform:uppercase}
"""
B.BASE_CSS = B.BASE_CSS + R2CSS

PH_H, HDR = 844, 79


def ph_rest(content, active, locked=False, theme="kamigawa"):
    th = 88 if locked else 74
    mh = PH_H - HDR - th
    return (f'<div class="ph" data-theme="{theme}">' + mheader() +
            f'<div class="col"><div class="main" style="flex:none;min-height:{mh}px">{content}</div>{notice()}'
            f'<div class="res" style="height:{th}px"></div></div>' +
            f'<div class="r2fold" style="bottom:{th}px"><span>the fold · the notice starts here, under the bar</span></div>'
            + tabbar(active, locked) + '</div>')


def ph_end(content, active, locked=False, theme="kamigawa"):
    th = 88 if locked else 74
    mh = PH_H - HDR - th
    return (f'<div class="ph" data-theme="{theme}"><span class="scroll">scrolled to the end</span>'
            f'<div class="col end"><div class="main" style="flex:none;height:{mh}px;overflow:hidden">{content}</div>{notice()}'
            f'<div class="res" style="height:{th}px"></div></div>' + tabbar(active, locked) + '</div>')


def dk_rest(content, active):
    return (f'<div class="dk" data-theme="kamigawa">' + rail(active) +
            f'<div class="dcol"><div class="main" style="flex:none;min-height:818px">{content}</div>{notice("wide")}</div>'
            f'<div class="r2fold" style="bottom:0;left:62px"><span>the fold · the notice starts here</span></div></div>')


def dk_end(content, active):
    return (f'<div class="dk" data-theme="kamigawa"><span class="scroll">scrolled to the end</span>' + rail(active) +
            f'<div class="dcol end"><div class="main" style="flex:none;height:818px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end">{content}</div>{notice("wide")}</div></div>')


def signed_in():
    s1 = fr("S1 · Short page · 390 · at rest · Decks, none yet", ph_rest(DECKS_ZERO, "Decks"),
            "<b>Nothing new on screen.</b> The page is at least one screen tall (the viewport less the header and the tab bar), "
            "so the notice starts at the tab bar's top edge, out of sight. The page looks exactly as it ships today.", 390)
    s1b = fr("S1b · Short page · 390 · scrolled to the end", ph_end(DECKS_ZERO, "Decks"),
             "<b>A short scroll, about 150px, brings it up</b> above the tab bar; the header slides away on the way down "
             "(quick return, as shipped). No empty band: the column's reserve sits under the bar, where it belongs.", 390)
    s2 = fr("S2 · Long page · 390 · Collection, scrolled to the end", B.phone_in(tiles(ALL[:12]), "Collection", end=True, header=False),
            "Unchanged from R1: a long page carries it after its last row, 24px clear of the tab bar.", 390)
    s3 = fr("S3 · Locked · 390 · at rest · Home, first run, 88px bar", ph_rest(FIRST_RUN, "Home", locked=True),
            "<b>The locked bar is 88px and the fold moves with it</b>: the notice mounts inside the shell's wrapper, so the "
            "page's minimum height and the reserve both read the resolved <code>--tabbar-h</code>.", 390)
    s3b = fr("S3b · Locked · 390 · scrolled to the end", ph_end(FIRST_RUN, "Home", locked=True),
             "Scrolled, it ends 24px clear of the taller bar.", 390)
    r1 = fr('<span class="r1tag">R1</span>&nbsp; Short page · notice at the foot of the screen', B.phone_in(DECKS_ZERO, "Decks"),
            "R1's call, for comparison: visible on every short page without a scroll. Superseded by S1.", 390)
    d1 = fr("S4 · Short page · desktop · at rest", dk_rest(DECKS_ZERO, "Decks"),
            "<b>Desktop: the page is at least the window's height</b>, so on a short page the notice waits just below it.", 1300)
    d1b = fr("S4b · Short page · desktop · scrolled to the end", dk_end(DECKS_ZERO, "Decks"),
             "In the column beside the rail, never under it: hairline across the column, text at the 34px gutter, held to 720px.", 1300)
    d2 = fr("S5 · Long page · desktop · Collection, scrolled to the end", B.desk_in(tiles(ALL[:12]), "Collection", end=True),
            "Unchanged from R1. The rail is sticky and never runs under the notice.", 1300)
    body = f"""
<div class="bh"><span class="k">Fan Content notice · R2 · board 2 of 5</span><h2>Signed in · below the fold</h2>
<p><b>R2 (Hugh, 2026-10-17): present on every page, never in the way.</b> The notice is always the last thing on the page and always starts at or below the fold: a short page looks as it ships and shows the notice only to a reader who scrolls; a long page carries it after its content. Drawn in Neon Rain over the shipped shell; the dashed pink outline marks the notice, the orange line the fold.</p></div>
<div class="sec"><h3>Phone · short page</h3><div class="frames">{s1}{s1b}{r1}</div></div>
<div class="sec"><h3>Phone · locked collection (88px bar)</h3><div class="frames">{s3}{s3b}</div></div>
<div class="sec"><h3>Phone · long page</h3><div class="frames">{s2}</div></div>
<div class="sec"><h3>Desktop</h3><div class="frames" style="flex-direction:column;gap:56px">{d1}{d1b}{d2}</div></div>
"""
    return page("Fan Content notice · signed in", body, 1500)


def ph_out_rest(pg_html, wash):
    return (f'<div class="ph {wash}" data-theme="amonkhet"><div class="so"><div class="pg" style="flex:none;height:842px">{pg_html}</div>'
            f'{notice("c out")}</div><div class="r2fold" style="bottom:0"><span>the fold · the notice starts here</span></div></div>')


def ph_out_end(pg_html, wash):
    return (f'<div class="ph {wash}" data-theme="amonkhet"><span class="scroll">scrolled to the end</span><div class="so end">'
            f'<div class="pg" style="height:842px;overflow:hidden">{pg_html}</div>{notice("c out")}</div></div>')


def dk_out_end(pg_html, wash):
    return (f'<div class="dk {wash}" data-theme="amonkhet"><span class="scroll">scrolled to the end</span><div class="so end" style="flex:1">'
            f'<div class="pg" style="height:818px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end">{pg_html}</div>{notice("wide c")}</div></div>')


def signed_out():
    rows = [
        ("O1 · Landing <code>/</code>", hero(), hero(True), "wash1", "washd",
         "At rest the landing is exactly as shipped, the hero centered in the whole screen. The notice is the only thing below it."),
        ("O2 · <code>/sign-up</code>", signup(), signup(True), "wash18", "washd",
         "Top-aligned on the phone as shipped; the notice waits under the page's own <code>min-h-screen</code>."),
        ("O3 · <code>/join/[token]</code>, valid invite", join(), join(), "wash18", "wash18",
         "The tallest signed-out page fits its screen as shipped; the notice follows the fine print after a short scroll."),
        ("O4 · <code>/friend/[token]</code>, signed out", friend(), friend(True), "wash1", "washd",
         "Centered at every width as shipped; the notice below."),
        ("O5 · <code>/offline</code>", offline(), offline(), "wash1", "wash1",
         "Served by the service worker with no credentials, so it is always the bare branch's render and carries the notice with no special case."),
    ]
    secs = []
    for lab, ph, dk, w1, w2, cap in rows:
        secs.append(f'<div class="sec"><h3>{lab}</h3><div class="frames">'
                    f'<div class="fr" style="width:390px"><span class="k">390 · at rest</span>{ph_out_rest(ph, w1)}</div>'
                    f'<div class="fr" style="width:390px"><span class="k">390 · scrolled to the end</span>{ph_out_end(ph, w1)}</div>'
                    f'<div class="fr" style="width:1300px"><span class="k">desktop · scrolled to the end</span>{dk_out_end(dk, w2)}<p class="cap">{cap}</p></div></div></div>')
    body = f"""
<div class="bh"><span class="k">Fan Content notice · R2 · board 3 of 5</span><h2>Signed out · below the fold, centered</h2>
<p><b>R2: every signed-out page keeps its shipped <code>min-h-screen</code></b>, so at rest it looks exactly as it does today and the notice waits one scroll below it. Same component, centered on the page's axis, hairline across the window, <code>24px + env(safe-area-inset-bottom)</code> at its foot. Drawn in Low Sun, the theme a reader without a cookie gets. Desktop at rest is the shipped page, so only the scrolled frame is drawn.</p></div>
{''.join(secs)}
"""
    return page("Fan Content notice · signed out", body, 2020, theme="amonkhet")


def main():
    m = B.main()
    old_call = m[m.index('<div class="note"><span class="pin">1</span>'):m.index('<div class="note"><span class="pin">2</span>')]
    new_call = """<div class="note"><span class="pin">1</span> <b>Placement (R2, Hugh 2026-10-17): present on every page, always at or below the fold.</b> The notice is the last thing on every page and is never fixed. A short page is at least one screen tall, so it looks exactly as it ships and the notice appears only to a reader who scrolls (about 150px on the phone); a long page carries it after its content.
<ul><li><b>Not the root mount.</b> A footer after <code>&lt;Shell&gt;</code> lands below the fold too, but behind an empty 74px band (the column's reserve sits above it) and can't read the locked 88px bar. Mounting inside the column gives the same below-the-fold result without either.</li>
<li><b>Two mounts of one component, both in <code>shell.tsx</code>:</b> after <code>ShellMain</code> inside the signed-in column (G1), and after <code>children</code> in the bare branch (G2). The signed-out pages keep their shipped <code>min-h-screen</code> and are not edited.</li>
<li><b>It clears the tab bar and sheets with the column's own reserve</b>, and the fold moves with the locked 88px bar (S3).</li>
<li><b>Desktop:</b> in the column beside the rail, never under it; hairline across the column, text at the 34px gutter, held to 720px.</li></ul></div>
"""
    m = m.replace(old_call, new_call)
    m = m.replace("Each page swaps <code>min-h-screen</code> for <code>flex-1</code> (G2) and keeps its own composition: <code>/</code>, <code>/friend</code> and <code>/offline</code> center in the space above the notice; <code>/sign-up</code> and <code>/join</code> stay top-aligned on the phone. No per-shell margin tuning.",
                  "Each page keeps its shipped composition and <code>min-h-screen</code>, untouched; the notice waits one scroll below it. No per-shell margin tuning.")
    old_g1 = m[m.index("<tr><td><b>G1</b></td>"):m.index("<tr><td><b>G3</b></td>")]
    new_g = """<tr><td><b>G1</b></td><td><b>Signed in.</b> Move <code>ShellMain</code>'s <code>pb-[calc(var(--tabbar-h)+var(--about-sheet-h,0px))] md:pb-0</code> to its parent column and render <code>&lt;FanContentNotice /&gt;</code> after <code>ShellMain</code> inside it (a real <code>contentinfo</code> landmark beside <code>&lt;main&gt;</code>). Give <code>ShellMain</code> <code>min-h-[calc(100dvh-var(--header-h,79px)-var(--tabbar-h))] md:min-h-dvh</code> so the notice always starts at or below the fold. Check nothing reads <code>main</code>'s padding.</td><td>Eng</td></tr>
<tr><td><b>G2</b></td><td><b>Signed out.</b> <code>Shell</code>'s bare branch returns <code>&lt;&gt;{children}&lt;FanContentNotice align="center" /&gt;&lt;/&gt;</code>. The pages keep <code>min-h-screen</code>, so it lands below the fold with no page edits. No mount in <code>layout.tsx</code>. A1's every-branch test asserts both mounts.</td><td>Eng</td></tr>
"""
    m = m.replace(old_g1, new_g)
    m = m.replace("Signed in (board 2), the five signed-out surfaces (board 3)", "Signed in (board 2), the five signed-out surfaces (board 3), below the fold on a short page")
    m = m.replace("<tr><td style=\"width:300px\"><b>Signed in</b></td><td>Short, long and locked at 390; the root mount as rejected; short and long on desktop.</td></tr>",
                  "<tr><td style=\"width:300px\"><b>Signed in</b></td><td>Short and locked at rest and scrolled, long, R1's placement for comparison; desktop at rest and scrolled.</td></tr>")
    m = m.replace("<code>/offline</code>, each at 390 and desktop.</td></tr>", "<code>/offline</code>: 390 at rest and scrolled, desktop scrolled.</td></tr>")
    m = m.replace("Fan Content notice · R1 · 2026-10-17 · board 1 of 5", "Fan Content notice · R2 · 2026-10-17 · board 1 of 5")
    m = m.replace("This board makes the five Open calls.", "This board makes the five Open calls. <b>R2 (Hugh, 2026-10-17): the notice sits below the fold on every page (call 1); everything else approved as drawn.</b>")
    assert "Placement (R2, Hugh 2026-10-17): present" in m and "G2</b></td><td><b>Signed out." in m
    return m


if __name__ == "__main__":
    out = os.path.join(B.OUT)
    for fn, f in (("Main.dc.html", main), ("Signed-In.dc.html", signed_in), ("Signed-Out.dc.html", signed_out)):
        open(os.path.join(out, fn), "w").write(f())
    print("R2 written")
