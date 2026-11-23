// probe:store-commander-change — store UI-3c-2: the Change commander candidates price a commander to buy at the
// reader's store, not Mana Pool. A loader probe, not a browser press: the sheet draws `halves[].price` as it comes.
// Read only. Fails on main: `loadChangeCandidates` priced from Mana Pool whatever the store.
//
// FIXTURE: a scratch branch of local-dev with TCGplayer store prices; PROBE_USER owns decks whose candidates include
// commanders to buy (scratch-58-store-cards: the audit account). DATABASE_URL is that branch's.
//
//   PROBE_USER=<clerk user id> PROBE_DECKS=<uuid,uuid,...> pnpm probe:store-commander-change
const USER = process.env.PROBE_USER;
const DECKS = (process.env.PROBE_DECKS ?? "").split(",").filter(Boolean);
if (!USER || DECKS.length === 0) throw new Error("Set PROBE_USER and PROBE_DECKS.");
const { loadChangeCandidates } = await import("../src/lib/commander-change/candidates");

const figures = (c: Awaited<ReturnType<typeof loadChangeCandidates>>) =>
  new Map((c?.toBuy ?? []).flatMap((x) => x.halves.filter((h) => h.price).map((h) => [h.oracleId, h.price!.cents] as const)));

let compared = 0;
let wrong = 0;
for (const deck of DECKS) {
  const mana = figures(await loadChangeCandidates(deck, USER, "manapool"));
  const tcg = figures(await loadChangeCandidates(deck, USER, "tcgplayer"));
  for (const [id, cents] of tcg) {
    const m = mana.get(id);
    if (m === undefined) continue;
    compared += 1;
    if (cents === m) wrong += 1;
  }
}
const ok = compared > 0 && wrong < compared;
console.log(`${ok ? "PASS" : "FAIL"}  to-buy commanders priced at TCGplayer differ from Mana Pool  (${compared} compared, ${wrong} equal)`);
process.exit(ok ? 0 : 1);
