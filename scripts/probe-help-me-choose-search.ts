// Help me choose's search (PR 2), proved against a real Postgres by calling the real loaders.
//
// WHAT ONLY A DATABASE CAN ANSWER HERE. Every rule `rankCandidates` applies is pure and unit
// tested. What is not is whether `searchCommanders` gathered the facts those rules read: the
// candidate WHERE, the tag slice, the card's inclusion, the owned-support count, the flags, the
// prices and the combo join. A loader that read nothing would hand the rules empty facts, and
// every unit test would still pass.
//
//   THE CANDIDATES are commander-legal, indexed and unbuilt, owned and unowned together: a
//   commander this player has a deck for is absent, and the list holds both kinds.
//   OWNED SUPPORT is the no-theme order's figure, counted in SQL. It must equal what the
//   /commanders scorer computes for the same commander, `supportOverlap` over the support list and
//   the owned pool, or this lane restates a rule and drifts from it.
//   A THEME answer returns only commanders backing it, each with its share, weakest-first order
//   intact; a CARD answer only commanders whose decks run it.
//   THE BRACKET filter drops every Game Changer commander at bracket 2.
//   THE FREE MATCH finds a real card and a real theme in a sentence.
//   TOO NARROW is raised on a real narrow ask and names what each answer removes.
//
// It makes NO WRITES. `PROBE_USER_ID` names the account; the default is the local-dev fixture
// account, which owns a full collection and several decks.
//
//   pnpm probe:help-me-choose-search
import { requireEnv } from "./lib/env.mjs";
import { sql } from "drizzle-orm";

requireEnv(["DATABASE_URL"]);

const USER = process.env.PROBE_USER_ID ?? "user_3GjLj0ERZEQ7EeycFp57vRdQPub";

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

async function main() {
  const { db } = await import("../src/db");
  const { loadPhraseIndex, loadThemeVocabulary, searchCommanders } = await import("../src/lib/intake/search");
  const { matchWords } = await import("../src/lib/intake/match");
  const { TOO_NARROW_BELOW } = await import("../src/lib/intake/vocabulary");
  const { loadSupportLists } = await import("../src/lib/edhrec/support-read");
  const { supportOverlap } = await import("../src/lib/edhrec/support-overlap");
  const { commanderPool } = await import("../src/lib/recs/score");
  const none = { colors: [], match: "contains" as const, themes: [], card: null, budgetDollars: null, bracket: null };
  const rows = async <T>(q: ReturnType<typeof sql>) => (await db.execute(q)).rows as T[];

  console.log("\n1. The vocabulary and the free match");
  const vocab = await loadThemeVocabulary();
  check("the vocabulary is not empty, and every theme clears the floor", vocab.length > 0 && vocab.every((t) => t.commanders >= TOO_NARROW_BELOW),
    `${vocab.length} themes, narrowest ${vocab.at(-1)?.commanders}`);
  const theme = vocab[0];
  const index = await loadPhraseIndex(vocab);
  const matched = matchWords(`I want ${theme.label.toLowerCase()} with Sol Ring, under $150`, index);
  const basics = matchWords("Snow-Covered Forest and Forest", index);
  check("no basic land, a snow basic included, is ever a build-around card", basics.chips.every((c) => c.kind !== "card"),
    JSON.stringify(basics.chips));
  check("a sentence yields its theme, its card and its budget", JSON.stringify(matched.chips.map((c) => c.kind)) === '["theme","card","budget"]',
    JSON.stringify(matched.chips));

  console.log("\n2. The candidates and the no-theme order");
  const all = await searchCommanders(USER, none);
  const built = await rows<{ id: string }>(sql`
    select distinct commander_oracle_id as id from decks where user_id = ${USER} and commander_oracle_id is not null`);
  const listed = new Set(all.rows.map((r) => r.candidate.oracleId));
  check("a commander this player has built is not listed", built.length > 0 && built.every((b) => !listed.has(b.id)),
    `${built.length} built, ${built.filter((b) => listed.has(b.id)).length} listed`);
  const ownedRows = all.rows.filter((r) => r.candidate.owned).length;
  check("owned and unowned commanders are listed together", ownedRows > 0 && ownedRows < all.rows.length, `${ownedRows} owned of ${all.rows.length}`);
  check("with no theme and no card the order is owned support", all.order === "owned"
    && all.rows.every((r, i) => i === 0 || all.rows[i - 1].candidate.ownedSupport >= r.candidate.ownedSupport), `order ${all.order}`);

  // Through the scorer's own `commanderPool`, so its identity rule is read rather than restated,
  // over the top 25 and every colorless commander listed, since a colorless commander is the one
  // whose support list most carries cards outside its identity.
  const collection = await rows<{ oracle_id: string; name: string; color_identity: string[] }>(sql`
    select distinct c.oracle_id, c.name, c.color_identity from collection_items ci join cards c on c.oracle_id = ci.oracle_id
    where ci.user_id = ${USER}`);
  const owned = collection.map((c) => ({ oracleId: c.oracle_id, name: c.name, colorIdentity: c.color_identity }));
  const sample = [...all.rows.slice(0, 25), ...all.rows.filter((r) => r.candidate.colorIdentity.length === 0).slice(0, 5)]
    .map((r) => r.candidate);
  const lists = await loadSupportLists(sample.map((c) => c.oracleId));
  const drift = sample.flatMap((c) => {
    const list = lists.get(c.oracleId);
    const overlap = list ? supportOverlap(list, commanderPool(c, owned as never)).oracleIds.length : 0;
    return overlap === c.ownedSupport ? [] : [`${c.name}: search ${c.ownedSupport}, scorer ${overlap}`];
  });
  check("owned support equals the scorer's supportOverlap over commanderPool", drift.length === 0 && sample.some((c) => c.colorIdentity.length === 0),
    drift.length === 0 ? `${sample.length} commanders agree, ${sample.filter((c) => c.colorIdentity.length === 0).length} colorless` : drift.join("; "));

  console.log("\n3. A theme and a card");
  const byTheme = await searchCommanders(USER, { ...none, themes: [theme.slug] });
  check(`a theme answer returns only commanders backing ${theme.label}`, byTheme.rows.length >= TOO_NARROW_BELOW
    && byTheme.rows.every((r) => r.themeFits[0].share > 0), `${byTheme.rows.length} rows`);
  check("the rows are in fit order", byTheme.rows.every((r, i) => i === 0 || byTheme.rows[i - 1].themeFits[0].share >= r.themeFits[0].share),
    `top ${byTheme.rows[0]?.candidate.name} at ${byTheme.rows[0]?.themeFits[0].share.toFixed(3)}`);
  const [solRing] = await rows<{ oracle_id: string }>(sql`select oracle_id from cards where name = 'Sol Ring'`);
  const byCard = await searchCommanders(USER, { ...none, card: solRing.oracle_id });
  check("a card answer returns only commanders whose decks run it", byCard.rows.length > 0
    && byCard.rows.every((r) => (r.cardFit ?? 0) > 0), `${byCard.rows.length} rows, top ${byCard.rows[0]?.cardFit?.toFixed(3)}`);
  // The card's figure and a theme's are compared (the weaker orders the row), so both must be
  // shares. EDHREC stores inclusion as a percentage; read raw it outranks every theme.
  check("a card's fit is a share, on the same scale as a theme's", byCard.rows.every((r) => (r.cardFit ?? 0) <= 1),
    `largest ${Math.max(...byCard.rows.map((r) => r.cardFit ?? 0)).toFixed(3)}`);
  const both = await searchCommanders(USER, { ...none, themes: [theme.slug], card: solRing.oracle_id });
  const weakest = (r: (typeof both.rows)[number]) => Math.min(r.themeFits[0].share, r.cardFit ?? 1);
  check("a theme and a card together order by the weaker figure", both.rows.length > 1
    && both.rows.every((r, i) => i === 0 || weakest(both.rows[i - 1]) >= weakest(r)), `top ${both.rows[0]?.candidate.name}: theme ${both.rows[0]?.themeFits[0].share.toFixed(3)}, card ${both.rows[0]?.cardFit?.toFixed(3)}`);

  console.log("\n4. The bracket");
  const gcCount = all.rows.filter((r) => r.candidate.gameChanger).length;
  const b2 = await searchCommanders(USER, { ...none, bracket: 2 });
  check("bracket 2 drops every Game Changer commander", gcCount > 0 && b2.rows.every((r) => !r.candidate.gameChanger)
    // An extra-turn commander breaks bracket 1 only, so bracket 2 keeps it; mass land denial does not.
    && b2.rows.length === all.rows.filter((r) => !r.candidate.gameChanger && !r.candidate.massLandDenial).length,
    `${gcCount} Game Changer commanders; ${all.rows.length} → ${b2.rows.length}`);

  console.log("\n5. Too narrow");
  const narrowTheme = vocab.at(-1)!;
  const narrow = await searchCommanders(USER, { ...none, themes: [narrowTheme.slug], colors: ["W", "U", "B", "R", "G"], match: "exactly" });
  check("a narrow ask is named, with what each answer removes", narrow.rows.length < TOO_NARROW_BELOW && narrow.tooNarrow !== null
    && narrow.tooNarrow.without.length === 2, `${narrow.rows.length} rows; ${JSON.stringify(narrow.tooNarrow?.without)}`);
  // Five colors exactly and five colors with others allowed are the same ask (there is no sixth
  // color), so no widen may be offered: offering one would promise commanders it cannot bring.
  check("a widen that admits no one more is not offered", narrow.tooNarrow?.widen === null, JSON.stringify(narrow.tooNarrow?.widen));
  const mono = await searchCommanders(USER, { ...none, themes: [narrowTheme.slug], colors: ["G"], match: "exactly" });
  check("a widen, when offered, admits more than the exact ask", mono.tooNarrow?.widen == null || mono.tooNarrow.widen.count > mono.rows.length,
    `${mono.rows.length} exact, widen ${JSON.stringify(mono.tooNarrow?.widen)}`);

  console.log("\n6. The page the screen draws");
  const { loadCardChip, loadResultsPage, RESULT_PAGE } = await import("../src/lib/intake/rows");
  const { loadIntakeCatalog } = await import("../src/lib/intake/search");
  const first = await loadResultsPage(USER, none);
  const second = await loadResultsPage(USER, none, RESULT_PAGE);
  check("a blank ask ships one page of rows, and says more exist", first.rows.length === RESULT_PAGE && first.hasMore,
    `${first.rows.length} rows, hasMore ${first.hasMore}, of ${all.rows.length}`);
  check("the next page continues the same order", second.rows[0]?.oracleId === all.rows[RESULT_PAGE]?.candidate.oracleId,
    `${second.rows[0]?.name} against ${all.rows[RESULT_PAGE]?.candidate.name}`);
  check("every row carries the support total it is counted against", first.rows.every((r) => r.supportTotal >= r.ownedSupport && r.supportTotal > 0),
    first.rows.slice(0, 3).map((r) => `${r.ownedSupport}/${r.supportTotal}`).join(", "));
  check("every row has art to draw", first.rows.every((r) => r.imageUri !== null), `${first.rows.filter((r) => !r.imageUri).length} without`);
  const marks = [...first.rows, ...second.rows].map((r) => r.mark.kind);
  check("rows carry the commander's own mark", marks.every((k) => k === "free" || k === "held" || k === "buy"),
    JSON.stringify(Object.fromEntries(["free", "held", "buy"].map((k) => [k, marks.filter((m) => m === k).length]))));
  const markedOwned = [...first.rows, ...second.rows].filter((r) => r.mark.kind !== "buy").map((r) => r.oracleId);
  const [{ n: ownedCount }] = markedOwned.length === 0 ? [{ n: 0 }] : await rows<{ n: number }>(sql`
    select count(distinct oracle_id)::int as n from collection_items where user_id = ${USER} and oracle_id = any(${sql.param(markedOwned)}::uuid[])`);
  check("an owned mark is only ever on a commander the player owns", ownedCount === markedOwned.length, `${ownedCount} of ${markedOwned.length}`);
  const byCardPage = await loadResultsPage(USER, { ...none, card: solRing.oracle_id });
  check("a card ask returns the card's own facts", byCardPage.card?.oracleId === solRing.oracle_id, JSON.stringify(byCardPage.card));
  const stale = await searchCommanders(USER, { ...none, card: "00000000-0000-4000-8000-00000000dead" });
  check("a card that no longer exists is dropped: the owned order, and no card facts", stale.order === "owned" && stale.card === null,
    `order ${stale.order}, card ${JSON.stringify(stale.card)}`);
  const [forest] = await rows<{ oracle_id: string }>(sql`select oracle_id from cards where name = 'Forest'`);
  const basic = await searchCommanders(USER, { ...none, card: forest.oracle_id });
  check("a basic land is no build-around card, whatever the URL says", basic.order === "owned" && basic.card === null,
    `order ${basic.order}, card ${JSON.stringify(basic.card)}`);
  // The chip reads the search's own card rule: a card the search drops draws no chip either, or
  // *We read this as* would name an answer the results never used.
  const [basicChip, solChip] = [await loadCardChip(USER, forest.oracle_id), await loadCardChip(USER, solRing.oracle_id)];
  check("the answer chip drops the card the search drops, and names one it keeps",
    basicChip === null && solChip?.name === "Sol Ring", `basic ${JSON.stringify(basicChip)}, Sol Ring ${solChip?.name ?? "null"}`);
  check("and the owned order it falls back to still carries its support counts",
    JSON.stringify(basic.rows.slice(0, 5).map((r) => [r.candidate.oracleId, r.candidate.ownedSupport]))
      === JSON.stringify(all.rows.slice(0, 5).map((r) => [r.candidate.oracleId, r.candidate.ownedSupport])),
    basic.rows.slice(0, 3).map((r) => `${r.candidate.name} ${r.candidate.ownedSupport}`).join(", "));
  const [a, b] = [await loadIntakeCatalog(), await loadIntakeCatalog()];
  check("the catalog is read once and kept", a === b && a.themes.length === vocab.length, `${a.themes.length} themes`);
}

main()
  .catch((e) => {
    console.error(e);
    failures += 1;
  })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
    setTimeout(() => process.exit(), 100).unref();
  });
