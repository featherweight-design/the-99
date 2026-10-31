"""Errata: the morning expiry replaces 24 hours in the shipped handoff."""
import lib as L
S = L.mh()
CSS = """<style>
.zt{border-collapse:collapse;width:1500px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.zt th{text-align:left;font:500 10.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);padding:10px 14px;border-bottom:1px solid var(--border-strong)}
.zt td{padding:14px;border-bottom:1px solid var(--border);vertical-align:top}
.zt td:first-child{width:330px;font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.zt del{color:#C6533F;text-decoration-color:rgba(198,83,63,.6)}
.zt ins{color:var(--fg);text-decoration:none;background:color-mix(in srgb,var(--accent) 12%,transparent);border-radius:3px;padding:0 2px}
</style>"""
OLD = 'Tables last the night: Thursday night’s closed 24 hours after Colin set it. Games logged from it stay on each deck’s Games tab.'
NEW = 'Thursday night’s table closed the morning after Colin set it. Games logged from it stay on each deck’s Games tab.'
ROWS = [
    ('README.md · line 150 (decision 7, Expired)', f'<del>{OLD}</del><br><ins>{NEW}</ins>'),
    ('rule-zero · copy strings.ts · line 131 (expired.body)',
     '<del>`Tables last the night: ${pod}’s closed 24 hours after ${setter} set it. Games logged from it stay on each deck’s Games tab.`</del><br>'
     '<ins>`${pod}’s table closed the morning after ${setter} set it. Games logged from it stay on each deck’s Games tab.`</ins>'),
    ('R1 - Log-Phone.dc.html · line 573 (L4)', f'<del>{OLD}</del><br><ins>{NEW}</ins>'),
    ('R2 - Log-Desktop.dc.html · line 573 (H3)', f'<del>{OLD}</del><br><ins>{NEW}</ins>'),
    ('Also found · README.md · line 9 (lock 11)', '<del>for its 24 hours</del> → <ins>until it closes</ins>'),
    ('Also found · The 99 - Rule Zero (R1).dc.html · the calls', '<del>It closes about 24 hours after it’s set; logged games stay.</del><br><ins>It closes the morning after it’s set, or when its host closes it; logged games stay.</ins>'),
]


def build():
    body = L.head('Errata · the handoff’s 24 hours',
                  'A table closes the morning after, not 24 hours after',
                  'Lane a6 changes the expiry: a table closes at the first 6:00 am in the host’s time zone that is at least 4 hours after setup. '
                  'The shipped closed body changes with it. The brief names four places in <code>design/design_handoff_the99_rule_zero/</code>; two more say 24 hours and are corrected with them. The redrawn closed page is the Table board’s C5.')
    rows = ''.join(f'<tr><td>{a}</td><td>{b}</td></tr>' for a, b in ROWS)
    body += f'<table class="zt"><tr><th>Where</th><th>Change</th></tr>{rows}</table>'
    body += L.rule('Notes', [
        'The shipped string is <code>ruleZeroCopy.expired.body</code> in <code>src/lib/copy/rule-zero.ts</code>, which already dropped “Tables last the night:” at copy review; the new body is <i>{pod}’s table closed the morning after {setter} set it. Games logged from it stay on each deck’s Games tab.</i> (the brief’s words).',
        'The old boards’ fixture times (<i>open until 9:40 pm tomorrow</i>, setup at 9:40 pm) stay as drawn: only the rule changed, and these boards show the new closing time (<i>open until 6:00 am tomorrow</i>).',
        'Worked times (lane a6’s rule): set at 9:40 pm, closes 6:00 am. Set at 3:00 am, 6:00 am is under 4 hours away, so it closes 6:00 am the next day. Set at 1:30 am closes 6:00 am that morning (4½ hours).',
        'With these edits merged into the shipped handoff by the handoff PR, the revisions folder carries a copy of this table.'], ordered=False)
    return L.doc('Rule 0 revisions · Errata', L.helmet(S) + CSS, body, 1640)
