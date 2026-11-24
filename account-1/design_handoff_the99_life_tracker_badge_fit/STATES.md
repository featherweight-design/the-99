# States · badge row

| State | Trigger | Draws |
| --- | --- | --- |
| None | no damage, tax, counter or mark | no row (as shipped) |
| All fit | chips + gaps <= row width | every chip, no +N |
| Overflow | chips + gaps > row width | longest leading run that fits + "+N" (N = chips left out) |
| Your turn | End turn joins the row (phone, iPad ends) or foot | same rule over the narrower row (Q2) |
| Out | seat flipped to Out | back face shows name + sheet button only (unchanged) |
| Tap chip | press a damage, tax or counter chip | shipped sheet on that tab (unchanged) |
| Tap +N | press +N | shipped sheet on the first left-out chip's tab, counter focused if it is one |
| Hover (desktop) | pointer over a chip | native title: the chip's full words |
| Re-fit | resize, rotate, badge change, fonts loaded | recount, no animation |

Reduced motion: nothing here moves.
