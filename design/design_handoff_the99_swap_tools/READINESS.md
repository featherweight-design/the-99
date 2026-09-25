# READINESS: The small swap tools (R4, approved)

**Status: 🟢 Approved (user LGTM, 2026-09-24).** Hugh still owes two decisions, listed below. The canonical canvas is `The 99 - Swap Tools.dc.html`. `README.md` §R2–§R4 record every change after R1. Where they disagree with R1, the later round wins.

## Addendum (2026-09-24, approved)
`addendum_staples_door_stacking/` answers three questions the build was waiting on: the staple read, the door on the shipped modal, and card → sheet → card. Its `ADDENDUM-README.md` wins on those three questions. It supersedes amendment 3(b) below: the door moves to the art column on desktop, and to a 44px strip under the art header on the phone.

## Files
| File | What engineering takes from it |
|---|---|
| `The 99 - Swap Tools.dc.html` | The canvas: the seven §4 calls and sections 1a–1f, at 1300 and 390. |
| `Shopping View.dc.html` | The limit line under PriceStrip, the ⇄ and over marks on DecklistRow, and the receipt after a take. |
| `Stand-ins Sheet.dc.html` | The ModalChrome body. It covers five content states, loading, failed, refused, partner and taken. |
| `Card Details.dc.html` | The shipped CardModal as it is today, plus the new footer link `Find a deck for it →`. |
| `Fits Your Decks.dc.html` (`view="picker"`) | The stacked picker in five states: several decks, loading, all hold it, colors rule them out, added. Ignore its `view="card"`: `Card Details` replaced it. |
| `swap-tools · copy strings.ts` | All new copy, all owed to /copy-review. |
| `brand/`, `support.js` | The runtime and the brand reference. |

## Owed to Hugh
1. **Add in the picker.** The drawn behaviour: while a copy is free the row reads **Add** and uses that copy. Once none are free it reads **Add to buy** and the card joins Shopping. The alternative is a hard stop, with no second control and one line under the head.
2. **`Undo swap` across both tools.** Recommendation: move `deckTuningCopy.card.undo` ("Put it back") to `Undo swap`, so one mechanism has one word. The removal undo keeps `Put back`.
3. **§3.0 readings** are drawn as written. An overrule changes the query, not the layout.

## Amendments to shipped components
1. **DecklistRow (Shopping only)**
   - Its meta line gains `over $N`.
   - Over-limit rows gain a ⇄ trigger before the ✕. It's 22px on desktop and 44×44 on the phone.
   - Under-limit rows get no ⇄. Desktop keeps an empty 22px slot there so the buy tags stay in one column.
2. **BuyTag** gains an over-limit ring: an inset 1px `--warning` line at 60%.
3. **CardModal**
   - (a) The footer gets a second link line, `Find a deck for it →`. The footer grows from about 64px to 92px. The link shows only when the card is legal in Commander and the player has at least one deck.
   - (b) `See cheaper stand-ins →` goes under the buy tag, only when the modal was opened from a Shopping row.
   - (c) A footer slot, shown only when the modal is stacked from the stand-ins sheet: `in place of {cut}`, the free or buy tag, and Take.

## Engineering list, in dependency order
1. **`decks.shopping_limit_cents`**, a nullable int. Null reads as 1000. Whole dollars, 1 or more.
2. **Stand-in query** (Tier A). It needs:
   - the land color reader;
   - the fetch type reader;
   - the drawback classifier, which can return "unnamed";
   - roles;
   - the commander or partner-pair inclusion;
   - `loadPrices`, limited to rows at the newest `as_of`;
   - free-copy detection through `isShoppingCard`, run on the deck as it would be after the take.
3. **Shared swap body**, extracted from `verdicts.ts:84`, with its own undo snapshot store. A receipt needs the snapshot id, the cut, the add, and whether the add was free.
4. **Limit line, ⇄ and the over marks** in Shopping.
5. **Stand-ins sheet**, including CardModal `stacked` with `backLabel="Cheaper stand-ins"`, the hover preview and 22×31 thumbs.
6. **Fits picker payload**, loaded when the picker opens. It needs:
   - the reader's decks and their commanders' identities;
   - one inclusion lookup;
   - role counts, with `rolesUsable` exposed;
   - holding decks;
   - free-copy count.
7. **Copy.**

## Checks
- **Buttons are real `<button>`s**, matching the Apply skin in `suggestion-card.tsx`: 1px `--accent` border, transparent fill, radius 7 on desktop and 8 on the phone. The quiet skin is `--border-strong` and `--fg-muted`.
- **No score and no combined figure.** Stand-in facts are separate clauses. Each fitting deck shows two chips with no joining glyph.
- **Colour never carries a state alone.**
  - Over the limit also shows `over $10`, and free also shows `free`.
  - Taken also has a stamp and a ✓.
  - Refused also has a tag, a heading and a sentence.
  - A spent copy also reads `none free`, and its button changes label.
- **Targets:** every control is 44px on the phone. Desktop controls are 28px or more, and Take and Add are 32px.
- **Loading** uses the shipped LoadingScreen shape: the crown pulses on the `dots` animation, which stops under reduced motion.
- **Nothing reorders under the finger.**
- **No new token and no new hex.** The one animation is the shipped one.
