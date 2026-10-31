"""Item 1 · Home's New in the app banner: the page glyph in place of the About crop, and one sentence per line."""
import lib8 as L
SRC = 'design_handoff_the99_about_visual/Ways-In.dc.html'
s = L.load(SRC)
P1 = L.frame_by_label(s, 'Banner</b> · one launch · phone')
P2 = L.frame_by_label(s, 'Banner</b> · two launches · phone')
D1 = L.frame_by_label(s, 'Banner</b> · one launch · desktop')

# The rail/tab glyphs (shell/nav-icons.tsx), 19px on a 20 box, 1.5 stroke.
G = {
 'home': '<path d="M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z"/>',
 'decks': '<rect x="6.6" y="3.2" width="10" height="13" rx="1.6"/><path d="M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2"/>',
 'friends': '<circle cx="7.6" cy="7.4" r="2.7"/><path d="M2.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 4.8 4.5"/><path d="M12.4 4.9a2.4 2.4 0 1 1 1.3 4.5"/><path d="M14.6 11.6c1.5.5 2.4 1.9 2.7 4"/>',
}
def glyph(k, cls='gp'):
    return (f'<span class="{cls}"><svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" '
            f'stroke-linecap="round" stroke-linejoin="round">{G[k]}</svg></span>')

CSS = """<style>
.gp{box-sizing:border-box;flex:none;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;
 background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);color:var(--accent)}
.gs{box-sizing:border-box;flex:none;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:7px;
 background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);color:var(--accent)}
.gs svg{width:16px;height:16px}
.bn.g8{align-items:flex-start;padding:10px 4px 10px 12px}
.bn.g8 .tx{padding-top:0}
.dk .bn.g8{align-items:center;padding:7px 8px 7px 10px}
.bn2 li.g8{align-items:flex-start}
.bn2 li.g8 .gs{margin-top:-2px}
.dashx{outline:1.5px dashed rgba(198,83,63,.85);outline-offset:3px;border-radius:6px}
</style>"""

TOP_LEAD = '<b>New on Home:</b> The top story is the one thing you haven’t seen yet that matters most.'
TOP_REST = ' You choose what can lead in Settings: a new set, a combo you can now make, and more.'
MATCH = '<b>New on Decks:</b> Matchups splits a deck’s games by who you played against.'
SPARE = '<b>New on Shopping:</b> ask a friend for a spare.'
CROP_TOP = '<span class="crop dashx"><img src="art/p-home-feed.webp" alt="" style="left:-6px;top:-118px;width:120px;height:260px"></span>'

# ---- phone, now: the band with the top story's full words and the 44x32 crops
now_p = P2
i = now_p.find('<ul style="margin-left:32px">'); j = now_p.find('</ul>', i) + 5
ul_now = ('<ul style="margin-left:32px">'
          f'<li>{CROP_TOP}<span>{TOP_LEAD}{TOP_REST} <a>Show me</a></span></li>'
          + now_p[now_p.find('<li>', i):j])
now_p = now_p[:i] + ul_now + now_p[j:]
now_p = now_p.replace('<li><span class="crop"><img src="art/p-deck-games', '<li><span class="crop dashx"><img src="art/p-deck-games', 1)
now_p = now_p.replace('<li><span class="crop"><img src="art/p-deck-shopping', '<li><span class="crop dashx"><img src="art/p-deck-shopping', 1)
now_p = now_p[now_p.find('<div class="ph"'):now_p.rfind('<p class="cap">')]

# ---- phone, proposed: the band, a glyph per line, one sentence each
new_p = P2
i = new_p.find('<ul style="margin-left:32px">'); j = new_p.find('</ul>', i) + 5
ul = ('<ul style="margin-left:32px">'
      f'<li class="g8">{glyph("home","gs")}<span>{TOP_LEAD} <a>Show me</a></span></li>'
      f'<li class="g8">{glyph("decks","gs")}<span>{MATCH} <a>Show me</a></span></li>'
      f'<li class="g8">{glyph("decks","gs")}<span>{SPARE} <a>Show me</a></span></li></ul>')
new_p = new_p[:i] + ul + new_p[j:]
new_p = new_p[new_p.find('<div class="ph"'):new_p.rfind('<p class="cap">')]

# ---- phone, proposed: one launch alone (the top story)
one_p = P1
a = one_p.find('<section class="bn">'); b = one_p.find('</section>', a) + 10
one_p = (one_p[:a] + f'<section class="bn g8">{glyph("home")}<div class="tx"><p>{TOP_LEAD}</p><a>Show me</a></div><span class="x">✕</span></section>'
         + one_p[b:])
one_p = one_p[one_p.find('<div class="ph"'):one_p.rfind('<p class="cap">')]

# ---- desktop: now (crop) and proposed (glyph); and the band at 1300
def dk_with(section, top_pad=6):
    d = D1
    a = d.find('<section class="bn">'); b = d.find('</section>', a) + 10
    d = d[:a] + section + d[b:]
    return d[d.find('<div class="dk"'):d.rfind('<p class="cap">')]
now_d = dk_with('<section class="bn"><span class="crop dashx"><img src="art/d-home-feed.webp" alt="" style="left:-30px;top:-34px;width:140px;height:90px"></span>'
                f'<div class="tx"><p>{TOP_LEAD}{TOP_REST}</p><a>Show me</a></div><span class="x">✕</span></section>')
one_d = dk_with(f'<section class="bn g8">{glyph("home")}<div class="tx"><p>{TOP_LEAD}</p><a>Show me</a></div><span class="x">✕</span></section>')
band_d = dk_with('<section class="bn2" style="padding:6px 8px 6px 14px"><div class="hh"><span class="mark"><i></i></span><h2>New in the app</h2>'
                 '<span class="x" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:13px">✕</span></div>'
                 '<ul style="margin:2px 0 0 32px">'
                 f'<li class="g8" style="font-size:13.5px">{glyph("home","gs")}<span>{TOP_LEAD} <a>Show me</a></span></li>'
                 f'<li class="g8" style="font-size:13.5px">{glyph("decks","gs")}<span>{MATCH} <a>Show me</a></span></li>'
                 f'<li class="g8" style="font-size:13.5px">{glyph("decks","gs")}<span>{SPARE} <a>Show me</a></span></li></ul></section>')
# the band is taller than the one line: the page under it moves down by the difference (drawn by shifting the capture)
band_d = band_d.replace('top:-79px;left:0;width:1300px', 'top:-79px;left:0;width:1300px', 1)

def build():
    body = L.head('1 · Home · New in the app',
                  'The page’s own glyph in place of the screenshot, and one sentence a line',
                  'The About crops are 44x32 (64x48 alone) cuts of a whole screen, too small to read at any width. '
                  'Drawn over the shipped band (About visual, <code>Ways-In</code>) and <code>arrivals-banner.tsx</code>. '
                  'Each line takes the rail and tab glyph of the page Show me lands on, the same 19px drawing the reader presses to get there, in the banner mark’s plate. '
                  'Its words stop at the label’s first sentence; Show me has the rest.')
    body += '<div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>Now</b> · 390 · two launches, the top story first', now_p,
                 'The crops (dashed) are whole screens at 44 wide: nothing in them reads. The top story’s two sentences run six lines beside one.')
    body += L.fr('<b>Proposed</b> · 390 · the band', new_p,
                 'A 28px plate with the page’s glyph (16px), top-aligned with the first line. One sentence a line, so the top story is three lines.')
    body += L.fr('<b>Proposed</b> · 390 · one launch alone', one_p,
                 'A launch alone takes the 36px plate (glyph 19px) where the 64x48 crop was. The ✕ is unchanged.')
    body += '</div><div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>Now</b> · 1300 · one launch, the top story', now_d, 'The 56x38 crop of the Home feed reads as noise.')
    body += L.fr('<b>Proposed</b> · 1300 · one launch alone', one_d,
                 'The 36px plate, centred on the one line. The words fit one line at 1300.')
    body += '</div><div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>Proposed</b> · 1300 · the band, three launches', band_d,
                 'The band at desktop: the heading row as shipped (32px ✕), a 28px plate a line.')
    body += '</div>'
    body += L.rule('The call', [
        '<b>No screenshot in the banner.</b> Each About line draws the glyph of the page its Show me opens (Home, Collection, Commanders, Decks, Friends; Shopping lands on a deck, so Decks), from <code>NavIcon</code>, in <code>--accent</code> on the <code>Mark</code> plate’s tint. 28px plate in the band, 36px for a launch alone. A rule keeps the diamond <code>Mark</code>, as shipped.',
        '<b>One sentence.</b> A label’s line is its lead and the first sentence of its rest. The banner never shows a second sentence; Show me lands on the full label. A rule or a new sentence alone is already one sentence.',
        '<b>Retires</b> <code>LaunchCrop</code>, <code>CROP_SIZES</code>, <code>cropStyle</code>, the crop theme refresh (<code>ThemeRefresh</code> here) and the per-width capture fetch. The banner no longer reads the capture manifest.',
        '<b>Unchanged:</b> the band, its heading, “and N more”, the cap, ✕, focus, and the arrivals’ own lines.',
        '<b>Unblocks</b> Suggested changes v2’s About New mark: its line is <i>New on Decks: Suggested changes …</i> with the Decks glyph.'])
    helm = L.helmet(s) + CSS
    return L.doc('Small items 8 · Home banner', helm, body, 2000)
