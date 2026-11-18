"""Small items 12 boards. Each board takes the password-strength board helmet (Main.dc.html) and draws rendered frames
of the shipped components (and the proposals, which are patched copies of them) from art/."""
import re, sys, os, json
from PIL import Image

HELMET_SRC = "/home/user/the-99/design/design_handoff_the99_small_items_11/addendum-password-strength/Main.dc.html"
OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
src = open(HELMET_SRC).read()
head = src[: src.index("</helmet>") + len("</helmet>")]
head = head.replace(".shot{display:block;width:390px;", ".shot{display:block;width:390px;") + ""
EXTRA = """<style>
.shot.w420{width:420px;border-radius:12px}.shot.w340{width:340px;border-radius:12px}.shot.w640{width:640px;border-radius:12px}.shot.w410{width:410px;border-radius:12px}.shot.w720{width:720px;border-radius:10px}.shot.row390{width:390px;border-radius:10px}.shot.flat{border-radius:10px}
.fr.w420{width:420px}.fr.w340{width:340px}.fr.w640{width:640px}.fr.w410{width:410px}.fr.w720{width:720px}
.callout{border:1px solid #262A35;border-radius:12px;padding:16px 18px;background:#11131A;display:flex;flex-direction:column;gap:8px;max-width:1500px}
.open{border-color:rgba(227,154,79,.55)}
</style>"""


def size(img):
    w, h = Image.open(os.path.join(OUT, img)).size
    return w, h


def frame(pill, k, img, cap, cls="", pillcls="now"):
    fcls = cls.split()[0] if cls else ""
    return (f'<div class="fr {fcls}"><div class="state"><span class="pill {pillcls}">{pill}</span><span class="k">{k}</span></div>'
            f'<img class="shot {cls}" src="art/{img}" alt="{k}"><p class="cap">{cap}</p></div>')


def board(name, title, width, kicker, h2, cap, body):
    html = (head.replace("<title>Q1 sign-up at 390</title>", f"<title>{title}</title>") + EXTRA
            + f'\n<div class="board" style="width: {width}px">\n<div class="bh"><span class="k">{kicker}</span><h2>{h2}</h2><p class="cap">{cap}</p></div>'
            + body + "\n</div>\n</x-dc>\n"
            + '<script type="text/x-dc" data-dc-script data-props=\'{"$preview":{"width":WIDTH,"height":HEIGHT}}\'>\nclass Component extends DCLogic {\nrenderVals() { return {}; }\n}\n</script>\n</body>\n</html>\n')
    return name, html


K = "Small items 12 · R1 · account 2 · 2026-11-15"
boards = []

# ── Item 1 ────────────────────────────────────────────────────────────────────────────────────────────────────────
combo = (
    '<p class="sub">Today, for reference</p><div class="row">'
    + frame("Today", "Shipped, 390", "si12-combo-shipped-p.webp", "<b>What ships.</b> Small plates up top, a mono <i>Mana needed</i> label over a mono value, <i>Steps</i> as an unnumbered list (the <code>ol</code> is there, but the app's CSS drops the markers), <code>{W}{U}{B}{R}{G}</code> as raw braces, and <i>Needs</i> last, under the steps it should come before.", pillcls="was")
    + frame("Today", "Shipped, desktop 760", "si12-combo-shipped-d.webp", "<b>The same body at 760.</b> Every label is a 9px mono caption and every value is the same quiet ink, so nothing on the sheet leads.", "w420", "was")
    + "</div>"
    + '<p class="sub">Refreshed, 390 (every way in draws this one body)</p><div class="row">'
    + frame("1a", "From card details", "si12-c-card-p.webp", "<b>Opened from Avatar Aang's combo line.</b> The shipped <code>← Avatar Aang</code> bar stays. The pair sits up top as two cards at card shape with a slight tilt, joined by a <b>+</b>. Avatar Aang is the card under the sheet, so its plate takes no press. With the deck holding both, there is no Add.")
    + frame("1b", "One piece away", "si12-c-oneaway-p.webp", "<b>Pushed from 5 combos one piece away.</b> The missing piece keeps the shipped dashed outline and where-line ($0.25 to buy). Mana needed and Needs sit together in one facts card <i>before</i> the steps, since Needs is what must already be true. Steps are numbered on the first-run step numeral, and <code>{X}</code> symbols draw as the shipped cost pips.")
    + frame("1c", "Long combo, first screen", "si12-c-long-p.webp", "<b>9 steps.</b> The head and the foot (Spellbook, Add) stay pinned. The body scrolls, so the pair and the facts scroll away first.")
    + frame("1c", "Long combo, scrolled to the end", "si12-c-long-p-end.webp", "<b>The end of the list.</b> A faint rule joins each numeral to the next, so a long run reads as one sequence. The count beside <i>Steps</i> says how long it is before you scroll. Steps text is a fixture: Spellbook's own words ship.")
    + "</div>"
    + '<p class="sub">Opened from the feed, on its own (engineering is pointing the combo item here)</p><div class="row">'
    + frame("Feed", "The item that opens it", "si12-feedrow-p.webp", "<b>The shipped combo item</b> on Home and in What's new. Its press now opens the sheet directly, with no card details under it.", "row390", "was")
    + frame("1d", "Feed-opened, 390", "si12-c-feed-p.webp", "<b>Nothing to go back to</b>, so the head is the shipped <code>.hd2</code> (the combos list's head): eyebrow <i>Combos you can make</i> (the feed kind's name), the pair as the title, and the item's line as the lead, then a bare ✕. The body drops its own title. Both plates say where your copy is, and each opens its card details stacked, whose back reads <code>← Avatar Aang + Searing Touch</code>. The foot is the Spellbook link alone: nothing to add.")
    + "</div>"
    + '<p class="sub">Desktop, 760 modal</p><div class="row">'
    + frame("1a", "From card details", "si12-c-card-d.webp", "<b>Two columns.</b> The pair on the left (128px plates, same tilt), the title, facts and steps on the right.", "w420")
    + frame("1b", "One piece away", "si12-c-oneaway-d.webp", "<b>Add stays bottom right</b> in the shipped foot.", "w420")
    + frame("1c", "Long combo", "si12-c-long-d.webp", "<b>9 steps at 760.</b> The modal stops at the shipped 85dvh cap and the body scrolls under the pinned head and foot.", "w420")
    + frame("1c", "Long combo, scrolled", "si12-c-long-d-end.webp", "<b>Scrolled to step 9.</b> The left column scrolls with it, as one body (no sticky column to keep in sync).", "w420")
    + frame("1d", "Feed-opened", "si12-c-feed-d.webp", "<b>Over the page the item was on</b>, with the <code>.hd2</code> head and ✕.", "w420")
    + "</div>"
)
boards.append(board("Combo-Sheet", "Combo sheet refresh", 2400, K, "1 · The combo sheet, refreshed, with numbered steps",
                    "One body for every way into a combo: card details' combo line, the deck's combos one piece away, and now the feed's combo item opened on its own. What changes: the pair leads as two real cards, the facts (Mana needed, Needs) move into one card above the steps, and the steps are numbered with mana symbols drawn as pips. What stays: the shipped plates and where-lines, the dashed missing piece, the back bar, the <code>.hd2</code> head, the foot with Spellbook and Add. Every frame is the shipped component (or a patched copy) rendered with the shipped CSS in Low Sun.",
                    combo))

# ── Item 2 ────────────────────────────────────────────────────────────────────────────────────────────────────────
menu = (
    '<p class="sub">Today, for reference</p><div class="row">'
    + frame("Today", "Sheet, 390", "si12-m-shipped-p.webp", "<b>Display-only.</b> The face in the head shows your signature card, but changing it means going to Friends.", pillcls="was")
    + frame("Today", "Popover, desktop", "si12-m-shipped-d.webp", "<b>The same head at 44px</b> in the rail's popover.", "w340", "was")
    + "</div>"
    + '<p class="sub">The face is the press (no new menu row)</p><div class="row">'
    + frame("2a", "Sheet, with a card", "si12-m-face-p.webp", "<b>Friends' face button, brought here.</b> The face gets the same 24px ✎ badge Friends' head draws (<code>friends-head.tsx</code>), and the whole face is the press. Named <i>Your signature card: Polyraptor. Change</i>. The rows below are unchanged.")
    + frame("2a", "New piece outlined", "si12-m-mark-p.webp", "<b>The only new piece</b>, in the dashed copper outline: the face and its badge.")
    + frame("2b", "Sheet, no card yet", "si12-m-none-p.webp", "<b>No signature card:</b> initials, as today, with a <b>+</b> badge in place of ✎. Named <i>Choose your signature card</i>, the shipped string.")
    + frame("2c", "Picker, over the menu", "si12-m-pick-p.webp", "<b>The shipped SignaturePicker</b>, unchanged, opens over the menu sheet: search, From your decks, printings, <i>Use initials instead</i>. ✕ goes back to the menu.")
    + frame("2d", "Saved", "si12-m-saved-p.webp", "<b>Back on the menu with the new face.</b> A pick saves as on Friends; the picker closes once the write lands, and focus returns to the face. The header trigger redraws too.")
    + "</div>"
    + '<p class="sub">Desktop, the rail popover</p><div class="row">'
    + frame("2a", "Popover, with a card", "si12-m-face-d.webp", "<b>Same badge, 44px face.</b>", "w340")
    + frame("2b", "No card yet", "si12-m-none-d.webp", "<b>Initials and +.</b>", "w340")
    + frame("2c", "Picker", "si12-m-pick-d.webp", "<b>The picker's 520 modal</b> opens over the page and the popover, which stays open under the scrim with the face outlined (Friends' picking outline). ✕ or a save returns to the popover.", "w640")
    + frame("2d", "Saved", "si12-m-saved-d.webp", "<b>The new face</b> in the popover head and on the rail trigger.", "w340")
    + "</div>"
)
boards.append(board("Account-Menu", "Signature card from menu", 2480, K, "2 · Change your signature card from the account menu",
                    "Hugh: <i>Enable avatar editing from the user menu.</i> The call: the face in the menu's head becomes the press, drawn exactly as Friends' head face (✎ badge, or + with no card), and it opens the same shipped picker over the menu. No new menu row (Hugh's rule), no new screen, and Friends keeps its own way in.",
                    menu))

# ── Item 3 ────────────────────────────────────────────────────────────────────────────────────────────────────────
rows = (
    '<p class="sub">390</p><div class="row">'
    + frame("Today", "Shipped", "si12-r-shipped-p.webp", "<b>As built from the R1 canvas:</b> <code>manapool</code> is pushed to the end of the line (<code>ml-auto</code>), far from the figure it labels.", "row390", "was")
    + frame("3", "Beside the price", "si12-r-new-p.webp", "<b>The stamp follows the figure</b>, 6px after it, inside the price's own item: <code>● $3.40 manapool</code>. It wraps with the price, so it never ends up alone on a line. Not stocked reads <code>○ not stocked manapool</code>.", "row390")
    + frame("3", "Moved piece outlined", "si12-r-mark-p.webp", "<b>The moved stamp</b> in the dashed copper outline.", "row390")
    + "</div>"
    + '<p class="sub">Desktop (Discover\'s list column)</p><div class="row">'
    + frame("Today", "Shipped", "si12-r-shipped-d.webp", "<b>At width the gap is widest:</b> the stamp sits at the column's right edge over the hide glyph.", "w720", "was")
    + frame("3", "Beside the price", "si12-r-new-d.webp", "<b>Beside the figure at every width.</b> Nothing else on the line moves: count, separator, dot, figure, stamp.", "w720")
    + "</div>"
    + '<div class="callout"><h3 class="sub">Every row with a priced source stamp</h3><p class="cap">The <code>manapool</code> stamp is drawn in one place in <code>src</code>: <code>commander-row.tsx</code> (the string is <code>discoveryCopy.price.source</code>). That one row is Discover\'s list and the Commanders place\'s list (<code>commanders-list.tsx</code>), so this one move fixes both. Card details, the deck price strip, Shopping and the cart name Mana Pool as links or buttons, not as a stamp beside a figure, so they are unchanged.</p></div>'
)
boards.append(board("Price-Label", "Discover price label", 1560, K, "3 · The price source label sits beside the price",
                    "Hugh saw <i>manapool</i> sitting far from the price on Discover's commander rows. It was built as the R1 canvas drew it. Redrawn here beside the figure.",
                    rows))

# ── Main ──────────────────────────────────────────────────────────────────────────────────────────────────────────
main = (
    '<div class="cols">'
    '<div class="sec"><h3>1 · Combo sheet refresh</h3><ol class="li">'
    '<li><b>One body for all three ways in</b> (card details, combos one piece away, the feed). Only the head changes: the shipped back bar where there is something to go back to, the shipped <code>.hd2</code> head with ✕ when the feed opens it on its own.</li>'
    '<li><b>The pair leads</b> as two cards at card shape, tilted 2.5° toward each other with a <b>+</b> between (150px on the phone, 128px at 760). Shipped plates, where-lines and the dashed missing piece.</li>'
    '<li><b>Facts before steps:</b> Mana needed and Needs in one rail card above the steps (Needs is what must be true before step 1).</li>'
    '<li><b>Numbered steps</b> on the first-run step numeral (22px, accent ink), a faint rule joining them, <i>Steps 9</i> as a count, and <code>{X}</code> drawn as the shipped cost pips inside the text.</li>'
    '<li><b>Long combos scroll</b> under a pinned head and foot. No collapse, no "show all".</li>'
    '<li><b>Feed-opened:</b> eyebrow <i>Combos you can make</i>, the pair as title, lead <i>You added Searing Touch. You own both halves now.</i> (DRAFT; the first sentence is the shipped feed line). Plates say where each copy is; no Add.</li>'
    '</ol></div>'
    '<div class="sec"><h3>2 · Signature card from the account menu</h3><ol class="li">'
    '<li><b>The face is the press</b>, not a new menu row. Same ✎ badge as Friends\' head; + with no card.</li>'
    '<li><b>Opens the same picker</b> (<code>SignaturePicker</code>, unchanged) over the menu. On the phone its sheet covers the menu sheet; on desktop its modal sits over the popover, which stays open.</li>'
    '<li><b>Save or ✕ returns to the menu</b>, with the new face in the head and on the trigger, focus on the face.</li>'
    '</ol><h3>3 · Price source label</h3><ol class="li">'
    '<li><b>Beside the figure</b>, 6px after it, inside the price\'s own item, at every width. <code>ml-auto</code> retires.</li>'
    '<li><b>Only one row draws a priced source stamp</b> (<code>commander-row.tsx</code>, used by Discover and the Commanders list), so this one change covers every such row.</li>'
    '</ol></div></div>'
    '<div class="callout open"><h3 class="sub">Open for Hugh</h3><ol class="li">'
    '<li><b>The tilt on the combo pair.</b> Drawn at 2.5°. Flat is the quieter option if it reads as too playful in a reference sheet.</li>'
    '<li><b>Feed lead copy.</b> <i>You own both halves now.</i> is new (DRAFT), after the shipped <i>You added Searing Touch.</i></li>'
    '<li><b>Picker over the menu, or in place of it?</b> Drawn over it (the menu waits underneath, so a save lands you back where you were). Closing the menu first is the other option.</li>'
    '</ol></div>'
    '<div class="row">'
    + frame("1b", "Combo, one piece away", "si12-c-oneaway-p.webp", "")
    + frame("1d", "Combo, feed-opened", "si12-c-feed-p.webp", "")
    + frame("2a", "Menu face, the press", "si12-m-face-p.webp", "")
    + frame("3", "Price label", "si12-r-new-p.webp", "", "row390")
    + "</div>"
)
boards.insert(0, board("Main", "Small items 12", 1780, K, "Small items 12 · combo sheet, signature card from the menu, price label",
                       "Three small changes from Hugh's notes. Each is drawn at 390 and at desktop over the shipped component it changes, rendered with the shipped CSS (Low Sun). New or moved pieces get a dashed copper outline on their own frame. Strings marked DRAFT go through /copy-review.",
                       main))

os.makedirs(OUT, exist_ok=True)
for name, html in boards:
    open(os.path.join(OUT, name + ".dc.html"), "w").write(html)
    print(name)
