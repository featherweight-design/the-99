/**
 * probe:swap-shopping — the Shopping limit line and the over-limit marks (swap tools, PR 3), walked
 * in a real browser at 390x844, 768x900, 1024x900 and 1300x900.
 *
 * What only a browser answers:
 *   - the marks MOVE when the limit is edited: a card between the old and the new limit loses its
 *     ring and its `over $X`, and the line's count follows. jsdom can say which class a row asks
 *     for; only a painted `box-shadow` says the ring is there.
 *   - the limit is REMEMBERED: a reload reads the saved figure back, and the deck row holds it.
 *   - the phone's targets are 44px: the figure and `reset to $10`.
 *   - the name keeps its width with `over $X` on the row (audit F12, ruling b): the line costs the
 *     name nothing at 390 and 768, where it takes a line of its own, and the name keeps the 131px
 *     Design costed for Plateau at 390 and 40px at 1024 and 1300. At 768 an under row stays one line
 *     and an over row keeps its figure beside its name. The room itself at 768 is the grid's.
 *
 * FIXTURE. A brew under the signed-in account holding cards it does NOT own, chosen by their live
 * price so the bands are known: HIGH above $25, MID between $10 and $25, LOW at $10 or under. An
 * unowned card is a Shopping row. A card is taken only when EVERY printing's live non-foil price
 * falls in its band, so the figure the row draws lands in that band whichever printing it reads.
 * The deck is deleted in a `finally`; its `deck_cards` cascade. The account's `user_prefs` About
 * row, raised to clear the gate, is put back as the run found it in that same `finally`.
 *
 * Four mutations fail it: the separator split from the count into its own flex item (the phone's
 * editing state then leaves `·` at the end of the first line), the ring dropped from `BuyTag` (24 checks), the stored limit not read by
 * the page (the reload never finds `reset to $10`), and the row's desktop `over $X` drawn at every
 * width (every phone row reads it twice). Needs a server with
 * `SWAP_TOOLS_ENABLED=true`. Point it at `local-dev`, never production.
 */
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;
const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const pool = new Pool({ connectionString: DATABASE_URL });

const WIDTHS = [
  // `maxCost`: the most room the `over $X` line may take from a name. `nameFloor`: the room an over
  // row's name must keep, uncut; Design costed Plateau at "about 131px" at 390. None at 768, where
  // the grid itself overflows (see F12 below).
  { label: 390, viewport: { width: 390, height: 844 }, edit: true, maxCost: 0, nameFloor: 131 },
  // F12, ruling b: up to lg the line takes a row of its own, so at 768 it costs the name nothing.
  // 1024 is the first width that draws it inline.
  { label: 768, viewport: { width: 768, height: 900 }, edit: false, maxCost: 0, nameFloor: null },
  { label: 1024, viewport: { width: 1024, height: 900 }, edit: false, maxCost: 60, nameFloor: 40 },
  { label: 1300, viewport: { width: 1300, height: 900 }, edit: true, maxCost: 60, nameFloor: 40 },
];

let failures = 0;
/** The About row as the run found it, so the `finally` can put it back. */
let aboutPrior = null;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  // Clear the About gate: below the current version `proxy.ts` redirects every route to /about.
  // What was there is captured first and put back in the `finally`.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  const prior = await pool.query(`select about_version_seen from user_prefs where user_id = $1`, [userId]);
  aboutPrior = { userId, existed: prior.rowCount > 0, value: prior.rows[0]?.about_version_seen ?? null };
  await pool.query(
    `insert into user_prefs (user_id, about_version_seen) values ($1, $2)
       on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, $2)`,
    [userId, version],
  );
  return userId;
}

/** Unowned, commander-legal cards whose every live non-foil price sits inside [lo, hi] cents. */
async function band(userId, lo, hi, n, exclude) {
  const { rows } = await pool.query(
    `with newest as (select max(as_of) as t from printing_prices)
     select c.oracle_id, c.name from cards c
       join printings p on p.oracle_id = c.oracle_id
       join printing_prices pp on pp.scryfall_id = p.scryfall_id, newest
      where c.commander_legal and pp.as_of = newest.t and pp.price_cents is not null
        and c.name not like '%//%'
        and not exists (select 1 from collection_items ci where ci.user_id = $1 and ci.oracle_id = c.oracle_id)
        and not (c.oracle_id = any($5::uuid[]))
      group by c.oracle_id, c.name
     having min(pp.price_cents) >= $2 and max(pp.price_cents) <= $3
      order by c.name limit $4`,
    [userId, lo, hi, n, exclude],
  );
  if (rows.length < n) throw new Error(`Only ${rows.length} unowned cards priced ${lo}-${hi}c; the fixture needs ${n}.`);
  return rows;
}

async function buildDeck(userId, onDeck) {
  const { rows: [commander] } = await pool.query(
    `select oracle_id from cards where commander_legal and type_line like '%Legendary%Creature%'
      order by name limit 1`,
  );
  // The commander is excluded from every band: a commander is not a Shopping row of its own.
  const high = await band(userId, 3000, 20000, 2, [commander.oracle_id]);
  const mid = await band(userId, 1200, 2300, 2, [commander.oracle_id, ...high.map((r) => r.oracle_id)]);
  const low = await band(userId, 100, 900, 1, [commander.oracle_id, ...[...high, ...mid].map((r) => r.oracle_id)]);
  const { rows: [deck] } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe · swap shopping', $2) returning id`,
    [userId, commander.oracle_id],
  );
  onDeck(deck.id);
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) select $1, unnest($2::uuid[]), 1, false`,
    [deck.id, [...high, ...mid, ...low].map((r) => r.oracle_id)],
  );
  return { deckId: deck.id, high: high.map((r) => r.name), mid: mid.map((r) => r.name), low: low.map((r) => r.name) };
}

const storedLimit = async (deckId) =>
  (await pool.query(`select shopping_limit_cents from decks where id = $1`, [deckId])).rows[0].shopping_limit_cents;

/** Per fixture card: its painted ring, whether its row says `over $X`, and its name's drawn width. */
async function readRows(page, names, figure) {
  return page.evaluate(
    ([names, over, scope]) => {
      const vis = (el) => el && el.getClientRects().length > 0;
      const out = {};
      for (const name of names) {
        const trigger = [...(document.querySelector(scope)?.querySelectorAll("button, [role=button]") ?? [])]
          .find((el) => vis(el) && el.getAttribute("aria-label")?.includes(name));
        const row = trigger?.closest(".group");
        if (!row) { out[name] = null; continue; }
        // The buy tag is the outermost visible span reading `buy`; only its own shadow is the ring.
        const tag = [...row.querySelectorAll("span")].find((s) => vis(s) && s.textContent.trim().startsWith("buy"));
        const ring = Boolean(tag) && getComputedStyle(tag).boxShadow !== "none";
        const overs = [...row.querySelectorAll("span")].filter((s) => vis(s) && s.textContent.trim() === over);
        out[name] = {
          ring,
          over: overs.length,
          nameWidth: Math.round(trigger.getBoundingClientRect().width),
          // The trigger shrinks to its text, so its width says how long the name is, not how much
          // room it has. The cell it grows in is the room; an ellipsis is the name losing it.
          room: Math.round(trigger.parentElement.getBoundingClientRect().width),
          cut: trigger.scrollWidth > trigger.clientWidth + 1 ||
            [...trigger.querySelectorAll("*")].some((el) => el.scrollWidth > el.clientWidth + 1),
          rowWidth: Math.round(row.getBoundingClientRect().width),
          rowHeight: Math.round(row.getBoundingClientRect().height),
          // The EDHREC figure's top against the name's: the same line, or the figure was pushed down.
          figureDrop: (() => {
            const fig = [...row.querySelectorAll("span.tabular-nums")].find((el) => el.getClientRects().length);
            return fig ? Math.round(fig.getBoundingClientRect().top - trigger.getBoundingClientRect().top) : null;
          })(),
        };
      }
      return out;
    },
    [names, `over ${figure}`, PAGE],
  );
}

const line = (page) => onPage(page, '[data-testid="stand-in-limit"]:visible').first();

async function openShopping(page, deckId) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  await onPageRole(page, "button", /^Shopping \d+/).first().click();
  await line(page).waitFor({ state: "visible", timeout: 20_000 });
}

function checkMarks(tag, rows, overNames, underNames) {
  for (const name of overNames) {
    const r = rows[name];
    report(`${tag} ${name} over`, Boolean(r?.ring) && r.over === 1, r ? `ring ${r.ring}, over lines ${r.over}` : "row not found");
  }
  for (const name of underNames) {
    const r = rows[name];
    report(`${tag} ${name} not over`, r !== null && !r.ring && r.over === 0, r ? `ring ${r.ring}, over lines ${r.over}` : "row not found");
  }
}

let deckId = null;
let userId = null;
let browser = null;
try {
  await clerkSetup();
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: WIDTHS[0].viewport });
  const page = await context.newPage();
  userId = await signIn(page);
  const fx = await buildDeck(userId, (id) => { deckId = id; });
  const all = [...fx.high, ...fx.mid, ...fx.low];
  console.log(`fixture ${deckId}: high ${fx.high.join(", ")} · mid ${fx.mid.join(", ")} · low ${fx.low.join(", ")}`);

  for (const w of WIDTHS) {
    await page.setViewportSize(w.viewport);
    await openShopping(page, deckId);
    const tag = `${w.label}`;

    // At the default: HIGH and MID are over $10, LOW is not.
    const text = (await line(page).textContent()).replace(/\s+/g, " ");
    report(`${tag} line reads the default`, text.includes("$10") && text.includes("default") && text.includes("4 over"), text);
    const rows = await readRows(page, all, "$10");
    checkMarks(`${tag} $10:`, rows, [...fx.high, ...fx.mid], fx.low);
    // F12. What this PR owns is the room the `over $X` line takes from the name, so the line is
    // hidden in place and the name's room read again: the difference is its cost. At 390 the line
    // sits on the second row and costs nothing; on desktop it is inline and costs its own width.
    // The room itself at 768 is the grid's (logged as `swap-decklist-768-overflow`), so it is
    // printed rather than asserted there.
    if (process.env.PROBE_SHOTS) {
      await page.screenshot({ path: `${process.env.PROBE_SHOTS}/swap-shopping-${w.label}.png` });
    }
    const without = await page.evaluate(({ scope, names }) => {
      const root = document.querySelector(scope);
      const lines = [...root.querySelectorAll("span")]
        .filter((s) => /^over \$\d+$/.test(s.textContent.trim()) && s.getClientRects().length > 0);
      lines.forEach((el) => { el.dataset.prev = el.style.display; el.style.display = "none"; });
      const out = {};
      for (const n of names) {
        const t = [...root.querySelectorAll("button")]
          .find((el) => el.getClientRects().length && el.getAttribute("aria-label")?.includes(n));
        out[n] = t ? Math.round(t.parentElement.getBoundingClientRect().width) : null;
      }
      lines.forEach((el) => { el.style.display = el.dataset.prev; });
      return out;
    }, { scope: PAGE, names: all });
    const overNames = [...fx.high, ...fx.mid];
    const cost = Math.max(...overNames.map((n) => (without[n] ?? 0) - (rows[n]?.room ?? 0)));
    console.log(`       ${tag} name room with / without the over line: ${overNames
      .map((n) => `${n} ${rows[n]?.room}/${without[n]}px${rows[n]?.cut ? " cut" : ""}`).join(" · ")}`);
    report(`${tag} the over line's cost to the name (F12)`, cost <= w.maxCost, `${cost}px, at most ${w.maxCost}px`);
    if (w.label === 768) {
      // Only an over row wraps here (ruling b): an under row stays one line, and an over row keeps
      // its figure beside its name, with only `over $X` below.
      const under = fx.low.map((n) => rows[n]?.rowHeight ?? 0);
      report(`${tag} an under row stays one line`, Math.max(...under) <= 36, `${under.join(", ")}px tall`);
      const drops = overNames.map((n) => rows[n]?.figureDrop).filter((d) => d !== null && d !== undefined);
      report(`${tag} an over row keeps its figure beside its name`, drops.length > 0 && drops.every((d) => Math.abs(d) <= 6),
        `figure offsets ${drops.join(", ")}px`);
    }
    if (w.nameFloor) {
      const narrowest = Math.min(...overNames.map((n) => rows[n]?.room ?? 0));
      const cut = overNames.filter((n) => rows[n]?.cut);
      report(`${tag} name room on an over row (F12)`, narrowest >= w.nameFloor && cut.length === 0,
        `narrowest ${narrowest}px against ${w.nameFloor}px; cut: ${cut.join(", ") || "none"}`);
    }

    if (w.label === 390) {
      const fig = await line(page).getByRole("button", { name: /Change the limit/ }).boundingBox();
      report(`${tag} figure target`, fig && fig.height >= 44, `${fig?.height}px`);
    }
    if (!w.edit) continue;

    // Raise it to $25: MID leaves, the count follows.
    await line(page).getByRole("button", { name: /Change the limit/ }).click();
    // The editing state is the one that wraps on a phone. The `·` must travel with the count
    // rather than dangle at the end of the first line: read by GEOMETRY, never by markup.
    const sep = await line(page).evaluate((root) => {
      const dot = [...root.querySelectorAll("span[aria-hidden]")].find((el) => el.textContent.trim() === "·");
      const count = dot?.parentElement;
      if (!dot || !count) return null;
      const range = document.createRange();
      range.selectNodeContents(count);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0);
      return { dot: Math.round(dot.getBoundingClientRect().top), text: Math.round(rects.at(-1)?.top ?? -1) };
    });
    report(`${tag} separator shares the count's line while editing`, sep && Math.abs(sep.dot - sep.text) <= 12,
      sep ? `dot at ${sep.dot}px, count at ${sep.text}px` : "no separator found");
    await line(page).getByRole("textbox").fill("25");
    await line(page).getByRole("button", { name: "Save" }).click();
    await line(page).getByRole("button", { name: "reset to $10" }).waitFor({ timeout: 15_000 });
    const raised = (await line(page).textContent()).replace(/\s+/g, " ");
    report(`${tag} line after $25`, raised.includes("$25") && raised.includes("2 over") && !raised.includes("default"), raised);
    checkMarks(`${tag} $25:`, await readRows(page, all, "$25"), fx.high, [...fx.mid, ...fx.low]);
    report(`${tag} stored`, (await storedLimit(deckId)) === 2500, `shopping_limit_cents ${await storedLimit(deckId)}`);

    // Remembered: a reload reads it back.
    await openShopping(page, deckId);
    const reloaded = (await line(page).textContent()).replace(/\s+/g, " ");
    report(`${tag} reload holds $25`, reloaded.includes("$25") && reloaded.includes("2 over"), reloaded);

    // Reset: the default returns, and the column is null again.
    const reset = line(page).getByRole("button", { name: "reset to $10" });
    if (w.label === 390) {
      const box = await reset.boundingBox();
      report(`${tag} reset target`, box && box.height >= 44, `${box?.height}px`);
    }
    await reset.click();
    await line(page).getByText("default", { exact: true }).waitFor({ timeout: 15_000 });
    report(`${tag} reset stored`, (await storedLimit(deckId)) === null, `shopping_limit_cents ${await storedLimit(deckId)}`);
    checkMarks(`${tag} reset:`, await readRows(page, all, "$10"), [...fx.high, ...fx.mid], fx.low);
  }
} catch (error) {
  failures += 1;
  console.error(" FAIL  the run threw —", error?.message ?? error);
} finally {
  try {
    if (deckId) {
      await pool.query(`delete from decks where id = $1 and user_id = $2`, [deckId, userId]);
      console.log(`fixture deck ${deckId} deleted`);
    }
  } catch (error) {
    failures += 1;
    console.error(` FAIL  could not delete fixture deck ${deckId}; remove it by hand (${error?.message ?? error})`);
  }
  try {
    if (aboutPrior) {
      if (aboutPrior.existed) {
        await pool.query(`update user_prefs set about_version_seen = $2 where user_id = $1`, [
          aboutPrior.userId,
          aboutPrior.value,
        ]);
      } else {
        await pool.query(`delete from user_prefs where user_id = $1`, [aboutPrior.userId]);
      }
      console.log("About row restored");
    }
  } catch (error) {
    failures += 1;
    console.error(` FAIL  could not restore the About row (${error?.message ?? error})`);
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await pool.end();
    }
  }
}
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
