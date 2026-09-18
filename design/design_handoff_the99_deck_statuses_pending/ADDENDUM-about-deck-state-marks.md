# About page — amendment for the deck-state marks

`design_handoff_the99_deck_statuses_pending/` · R4

Two marks on the deck status pill, on two axes:

- **the plate** — tinted for a deck with a committed v1, `--bg` (unfilled, still opaque) for a deck
  that has never been committed. A plan rather than a deck.
- **a 2px `--fg` left rule** — a real deck whose list differs from its version, with the change
  count in the detail row.

They are mutually exclusive by definition: the rule needs a version, the unfilled plate means there
is none. The About page must account for both.

**It is an amendment, not an entry.** The count stays at **33**, chapter 03 and chapter 04 keep
their counts, no `NEW` plate is spent, and `since` stays `1` on both touched entries. An amendment
to a shipped entry is not news a returning reader has to be shown.

---

## Where it goes: `versions`, not `statuses`

| | `statuses` (ch. 04) | `versions` (ch. 03) |
|---|---|---|
| Teaches | the six values | the draft / commit model |
| Keys today | **4 — at the template cap** | 2 |
| Fit | neither mark is a status; a key line there restates the seventh-value mistake in prose, and there is no room that would not cost a status its line | both marks answer *is this list the version?* — this entry's own question, one scale up |

So the key line lands on `versions`, and `statuses` gets one clause in its **caption** — never a
fifth key, because the four keys *are* the six values and the whole point is that neither mark is
one of them.

## The exact deltas to `about · copy strings.ts`

### 1 · `versions` — one key appended (2 → 3)

```
keys: [
  'the draft is reviewable before it lands: every add and cut beside the committed list, with nothing counted twice.',
  'a version carries its own record, so you can see whether a change helped rather than only that it happened.',
+ 'a deck you have never committed shows an unfilled status badge wherever it is listed — it is a plan, not a deck yet. Once you commit v1 the badge fills in, and a bright edge appears whenever the list drifts from the version again.',
],
```

One key line covers **both** marks, because they are two readings of one question: is this list the
version? The unfilled badge is the phase, the bright edge is the drift, and a reader meets them in
that order — which is also the order a deck lives them.

"unfilled" and "a bright edge", not "a `--bg` plate" or "an `--fg` rule": the page's voice names
what a reader sees, and both inks are tokens whose values differ per theme. "wherever it is listed"
covers `/decks`, Home's resume rows and the deck header in one clause — the page names routes in the
`route` field, not in prose.

### 2 · `statuses` — one sentence appended to `caption`

```
+ An unfilled badge belongs to a deck you have never committed — a plan rather than a deck. A filled badge with a bright left edge is a real deck you have edited since its last version. Neither is a seventh status.
```

It states the two boundaries, which is the only thing this entry needs to say about either mark.
Its own four key lines are untouched.

## The figure

`versions` is a **plate** entry, so its specimen has room. The added specimen is one `Complete`
badge in all three readings — unfilled, filled, then filled with the rule and `36 changes since v2`
beneath it — inside the entry's existing figure block. No new object, no second plate, and the
entry's height grows by one row.

Drawn on the R4 canvas (`4a`) of `design_handoff_the99_deck_statuses_pending/`.

## What is deliberately not touched

- **`resume`'s caption** — "The keyline on the left is the deck's status in the same six colours as
  its badge" stays true: both marks are on the pill, not on the keyline.
- **The `NEW` plate and `ABOUT_VERSION`.** Neither moves. A returning reader is told about new
  *entries*; a sentence added to one they have already read is not a notification.
- **Chapter counts and the index.** Unchanged, both of them, because no entry was added.
