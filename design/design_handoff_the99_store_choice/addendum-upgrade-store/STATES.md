# States · Precon upgrade result, store label

| State | Trigger | To buy | The line | An add to buy | Must not |
|---|---|---|---|---|---|
| Listing store (R1, R3, R4, R6) | Mana Pool or Card Kingdom, repriced | count + figure | `single-copy prices on {store} · last checked …` | `buy $x` | Name the store on a tag |
| Market store (R2, R5) | TCGplayer, repriced | count + figure | `TCGplayer market prices · averages of recent sales, so a listing can differ · last checked …` | `buy $x` | Put the note on rows |
| Some unpriced (E1, E2, E5) | The store has no figure for some adds | count + figure of the priced | `… · {n} of {m} priced · last checked …` | priced: `buy $x`; unpriced: bare `buy` | Count an unpriced add as $0 in words, or drop it from the count |
| None priced (E3, E4, E6) | No figure for any add to buy | count only | `no prices from {store} for these · last checked …` | bare `buy` | Draw `$0.00` |
| Behind | `pricesAsOf` older than ten days | as above | `… · these are behind` | as above | Use the run's day as the date |
| Switch off (O1, O2) | `storePreferenceEnabled` false | stored figure | none | stored figure | Name any store |
| Read failed | `repricedAdds` null | stored figure | none | stored figure | Name the reader's store over stored figures |
| Nothing to buy | Every add owned | `0` | none | none | |
| Refunded or short run | As shipped | as above | as above | as above | |
