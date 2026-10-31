-- One-off data fix (owner's request, 2026-10-30): offer Re-analyze on four production decks whose Overviews
-- were written before that day's Overview changes. Touches no cards, credits or model calls here; each
-- Re-analyze press afterwards is an ordinary paid write (one credit) that is the owner's to make.
-- `dirty` raises the stale banner (until the press, declarations refuse "stale" and Notices read the reading as
-- stale, as after an edit). Prefixing every Overview row on the deck's current list fingerprint makes the press
-- write a new Overview instead of reusing one on file (src/lib/synopsis/generate.ts). Scoped by deck id, and
-- idempotent. Matches 0 rows on any database that does not hold these four production decks.
-- Reversal, valid only while the owner has neither pressed nor edited these decks: strip the 19-character
-- prefix where it is present, and clear `dirty` only on profiles whose fingerprint still equals the stripped one.
UPDATE "deck_synopses" AS s SET "fingerprint" = 'reanalyze-20261030:' || s."fingerprint"
FROM "deck_profiles" AS p
WHERE p."deck_id" = s."deck_id"
  AND s."fingerprint" = p."fingerprint"
  AND s."deck_id" IN (
    '13a6dc28-958c-4591-a2bb-c0297bbe5d92',
    'fc97e49c-a2f3-4944-8436-3df8db102bd5',
    '7284ff0a-6e76-4dc0-8af5-fc630a403b2b',
    '4e5854f2-0d87-4d71-8b94-ffd40c79cb45'
  );--> statement-breakpoint
UPDATE "deck_profiles" SET "dirty" = true
WHERE "deck_id" IN (
  '13a6dc28-958c-4591-a2bb-c0297bbe5d92',
  'fc97e49c-a2f3-4944-8436-3df8db102bd5',
  '7284ff0a-6e76-4dc0-8af5-fc630a403b2b',
  '4e5854f2-0d87-4d71-8b94-ffd40c79cb45'
) AND "dirty" = false;
