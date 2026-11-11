# Design Property Table — Sign-in (dark)

Sources (read only these):
- `design/design_handoff_the99_small_items_11/Sign-In-Invite-Only.dc.html`: board A2, frames P1–P8 and G1 (line 1558); shared styles lines 12–1499 (base sheet, `/* si7 */` block at ~1430) and the A2 `<style>` blocks at 1500–1557.
- `design/design_handoff_the99_small_items_11/Sign-In-Methods.dc.html`: board A1, frames K5, N1, N2 (line 1551); same shared sheet (the `.j*` / `.s7*` / `.cc` / `.ph` / `.dk` rules are byte-identical between the two files).
- `design/design_handoff_the99_small_items_11/README.md` §4 Addendum A1 and §4 Addendum A2.

Conventions:
- Tokens are the dark (default) `.board` set: `--bg:#14110E`, `--surface-sunken:#18140F`, `--surface-inset:#1B1712`, `--border:#2B241B`, `--border-strong:#3A3229`, `--border-dashed:#494037`, `--fg:#EDE6D8`, `--fg-body:#C0B8A6`, `--fg-muted:#A59C89`, `--fg-faint:#948B78`, `--fg-locked:#6E6654`, `--accent:#CF8745`, `--accent-text:#CF8745`, `--danger:#C6533F`.
- Font families appear in the source as literal names, not CSS variables: `'Cinzel', serif` (display), `'IBM Plex Sans', sans-serif` (inherited from `.board`), `'IBM Plex Mono', monospace`. Only the theme boards (section T, `.th9 .jcol h1`) switch the title to `var(--face), serif`.
- Mobile = the 390 frames (`.ph`). Desktop = P7 (P1 at 1300) and P8 (P4 at 1300). The P8 caption says "P2, P3, P5 and P6 follow it". States with no desktop frame say "follows P8 column".
- `.dk` changes only `.jn`'s background and top padding. Every other element value is identical on desktop.
- **Annotation only, never shipped:** `.new9` (1.5px dashed `--accent` outline; the later rule wins: offset 3px, radius 6px) marks what A2 changed, and `.draft8` (the blue "DRAFT" chip) marks draft copy. Neither is a property to build.
- **Frame chrome, not page:** `.ph` (390 wide, radius 34px, 1px `--border-strong` border, min-height 844px) and `.dk` (1300 wide, radius 12px, 1px `--border-strong` border, min-height 780px) are the device bezels. Neither frame draws an app header (`.mhd`) or a rail. The sign-in page shows no app chrome.
- Hover, focus and transitions: **none are specified anywhere in the source** for any element on this surface (no `:hover`, `:focus`, `:focus-visible` or `transition` rule touches `.j*`, `.gbtn`, `.or9`, `.s7*` or `.cc`). Each element lists that explicitly.

---

## Component: Page shell

### Viewport container (`.ph .pb` / `.dk .main`)
| Property | Mobile | Desktop |
|---|---|---|
| width | 390px (frame) | 1300px (frame) |
| min-height | 844px (frame) | 780px (frame) |
| background | var(--bg) | var(--bg) |
| display | flex | flex (`.main`) |
| flex-direction | column | column |
| flex | 1 1 auto; min-height:0 (`.pb`) | 1; min-width:0 (`.main`) |
| overflow | hidden | hidden (frame) |
| color | var(--fg) | var(--fg) (inherited) |
| font-family | 'IBM Plex Sans', sans-serif (inherited) | same |
| app header / rail | — | — |

### Stage (`.jn`)
| Property | Mobile | Desktop |
|---|---|---|
| flex | 1 | 1 |
| display | flex | flex |
| flex-direction | column | column |
| align-items | center | center |
| text-align | center | center |
| padding-top | 44px | 72px |
| padding-right | 24px | 24px |
| padding-bottom | 24px | 24px |
| padding-left | 24px | 24px |
| background | `radial-gradient(600px 360px at 50% 18%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 70%), var(--bg)` | `radial-gradient(1000px 520px at 50% 8%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 70%), var(--bg)` |
| children order | card back (`.cc`), column (`.jcol`), optional foot (`.jquiet`) | same |

### Column (`.jcol`)
| Property | Mobile | Desktop |
|---|---|---|
| width | 100% (resolves to 342px: 390 − 2×24) | 100% |
| max-width | 380px | 380px |
| display | flex | flex |
| flex-direction | column | column |
| align-items | center | center |
| layout note | single centered column | single centered column (P7 caption: "card left, one column"; markup draws the card centered above the column, same as mobile) |

---

## Component: Card back (`.cc` > `.bk`)

### Card box (`.cc`)
| Property | Mobile | Desktop |
|---|---|---|
| width | 150px | 150px |
| height | 210px | 210px |
| flex | none | none |
| position | relative | relative |
| transform | — (no `.tilt` on sign-in frames) | — |

### Card back face (`.cc .bk`)
| Property | Mobile | Desktop |
|---|---|---|
| position | absolute; inset:0 | same |
| border-radius | 9px | 9px |
| background | var(--surface-inset) | var(--surface-inset) |
| padding | 6px (all sides) | 6px |
| box-shadow | `0 20px 44px rgba(0,0,0,.6), inset 0 0 0 1px var(--border-strong)` | same |

### Card back inner panel (`.cc .bk div`)
| Property | Mobile | Desktop |
|---|---|---|
| height | 100% | 100% |
| border-radius | 6px | 6px |
| border | 1px solid var(--border-dashed) | same |
| display | flex | flex |
| flex-direction | column | column |
| align-items | center | center |
| justify-content | center | center |
| gap | 6px | 6px |
| background | `radial-gradient(120px 130px at 50% 46%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 72%), repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 3px, transparent 3px 6px), var(--surface-sunken)` | same |

### Card back ornament (`.cw`, slot: three-diamond mark)
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 8px | 8px |
| letter-spacing | 3px | 3px |
| color | var(--accent-text) | var(--accent-text) |
| font-family | 'IBM Plex Sans' (inherited) | same |

### Card back numeral (`b`, slot: "99" wordmark)
| Property | Mobile | Desktop |
|---|---|---|
| font | 700 34px/1 'Cinzel', serif | same |
| color | var(--fg) | var(--fg) |

### Card back caption (`small`, slot: card caption)
| Property | Mobile | Desktop |
|---|---|---|
| font | 7.5px 'IBM Plex Mono' | same |
| letter-spacing | .35em | .35em |
| text-transform | uppercase | uppercase |
| color | var(--accent-text) | var(--accent-text) |
| content | same caption slot on every state P1–P8, G1, K5, N1, N2 | same |

Hover / focus / transition: — (none specified).

---

## Component: Heading block

### Title (`.jcol h1`, slot: title)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 28px 0 0 (top 28, right 0, bottom 0, left 0) | same |
| font-weight | 700 | 700 |
| font-size | 22px | 22px (no `.dk` override) |
| line-height | 1.25 | 1.25 |
| font-family | 'Cinzel', serif | same |
| color | var(--fg) | var(--fg) |
| text-align | center (inherited from `.jn`) | center |

### Body (`.jcol .bd`, slot: body line)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 8px | 8px |
| font-size | 14px | 14px |
| line-height | 1.55 | 1.55 |
| color | var(--fg-body) | var(--fg-body) |
| text-align | center (inherited) | center |
| margin (other sides) | browser default `p` (not reset in source; bottom default 1em) | same |

### Body email emphasis (`.bd em`, slot: the typed email)
| Property | Mobile | Desktop |
|---|---|---|
| font-style | normal | normal |
| font-weight | 500 | 500 |
| color | var(--fg) | var(--fg) |

---

## Component: Form (`.jform`)

### Form container
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 22px | 22px |
| width | 100% | 100% |
| display | flex | flex |
| flex-direction | column | column |
| align-items | — (default stretch: every child fills the column width) | same |
| text-align | left | left |

### Field label (`.jform label`, slot: field label)
| Property | Mobile | Desktop |
|---|---|---|
| font | 600 13px 'IBM Plex Sans' | same |
| color | var(--fg) | var(--fg) |
| margin-bottom | 6px | 6px |
| margin-top | 0 when first in form (P2, P3, K5, N1); 16px inline after the `or` divider (P1, G1, P7); 14px when following a field, hint or error (`.jfld+label`, `.s7hint+label`, `.s7err+label`) | same |

### Text field (`.jfld`)
| Property | Mobile | Desktop |
|---|---|---|
| height | 48px | 48px |
| border-radius | 8px | 8px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border | 1px solid var(--border-strong) | same |
| padding | 0 12px (top 0, right 12, bottom 0, left 12) | same |
| display | flex | flex |
| align-items | center | center |
| font-size | 16px | 16px |
| color | var(--fg-locked) (placeholder / empty) | same |
| width | 100% of column (stretch) | same |

### Text field, filled/active (`.jfld.on`)
| Property | Mobile | Desktop |
|---|---|---|
| border-color | var(--accent) | var(--accent) |
| color | var(--fg) | var(--fg) |
| used on | P1, P2, K5, P7 | P7 |

### Text field, refused (`.jfld.s7bad`)
| Property | Mobile | Desktop |
|---|---|---|
| border-color | var(--danger) | var(--danger) |
| color | var(--fg) | var(--fg) |
| used on | P3, N1, K5 refusals (per Q2–Q4) | follows P8 column |

### Text field, empty (`.jfld` without `.on`)
| Property | Mobile | Desktop |
|---|---|---|
| border-color | var(--border-strong) | — (no desktop frame; follows P8 column) |
| color | var(--fg-locked) | follows P8 column |
| content | placeholder slot (G1 email field shows the placeholder) | follows P8 column |

Hover / focus / transition (all field variants): — (none specified).

### Hint (`.jform .s7hint`, slot: field hint)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 6px | 6px |
| font-size | 12.5px | 12.5px |
| line-height | 1.45 | 1.45 |
| color | var(--fg-muted) | var(--fg-muted) |
| text-align | left (inherited) | left |
| used on | K5 (length rule under the new password) | follows P8 column |
| conditional | replaced by `.s7err` in the same slot when the field is refused (Q2 caption: "the line replaces the hint in the `s7err` slot") | same |

### Error line (`.s7err`, slot: error line, `role="alert"`)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 8px | 8px |
| font-size | 13px | 13px |
| line-height | 1.45 | 1.45 |
| color | var(--danger) | var(--danger) |
| text-align | left | left |
| margin (other sides) | browser default `p` (not reset in source) | same |
| role | alert | alert |
| position | directly after the refused field (P3, N1, K5 refusals) or the code row (P5); in G1 directly after the Google press (see `.gerr`) | same |

### Primary press (`.jbtn`, slot: press label)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 14px | 14px |
| height | 48px | 48px |
| width | 100% | 100% |
| border-radius | 8px | 8px |
| background | var(--accent) | var(--accent) |
| color | var(--bg) | var(--bg) |
| font | 600 15px 'IBM Plex Sans' | same |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| border | — | — |

### Primary press, dimmed (inline `opacity:.6`)
| Property | Mobile | Desktop |
|---|---|---|
| opacity | .6 | .6 (P8) |
| condition | code row incomplete (P4, P6, N2: four of six digits; P8 desktop); email field empty (G1) | P8; others follow P8 column |
| condition (full opacity) | P5 shows all six digits with Confirm at full opacity | follows P8 column |

Hover / focus / transition: — (none specified).

### Link row (`.jlinks`)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| justify-content | center | center |
| gap | 4px | 4px |
| margin-top | 6px | 6px |
| children | P2/P3: two links (forgot-password slot, email-a-code slot). P4/P5/N2/P8: two (resend slot, different-email slot). P6: two (resend slot, back-to-sign-in slot). N1: one (email-a-code slot only). K5, P1, G1: no link row. | same |

### Link (`.jlinks span`)
| Property | Mobile | Desktop |
|---|---|---|
| min-height | 44px | 44px |
| display | flex | flex |
| align-items | center | center |
| padding | 0 8px (top 0, right 8, bottom 0, left 8) | same |
| font | 500 13.5px 'IBM Plex Sans' | same |
| color | var(--accent-text) | var(--accent-text) |
| text-decoration | — (none set) | — |

### Link, cooling resend (`.jlinks span.cool`, slot: resend with countdown `m:ss`)
| Property | Mobile | Desktop |
|---|---|---|
| color | var(--fg-locked) | var(--fg-locked) (P8) |
| condition | resend cooldown running (P4, P6, N2, P8) | P8 |
| after cooldown | plain `.jlinks span` (accent-text), resend slot without countdown (P5) | follows P8 column |

Hover / focus / transition (links): — (none specified).

---

## Component: Six-digit code (`.jcode`)

### Code row
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| justify-content | center | center |
| gap | 8px | 8px |
| margin-top | — (first child of `.jform`, so 22px from the form's margin) | same |
| box count | 6 | 6 |

### Code box, filled (`.jcode span`)
| Property | Mobile | Desktop |
|---|---|---|
| width | 44px | 44px |
| height | 54px | 54px |
| border-radius | 8px | 8px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border | 1px solid var(--accent) | same |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| font | 600 22px 'IBM Plex Mono' | same |
| color | var(--fg) | var(--fg) |

### Code box, empty (`.jcode span.e`, shows a middle-dot placeholder)
| Property | Mobile | Desktop |
|---|---|---|
| border-color | var(--border-strong) | var(--border-strong) |
| color | var(--fg-locked) | var(--fg-locked) |

### Code row, refused (`.jcode.s7bad span`)
| Property | Mobile | Desktop |
|---|---|---|
| border-color | var(--danger) (every box) | follows P8 column |
| used on | P5 | follows P8 column |

Hover / focus / transition: — (none specified).

---

## Component: Google press (`.gbtn`)

### Press
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 22px (stacks on `.jform`'s own 22px margin-top, as first child) | same |
| height | 48px | 48px |
| width | 100% | 100% |
| border-radius | 8px | 8px |
| background | transparent | transparent |
| border | 1px solid var(--border-strong) | same |
| color | var(--fg) | var(--fg) |
| font | 500 15px 'IBM Plex Sans' | same |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| gap | 10px (mark to label) | 10px |
| children | Google mark SVG, then press label slot | same |
| used on | P1, P7, G1 | P7 |

### Press, busy (`.gbtn.busy`)
| Property | Mobile | Desktop |
|---|---|---|
| opacity | .6 | .6 |
| label | the busy label slot (A1 M2: on the way back from Google; no message) | follows P8 column |

### Google mark (SVG)
| Property | Mobile | Desktop |
|---|---|---|
| width | 18 | 18 |
| height | 18 | 18 |
| viewBox | 0 0 48 48 | same |
| aria-hidden | true | true |
| stroke / stroke-width | — | — |
| path 1 fill | #EA4335 | same |
| path 1 d | `M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z` | same |
| path 2 fill | #4285F4 | same |
| path 2 d | `M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z` | same |
| path 3 fill | #FBBC05 | same |
| path 3 d | `M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z` | same |
| path 4 fill | #34A853 | same |
| path 4 d | `M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z` | same |

### Google error line (`.s7err.gerr`, G1 only, slot: Google refusal line)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 8px | follows P8 column |
| font-size | 13px | follows P8 column |
| line-height | 1.45 | follows P8 column |
| color | var(--danger) | follows P8 column |
| text-align | left | follows P8 column |
| role | alert | alert |
| position | directly under the Google press, before the `or` divider | follows P8 column |
| Google press border | unchanged (no danger edge on `.gbtn`) | follows P8 column |

Hover / focus / transition: — (none specified).

---

## Component: "or" divider (`.or9`)

### Divider
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 12px | 12px |
| margin | 18px 0 0 (top 18, right 0, bottom 0, left 0) | same |
| font | 11px 'IBM Plex Mono', monospace | same |
| color | var(--fg-faint) | var(--fg-faint) |
| width | 100% | 100% |
| content | divider word slot | same |

### Rules (`.or9::before`, `.or9::after`)
| Property | Mobile | Desktop |
|---|---|---|
| content | "" | "" |
| flex | 1 | 1 |
| height | 1px | 1px |
| background | var(--border) | var(--border) |

---

## Component: Foot pointer (`.jquiet.n9`)

### Foot line (slot: invite-only pointer sentence + link)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 18px (`.jquiet.n9` override of base 22px) | 18px |
| font | 11px/1.55 'IBM Plex Mono', monospace | same |
| color | var(--fg-faint) | var(--fg-faint) |
| text-align | center (inherited from `.jn`) | center |
| placement | sibling after `.jcol`, inside `.jn` (outside the column) | same |
| conditional | shown on P1, P4, P5, G1 (and P7, P8). Absent on P2, P3, P6, K5, N1, N2. | P7, P8 |

### Foot link (`.jquiet a`, slot: how-to-join link → `/sign-up` R1)
| Property | Mobile | Desktop |
|---|---|---|
| color | var(--accent-text) | var(--accent-text) |
| text-decoration | — (none set; browser default for `a`) | same |

Hover / focus / transition: — (none specified).

---

## Per-state element order (structure)

| State | `.jform` children in order | Foot |
|---|---|---|
| P1 / P7 | gbtn · or9 · label (mt 16) · jfld.on · jbtn | yes |
| G1 | gbtn · s7err.gerr · or9 · label (mt 16) · jfld (empty, placeholder) · jbtn (opacity .6) | yes |
| P2 | label · jfld.on · jbtn · jlinks (2) | no |
| P3 | label · jfld.s7bad · s7err · jbtn · jlinks (2) | no |
| P4 / P8 | jcode (4 filled, 2 `.e`) · jbtn (opacity .6) · jlinks (cool resend, different email) | yes |
| P5 | jcode.s7bad (6 filled) · s7err · jbtn · jlinks (resend active, different email) | yes |
| P6 | jcode (4 filled, 2 `.e`) · jbtn (opacity .6) · jlinks (cool resend, back to sign in) | no |
| K5 | label · jfld.on · s7hint · jbtn | no |
| K5 refused | label · jfld.s7bad · s7err (replaces s7hint) · jbtn | no |
| N1 | label · jfld.s7bad · s7err · jbtn (reset-password label slot) · jlinks (1: email a code) | no |
| N2 | jcode (4 filled, 2 `.e`) · jbtn (opacity .6) · jlinks (cool resend, different email) | no |

---

## State Coverage

| State | Trigger (user action / Clerk result) | Key elements rendered | Desktop |
|---|---|---|---|
| P1 | Arriving at sign-in; also "different email" from P4/N2 and "back to sign in" from P6 | card back · title · body · Google press · or · email label + filled field · Continue press · foot pointer | P7 |
| P1 Google busy | Google press, returning from Google to a matching account (A1 M2) | Google press in `.busy` (opacity .6) with busy label slot; no message; then signed in | follows P8 column |
| P2 | P1 Continue with **any** email (no Clerk lookup sorts emails; A2 ruling 2) | title · body with email emphasis · password label + filled field · Sign-in press · links: forgot password, email me a code | follows P8 column |
| P3 | P2 Sign in → Clerk `form_password_or_identifier_incorrect` (wrong password, unknown email, or code-only account; one neutral line) | P2 layout · field `.s7bad` · error line (`role=alert`) between field and press · both links stay | follows P8 column |
| P4 | P2 "Email me a code instead" → code sent if the email has an account, nothing sent otherwise; same screen either way | title · conditional-wording body ("if {email} has an account") · 6-box code row (incomplete) · dimmed Confirm · cooling resend · different email link · foot pointer | P8 |
| P5 | P4 Confirm with a wrong code (shipped `codeWrong`; also any code for an email with no account). A wrong or expired code on P6 reads the same (A1 K4). | code row `.s7bad` (all six boxes danger) · error line · Confirm full opacity · resend active (no countdown) · different email · foot pointer | follows P8 column |
| P6 | P2 "Forgot password?" → reset code sent if the account exists | reset title · conditional-wording body · 6-box code row · dimmed Confirm · cooling resend · back-to-sign-in link · no foot | follows P8 column |
| K5 | P6 correct reset code → choose new password | title · body with email · new-password label + filled field · length hint · Save-and-sign-in press (sets password and signs in, landing where sign-in would) | follows P8 column |
| K5 refusal: too short | Save pressed with < 8 characters; checked client-side on the press, before Clerk (A2 Q2) | field `.s7bad` · error line replaces the hint in the `s7err` slot · typed password kept | follows P8 column |
| K5 refusal: too weak | Clerk `form_password_not_strong_enough` (A2 Q3) | field `.s7bad` · error line in hint slot · typed password kept | follows P8 column |
| K5 refusal: breached | Clerk `form_password_pwned` (A2 Q4) | field `.s7bad` · error line in hint slot · typed password kept | follows P8 column |
| N1 | P2 Sign in → Clerk refuses the password as breached, compromised or untrusted, or `needs_new_password` (not P3) | P2 layout · field `.s7bad` · error line · press relabelled to reset-password slot (sends reset code, lands on P6/K4) · one link: email me a code (forgot-password link absent) | follows P8 column |
| N2 | P2 correct password from a new device under Client Trust, or an MFA email code (Clerk second factor `email_code`) | S2 exactly: title · body ("we sent a code to {email}", not the conditional wording) · 6-box code row · dimmed Confirm · cooling resend · different email · no foot. Confirm signs in. | follows P8 column |
| G1 | P1 Google press → back from Google with an account The 99 can't sign in (none, or sign-up closed); Clerk refuses the sign-up it would start, no account made. Replaces M1 and N3. | P1 layout · Google refusal line (`.s7err.gerr`, `role=alert`) directly under the Google press · email field empty (placeholder) · Continue dimmed (opacity .6) · foot pointer | follows P8 column |

### Copy-slot discrepancies noted (structure only, for the copy owner)
- N1 error line: the A1 frame and A1 README carry one wording; the A2 README §Ruling 3 accepts the audit's tightened wording for the same slot. The A2 README is the later ruling.
- K5 refusal lines: K5 draws no refused frame of its own; A2 README Q2 says "K5's new password takes the same three lines", so the refused structure is taken from Q2/Q4 (field `.s7bad`, `.s7err` replacing `.s7hint`).
