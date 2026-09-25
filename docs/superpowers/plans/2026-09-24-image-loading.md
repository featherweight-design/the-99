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
| Pointer enters → preview box mounts | **307–321 ms** | 240 ms `OPEN_DELAY` + ~70–80 ms dispatch and React render |
| Image request, wall clock | **~214 ms** | 93 KB (`normal`, 95,631 B), TTFB ~142 ms, HTTP/2 |
| Decode | **0.1–35 ms** | `img.decode()` on the same bytes |
| **Pointer enters → painted** | **441 ms** (median of 441 / 445 / 434) | the frame where the box stops being a flat colour |

The component figures are exact. The painted figure is an observation with a stated resolution:
screenshots cost ~70–100 ms each, so each run carries the gap between its last blank frame and its
first painted one.

An earlier draft of this document put this figure at "~477 ms, between 410 and 477". That came from a
paint detector which thresholded against its own maximum sample and therefore **could not report a
failed observation at all** — the pre-open review caught it, and the numbers here are from the
replacement, which refuses to locate a transition it has not demonstrated. The figures are not a
sum, either: the browser starts a background image as it parses the style, a few tens of ms before
the element becomes observable, so part of the fetch already overlapped the mount before any change.

**The ordering is the finding.** `hover-preview.tsx` sets `background: … url(…)` inside the state
update that `setTimeout(show, 240)` schedules. **The image request cannot begin until the 240 ms
delay has already elapsed.** Delay and fetch are strictly serial, and the reader waits for the sum.

Two more measurements bound what is worth building:

- **A second hover of the same card costs zero network requests.** `cache-control: public,
  max-age=31556952` works. All of the cost is the first look at a given card.
- **The connection is already open before any hover.** The deck page fetches commander art during
  page load, and that request pays the whole handshake: `dns ~1 ms`, `tls ~75 ms`, and **~145 ms of
  `connect` in total** — `connectMs` spans TCP *and* TLS, so the TLS figure is a component of it, not
  an alternative to it. (An earlier draft quoted only `dns 0.9 ms, tls 80.6 ms` here and ~145 ms
  elsewhere, which read as two different costs for one request.) By hover time that connection is
  warm, and the hover's own request pays neither DNS nor TLS.

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

**Measured, three runs each way, cold cache, 1300×900.** The headline is not a percentage — it is
that the blank box stops being observable at all.

| | before | after |
| --- | --- | --- |
| **First frame the probe can sample** | **4,675 bytes — blank** | **162,019 bytes — the card, already drawn** |
| Blank→painted transition | observed, at 441 / 445 / 434 ms | **never observed: there is no blank frame** |
| Fetch starts, relative to box mount | 45 / 48 / 46 ms before | 240 / 256 / 261 ms before |
| Time the box sits empty | ~126 ms | below the probe's resolution |

Before the change the box is demonstrably empty when it appears and fills ~126 ms later. After it,
the first screenshot the probe can take — roughly 50 ms after the box mounts, bounded by screenshot
cost — **already contains the card, in every run.**

**The exact painted time after the change is unobservable, and the doc says so rather than inventing
one.** Paint happens between the box mounting (~318–356 ms) and the first sample (~369–385 ms), so
the improvement is **at least 72 ms and at most ~123 ms**. An earlier draft of this plan quoted
"377 ms, −15%" as if measured; those figures came from a lenient paint detector that fired on the
first frame whatever it contained, so they were time-of-first-observation, not time-of-paint. The
detector now refuses to report a transition it did not see, which is why the after column reads
"never observed" instead of a flattering number.

**Why not more.** The fetch is ~220 ms and the overlap window is 190 ms (240 ms delay minus the 50 ms
settle), so some fetch is still exposed on a cold connection. Preloading at 0 ms would close that and
would also let a pointer brushing 99 rows request 99 images of 93 KB. The 50 ms settle buys the bound
and costs part of the win; that trade is deliberate.

**The 240 ms delay is now the whole cost** — and it stays. `OPEN_DELAY` is a design decision ("what
makes an instant appearance calm rather than twitchy"), and with the fetch hidden inside it, it is
the only thing left between the pointer and the card. It was put to Hugh with these figures.

> **SETTLED — Hugh, 2026-09-25: keep `OPEN_DELAY` at 240 ms.** Not to be revisited by this lane or
> reopened by a later one on the grounds that it is now the largest remaining number. Making the
> preview appear sooner means changing how the surface feels, which is a product call he has made.

Proof: `probe:image-timing` before and after at 1300, the figures above; the 390 run records the
documented desktop-only skip, because `(hover: hover)` gates the surface and no phone reader reaches
it. Two mutations, both confirmed failing: disabling the preload fails 3 unit cases, and removing the
50 ms settle fails the brushed-row case.

### PR 2 — preconnect to the image host — **TRIED AND WITHDRAWN**

Built, measured on two instruments, and withdrawn. It ships no behaviour change; only this section and
the `--first-image` probe mode that tested it.

`<link rel="preconnect" href="https://cards.scryfall.io">` in the root layout, aimed at the connection
setup the first card image pays on a page load. **It changes nothing.**

Three socket-cold runs per variant, first card image of the deck page at 1300, correlated to the
request that opened the connection:

| Variant | TLS | Connect total (TCP + TLS) |
| --- | --- | --- |
| No preconnect | 77.2 / 72.6 / 75.0 ms — mean **74.9** | 149.7 / 141.3 / 144.4 ms — mean **145.1** |
| `preconnect` | 72.6 / 76.3 / 74.8 ms — mean **74.6** | 142.6 / 151.0 / 145.1 ms — mean **146.2** |

The distributions overlap completely. The image request performs its own DNS and its own full TLS
handshake with the hint present, so the preconnected socket is not the one it uses.

**Two hypotheses tested and ruled out.**

*CORS mismatch.* A socket's pool key includes its CORS mode, and a CSS background image is a
**no-CORS** request — so `crossOrigin="anonymous"` would warm a connection the image never uses. Both
variants were measured. Without `crossOrigin` the figures are identical, so this is not the cause.

*The hint never reaching the browser.* Verified directly in the served HTML:
`curl | grep 'rel="preconnect"'` returns `rel="preconnect" href="https://cards.scryfall.io"`. It is
present.

**Why it does not work here is UNEXPLAINED, and this section will not invent a reason.** An earlier
draft asserted there was no idle time between parsing the hint and discovering the image. That was
wrong, and the pre-open review caught it: `/decks/[id]/loading.tsx` makes this route stream, so the
`<head>` flushes immediately while the commander art arrives after the page's data reads — hundreds of
milliseconds later. There is ample idle time; the preconnect simply does not appear to be used.
Settling it needs a browser net-log capture (`chrome://net-export`) showing whether Chromium opened
the speculative socket at all and what became of it. That is a follow-up, not a guess to write down
here.

**What this does and does not license.** It does not license "preconnect is useless" as a general
claim, and it does not license a proxy on speed grounds. What it establishes is narrow and measured:
on this app's card surfaces, adding this hint does not move the first image's handshake, so the ~145 ms
of setup is not reachable this way. The proxy remains recommended against on the added hop and on
per-source-image billing across 102,902 printings; its one unique benefit is connection reuse plus the
timing visibility that the missing `Timing-Allow-Origin` denies us, and the speed half of that is
bounded by this 145 ms, once per page load.

**The instrument needed three corrections before its numbers meant anything**, all found by the
pre-open review, and each one had produced a figure that flattered the conclusion:

- **Socket-cold, not merely cache-cold.** The first version signed in on `/` inside the same context
  and then navigated to the deck page. `/` draws commander art, so a connection to the image host
  could already be open before the page under test loaded — making every variant look reused. Sign-in
  now happens once and its cookies travel by `storageState`; each run gets a context that has never
  spoken to the image host.
- **The request that opened the socket, not the first response.** Several images can be requested at
  once over HTTP/2, and a sibling joining an already-opening connection reports `dnsStart: -1,
  sslStart: -1` — indistinguishable from a working preconnect. Requests are now ordered by
  `requestWillBeSent` and correlated by `requestId`. (This page turns out to issue exactly one image
  request, so it did not bite here — but it would on `/collection`.)
- **Real bytes.** `encodedDataLength` is only final at `loadingFinished`; passing 0 made every row
  claim a 0-byte fetch and made a disk-cache hit indistinguishable from a fresh one. Now 90 KB, which
  is also a useful cross-check that the request measured is a card image.

An earlier version of this section quoted a third variant's TTFB of 154.5 ms alongside two of ~74 ms
and still called the figures identical. That sample sat within 0.4 ms of its own run's connect total,
so it was almost certainly a transposition; it came from the flawed instrument and is superseded by
the table above.

**Kept:** `pnpm probe:image-timing --first-image`. A negative result is only durable if the next person
can re-run it in one command — and this one took two instruments to establish, so the instrument is
the more valuable half.

## What is written up instead of built

| Candidate | Why not |
| --- | --- |
| A different Scryfall size per surface | Every printing stores `normal` (488×680). The preview box is 252×352 CSS px, so `normal` is already right at DPR 2, and anything smaller is visibly softer — which the ruling excludes. `browse.ts` is also not this lane's file. |
| Modal art requested on press rather than after the details action | `card-modal.tsx` is contested tonight (swap-tools 4c, Locked). Deferred to the owning lane; the mechanism is the same as PR 1 and should win the same ~200 ms. |
| A Vercel/`next/image` proxy | Adds a hop to an already-CDN'd path. See the CDN table above. |
| Lean-first payload split | Net loss for images; would add a round trip before the hover can start. See above. |
| `facts`/`availability`/`price` deferral | Real payload weight, but deferring changes when a row's marks appear — outside this lane's ruling. |

## Done means

PR 1 merged with a before/after `probe:image-timing` figure and a mutation proving the probe measures
the change — done (#969). PR 2 attempted, measured, and **withdrawn on its own evidence**: the
preconnect moves no figure, and a line of markup that changes nothing has no reason to exist. Its
disproof and the probe mode behind it ship here. `found` entries filed; `the-99-d9` reported after the
plan and after each outcome.
