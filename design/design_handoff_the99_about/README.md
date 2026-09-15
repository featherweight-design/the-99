# About The 99 — R3

R2 was the right artifact with wrong figures in three places and eight features missing.
**R3 makes all five corrections, draws all eight missing entries, regenerates the copy file to
match, and adds the thing that stops it recurring: a blank per-entry template.**
The specimen grammar from R2 is unchanged, and every locked decision from R1 and R2 holds.

**Deliverable:** `The 99 - About Page (R3).dc.html` (canvas, six-theme `theme` prop).
R1 and R2 are kept for the audit trail. Both are superseded.

| File | What it is |
|---|---|
| `The 99 - About Page (R3).dc.html` | The deliverable. Grammar and annotation key (§1), the mark (§2), **the page at desktop — four chapters, thirty-two figures (§3)**, the behind and current readers (§4), phone (§5), account menu (§6), the contract (§7), **the blank per-entry template (§8)**. |
| `about · copy strings.ts` | **Regenerated.** 32 entries in canvas order with `caption`, `keys[]`, `width`, `chapter` and `since`. Replaces R1's 26. |
| `READINESS-r3.md` | This round: what each correction changed, what is still unverified, the one thing Product must do. |
| `STATES-about-r3.md` | The states R3 adds or changes. Supersedes `STATES-about-r2.md` where they disagree. |
| `READINESS-r3-audit.md` | The audit this round answers. |
| Earlier rounds | `The 99 - About Page (R1/R2).dc.html`, `READINESS.md`, `READINESS-r2.md`, `STATES-about.md`, `STATES-about-r2.md`. |

---

## The five corrections

**Fit denominator.** `41/65` was impossible — `measurableTotalFor` returns 40 or 100 and nothing
between. The degraded specimen now reads `27/40`, and the lane caption says the denominator drops
to 40 rather than "says so".

**Status plate.** The fourth column was a JSDoc table written for engineers, and `Nothing in it
yet` is not in the tree. The specimen now draws what the app draws — badge, bar, **one figure, no
sentence** (`created today`, `87 of 99`, `5 over`, `2 lines unresolved`, `3 to buy · $12.40`,
`99 of 99`). The explanations moved into four key lines, which say in the caption that they are
this page's prose and not the product's.

**Availability has four states.** `soft` — `1 in a brew` — is drawn, and it is numeral 2 of 4,
between free and committed. The not-owned row keeps its place and loses its numeral, so the figure
stays inside the four-annotation ceiling. Desktop and phone both.

**Tokens.** `--avail-soft: var(--fg-muted)` ✓, `--avail-hard: var(--accent)` with
`--avail-hard-fg`, and a per-theme over pair — applied everywhere a diamond is drawn, including
the §2 legend and the decklist tiles.

**Roles.** `Ramp / Card draw / Removal / Board wipes` at `10 / 10 / 8 / 3`. `Lands` is gone from
both role figures; `Draw` is now `Card draw`.

## The eight new entries

Thirty-two total — **16 insets, 16 plates** — across chapters of 7 / 6 / 10 / 9.

**01** Browse what you own (plate) — search, filters, grid-or-rows, and that the view is remembered.
**03** The deck page (plate), first in its chapter, so the marks entry has something to be about ·
Bring a deck over, or update one (inset) · Put back (inset) · Take the list somewhere else (plate),
covering export and the Mana Pool link-out.
**04** Which deck gets a shared copy (inset) · Cards you are proxying (inset) · Themes (plate).

Reservations and proxies ship as `since: 1` per Product's overrule, so **the version-2 artboard in
§4 now uses an illustrative `since: 2`** on Put back, and says so. No real entry is deferred.

## The template (§8)

Blank on the left, the Put back entry filled in beside it: title, route, opens, chapter, width,
caption, specimen component, fixture props, up to four key lines, phone reduction, `since`, and
which copy file the strings come from. A future feature's design round produces **one filled-in
page**, not an edit to a 260KB canvas. The audit's process hooks — `AGENTS.md`, the plan, and
acceptance close-out — are named on the artboard as Product's to make; a template nobody is
required to fill in is decoration.
