#!/usr/bin/env python3
"""Builds the branded-email reference templates (HTML + plain text) from one shell.

Placeholders: [[name]] is filled by our code (Resend sends); {{name}} is a Clerk variable (Clerk's editor fills it).
Run with an output dir; with --preview it also writes filled previews for rendering.
"""
import sys, os, html

OUT = sys.argv[1]
PREVIEW = "--preview" in sys.argv

# Table Candlelight, fixed for email (design_handoff_the99_brand).
C = dict(ground="#14110E", panel="#1E1A15", elevated="#2A241D", line="#3A3229",
         h="#EDE6D8", body="#C6B79A", muted="#A89B84", faint="#8E8269", accent="#C9A24B", on_accent="#14110E")
SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
SERIF = "Georgia,'Times New Roman',Times,serif"
MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono','Courier New',monospace"
ORIGIN = "https://the-99.dev"
MARK = f"{ORIGIN}/email/mark-96@2x.png"

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
    .col {{ width:100% !important; }}
    .pad {{ padding-left:24px !important; padding-right:24px !important; }}
    .gut {{ padding-left:12px !important; padding-right:12px !important; }}
    .h1 {{ font-size:24px !important; }}
  }}
</style>
<!--[if mso]><style>table,td,p,a,h1{{font-family:Arial,sans-serif !important;}}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:{C['ground']};" bgcolor="{C['ground']}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:{C['ground']};opacity:0;">{preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{C['ground']}" style="background:{C['ground']};">
<tr><td align="center" class="gut" style="padding:32px 24px 40px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="col" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td align="center" style="padding:0 0 20px;">
  <a href="{ORIGIN}" style="text-decoration:none;color:{C['h']};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
  <td style="padding:0 10px 0 0;" valign="middle"><img src="{MARK}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border:0;border-radius:8px;"></td>
  <td valign="middle" style="font:bold 18px/1 {SERIF};letter-spacing:.14em;color:{C['h']};white-space:nowrap;">THE&nbsp;99</td>
  </tr></table></a>
</td></tr>
<tr><td bgcolor="{C['panel']}" class="pad" style="background:{C['panel']};border:1px solid {C['line']};border-radius:12px;padding:40px 40px 32px;">
{inner}
</td></tr>
<tr><td align="center" class="pad" style="padding:24px 40px 0;font:13px/1.6 {SANS};color:{C['muted']};">
  {reason}<br>
  Replies to this address aren&#8217;t read.<br>
  <a href="{ORIGIN}" style="color:{C['muted']};text-decoration:underline;">The 99</a> &middot; the-99.dev
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
"""

def h1(t):
    return f'<h1 class="h1" style="margin:0 0 12px;font:bold 26px/1.25 {SERIF};color:{C["h"]};text-align:center;">{t}</h1>'

def p(t, mb=24, color=None, size=16):
    return f'<p style="margin:0 0 {mb}px;font:{size}px/1.6 {SANS};color:{color or C["body"]};text-align:center;">{t}</p>'

def rule():
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid {C["line"]};font-size:0;line-height:0;height:1px;padding:0 0 20px;">&nbsp;</td></tr></table>'

def fine(t):
    return f'<p style="margin:0;font:14px/1.55 {SANS};color:{C["muted"]};text-align:center;">{t}</p>'

def button(label, href):
    return f"""<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:0 auto 16px;">
<tr><td align="center" bgcolor="{C['accent']}" style="background:{C['accent']};border:1px solid {C['accent']};border-radius:8px;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{href}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" stroke="f" fillcolor="{C['accent']}"><center style="color:{C['on_accent']};font:bold 16px Arial,sans-serif;">{label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- --><a href="{href}" style="display:inline-block;padding:14px 40px;min-width:160px;font:bold 16px/20px {SANS};color:{C['on_accent']};text-decoration:none;border-radius:8px;">{label}</a><!--<![endif]-->
</td></tr></table>"""

def raw_link(href):
    return (f'<p style="margin:0 0 4px;font:13px/1.5 {SANS};color:{C["muted"]};text-align:center;">Or paste this link into your browser:</p>'
            f'<p style="margin:0 0 28px;font:12px/1.5 {MONO};color:{C["muted"]};text-align:center;word-break:break-all;">'
            f'<a href="{href}" style="color:{C["muted"]};text-decoration:underline;">{href}</a></p>')

def code_box(code, label="Your code"):
    return f"""<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
<tr><td align="center" bgcolor="{C['elevated']}" style="background:{C['elevated']};border:1px solid {C['line']};border-radius:10px;padding:14px 28px 18px;">
<p style="margin:0 0 6px;font:500 11px/1.4 {MONO};letter-spacing:.16em;text-transform:uppercase;color:{C['body']};">{label}</p>
<p style="margin:0;font:600 34px/1.2 {MONO};letter-spacing:.28em;color:{C['h']};padding-left:.28em;">{code}</p>
</td></tr></table>"""

def card(img, alt):
    return (f'<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;"><tr><td align="center">'
            f'<img src="{img}" width="180" height="240" alt="{alt}" style="display:block;width:180px;height:240px;border:0;font:italic 14px/1.5 {SANS};color:{C["muted"]};">'
            f'</td></tr></table>')

def ornament():
    return f'<p aria-hidden="true" style="margin:0 0 16px;font:12px/1 {SANS};letter-spacing:6px;color:{C["accent"]};text-align:center;">&#9670; &#9670; &#9670;</p>'

FOOT_TEXT = "Replies to this address aren't read.\nThe 99 · https://the-99.dev"

EMAILS = {}

# 1 Friend invite, with art. [[sender]] is HTML-escaped by our code (inviteMail's escapeHtml).
def invite(art: bool):
    inner = (card("[[card_image_url]]", "[[sender]]’s invitation card, with [[commander]] art") if art else ornament())
    inner += h1("[[sender]] invited you to The&nbsp;99")
    inner += p("The 99 reads the cards you own and builds Commander decks from them. You&#8217;ll join as [[sender]]&#8217;s friend, and your decks and your collection stay yours.", 28)
    inner += button("Join The 99", "[[invite_url]]")
    inner += raw_link("[[invite_url]]")
    inner += rule()
    inner += fine("The link works for [[days]] days. If you don&#8217;t know [[sender_or_who]], ignore this email.")
    return shell("[[sender]] invited you to The 99", "Join as [[sender]]’s friend. The link works for [[days]] days.", inner,
                 "You&#8217;re getting this because [[sender]] invited this address.")

EMAILS["invite-art"] = dict(
    subject="[[sender]] invited you to The 99",
    html=invite(True),
    text="""The 99 reads the cards you own and builds Commander decks from them. You'll join as [[sender]]'s friend, and your decks and your collection stay yours.

Join The 99:
[[invite_url]]

The link works for [[days]] days. If you don't know [[sender_or_who]], ignore this email.

--
You're getting this because [[sender]] invited this address.
""" + FOOT_TEXT + "\n")
EMAILS["invite-plain"] = dict(subject=EMAILS["invite-art"]["subject"], html=invite(False), text=EMAILS["invite-art"]["text"])

def code_mail(kind):
    inner = h1("Your code for The&nbsp;99")
    inner += p("Type this code on the page where you asked for it.", 20)
    inner += code_box("[[code]]")
    inner += rule()
    inner += fine("It works for 10 minutes. If you didn&#8217;t ask for it, ignore this email.")
    return shell("Your code for The 99", "Type it on the page where you asked for it. It works for 10 minutes.", inner,
                 "You&#8217;re getting this because someone asked for a code for this address on The&nbsp;99.")

CODE_TEXT = """Type this code on the page where you asked for it:

[[code]]

It works for 10 minutes. If you didn't ask for it, ignore this email.

--
You're getting this because someone asked for a code for this address on The 99.
""" + FOOT_TEXT + "\n"
EMAILS["code-newcomer"] = dict(subject="Your code for The 99: [[code]]", html=code_mail("newcomer"), text=CODE_TEXT)
EMAILS["code-flyer"] = dict(subject="Your code for The 99: [[code]]", html=code_mail("flyer"), text=CODE_TEXT)

# Clerk. {{otp_code}} is Clerk's (not in Clerk's documented variable table: confirm with the editor's Variable insert).
def clerk_sign_in():
    inner = h1("Your sign-in code")
    inner += p("Type this code on the sign-in page.", 20)
    inner += code_box("{{otp_code}}")
    inner += rule()
    inner += fine("It works for 10 minutes. If you didn&#8217;t try to sign in, ignore this email. Nobody can sign in without this code.")
    return shell("Your sign-in code for The 99", "Type it on the sign-in page. It works for 10 minutes.", inner,
                 "You&#8217;re getting this because someone tried to sign in to The&nbsp;99 with this address.")

def clerk_reset():
    inner = h1("Reset your password")
    inner += p("Type this code on the sign-in page, then choose a new password.", 20)
    inner += code_box("{{otp_code}}", "Reset code")
    inner += rule()
    inner += fine("It works for 10 minutes. If you didn&#8217;t ask to reset your password, ignore this email. Your password stays as it is.")
    return shell("Reset your password for The 99", "Type it on the sign-in page. It works for 10 minutes.", inner,
                 "You&#8217;re getting this because someone asked to reset the password for this address on The&nbsp;99.")

EMAILS["clerk-sign-in-code"] = dict(subject="Your sign-in code for The 99: {{otp_code}}", html=clerk_sign_in(), text="""Type this code on the sign-in page:

{{otp_code}}

It works for 10 minutes. If you didn't try to sign in, ignore this email. Nobody can sign in without this code.

--
You're getting this because someone tried to sign in to The 99 with this address.
""" + FOOT_TEXT + "\n")
EMAILS["clerk-reset-password-code"] = dict(subject="Your password reset code for The 99: {{otp_code}}", html=clerk_reset(), text="""Type this code on the sign-in page, then choose a new password:

{{otp_code}}

It works for 10 minutes. If you didn't ask to reset your password, ignore this email. Your password stays as it is.

--
You're getting this because someone asked to reset the password for this address on The 99.
""" + FOOT_TEXT + "\n")

os.makedirs(OUT, exist_ok=True)
for k, e in EMAILS.items():
    if k == "code-flyer":
        continue  # same template as code-newcomer; README says so
    name = "code" if k == "code-newcomer" else k
    with open(os.path.join(OUT, f"{name}.html"), "w") as f: f.write(e["html"])
    with open(os.path.join(OUT, f"{name}.txt"), "w") as f: f.write(f"Subject: {e['subject']}\n\n" + e["text"])

if PREVIEW:
    FILL = {"[[sender]]": "Colin", "[[sender_or_who]]": "Colin", "[[commander]]": "Ghalta, Primal Hunger",
            "[[days]]": "7", "[[code]]": "482915", "{{otp_code}}": "318204",
            "[[invite_url]]": "https://the-99.dev/sign-up?__clerk_ticket=eyJhbGciOiJSUzI1NiJ9.eyJpaWQiOiJpbnZfMnBRa1h0ZDhWcm",
            "[[card_image_url]]": "card.png", MARK: "mark.png"}
    pv = os.path.join(OUT, "_preview"); os.makedirs(pv, exist_ok=True)
    for k, e in EMAILS.items():
        h = e["html"]
        for a, b in FILL.items(): h = h.replace(a, b)
        open(os.path.join(pv, f"{k}.html"), "w").write(h)
