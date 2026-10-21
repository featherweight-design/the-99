# Addendum: the scanner when it isn’t ready

Account 2 · 2026-10-21 · touch sizes and missing states round. No new surface: rulings and missing states on what shipped from this handoff.

Canvas: https://claude.ai/artifact/8QN9aKbTdh1B2rBZSk7TgZ (board: `Scan-NotReady.dc.html`). The full round, all seven items, is in `account-2/design_handoff_the99_touch_sizes_addendum/`.

Coarse-pointer rule for the touch items: grow only on `pointer: coarse`. A grown hit never reaches into a neighbour's; where a 44px hit would overlap, the part itself becomes the 44px slot. With a mouse everything is as shipped.

## Item 1 · The not-ready state (no index)

**Was:** the scanner still drew the dashed outline and "Show a card to the camera" behind a 3s `notReady` notice, against D3's "Must not".

**Answer: redrawn.** From the first no-index answer, the scanner becomes a still screen in the shipped camera-blocked form (`CameraBlocked`, phone and desktop):

- Camera off. No outline, no panel, no tray, no Auto/Normal, no light, and no 3s notice for this case.
- The only control is the shipped exit: ✕ on the phone, Stop on desktop. There is no "take a photo" press, because a photo would fail the same way.
- Icon tile in `fg-muted` with the scan-corners glyph.
- Trigger: the first lookup that comes back "no index". Exit: ✕ / Stop, back to where scanning was opened.
- The other notices keep their shipped places: under the top bar on the phone (`top-[72px]`, 132px with the dark line), under the feed on desktop (`mx-[14px] mt-[10px]`). Confirmed.

For engineering (not a design call): if the server can say it has no index before a frame is sent, open straight on this screen and skip the camera prompt. The screen is the same either way.

### New words, for /copy-review

| Key | Copy |
| --- | --- |
| `notReady.title` | Scanning isn’t ready yet |
| `notReady.body` | There’s nothing to check cards against yet, so the camera is off. |
| `notReady.line` | Close this to add cards by name for now. |
| `notReady.bodyDesk` | There’s nothing to check cards against yet, so the webcam is off. Stop takes you back to the search, to add cards by name for now. |

The old one-line `notReady` notice copy is retired with the notice.

The boards load their images from the canvas asset store (`/_blob/…`); the same images are in `art/` here.
