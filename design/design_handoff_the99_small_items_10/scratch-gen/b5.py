"""Item 5 · Delete a group with the flyer trial off: Invites has no Flyer codes section, so the refusal's link leads nowhere.
Frames lifted from small_items_9/Groups-Delete (D4, D6, D6c) with the shipped strings."""
import lib10 as L
S = L.load('design_handoff_the99_small_items_9/Groups-Delete.dc.html')
SC = 'gd10'
HINT = 'Only an empty group can go: no members, no live flyer codes.'


def scr(lab):
    return L.screen9(L.frame9(S, lab)).replace('new9', 'old9')


def del_block(s):
    i = s.find('<div class="del9'); return i, L.block(s, i)


def set_del(s, inner, refused):
    i, old = del_block(s)
    cls = 'del9 new9' + (' no' if refused else '')
    return s.replace(old, f'<div class="{cls}">{inner}</div>')


def off_note(s, right=10):
    """A board note on the frame: the flyer trial is off (FLYER_TRIAL_ENABLED)."""
    return (f"<div style=\"position:absolute;top:10px;right:{right}px;z-index:80;font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;"
            "color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:2px 6px\">FLYER TRIAL OFF</div>")


def mark(s):
    for cls in ('<div class="ph"', '<div class="dk"'):
        i = s.find(cls)
        if i >= 0:
            j = s.find('>', i) + 1
            return s[:j] + off_note(s, 120 if 'ph' in cls else 10) + s[j:]
    return s


def build():
    code_only = scr('<b>D6c</b>')
    a1 = set_del(code_only, f'<span class="dl">Delete this group</span><span class="dh">{HINT}</span>', False)
    both = scr('<b>D6</b>')
    a2 = set_del(both, '<span class="dl">Delete this group</span><span class="dw">It still has 2 members. Unselect them above and save, then delete it.</span>', True)
    conf = scr('<b>D4</b>')
    conf = conf.replace('1337-testers', 'mox-boston').replace('early testers, before the flyer', 'flyer sign-ups from Mox Boston')
    conf = L.sub1(conf, 'Its two feature-flag settings are removed with it', 'It has no feature-flag settings')
    conf = L.sub1(conf, '<div><dt>Flyer codes</dt><dd>None.</dd></div>',
                  '<div class="new9"><dt>Flyer codes</dt><dd>MOXB7K, ended with the flyer trial. It loses its group, so if the trial comes back on, people who join with it land in no group.</dd></div>')
    conf = L.sub1(conf, '<dd>Overview v2 on and Suggested changes v2 on go with it. They reach nobody now.</dd>', '<dd>None.</dd>')
    conf = conf.replace('<span class="dh">Only an empty group can go: no members, no flyer codes.</span>', f'<span class="dh">{HINT}</span>')
    b_alt = set_del(code_only, '<span class="dl">Delete this group</span><span class="dw">It has the flyer code MOXB7K. The flyer trial is off, so Invites can’t revoke it: '
                    'turn the trial on to revoke it, then delete the group.</span>', True)
    b = L.head('Small items 10 · R1 · account 2 · 2026-11-02 · item 5 · admin, delete a group',
               'Delete a group when the flyer trial is off',
               'With <code>FLYER_TRIAL_ENABLED</code> off, Invites has no Flyer codes section, so the shipped refusal (<i>It has the live flyer code MOXB7K. Revoke it on Invites first.</i> + '
               '<i>Flyer codes ›</i>) sends the admin to a section that isn’t there, and the group can never go. Drawn over Small items 9’s Groups-Delete frames '
               '(<code>group-page.tsx</code>), with the shipped strings. The blue tag is a board note, not UI.')
    b += L.sec('Recommended: with the trial off, no code is live, so none blocks')
    b += L.frames(
        L.fr('<span class="rec">rec</span><b>F1</b> · 390 · mox-boston: flyer code only, trial off', mark(a1),
             'Off, every flyer code reads as ended and takes no sign-ups (<code>flyer/flag.ts</code>), so it is not live and the approved rule (only <b>live</b> codes block) lets the group go. '
             'The press is live with the shipped hint. No dead link.', SC),
    )
    b += L.frames(
        L.fr('<span class="rec">rec</span><b>F2</b> · 1300 · members and a code, trial off', mark(a2),
             'Members still block; the code no longer does, so the line is the shipped members-only refusal and <i>Flyer codes ›</i> goes.', SC, 1300))
    b += L.frames(
        L.fr('<span class="rec">rec</span><b>F3</b> · 1300 · the confirm, trial off', mark(conf),
             'The confirm’s Flyer codes fact names the ended code and what deleting does to it: its group goes blank (<code>set null</code>, as for a revoked code). Admin-only copy.', SC, 1300))
    b += L.sec('The alternative, if a code should block even with the trial off')
    b += L.frames(
        L.fr('<span class="now">alt</span><b>F4</b> · 390 · refused, no link', mark(b_alt),
             'Keeps the refusal and drops the link, naming the only way out. It forces switching flyer sign-ups back on to revoke one code, so it is not recommended.', SC))
    b += L.rule('The call', [
        '<b>Recommended:</b> a code blocks only while the flyer trial is on and the code is not revoked. In <code>deleteState</code>, <i>live</i> becomes <code>!revoked &amp;&amp; flyerTrialEnabled</code>; with the trial off the refusal and its <i>Flyer codes ›</i> link never show.',
        '<b>The confirm</b> (trial off, the group holds a code) says what happens to it: <i>{CODE}, ended with the flyer trial. It loses its group, so if the trial comes back on, people who join with it land in no group.</i> Admin-only, out of <code>/copy-review</code>.',
        '<b>The server re-check</b> uses the same test, so a delete raced by the trial coming back on is refused as shipped (<i>{group} isn’t empty now. Nothing was deleted.</i>).',
        '<b>Alternative (F4):</b> keep the block and drop the link. Not recommended: it locks the admin in, the opposite of “give the player a choice”.'])
    return L.doc('Small items 10 · Delete a group, trial off', L.scope(L.helmet(S), SC), b, 1440)
