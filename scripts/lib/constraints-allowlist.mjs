// Over-long constraint names that are ALREADY APPLIED, and stay as they are.
//
// A row here says "Postgres has already truncated this one and it collides with nothing", and
// never "an over-long name is fine". Renaming an applied constraint means an `ALTER TABLE …
// RENAME CONSTRAINT` against every live database for no behavioural gain, which is a worse
// trade than the name being ugly.
//
// TWO THINGS THIS FILE CANNOT EXCUSE, deliberately:
//
//  · A COLLISION. Never allowlisted, on any migration, applied or not — it is the fatal case,
//    and an applied one would mean the migration never ran successfully in the first place.
//  · A NEW over-long name. Anything not listed here fails, so the moment to rename is while
//    the migration is still unmerged and regenerating it is free.
//
// Keyed by the exact name, so a later migration reusing the pattern on a different table is
// reported rather than silently inheriting the exemption.

export const APPLIED_LONG_NAMES = new Map([
  [
    "collection_items_user_id_oracle_id_set_code_collector_number_finish_pk",
    "0008 · 70 bytes. The only constraint on collection_items whose name starts this way.",
  ],
  [
    "commander_support_cards_commander_oracle_id_commander_support_commander_oracle_id_fk",
    "0012 · 84 bytes. commander_support_cards' primary key is named for different columns, so the two do not share a 63-byte prefix.",
  ],
  [
    "spellbook_variant_cards_variant_id_spellbook_variants_variant_id_fk",
    "0041 · 67 bytes. The sibling FK on that table names oracle_id and diverges at byte 40.",
  ],
]);
