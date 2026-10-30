# READINESS — Card scanning (R1)

**🟢 R1, approved by Hugh 2026-10-16**, with G1 settled (the name press and *Search for it instead* stand) and G9
settled (B, the scan mark on D1–D5; T3, the count card that flips in the tray). Every open question in the brief is
drawn at 390, with the desktop fallback at 1300. G2–G8 in `README.md` are engineering defaults.

## Locks held

| Lock | How R1 holds it |
|---|---|
| ManaBox flow | Index once (D1–D5) → Fast/Normal (top bar) → batch (V1–V9) → review (L1–L3) → add (L4). |
| Photos in our app | Camera in the sheet; photos only as the fallback (D6, W4, W6). Frames live only for the session. |
| Card, not printing | Fast takes the first printing; Normal uses the shipped printing step. |
| Confirmed before it counts | No card without a press; Held freezes the guess under the finger. |
| No data loss | Adds only; one History entry per Save; Revert takes it back. |
| Transient errors | ToastFrame (D5). |
| Hit targets, keyboard, screen reader | Every phone press ≥44px; ✕ bare and labelled; the guess is `aria-live="polite"`; the progress bar is a `progressbar` with its value; Save `aria-disabled` while held. |

## Engineering needs

- `CARD_SCAN_ENABLED` switch, needing `COLLECTION_EDIT_ENABLED`. Off: no Scan press, no About entry.
- Add cards sheet (`add-cards-sheet.tsx`): the Scan press beside the search at both widths; a `source: "scan"` on
  lines so the name press shows on scanned lines only, with the scan's frame and its top three kept on the line.
- The index: about 27 MB, ranged requests so it resumes, stored on the device (IndexedDB or Cache); version check
  for top-ups (G3).
- Matcher: the research's model and margin gate, about 0.5s a frame; three agreeing frames to show a guess (G7);
  a "frame empty" signal to tell a second copy from a duplicate.
- Camera: `getUserMedia` rear camera; torch through `applyConstraints({advanced:[{torch:true}]})` where offered;
  dark detection by mean frame brightness.
- Fast/Normal remembered per device (localStorage).
- The scan mark and the tray's count card are drawn in CSS/SVG from tokens, like the shipped `CardFanMark` /
  `FanShuffle`; both animations drop under `prefers-reduced-motion`. The tray's flip shows the added card's image
  for about 0.8s.
- Save is the shipped add, so one History entry for the batch.
- Copy in `card-scan · copy strings.ts` goes through `/copy-review`; About entry in `about · scanning your cards.ts`.
