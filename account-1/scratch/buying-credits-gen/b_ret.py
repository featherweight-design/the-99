from ck import *

FADE = ('<div style="position:absolute;left:0;right:0;bottom:74px;height:70px;z-index:4;'
        'background:linear-gradient(180deg,transparent,var(--bg));display:flex;align-items:flex-end;justify-content:center;padding-bottom:8px">'
        '<span class="k">page scrolls</span></div>')
FADE_D = FADE.replace("bottom:74px", "bottom:0").replace("left:0", "left:62px")

H_NEWPACK = [("Oct 16", C["hist.pack"], "$5.00", "40 credits")] + __import__("ck").HIST
REC = f'<span class="tl" style="min-height:32px;font-size:13px">{C["hist.receipt"]}<span class="ext">↗</span></span>'

STATES = [
    ("R1", "Back from Stripe, credits not landed yet",
     dict(band_html=band("proc", C["ret.procTitle"], C["ret.procSays"]), bal=balance((3, 5), plan=74, packs=40, new=False), plan="active"),
     "The return grants nothing: the band says payment was received and credits are on their way. The cells still read what has landed. The page re-reads on its own every 2s; the 2px bar moves, no spinner."),
    ("R2", "Pack credits added",
     dict(band_html=band("ok", C["ret.addedPack"], "", REC), bal=balance((3, 5), plan=74, packs=80, plus={"packs": "+40"}, new=False), plan="active", hist=H_NEWPACK),
     "The webhook landed: the band names what was added, the Packs cell carries <code>+40</code> in <code>--success</code>, and the purchase heads history. The band stays until the reader leaves the page."),
    ("R3", "Plan started",
     dict(band_html=band("ok", C["ret.addedPlan"], C["ret.addedPlanSays"]), bal=balance((2, 5), plan=60, plus={"plan": "+60"}, new=False), plan="active", n=60,
          hist=[("Oct 16", C["hist.planFirst"], "$5.00", "60 credits")]),
     "The first 60 are named. The card is now <b>Your plan</b> with Cancel plan on it, so the way out is visible from the first minute."),
    ("R4", "Still processing after about a minute",
     dict(band_html=band("slow", C["ret.slowTitle"], C["ret.slowSays"]), bal=balance((3, 5), plan=74, packs=40, new=False), plan="active"),
     "Honest copy: it can take longer, no double charge, and the support address. The page keeps re-reading, slower (every 10s); if the credits land, R2 replaces this."),
    ("R5", "Cancelled on Stripe’s page",
     dict(band_html=band("quiet", C["ret.cancelled"]), bal=balance((3, 5), plan=74, packs=40, new=False), plan="active"),
     "Nothing charged, no alarm: one quiet line with a bare ✕, the page otherwise as it was."),
]


def board():
    ph, dk = [], []
    for key, lab, kw, cap in STATES:
        ph.append(frame(f"{key} · {lab} · 390", mphone(page(**kw), h=844, check="scroll", over=FADE), cap))
        dk.append(frame(f"{key} · desktop", desk(page(**kw), h=820, check="scroll", over=FADE_D), "", width=1300))
    kw = dict(band_html=band("proc", C["ret.procTitle"], C["ret.procSays"]), bal=balance((3, 5), plan=74, packs=40, new=False), plan="active")
    ph.append(frame("R6 · A re-read failed · 390", mphone(page(**kw), h=844, check="scroll", over=FADE + toast(C["ret.toast"], C["ret.toastDetail"])),
                    "Transient, so the shared ToastFrame. The band stays as it was; the next re-read tries again on its own."))
    dk.append(frame("R6 · desktop", desk(page(**kw), h=820, check="scroll", over=toast(C["ret.toast"], C["ret.toastDetail"])), "", width=1300))
    body = (
        board_head("Buying credits R1 · §4 · back from Checkout", "Checkout’s return states",
                   "Stripe’s hosted page takes the payment; we draw no form. The reader comes back to <code>/credits</code> with an outcome, and a band at the top of the page "
                   "(under the title, above the balance) says where things stand. Credits are only ever added by the signed webhook, so the band never claims more than the server knows.")
        + '<div class="sec"><h3>Phone · 390</h3><div class="frames">' + "".join(ph) + '</div></div>'
        + '<div class="sec"><h3>Desktop</h3><div class="frames">' + "".join(dk) + '</div></div>'
        + '<div class="note" style="max-width:2600px"><b>Notes</b><ul>'
          '<li>The outcome comes from the return URL plus the server’s read of the Checkout session; refreshing the page keeps the band until the credits land or the reader leaves.</li>'
          '<li>A card refused on Stripe’s page (non-US, declined) never reaches us: the reader stays on Stripe’s page with Stripe’s message.</li>'
          '<li>Announced once each in the page’s polite live region: processing, added, still processing.</li></ul></div>'
    )
    return doc("Buying credits · checkout return", body, 2770, 4000)
