# States: version card rows (H31)

"Today" means the reader's collection and the newest price at the moment the version opens.

| Row | Dot | Beside the name | Tag, md+ / phone | Frame |
|---|---|---|---|---|
| In · owned ≥ `to` | filled `--success` | — | — | 1b 1e (Aang, Earthshape) |
| In · owned 0, priced | dashed `--fg-locked` | — | `buy · $2.40` / `$` | 1b 1e (Bumi) |
| In · owned 0, no price | dashed | — | `buy` / `$` (BuyTag `absent`) | — |
| In · owned 0, sold out | dashed | — | `buy · sold out` / `$` | — |
| In · 0 < owned < `to` | filled | `own 1 of 4` | `buy · $0.35` / `$` | 1b 1e (Persistent Petitioners) |
| In · quantity move, owned ≥ `to` | filled | pair in the name (`Plains 6 → 7`) | — | 1b 1e |
| In · quantity move, owned < `to` | filled | pair + `own 2 of 4` | tag | — |
| In · basic land | filled (always) | — | never | 1b 1e |
| Out · any | none | pair if moved | never | 1c 1e |
| Hovered (md+, `hover: hover`) | — | — | — | 1e: `--elevated-hover`, 252×352 preview at 240ms |
| No art (`imageUri` null) | — | — | — | No preview, the modal still opens |
| Pressed / tapped | — | — | — | Card modal, Prev/Next In → Out |
| Only cuts | — | — | — | No `todayNote` |
| v1 / `noChange` / `diffUnavailable` | — | — | — | 1d 1f: unchanged, no figures |

`own N of M` uses all printings the reader owns. It is the same count the decklist's short figure reads.
