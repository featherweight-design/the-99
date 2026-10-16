# States — card scanning R1

Phone at 390, desktop at 1300. The canvas column names the board and frame.

| # | State | Trigger | Shown | Canvas | Must not |
|---|---|---|---|---|---|
| E1 | The way in | Add cards sheet open, switch on | `Scan` press (48px) beside the search; upload and precon rows unchanged | Start E1, Desktop W1 | A new row or head button; hide it once the list has lines |
| D1 | Index needed | first Scan, no index on device | Scan mark (blank 99 card in pink corners), `Scan your cards`, the 27 MB line, `Download · 27 MB`, `Best on Wi-Fi.` | Start D1 | Download without a press |
| D2 | Downloading | press | Scan line sweeps the mark; bar with MB and %, `Close this whenever you like…`, held button `Downloading…` | Start D2, Desktop W5 | A spinner; restart from zero after a close |
| D3 | Offline, not started | no connection | `You’re offline`, `Try again`, search named | Start D3 | A press that cannot work |
| D4 | Paused | connection drops mid-download | Warning bar, `Paused · you’re offline`, figure kept, held `Waiting for a connection` | Start D4 | Lose the bytes; ask the player to restart |
| D5 | Stopped | server error | Warning bar `Stopped`, `Try again`; ToastFrame `We couldn’t finish the card index…` | Start D5 | An inline error card |
| D6 | Camera blocked | permission denied | `The camera is blocked`, settings line, `Choose photos` | Start D6, Desktop W6 | Ask again in a loop |
| D7 / V1 | Looking | index ready, camera on | Dashed corners, `Hold a card inside the frame`, mode line; tray with Review held at 0 | Start D7, View V1, V1n | A name before a card is steady |
| V2 | Unsure | card in frame, frames disagree | Pink corners, `Hold it still`, dots | View V2 | A guess |
| V3 | Sure | 3 frames agree, above the gate | Card at card size, name, type, `Add to the list` | View V3, Desktop W2 | Add without a press |
| V4 | Held | pointerdown on the press | Frame frozen, `Held`; lift adds, slide off cancels | View V4 | Swap the guess under the finger |
| V5 | Added | press released | Card flies to the tray; the count card flips to it, then back to the count; `N on the list`, `Review N` | View V5 | A toast |
| V6 | Not sure | 3 frames agree, below the gate | `Not sure. Which is it?`, top three at card size, sleeve line, `None of these` | View V6, Desktop W3 | Pick one for the player |
| V7 | Dark, torch | ~1s of dark frames, torch offered | Line naming the light, ring on the control | View V7 | A modal |
| V8 | Dark, no torch | dark, no torch | No control, `Move closer to a lamp` | View V8 | A disabled torch |
| V9 | Light on | torch pressed | Control filled | View V9 | — |
| R1 | Duplicate | added card never left the frame | `✓ On the list · ×1`, `Add another copy` | Review R1 | Offer it again as new |
| R2 | Second copy | same card after an empty frame | `×1 on the list already`, `Add a second copy` | Review R2 | Fold silently |
| R3 | Copies, Fast | two copies added | One line ×2 with the holdings note | Review R3 | Two lines |
| R4 | Copies, Normal | same printing chosen twice | Shipped `… was already on the list · now ×2` | Review R4 | Fold before a printing is chosen |
| L1 | Review | `Review N` | The shipped list, newest first; names on scanned lines are presses | Review L1 | A separate review screen |
| L2 | Fix a card | name press | The scan, three closest, current ticked, `Search for it instead`; others fold | Review L2 | Open on a lookalike without the photo |
| L3 | Printing step, Normal | Normal mode | Shipped required step, Save held, `Choose X’s printing first` | Review L3 | Let Save run with a step open |
| L4 | Saved | Save | Shipped receipt, `5 copies added`, History link | Review L4 | More than one History entry |
| W4 | Photos | `Choose photos` | Rows Sure / Not sure, `Add the 3 sure ones`, top three for the Not sure | Desktop W4 | Add unpressed |
| A1 | About entry | `CARD_SCAN_ENABLED` on | `Scanning your cards`, chapter 01, after `Adding cards by hand` | About A1, A2 | Show with the switch off |
