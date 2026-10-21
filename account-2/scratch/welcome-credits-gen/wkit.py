"""Welcome credits R1 (account 2, 2026-10-21): the shared pieces.

Drawn over the shipped surfaces: the first-run Home (FirstRunChecklist, step 1 with the ways group, the locked steps,
the Friends row, About's line), the dashboard Home, the account menu chip (M1b), the credit line on Proposed cuts'
press, and /credits' balance. Reuses account 1's buying-credits kit (ck.py, kit.py) for the shell, the credit line,
the /credits page and the menu. Every string the reader sees comes from W (placeholders for /copy-review)."""
from ck import *
import ck, kit
from b_theme import THEMES, theme_css

ck.MENU_COUNT["v"] = "mark"

# ---------------------------------------------------------------- fixtures
# Account created Oct 21 (today); the lot expires 30 days after the ACCOUNT, Nov 20. Production's free allowance is
# 1 a day (MODEL_DAILY_ALLOWANCE=1), so the free count reads `of 1`.
EXP_LONG = "November 20"
EXP_SHORT = "Nov 20"

# ---------------------------------------------------------------- copy (placeholders, owed to /copy-review)
FREE_L6 = "Browsing is always free. Anything we write just for you uses a credit."  # R4's final line, Hugh 2026-10-21
NEEDS_A_DECK = "Needs a deck, and you have none yet."  # showcaseCopy.needsADeck, shipped

W = {
    "title": "Where credits work",
    "live": lambda left, total: (f"You have <b>{total} welcome credits</b> to try these, until {EXP_LONG}." if left == total
                                 else f"<b>{left} of your {total} welcome credits</b> are left, until {EXP_LONG}."),
    "expiring": lambda left: f"<b>{left} welcome credit{'s' if left != 1 else ''}</b> expire in 3 days, on {EXP_LONG}.",
    "usedUp": lambda total: f"You’ve used all {total} welcome credits. Your free credit still comes back every day.",
    "intro": "Your free credit each day is spent first, so welcome credits pay for the runs after it.",
    "tryIt": "Try it",
    "teaser": "See packs and the monthly plan",
    "dismiss": "Close",
}

ROWS = [  # writtenForYouCopy.rows, shipped, reused whole (name, where, what, cost, short)
    ("overview", "Overview", "A deck’s Analysis tab", "Reads the whole list and says what the deck does and how it wins.", "1 credit each", "each"),
    ("suggested", "Suggested changes", "A deck’s Analysis tab", "Up to five swaps, read from your games, your notes and the list.", "1 credit per run", "per run"),
    ("look-deeper", "Look deeper, in Proposed cuts", "A deck’s Analysis tab", "Names the cards to cut, not just where the deck runs long.", "1 credit per look", "per look"),
    ("help-me-choose", "Help me choose, with “Anything else?”", "New deck", "Reads what you type and ranks commanders against it.", "1 credit per search", "per search"),
    ("find-a-deck-read", "Which deck needs it most?", "A card’s details", "Takes a card through each deck’s plan and names the ones it really helps.", "1 credit per read", "per read"),
]
# `Try it` only where the tool has a landing of its own (src/lib/discovery/tools.ts). Overview has none; the fits read
# borrows find-a-deck's, so it has none of its own (ruled: one landing, never a second).
LANDING = {"suggested": "suggested-changes", "look-deeper": "proposed-cuts", "help-me-choose": "help-me-choose"}
NEEDS_DECK = {"overview", "suggested", "look-deeper", "find-a-deck-read"}

# The credit line and chip (creditsCopy additions)
L = {
    "withWelcome": "1 of 1 free · 15 welcome",
    "welcomeNext": "0 of 1 free · reset at 2:01 AM · this run uses 1 of 15 welcome",
    "welcomeNextPart": "0 of 1 free · reset at 2:01 AM · this run uses 1 of 9 welcome",
    "welcomePaid": "0 of 1 free · reset at 2:01 AM · this run uses 1 of 9 welcome · 40 paid",
    "expiring": "9 welcome credits expire Nov 20",
    "limit": "Today’s 20 credit runs are used. 9 welcome and 21 paid are banked · back at 2:01 AM",
    "firstWelcome": "Uses a welcome credit.",
    "spent": "0 of 1 left · reset at 2:01 AM · What uses credits?",
    "standing": "1 of 1 left",
}
CELL = {"welcomeSub": f"expire {EXP_SHORT}", "welcomeSoon": f"expire in 3 days, {EXP_SHORT}"}

# ---------------------------------------------------------------- CSS
WCSS = r"""
:root{--accent-dim:var(--accent-shadow);--accent-text:var(--accent);--fg-locked:#606476}
.th-amonkhet{--fg-locked:#6E6654;--accent-dim:var(--accent-shadow);--accent-text:var(--accent)}.th-kaldheim{--fg-locked:#5F6D6E;--accent-dim:var(--accent-shadow);--accent-text:var(--accent)}
/* first-run Home, as shipped (FirstRunChecklist) */
.frp{display:flex;flex-direction:column;min-width:0}
.frhd{padding:16px 16px 0}
.dk .frhd{padding:26px 28px 0}
.frk{margin:0 0 6px;font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.dk .frk{margin-bottom:7px;letter-spacing:.18em}
.frh1{margin:0;font:700 23px/1.15 var(--disp);color:var(--fg)}
.dk .frh1{font-size:27px;line-height:1}
.frpl{margin:12px 0 0;display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--fg-muted)}
.lock{display:inline-block;flex:none}
.abl{margin:14px 16px 0;min-height:46px;padding:7px 14px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-rail);display:flex;align-items:center;gap:12px;font-size:13.5px;line-height:1.45;color:var(--fg-body)}
.dk .abl{margin:18px 28px 0}
.abl .bm{flex:none;width:22px;height:22px;border-radius:6px;background:color-mix(in srgb,var(--accent) 16%,transparent);border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);display:flex;align-items:center;justify-content:center}
.abl .bm i{width:7px;height:7px;background:var(--accent);transform:rotate(45deg);display:block}
.abl b{color:var(--fg);font-weight:600}
.abl u{color:var(--fg);text-decoration-color:color-mix(in srgb,var(--accent) 55%,transparent);text-underline-offset:3px;white-space:nowrap}
.frst{display:flex;flex-direction:column;gap:11px;padding:16px 16px 20px}
.dk .frst{gap:12px;padding:20px 28px 26px}
.s1{display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 16px 16px;border:1px solid var(--accent);background:var(--surface-inset);border-radius:14px;text-align:center}
.dk .s1{flex-direction:row;align-items:flex-start;gap:18px;padding:18px;text-align:left}
.fan9{position:relative;width:88px;height:92px;flex:none}
.dk .fan9{width:74px;height:82px}
.fan9 span{position:absolute;width:50px;height:68px;border-radius:6px;border:1px solid var(--border-strong)}
.dk .fan9 span{width:44px;height:60px;border-radius:5px}
.fan9 .a{top:14px;left:8px;transform:rotate(-14deg);background:color-mix(in srgb,var(--surface-inset) 50%,var(--elevated))}
.fan9 .b{top:10px;left:18px;background:var(--elevated)}
.fan9 .c{top:14px;left:30px;transform:rotate(13deg);border-color:var(--accent);background:var(--surface);display:flex;align-items:center;justify-content:center;font:700 17px var(--disp);color:var(--accent)}
.dk .fan9 .a{top:12px;left:6px}.dk .fan9 .b{top:9px;left:14px}.dk .fan9 .c{top:12px;left:24px;font-size:15px}
.s1c{display:flex;flex-direction:column;gap:12px;width:100%;min-width:0}
.dk .s1c{gap:7px;flex:1}
.s1c .t{font:600 19px var(--disp);color:var(--fg)}
.s1c p{margin:0;font-size:13.5px;line-height:1.6;color:var(--fg-muted)}
.dk .s1c p{font-size:13px}
.s1b{display:flex;flex-direction:column;gap:8px}
.dk .s1b{flex-direction:row;margin-top:4px}
.bp{height:44px;border-radius:10px;background:var(--fg);color:var(--bg);display:flex;align-items:center;justify-content:center;font:600 14px 'IBM Plex Sans',sans-serif}
.bg2{height:44px;border-radius:10px;border:1px solid var(--border-strong);color:var(--fg);display:flex;align-items:center;justify-content:center;font:400 14px 'IBM Plex Sans',sans-serif}
.dk .bp,.dk .bg2{height:32px;border-radius:8px;padding:0 14px;font-size:12.5px}
.ways{margin-top:4px;padding-top:12px;border-top:1px solid var(--border-strong);display:flex;flex-direction:column;text-align:left}
.ways .wk{font:500 9.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:2px}
.ways .wr{min-height:44px;display:flex;align-items:center;justify-content:space-between;font:600 14px 'IBM Plex Sans',sans-serif;color:var(--fg)}
.ways .wr+.wr{border-top:1px solid var(--border)}
.ways .wr i{font-style:normal;font-weight:400;color:var(--fg-faint)}
.ways .wr .wt i{display:none}
.dk .ways{margin-top:12px;gap:6px}
.dk .ways .wg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;max-width:560px}
.dk .ways .wr{flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:2px;padding:7px 10px;margin-left:-10px;font-size:13px;border:0}
.ways .wr small{display:none}
.dk .ways .wr small{display:block;font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:var(--fg-muted)}
.dk .ways .wr i{display:none}
.dk .ways .wr .wt i{display:inline;margin-left:4px}
.lst{display:flex;align-items:center;gap:12px;min-height:56px;padding:14px 15px;border-radius:14px;border:1px solid var(--border);background:var(--surface-rail)}
.dk .lst{gap:14px;padding:15px 18px}
.lst .n{width:22px;height:22px;flex:none;border-radius:6px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font:11px 'IBM Plex Mono',monospace;color:var(--fg-disabled)}
.lst .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.lst .tx b{font:600 15px var(--disp);color:var(--fg-locked)}
.dk .lst .tx b{font-size:16px}
.lst .tx span{font-size:12px;color:var(--fg-locked)}
.frw{display:flex;align-items:center;gap:12px;min-height:56px;padding:12px 15px;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface-rail)}
.dk .frw{gap:14px;padding:13px 18px}
.frw .sl{width:22px;height:22px;flex:none;border-radius:6px;border:1.5px dashed var(--border-dashed);display:flex;align-items:center;justify-content:center;font:300 14px/1 'IBM Plex Sans',sans-serif;color:var(--fg-muted)}
.frw .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.frw .tx b{font:600 15px var(--disp);color:var(--fg)}
.dk .frw .tx b{font-size:16px}
.frw .tx span{font-size:12px;color:var(--fg-muted)}
.frw .ch{color:var(--fg-faint)}
/* phone tab bar with the lock's bracket (first run, Collection open at zero cards) */
.tbar2{height:84px;flex:none;position:relative;border-top:1px solid var(--border);background:var(--surface-rail);z-index:5;padding:14px 8px 14px;display:flex;align-items:center}
.tbar2 span.t{flex:1;height:52px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:9px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--fg-faint)}
.tbar2 span.t.on{background:var(--surface-inset);color:var(--fg)}
.tbar2 span.t.lkd{color:var(--fg-locked)}
.tbar2 span.t{text-decoration:none}
.tbar2 .brk{position:absolute;top:5px;left:calc(40% + 8px);right:14px;height:9px;border-top:1px solid var(--border-strong);border-left:1px solid var(--border-strong);border-right:1px solid var(--border-strong);border-radius:3px 3px 0 0}
.tbar2 .brk em{position:absolute;left:50%;top:-6px;transform:translateX(-50%);padding:0 6px;background:var(--surface-rail);font:500 8.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-locked);white-space:nowrap;font-style:normal;display:flex;align-items:center;gap:4px}
/* desktop rail with the locked well */
.rwell{width:48px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-sunken);padding:4px 0 8px;display:flex;flex-direction:column;align-items:center;gap:2px;margin-top:4px}
.rwell .rsl{color:var(--fg-locked);margin-bottom:0}
.rwell em{font:500 8px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:var(--fg-locked);font-style:normal;display:flex;flex-direction:column;align-items:center;gap:2px}

/* ---------------- the section: Where credits work (NEW) ---------------- */
.wc{border:1px solid var(--accent-dim);border-radius:14px;background:var(--surface);padding:16px 16px 4px;display:flex;flex-direction:column;position:relative}
.dk .wc{padding:20px 24px 8px}
.wc.dimmed{border-color:var(--border-strong)}
.wc.warn{border-color:color-mix(in srgb,var(--warning) 60%,var(--border-strong))}
.wch{display:flex;align-items:flex-start;gap:14px;padding-right:34px}
.wch .dmk{width:56px;gap:0;padding:6px 0 4px}
.wch .dm{width:36px;height:36px}
.wch .dm b{font-size:14px}
.wcht{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.wcht h3{margin:0;font:600 18px var(--disp);color:var(--fg)}
.dk .wcht h3{font-size:21px}
.wcht .gl{margin:0;font-size:13.5px;line-height:1.5;color:var(--fg-body);text-wrap:pretty}
.wcht .gl b{color:var(--fg);font-weight:600}
.wcht .gl.warn,.wcht .gl.warn b{color:var(--warning)}
.wcx{position:absolute;right:4px;top:4px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:13px}
.dk .wcx{right:10px;top:10px;width:32px;height:32px}
.wcfree{margin:12px 0 0;font-size:13.5px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
.wcfree span{color:var(--fg-muted)}
.dk .wcfree{font-size:14px;margin-top:14px;max-width:880px}
.wcl{margin:10px 0 0;padding:0;list-style:none}
.wcr{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'name chip' 'what what' 'where where';gap:4px 10px;padding:12px 0;border-top:1px solid var(--border)}
.dk .wcr{grid-template-columns:300px minmax(0,1fr) 170px;grid-template-areas:'name what chip' 'where what chip';gap:2px 18px;min-height:52px;align-items:center;padding:8px 0}
.wcr .nm{grid-area:name;font-size:14.5px;font-weight:600;color:var(--fg)}
.dk .wcr .nm{font-size:15px;align-self:end}
.wcr .wh{grid-area:where;font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dk .wcr .wh{align-self:start}
.wcr .wt{grid-area:what;font-size:13.5px;line-height:1.5;color:var(--fg-body)}
.dk .wcr .wt{font-size:14px}
.wcr .cp{grid-area:chip;justify-self:end;align-self:baseline;white-space:nowrap;border-radius:999px;border:1px solid var(--accent-dim);padding:2px 9px;font:11px 'IBM Plex Mono',monospace;color:var(--accent-text)}
.dk .wcr .cp{align-self:center}
.try{display:inline-flex;align-items:center;gap:4px;min-height:24px;font:600 12.5px 'IBM Plex Sans',sans-serif;color:var(--accent-text);position:relative}
.try::after{content:'';position:absolute;left:-8px;right:-8px;top:-10px;bottom:-10px}
.try i{font-style:normal}
.wcnd{margin:0;padding:10px 0 2px;border-top:1px solid var(--border);font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted);display:flex;align-items:center;gap:8px}
.wcnd i{width:6px;height:6px;transform:rotate(45deg);border:1px solid var(--fg-faint);display:block;flex:none}
.wcf{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--border);padding:2px 0}
.wcf .tz{min-height:44px;display:inline-flex;align-items:center;gap:6px;font:600 13.5px 'IBM Plex Sans',sans-serif;color:var(--accent-text)}
.wcf .tz i{font-style:normal}

.dk .wc.narrow{padding:16px 16px 4px}
.dk .wc.narrow .wcht h3{font-size:18px}
.dk .wc.narrow .wcfree{font-size:13.5px;margin-top:12px}
.dk .wc.narrow .wcr{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'name chip' 'what what' 'where where';gap:4px 10px;padding:12px 0;min-height:0;align-items:start}
.dk .wc.narrow .wcr .nm{font-size:14.5px;align-self:start}.dk .wc.narrow .wcr .wt{font-size:13.5px}.dk .wc.narrow .wcr .cp{align-self:baseline}
/* the chip (M1b, shipped), with the count in --fg as built (contrast) */
.chp{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:0 11px 0 10px;border-radius:999px;border:1px solid color-mix(in srgb,var(--accent) 50%,transparent);background:color-mix(in srgb,var(--accent) 16%,transparent);font:500 12px 'IBM Plex Sans',sans-serif;color:var(--fg);align-self:flex-start;margin-top:8px;white-space:nowrap}
.dk .chp,.chp.d{min-height:30px}
.chp .dmi{width:9px;height:9px;transform:rotate(45deg);background:var(--accent);border-radius:1px;display:block;flex:none}
.chp .dmi.o{background:transparent;border:1.5px solid var(--accent)}
.chp b{font:600 13px 'IBM Plex Mono',monospace;color:var(--fg)}
.chp em{font-style:normal;color:var(--accent);margin-left:1px}
.chp.warn{border-color:color-mix(in srgb,var(--warning) 55%,transparent);background:color-mix(in srgb,var(--warning) 14%,transparent)}
.chp.warn .dmi{background:var(--warning)}.chp.warn b,.chp.warn em{color:var(--warning)}
.chp.out{background:transparent;font-weight:600}
.chpl{margin-top:5px;font:11px 'IBM Plex Mono',monospace;color:var(--warning)}
.idb2{display:flex;align-items:flex-start;gap:14px;padding:0 0 18px;border-bottom:1px solid var(--border)}
.idb2 .av2{width:48px;height:48px;border-radius:14px;border:1px solid var(--accent);color:var(--accent);background:var(--bg);display:flex;align-items:center;justify-content:center;font:14px 'IBM Plex Mono',monospace;flex:none}
.idb2 .nm{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.idb2 .nm>b{font-size:16px;font-weight:600}
.idb2 .nm>span.em{font:12px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.amp .idb2{padding:12px 12px 14px;gap:12px}
.amp .idb2 .av2{width:44px;height:44px;border-radius:12px}
.amp .idb2 .nm>b{font-size:14px}.amp .idb2 .nm>span.em{font-size:11px;color:var(--fg-muted)}

/* a moment (candidate A), the tour card (candidate D) */
.mom{position:absolute;z-index:12;width:300px;padding:14px 40px 14px 30px;border-radius:12px;background:var(--elevated);border:1px solid var(--border-strong);box-shadow:0 18px 40px rgba(0,0,0,.55);font-size:13.5px;line-height:1.5;color:var(--fg-body)}
.mom::before{content:'';position:absolute;left:13px;top:21px;width:6px;height:6px;background:var(--accent);transform:rotate(45deg)}
.mom b{color:var(--fg)}
.mom .x{position:absolute;right:6px;top:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:12px}
.mom u{color:var(--fg);text-decoration-color:color-mix(in srgb,var(--accent) 55%,transparent);text-underline-offset:3px}
.halo{position:absolute;z-index:11;border-radius:14px;box-shadow:0 0 0 2px var(--accent),0 0 0 7px color-mix(in srgb,var(--accent) 25%,transparent)}
.tscr{position:absolute;inset:0;z-index:10;background:rgba(6,5,8,.66)}
.tcard{position:absolute;z-index:12;width:340px;padding:18px 19px 16px;border-radius:14px;background:var(--surface-raised);border:1px solid var(--border-strong);box-shadow:0 24px 60px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:9px}
.tcard .tk{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-text)}
.tcard h4{margin:0;font:700 19px var(--disp);color:var(--fg)}
.tcard p{margin:0;font-size:14px;line-height:1.55;color:var(--fg-body)}
.tcard .tf{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.tcard .tn{display:flex;align-items:center;justify-content:space-between;margin-top:4px}
.tcard .dots{display:flex;gap:6px;align-items:center}
.tcard .dots i{width:7px;height:7px;transform:rotate(45deg);background:var(--border-strong);display:block}
.tcard .dots i.on{width:9px;height:9px;background:var(--accent)}
.tcard .nx{height:32px;padding:0 14px;border-radius:8px;background:var(--fg);color:var(--bg);font:600 13px 'IBM Plex Sans',sans-serif;display:flex;align-items:center}
.tcard .x{position:absolute;right:10px;top:10px;color:var(--fg-faint);font-size:12px;width:32px;height:32px;display:flex;align-items:center;justify-content:center}

/* dashboard Home, as shipped (header, Ready to build, No decks yet, Friends) */
.dbh{padding:22px 16px 0;display:flex;flex-direction:column;gap:12px}
.dk .dbh{padding:22px 26px 0;flex-direction:row;align-items:flex-end;gap:16px}
.dbh .kk{margin:0 0 7px;font:10px 'IBM Plex Mono',monospace;letter-spacing:.18em;color:var(--fg-faint)}
.dbh h1{margin:0;font:700 26px/1 var(--disp);color:var(--fg)}
.dk .dbh h1{font-size:28px}
.dbh .bt{display:flex;gap:8px}
.dbh .gh2{height:44px;flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 12px;border-radius:10px;border:1px solid var(--border-strong);font-size:13.5px;color:var(--fg-body)}
.dbh .pr2{height:44px;flex:1;display:flex;align-items:center;justify-content:center;padding:0 14px;border-radius:10px;background:var(--fg);color:var(--bg);font-size:13.5px;font-weight:600}
.dk .dbh .gh2,.dk .dbh .pr2{height:32px;flex:none;border-radius:8px;font-size:12.5px}
.dbb{display:flex;flex-direction:column;gap:12px;padding:14px 16px 16px}
.dk .dbb{flex-direction:row;gap:20px;padding:20px 26px 26px;align-items:flex-start}
.dbl{display:contents}
.dk .dbl{display:flex;flex-direction:column;gap:11px;flex:1;min-width:0}
.dbr{display:contents}
.dk .dbr{display:flex;flex-direction:column;gap:11px;width:316px;flex:none}
.skh{font:10px 'IBM Plex Mono',monospace;letter-spacing:.14em;color:var(--fg-faint);text-transform:uppercase}
.heros{display:grid;grid-template-columns:1fr;gap:12px}
.dk .heros{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.hero{border-radius:14px;border:1px solid var(--border);background:var(--surface-inset);overflow:hidden}
.hero .ha{position:relative;height:210px}
.dk .hero .ha{height:250px}
.hero .ha img{width:100%;height:100%;object-fit:cover;display:block}
.hero .ha::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,color-mix(in srgb,var(--bg) 95%,transparent))}
.hero .hn{position:absolute;left:12px;right:12px;bottom:12px;z-index:2}
.hero .hn b{font:700 18px var(--disp);color:var(--fg);display:block}
.hero .hn span{display:flex;align-items:center;margin-top:4px;font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.hero .hn span em{margin-left:auto;font-style:normal;height:22px;display:flex;align-items:center;padding:0 7px;border-radius:7px;background:var(--bg);border:1px solid var(--border-strong);color:var(--fg)}
.hero .hf{padding:14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:10px}
.hero .hf small{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.hero .hf .pr3{height:44px;border-radius:10px;background:var(--fg);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:600}
.dk .hero .hf .pr3{height:32px;border-radius:8px;font-size:12.5px}
.more{display:flex;align-items:center;gap:10px}
.more small{flex:1;font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.more span{height:44px;display:flex;align-items:center;padding:0 12px;border-radius:10px;border:1px solid var(--border-strong);font-size:13px;color:var(--fg-body)}
.dk .more span{height:32px;border-radius:8px;font-size:12.5px}
.dz{display:flex;flex-direction:column;gap:14px;border-radius:14px;border:1px solid var(--border);background:var(--surface-inset);padding:16px}
.dk .dz{padding:16px 18px}
.dz p{margin:0;font-size:13.5px;line-height:1.65;color:var(--fg-muted)}
.dz .db{display:flex;flex-direction:column;gap:9px}
.dk .dz .db{flex-direction:row;gap:10px}
.dz .db span{height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px}
.dk .dz .db span{height:32px;border-radius:8px;padding:0 14px;font-size:12.5px}
.dz .db .p{background:var(--fg);color:var(--bg);font-weight:600}
.dz .db .g{border:1px solid var(--border-strong);color:var(--fg-body)}
.fs{border-radius:14px;border:1px solid var(--border);background:var(--surface-inset);padding:14px;display:flex;flex-direction:column;gap:12px}
.fs .fh{display:flex;justify-content:space-between;font:10px 'IBM Plex Mono',monospace;letter-spacing:.14em;color:var(--fg-faint)}
.fs ul{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.fs li{display:flex;flex-direction:column;align-items:center;gap:5px}
.fs li img{width:46px;height:46px;border-radius:12px;object-fit:cover;display:block;border:1px solid var(--accent-dim)}
.fs li small{font:10px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.fs li .es{width:46px;height:46px;border-radius:12px;border:1.5px dashed var(--border-dashed);display:flex;align-items:center;justify-content:center}
.fs li .es i{width:7px;height:7px;transform:rotate(45deg);border:1px solid var(--border-dashed);display:block}
.fs p{margin:0;font-size:13px;line-height:1.55;color:var(--fg-muted)}
.fs .ad{height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:13.5px;color:var(--fg)}
.dk .fs .ad{height:32px;border-radius:8px;font-size:12.5px}

/* board furniture */
.callout{border:1px solid var(--border-strong);border-radius:12px;background:#111319;padding:16px 18px;font-size:13px;line-height:1.6;color:var(--fg-body);display:flex;flex-direction:column;gap:8px}
.callout b{color:var(--fg)}
.callout code{font:12px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.tag{display:inline-flex;align-items:center;font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.08em;padding:3px 8px;border-radius:6px;border:1px solid var(--border-strong);color:var(--fg-body)}
.tag.rec{border-color:var(--accent);color:var(--accent)}
.t td,.t th{vertical-align:top}
.col{display:flex;flex-direction:column;gap:28px}
.rowh{display:flex;align-items:baseline;gap:12px}
.rowh .tag{flex:none}
"""
kit.CSS = kit.CSS + WCSS
if ".th-row" not in kit.CSS:
    kit.CSS = kit.CSS + theme_css()

LOCK = ('<svg class="lock" width="11" height="14" viewBox="0 0 11 14" aria-hidden="true"><path d="M2.5 6V4a3 3 0 0 1 6 0v2" fill="none" '
        'stroke="currentColor" stroke-width="1.4"/><rect x=".5" y="6" width="10" height="7.5" rx="1.5" fill="currentColor"/></svg>')


# ---------------------------------------------------------------- shell, first run
def tabbar_fr(active="Home"):
    out = []
    for n in ["Home", "Collection", "Commanders", "Discover", "Decks"]:
        cls = "t on" if n == active else ("t lkd" if n in ("Commanders", "Discover", "Decks") else "t")
        out.append(f'<span class="{cls}">{nav_icon(n)}{n}</span>')
    brk = f'<span class="brk"><em><span style="color:var(--fg-locked)">{LOCK}</span>Open once your cards are in</em></span>'
    return f'<div class="tbar2">{brk}{"".join(out)}</div>'


def rail_fr(menu=False):
    top = "".join(f'<span class="rsl{" on" if n == "Home" else ""}">{nav_icon(n)}</span>' for n in ["Home", "Collection"])
    well = "".join(f'<span class="rsl">{nav_icon(n)}</span>' for n in ["Commanders", "Discover", "Decks"])
    av = '<span class="rav" style="box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 25%,transparent)">CO</span>' if menu else '<span class="rav">CO</span>'
    return (f'<div class="rail"><span class="mk">{crown(6, 8.5, 3)}<span class="nn">99</span></span>'
            f'<span class="rsl" style="color:var(--fg-muted)">{ico_search(19, 1.5)}</span>'
            '<span style="width:24px;height:1px;background:var(--border-strong);margin:6px 0 10px"></span>'
            f'{top}<div class="rwell">{well}<em><span style="color:var(--fg-locked)">{LOCK}</span>LOCKED</em></div><span class="rfoot">{av}</span></div>')


def rail_dash(menu=False):
    return rail("Home", menu)


def ph_fr(inner, h=None, over="", tabs=None, hdr=True):
    head = header(search="rest", new=False) if hdr else ""
    tb = tabs if tabs is not None else tabbar_fr()
    if h is None:
        return f'<div class="ph" style="height:auto">{head}<div class="pb" style="flex:none;overflow:visible">{inner}</div>{tb}{over}</div>'
    return f'<div class="ph" style="height:{h}px">{head}<div class="pb">{inner}</div>{tb}{over}</div>'


def dk_fr(inner, h=None, over="", rail_html=None, w=1300):
    r = rail_html if rail_html is not None else rail_fr()
    if h is None:
        return f'<div class="dk" style="height:auto;width:{w}px">{r}<div class="main" style="overflow:visible">{inner}</div>{over}</div>'
    return f'<div class="dk" style="height:{h}px;width:{w}px">{r}<div class="main" data-check="desk">{inner}</div>{over}</div>'


def about_line():
    return ('<div class="abl"><span class="bm"><i></i></span><span><b>What The 99 does:</b> every mark and figure in the app, '
            'and where to find it, on one page. <u>Show me</u></span></div>')


def step1(desk_=False):
    ways = [("Precons I own", "Pick the boxes. We know every card in them."), ("Import a deck", "Paste a list you play."),
            ("Add cards by hand", "Search by name and add them one by one.")]
    wr = "".join(f'<span class="wr"><span class="wt">{t}<i>›</i></span><small>{s}</small>{"" if desk_ else "<i>›</i>"}</span>' for t, s in ways)
    body = ("Drop a CSV export from Moxfield, Archidekt, Deckbox or ManaBox. We read owned counts, sets and finishes." if desk_
            else "Drop a CSV export from Moxfield, Archidekt, Deckbox or ManaBox.")
    return (f'<div class="s1"><span class="fan9" aria-hidden="true"><span class="a"></span><span class="b"></span><span class="c">99</span></span>'
            f'<div class="s1c"><span class="t">Add your collection</span><p>{body}</p>'
            f'<div class="s1b"><span class="bp">Upload a CSV</span><span class="bg2">Paste a list</span></div>'
            f'<div class="ways"><span class="wk">No file? Start another way</span><div class="wg">{wr}</div></div></div></div>')


def locked(n, t, r):
    return f'<div class="lst"><span class="n">{n}</span><span class="tx"><b>{t}</b><span>{r}</span></span><span style="color:var(--fg-locked)">{LOCK}</span></div>'


def friends_row():
    return ('<div class="frw"><span class="sl">+</span><span class="tx"><b>Add your friends</b>'
            '<span>Any time, cards or not. A friend joins from a link you send.</span></span><span class="ch">›</span></div>')


def first_run(section="", desk_=False):
    head = (f'<div class="frhd"><p class="frk">Step 1 of 3</p><h1 class="frh1">Welcome to The 99</h1>'
            + (f'<p class="frpl"><span style="color:var(--fg-locked)">{LOCK}</span>Commanders, Discover and Decks open once your cards are in.</p>' if desk_ else "")
            + '</div>')
    stack = (step1(desk_) + locked(2, "Pick a commander or import a deck", "Opens once your cards are in")
             + locked(3, "Build the 99", "Opens once you pick a commander") + friends_row() + section)
    return f'<div class="frp">{head}{about_line()}<div class="frst">{stack}</div></div>'


# ---------------------------------------------------------------- the section
def wc_mark(n, dim=False):
    return f'<span class="dmk{" dim" if dim else ""}" aria-hidden="true"><span class="dm"><b>{n}</b></span></span>'


def wc_row(r, deck, show_try=True):
    rid, name, where, what, cost, short = r
    land = LANDING.get(rid)
    can = land and (deck or rid not in NEEDS_DECK)
    tr = f'<span aria-hidden="true">·</span><span class="try">{W["tryIt"]}<i>›</i></span>' if (can and show_try) else ""
    return (f'<li class="wcr" data-row="{rid}"><span class="nm">{name}</span><span class="wh"><span>{where}</span>{tr}</span>'
            f'<span class="wt">{what}</span><span class="cp">{short if False else cost}</span></li>')


def wc_row_ph(r, deck, show_try=True):
    """At 390 the chip carries the short form (`per run`), as Written for you's phone row does."""
    rid, name, where, what, cost, short = r
    land = LANDING.get(rid)
    can = land and (deck or rid not in NEEDS_DECK)
    tr = f'<span aria-hidden="true">·</span><span class="try">{W["tryIt"]}<i>›</i></span>' if (can and show_try) else ""
    return (f'<li class="wcr" data-row="{rid}"><span class="nm">{name}</span><span class="cp">{short}</span>'
            f'<span class="wt">{what}</span><span class="wh"><span>{where}</span>{tr}</span></li>')


def section(state="held", left=15, deck=False, teaser=True, desk_=False, new=True, rows=None, narrow=False):
    """state: held | expiring | usedUp. `deck`: the reader has a deck. `teaser`: payments on and never bought."""
    rows = rows or ROWS
    if state == "usedUp":
        gl = f'<p class="gl">{W["usedUp"](15)}</p>'
    elif state == "expiring":
        gl = f'<p class="gl warn">{W["expiring"](left)}</p>'
    else:
        gl = f'<p class="gl">{W["live"](left, 15)}</p>'
    mark = wc_mark(0 if state == "usedUp" else left, dim=state == "usedUp")
    head = (f'<div class="wch">{mark}<div class="wcht"><h3>{W["title"]}</h3>{gl}</div></div>'
            f'<span class="wcx" aria-label="{W["dismiss"]}">✕</span>')
    free = f'<p class="wcfree">{FREE_L6} <span>{W["intro"]}</span></p>'
    rowf = wc_row if (desk_ and not narrow) else wc_row_ph
    if deck:
        lis = "".join(rowf(r, True) for r in rows)
        body = f'<ul class="wcl">{lis}</ul>'
    else:
        first = [r for r in rows if r[0] not in NEEDS_DECK]
        rest = [r for r in rows if r[0] in NEEDS_DECK]
        body = (f'<ul class="wcl">{"".join(rowf(r, False) for r in first)}</ul>'
                f'<p class="wcnd"><i></i>{NEEDS_A_DECK}</p>'
                f'<ul class="wcl" style="margin-top:0">{"".join(rowf(r, False) for r in rest)}</ul>')
    foot = f'<div class="wcf"><span class="tz">{W["teaser"]}<i>›</i></span></div>' if teaser else ""
    cls = "wc" + (" warn" if state == "expiring" else "") + (" narrow" if narrow else "") + (" new" if new else "")
    return f'<section class="{cls}" aria-label="{W["title"]}">{head}{free}{body}{foot}</section>'


# ---------------------------------------------------------------- the chip and the menu
def chip(kind="credits", n=16, line=None, d=False):
    if kind == "out":
        return '<span class="chp out' + (" d" if d else "") + '"><i class="dmi o"></i><span>Get more credits</span><em>›</em></span>'
    word = "free credit" if kind == "free" else "credits"
    if kind == "free" and n != 1:
        word = "free credits"
    cls = "chp" + (" warn" if kind == "expiring" else "") + (" d" if d else "")
    ln = f'<span class="chpl">{line}</span>' if line else ""
    return f'<span class="{cls}"><i class="dmi"></i><b>{n}</b><span>{word}</span><em>›</em></span>{ln}'


def idb(ch):
    return (f'<div class="idb2"><span class="av2">CO</span><span class="nm"><b>Colin Ortiz</b><span class="em">colin@example.com</span>{ch}</span></div>')


def menu_sheet2(ch, h=520):
    items = menu_items()
    return (f'<div class="cropped" style="width:390px;height:{h}px;position:relative;background:var(--bg)">'
            f'<div class="amsh" style="top:24px;bottom:auto"><div class="grab"></div>{idb(ch)}{theme_chips()}{items}</div></div>')


def menu_pop2(ch, h=470):
    return (f'<div class="cropped" style="width:330px;height:{h}px;position:relative;background:var(--bg)">'
            f'<div class="amp" style="bottom:auto;top:14px">{idb(ch)}{theme_chips()}{menu_items()}</div></div>')


# ---------------------------------------------------------------- the credit line on Proposed cuts' press
from b_line import cuts_offer, dtabs_ph, dk_crop


def line_ph(text, warn=None, spent=False, more=False, label="Look deeper", seg="1 credit"):
    btn = cbutton(label, credit=seg, spent=spent)
    return f'<div class="cropped" style="width:390px">{dtabs_ph()}{cuts_offer(btn, cline(text, warn=warn), getmore(new=False) if more else "")}</div>'


def line_dk(text, warn=None, spent=False, more=False, label="Look deeper"):
    btn = cbutton(label, spent=spent, desk=True)
    return dk_crop(btn, cline(text, warn=warn), getmore(new=False, desk=True) if more else "")


# ---------------------------------------------------------------- /credits with a Welcome cell
def bal_w(free=(1, 1), welcome=15, packs=None, plan=None, warn=False, new=True, today=None):
    cells = [cell("Free", free[0], C["bal.freeSub"] if free[0] < free[1] else "all 1 ready", f"of {free[1]}")]
    if welcome:
        sub = CELL["welcomeSoon"] if warn else CELL["welcomeSub"]
        cells.append(cell("Welcome", welcome, f'<span class="{"new" if new else ""}" style="border-radius:3px">{sub}</span>', warn=warn))
    if plan is not None:
        cells.append(cell("Plan", plan, "roll over"))
    if packs is not None:
        cells.append(cell("Packs", packs, "never expire"))
    tot = free[0] + (welcome or 0) + (plan or 0) + (packs or 0)
    order = f'<div class="order"><span class="k">{C["bal.order"]}</span><span class="k">→</span></div>' if len(cells) > 1 else ""
    td = (f'<div class="today"><span class="meter"><i style="width:100%;background:var(--warning)"></i></span><span>{C["bal.atLimit"]}</span></div>' if today else "")
    return (f'<div class="bal"><div class="tot"><b>{tot}</b><span>{C["bal.total"]}</span></div>'
            f'{order}<div class="cells">{"".join(cells)}</div>{td}</div>')


C["pack.buy"] = "Buy pack"


def ptitle_r4():
    return (f'<div class="ptitle"><h1>{C["page.title"]}</h1><span class="sub">{linkify(C["page.sub"])}</span>'
            f'<p class="vfree" style="margin:4px 0 0;font:400 13px/1.5 \'IBM Plex Sans\',sans-serif;color:var(--fg-body)">{FREE_L6}</p></div>')


def credits_page(bal, buy=True, hist_rows=None, plan="none"):
    """/credits as shipped on main plus R4 (the free line in the head, pack first)."""
    parts = [ptitle_r4(), bal]
    if buy:
        pk = pack_card(new=False).replace(f'{C["pack.buy"]} · $5<', f'{C["pack.buy"]}<')
        parts.append(f'<div><div class="sech"><h2>Get more credits</h2></div><div class="offers">{pk}{plan_card("none", new=False)}</div></div>')
    parts.append(history(rows=hist_rows, empty=hist_rows is None, new=False))
    return f'<div class="pg">{"".join(parts)}</div>'


# ---------------------------------------------------------------- dashboard Home (a new player once the cards are read)
ART = {"zimone": "art/art-zimone.jpg", "giada": "art/art-giada.jpg", "sai-face": "art/face-sai.jpg"}


def dashboard(section_html, desk_=False):
    head = ('<div class="dbh"><div style="flex:1"><p class="kk">212 CARDS · READ TODAY</p><h1>Welcome back</h1></div>'
            '<div class="bt"><span class="gh2">Update collection</span><span class="pr2">New deck</span></div></div>')
    heroes = "".join(
        f'<div class="hero"><div class="ha"><img src="{ART[k]}" alt=""><div class="hn"><b>{nm}</b><span>{ty}<em>{fit}<span style="color:var(--fg-faint)">/100</span></em></span></div></div>'
        f'<div class="hf"><small>{fits} of your cards fit</small><span class="pr3">See the pool</span></div></div>'
        for k, nm, ty, fit, fits in [("zimone", "Zimone, Infinite Analyst", "Legendary Creature — Human Wizard", "84", "112"),
                                      ("giada", "Giada, Font of Hope", "Legendary Creature — Angel", "81", "98")])
    ready = (f'<div style="display:flex;flex-direction:column;gap:11px"><span class="skh">Ready to build</span><div class="heros">{heroes}</div>'
             '<div class="more"><small>4 more scored 70 or better</small><span>All commanders</span></div></div>')
    zero = ('<div style="display:flex;flex-direction:column;gap:12px"><span class="skh" style="margin-top:6px">No decks yet</span><div class="dz">'
            f'<p>{"Pick a commander and we’ll assemble the 99 from cards you already own, then track what’s missing." if desk_ else "Pick a commander and we’ll assemble the 99 from cards you already own."}</p>'
            '<div class="db"><span class="p">Browse commanders</span><span class="g">Import a deck</span></div></div></div>')
    faces = (f'<li><img src="{ART["sai-face"]}" alt=""><small>You</small></li>'
             + '<li><span class="es"><i></i></span></li>' * 4)
    friends = ('<div class="fs"><div class="fh"><span>FRIENDS</span></div>'
               f'<ul>{faces}</ul><p>Add the people you play with. Seat them when you log a game, and see their spares when you shop.</p>'
               '<span class="ad">Add a friend</span></div>')
    if desk_:
        body = (f'<div class="dbb"><div class="dbl">{ready}{zero}</div><div class="dbr">{friends}{section_html}</div></div>')
    else:
        # Below 1180 the columns are `display: contents` and `order` places the blocks: Ready to build, Friends, the
        # resume slot, then (new) the section last.
        body = f'<div class="dbb">{ready}{friends}{zero}{section_html}</div>'
    return head + body
