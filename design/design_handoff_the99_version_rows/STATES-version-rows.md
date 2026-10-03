# States: version card rows (H31)

"Today" means the reader's collection and the newest price at the moment the version opens.

| Row | Dot | Beside the name | Tag, lg+ / below lg | Frame |
|---|---|---|---|---|
| In · owned ≥ `to` | filled `--success` | — | — | 1b 1e (Aang, Earthshape) |
| In · owned 0, priced | dashed `--fg-locked` | — | `buy · $2.40` / `$2.40` | 1b 1e (Bumi) |
| In · owned 0, no price | dashed | — | `buy` / `$` (BuyTag `absent`) | — |
| In · owned 0, sold out | dashed | — | `buy · sold out` / `$` | — |
| In · 0 < owned < `to` | filled | `own 1 of 4` | `buy · $0.35` / `$0.35` | 1b 1e (Persistent Petitioners) |
| In · quantity move, owned ≥ `to` | filled | pair in the name (`Plains 6 → 7`) | — | 1b 1e |
| In · quantity move, owned < `to` | filled | pair + `own 2 of 4` | tag | — |
| In · basic land | filled (always) | — | never | 1b 1e |
| Out · any | none | pair if moved | never | 1c 1e |
| Hovered (md+, `hover: hover`) | — | — | — | 1e: `--elevated-hover`, 252×352 preview at 240ms |
| No art (`imageUri` null) | — | — | — | No preview, the modal still opens |
| Pressed / tapped | — | — | — | Card modal, Prev/Next In → Out |
| Only cuts | — | — | — | No `todayNote` |
| v1 / `noChange` / `diffUnavailable` | — | — | — | 1d 1f: unchanged, no figures |

**Corrected 2026-10-03 (Hugh's staging walk):** whether an In row buys, and how many, is Shopping's answer for this deck (`loadDeckBuyRows`, the claim model), not raw ownership. An owned copy a senior deck holds is still a buy, as Basalt Monolith was in HD Tune - Counter Intelligence. `own N of M` is `M − buy`: the copies this deck has. The dot still reads ownership.

**Corrected in the build (readiness findings 1 and 2):** the tag is `full` from `lg` (1024px), not `md`, because at 820 a partly owned row left the name about 40px. Below `lg` the collapsed tag draws the live figure (`$2.40`), as `BuyTag` always does; a bare `$` only when there is no live price (no price, or sold out).
