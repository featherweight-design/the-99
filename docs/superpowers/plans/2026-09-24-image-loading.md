# Card images appear sooner — findings and plan

**Lane:** image-loading. **Brief:** `boards/lanes/image-loading.md`. **Orchestrator:** `the-99-d9`.

**Hugh's question (2026-09-25):** *"Card images take a second to load, both for the card hover
preview and for card details. Could we use a CDN? Or batched requests: pull the bare details for a
deck list first (name, CMC, availability) and the rest (image, text) in a second batch? What does
this payload look like?"*

**Hugh's scope ruling:** build only what makes images appear sooner and **draws nothing different**,
each proven by a before/after timing probe at 1300 and 390. Anything that changes what is on screen
is written up here and not built.

## How this was measured, and what the measurement cannot see

`scripts/probe-image-timing.mjs`, production build (`pnpm build && pnpm start`), local-dev, fixture
account, deck `d0000000-…cafe`. Two constraints stated up front because they bound every figure
below.

**The page cannot see image timing at all.** `cards.scryfall.io` sends **no `Timing-Allow-Origin`**
header, so its `PerformanceResourceTiming` entries arrive with every phase and every byte count
zeroed — a page gets `startTime`, `duration` and `responseEnd` and nothing else. Measured from the
page, a 93 KB image over a cold TLS connection is indistinguishable from a free one. Every phase
figure here therefore comes from **CDP**, which is not bound by that rule. The same constraint means
**we cannot measure image latency from a real reader's browser in production** — only a same-origin
proxy would make these numbers visible, which is an argument for a proxy that has nothing to do with
speed.

**The hover preview is desktop-only, by design.** `hover-preview.tsx` returns early unless
`(hover: hover)` matches, because a touch device fires `mouseenter` on tap. So the 390 column covers
card-details art only; a preview figure at 390 would describe a surface no phone reader can reach.

**Local-dev has no realistic decklist.** The fixture account's decks are whole by copies (99, padded
with one high-quantity Wastes row, per `AGENTS.md:869`) but thin by **rows** — the largest has 16.
Per-image timing is not scale-dependent and is measured on the decklist; anything scale-dependent
belongs on `/collection` (2,733 owned cards). Filed as `found/local-dev-fixture-deck-count`.

**The deck page is measured with `ANALYSIS_TAB_ENABLED` off.** Staging sets it to `"true"`; local
does not set it. So the deck-page payload figures below are a **floor**, not what staging serves.

## What one hover actually costs

First hover of a session, cache cleared, desktop 1300×900:

| Segment | Measured | Where it comes from |
| --- | --- | --- |
| Pointer enters → preview box mounts | **307 ms** | 240 ms `OPEN_DELAY` + ~67 ms dispatch and React render |
| Image request, wall clock | **214 ms** | 93 KB (`normal`, 95,631 B), TTFB ~142 ms, HTTP/2 |
| Decode | **0.1–35 ms** | `img.decode()` on the same bytes |
| **Pointer enters → painted** | **~477 ms** | observed by screenshotting the box until its pixels stop being uniform |

The paint figure is observed rather than computed, but its resolution is coarse: screenshots cost
~70–100 ms each, so read it as "between 410 ms and 477 ms". The component figures are exact.

**The ordering is the finding.** `hover-preview.tsx` sets `background: … url(…)` inside the state
update that `setTimeout(show, 240)` schedules. **The image request cannot begin until the 240 ms
delay has already elapsed.** Delay and fetch are strictly serial, and the reader waits for the sum.

Two more measurements bound what is worth building:

- **A second hover of the same card costs zero network requests.** `cache-control: public,
  max-age=31556952` works. All of the cost is the first look at a given card.
- **The connection is already open before any hover.** The deck page fetches commander art during
  page load, paying `dns 0.9 ms, tls 80.6 ms, ttfb 75 ms`. By hover time the HTTP/2 connection to
  `cards.scryfall.io` is warm and the hover's own request pays neither DNS nor TLS.

## The CDN question, answered

**Scryfall already serves these images from a CDN, and it is already working.** Response headers:

```
server: ScryfallEdgeCDN (scryfall.io)
cache-control: public, max-age=31556952
age: 4651142          # ~54 days at the edge
content-length: 95428 # the `normal` size
protocol: h2
```

So "could we use a CDN" is answered: we already are, at an edge that has held this object for eight
weeks. What a **Vercel proxy or `next/image` in front of it** would and would not buy:

| Would buy | Would cost |
| --- | --- |
| Same-origin timing visibility (`Timing-Allow-Origin`), so production latency becomes measurable | An extra hop: Vercel edge → Scryfall edge → back, on every cache miss |
| Format conversion (AVIF/WebP), plausibly 93 KB → 35–55 KB at the same pixel dimensions | Vercel Image Optimization is billed per source image transformed; 102,902 printings is far outside a free allowance |
| One connection instead of two on pages that load only our origin | A second cache to invalidate, and a new failure mode between the reader and an image that works today |

**Recommendation: do not proxy.** The measured win available is ~142 ms of TTFB against an already
warm connection, and a proxy adds a hop to that path rather than removing one. The format-conversion
win is real but it is a **bytes** argument, and the bytes are not what a reader waits for here — the
240 ms delay is. Revisit if the bytes ever dominate, or if production measurement becomes a
requirement in itself.

## The batched-request question, answered

Hugh asked whether to pull bare details first and images second. **Measured, this is a net loss for
images, and the payload is not where the time goes.**

The deck payload carries **19 fields per card** (`DeckDetailCard`, `src/lib/decks/grouping.ts:13`):

```
oracleId, name, typeLine, cardTypeGroup, role, cmc, facts?, owned, proxied?, quantity,
auto, availability?, price?, manaCost?, imageUri?, printedName, printedSetCode,
printedCollectorNumber, layout?
```

- **`oracleText` is already absent** from the per-card row — it lives on `DeckCommander` only. Half
  of "the rest (image, text)" is therefore already deferred.
- **`imageUri` is a ~75-character string.** For a 99-row deck that is roughly **7 KB** of payload.
  Deferring it to a second batch would save 7 KB and **add a round trip in front of every hover**,
  because the row could not name its image until the second batch landed. It would make the surface
  Hugh is complaining about measurably slower.
- **The deck page payload is 160.9 KB for a 16-row fixture** with Analysis off; the 2026-09-16
  baseline measured **553.7 KB for a real 99-row deck**. At ~4–5 KB per row, the weight is in
  `facts`, `availability` and `price`, not in `imageUri`.

**Recommendation: no lean-first split for images.** If payload weight is worth attacking, the target
is `facts`/`availability`/`price` — and that is a different lane's question, because deferring any of
them changes when a row's marks appear, which Hugh's ruling excludes from this lane.

## What to build

Only two candidates survive the ruling and the measurement.

### PR 1 — start the image when the pointer arrives, not when the box appears

`hover-preview.tsx` only. On `mouseenter`, kick off the image fetch immediately; keep the 240 ms
delay for the **box**. The browser's cache means the box then paints from a request that has been in
flight for up to 240 ms, rather than starting one.

Draws nothing different: same delay, same box, same image, same size, same position. The only change
is when the bytes start moving.

**Measured, three runs each way, cold cache, 1300×900** (the ~477 ms in the section above came from
an earlier, broken paint detector and is superseded by these):

| | before | after |
| --- | --- | --- |
| Pointer enter → painted | 441 / 445 / 434 ms — median **441** | 369 / 377 / 385 ms — median **377** |
| Fetch starts, relative to box mount | 45 / 48 / 46 ms before | 240 / 256 / 261 ms before |
| Waiting after the box appears | ~126 ms | ~47 ms |

**64 ms faster, −15%**, with no overlap between the two distributions, so the effect is larger than
run-to-run noise. The fetch leaves about 210 ms earlier. What matters more than the total is the last
row: the image has stopped being the thing the reader waits for once the box is up, and the ~47 ms
that remains is mostly the probe's own screenshot latency.

**Why not more.** The fetch is ~220 ms and the overlap window is 190 ms (240 ms delay minus the 50 ms
settle), so roughly 30 ms of fetch is still exposed. Preloading at 0 ms would close that, and would
also make a pointer brushing 99 rows request 99 images of 93 KB. The 50 ms settle buys the bound and
costs ~30 ms of the win; that trade is deliberate.

**The 240 ms delay is now the whole cost**, and it is a design decision (`OPEN_DELAY`, "what makes an
instant appearance calm rather than twitchy"). Shortening it would make the preview appear sooner and
is **not** this lane's call — it changes the feel of the surface, which Hugh's ruling excludes. Noted
for him rather than built.

Proof: `probe:image-timing` before and after at 1300, the figures above; the 390 run records the
documented desktop-only skip, because `(hover: hover)` gates the surface and no phone reader reaches
it. Two mutations, both confirmed failing: disabling the preload fails 3 unit cases, and removing the
50 ms settle fails the brushed-row case.

### PR 2 — preconnect to the image host

`src/app/layout.tsx` only: `<link rel="preconnect" href="https://cards.scryfall.io" crossOrigin="anonymous" />`.

This does **not** help hover — the connection is already warm by then. It helps the **first** image
of a page load, which today pays `dns 0.9 ms + tls 80.6 ms` inside the commander-art request. A
preconnect overlaps that handshake with the document and RSC fetch.

Draws nothing different: no markup a reader sees, no layout, no new request. Expected: ~80 ms earlier
first image on the deck page and on `/collection`.

Proof: CDP phases for the first Scryfall request on a cold context, before and after — `tlsMs`
should move from ~80 ms to null (reused) and the request should start sooner.

## What is written up instead of built

| Candidate | Why not |
| --- | --- |
| A different Scryfall size per surface | Every printing stores `normal` (488×680). The preview box is 252×352 CSS px, so `normal` is already right at DPR 2, and anything smaller is visibly softer — which the ruling excludes. `browse.ts` is also not this lane's file. |
| Modal art requested on press rather than after the details action | `card-modal.tsx` is contested tonight (swap-tools 4c, Locked). Deferred to the owning lane; the mechanism is the same as PR 1 and should win the same ~200 ms. |
| A Vercel/`next/image` proxy | Adds a hop to an already-CDN'd path. See the CDN table above. |
| Lean-first payload split | Net loss for images; would add a round trip before the hover can start. See above. |
| `facts`/`availability`/`price` deferral | Real payload weight, but deferring changes when a row's marks appear — outside this lane's ruling. |

## Done means

PR 1 and PR 2 merged, each with a before/after `probe:image-timing` figure in its body and a
mutation proving the probe measures the change; this doc merged with PR 1; `found` entries filed;
`the-99-d9` reported after the plan and after each merge.
