#!/usr/bin/env python3
"""Branded emails R2: builds the reference templates (HTML + plain text) from one shell.

[[name]] is filled by our code (Resend sends); {{name}} is a Clerk variable (Clerk's editor fills it).
Usage: build2.py <out dir> [--preview]   (--preview also writes filled previews to <out>/_preview)
"""
import sys, os

OUT = sys.argv[1]
PREVIEW = "--preview" in sys.argv

# Table Candlelight, fixed for email (design_handoff_the99_brand).
C = dict(ground="#14110E", panel="#1E1A15", elevated="#2A241D", line="#3A3229",
         h="#EDE6D8", body="#C6B79A", muted="#A89B84", accent="#C9A24B", on_accent="#14110E")
SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
SERIF = "Georgia,'Times New Roman',Times,serif"
MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono','Courier New',monospace"
ORIGIN = "https://the-99.dev"
MARK = f"{ORIGIN}/email/mark-112@2x.png"
HERO_PLAIN = f"{ORIGIN}/email/invite-hero-plain@2x.png"
D = "&#9670;"  # brass diamond
FLAVOR = "Search your library for a commander."

def shell(title, preheader, inner, reason):
    return f"""<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>{title}</title>
<style>
  :root {{ color-scheme: dark; supported-color-schemes: dark; }}
  body {{ margin:0; padding:0; background:{C['ground']}; }}
  a {{ color:{C['accent']}; }}
  @media (max-width:620px) {{
    .pad {{ padding-left:24px !important; padding-right:24px !important; }}
    .gut {{ padding-left:12px !important; padding-right:12px !important; }}
    .h1 {{ font-size:26px !important; }}
  }}
</style>
<!--[if mso]><style>table,td,p,a,h1{{font-family:Arial,sans-serif !important;}}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:{C['ground']};" bgcolor="{C['ground']}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:{C['ground']};opacity:0;">{preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{C['ground']}" style="background:{C['ground']};">
<tr><td align="center" class="gut" style="padding:36px 24px 44px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="col" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td align="center" style="padding:0 0 24px;">
  <a href="{ORIGIN}" style="text-decoration:none;"><img src="{MARK}" width="56" height="56" alt="The 99" style="display:block;width:56px;height:56px;border:0;border-radius:13px;font:bold 13px/56px {SERIF};color:{C['accent']};text-align:center;"></a>
</td></tr>
<tr><td bgcolor="{C['panel']}" class="pad" style="background:{C['panel']};border:1px solid {C['line']};border-top:3px solid {C['accent']};border-radius:12px;padding:36px 40px 32px;">
{inner}
</td></tr>
<tr><td align="center" class="pad" style="padding:28px 40px 0;">
  <p aria-hidden="true" style="margin:0 0 10px;font:10px/1 {SANS};letter-spacing:8px;color:{C['accent']};">{D}{D}{D}</p>
  <p style="margin:0 0 14px;font:italic 15px/1.5 {SERIF};color:{C['body']};">{FLAVOR}</p>
  <p style="margin:0;font:13px/1.6 {SANS};color:{C['muted']};">{reason}<br>Replies to this email aren&#8217;t read.<br><a href="{ORIGIN}" style="color:{C['muted']};text-decoration:underline;">the-99.dev</a></p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
"""

def kicker(t):
    return f'<p style="margin:0 0 14px;font:600 12px/1.4 {SANS};letter-spacing:.22em;text-transform:uppercase;color:{C["accent"]};text-align:center;">{D}&nbsp;&nbsp;{t}&nbsp;&nbsp;{D}</p>'

def h1(t):
    return f'<h1 class="h1" style="margin:0 0 14px;font:bold 30px/1.2 {SERIF};color:{C["h"]};text-align:center;">{t}</h1>'

def p(t, mb=24):
    return f'<p style="margin:0 0 {mb}px;font:16px/1.6 {SANS};color:{C["body"]};text-align:center;">{t}</p>'

def rule():
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid {C["line"]};font-size:0;line-height:0;height:1px;padding:0 0 20px;">&nbsp;</td></tr></table>'

def fine(t):
    return f'<p style="margin:0;font:14px/1.55 {SANS};color:{C["muted"]};text-align:center;">{t}</p>'

def points(items):
    rows = "".join(
        f'<tr><td valign="top" style="padding:0 12px 10px 0;font:12px/24px {SANS};color:{C["accent"]};">{D}</td>'
        f'<td valign="top" style="padding:0 0 10px;font:15px/24px {SANS};color:{C["h"]};">{t}</td></tr>' for t in items)
    return (f'<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" bgcolor="{C["elevated"]}" '
            f'style="margin:0 auto 28px;background:{C["elevated"]};border:1px solid {C["line"]};border-radius:10px;">'
            f'<tr><td style="padding:16px 22px 6px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">{rows}</table></td></tr></table>')

def button(label, href):
    return f"""<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 18px;">
<tr><td align="center" bgcolor="{C['accent']}" style="background:{C['accent']};border:1px solid {C['accent']};border-radius:8px;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{href}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="16%" stroke="f" fillcolor="{C['accent']}"><center style="color:{C['on_accent']};font:bold 17px Arial,sans-serif;">{label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- --><a href="{href}" style="display:inline-block;padding:16px 44px;min-width:180px;font:bold 17px/20px {SANS};color:{C['on_accent']};text-decoration:none;border-radius:8px;">{label}</a><!--<![endif]-->
</td></tr></table>"""

def raw_link(href):
    return (f'<p style="margin:0 0 4px;font:13px/1.5 {SANS};color:{C["muted"]};text-align:center;">Button not working? Paste this link into your browser:</p>'
            f'<p style="margin:0 0 28px;font:12px/1.5 {MONO};color:{C["muted"]};text-align:center;word-break:break-all;">'
            f'<a href="{href}" style="color:{C["muted"]};text-decoration:underline;">{href}</a></p>')

def code_box(code):
    return f"""<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
<tr><td align="center" bgcolor="{C['elevated']}" style="background:{C['elevated']};border:1px solid {C['accent']};border-radius:10px;padding:18px 30px;">
<p style="margin:0;font:600 38px/1.15 {MONO};letter-spacing:.28em;color:{C['h']};padding-left:.28em;">{code}</p>
</td></tr></table>"""

def hero(img, alt):
    return (f'<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 18px;"><tr><td align="center">'
            f'<img src="{img}" width="280" height="270" alt="{alt}" style="display:block;width:280px;height:270px;border:0;font:italic 14px/1.5 {SANS};color:{C["muted"]};">'
            f'</td></tr></table>')

FOOT_TEXT = f"{FLAVOR}\nReplies to this email aren't read.\nhttps://the-99.dev"

POINTS = ["Find the commanders hiding in your binder.",
          "Learn which combo is only one card away.",
          "Borrow a friend&#8217;s spare before you pay for one."]
POINTS_TEXT = ["Find the commanders hiding in your binder.",
               "Learn which combo is only one card away.",
               "Borrow a friend's spare before you pay for one."]

EMAILS = {}

def invite(art: bool):
    inner = hero("[[card_image_url]]", "[[sender]]’s invitation card, with [[commander]] art") if art \
        else hero(HERO_PLAIN, "An invitation to The 99")
    inner += kicker("You&#8217;re invited")
    inner += h1("[[sender]] saved you a seat at The&nbsp;99")
    inner += p("The 99 reads the cards you already own and builds Commander decks from them. Join as [[sender]]&#8217;s friend. Your decks and your collection stay yours.", 22)
    inner += points(POINTS)
    inner += button("Join The 99", "[[invite_url]]")
    inner += raw_link("[[invite_url]]")
    inner += rule()
    inner += fine("This link works for [[days]] days. Don&#8217;t know [[sender_or_who]]? You can ignore this email.")
    return shell("[[sender]] invited you to The 99", "Join as [[sender]]’s friend. Your invite works for [[days]] days.", inner,
                 "You&#8217;re getting this because [[sender]] invited this address to The&nbsp;99.")

INVITE_TEXT = """[[sender]] saved you a seat at The 99.

The 99 reads the cards you already own and builds Commander decks from them. Join as [[sender]]'s friend. Your decks and your collection stay yours.

""" + "".join(f"- {t}\n" for t in POINTS_TEXT) + """
Join The 99:
[[invite_url]]

This link works for [[days]] days. Don't know [[sender_or_who]]? You can ignore this email.

--
You're getting this because [[sender]] invited this address to The 99.
""" + FOOT_TEXT + "\n"

EMAILS["invite-art"] = dict(subject="[[sender]] invited you to The 99", html=invite(True), text=INVITE_TEXT)
EMAILS["invite-plain"] = dict(subject="[[sender]] invited you to The 99", html=invite(False), text=INVITE_TEXT)

def code_mail():
    inner = kicker("One-time code")
    inner += h1("Here&#8217;s your code")
    inner += p("Enter it on the page where you asked for it.", 22)
    inner += code_box("[[code]]")
    inner += rule()
    inner += fine("It expires in 10 minutes. Didn&#8217;t ask for a code? You can ignore this email.")
    return shell("Your code for The 99", "Enter it on the page where you asked for it. It expires in 10 minutes.", inner,
                 "You&#8217;re getting this because someone asked for a code for this address on The&nbsp;99.")

EMAILS["code-newcomer"] = dict(subject="Your code for The 99: [[code]]", html=code_mail(), text="""Here's your code for The 99. Enter it on the page where you asked for it:

[[code]]

It expires in 10 minutes. Didn't ask for a code? You can ignore this email.

--
You're getting this because someone asked for a code for this address on The 99.
""" + FOOT_TEXT + "\n")

def clerk_sign_in():
    inner = kicker("Sign-in code")
    inner += h1("Welcome back")
    inner += p("Enter this code on the sign-in page.", 22)
    inner += code_box("{{otp_code}}")
    inner += rule()
    inner += fine("It expires in 10 minutes. If you didn&#8217;t try to sign in, you can ignore this email. No one can get in without this code.")
    return shell("Your sign-in code for The 99", "Enter it on the sign-in page. It expires in 10 minutes.", inner,
                 "You&#8217;re getting this because someone tried to sign in to The&nbsp;99 with this address.")

def clerk_reset():
    inner = kicker("Password reset")
    inner += h1("Reset your password")
    inner += p("Enter this code on the sign-in page, then choose a new password.", 22)
    inner += code_box("{{otp_code}}")
    inner += rule()
    inner += fine("It expires in 10 minutes. If you didn&#8217;t ask to reset your password, you can ignore this email. Your password won&#8217;t change.")
    return shell("Reset your password for The 99", "Enter it on the sign-in page. It expires in 10 minutes.", inner,
                 "You&#8217;re getting this because someone asked to reset the password for this address on The&nbsp;99.")

EMAILS["clerk-sign-in-code"] = dict(subject="Your sign-in code for The 99: {{otp_code}}", html=clerk_sign_in(), text="""Welcome back. Enter this code on the sign-in page:

{{otp_code}}

It expires in 10 minutes. If you didn't try to sign in, you can ignore this email. No one can get in without this code.

--
You're getting this because someone tried to sign in to The 99 with this address.
""" + FOOT_TEXT + "\n")
EMAILS["clerk-reset-password-code"] = dict(subject="Your password reset code for The 99: {{otp_code}}", html=clerk_reset(), text="""Enter this code on the sign-in page, then choose a new password:

{{otp_code}}

It expires in 10 minutes. If you didn't ask to reset your password, you can ignore this email. Your password won't change.

--
You're getting this because someone asked to reset the password for this address on The 99.
""" + FOOT_TEXT + "\n")

os.makedirs(OUT, exist_ok=True)
for k, e in EMAILS.items():
    name = {"code-newcomer": "code"}.get(k, k)
    open(os.path.join(OUT, f"{name}.html"), "w").write(e["html"])
    if k != "invite-plain":
        tname = "invite" if k == "invite-art" else name
        open(os.path.join(OUT, f"{tname}.txt"), "w").write(f"Subject: {e['subject']}\n\n" + e["text"])

if PREVIEW:
    URL = "https://the-99.dev/sign-up?__clerk_ticket=eyJhbGciOiJSUzI1NiJ9.eyJpaWQiOiJpbnZfMnBRa1h0ZDhWcm"
    base = {"[[days]]": "7", "[[code]]": "482915", "{{otp_code}}": "318204", "[[invite_url]]": URL,
            "[[card_image_url]]": "hero-colin.png", HERO_PLAIN: "hero-plain.png", MARK: "mark.png",
            "[[commander]]": "Ghalta, Primal Hunger"}
    named = {"[[sender]]": "Colin", "[[sender_or_who]]": "Colin"}
    pv = os.path.join(OUT, "_preview"); os.makedirs(pv, exist_ok=True)
    def fill(h, extra):
        for a, b in {**extra, **base}.items(): h = h.replace(a, b)
        return h
    for k, e in EMAILS.items():
        open(os.path.join(pv, f"{k}.html"), "w").write(fill(e["html"], named))
    anon = EMAILS["invite-plain"]["html"].replace(
        "You&#8217;re getting this because [[sender]] invited this address to The&nbsp;99.",
        "You&#8217;re getting this because someone on The&nbsp;99 invited this address.")
    open(os.path.join(pv, "invite-anon.html"), "w").write(fill(anon, {"[[sender]]": "A friend", "[[sender_or_who]]": "who sent it"}))
    for k in ["clerk-sign-in-code", "clerk-reset-password-code"]:
        h = EMAILS[k]["html"].replace("{{otp_code}}", '<span style="outline:1.5px dashed #C9A24B;outline-offset:4px;border-radius:3px;letter-spacing:0;font-size:24px">{{otp_code}}</span>')
        h = h.replace("{{otp_code}}", "\x00").replace("\x00", "{{otp_code}}")
        for a, b in {MARK: "mark.png"}.items(): h = h.replace(a, b)
        open(os.path.join(pv, f"{k}-template.html"), "w").write(h)
