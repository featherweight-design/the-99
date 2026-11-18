#!/usr/bin/env python3
"""Launch email R1: the one-time email to the launch list, on the shipped R2 shell (shellkit = build.py's shell, verbatim).

[[name]] is filled by our code before Resend sends. Usage: launch.py <out dir>  (writes templates + _preview fills)
"""
import sys, os
from shellkit import *  # noqa: F401,F403  (C, SANS, SERIF, MONO, ORIGIN, MARK, shell, kicker, h1, p, rule, fine, points, button, raw_link, hero, FLAVOR)

OUT = sys.argv[1]
HAND = f"{ORIGIN}/email/launch-hand@2x.png"

SUBJECT = "The 99 is open"
PREHEADER = "Make your free account and see what your binder can build. 15 welcome credits are waiting."
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


def launch(source):
    inner = hero(HAND, "Three of The 99&#8217;s card backs, the top one reading Now open")
    inner += kicker("Now open")
    inner += h1("The&nbsp;99 is open to everyone")
    inner += p("You asked us to tell you the day it opened. Today&#8217;s the day. Make your free account and see what your cards can build.", 22)
    inner += steps_box(STEPS)
    inner += button("Sign up free", "[[signup_url]]")
    inner += small("Free to join. No card details.", 22)
    inner += raw_link("[[signup_url]]")
    inner += rule()
    inner += fine("You don&#8217;t need an invite or a flyer code. Anyone can join now.")
    html = shell(SUBJECT, PREHEADER, inner, REASON[source])
    html = html.replace("<br>Replies to this email aren&#8217;t read.", f"<br>{UNSUB}<br>Replies to this email aren&#8217;t read.")
    return html


def text(source):
    return (f"Subject: {SUBJECT}\n\n"
            "The 99 is open to everyone. You asked us to tell you the day it opened, and today's the day.\n\n"
            "Where to start:\n" + "".join(f"{i}. {t}\n" for i, t in enumerate(STEPS, 1)) +
            "\nSign up free:\n[[signup_url]]\n\n"
            "Free to join. No card details. You don't need an invite or a flyer code.\n\n"
            "--\n"
            f"{REASON_TEXT[source]}\n"
            "This is the only email the launch list sends. Unsubscribe and we'll delete this address now:\n"
            "[[unsubscribe_url]]\n"
            f"{FLAVOR}\nReplies to this email aren't read.\nhttps://the-99.dev\n")


os.makedirs(OUT, exist_ok=True)
pv = os.path.join(OUT, "_preview"); os.makedirs(pv, exist_ok=True)
fill = {"[[signup_url]]": "https://the-99.dev/sign-up",
        "[[unsubscribe_url]]": "https://the-99.dev/unsubscribe?t=lst_8kQ2vR7mXp4aN9cJ",
        HAND: "launch-hand.png", MARK: "mark.png"}
for src in ["landing", "flyer"]:
    h = launch(src)
    suffix = "" if src == "landing" else "-flyer"
    open(os.path.join(OUT, f"launch{suffix}.html"), "w").write(h)
    open(os.path.join(OUT, f"launch{suffix}.txt"), "w").write(text(src))
    for a, b in fill.items():
        h = h.replace(a, b)
    open(os.path.join(pv, f"launch{suffix}.html"), "w").write(h)
