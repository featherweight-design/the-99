// Deletes the overview rows a probe's press wrote on a deck (every `deck_synopses` row not in `before`),
// with their ledger units, so the account keeps its credits and a re-run presses the same deck from the same
// state. ONE statement: the rows and their units go together or not at all. Two statements commit apart, and a
// failure between them leaves a spent unit that no retry can find, since the row naming it is gone.
// Returns the number of ledger units deleted.
export async function dropWrittenOverviews(sql, deckId, before) {
  const gone = await sql`
    with rows as (
      delete from deck_synopses where deck_id = ${deckId} and not (id = any(${before}::uuid[]))
      returning model_call_id
    )
    delete from model_calls where id in (select model_call_id from rows where model_call_id is not null)
    returning id`;
  return gone.length;
}
