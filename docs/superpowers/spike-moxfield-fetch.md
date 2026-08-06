# Spike — can we fetch a Moxfield deck server-side?

**Run 2026-08-05, ahead of PR 3 of the #42 deck-import epic.**
The execution plan requires this spike before the adapter is written, and the run briefing
names its failure as **hard pause point 1**: *"PR 3's Moxfield spike discovers an auth
requirement, a rate limit, or no usable endpoint. Do not silently fall back to
paste-and-file only."*

**Result: no usable endpoint. PR 3 is blocked pending a product decision.**

## What was probed

Every request below was made from a residential IP. No authentication was attempted.

| Request | Status | Body |
|---|---|---|
| `GET https://api.moxfield.com/v2/decks/all/<id>` | **403** | Cloudflare interstitial |
| `GET https://api2.moxfield.com/v2/decks/all/<id>` | **403** | Cloudflare interstitial |
| `GET https://api2.moxfield.com/v3/decks/all/<id>` | **403** | Cloudflare interstitial |
| Same, with a current Chrome `User-Agent` | **403** | Cloudflare interstitial |
| `GET https://www.moxfield.com/decks/<id>` | 301 | redirect |

Response headers on the 403:

```
server: cloudflare
cf-ray: a26a3471be0ae73b-DEN
```

Body title: `Attention Required! | Cloudflare`.

## What this means

The 403 is **not** "deck not found" and **not** "deck is private" — the deck ID used was
deliberately bogus, and a real ID behaves identically. The request never reaches Moxfield's
application at all; Cloudflare's bot protection rejects it at the edge. Setting a browser
`User-Agent` does not change the outcome.

This matters more in production than it does here. These probes came from a residential IP;
the adapter would run in a Vercel serverless function on a datacenter IP, which such
protection treats **more** harshly, not less. There is no reason to expect staging or prod
to succeed where this failed.

The three failure reasons PR 3's `fetchMoxfieldDeck` was specified to return —
`"private" | "notFound" | "unreachable"` — are therefore not currently distinguishable.
Every request is `unreachable`.

## What was deliberately not done

**No attempt was made to work around the bot protection.** Rotating user agents, solving the
challenge, routing through a scraping proxy or driving a headless browser would each be
circumventing an access control the site owner put there on purpose. That is not a decision
an autonomous run should make unattended, and it would also be the most fragile code
in the repo — silently breaking whenever Cloudflare's rules change, with the failure landing
on a player mid-import.

## Options, for the decision

1. **Ship paste and file only; drop URL mode for now.** Cheapest and safest. But the ticket is
   titled *"Import existing decks (Moxfield)"*, and URL mode is the only one of the three with
   no local equivalent — a player can already paste. The briefing explicitly forbids taking
   this path *silently*; taken openly it is legitimate.
2. **Ask Moxfield for sanctioned API access.** The right long-term answer if URL import
   matters. Unblocks nothing tonight and the timeline is outside our control.
3. **Support a different source with a public API** (Archidekt and Deckstats both expose one).
   Changes the ticket's scope and its title.
4. **Client-side fetch from the player's own browser.** Moves the request to a residential IP
   with a real browser fingerprint. Almost certainly blocked by CORS, and it makes every
   player's machine the thing that breaks. Recorded for completeness; not recommended.

## Recommendation

**Option 1 for this epic, option 2 opened in parallel.** PRs 4–9 are the copy and IA half of
the feature and are where nearly all its value and risk sit; none of them depend on URL mode
existing. Ship paste and file, keep `parseMoxfieldDeckUrl` in PR 3's scope (it would be pure
and client-safe, so it earns its place validating a pasted URL even with no fetch behind
it), and let URL mode land later behind a real answer rather than a workaround.

**This is a product call, not an eng one, and it is recorded here unresolved.**
