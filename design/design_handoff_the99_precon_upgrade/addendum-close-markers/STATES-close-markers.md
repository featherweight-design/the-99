# States · close on every step, and bracket marks on the swaps (A3)

## Close

| State | Trigger | What the player sees | Board |
|---|---|---|---|
| Any step open | Intro, Commander, Bracket, Strategy, Wait, Failed, Results, a past result, History | Bare ✕ at the title row's end, phone and desktop | Close · phone, Close · desktop |
| ✕ before the confirm | ✕, Escape or the scrim | Window closes; picks dropped; no credit spent; next open starts at the intro | (text) |
| ✕ during the Wait | ✕, Escape or the scrim | Window closes; the run keeps going; 2 credits held | W |
| Closed, running | Run still pending | Page button: `Upgrading toward Spells · 0:05`, clock running; pressing opens the Wait | P1 |
| Closed, landed | Run settles done while closed | Button back to `Upgrade this precon`, `line-pulse` twice (none under reduced motion) | P2 |
| Next open after landing | Button pressed | Opens on the result, as shipped | R |
| Closed, failed | Run settles failed while closed | Both credits back; button back to `Upgrade this precon`, no pulse; next open at the intro | (text) |
| Left the page mid-run | Navigation | The run finishes and is kept in History; the next visit opens on it | (text) |
| ✕ on results or History | ✕ | Closes; reopening shows the newest result (or the intro after History, Hugh's bug d) as shipped | (text) |

## Marks

| State | Trigger | What the player sees | Board |
|---|---|---|---|
| Marked swaps | Any cut or add with a card fact, or a combo partner in the deck after the swaps | The mark after the name, before the cost | R1 |
| Key | At least one mark on the result | `MarkKey` under the four facts, only the marks present, shipped order | R1, R4 |
| No marks | No cut or add carries one (most bracket 2 runs) | No marks, no key, nothing reserved | (text) |
| Combo among the adds | Two adds form a two-card combo | Both carry the lemniscate; the key gains `Two-card combo` | R4 |
| Past result from History | Opened from History | Same marks, worked out on that run's list | (text) |
| Deck page (A2c) | Results opened from the band | Same marks and key | (text) |

**Must-nots**
- No foot button that only closes (`Not now`, the Wait's `Back`, History's `Close`). The ✕ is the one way out.
- No plate on the ✕, and no second ✕ anywhere in the window.
- No confirm on close, and closing never cancels or refunds a run in flight.
- No new mark, colour or size. Only `CardFactMark` and `ComboGlyph` at 16px.
- No key entry for a mark the result doesn't draw, and no positive claim ("no game changers").
- No count of marks in the facts strip or beside the bracket.
