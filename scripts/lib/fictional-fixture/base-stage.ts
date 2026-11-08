// The base stage: purge, then write the whole fictional account through the app's own writes where the app has them.
import { assembleOwned, assignPrintings, collectionFingerprint, type OwnedRow } from "./collection";
import { readBuys, readCatalog, readPrintings, readSupport, type Sql } from "./catalog";
import { DAY, assertFixtureOnly, friendId, readFaces, type Ctx } from "./context";
import { planDecks, type DeckPlan, type Swap } from "./decks";
import {
  DECK_NOTES, FRIEND_DECK_NAME, FRIEND_NAMES, OPPONENT_LABEL, PLAYED_V1_NOTE, PLAYER_NAME, POD_NAMES, UPLOADS, VERSION_NOTES,
} from "./names";
import { purgeEverything } from "./purge";
import { ABOUT_DECK_IDS, streamFor, uuidV5, type DeckRole } from "./rng";
import { deckMark } from "../about-fixture-ids.mjs";

/** Credits the account holds in a gift lot, beside its free daily allowance. */
export const FIXTURE_CREDITS = 10;

export async function baseStage(ctx: Ctx): Promise<void> {
  const { sql, viewer } = ctx;
  const alex = friendId(viewer, "Alex");

  // 0. PURGE: every user-keyed table, for everyone; the guard then holds the branch to the fixture's own ids.
  await purgeEverything((text, params) => sql.query(text, params));
  await assertFixtureOnly(ctx, "after the purge");

  const friends = await import("../../../src/lib/social/friends");
  const { ABOUT_VERSION } = await import("../../../src/lib/copy/about");
  const alexProfile = await friends.ensureProfile(alex, FRIEND_NAMES[0]);
  await sql`insert into user_prefs (user_id) values (${alex}) on conflict (user_id) do nothing`;
  await friends.ensureProfile(viewer, PLAYER_NAME);
  if (!(await friends.setDisplayName(viewer, PLAYER_NAME))) throw new Error("setDisplayName refused");
  // The About gate is cleared the way a returning player has it: the version seen, no entries opened.
  await sql`insert into user_prefs (user_id, about_version_seen) values (${viewer}, ${ABOUT_VERSION})
    on conflict (user_id) do update set about_version_seen = ${ABOUT_VERSION}`;

  // 1. THE COLLECTION: from the catalog alone.
  const catalog = await readCatalog(sql as unknown as Sql);
  const buys = await readBuys(sql as unknown as Sql);
  const { owned, commanders } = assembleOwned(catalog, streamFor("collection"), new Set([buys.dear, buys.spare, ...buys.missing]));
  const printings = await readPrintings(sql as unknown as Sql, [...owned.keys()]);
  const rows = assignPrintings(owned, printings, streamFor("printings"));
  if (rows.length < 2900) throw new Error(`only ${rows.length} holdings had a printing`);
  await writeCollection(ctx, catalog, rows);
  console.log(`collection: ${rows.length} holdings, ${rows.reduce((n, r) => n + r.quantity, 0)} cards, ${commanders.length} commanders`);

  // 2. THE DECKS.
  const top = [...commanders].sort((a, b) => b.support - a.support || a.oracleId.localeCompare(b.oracleId)).slice(0, 24);
  const support = await readSupport(sql as unknown as Sql, top.map((c) => c.oracleId));
  const plan = planDecks(catalog, new Map(rows.reduce((m, r) => m.set(r.oracleId, (m.get(r.oracleId) ?? 0) + r.quantity), new Map<string, number>())), top, support, buys);
  const byRole = new Map(plan.decks.map((d) => [d.role, d]));
  for (const d of plan.decks) await writeDeck(ctx, alex, d);
  const played = byRole.get("played")!;
  await sql`insert into deck_locks (deck_id, oracle_id) values (${ABOUT_DECK_IDS.played}, ${plan.lockedCard})
    on conflict (deck_id, oracle_id) do update set removed_at = null`;

  const { commitVersion } = await import("../../../src/lib/decks/versions");
  const { setBasicQuantityFor } = await import("../../../src/lib/decks/set-basic-quantity");
  const { addCardToDeckFor } = await import("../../../src/lib/decks/add-card");
  const swap = async (deckId: string, s: Swap) => {
    const down = await setBasicQuantityFor(viewer, deckId, s.out, s.outQty - 1, s.outQty);
    if (!down.ok) throw new Error(`setBasicQuantityFor refused: ${down.reason}`);
    const added = await addCardToDeckFor(viewer, deckId, s.in, { relock: false });
    if (!added.result.ok) throw new Error("addCardToDeckFor refused the swapped-in card");
  };
  const backdate = async (deckId: string, versionId: string, at: Date, first: boolean) => {
    if (first) await sql`update deck_versions set committed_at = ${at}, commander_since = ${at} where id = ${versionId}`;
    else await sql`update deck_versions set committed_at = ${at} where id = ${versionId}`;
    await sql`update deck_version_cards set since = ${at} where version_id = ${versionId} and since > ${at}`;
    if (first) {
      await sql`update decks set created_at = ${new Date(at.getTime() - DAY)}, last_edited_at = ${new Date(at.getTime() - DAY)} where id = ${deckId}`;
    }
  };
  const now = Date.now();
  // Played: committed v1, then a pending change (a basic for a card), five games on v1.
  const p1 = (await commitVersion(ABOUT_DECK_IDS.played, PLAYED_V1_NOTE, undefined, undefined)).version;
  await backdate(ABOUT_DECK_IDS.played, p1.id, new Date(now - 22 * DAY), true);
  await swap(ABOUT_DECK_IDS.played, plan.playedSwap);
  // Versioned: three versions, a fictional note on each.
  const ages = [60, 35, 12];
  const v1 = (await commitVersion(ABOUT_DECK_IDS.versioned, VERSION_NOTES[0], undefined, undefined)).version;
  await backdate(ABOUT_DECK_IDS.versioned, v1.id, new Date(now - ages[0] * DAY), true);
  for (const [i, s] of plan.versionedSwaps.entries()) {
    await swap(ABOUT_DECK_IDS.versioned, s);
    const v = (await commitVersion(ABOUT_DECK_IDS.versioned, VERSION_NOTES[i + 1], undefined, undefined)).version;
    await backdate(ABOUT_DECK_IDS.versioned, v.id, new Date(now - ages[i + 1] * DAY), false);
  }
  const [shared] = (await sql`select name from cards where oracle_id = ${plan.sharedCard.oracleId}`) as { name: string }[];
  console.log(`shared card: ${shared.name} (fits ${plan.sharedCard.fits.join(", ")})`);
  console.log(`decks: ${plan.decks.map((d) => `${d.role} ${[...d.rows.values()].reduce((a, b) => a + b, 0)}`).join(", ")}`);

  // The account's credits, through the app's own support-grant write (a `gift` lot, never "paid", no Stripe call).
  const { grantGift } = await import("../../../src/lib/admin/gift");
  const { db } = await import("../../../src/db");
  const gift = await grantGift(viewer, { accountId: viewer, units: FIXTURE_CREDITS, note: "Fictional fixture credits", actionId: uuidV5("gift:0") }, {
    accountExists: async () => true,
    transaction: db.transaction.bind(db),
  });
  if (!gift.ok) throw new Error(`grantGift refused: ${gift.error}`);

  // 3. SOCIAL: the player's face, invites, Alex in a pod holding Played's spare, five games, notes, a want, the feed.
  const pods = await import("../../../src/lib/social/pods");
  const spares = await import("../../../src/lib/social/spares");
  const { setCommander } = await import("../../../src/lib/social/commander");
  const { setWishlistQuantity } = await import("../../../src/lib/wishlist/wishlist");
  await setCommander(viewer, played.commander.oracleId);
  await sql`insert into invite_balances (user_id, held, updated_at) values (${viewer}, 3, now())
    on conflict (user_id) do update set held = greatest(invite_balances.held, 3), updated_at = now()`;
  const invite = await friends.createInvite(viewer);
  if (!invite.ok) throw new Error("createInvite refused");
  await friends.redeemInvite(alex, invite.token);
  const faces = (await readFaces(sql, viewer)).map((oracleId) => ({ oracleId }));
  await setCommander(alex, faces[0].oracleId);
  const alexDeck = uuidV5("deck:alex-brew");
  await sql`insert into decks (id, user_id, name, commander_oracle_id) values (${alexDeck}, ${alex}, ${FRIEND_DECK_NAME}, ${faces[1].oracleId})`;
  await sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${alex}, ${buys.spare}, 1, 'fx')`;
  const pod = await pods.createPod(viewer, POD_NAMES.base);
  if (!pod) throw new Error("createPod refused");
  if (!(await pods.addMember(viewer, pod.id, alexProfile.publicId))) throw new Error("addMember refused");
  if (!(await spares.shareSparesWith(alex, pod.id, true))) throw new Error("shareSparesWith refused");

  const results = ["win", "loss", "win", "loss", "win"] as const;
  for (const [i, result] of results.entries()) {
    const playedAt = new Date(now - (results.length - i) * 4 * DAY);
    const game = uuidV5(`game:${i}`);
    await sql`insert into deck_games (id, deck_id, user_id, result, pod_size, played_at, version_id)
      values (${game}, ${ABOUT_DECK_IDS.played}, ${viewer}, ${result}, 4, ${playedAt}, ${p1.id})`;
    await sql`insert into deck_game_opponents (game_id, seat, friend_user_id, friend_deck_id, friend_name_then, deck_name_then, commander_oracle_id, won)
      values (${game}, 1, ${alex}, ${alexDeck}, ${FRIEND_NAMES[0]}, ${FRIEND_DECK_NAME}, ${faces[1].oracleId}, ${result === "loss" && i % 2 === 1})`;
    await sql`insert into deck_game_opponents (game_id, seat, commander_oracle_id, label, won)
      values (${game}, 2, ${faces[2].oracleId}, ${OPPONENT_LABEL}, false)`;
  }
  for (const body of DECK_NOTES) await sql`insert into deck_notes (deck_id, user_id, body) values (${ABOUT_DECK_IDS.played}, ${viewer}, ${body})`;
  await setWishlistQuantity(viewer, buys.dear, 1);

  const enabledAt = new Date(now - 30 * DAY).toISOString();
  await sql`update user_prefs set feed_kinds = ${JSON.stringify({ "new-set": enabledAt, "price-drop": enabledAt, combo: enabledAt })}::jsonb,
    feed_seen_at = null where user_id = ${viewer}`;
  await sql`insert into feed_items (user_id, kind, dedupe_key, oracle_id, data, created_at)
    values (${viewer}, 'price-drop', ${`${buys.dear}:fixture`}, ${buys.dear}, ${JSON.stringify({ fromCents: 1200, toCents: 700 })}::jsonb, now() - interval '2 hours')`;

  // 4. Played's STORED analysis, last, over the list with its pending change: the app's own compute, no model call.
  const { readCatalogGeneration } = await import("../../../src/lib/cache/catalog-generation");
  const { loadDeckProfile } = await import("../../../src/lib/profile/load");
  const { computeAndStoreProfile } = await import("../../../src/lib/profile/stored");
  const { resolveFlagsStrict } = await import("../../../src/lib/flags/snapshot");
  const flags = await resolveFlagsStrict(viewer);
  const reading = await computeAndStoreProfile(ABOUT_DECK_IDS.played, viewer, {
    generation: readCatalogGeneration,
    compute: (deckId: string, userId: string) => loadDeckProfile(deckId, userId, flags),
    env: flags,
  });
  if (reading?.kind !== "ok") throw new Error(`Played was not analyzed: ${reading ? reading.kind : "not the player's deck"}`);

  await assertFixtureOnly(ctx, "after the build");
  console.log(`collection fingerprint ${hashOf(collectionFingerprint(rows))}`);
  for (const role of Object.keys(ABOUT_DECK_IDS) as DeckRole[]) console.log(`ABOUT_DECK_${role.toUpperCase()}=${ABOUT_DECK_IDS[role]}`);
  console.log("next: capture Friends (and every frame but p-cart and d-cart), then pnpm fixtures:about:cart");
}

function hashOf(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

/** The collection through the app's own replace, in two uploads (an older binder export, then the current one). */
async function writeCollection(ctx: Ctx, catalog: Awaited<ReturnType<typeof readCatalog>>, rows: OwnedRow[]): Promise<void> {
  const { sql, viewer } = ctx;
  const { replaceCollection } = await import("../../../src/lib/collection/import");
  const names = new Map<string, string>();
  for (const c of [...catalog.cards, ...catalog.commanders]) names.set(c.oracleId, c.name);
  for (const [color, id] of Object.entries(catalog.basics)) names.set(id, { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" }[color]!);
  const items = (all: OwnedRow[]) =>
    all.map((r) => ({
      oracleId: r.oracleId, setCode: r.setCode, collectorNumber: r.collectorNumber, finish: r.finish,
      scryfallId: r.scryfallId, condition: r.condition, quantity: r.quantity, name: names.get(r.oracleId),
    }));
  const total = (all: OwnedRow[]) => all.reduce((n, r) => n + r.quantity, 0);
  const earlier = rows.filter((_, i) => i % 13 !== 0);
  let before = 0;
  for (const [i, upload] of UPLOADS.entries()) {
    const set = i === 0 ? earlier : rows;
    const id = uuidV5(`upload:${i}`);
    const at = new Date(Date.now() - upload.daysAgo * DAY);
    const preview = { unmatched: [], parseErrors: [], pendingItems: items(set), skippedByDesignCount: 0, tokens: [] };
    await sql`insert into csv_uploads (id, user_id, filename, row_count, unmatched_count, preview_payload, created_at)
      values (${id}, ${viewer}, ${upload.filename}, ${set.length}, 0, ${JSON.stringify(preview)}::jsonb, ${at})`;
    await replaceCollection(viewer, items(set), { confirmUploadId: id });
    const summary = {
      left: 0, went: {}, names: { cards: {}, decks: {} }, still: [], issues: { unmatched: 0, parseErrors: 0 },
      arrived: total(set) - before, cleared: [], version: 4, nowShort: [], contested: [], totalAfter: total(set), totalBefore: before,
    };
    before = total(set);
    await sql`update csv_uploads set created_at = ${at}, confirmed_at = ${at}, summary_payload = ${JSON.stringify(summary)}::jsonb where id = ${id}`;
  }
}

/** One deck, its mark on Alex's own (never drawn) preferences row, and its cards, committed together. */
async function writeDeck(ctx: Ctx, markHolder: string, d: DeckPlan): Promise<void> {
  const { sql, viewer } = ctx;
  const id = ABOUT_DECK_IDS[d.role];
  await sql.transaction([
    sql`insert into decks (id, user_id, name, commander_oracle_id) values (${id}, ${viewer}, ${d.name}, ${d.commander.oracleId})`,
    sql`update user_prefs set about_seen_ids = array_append(about_seen_ids, ${deckMark(d.role, id)}) where user_id = ${markHolder}`,
    ...[...d.rows].map(([oracle, n]) => sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${id}, ${oracle}, ${n})`),
  ]);
}
