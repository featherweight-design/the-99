"""Buying credits R1: the shared pieces. Drawn over the shipped shell (Kamigawa tokens, the 73px phone header,
the 62px rail, the 74px tab bar), the shipped CreditButton, CreditsText line, account menu, SocialModal and
ToastFrame. Every string the reader sees comes from COPY, which is also written out as the copy strings file."""
from kit import *
import kit

# ---------------------------------------------------------------- copy (placeholders, owed to /copy-review)
SUPPORT = "support@the-99.dev"
COPY = {
    # the credit line (creditsCopy additions)
    "line.standing": "4 of 5 left · reset at 2:01 AM",
    "line.withPaid": "4 of 5 free · reset at 2:01 AM · 114 paid",
    "line.paidNext": "0 of 5 free · reset at 2:01 AM · this run uses 1 of 114 paid",
    "line.spent": "0 of 5 left · reset at 2:01 AM · What uses credits?",
    "line.getMore": "Get more credits",
    "line.limit": "Today’s 20 paid credits are used. 94 more are banked · back at 2:01 AM",
    "line.limitFree": "1 of 5 free · reset at 6:40 AM · paid back at 2:01 AM (daily limit)",
    "line.expiring": "74 plan credits expire Nov 16",
    # the page
    "page.title": "Credits",
    "page.sub": "1 credit is 1 run of any tool · What uses credits?",
    "bal.total": "credits to spend",
    "bal.order": "Spent in this order",
    "bal.free": "Free", "bal.plan": "Plan", "bal.packs": "Packs",
    "bal.freeSub": "reset at 2:01 AM",
    "bal.freeFull": "all 5 ready",
    "bal.planSub": "roll over",
    "bal.planEnds": "expire Nov 16",
    "bal.packsSub": "never expire",
    "bal.near": "17 of 20 paid credits used today · the limit resets at 2:01 AM. Free credits still run.",
    "bal.atLimit": "20 of 20 paid credits used today. Back at 2:01 AM. Free credits still run, and nothing banked is lost.",
    # plan card
    "plan.k": "Monthly plan",
    "plan.title": "60 credits a month",
    "plan.price": "$5 a month",
    "plan.fine": [
        "Unused plan credits roll over, with no cap, while you stay subscribed.",
        "Renews every month until you cancel. Cancel any time, in one tap, here.",
        "If you cancel, plan credits last until the end of the month you paid for, then expire.",
        "Paid credits are forfeited if you delete your account.",
    ],
    "plan.subscribe": "Subscribe",
    "plan.via": "Checkout on Stripe · US cards",
    "plan.active": "Renews November 16 · $5",
    "plan.activeLeft": "74 plan credits, rolling over",
    "plan.cancel": "Cancel plan",
    "plan.cancelSays": "Cancelling keeps your 74 plan credits until November 16, then they expire. Pack credits aren’t affected.",
    "plan.updateCard": "Update card",
    "plan.ended": "Ends November 16",
    "plan.endedSays": "Your 74 plan credits expire on November 16. You won’t be charged again.",
    "plan.soon": "Your 74 plan credits expire in 2 days, on November 16.",
    "plan.keep": "Keep my plan",
    "plan.keepSays": "Keeps your credits and renews on November 16, as before.",
    "plan.cancelledLive": "Plan cancelled. Your 74 plan credits last until November 16.",
    "plan.dueTitle": "Your November 16 payment didn’t go through",
    "plan.dueSays": "Stripe will try again over the next few days, and your 74 plan credits still work meanwhile. If every try fails, the plan ends and they expire.",
    # pack card
    "pack.k": "Credit pack",
    "pack.title": "40 credits",
    "pack.price": "$5",
    "pack.fine": "Pack credits never expire. They’re forfeited if you delete your account.",
    "pack.buy": "Buy 40 credits",
    # history
    "hist.title": "Purchase history",
    "hist.receipt": "Receipt",
    "hist.empty": "Nothing bought yet. Receipts show here once you do.",
    "hist.planMonth": "Monthly plan",
    "hist.planFirst": "Monthly plan, first month",
    "hist.pack": "Credit pack",
    "refunds": f"Refunds: email {SUPPORT} within 14 days. Unused packs and a plan’s first month come back in full; used credits don’t. A run that fails refunds itself.",
    # loading and failure
    "read.failed": "We couldn’t load your credits.",
    "read.retry": "Try again",
    # checkout return
    "ret.procTitle": "Adding your 40 credits",
    "ret.procSays": "Payment received. Credits usually land in a second or two.",
    "ret.addedPack": "40 pack credits added",
    "ret.addedPlan": "Plan started: 60 credits added",
    "ret.addedPlanSays": "Renews November 16. Cancel any time below.",
    "ret.slowTitle": "Still adding your credits",
    "ret.slowSays": f"This can take a few minutes. You won’t be charged twice. If they haven’t landed in an hour, email {SUPPORT}.",
    "ret.cancelled": "Checkout closed. Nothing was charged.",
    "ret.toast": "Couldn’t check on your purchase.",
    "ret.toastDetail": "Trying again in a moment",
    # blocked
    "blocked": f"Buying is paused on this account. Email {SUPPORT} and we’ll sort it out. Your free credits and everything else work as usual.",
    # account menu
    "menu.entry": "117 credits",
    "menu.entryFree": "3 free credits",
    # deletion interstitial
    "del.title": "You have 114 paid credits",
    "del.says": "Deleting your account forfeits them: 74 plan credits and 40 pack credits. Nothing else in Manage account touches them.",
    "del.refund": f"Bought a pack in the last 14 days and not used it? Email {SUPPORT} for a refund before you delete.",
    "del.go": "Continue to Manage account",
}
C = COPY

ACC = "color:var(--accent)"

CCSS = r"""
:root{--accent-shadow:#843052;--fg-disabled:#3D404E;--disp:'Chakra Petch',sans-serif}
.crlk{color:var(--accent);text-decoration:underline;text-decoration-color:var(--accent-shadow);text-underline-offset:2px}
.disp{font-family:var(--disp)}
.mono{font-family:'IBM Plex Mono',monospace}
/* the shipped CreditButton */
.cb{display:flex;align-items:stretch;height:44px;border-radius:8px;border:1px solid var(--accent);overflow:hidden;font:600 13px 'IBM Plex Sans',sans-serif;width:100%}
.cb.f{background:var(--accent);color:var(--bg)}
.cb.o{background:transparent;color:var(--accent)}
.cb .l{flex:1;display:flex;align-items:center;justify-content:center;padding:0 16px;white-space:nowrap}
.cb .s{display:flex;align-items:center;gap:5px;padding:0 11px;font:11px 'IBM Plex Mono',monospace;border-left:1px solid color-mix(in srgb,var(--bg) 35%,transparent);white-space:nowrap}
.cb.o .s{border-left-color:var(--accent)}
.cb.dis{opacity:.5}
.dk .cb,.cb.d{height:38px;width:auto;display:inline-flex}
.cline{font:10.5px/1.55 'IBM Plex Mono',monospace;color:var(--fg-faint);margin:10px 0 0;text-wrap:pretty}
.cline .warn{color:var(--warning)}
.gmc{display:inline-flex;align-items:center;gap:7px;min-height:44px;font:600 13px 'IBM Plex Sans',sans-serif;color:var(--accent);margin-top:2px}
.dk .gmc{min-height:32px}
.gmc i{font-style:normal;font-size:10px}
.pbtn{height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 20px;font:600 14px 'IBM Plex Sans',sans-serif;white-space:nowrap}
.pbtn.f{background:var(--accent);color:var(--bg)}
.pbtn.o{border:1px solid var(--accent);color:var(--accent)}
.pbtn.n{border:1px solid var(--border-strong);color:var(--fg)}
.pbtn.dis{background:transparent;border:1px solid var(--border-strong);color:var(--fg-disabled)}
.dk .pbtn{height:40px;align-self:flex-start}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}
.panel h3{margin:0;font:600 17px var(--disp)}
.ph-sub{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.lead{font-size:12.5px;line-height:1.5;color:var(--fg-body);margin:5px 0 0;text-wrap:pretty}

/* page */
.pg{padding:18px 16px 28px;display:flex;flex-direction:column;gap:22px}
.dk .pg{padding:34px 48px 40px;gap:26px;max-width:1040px}
.ptitle{display:flex;flex-direction:column;gap:6px}
.ptitle h1{margin:0;font:700 26px var(--disp)}
.dk .ptitle h1{font-size:30px}
.ptitle .sub{font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.sech{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 10px}
.sech h2{margin:0;font:600 17px var(--disp)}
.dk .sech h2{font-size:19px}

/* balance */
.bal{display:flex;flex-direction:column;gap:12px}
.tot{display:flex;align-items:baseline;gap:10px}
.tot b{font:700 44px/1 var(--disp);letter-spacing:-.01em}
.tot span{font:12px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.cells{display:flex;align-items:stretch;gap:0;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);overflow:hidden}
.cell{flex:1;min-width:0;padding:12px 12px 13px;display:flex;flex-direction:column;gap:4px;position:relative}
.cell+.cell{border-left:1px solid var(--border)}
.cell+.cell::before{content:'';position:absolute;left:-5px;top:50%;width:8px;height:8px;margin-top:-4px;transform:rotate(45deg);background:var(--surface);border-top:1px solid var(--border-strong);border-right:1px solid var(--border-strong)}
.cell .k{font-size:10px}
.cell .n{font:600 24px/1.05 'IBM Plex Mono',monospace;color:var(--fg);display:flex;align-items:baseline;gap:4px}
.cell .n small{font:12px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.cell .su{font:10.5px/1.4 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.cell .su.warn{color:var(--warning)}
.cell .plus{font:600 11px 'IBM Plex Mono',monospace;color:var(--success);margin-left:4px}
.dk .cell{padding:16px 18px}
.dk .cell .n{font-size:30px}
.order{display:flex;align-items:center;gap:8px}
.order .k{font-size:9.5px}
.today{font:11px/1.55 'IBM Plex Mono',monospace;color:var(--fg-muted);display:flex;gap:8px;align-items:flex-start}
.today .meter{flex:none;width:64px;height:5px;border-radius:3px;background:var(--elevated);overflow:hidden;margin-top:6px}
.today .meter i{display:block;height:100%;background:var(--fg-muted)}

/* offers: plan card, pack card */
.offers{display:flex;flex-direction:column;gap:14px}
.dk .offers{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:stretch}
.oc{border:1px solid var(--border-strong);border-radius:14px;background:var(--surface);padding:16px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden}
.dk .oc{padding:20px 22px}
.oc.on{border-color:color-mix(in srgb,var(--accent) 55%,var(--border-strong))}
.oc.warn{border-color:color-mix(in srgb,var(--warning) 60%,var(--border-strong))}
.oc .top{display:flex;align-items:flex-start;gap:14px}
.oc .tt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.oc .tt h3{margin:0;font:700 19px var(--disp)}
.oc .tt .pr{font:600 13px 'IBM Plex Mono',monospace;color:var(--fg)}
.oc .st{font:12px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.oc .st.warn{color:var(--warning)}
.oc .st.ok{color:var(--success)}
.oc ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.oc li{font-size:12.5px;line-height:1.5;color:var(--fg-body);display:flex;gap:9px;text-wrap:pretty}
.oc li::before{content:'';flex:none;width:5px;height:5px;margin-top:7px;transform:rotate(45deg);background:var(--accent)}
.oc .says{font-size:12.5px;line-height:1.5;color:var(--fg-muted);margin:0;text-wrap:pretty}
.oc .says b{color:var(--fg);font-weight:600}
.oc .via{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.oc .acts{display:flex;flex-direction:column;gap:8px}
.dk .oc .acts{flex-direction:row;align-items:center;gap:16px;flex-wrap:wrap}
.oc .tl{min-height:44px;display:inline-flex;align-items:center;font:600 13.5px 'IBM Plex Sans',sans-serif;color:var(--accent);gap:6px}
.dk .oc .tl{min-height:32px}
.oc .spacer{flex:1}
.ext{font-size:11px}
/* the little brand-card fan on an offer */
.fanc{position:relative;width:74px;height:70px;flex:none}
.fanc span{position:absolute;top:4px;width:40px;height:56px;border-radius:5px;box-shadow:0 8px 18px rgba(0,0,0,.5)}
.fanc .a{left:4px;background:var(--elevated);border:1.5px solid var(--border-strong);transform:rotate(-14deg)}
.fanc .b{left:17px;background:var(--surface-raised);border:1.5px solid var(--border-dashed);transform:rotate(-3deg)}
.fanc .c{left:30px;background:color-mix(in srgb,var(--accent) 14%,var(--surface));border:1.5px solid var(--accent);transform:rotate(9deg);display:flex;align-items:center;justify-content:center;font:700 16px var(--disp);color:var(--accent)}
.fanc.cal .c{flex-direction:column;gap:0;line-height:1}
.fanc.cal .c small{font:600 7px 'IBM Plex Mono',monospace;letter-spacing:.1em}
.fanc.dim span{opacity:.45;filter:saturate(.3)}

/* history */
.hist{border:1px solid var(--border);border-radius:12px;background:var(--surface);overflow:hidden}
.hr{display:flex;align-items:center;gap:12px;min-height:56px;padding:9px 14px;border-top:1px solid var(--border)}
.hr:first-child{border-top:0}
.hr .d{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint);width:52px;flex:none}
.hr .w{flex:1;min-width:0;font-size:13.5px;color:var(--fg);display:flex;flex-direction:column;gap:2px}
.hr .w small{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.hr .a{font:12px 'IBM Plex Mono',monospace;color:var(--fg-body);flex:none}
.hr .r{flex:none;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:flex-end;font:600 12.5px 'IBM Plex Sans',sans-serif;color:var(--accent);gap:4px}
.dk .hr{min-height:48px;padding:8px 18px}
.dk .hr .d{width:90px}
.dk .oc .acts .says{flex:1;min-width:220px}
.dk .hr .r{min-height:32px;min-width:90px}
.hempty{padding:18px 16px;font-size:13px;color:var(--fg-muted);border:1px dashed var(--border-dashed);border-radius:12px}
.refund{font-size:12.5px;line-height:1.55;color:var(--fg-muted);margin:10px 0 0;text-wrap:pretty}

/* bands: checkout return, blocked */
.band{border-radius:12px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border-strong);position:relative;overflow:hidden}
.band .bt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.band b{font:600 14.5px 'IBM Plex Sans',sans-serif}
.band p{margin:0;font-size:12.5px;line-height:1.5;color:var(--fg-body);text-wrap:pretty}
.band.ok{border-color:var(--success)}
.band.proc{border-color:color-mix(in srgb,var(--accent) 50%,var(--border-strong))}
.band.proc .bar{position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--border)}
.band.proc .bar i{position:absolute;left:0;top:0;bottom:0;width:38%;background:var(--accent)}
.band.quiet{background:transparent;border:1px solid var(--border);padding:4px 4px 4px 14px;align-items:center}
.band.quiet p{color:var(--fg-muted)}
.band .x{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:14px;flex:none}
.tick{width:22px;height:22px;border-radius:50%;background:var(--success);color:var(--bg);display:flex;align-items:center;justify-content:center;font:700 12px 'IBM Plex Sans',sans-serif;flex:none;margin-top:1px}
.dot{width:10px;height:10px;border-radius:50%;background:var(--accent);flex:none;margin-top:6px;box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 22%,transparent)}
.hold{width:18px;height:18px;flex:none;margin-top:2px;border-radius:50%;border:1.5px solid var(--fg-muted);display:flex;align-items:center;justify-content:center;gap:2px}
.hold i{width:2px;height:7px;background:var(--fg-muted);display:block}

/* skeleton, failure */
.sk{background:var(--elevated);border-radius:8px}
.fail{display:flex;flex-direction:column;gap:12px;align-items:flex-start;padding:18px 16px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface)}
.fail .h{display:flex;gap:10px;align-items:center;font:600 14.5px 'IBM Plex Sans',sans-serif}

/* toast (the shared ToastFrame) */
.toast{position:absolute;left:16px;right:16px;bottom:90px;z-index:20;display:flex;align-items:center;gap:14px;min-height:52px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);padding:0 6px 0 14px;box-shadow:0 18px 40px rgba(0,0,0,.5)}
.toast .t{flex:1;display:flex;flex-direction:column;gap:3px;padding:9px 0}
.toast .t span{font-size:13.5px}
.toast .t small{font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.dk .toast{left:50%;right:auto;width:420px;margin-left:-180px;bottom:24px}

/* SocialModal: phone sheet, desktop modal */
.scr{position:absolute;inset:0;z-index:30;background:color-mix(in oklab,var(--bg) 72%,transparent)}
.sht{position:absolute;left:0;right:0;bottom:0;z-index:31;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:20px 20px 0 0;box-shadow:0 -20px 50px rgba(0,0,0,.5);display:flex;flex-direction:column;padding-bottom:26px}
.sht .grab{display:flex;justify-content:center;padding:9px 0 2px}
.sht .grab i{width:40px;height:4px;border-radius:4px;background:var(--border-strong)}
.mhead{display:flex;align-items:flex-start;gap:12px;padding:8px 18px 0}
.mhead h2{margin:0;flex:1;min-width:0;padding-top:10px;font:700 18px var(--disp)}
.mhead .x{width:44px;height:44px;margin-right:-10px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:15px;flex:none}
.mbody{padding:6px 18px 0;display:flex;flex-direction:column;gap:12px}
.mbody p{margin:0;font-size:13.5px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
.mbody p.mute{font-size:12.5px;color:var(--fg-muted)}
.mbody .split{display:flex;gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden}
.mbody .split span{flex:1;padding:10px 12px;display:flex;flex-direction:column;gap:2px;font:10px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.mbody .split span+span{border-left:1px solid var(--border)}
.mbody .split b{font:600 20px 'IBM Plex Mono',monospace;letter-spacing:0;color:var(--fg)}
.mbody .split em{font:normal 10.5px 'IBM Plex Mono',monospace;letter-spacing:0;text-transform:none;color:var(--fg-muted)}
.mdl{position:absolute;left:50%;top:12%;z-index:31;width:440px;margin-left:-220px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 30px 70px rgba(0,0,0,.6);padding-bottom:20px}
.mdl .mhead{padding:12px 20px 0}
.mdl .mhead h2{font-size:19px}
.mdl .mbody{padding:6px 20px 0}

/* account menu: popover (desktop) and sheet (phone) */
.amp{position:absolute;left:14px;bottom:56px;z-index:31;width:300px;padding:8px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.6)}
.idb{display:flex;align-items:center;gap:12px;padding:12px 12px 14px;border-bottom:1px solid var(--border)}
.idb .av2{width:44px;height:44px;border-radius:12px;border:1px solid var(--accent);color:var(--accent);background:var(--bg);display:flex;align-items:center;justify-content:center;font:14px 'IBM Plex Mono',monospace;flex:none}
.idb .nm{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.idb .nm b{font-size:14px;font-weight:600}
.idb .nm span{font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.idb .crd{display:inline-flex;align-items:center;gap:6px;font:600 11px 'IBM Plex Mono',monospace;color:var(--accent);margin-top:4px}
.idb .crd i{font-style:normal;font-size:9px}
.thm{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:12px 4px 0}
.thm span{height:44px;border-radius:9px;border:1px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.thm span.on{border-color:var(--accent);color:var(--fg)}
.mi{margin-top:12px;padding-top:10px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:2px}
.mi span{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:8px;font-size:14px}
.mi span.hv{background:var(--elevated)}
.mi span i{width:6px;height:6px;transform:rotate(45deg);background:var(--accent);flex:none}
.mi span i.dg{background:var(--danger)}
.amsh{position:absolute;left:0;right:0;bottom:0;z-index:31;background:var(--surface);border-top:1px solid var(--border-strong);border-radius:20px 20px 0 0;padding:20px 20px 26px}
.amsh .grab{margin:0 auto 20px;width:40px;height:4px;border-radius:2px;background:var(--border-strong)}
.amsh .idb{padding:0 0 18px;gap:14px}
.amsh .idb .av2{width:48px;height:48px;border-radius:14px}
.amsh .idb .nm b{font-size:16px}
.amsh .idb .nm span{font-size:12px;color:var(--fg-faint)}
.amsh .idb .crd{min-height:32px;font-size:12px;margin-top:2px}
.amsh .mi{margin-top:14px;gap:0}
.amsh .mi span{padding:15px 6px;border-radius:0;font-size:15px;gap:12px}
.amsh .mi span+span{border-top:1px solid var(--border)}

/* in-context surfaces */
.sfc{background:var(--bg);display:flex;flex-direction:column}
.sfc .ctx{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
.sfc .ctx b{font:600 14px 'IBM Plex Sans',sans-serif}
.sfc .ctx span{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.cutoff{height:18px;background:linear-gradient(180deg,var(--bg),transparent);margin-top:-1px}
.cropped{border:1px solid var(--border-strong);border-radius:14px;overflow:hidden;background:var(--bg)}
.annot{font:11px/1.5 'IBM Plex Mono',monospace;color:var(--fg-faint);margin:0}
.chip-k{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:5px;font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
.chip-k.on{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}
.chip-k.ok{background:rgba(111,163,104,.14);color:var(--success)}
.chip-k.warn{background:rgba(224,145,60,.14);color:var(--warning)}
.chip-k.n{background:var(--elevated);color:var(--fg-muted)}

.dk .offers>div{display:flex;flex-direction:column}
.dk .offers>div>.oc,.dk .offers>div>.offers{flex:1}
.dk .offers>.oc>.acts:last-child,.dk .offers>div>.oc>.acts:last-child{margin-top:auto}

/* R2 offer art options */
.oc>*{position:relative;z-index:1}
.oc>.ow{position:absolute;z-index:0;right:0;top:0;bottom:0;width:46%;overflow:hidden;pointer-events:none;-webkit-mask-image:linear-gradient(270deg,#000 0 25%,transparent 95%);mask-image:linear-gradient(270deg,#000 0 25%,transparent 95%)}
.oc>.ow img{width:100%;height:100%;object-fit:cover;object-position:50% 40%;opacity:.5;display:block}
.oc>.ow.dim img{opacity:.2;filter:saturate(.3)}
.dmk{flex:none;width:74px;height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}
.dm{width:46px;height:46px;transform:rotate(45deg);border:1.5px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--surface));display:flex;align-items:center;justify-content:center;border-radius:4px}
.dm b{transform:rotate(-45deg);font:700 17px var(--disp);color:var(--accent)}
.dm3{display:flex;align-items:flex-end;gap:3px}.dm3 i{width:6px;height:6px;transform:rotate(45deg);background:var(--accent);display:block}.dm3 i.b{width:8px;height:8px}
.dmk.dim{opacity:.45;filter:saturate(.3)}
.nmk{flex:none;display:flex;flex-direction:column;align-items:flex-end;line-height:1}
.nmk b{font:700 44px/1 var(--disp);color:var(--accent);letter-spacing:-.01em}
.nmk small{font:10px 'IBM Plex Mono',monospace;color:var(--fg-faint);text-transform:uppercase;letter-spacing:.12em;margin-top:4px}
.nmk.dim b{color:var(--fg-faint)}
.rc{flex:none;position:relative;width:56px;height:78px;border-radius:4px;overflow:visible;transform:rotate(6deg);margin:2px 8px 0 0}
.rc.pl{transform:rotate(-5deg)}
.rc img{width:56px;height:78px;border-radius:4px;display:block;box-shadow:0 8px 18px rgba(0,0,0,.5)}
.rc .ct{position:absolute;left:50%;bottom:-8px;transform:translateX(-50%) rotate(-6deg);white-space:nowrap;padding:2px 7px;border-radius:999px;background:var(--accent);color:var(--bg);font:700 11px 'IBM Plex Mono',monospace}
.rc.pl .ct{transform:translateX(-50%) rotate(5deg)}
.rc.dim{opacity:.5;filter:saturate(.2)}
/* menu count options */
.idb .crd2{display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 11px;border-radius:999px;margin-top:8px;background:color-mix(in srgb,var(--accent) 16%,transparent);border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);color:var(--fg);font:600 12px 'IBM Plex Sans',sans-serif;align-self:flex-start}
.idb .crd2 i{font-style:normal;color:var(--accent);font-size:10px}
.idb .crd2 b{font:600 12px 'IBM Plex Mono',monospace;color:var(--accent)}
.idb .crd2 em{font-style:normal;color:var(--fg-muted);margin-left:2px}
.idb .big{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:2px;padding-left:10px;border-left:1px solid var(--border);min-height:44px;justify-content:center}
.idb .big b{font:700 26px/1 var(--disp);color:var(--accent)}
.idb .big small{font:9.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-muted)}
.idb .mtr{display:flex;flex-direction:column;gap:5px;margin-top:8px;width:100%}
.idb .mtr .r{display:flex;justify-content:space-between;align-items:baseline;font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.idb .mtr .r b{font:600 12.5px 'IBM Plex Mono',monospace;color:var(--accent)}
.idb .mtr .bar{display:flex;gap:2px;height:5px}
.idb .mtr .bar i{display:block;border-radius:2px}
"""

kit.CSS = kit.CSS + CCSS


def esc(s):
    return s


# ---------------------------------------------------------------- the credit line and press
def linkify(text):
    """CreditsText: `What uses credits?` is the About link wherever it appears."""
    return text.replace("What uses credits?", '<span class="crlk">What uses credits?</span>')


def cbutton(label, credit="1 credit", filled=True, spent=False, desk=False, new=False):
    cls = "cb " + ("f" if filled else "o") + (" dis" if spent else "") + (" d" if desk else "") + (" new" if new else "")
    seg = "" if spent else f'<span class="s"><span>◆</span>{credit}</span>'
    return f'<span class="{cls}"><span class="l">{label}</span>{seg}</span>'


def cline(text, warn=None, new=False):
    t = linkify(text)
    if warn:
        t += f' · <span class="warn">{warn}</span>'
    return f'<p class="cline{" new" if new else ""}">{t}</p>'


def getmore(new=True, desk=False):
    st = ' style="min-height:32px"' if desk else ""
    return f'<span class="gmc{" new" if new else ""}"{st}>{C["line.getMore"]}<i>→</i></span>'


# ---------------------------------------------------------------- shell
def rail(active=None, menu=False):
    slots = "".join(f'<span class="rsl{" on" if n == active else ""}">{nav_icon(n)}</span>'
                    for n in ["Home", "Collection", "Commanders", "Discover", "Decks"])
    av = '<span class="rav" style="box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 25%,transparent)">CO</span>' if menu else '<span class="rav">CO</span>'
    return (f'<div class="rail"><span class="mk">{crown(6, 8.5, 3)}<span class="nn">99</span></span>'
            f'<span class="rsl" style="color:var(--fg-muted)">{ico_search(19, 1.5)}</span>'
            '<span style="width:24px;height:1px;background:var(--border-strong);margin:6px 0 10px"></span>'
            f'{slots}<span class="rfoot">{av}</span></div>')


def desk(inner, h=820, active=None, over="", check="desk", menu=False, w=1300):
    if h is None:
        return (f'<div class="dk" style="height:auto;width:{w}px">{rail(active, menu)}'
                f'<div class="main" style="overflow:visible">{inner}</div>{over}</div>')
    return (f'<div class="dk" data-check="{check}" style="height:{h}px;width:{w}px">{rail(active, menu)}'
            f'<div class="main" style="overflow:hidden">{inner}</div>{over}</div>')


def mphone(inner, h=844, active=None, over="", check="phone", hdr=True):
    head = header(search="rest", new=False) if hdr else ""
    return phone(f'{head}<div class="pb">{inner}</div>{tabbar(active or "none")}{over}', check=check,
                 style=f"height:{h}px")


# ---------------------------------------------------------------- billing page pieces
def ptitle(desk_=False):
    return (f'<div class="ptitle"><h1>{C["page.title"]}</h1>'
            f'<span class="sub">{linkify(C["page.sub"])}</span></div>')


def cell(k, n, sub, small="", warn=False, plus=""):
    sm = f"<small>{small}</small>" if small else ""
    pl = f'<span class="plus">{plus}</span>' if plus else ""
    return (f'<div class="cell"><span class="k">{k}</span><span class="n">{n}{sm}{pl}</span>'
            f'<span class="su{" warn" if warn else ""}">{sub}</span></div>')


def balance(free=(3, 5), plan=None, packs=None, total=None, today=None, plan_ends=False, plan_warn=False,
            plus=None, new=True):
    """`plan` / `packs` are counts or None (cell absent). `today`: None, 'near' or 'limit'."""
    cells = [cell(C["bal.free"], free[0], C["bal.freeSub"] if free[0] < free[1] else C["bal.freeFull"], f"of {free[1]}")]
    if plan is not None:
        sub = C["bal.planEnds"] if plan_ends else C["bal.planSub"]
        cells.append(cell(C["bal.plan"], plan, sub, warn=plan_warn, plus=(plus or {}).get("plan", "")))
    if packs is not None:
        cells.append(cell(C["bal.packs"], packs, C["bal.packsSub"], plus=(plus or {}).get("packs", "")))
    tot = total if total is not None else free[0] + (plan or 0) + (packs or 0)
    order = f'<div class="order"><span class="k">{C["bal.order"]}</span><span class="k">→</span></div>' if len(cells) > 1 else ""
    td = ""
    if today == "near":
        td = f'<div class="today"><span class="meter"><i style="width:85%"></i></span><span>{C["bal.near"]}</span></div>'
    elif today == "limit":
        td = (f'<div class="today"><span class="meter"><i style="width:100%;background:var(--warning)"></i></span>'
              f'<span>{C["bal.atLimit"]}</span></div>')
    return (f'<div class="bal{" new" if new else ""}"><div class="tot"><b>{tot}</b><span>{C["bal.total"]}</span></div>'
            f'{order}<div class="cells">{"".join(cells)}</div>{td}</div>')


OFFER_ART = {"v": "fan"}
ART_FOR = {"plan": "ghalta", "pack": "lathliss"}


def fan(n, cal=False, dim=False):
    v = OFFER_ART["v"]
    kind = "plan" if cal else "pack"
    if v == "diamond":
        crown3 = '<span class="dm3"><i></i><i class="b"></i><i></i></span>' if cal else ''
        return (f'<span class="dmk{" dim" if dim else ""}" aria-hidden="true">{crown3}<span class="dm"><b>{n}</b></span></span>')
    if v == "numeral":
        unit = "a month" if cal else "credits"
        return (f'<span class="nmk{" dim" if dim else ""}" aria-hidden="true"><b>{n}</b><small>{unit}</small></span>')
    if v == "wash":
        return ""  # drawn as the card's background, see offer_wash()
    if v == "card":
        return (f'<span class="rc{" dim" if dim else ""}{" pl" if cal else ""}" aria-hidden="true"><img src="art/{ART_FOR[kind]}.jpg" alt="">'
                f'<span class="ct">{"+" if not cal else ""}{n}{"/mo" if cal else ""}</span></span>')
    return _fan(n, cal, dim)


def offer_wash(kind, dim=False):
    if OFFER_ART["v"] != "wash":
        return ""
    return f'<span class="ow{" dim" if dim else ""}" aria-hidden="true"><img src="art/{ART_FOR[kind]}-art.jpg" alt=""></span>'


def _fan(n, cal=False, dim=False):
    inner = f"{n}<small>/MO</small>" if cal else str(n)
    return f'<span class="fanc{" cal" if cal else ""}{" dim" if dim else ""}" aria-hidden="true"><span class="a"></span><span class="b"></span><span class="c">{inner}</span></span>'


def plan_card(state="none", buy=True, new=True, pressed=False, n=74):
    """state: none | active | cancelled | soon | due"""
    return _plan_card(state, buy, new, pressed).replace("74 plan", f"{n} plan")


def _plan_card(state, buy, new, pressed):
    k = f'<span class="k">{C["plan.k"]}</span>'
    if state == "none":
        acts = ""
        if buy:
            acts = (f'<div class="acts"><span class="pbtn f">{C["plan.subscribe"]} · {C["plan.price"]}</span>'
                    f'<span class="via">{C["plan.via"]}</span></div>')
        fine = "".join(f"<li>{x}</li>" for x in C["plan.fine"])
        return (f'<div class="oc{" new" if new else ""}">{offer_wash("plan")}<div class="top"><div class="tt">{k}<h3>{C["plan.title"]}</h3>'
                f'<span class="pr">{C["plan.price"]}</span></div>{fan(60, cal=True)}</div><ul>{fine}</ul>{acts}</div>')
    if state == "active":
        press = ' style="box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 35%,transparent)"' if pressed else ""
        return (f'<div class="oc on{" new" if new else ""}">{offer_wash("plan")}<div class="top"><div class="tt">{k}<h3>{C["plan.title"]}</h3>'
                f'<span class="st">{C["plan.active"]}</span><span class="st" style="color:var(--fg)">{C["plan.activeLeft"]}</span></div>'
                f'{fan(60, cal=True)}</div>'
                f'<div class="acts"><span class="pbtn n"{press}>{C["plan.cancel"]}</span>'
                f'<p class="says">{C["plan.cancelSays"]}</p></div>'
                f'<span class="tl" style="align-self:flex-start">{C["plan.updateCard"]}<span class="ext">↗</span></span></div>')
    if state in ("cancelled", "soon"):
        soon = state == "soon"
        st = f'<span class="st{" warn" if soon else ""}">{C["plan.ended"]}</span>'
        says = C["plan.soon"] if soon else C["plan.endedSays"]
        keep = ""
        if buy:
            keep = (f'<div class="acts"><span class="pbtn o">{C["plan.keep"]}</span></div>'
                    f'<p class="says">{C["plan.keepSays"]}</p>')
        return (f'<div class="oc{" warn" if soon else ""}{" new" if new else ""}">{offer_wash("plan", dim=True)}<div class="top"><div class="tt">{k}<h3>{C["plan.title"]}</h3>{st}</div>'
                f'{fan(60, cal=True, dim=True)}</div><p class="says" style="color:{"var(--warning)" if soon else "var(--fg-body)"}">{says}</p>{keep}</div>')
    if state == "due":
        return (f'<div class="oc warn{" new" if new else ""}">{offer_wash("plan")}<div class="top"><div class="tt">{k}<h3>{C["plan.title"]}</h3>'
                f'<span class="st warn">{C["plan.dueTitle"]}</span></div>{fan(60, cal=True)}</div>'
                f'<p class="says">{C["plan.dueSays"]}</p>'
                f'<div class="acts"><span class="pbtn f">{C["plan.updateCard"]} ↗</span>'
                f'<span class="tl" style="color:var(--fg-body)">{C["plan.cancel"]}</span></div></div>')
    raise ValueError(state)


def pack_card(new=True, n=40, price="$5", title=None):
    return (f'<div class="oc{" new" if new else ""}">{offer_wash("pack")}<div class="top"><div class="tt"><span class="k">{C["pack.k"]}</span>'
            f'<h3>{title or C["pack.title"]}</h3><span class="pr">{price}</span></div>{fan(n)}</div>'
            f'<p class="says">{C["pack.fine"]}</p>'
            f'<div class="acts"><span class="pbtn f">{C["pack.buy"]} · {price}</span><span class="via">{C["plan.via"]}</span></div></div>')


HIST = [("Oct 16", C["hist.planMonth"], "$5.00", "60 credits"), ("Oct 2", C["hist.pack"], "$5.00", "40 credits"),
        ("Sep 16", C["hist.planFirst"], "$5.00", "60 credits"), ("Sep 16", C["hist.pack"], "$5.00", "40 credits")]


def history(rows=None, empty=False, new=True):
    head = f'<div class="sech"><h2>{C["hist.title"]}</h2></div>'
    if empty:
        body = f'<div class="hempty">{C["hist.empty"]}</div>'
    else:
        rs = "".join(f'<div class="hr"><span class="d">{d}</span><span class="w">{w}<small>{sm}</small></span><span class="a">{a}</span>'
                     f'<span class="r">{C["hist.receipt"]}<span class="ext">↗</span></span></div>' for d, w, a, sm in (rows or HIST))
        body = f'<div class="hist">{rs}</div>'
    return f'<div class="{"new" if new else ""}">{head}{body}<p class="refund">{C["refunds"]}</p></div>'


def offers(*cards, title="Get more credits"):
    return f'<div><div class="sech"><h2>{title}</h2></div><div class="offers">{"".join(cards)}</div></div>'


def band(kind, title, says="", extra=""):
    icon = {"ok": '<span class="tick">✓</span>', "proc": '<span class="dot"></span>', "slow": '<span class="dot" style="background:var(--fg-muted);box-shadow:none"></span>',
            "hold": '<span class="hold"><i></i><i></i></span>'}.get(kind, "")
    bar = '<span class="bar"><i></i></span>' if kind in ("proc",) else ""
    cls = {"ok": "ok", "proc": "proc", "slow": "", "hold": "", "quiet": "quiet"}[kind]
    if kind == "quiet":
        return f'<div class="band quiet new"><div class="bt"><p>{title}</p></div><span class="x">✕</span></div>'
    p = f"<p>{says}</p>" if says else ""
    return f'<div class="band {cls} new">{icon}<div class="bt"><b>{title}</b>{p}{extra}</div>{bar}</div>'


def toast(title, detail=""):
    d = f"<small>{detail}</small>" if detail else ""
    return f'<div class="toast new"><span class="t"><span>{title}</span>{d}</span></div>'


def sheet(title, body, desk_=False):
    head = f'<div class="mhead"><h2>{title}</h2><span class="x">✕</span></div>'
    if desk_:
        return f'<div class="scr"></div><div class="mdl new">{head}<div class="mbody">{body}</div></div>'
    return f'<div class="scr"></div><div class="sht new"><div class="grab"><i></i></div>{head}<div class="mbody">{body}</div></div>'


MENU_COUNT = {"v": "line"}


def id_block(entry=None, desk_=False):
    v = MENU_COUNT["v"]
    if entry and v == "chip":
        n, _, rest = entry.partition(" ")
        crd = f'<span class="crd2 new"><i>◆</i><b>{n}</b>{rest}<em>›</em></span>'
    elif entry and v == "big":
        n, _, rest = entry.partition(" ")
        return (f'<div class="idb"><span class="av2">CO</span><span class="nm"><b>Colin Ortiz</b><span>colin@example.com</span></span>'
                f'<span class="big new"><b>{n}</b><small>{"free" if "free" in rest else rest} ›</small></span></div>')
    elif entry and v == "meter":
        n, _, rest = entry.partition(" ")
        segs = ('<i style="flex:3;background:color-mix(in srgb,var(--accent) 45%,transparent)"></i>'
                '<i style="flex:74;background:var(--accent)"></i><i style="flex:40;background:color-mix(in srgb,var(--accent) 70%,var(--fg))"></i>') if "free" not in rest else \
               '<i style="flex:3;background:var(--accent)"></i><i style="flex:2;background:var(--elevated)"></i>'
        crd = f'<span class="mtr new"><span class="r"><span>{rest}</span><b>{n} ›</b></span><span class="bar">{segs}</span></span>'
    else:
        crd = f'<span class="crd new">◆ {entry}<i>›</i></span>' if entry else ""
    return (f'<div class="idb"><span class="av2">CO</span><span class="nm"><b>Colin Ortiz</b><span>colin@example.com</span>{crd}</span></div>')


def menu_items(friends=True, hover=None):
    rows = [("About", ""), ("Friends", "")] if friends else [("About", "")]
    rows += [("Manage account", ""), ("Sign out", "dg")]
    return '<div class="mi">' + "".join(
        f'<span class="{"hv" if hover == n else ""}"><i class="{c}"></i>{n}</span>' for n, c in rows) + "</div>"


def theme_chips():
    return '<div class="thm">' + "".join(f'<span class="{"on" if t == "Kamigawa" else ""}">{t}</span>' for t in ["Amonkhet", "Kamigawa", "Ixalan", "New Phyrexia", "Eldraine", "Kaldheim"]) + '</div>'


def menu_pop(entry, hover=None):
    return f'<div class="amp">{id_block(entry)}{theme_chips()}{menu_items(hover=hover)}</div>'


def menu_sheet(entry, hover=None):
    return (f'<div class="scr"></div><div class="amsh"><div class="grab"></div>{id_block(entry)}{theme_chips()}'
            f'{menu_items(hover=hover)}</div>')


def board_head(kicker, title, cap):
    return f'<div class="bh"><span class="k">{kicker}</span><h2>{title}</h2><p class="cap" style="max-width:1500px">{cap}</p></div>'


def table(rows, heads):
    th = "".join(f"<th>{h}</th>" for h in heads)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="t"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


# ---------------------------------------------------------------- whole pages
def mphone(inner, h=844, active=None, over="", check="phone", hdr=True):
    head = header(search="rest", new=False) if hdr else ""
    if h is None:
        return (f'<div class="ph" style="height:auto">{head}<div class="pb" style="flex:none;overflow:visible">{inner}</div>'
                f'{tabbar(active or "none")}{over}</div>')
    return (f'<div class="ph" style="height:{h}px">{head}<div class="pb" data-check="{check}">{inner}</div>'
            f'{tabbar(active or "none")}{over}</div>')


def desk(inner, h=820, active=None, over="", check="desk", menu=False, w=1300):
    if h is None:
        return (f'<div class="dk" style="height:auto;width:{w}px">{rail(active, menu)}'
                f'<div class="main" style="overflow:visible">{inner}</div>{over}</div>')
    return (f'<div class="dk" style="height:{h}px;width:{w}px">{rail(active, menu)}'
            f'<div class="main" data-check="{check}">{inner}</div>{over}</div>')


def sec(title, inner, new=False):
    return f'<div class="{"new" if new else ""}"><div class="sech"><h2>{title}</h2></div>{inner}</div>'


def page(bal=None, plan="none", packs_on=True, hist=None, hist_empty=False, band_html="", blocked=False,
         buy=True, extra_pack=False, n=74):
    """The /credits page body. `plan`: none | active | cancelled | soon | due | gone (reduced page, no plan).
    `buy`: buy controls drawn (payments on and not blocked)."""
    parts = [ptitle()]
    if band_html:
        parts.append(band_html)
    parts.append(bal or balance())
    subscribed = plan in ("active", "cancelled", "soon", "due")
    cols = []
    if blocked:
        if subscribed:
            cols.append(sec("Your plan", plan_card(plan, buy=False, new=False, n=n)))
        parts.append(f'<div class="offers">{"".join(cols)}</div>' if cols else "")
        parts.append(band("hold", "Buying is paused", C["blocked"].replace("Buying is paused on this account. ", "")))
    else:
        if subscribed:
            cols.append(sec("Your plan", plan_card(plan, buy=buy, new=False, n=n)))
            if buy and packs_on:
                pk = pack_card(new=False)
                if extra_pack:
                    pk += '<div style="height:14px"></div>' + pack_card(new=True, n=100, price="$10", title="100 credits").replace("Buy 40 credits", "Buy 100 credits")
                cols.append(sec("Get more credits", pk))
        elif buy:
            cards = plan_card("none", new=False) + (pack_card(new=False) if packs_on else "")
            if extra_pack:
                cards += pack_card(new=True, n=100, price="$10", title="100 credits").replace("Buy 40 credits", "Buy 100 credits")
            parts.append(sec("Get more credits", f'<div class="offers">{cards}</div>'))
        if cols:
            parts.append(f'<div class="offers">{"".join(cols)}</div>')
    parts.append(history(rows=hist, empty=hist_empty, new=False))
    return f'<div class="pg">{"".join(parts)}</div>'


def skeleton():
    return ('<div class="pg">' + ptitle() +
            '<div style="display:flex;flex-direction:column;gap:12px"><span class="sk" style="width:140px;height:40px"></span>'
            '<span class="sk" style="height:84px;border-radius:12px"></span></div>'
            '<span class="sk" style="height:220px;border-radius:14px"></span><span class="sk" style="height:160px;border-radius:12px"></span></div>')


def failed_page():
    from_fail = ('<svg width="18" height="18" viewBox="0 0 16 16"><path fill="var(--danger)" fill-rule="evenodd" d="M8 1.2 A6.8 6.8 0 1 0 8 14.8 A6.8 6.8 0 1 0 8 1.2 Z M7.05 4 H8.95 L8.6 9.3 H7.4 Z M8 10.5 A1.15 1.15 0 1 0 8 12.8 A1.15 1.15 0 1 0 8 10.5 Z"/></svg>')
    return ('<div class="pg">' + ptitle() + f'<div class="fail new"><span class="h">{from_fail}{C["read.failed"]}</span>'
            f'<span class="pbtn n">{C["read.retry"]}</span></div></div>')
