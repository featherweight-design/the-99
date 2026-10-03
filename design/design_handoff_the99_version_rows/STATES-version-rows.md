# States: version card rows (H31)

"Today" means the reader's collection and the newest price at the moment the version opens.

Two independent facts per In row (corrected 2026-10-03): the **dot** is ownership (`ownedNow > 0`:
filled `--success`, else dashed `--fg-locked`), and the **tag** is the claim model's `buy` (`to` less
the copies this deck can call on, Shopping's own figures). Either dot can sit beside either tag.

| Row (`buy`, the claim model) | Beside the name | Tag, lg+ / below lg | Frame |
|---|---|---|---|
| In · `buy` 0 | — | — | 1b 1e (Aang, Earthshape) |
| In · `buy` = `to`, priced | — | `buy · $2.40` / `$2.40` | 1b 1e (Bumi) |
| In · `buy` = `to`, no price | — | `buy` / `$` (BuyTag `absent`) | — |
| In · `buy` = `to`, sold out | — | `buy · sold out` / `$` | — |
| In · 0 < `buy` < `to` | `has N of M` (`N = to − buy`) | `buy · $0.35` / `$0.35` | 1b 1e (Persistent Petitioners) |
| In · quantity move, `buy` 0 | pair in the name (`Plains 6 → 7`) | — | 1b 1e |
| In · quantity move, `buy` > 0 | pair, then `has N of M` when `N > 0` | tag | — |
| In · basic land | — | never (`buy` is always 0) | 1b 1e |

| Dot (ownership, independent of the tag) | Example |
|---|---|
| filled: `ownedNow > 0` | Aang, Persistent Petitioners, Basalt Monolith (owned, held by a senior deck, so tagged too), any basic |
| dashed: `ownedNow = 0` | Bumi; also a proxied slot, which can read `buy` 0 (or `has N of M`) with no copy owned |

| Row | Dot | Beside the name | Tag, lg+ / below lg | Frame |
|---|---|---|---|---|
| Out · any | none | pair if moved | never | 1c 1e |
| Hovered (md+, `hover: hover`) | — | — | — | 1e: `--elevated-hover`, 252×352 preview at 240ms |
| No art (`imageUri` null) | — | — | — | No preview, the modal still opens |
| Pressed / tapped | — | — | — | Card modal, Prev/Next In → Out |
| Only cuts | — | — | — | No `todayNote` |
| v1 / `noChange` / `diffUnavailable` | — | — | — | 1d 1f: unchanged, no figures |

**Corrected 2026-10-03 (Hugh's staging walk):** whether an In row buys, and how many, is Shopping's answer for this deck (`loadDeckBuyRows`, the claim model), not raw ownership. An owned copy a senior deck holds is still a buy, as Basalt Monolith was in HD Tune - Counter Intelligence. `has N of M` (it read `own N of M`) is `M − buy`, the copies this deck can call on, so it says `has`: an owned copy a senior deck holds is not this deck's. The dot still reads ownership, so Basalt Monolith draws a filled dot and a buy tag.

**Corrected in the build (readiness findings 1 and 2):** the tag is `full` from `lg` (1024px), not `md`, because at 820 a partly owned row left the name about 40px. Below `lg` the collapsed tag draws the live figure (`$2.40`), as `BuyTag` always does; a bare `$` only when there is no live price (no price, or sold out).
