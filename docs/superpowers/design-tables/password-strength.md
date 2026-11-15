# StrengthPanel: design property table (R1c)
Source: addendum-password-strength/ (README, READINESS, Spec, scratch-gen/proposal/password-strength.tsx, strength.ts, frames). Phone (390) and desktop (1280) do not differ: the panel takes the field column's width at both (frames ps-q1-weak-all-p, ps-q1-q4-d).

## Properties
| # | Element | Property | Value | Source |
|---|---|---|---|---|
| 1 | Panel | Placement | Directly under the password Field, in the old hint's slot; replaces `newPasswordHint` on Q1 and K5 | README calls 1, 6; copy file |
| 2 | Meter row | margin-top | 8px (`mt-[8px]`) | tsx |
| 3 | Meter row | layout | flex, align-items center, gap 10px | tsx |
| 4 | Segment track | layout | flex, flex:1, gap 4px; aria-hidden | tsx |
| 5 | Segment | count | 3 | tsx, call 3 |
| 6 | Segment | size/shape | display block, height 4px, flex:1, radius 2px (landing demo segment, demo.tsx:73; reuse its class) | tsx, READINESS |
| 7 | Segment unlit | background | `var(--border-strong)` | tsx |
| 8 | Segment lit, Weak | count / bg | 1 / `var(--fg-muted)` | tsx INK, call 3 |
| 9 | Segment lit, Good | count / bg | 2 / `var(--accent)` | tsx |
| 10 | Segment lit, Strong | count / bg | 3 / `var(--accent)` | tsx |
| 11 | Segments, short (<8) or refusal | lit | 0 | tsx (`lit = refusal ? 0 : LIT`) |
| 12 | Word | width / align | 44px, text-align right (slot reserved even when empty) | tsx, ps-q1-q4-d |
| 13 | Word | type | 12.5px, weight 600, line-height 1 (`leading-none`), inherited family | tsx |
| 14 | Word | color Weak | `var(--fg-muted)` | tsx |
| 15 | Word | color Good / Strong | `var(--accent-text)` | tsx |
| 16 | Word | text | `strengthCopy.word.{weak,good,strong}`; empty when short or refusal; aria-hidden | tsx |
| 17 | Refusal line | element | `<p id={LINE_ID} role="alert" className={SIGN_ERR}>` (shipped), between meter and guides | tsx, call 6 |
| 18 | Refusal line | field edge | Field gets danger edge (shipped) | call 6, ps-q1-q4-d |
| 19 | Guides list | element | `<ul id="password-strength">` (STRENGTH_ID) | tsx |
| 20 | Guides list | box | margin 0, margin-top 8px, padding 0, list-style none | tsx |
| 21 | Guides list | layout | flex column, gap 6px | tsx |
| 22 | Guide row | layout | `<li>` flex, align-items center, gap 8px, text-align left | tsx |
| 23 | Guide row | type | 12.5px, line-height 1.45 | tsx |
| 24 | Guide row | color met | `var(--fg-body)` | tsx |
| 25 | Guide row | color unmet | `var(--fg-muted)` | tsx |
| 26 | Guide order | keys | length, mix, common | tsx, copy |
| 27 | Mark | size | 14x14px, flex none, round (`rounded-full`) | tsx, call 1 |
| 28 | Mark | layout | flex, center/center; aria-hidden | tsx |
| 29 | Mark unmet | ring | 1.5px solid `var(--fg-faint)`, no fill, no glyph | tsx |
| 30 | Mark met | fill | `var(--accent)`, no border | tsx |
| 31 | Mark met | check | "✓", 9px, weight 700, line-height 1, color `var(--bg)` | tsx |
| 32 | Mark | semantics | not a checkbox (no type/role checkbox) | READINESS |
| 33 | Still-weak line | element | `<p className={HINT}>` `strengthCopy.stillWeak`, after the list | tsx, call 5 |
| 34 | Still-weak line | condition | no refusal AND all 3 guides met AND strength weak | tsx |
| 35 | Motion | transitions | none drawn; any added goes under motion-safe | READINESS |
| 36 | Press | enabled | never locked by strength (Q1 waits for 1 char as today) | call 7, READINESS |

## Guide rules
| # | Guide | Ticks when | Source |
|---|---|---|---|
| 37 | length | length >= MIN_PASSWORD (8), one shared constant | tsx, READINESS |
| 38 | mix | `/[^A-Za-z\s]/` matches | tsx |
| 39 | common | length >= 8 AND estimator loaded AND estimator feedback warning empty (READINESS clar. 1 overrides tsx's "no patterns") | READINESS 1 |
| 40 | estimator inputs | Q1: first name, invited email (local part + whole); K5: address | READINESS 4 |

## Conditional rendering by state
| # | State | Meter (lit / word) | Refusal | Guides | Still-weak | Source |
|---|---|---|---|---|---|---|
| 41 | E empty | 0 / none | no | all open | no | Spec |
| 42 | U 1-7 chars | 0 / none | no | mix may tick; length, common open | no | Spec |
| 43 | W 8+, < level 2 | 1 / Weak (--fg-muted) | no | some open | no | Spec |
| 44 | W·all | 1 / Weak | no | all ticked | yes | Spec, ps-q1-weak-all-p |
| 45 | G level 2-3 | 2 / Good (--accent-text) | no | usually all ticked | no | Spec |
| 46 | S level 4 | 3 / Strong | no | mix may stay open | no | Spec |
| 47 | Q2 pressed <8 | 0 / none | tooShort | below refusal, live ticks | no | Spec |
| 48 | Q3 not strong enough | 0 / none | tooWeak | below refusal | no | Spec |
| 49 | Q4 breached | 0 / none | breached | below refusal | no | Spec, ps-q1-q4-d |
| 50 | After refusal | next keystroke clears refusal; meter returns | - | - | - | call 6 |
| 51 | Q5 busy, Q1 | whole panel hidden (`hidden` -> null) | | | | call 9 |
| 52 | Busy, K5 | panel stays | | | | call 9 |
| 53 | K5 network failure | `joinCopy.failed` in refusal slot, danger edge, BUT meter keeps its reading | yes | below | - | READINESS 3 |
| 54 | Estimator not loaded/failed | behaves as U: length + mix tick live, meter 0 no word, common open; updates in place without focus loss | no | | no | READINESS 2 |
| 55 | googleMissing Q1 | same panel, same slot | | | | READINESS 8 |
| 56 | K2 | no panel | | | | call 10 |

## Accessibility
| # | Item | Value | Source |
|---|---|---|---|
| 57 | List | real `<ul>/<li>` | call 8 |
| 58 | Row state | sr-only suffix per row: "done" / "not yet" (copy keys to add to strengthCopy) | tsx, READINESS 5 |
| 59 | Meter, word, marks | aria-hidden | tsx |
| 60 | aria-describedby | Field always names guides list id; both list id and LINE_ID while a refusal shows; via extra ids on `Field` | G2, READINESS 6 |
| 61 | Live region | one sr-only polite line `announce(word, n)` = "{word}. {n} of 3 done."; only when word or count changes; after 1s typing pause; under-8 form = count alone | call 8, READINESS 5 |
| 62 | Live vs alert | polite line must not speak in the same moment as Q2-Q4 role=alert | READINESS |

## State coverage (Spec states table + boards)
| Frame | Q1 390 | K5 390 | Desktop 1280 (Q1, K5) | Themes |
|---|---|---|---|---|
| E | yes | yes | yes | yes |
| U | yes | yes | yes | - |
| W | yes | yes | yes | yes |
| W·c / W·d / W·all | yes | no | - | - |
| G | yes | yes | yes | yes |
| S | yes | yes | yes | yes |
| Q2 | yes | yes | yes | - |
| Q3 | yes | yes | yes | - |
| Q4 | yes | yes | yes | yes |
| Busy Q5 / K5 failed / estimator unloaded | undrawn: per calls 9, READINESS 2-3 | | | |
