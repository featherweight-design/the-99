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
gated on a design handoff that does not exist yet. §7 carries the handoff prompt. Nothing in §1–§5
may be built before that handoff has a READINESS verdict; §3 (the pure link module) is the one part
with no drawn surface and could land ahead of it, but shipping a helper with no caller is dead code,
so it waits too.

---

## 1. What ships

| # | Change | Files |
|---|---|---|
| 1 | `manapoolAddDeckUrl()` + `manapoolCardUrl()` — pure URL builders | new `src/lib/manapool/links.ts` |
| 2 | `buyUrl` joins `PriceFact`; the price query selects `printing_prices.buy_url` | `src/lib/decks/price-query.ts`, `src/lib/decks/price.ts` |
| 3 | A **Buy at Mana Pool** action on the export dialog's Shopping tab | `src/components/decks/export-dialog.tsx` |
| 4 | A **Buy at Mana Pool** link in the shared card modal | `src/components/cards/card-modal.tsx` |
| 5 | Copy keys for both | `src/lib/copy/decks-builder.ts`, `src/lib/copy/collection-browse.ts` |
| 6 | The app's first outbound-link convention | `src/components/ui/external-link.tsx` (new) |

No new dependency, no new network call at request time, no new table, no new column.

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
| `Fire // Ice`, `Atraxa, Praetors' Voice`, `Jötun Grunt`, `Æther Vial` | All five render byte-exact. |
| Bare names with no leading count | Accepted; no count rendered. |
| `N Name` with an explicit count | Count rendered beside the name. |
| A base64 payload containing `+` and `/`, percent-encoded | Round-trips exactly. |
| An unmatchable name (`Zzzznotacard Fakename`) | Line still renders; Mana Pool owns the mismatch in its own UI. |

Two rulings follow from that table.

**We send explicit counts, not bare names.** Bare names work, but `N Name` is the format their own
example uses, it is the format `buildDecklistText` already emits, and it is unambiguous if their
parser ever changes its default.

**We percent-encode the base64.** Standard base64 can contain `+` and `/`, and a raw `+` in a query
string is a space to most parsers. `encodeURIComponent` is the whole fix and the last row of the
table is its proof. Do not switch to base64url: the parameter is theirs, and the only encoding
observed to work is standard base64, percent-escaped.

**We do not resolve availability ourselves.** An unmatchable or out-of-stock line is Mana Pool's
Mass Entry page to explain, and it explains it better than we could — it has live inventory and we
have a weekly snapshot. This is the same honesty rule the buy tag ships under: absence is not free,
presence is not stocked now.

### 2.2 The card link — `printing_prices.buy_url`, with `/add-deck` behind it

The price ingest already stores a per-card page URL, and it is fully populated: in local dev,
`select count(*), count(buy_url) from printing_prices` returns **96,194 / 96,194**. Sample:
`https://manapool.com/card/unh/116/ach-hans-run`. The query in `src/lib/decks/price-query.ts` simply
does not select the column today.

So a card link needs no new data — but it is only available for a card we hold a price row for, and
**production has never been priced** (only staging and local dev; carried over unresolved from the
#288 run). A card link that exists only where a price exists would be a link that never appears in
production.

The fallback closes that: a single-card `/add-deck` URL with one line. Same mechanism as §2.1, one
element in the list.

```
manapoolCardUrl(card) = card.price?.buyUrl ?? manapoolAddDeckUrl([{ name, quantity: 1 }])
```

**Rejected: deriving `https://manapool.com/card/<name-slug>`.** It works — `sol-ring`,
`atraxa-praetors-voice`, `jotun-grunt`, `fire-ice` and `aether-vial` all return 200, and a bad slug
honestly 404s. But every one of those is a *guess* at their slug rules (accents folded, `//`
collapsed, apostrophes dropped, `Æ` → `ae`), inferred from five samples of a rule we have never been
shown. `buy_url` is exact and `/add-deck` is documented; neither requires us to invent anything.

---

## 3. `src/lib/manapool/links.ts`

Pure, no `db` import, no React — testable the way `src/lib/decks/price.ts` is, and for the same
reason (`src/db/index.ts` throws at import time when `DATABASE_URL` is unset).

```ts
export const MANAPOOL_ADD_DECK_URL = "https://manapool.com/add-deck";

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
list produces a URL under 4 KB.

---

## 4. Where the two links live

### 4.1 The list link — export dialog, Shopping tab

`src/components/decks/export-dialog.tsx` already is the deck-level action surface the tag spec
named: a modal on desktop and a bottom sheet on mobile, two tabs (Decklist / Shopping list), each
with **Copy** and **Download .txt**. The list link is a third action on the Shopping tab, beside
the two that exist.

It is a link (`<a href>`), not a button — the destination is a URL, it should be middle-clickable
and copyable, and dressing a navigation as a button is the thing that makes `target="_blank"`
surprising.

**Scope ruling: the Shopping tab only.** The same helper would trivially give the Decklist tab a
"buy the whole deck" link, and the API's own naming (`deckCreateResponse`) suggests that is the
intended use. It is not in scope: Hugh asked to buy the shopping list, buying 99 cards you already
own is not a thing anyone wants, and adding it costs a design round for a surface no one requested.
Flagged in §8 rather than built.

### 4.2 The card link — the shared card modal

`CardModal` (`src/components/cards/card-modal.tsx`) is already the app's one per-card detail
surface, and the deck builder already wraps its whole tree in `CardDetailProvider`
(`src/components/decks/builder-shell.tsx:514`) — so does `/collection`
(`src/components/collection/browser.tsx:450`) and the commander detail page
(`src/components/commanders/detail.tsx:240`). One insertion point serves every surface in the app
that shows a card.

That is also the only correct place. The buy tag cannot be it: the shipped spec forbids it, and the
reason is sound — the tag is 9px, sits under `pointer-events: none` over card art, and the tile
variant renders over a 92% scrim where a link's focus ring has nowhere to go. The decklist row
cannot be it either: rows already open the modal on click, and a nested link inside a
`role="button"` row is invalid, which `card-modal.tsx:93` records as an existing constraint.

The modal is reachable from the decklist row, so "buy this specific card" is two clicks from the
buy tag that priced it — row, then link — and zero new surfaces.

### 4.3 The outbound-link convention

This is the app's **first outbound link**; a grep for `target=` returns nothing. Rather than let two
call sites each invent one, a single `ExternalLink` sets it:
`target="_blank"`, `rel="noopener noreferrer"`, and an accessible name that says where it goes and
that it leaves the app. Both call sites use it. Its visual treatment is a design question, not an
engineering one — §7.

---

## 5. What the links carry

| Surface | Cards sent | Quantity sent |
|---|---|---|
| Export dialog, Shopping tab | `shoppingCards` — exactly the list the tab already previews and the price strip already sums | `card.quantity` |
| Card modal | the one card | `1` |

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
- **No new ingest, no schema change.** `buy_url` is already a column and already populated.
- **No affiliate code, no referral parameter.** None was asked for and none exists.

---

## 7. Design handoff

Required before §4 is built. Two surfaces need drawing, and neither is drawn in any existing
handoff:

1. **Export dialog, Shopping tab** (`design/design_handoff_the99_decks/`) — a third action beside
   the shipped **Copy** and **Download .txt**. What weight does a link-out carry next to two local
   actions, and does it read as peer, primary, or quieter than both? It is the only control in the
   app that hands the player to another company.
2. **The shared card modal** — a per-card link, at all six breakpoint/theme combinations the modal
   already ships. The modal's existing chrome has no actions row.

Both need the app's first outbound-link treatment: whether an external-link glyph is drawn, whether
"Mana Pool" is named in the label, and what the visited/hover/focus states are. Engineering has
settled the mechanics (`target="_blank"`, `rel="noopener noreferrer"`, an accessible name that says
the link leaves the app); the marks are Design's.

The paste-ready handoff prompt, per the canonical six-section template, ships in this document's PR
body rather than here — it is an instruction to Design, not a record of the design.

---

## 8. Open questions

1. **Buy the whole deck as well?** §4.1 scopes the link to the Shopping tab. The Decklist tab could
   carry the same link for the full 100 cards at zero extra cost. Recommend no.
2. **Production pricing.** Carried over unresolved from #288: `printing_prices` is empty in
   production, so the card link will take the `/add-deck` fallback for every card there until a
   price refresh runs against it. The links work either way — this is not a blocker for this pass,
   but it is the second feature to ship degraded for the same reason.
