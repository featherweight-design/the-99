# Readiness audit: the overview's own loading (`addendum_overview_loading/`)

**Verdict: 🟢 Green.** The one product question, the single layout move, is Hugh's and he ruled on
it on 2026-09-26 (below). Audited 2026-09-26 against `origin/main` at `d3bbc687`, which carries #1025
(the tab-level loader that holds until the verdict, the overview and the credit lines have all
answered). The drop was committed on `design/overview-loading-addendum` as additions only.

Every state the addendum draws can be reached from data the tab already reads, so no API or
schema change is needed. Nothing goes back to Design. Seven findings are engineering's, and each
is resolved below. Three new strings go to `/copy-review`.

## Scope

- **In scope:** `ADDENDUM-README.md`, `Overview Loading Addendum.dc.html` (1a to 1d, `:29-32`),
  the new states in the two child canvases (`Analysis Tab 1300.dc.html:103,139-148`,
  `Analysis Tab 390.dc.html:107,141-150`) and the fixtures (`analysis-fixtures.js:378-404`).
- **Not changed by the drop:** the parent handoff. The export deleted it in the main checkout, and
  the orchestrator restored it there. This branch adds the subfolder and touches nothing above it.
- **Already shipped, and the addendum agrees:** opening the tab. #1025's one loader holds until the
  verdict, the overview's read and the credit lines have all answered. The README's "Decided, not
  reopened" row describes exactly that behavior.
- **No About entry is owed.** This is a loading state of a feature that already has an entry. It
  adds no capability (see AGENTS.md, "a cosmetic change is not a feature").

## The states, against the shipped tab

"Reachable from" names the data the build keys on. `busy` is `useDeckSynopsis`'s press flag;
`pending` is `SynopsisState.pending` (the newest run row is `pending`); `stale` and `lastFailed`
are the shipped `SynopsisState` fields.

| State | First press | Re-analysis after edits | Reachable from | Today |
|---|---|---|---|---|
| 1a analyzing | 2b as shipped | Banner button: pulse + *Reading your deck…*, no credit note; Overview untouched | `profile.state.kind === "loading"` | First press: matches. Re-analysis: the button disables in place and keeps its label (`analysis-banner.tsx`), and the note stays |
| 1b writing | Slot: status line *Writing the overview…* only | Label row: *writing a new one for your changes*; held paragraph whole | `busy \|\| pending`, split by whether a synopsis is on hand | *No overview has been written…* with **Write one** disabled (first press); paragraph + ruling D's row with its button disabled (re-analysis). This is the state Hugh saw as broken |
| 1c written | Paragraph + *View full overview →*; *Overview ready.* announced once | New paragraph replaces the held one in place, 150ms crossfade | the re-read after the press, current for this list | Paragraph appears; nothing announced; no crossfade |
| 1d failed | `synopsisCopy.failed` as `role="alert"` + **Try again**, no credit note | Same, then a hairline, `olderThanList` in mono, then the held paragraph | `lastFailed` | First press: failure line (in `--fg-faint`, no role) + Try again **with** the credit note. Re-analysis: paragraph first, then the failure row |

Re-analysis with no held overview is the first-press column after the verdict lands (README).
A 7d press, where the overview is already current, never writes (`pressWrites` stays false in
`builder-shell.tsx`), so no status line appears, which is what 7d asks for.

## Findings

All seven are engineering's and none changes a drawing.

1. **The README cites `panel.reading`. The shipped key is `panel.loading.heading`**, with the same
   string, *Reading your deck…*. The build reuses that key. Doc drift only.
2. **1a supersedes a shipped rule.** `AnalysisBanner` documents "the button disables IN PLACE,
   keeping its label" (STATES:19). The addendum replaces the label with the pulse and *Reading your
   deck…* while busy, and drops the note. That is Design's explicit call, so the build follows it
   and updates the component's comment. The banner's `failed` mode has the same busy moment
   (**Try again** pressed), and the drawing does not show it. **Resolved:** it takes the same busy
   form, because the two presses run the same read.
3. **1d's "no credit note" holds only after a press made in this visit.** The addendum's reason is
   that the press already drew the note. `lastFailed` is also stored, though, so a reader who
   returns later sees 1d having seen no note, and **Try again** spends on success. The credits
   audit's rule (finding 4: the note keys on what the press does) would then be broken silently.
   **Resolved:** the note is dropped only for a failure that follows a write started in this
   visit. A stored `lastFailed` read on a later visit keeps the shipped note.
4. **Nothing re-reads a write that another page load started.** Within one page the shell holds the
   press across tab switches, so the README's "leaving and returning" case paints 1b and then 1c
   as drawn. After a reload mid-write, `pending` would hold *Writing the overview…* with nothing to
   end it. Today that same case shows a disabled **Write one** indefinitely. **Resolved:** while
   `pending` holds with no press of this page in flight and the tab is open, the overview is
   re-read every 5s. That call is a read and never a model call, and the reaper already frees a
   run a crash stranded.
5. **The crossfade respects reduced motion.** It uses the tab's existing motion tokens, and under
   `prefers-reduced-motion` the swap is instant, as `.anim-at-wave` already is (`globals.css:771`).
6. **The status rows reuse the pulse, not a new animation.** Three 5px dots on `at-wave`
   (1.6s, 0.16s stagger) in `--fg-muted` are the fixture's `pulse` (`analysis-fixtures.js:381`).
   `globals.css` already carries `at-wave` and its reduced-motion rule. The only stylesheet
   addition is the 150ms crossfade (finding 5), which reuses the existing `backdrop-in` keyframes.
7. **The 1d failure line moves from `--fg-faint` to `--fg-muted`** and gains `role="alert"`. The
   hairline caption under it is mono 10.5px `--fg-faint`, where the standing ruling D row is sans
   13/13.5. That treatment applies only when the failure line heads the held paragraph. The
   standing ruling D state (no press, an older overview) is unchanged.

## Hugh's ruling on the layout move (2026-09-26)

Design flagged one cost for Hugh: when a fresh Analyze lands the verdict first and the overview is
written afterward, the slot grows in place, and the climb moves down once (at 390 the bracket box
does too). **Hugh ruled that the first press should not shift.**

- **First Analyze:** one loader holds the tab until the verdict **and** the overview are both
  ready, so nothing moves. Its line moves through stages: reading the deck, determining the
  bracket, then writing the overview. The stage lines start from Hugh's *Determining your
  bracket…* and *Writing your overview…* and are worded through `/copy-review`.
- **Two safety valves:**
  - **A failed or refused overview** releases the tab at once, onto the verdict and the overview's
    failed state (1d) or the refusal (7h).
  - **A time limit:** if the overview is still being written when the limit passes, the verdict is
    released and the slot falls back to Design's 1b status line. Only a slow run then pays the
    one-time growth. The limit starts near 15s and is tuned from live write timings on Hugh's
    pulled decks.
- **Re-analysis after edits** is unchanged from the addendum: the held overview stays, the label row
  says a new one is being written, and nothing shifts.
- **The announcement:** on the staged path everything lands together and is announced once,
  combined. *Overview ready.* is kept for the fallback path, where the overview lands after the
  verdict.

So 1a and 1b are drawn as delivered only for re-analysis and for the fallback. The first press's 1a
extends through the write, which needs no new drawing: it is 2b's ring with its heading stepping
through the stages.

## Copy (owed to `/copy-review`)

New: `Writing the overview…` · `writing a new one for your changes` · `Overview ready.`
Reused: `synopsisCopy.failed`, `.olderThanList`, `.tryAgain`, `deckAnalysisCopy.panel.loading.heading`,
and the shipped `pressNote` / `credits` strings.
