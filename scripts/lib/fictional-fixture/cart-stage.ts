// The cart stage: the all-decks cart's By friend (Small items 7, item 6), written in a SECOND step, after the Friends
// frames are shot, so Friends stays as its board draws it (one friend, Alex, in one pod). Four more friends (Torin,
// Merek, Varic, Zev) in two pods, sharing spares of cards the player's decks are missing, and three asks to Torin
// through the app's own writes. It runs once on a base stage's account; a rerun starts from the base stage again.
import { assertFixtureOnly, friendId, readFaces, type Ctx } from "./context";
import type { FRIEND_NAMES } from "./names";
import { POD_NAMES } from "./names";
import { ownedFixturePattern } from "../about-fixture-ids.mjs";

const CART_PODS = [POD_NAMES.cartBros, POD_NAMES.cartThursday];

export async function cartStage(ctx: Ctx): Promise<void> {
  const { sql, viewer } = ctx;
  const alex = friendId(viewer, "Alex");
  const base = (await sql`select user_id from social_profiles where user_id like ${ownedFixturePattern(viewer)}`) as { user_id: string }[];
  if (base.length !== 1 || base[0].user_id !== alex) {
    throw new Error(`the account holds ${base.length} fixture friends: run the base stage (pnpm fixtures:about) first, and the cart stage once after it`);
  }
  const [{ n: held }] = (await sql`select count(*)::int n from pods where owner_user_id = ${viewer} and name = any(${CART_PODS})`) as { n: number }[];
  if (held) throw new Error("the cart stage already ran: rerun the base stage (pnpm fixtures:about) first");
  // The friend spare is the one card the base stage gave Alex (the fresh draft lists it, never Played): it moves to Torin, so Alex draws no cart panel.
  const own = (await sql`select oracle_id::text from collection_items where user_id = ${alex}`) as { oracle_id: string }[];
  if (own.length !== 1) throw new Error(`Alex holds ${own.length} cards, not the one spare: run the base stage first`);
  const spare = own[0].oracle_id;
  await sql`delete from collection_items where user_id = ${alex}`;

  const friends = await import("../../../src/lib/social/friends");
  const pods = await import("../../../src/lib/social/pods");
  const spares = await import("../../../src/lib/social/spares");
  const requests = await import("../../../src/lib/social/spare-requests");
  const { setCommander } = await import("../../../src/lib/social/commander");
  const { loadDeckBuyRows } = await import("../../../src/lib/decks/availability-query");

  // A panel lists the cart's lines in By card's default order (commanders first, then the most decks needing the
  // card, then A to Z); the lines are read the same way, commanders left out, and each friend is handed copies of the
  // lines the board draws in his first rows. A friend with no deck spares every copy he owns, so his copies ARE spares.
  const need = new Map<string, number>();
  for (const r of await loadDeckBuyRows(viewer)) need.set(r.oracleId, (need.get(r.oracleId) ?? 0) + 1);
  const commanders = new Set(((await sql`select x::text from decks d cross join lateral
    unnest(array[d.commander_oracle_id, d.partner_oracle_id]) x where d.user_id = ${viewer} and x is not null`) as { x: string }[]).map((r) => r.x));
  const named = (await sql`select oracle_id::text, name from cards where oracle_id::text = any(${[...need.keys()]})`) as { oracle_id: string; name: string }[];
  const lines = named
    .filter((r) => !commanders.has(r.oracle_id))
    .sort((a, b) => need.get(b.oracle_id)! - need.get(a.oracle_id)! || a.name.localeCompare(b.name))
    .map((r) => r.oracle_id);
  if (lines.length < 10 || !lines.includes(spare)) {
    throw new Error(`the cart holds ${lines.length} lines${lines.includes(spare) ? "" : ", without the friend's spare"}: By friend needs ten`);
  }
  const spread = (total: number, n: number): number[] =>
    Array.from({ length: n }, (_, i) => Math.max(1, Math.floor(total / n) + (i < total % n ? 1 : 0)));
  const FIRST = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const handOut = (head: [number, number][], cards: number, copies: number, from: number, extra: string[] = []): Map<string, number> => {
    const out = new Map<string, number>(head.map(([i, n]) => [lines[i], n]));
    for (const id of extra) out.set(id, out.get(id) ?? 1);
    const rest = lines.filter((id, i) => !FIRST.has(i) && !out.has(id)).slice(from);
    const room = Math.max(0, cards - out.size);
    const left = Math.max(0, copies - [...out.values()].reduce((a, b) => a + b, 0));
    const tail = rest.slice(0, room);
    spread(left, tail.length).forEach((n, i) => out.set(tail[i], n));
    return out;
  };
  const CART_FRIENDS: { name: (typeof FRIEND_NAMES)[number]; pods: string[]; spares: Map<string, number> }[] = [
    { name: "Torin", pods: [POD_NAMES.cartBros], spares: handOut([[0, 7], [1, 2], [2, 9], [3, 4], [4, 12], [5, 6]], 41, 130, 0, [spare]) },
    { name: "Merek", pods: [POD_NAMES.cartBros], spares: handOut([[0, 1], [3, 1], [6, 2], [4, 3]], 17, 38, 8) },
    { name: "Varic", pods: [POD_NAMES.cartBros, POD_NAMES.cartThursday], spares: handOut([[7, 1], [1, 1], [8, 2]], 9, 14, 16) },
    { name: "Zev", pods: [POD_NAMES.cartThursday], spares: handOut([[4, 2], [9, 1]], 4, 6, 20) },
  ];
  const cartPods = new Map<string, string>();
  for (const podName of CART_PODS) {
    const made = await pods.createPod(viewer, podName);
    if (!made) throw new Error(`createPod refused ${podName}`);
    cartPods.set(podName, made.id);
  }
  const cartFaces = (await readFaces(sql, viewer)).slice(3, 7).map((oracleId) => ({ oracleId }));
  const made = new Map<string, { id: string; publicId: string }>();
  for (const [i, f] of CART_FRIENDS.entries()) {
    const id = friendId(viewer, f.name);
    const profile = await friends.ensureProfile(id, f.name);
    const link = await friends.createInvite(viewer);
    if (!link.ok) throw new Error("createInvite refused: the account holds too many open invites");
    await friends.redeemInvite(id, link.token);
    await setCommander(id, cartFaces[i].oracleId);
    for (const [oracle, n] of f.spares) {
      await sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${id}, ${oracle}, ${n}, 'fx')`;
    }
    for (const podName of f.pods) {
      const podId = cartPods.get(podName)!;
      if (!(await pods.addMember(viewer, podId, profile.publicId))) throw new Error(`addMember refused ${f.name}`);
      if (!(await spares.shareSparesWith(id, podId, true))) throw new Error(`shareSparesWith refused ${f.name}`);
    }
    made.set(f.name, { id, publicId: profile.publicId });
  }
  // Each redeemed invite spent one of the account's: back to three in hand, so Friends still draws its count line.
  await sql`update invite_balances set held = greatest(held, 3), updated_at = now() where user_id = ${viewer}`;
  // Three asks to Torin, the app's own writes: line 2 answered yes, line 4 left open, line 5 answered no.
  const { resolveFlagsStrict } = await import("../../../src/lib/flags/snapshot");
  const askEnv = await resolveFlagsStrict(viewer);
  const torin = made.get("Torin")!;
  for (const [i, answer] of [[2, "yes"], [4, null], [5, "no"]] as const) {
    const asked = await requests.askForSpare(viewer, torin.publicId, lines[i], askEnv);
    if (!asked.ok) throw new Error(`askForSpare refused line ${i}: ${asked.reason}`);
    if (answer === null) continue;
    const answered = await requests.answerSpareRequest(torin.id, asked.id, answer, askEnv);
    if (!answered.ok) throw new Error(`answerSpareRequest refused line ${i}: ${answered.reason}`);
  }
  await assertFixtureOnly(ctx, "after the cart");
  console.log(`cart: ${lines.length} lines; By friend: ${CART_FRIENDS.map((f) => `${f.name} ${f.spares.size} cards · ${[...f.spares.values()].reduce((a, b) => a + b, 0)} spare`).join(", ")}`);
}
