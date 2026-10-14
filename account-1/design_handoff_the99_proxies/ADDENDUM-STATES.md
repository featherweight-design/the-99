# ADDENDUM STATES — Deck proxies R2

The two new surfaces only. R1's matrix in `STATES-proxies.md` is unchanged.

---

## Surface 5 · the `/decks` tile

### 5.1 Complete, with proxies
The detail slot carries `7 proxies` at `--fg-faint`, mono 11px phone / 10.5px desktop, truncating.
Desktop shares its row with last-played; phone takes the full row.
**Must not:** take the status's colour, displace a figure, qualify the pill, carry a control, or
change `Complete` to anything else.

### 5.2 Complete, no proxies
Byte-for-byte today's tile. No detail row at all.
**Must not:** reserve the row, or draw `0 proxies`.

### 5.3 Building, with proxies and cards in use elsewhere
`3 in use elsewhere` wins — it answers what is holding the deck up, and a proxy is not holding
anything up. The proxy line is not drawn.
**Must not:** draw both; the slot is one slot.

### 5.4 Building, with proxies and nothing in use elsewhere
The proxy line takes the slot.

### 5.5 Over / Unresolved / To buy, with proxies
The status's own figure holds the slot and the proxy line is not drawn. **This is also what
guarantees the line never takes a warning colour** — see the ADDENDUM README.
**Must not:** grow a second detail row to fit both.

### 5.6 Draft, with proxies
`created today` wins on the day of creation; the proxy line takes the slot after that. A Draft with
proxies is legal — the card sheet's control is scoped to deck membership, not to status.

### 5.7 A pair deck with a proxied commander
The tile's count is `99 / 98`-shaped as today, and the proxy line counts the commander with
everything else. The tile does not distinguish which proxies are commanders; §6's list does.

---

## Surface 6 · `/decks/[id]/changes` — a proxied add

### 6.1 The row
Hollow dashed ownership dot · card name · `proxied` chip in `bucketWord`'s slot · cost track.
**No buy tag and no price.**
**Must not:** draw a buy tag (the shipped slot does — see finding 1), draw a price, draw a pull
control, or fall through to silence like a `free` add.

### 6.2 The row's accessible description
`proxiedA11y(card)` on `describedBy`. Never rendered visually.
**Must not:** rename the trigger — the card's name is the name; this qualifies it.

### 6.3 The footer, the commit sheet and the pending banner
Every purchase figure excludes the row.
**Must not:** count it in `buy`, or in the banner's *short of spare copies*.

### 6.4 `groupInBreakdown`
Under-sums by the number of proxied adds. Flagged, not redesigned.
**Must not:** grow a fourth term without a ruling.

### 6.5 A card proxied while the draft is pending
The row keeps its pending-change rule (the 2px accent inset) and gains the chip. Orthogonal facts:
one says the draft touched this, the other says this deck's copy is printed.
**Must not:** appear on `/changes` as a proxy *event* — ruling 2. The proxy is not a change; the add is.

### 6.6 A proxy unmarked while the review page is open
Stale until navigation, like every figure on that page. `claimSurfaces` revalidates it.
**Must not:** relight or re-bucket under a reader mid-review.
