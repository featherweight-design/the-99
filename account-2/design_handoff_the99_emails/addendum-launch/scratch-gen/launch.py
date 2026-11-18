#!/usr/bin/env python3
"""Launch email R2: the one-time email to the launch list, on the shipped R2 shell (shellkit = build.py's shell, verbatim).

[[name]] is filled by our code before Resend sends. Usage: launch.py <out dir>  (writes templates + _preview fills)
"""
import sys, os
from shellkit import *  # noqa: F401,F403  (C, SANS, SERIF, MONO, ORIGIN, MARK, shell, kicker, h1, p, rule, fine, points, button, raw_link, hero, FLAVOR)

OUT = sys.argv[1]
FAN = f"{ORIGIN}/email/launch-fan@2x.png"
TAGLINE = "99 problems, but your commander ain&#8217;t one."
TAGLINE_TEXT = "99 problems, but your commander ain't one."

SUBJECT = "The 99 is open"
PREHEADER = "Make a free account and see what your cards can build. You start with 15 credits."
STEPS = [
    "Bring your collection. Upload a CSV, paste a list or scan your cards.",
    "See every commander you can already build, ranked by how much of its deck you own.",
    "Try the writing tools on your own decks with 15 welcome credits.",
]
REASON = {
    "landing": "You&#8217;re getting this because this address was left on The&nbsp;99&#8217;s launch list at <span style=\"white-space:nowrap;\">the-99.dev</span>.",
    "flyer": "You&#8217;re getting this because this address was left on The&nbsp;99&#8217;s launch list from a flyer.",
}
import re
REASON_TEXT = {k: re.sub("<[^>]+>", "", v).replace("&#8217;", "'").replace("&nbsp;", " ") for k, v in REASON.items()}
UNSUB = ("This is the only email the launch list sends. "
         f'<a href="[[unsubscribe_url]]" style="color:{C["muted"]};text-decoration:underline;">Unsubscribe</a> '
         "and we&#8217;ll delete this address now.")


def steps_box(items):
    """The shipped points box (shellkit.points) with numerals in place of the diamonds: these are steps, in order."""
    rows = "".join(
        f'<tr><td valign="top" style="padding:0 12px 10px 0;font:bold 15px/24px {SERIF};color:{C["accent"]};">{i}</td>'
        f'<td valign="top" style="padding:0 0 10px;font:15px/24px {SANS};color:{C["h"]};">{t}</td></tr>'
        for i, t in enumerate(items, 1))
    return (f'<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" bgcolor="{C["elevated"]}" '
            f'style="margin:0 auto 28px;background:{C["elevated"]};border:1px solid {C["line"]};border-radius:10px;">'
            f'<tr><td style="padding:16px 22px 6px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">{rows}</table></td></tr></table>')


def small(t, mb=26):
    return f'<p style="margin:0 0 {mb}px;font:13px/1.5 {SANS};color:{C["muted"]};text-align:center;">{t}</p>'


FEATURES = [
    ("commanders", 238, "See what you can build",
     "Every commander you own, ranked by how much of its deck you already have.",
     "Jace and Y&#8217;shtola, ranked with fit scores of 84 and 79 out of 100"),
    ("tune", 106, "Change a deck by describing it",
     "Say what you want from the deck. It suggests cards to add and cut, starting with ones you own, and says why for each.",
     "For &#8220;More interaction&#8221;: add Chaos Warp and Abrade, cut Smokebraider"),
    ("written", 170, "Read why a commander works",
     "Every commander page explains how its deck plays, and every precon has an Overview. Both are free.",
     "Tam, the Possibility, with why this commander is worth building"),
    ("credits", 116, "Try the writing tools free",
     "Your welcome credits are enough to try every writing tool three times before you pay anything.",
     "15 welcome credits when you join, plus 1 free credit every day"),
]


# The text twin has no pictures, so a feature whose image carries facts says them in words.
TEXT_BODY = {"credits": "You start with 15 welcome credits, enough to try every writing tool three times before you pay anything, and get 1 free credit every day."}


def feature(i, key, h, title, body, alt):
    """One feature, one box: the numbered label, the title and the sentence, then its capture of the shipped landing
    below them (320 wide, fluid on a phone). One column at every width, so each image sits under the words it shows."""
    w = 320
    # The credits capture is the landing's whole value card (own border, radius and padding, transparent corners): no second frame.
    frame = "border:0;" if key == "credits" else f"border:1px solid {C['line']};border-radius:10px;"
    hh = round(h * w / 240)
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{C["elevated"]}" '
            f'style="margin:0 0 20px;background:{C["elevated"]};border:1px solid {C["line"]};border-radius:12px;"><tr>'
            f'<td class="fbox" align="center" style="padding:26px 28px 28px;text-align:center;">'
            f'<p style="margin:0 0 8px;font:600 11px/1.4 {SANS};letter-spacing:.22em;text-transform:uppercase;color:{C["accent"]};">{D}&nbsp;&nbsp;{i:02d}</p>'
            f'<p style="margin:0 0 8px;font:bold 22px/1.25 {SERIF};color:{C["h"]};">{title}</p>'
            f'<p style="margin:0 auto 20px;max-width:400px;font:15px/1.6 {SANS};color:{C["body"]};">{body}</p>'
            f'<img src="{ORIGIN}/email/feature-{key}@2x.png" width="{w}" height="{hh}" alt="{alt}" '
            f'style="display:block;width:100%;max-width:{w}px;height:auto;margin:0 auto;{frame}'
            f'font:italic 13px/1.5 {SANS};color:{C["muted"]};"></td></tr></table>')


def launch(source):
    inner = (f'<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:-8px auto 14px;"><tr><td align="center">'
             f'<img src="{FAN}" width="520" height="280" alt="A fan of commander cards around The 99&#8217;s card back, which reads Now open" '
             f'style="display:block;width:100%;max-width:520px;height:auto;border:0;font:italic 14px/1.5 {SANS};color:{C["muted"]};"></td></tr></table>')
    inner += kicker("Now open")
    inner += h1("Your next commander is already in your binder")
    inner += p("The 99 is open to everyone, starting today.", 24)
    inner += button("Sign up free", "[[signup_url]]").replace("margin:0 auto 18px", "margin:0 auto 36px")
    inner += (f'<p style="margin:0 0 22px;font:600 12px/1.4 {SANS};letter-spacing:.22em;text-transform:uppercase;color:{C["muted"]};text-align:center;">'
              f'From your binder to a finished deck</p>')
    for i, f in enumerate(FEATURES, 1):
        inner += feature(i, *f)
    inner += button("Sign up free", "[[signup_url]]")
    inner += small("Free to join. No card details.", 22)
    inner += raw_link("[[signup_url]]").replace("margin:0 0 28px", "margin:0")
    html = shell(SUBJECT, PREHEADER, inner, REASON[source])
    html = html.replace("<br>Replies to this email aren&#8217;t read.", f"<br>{UNSUB}<br>Replies to this email aren&#8217;t read.")
    html = html.replace(FLAVOR, TAGLINE)
    html = html.replace("    .h1 { font-size:26px !important; }",
                        "    .h1 { font-size:26px !important; }\n    .fbox { padding:22px 18px 20px !important; }")
    return html


def text(source):
    feats = "".join(f"- {t}. {re.sub('&#8217;', chr(39), TEXT_BODY.get(k, b))}\n" for k, _, t, b, _ in FEATURES)
    return (f"Subject: {SUBJECT}\n\n"
            "Your next commander is already in your binder. The 99 is open to everyone today.\n\n"
            "Sign up free:\n[[signup_url]]\n\n"
            "From your binder to a finished deck:\n" + feats +
            "\nSign up free:\n[[signup_url]]\n\n"
            "Free to join. No card details.\n\n"
            "--\n"
            f"{REASON_TEXT[source]}\n"
            "This is the only email the launch list sends. Unsubscribe and we'll delete this address now:\n"
            "[[unsubscribe_url]]\n"
            f"{TAGLINE_TEXT}\nReplies to this email aren't read.\nhttps://the-99.dev\n")


os.makedirs(OUT, exist_ok=True)
pv = os.path.join(OUT, "_preview"); os.makedirs(pv, exist_ok=True)
fill = {"[[signup_url]]": "https://the-99.dev/sign-up",
        "[[unsubscribe_url]]": "https://the-99.dev/unsubscribe?t=lst_8kQ2vR7mXp4aN9cJ",
        FAN: "launch-fan@2x.png", MARK: "mark.png", **{f"{ORIGIN}/email/feature-{k}@2x.png": f"feature-{k}@2x.png" for k in ["commanders","tune","written","credits"]}}
for src in ["landing", "flyer"]:
    h = launch(src)
    suffix = "" if src == "landing" else "-flyer"
    open(os.path.join(OUT, f"launch{suffix}.html"), "w").write(h)
    open(os.path.join(OUT, f"launch{suffix}.txt"), "w").write(text(src))
    for a, b in fill.items():
        h = h.replace(a, b)
    open(os.path.join(pv, f"launch{suffix}.html"), "w").write(h)
