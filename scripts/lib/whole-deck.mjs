// Pad a probe's fixture deck to a whole body with Wastes.
//
// Analysis runs only on a whole deck (ruling 1, Hugh 2026-09-23), so a probe that builds a
// 4-card fixture to reach a verdict is refused at the press. The padding is Wastes because it is
// colourless: a basic's type carries a colour identity, and Plains in a non-white deck is an
// off-identity card the legality notice (sub-project 9) will flag. Wastes moves no bracket fact
// and no colour fact, so the verdict the fixture was built for is the one it still reads.

/** Top `deckId` up from `built` to 99 (98 for a pair). `sql` is a neon tagged template. */
export async function padToWhole(sql, deckId, built, { partner = false } = {}) {
  const gap = (partner ? 98 : 99) - built;
  if (gap <= 0) return;
  const [wastes] = await sql`select oracle_id from cards where name = 'Wastes' limit 1`;
  if (!wastes) throw new Error("Wastes is not in this catalog, so a fixture cannot be built whole");
  await sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}, ${wastes.oracle_id}, ${gap})
    on conflict (deck_id, oracle_id) do update set quantity = deck_cards.quantity + excluded.quantity`;
}
