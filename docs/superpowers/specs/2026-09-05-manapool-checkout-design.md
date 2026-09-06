# Buy it at Mana Pool — design spec

Link-out from the builder to Mana Pool: one link that buys **a specific card**, and one that buys
**the whole shopping list** in a single hop.

This is the third and last layer of the price work. `printing_prices` shipped on PR #291, the buy
tag that renders it shipped on PR #312, and both stop at telling you what a card costs. Nothing in
the app yet takes you to the place that sells it. The shipped tag spec closed with the reason:

> The tag never becomes a link. `pointer-events: none` over card art, 9px at both densities, and
> the app's first link-out should not be an accident of density. A store link-out, if Product ever
> wants one, belongs in the export dialog as a deck-level action — named here, not drawn, and
> nothing in this pass depends on it.
> — `docs/superpowers/specs/2026-09-05-price-on-the-buy-tag-design.md:96`

This spec is that pass. It honours the ruling — the tag still is not a link — and it adds the
per-card half the ruling did not anticipate.

**Status.** Engineering scope only. The two link-out affordances are UI, so per `AGENTS.md` they are
gated on a design handoff. `design/design_handoff_the99_decks/` already owns both surfaces and is
audited Green, but neither affordance is drawn in it — what is missing is an addendum, not a
handoff. §7 says what that addendum has to cover. Nothing in §1–§5
may be built before that handoff has a READINESS verdict; §3 (the pure link module) is the one part
with no drawn surface and could land ahead of it, but shipping a helper with no caller is dead code,
so it waits too.

---

## 1. What ships

| # | Change | Files |
|---|---|---|
| 1 | `manapoolAddDeckUrl()` + `manapoolCardUrl()` — pure URL builders | new `src/lib/manapool/links.ts` |
| 2 | A buy-at-Mana-Pool action on the export dialog's Shopping tab | `src/components/decks/export-dialog.tsx` |
| 3 | A buy-at-Mana-Pool link in the shared card modal | `src/components/cards/card-modal.tsx` |
| 4 | Copy keys for both | `src/lib/copy/decks-builder.ts`, `src/lib/copy/collection-browse.ts` |
| 5 | The app's first outbound-link convention | `src/components/ui/external-link.tsx` (new) |

No new dependency, no new network call at request time, no new table, no new column — **and, after
the 2026-09-06 ruling in §2.2, no change to the price layer either.** An earlier draft of this table
carried a sixth row joining `buy_url` onto `PriceFact` and selecting it in `price-query.ts`. The card
link no longer reads a price row at all, so `src/lib/decks/price-query.ts` and
`src/lib/decks/price.ts` are untouched by this pass and the #288 work is left exactly as it shipped.

---

## 2. The two mechanisms, and how they were established

Both are documented properties of the Mana Pool Public API (`https://manapool.com/api/docs`), whose
standing was settled during the price ingest on 2026-09-05: twenty of its endpoints declare no
`security` scheme at all and the global `security` is unset, so the open set is deliberate; and the
site's anti-scraping clause governs "the Site or the App" and never mentions the API. That ruling is
not reopened here, and this pass does not lean on it hard in any case — it constructs two URLs and
lets the browser follow them. No request is made to Mana Pool by the app at all.

### 2.1 The list link — `/add-deck`

`components.schemas.deckCreateResponse.buy_url` in `https://manapool.com/api/docs/v1/openapi.json`
declares the format outright:

```
"description": "URL to buy the deck on ManaPool (only present when valid is true)",
"example": "https://manapool.com/add-deck?deck=MSBGaXJlYmFsbAoxIExpZ2h0bmluZyBCb2x0CjcgRm9yZXN0"
```

That parameter base64-decodes to `1 Fireball\n1 Lightning Bolt\n7 Forest` — a plain decklist. So the
URL is **constructible without calling the API at all**. The `/deck` endpoint that returns it only
validates Commander legality and is authenticated; the URL it hands back is not a token and carries
no session.

Probed against the live site on 2026-09-05, all returning HTTP 200 with the cards server-rendered
into a page titled *Mass Entry*:

| Probe | Result |
|---|---|
| A 3-line partial list, not a legal deck | Renders all three lines. Legality is not required. |
| 99 lines (2,108-char encoded parameter) | Renders. Well inside any browser or CDN URL ceiling. |
| `Fire // Ice`, `Atraxa, Praetors' Voice`, `Jötun Grunt`, `Æther Vial` | All four render byte-exact. |
| Bare names with no leading count | Accepted; no count rendered. |
| `N Name` with an explicit count | Count rendered beside the name. |
| A base64 payload containing `+` and `/`, percent-encoded | Round-trips exactly. |
| An unmatchable name (`Zzzznotacard Fakename`) | Line still renders; Mana Pool owns the mismatch in its own UI. |

**Confirmed in a real browser on 2026-09-06**, signed out, by
`scripts/probe-manapool-add-deck.mjs`. The table above is an HTTP-level read of the response body;
this is the page as a player meets it. The paste textarea arrives pre-filled, the right-hand panel
lists every card with its art, and the header reads **(5/5 in stock)** — `2 Æther Vial` becomes a
`2x` row rather than two rows, `Fire // Ice` resolves with no special handling, and `Æther Vial`
matches as *Aether Vial* because their own matcher folds the ligature. That last one is the reason
we send names exactly as our catalog holds them and normalise nothing.

**So no clipboard fallback is needed.** A "copy the list, then paste it yourself" path would only be
warranted if the deep link could not pre-populate; it does.

Three rulings follow.

**We send explicit counts, not bare names.** Bare names work, but `N Name` is the format their own
example uses, it is the format `buildDecklistText` already emits, and it is unambiguous if their
parser ever changes its default.

**We percent-encode the base64.** Standard base64 can contain `+` and `/`, and a raw `+` in a query
string is a space to most parsers. `encodeURIComponent` is the whole fix, and the table's
`+`-and-`/` row is its proof. Do not switch to base64url: the parameter is theirs, and the only
encoding observed to work is standard base64, percent-escaped.

**We do not resolve availability ourselves.** An unmatchable or out-of-stock line is Mana Pool's
Mass Entry page to explain, and it explains it better than we could — it has live inventory and we
have a weekly snapshot. This is the same honesty rule the buy tag ships under: absence is not free,
presence is not stocked now.

### 2.2 The card link — `/cards?q=<name>`, the all-printings grid

```
manapoolCardUrl(name) = `https://manapool.com/cards?q=${encodeURIComponent(name)}`
```

**Ruled 2026-09-06, replacing an earlier `buy_url` design.** Mana Pool has two card surfaces, and
they answer different questions. Probed in a browser by `scripts/probe-manapool-card-page.mjs`:

| URL shape | What the page is |
|---|---|
| `/cards?q=<name>` | **Every printing of the card**, one tile each with its own low price, over filters for Set, Foil, Condition, Artist, Seller and Availability, and a Price sort |
| `/card/<set>/<num>/<slug>` (`buy_url`'s shape) | **One printing**, listing that printing's sellers with conditions and Add-to-cart |
| `/card/<name-slug>` | The same all-printings grid as the first row, reached by a slug we would have to guess |

The grid is the right destination **because a recommendation in this app is an oracle card, not a
printing.** `src/lib/decks/price-query.ts:29` says so outright — a decklist row is an oracle card,
and the query joins through `printings.oracle_id` and picks one printing only to have a number to
show. Linking to that printing would present an internal tie-break (live before stale, real
non-foil before foil-only, then cheapest, then `scryfall_id`) as though it were a recommendation,
when what the player wants is to pick the printing they like or the cheapest one themselves.

The buy tag's price is unaffected and keeps naming the printing it actually measured. The tag says
what the cheapest live printing costs; the link opens the shelf that number came off.

**This removes work rather than adding it.** `buy_url` is fully populated (96,194 / 96,194 in local
dev) but is now never read, so `price-query.ts` and `price.ts` are untouched, and the single-card
`/add-deck` fallback that existed only to cover an unpriced production database is deleted along
with the reason for it. The card link no longer depends on `printing_prices` having any rows at all.

**Still rejected: deriving `/card/<name-slug>`.** It reaches the same grid, and `sol-ring`,
`atraxa-praetors-voice`, `jotun-grunt`, `fire-ice` and `aether-vial` all return 200 — but each is a
*guess* at slug rules (accents folded, `//` collapsed, apostrophes dropped, `Æ` → `ae`) inferred
from five samples of a rule we have never been shown. `?q=` takes the name exactly as our catalog
holds it and needs no rule.

**The evidence that guessing a card URL fails silently.** Probing a *constructed* printing URL,
`https://manapool.com/card/vow/238/ovika-enigma-goliath` returned **HTTP 200 serving Grolnok, the
Omnivore**. The slug segment is decorative; the set and collector number decide the card. A wrong
guess does not 404 — it shows a different card at full confidence, which is the worst failure mode
available and the reason no URL in this spec is constructed from anything but an exact string.

**What `?q=` costs.** It is a search, so a name that is a substring of other card names brings extra
tiles along, and the exact printing the tag priced is one click in rather than zero. Both were
accepted: an extra tile is legible, and the click is the browsing the player asked for. Verified
against `Ovika, Enigma Goliath`, `Atraxa, Praetors' Voice`, `Fire // Ice`, `Jötun Grunt` and
`Æther Vial` — all five land on the card, the last displayed as *Aether Vial* because Mana Pool's
matcher folds the ligature, exactly as Mass Entry does.

**No sort parameter is sent.** The grid's Best Selling / Popular / Release date / Price / Name
controls carry no `href`, so there is no documented sort parameter to set, and inventing one would
repeat the slug mistake. Price is one click on their page.

---

## 3. `src/lib/manapool/links.ts`

Pure, no `db` import, no React — testable the way `src/lib/decks/price.ts` is, and for the same
reason (`src/db/index.ts` throws at import time when `DATABASE_URL` is unset).

```ts
export const MANAPOOL_ADD_DECK_URL = "https://manapool.com/add-deck";
export const MANAPOOL_CARDS_URL = "https://manapool.com/cards";

/**
 * The all-printings grid for one card, by name — §2.2. Takes a name and nothing
 * else: the app recommends an oracle card, not a printing, and Mana Pool's own
 * search folds `Æ` and resolves `//` names, so nothing is normalised here.
 */
export function manapoolCardUrl(name: string): string {
  return `${MANAPOOL_CARDS_URL}?q=${encodeURIComponent(name)}`;
}

/** One `N Name` line per card, joined by newlines — the format Mana Pool's own
 *  `deckCreateResponse.buy_url` example uses. */
export function manapoolDeckText(cards: { name: string; quantity: number }[]): string {
  return cards.map((c) => `${c.quantity} ${c.name}`).join("\n");
}

/**
 * The Mass Entry deeplink. `deck` is standard base64 of the decklist text,
 * percent-escaped: standard base64 can contain `+`, and a raw `+` in a query
 * string decodes to a space.
 */
export function manapoolAddDeckUrl(cards: { name: string; quantity: number }[]): string | null {
  if (cards.length === 0) return null;
  const b64 = Buffer.from(manapoolDeckText(cards), "utf8").toString("base64");
  return `${MANAPOOL_ADD_DECK_URL}?deck=${encodeURIComponent(b64)}`;
}
```

**An empty list returns `null`, not a bare `/add-deck`**, so the decision "there is nothing to buy"
is made once, in the module, and every call site renders nothing by rendering `null`. This mirrors
the ruling `PriceStrip` ships under — the component declines to render on an empty list rather than
the call site guarding it — and it is the property row the design table must carry.

`Buffer` is a Node global and the builders run on the server (the export dialog receives the URL as
a prop). If a client-side caller is ever needed, the browser path is `btoa` over a
`TextEncoder`-produced binary string, because `btoa` throws on non-Latin-1 and `Jötun Grunt` is
non-Latin-1 in UTF-8. Do not reach for `btoa(text)` directly.

**Tests** (`links.test.ts`): the documented example reproduces byte-for-byte from
`1 Fireball / 1 Lightning Bolt / 7 Forest`; a name with `//`, an apostrophe and a diaeresis
round-trips through `decodeURIComponent` + base64-decode; an empty list returns `null`; a 99-card
list produces a URL under 4 KB. For `manapoolCardUrl`: a plain name; `Fire // Ice` (the slashes
escape rather than becoming path segments); `Æther Vial` (the ligature is percent-encoded, not
folded to `Ae` by us).

`manapoolCardUrl` is pure string work with no `Buffer`, so unlike the list link it is safe to call
from a client component.

---

## 4. Where the two links live

### 4.1 The list link — export dialog, Shopping tab

`src/components/decks/export-dialog.tsx` already is the deck-level action surface the tag spec
named: a modal on desktop and a bottom sheet on mobile, two tabs (Decklist / Shopping list), each
with **Copy** and **Download .txt**. The list link is a third action on the Shopping tab, beside
the two that exist.

Three shipped facts constrain how it is placed. Both buttons render at **both** breakpoints — the
second is labelled `.txt` on mobile and `Download .txt` on desktop (`export-dialog.tsx:514`) — so
neither footer has a full-width button. The footer already carries `borderTop: 1px solid var(--border)`
(`:493`), so any rule drawn above the link is the dialog's second. And the mobile sheet is a fixed
`height: 590` (`:123`), so a new row costs list rows rather than growing the sheet.

It is a link (`<a href>`), not a button — the destination is a URL, it should be middle-clickable
and copyable, and dressing a navigation as a button is the thing that makes `target="_blank"`
surprising.

**Scope ruling: the Shopping tab only.** The same helper would trivially give the Decklist tab a
"buy the whole deck" link, and the API's own naming (`deckCreateResponse`) suggests that is the
intended use. It is not in scope: Hugh asked to buy the shopping list, buying 99 cards you already
own is not a thing anyone wants, and adding it costs a design round for a surface no one requested.
Ruled out on 2026-09-06 (§8) — rejected, not deferred.

### 4.2 The card link — the shared card modal

`CardModal` (`src/components/cards/card-modal.tsx`) is already the app's one per-card detail
surface, reached two ways: the deck builder and the commander detail page wrap their trees in
`CardDetailProvider` (`src/components/decks/builder-shell.tsx:552`,
`src/components/commanders/detail.tsx:240`), while `/collection` mounts `CardModal` directly
(`src/components/collection/browser.tsx:446`). Both routes end at the same component, so one
insertion point still serves every surface in the app that shows a card.

That is also the only correct place. The buy tag cannot be it: the shipped spec forbids it, and the
reason is sound — the tag is 9px, sits under `pointer-events: none` over card art, and the tile
variant renders over a 92% scrim where a link's focus ring has nowhere to go. The decklist row
cannot be it either: rows already open the modal on click, and a nested link inside a
`role="button"` row is invalid, which `card-modal.tsx:93` records as an existing constraint.

The modal is reachable from the decklist row, so "buy this card" is two clicks from the buy tag that
priced it — row, then link — and zero new surfaces. The link takes the card's name and nothing else
(§2.2), so it renders identically whether or not that card has a price row, which is what lets it be
unconditional.

**The link renders for every card, owned or not** (ruled 2026-09-06). It is a per-card fact — this
card is purchasable at Mana Pool — not a shopping-list fact, so it carries no ownership condition
and Design draws one state, not two. The alternative was to mirror the buy tag's visibility rule and
show it only for shopping-list cards, which was rejected because the modal opens from three places
(`builder-shell.tsx:552`, `browser.tsx:446`, `detail.tsx:240`) and `/collection` holds nothing but
owned cards: the condition would make the same modal grow and lose an actions row depending on which
surface opened it, with no explanation visible to the player.

### 4.3 The outbound-link convention

This is the app's **first outbound link**: `grep -r 'target="_blank"' src/` returns zero hits. (A
bare `target=` grep is not the check — `role-counter-strip.tsx:100` passes an unrelated `target`
prop.) Rather than let two
call sites each invent one, a single `ExternalLink` sets it:
`target="_blank"`, `rel="noopener noreferrer"`, and an accessible name that says where it goes and
that it leaves the app. Both call sites use it. Its visual treatment is a design question, not an
engineering one — §7.

---

## 5. What the links carry

| Surface | Destination | What is sent |
|---|---|---|
| Export dialog, Shopping tab | `/add-deck?deck=` | `shoppingCards` — exactly the list the tab already previews and the price strip already sums — each as `${card.quantity} ${card.name}` |
| Card modal | `/cards?q=` | the card's name alone; no quantity, no set, no price |

The Shopping list is defined at `src/components/decks/decklist.tsx:51` — unowned, or owned but
over-committed, and never a basic land. The export dialog already receives that same array as
`shoppingCards`, so the link's scope is the tab's scope by construction and the two cannot disagree
on screen. This is the same rule the price strip ships under.

`quantity` is honest here without further arithmetic: only basic lands stack in this app
(`isBasicLand`, `src/lib/decks/grouping.ts:45`) and basics are excluded from Shopping, so every
shopping line is `1 Name` in practice — but the code sends `card.quantity` rather than a hardcoded
`1`, so it stays correct if the stacking rule ever widens to self-naming cards, which
`src/lib/decks/grouping.ts:64` explicitly anticipates.

---

## 6. What this pass does not do

- **No cart, no order, no checkout.** `/buyer/optimizer` and `/buyer/orders/pending-orders` are
  unauthenticated and would let us build a priced, seller-optimised cart server-side. They return
  inventory IDs and totals, not a URL a browser can be sent to, so using them means owning a cart
  UI, its staleness, and its failure modes. Out of scope, and probably out of scope permanently —
  Mass Entry already does this job on Mana Pool's side, with their live inventory.
- **No price shown on the link.** The buy tag and the price strip already say what things cost.
- **No new ingest, no schema change, and no price-layer change at all.** Neither link reads a
  price: the list link carries names and quantities, the card link carries a name. `price-query.ts`
  and `price.ts` are untouched, and the feed's `buy_url` is not surfaced — §2.2 explains why the
  grid beats the single printing it points at.
- **Nothing is normalised before it is sent.** Mana Pool's own matcher folds `Æ` and resolves `//`
  names (§2.1, §2.2), so a name-cleaning step here could only make matching worse.
- **No affiliate code, no referral parameter.** None was asked for and none exists.

---

## 7. Design handoff

Required before §4 is built. Two surfaces need drawing, and neither is drawn in any existing
handoff:

1. **Export dialog, Shopping tab** (`design/design_handoff_the99_decks/`) — a third action beside
   the shipped **Copy** and **Download .txt**. What weight does a link-out carry next to two local
   actions, and does it read as peer, primary, or quieter than both? It is the only control in the
   app that hands the player to another company.
2. **The shared card modal** — a per-card link, drawn once and unconditional per §4.2. Where it goes
   is part of the ask, and the two breakpoints are not symmetric: on mobile the content column simply
   ends, but on desktop `card-modal.tsx:513` already pins a `‹ Prev · N of M · Next ›` row outside
   the scrolling column, under its own `1px solid var(--border)` top rule. A link placed last in the
   scroll column would sit above a second hairline and scroll away from it. Mobile and desktop,
   across the six shipped themes (`src/lib/theme/themes.ts`). It lands on Mana Pool's all-printings
   grid, not on one printing (§2.2), which is worth knowing when the label is written: the player is
   being sent somewhere to choose, not to a pre-chosen listing.

Both need the app's first outbound-link treatment: whether an external-link glyph is drawn, whether
"Mana Pool" is named in the label, and what the visited/hover/focus states are. Engineering has
settled the mechanics (`target="_blank"`, `rel="noopener noreferrer"`, an accessible name that says
the link leaves the app); the marks are Design's.

The paste-ready handoff prompt is delivered in chat, not committed anywhere — it is a one-time cover
letter to Design, not a versioned artifact. The handoff it asks for is an addendum to
`design/design_handoff_the99_decks/`, which already owns both surfaces.

---

## 8. Questions, answered 2026-09-06

All four were put to Hugh and closed. Nothing here is open.

1. **Buy the whole deck as well? No — rejected, not deferred.** §4.1 scopes the link to the
   Shopping tab and the Decklist tab does not get one; its audience already owns the deck.
2. **Does the card link show for cards you already own? Yes, always** — §4.2 carries the reasoning.
3. **Where does the card link land? On the all-printings grid** — `/cards?q=<name>`, not a single
   printing. §2.2 carries the reasoning and the evidence; it also removes work, since no price row
   is read to build the link.
4. **Production pricing: Monday's scheduled run, deliberately not pulled forward.**
   `printing_prices` is empty in production, so every price surface from #288 renders bare there.
   Neither link in this spec is affected — both are built from names — but the buy tag beside them
   is. `PRICE_REFRESH_ENABLED` is already `true` and
   the scheduled run targets production by default (`github.event.inputs.target || 'production'`),
   so the next 09:00 UTC Monday fills it with no intervention. A manual dispatch was offered and
   declined: the scheduled run is wanted *as* the test of the production path, and staging carries
   the working data until then.
