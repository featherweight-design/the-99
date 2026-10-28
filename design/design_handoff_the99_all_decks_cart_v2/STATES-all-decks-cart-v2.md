# States: Shopping for all decks v2

Every state, with the frame that draws it and what it must not do. Two widths for each: 1300 (desktop) and 390 (phone).

| State | Trigger | Frame | Must not |
|---|---|---|---|
| Row, rest | A selected line | Row A2 | Wrap a fact onto a second line. Cut a deck name mid-name. Put Ask beside the tag |
| Row, +N open | Press +N on need, own or (By card) spare | Row C1/C2 | Open a modal or sheet. Move the action stack off the top of the row |
| Row, Ask | Nobody asked (`rowAsk` → `ask`) | Row B1 | Change the shipped Ask rule |
| Row, Requested | Your open ask is with this friend | Row B1 | Move the buy tag |
| Row, Accepted | They said yes | Row B1 | Hide the buy tag (the buy press is how the card arrives) |
| Row, Declined | They said no, inside the 14 days | Row B1 | Offer Ask |
| Row, Ask again | The last ask expired | Row B1 | — |
| Row, Ask instead | An open ask is with another friend | Row B1 | Show two open asks for one card |
| Row, held slot | Bought this visit and gone from the read | (shipped S3, unchanged) | Draw the new row's facts in the slot |
| By friend, long list | Several friends, many lines | By-Friend A/B | Collapse panels by default |
| By friend, panel folded | Press the panel header | By-Friend A′ | Drop the header's figure |
| By friend, one spare | One friend, one line | Empty-One A | Read “1 cards” |
| By friend, none | The read landed and no line has a friend's spare | Empty-One B | Hide the By friend segment. Offer a press |
| By friend, no friends | The reader has no friends | Empty-One C | Mention spares the reader cannot have |
| By friend, reading | The spares read has not landed | Loading C/D | Fall back to By card. Animate anything but the shipped skeleton |
| By card, reading | Same | Loading A/B | Disable search, Owned, Sort, buy or checkout |
| Chassis, rest | — | By-Friend A | Collapse row 2 (it prints NO FILTERS ON) |
| Chassis, Friend open | Press Friend | Controls A1 | Offer a friend with no spare of a selected line |
| Chassis, Sort open | Press Sort | Controls A2, B2 | Offer one view's sort in another |
| Chassis, Filters sheet | Press Filters below 1000px | Controls B1 | Draw friend pills of unequal width (R1b) |
| Chassis, filtered | A friend, Owned or search on | Controls C1/C2 | Reset when the view switches |
| Chassis, no match | Filters and search leave no line | Controls D | Draw an empty list with no way out |
| Chassis, no friend's spare | The read landed empty | Empty-One B | Draw the Friend trigger or the sheet's Friend group |
