/**
 * measure:swap-lines — the stand-ins sheet's two-line row, proved over the catalog (close-out ruling 6).
 *
 * A row's second line is its facts: a land's `makes {colors}, {state}`, then its costs, the colors it
 * makes only once and what it gives up; a spell's type, MV, the jobs it does beyond the original's, and
 * what it gives up. The design holds that line to two lines at 390, and the ruling is to PROVE the
 * content does that rather than clamp it, because a clamp hides exactly the `gives up` clause a reader
 * needs.
 *
 * So this builds every row the engine could draw, not a hand-picked worst case: every Commander-legal
 * land is ranked, through `rankStandIns` and `sheetModel`, against one original per color set and per
 * fetch shape (the one whose own abilities give the longest `gives up`), and every spell against the
 * spells whose roles and themes reach furthest. The original is treated as sold out, because a sold-out
 * sheet keeps every row's own give-up where a priced one can say it once in the lead: the longest form.
 * Every candidate is free, so no price filter drops a row.
 *
 * The longest lines by characters are then rendered in a real stand-ins row at 390x844 on the running
 * app, each written into a live row's own line element (its font, its width, its padding), and counted
 * in laid-out lines. The run FAILS if any reaches 3.
 *
 * FIXTURE. A brew led by Kenrith holding one unowned card over $10, so the sheet has a row to borrow; it
 * is deleted in a `finally`, with the account's About row put back as found. Needs a server with
 * SWAP_TOOLS_ENABLED=true (PROBE_BASE). Reads the catalog only, from DATABASE_URL. Point it at local-dev,
 * never production.
 */
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPageRole } from "./lib/surface.mjs";
import { requireEnv } from "./lib/env.mjs";
import { jobOf, rankStandIns, type Candidate, type CardRow } from "../src/lib/swaps/stand-ins";
import { sheetModel, type SheetRow } from "../src/lib/swaps/sheet-model";
import type { StandInsRead } from "../src/lib/swaps/gather";
import { FOUR_LINE_RESIDUE } from "./lib/swap-lines-residue.mjs";

neonConfig.webSocketConstructor = ws;
const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const pool = new Pool({ connectionString: DATABASE_URL });
/** Every distinct line is rendered: a short line can still wrap badly, so the longest are not enough. */
const RENDERED = Infinity;
/**
 * Both readings of every original are drawn: priced, where a give-up every row shares is said once in
 * the lead, and sold out, where each row keeps its own. The ruling holds both to three lines.
 */
type Mode = "priced" | "sold out";
/**
 * The ruling (d9, close-out ruling 6, from Hugh's emphasis on card details): a fact line may run to
 * THREE lines at 390, keeping every fact, where Design drew two. Desktop is reported, not asserted.
 */
const WIDTH = Number(process.env.MEASURE_WIDTH ?? 390);
const MAX_LINES = WIDTH === 390 ? 3 : Infinity;

type Row = { oracle_id: string; name: string; type_line: string; oracle_text: string | null; keywords: string[] | null; cmc: number | string; image_uri: string | null };
const toCard = (r: Row): CardRow => ({
  oracleId: r.oracle_id, name: r.name, typeLine: r.type_line, oracleText: r.oracle_text,
  keywords: r.keywords ?? [], cmc: Number(r.cmc), imageUri: r.image_uri,
});
const asCandidate = (c: CardRow): Candidate => ({ ...c, inclusion: null, synergy: null, isUniversal: false, owned: 1, free: 1, soft: 0 });
const NO_PRICES = { newestAsOf: new Date(), prices: new Map() };

/** Every row a sold-out original's sheet would draw, as the text its facts line carries. */
function rowsFor(original: CardRow, pool: Candidate[], isCreatureType: (w: string) => boolean, mode: Mode): SheetRow[] {
  const ranked = rankStandIns(original, pool, NO_PRICES as never, isCreatureType, null);
  const read = { ...ranked, originalCents: mode === "priced" ? 100_000 : null, original, commanders: ["Kenrith"], newestAsOf: new Date() } as StandInsRead;
  return sheetModel(read).groups.flatMap((g) => g.rows);
}

const factText = (r: SheetRow) => [r.body.join(" · "), r.muted.join(" · ")].filter(Boolean).join(" · ");

type Line = { row: SheetRow; text: string; from: string; originalId: string; modes: Set<Mode> };

async function lines(): Promise<{ lines: Line[]; counts: string }> {
  const { rows } = await pool.query<Row>(
    // Ordered, so the first (original, stand-in) pair to draw a line is the same on every run.
    `select oracle_id, name, type_line, oracle_text, keywords, cmc, image_uri from cards where commander_legal order by name, oracle_id`,
  );
  const cards = rows.map(toCard);
  const { rows: types } = await pool.query<{ t: string }>(
    `select distinct trim(unnest(string_to_array(split_part(split_part(type_line, ' // ', 1), ' — ', 2), ' '))) t
       from cards where commander_legal and split_part(type_line, ' // ', 1) ~ 'Creature'`,
  );
  const creatureTypes = new Set(types.map((r) => r.t).filter(Boolean));
  const isType = (w: string) => creatureTypes.has(w);

  const lands = cards.filter((c) => { const k = jobOf(c).kind; return k === "land" || k === "fetch"; });
  const spells = cards.filter((c) => jobOf(c).kind === "spell");
  const landPool = lands.map(asCandidate);
  const spellPool = spells.map(asCandidate);

  // One land original per job shape, the one whose stand-ins give up the most words.
  const byShape = new Map<string, CardRow[]>();
  for (const c of lands) {
    const j = jobOf(c);
    const key = j.kind === "land" ? `land ${j.colors.join("")}` : j.kind === "fetch" ? `fetch ${j.types.join("")}` : "";
    byShape.set(key, [...(byShape.get(key) ?? []), c]);
  }
  const out: Line[] = [];
  const seen = new Map<string, Line>();
  const keep = (rs: SheetRow[], from: string, originalId: string, mode: Mode) => {
    for (const r of rs) {
      const text = factText(r);
      if (!text) continue;
      const had = seen.get(text);
      if (had) { had.modes.add(mode); continue; }
      const line = { row: r, text, from, originalId, modes: new Set([mode]) };
      seen.set(text, line);
      out.push(line);
    }
  };
  const MODES: Mode[] = ["sold out", "priced"];
  for (const [shape, originals] of byShape) {
    // Every original for a shape of a few; for a crowded shape, the ten with the most oracle text,
    // which is where a long `gives up` comes from.
    const picked = originals.length <= 12 ? originals
      : [...originals].sort((a, b) => (b.oracleText?.length ?? 0) - (a.oracleText?.length ?? 0)).slice(0, 10);
    for (const o of picked) for (const m of MODES) keep(rowsFor(o, landPool, isType, m), `${shape}: ${o.name}`, o.oracleId, m);
  }
  // Spells: the originals whose roles reach furthest, since a row names the jobs it adds beyond the
  // original's and the ones it lacks (two of each at most, JOBS_SHOWN).
  const reach = (c: CardRow) => { const j = jobOf(c); return j.kind === "spell" ? j.roles.length : 0; };
  const spellOriginals = [...spells].sort((a, b) => reach(b) - reach(a) || b.cmc - a.cmc).slice(0, 60);
  for (const o of spellOriginals) for (const m of MODES) keep(rowsFor(o, spellPool, isType, m), `spell: ${o.name}`, o.oracleId, m);

  out.sort((a, b) => b.text.length - a.text.length);
  return {
    lines: out.slice(0, RENDERED),
    counts: `${lands.length} lands ranked against ${[...byShape.values()].reduce((n, o) => n + Math.min(o.length, o.length <= 12 ? o.length : 10), 0)} originals, `
      + `${spells.length} spells against ${spellOriginals.length}; ${out.length} distinct lines, longest ${out[0]?.text.length ?? 0} characters`,
  };
}

async function signIn(page: Page): Promise<string> {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded: boolean } }).Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clerk's browser global is untyped here, as in every .mjs probe
      const clerk = (window as unknown as { Clerk: any }).Clerk;
      const signIn = clerk.client.signIn;
      let attempt = email.includes("+clerk_test")
        ? await signIn.create({ identifier: email })
        : await signIn.create({ identifier: email, password });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f: { strategy: string }) => f.strategy === "email_code");
        if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return (error as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ?? String(error);
    }
  }, [EMAIL, PASSWORD ?? ""] as const);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => (window as unknown as { Clerk: { user?: { id: string } } }).Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

let failures = 0;
let deckId: string | null = null;
let aboutPrior: { userId: string; existed: boolean; value: number | null } | null = null;
let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
try {
  const started = Date.now();
  const computed = await lines();
  // `MEASURE_TEXT` measures one given line (its body) instead, to read the instrument against a known string.
  const { lines: longest, counts } = process.env.MEASURE_TEXT
    ? { lines: [{ row: { body: [process.env.MEASURE_TEXT], muted: [] } as unknown as SheetRow, text: process.env.MEASURE_TEXT, from: "MEASURE_TEXT", originalId: "", modes: new Set<Mode>(["priced"]) }], counts: "one given line" }
    : computed;
  console.log(`${counts} (${((Date.now() - started) / 1000).toFixed(1)}s)`);

  await clerkSetup();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: WIDTH === 390 ? { width: 390, height: 844 } : { width: WIDTH, height: 900 } });
  const userId = await signIn(page);
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  const prior = await pool.query(`select about_version_seen from user_prefs where user_id = $1`, [userId]);
  aboutPrior = { userId, existed: (prior.rowCount ?? 0) > 0, value: prior.rows[0]?.about_version_seen ?? null };
  await pool.query(
    `insert into user_prefs (user_id, about_version_seen) values ($1, $2)
       on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, $2)`,
    [userId, version],
  );
  await clearAboutSheet(page, userId);

  // A Shopping row over $10, to open a sheet whose row lends its line element.
  const { rows: [over] } = await pool.query(
    `with newest as (select max(as_of) t from printing_prices)
     select c.oracle_id, c.name from cards c where c.name = any($2::text[])
        and not exists (select 1 from collection_items ci where ci.user_id = $1 and ci.oracle_id = c.oracle_id)
        and not exists (select 1 from printings p join printing_prices pp on pp.scryfall_id = p.scryfall_id, newest
                         where p.oracle_id = c.oracle_id and pp.as_of = newest.t and pp.price_cents <= 1000)
      limit 1`,
    [userId, ["Plateau", "Taiga", "Badlands", "Scrubland", "Tundra", "Volcanic Island", "Bayou", "Savannah"]],
  );
  if (!over) throw new Error("The account owns every dual the measure could open a sheet on.");
  const { rows: [kenrith] } = await pool.query(`select oracle_id from cards where name = 'Kenrith, the Returned King'`);
  deckId = (await pool.query(
    `insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe · swap lines', $2) returning id`, [userId, kenrith.oracle_id],
  )).rows[0].id as string;
  await pool.query(`insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)`, [deckId, over.oracle_id]);

  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  await onPageRole(page, "button", /^Shopping \d+/).first().click();
  await onPageRole(page, "button", new RegExp(`^Cheaper stand-ins for ${over.name},`)).first().click();
  const line = page.getByRole("dialog", { name: "Cheaper stand-ins" }).locator('[data-testid="stand-in-row"] p').first();
  await line.waitFor({ timeout: 30_000 });

  // Each line written into the live row's own element, the row's span structure kept: the body in its
  // span, the ` · ` in its own, then the muted clauses.
  // `MEASURE_WRAP` overrides the line's `text-wrap` (e.g. `wrap`), to read what `pretty` itself costs.
  const measured = await line.evaluate((p, { items, wrapMode }) => {
    const lh = parseFloat(getComputedStyle(p).lineHeight);
    const original = p.innerHTML;
    if (wrapMode) p.style.textWrap = wrapMode;
    const cs = getComputedStyle(p);
    const probe = document.createElement("span");
    probe.textContent = "0".repeat(100);
    p.append(probe);
    const charW = probe.getBoundingClientRect().width / 100;
    probe.remove();
    const self = { text: p.textContent, lines: p.getBoundingClientRect().height / lh, font: cs.fontFamily, size: cs.fontSize, wrap: cs.textWrap, charW, content: p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) };
    const body = p.firstElementChild?.outerHTML ?? "<span></span>";
    const dot = p.children[1]?.outerHTML ?? "<span> · </span>";
    const results = items.map(({ bodyText, mutedText }) => {
      const tpl = document.createElement("template");
      tpl.innerHTML = body;
      const b = tpl.content.firstElementChild as HTMLElement;
      b.textContent = bodyText;
      tpl.innerHTML = dot;
      const d = tpl.content.firstElementChild as HTMLElement;
      p.replaceChildren(...(bodyText ? [b] : []), ...(bodyText && mutedText ? [d] : []), document.createTextNode(mutedText));
      // Where each line breaks, read off the text itself, so a count can be checked against the words.
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      const breaks: string[] = [];
      let top: number | null = null;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        for (let i = 0; i < (n.textContent ?? "").length; i++) {
          const r = document.createRange();
          r.setStart(n, i);
          r.setEnd(n, i + 1);
          const t = r.getClientRects()[0]?.top;
          if (t === undefined) continue;
          if (top === null || Math.abs(t - top) > 2) { breaks.push(""); top = t; }
          breaks[breaks.length - 1] += n.textContent![i];
        }
      }
      return { lines: Math.round(p.getBoundingClientRect().height / lh), width: Math.round(p.getBoundingClientRect().width), breaks };
    });
    p.innerHTML = original;
    return { results, self, again: p.getBoundingClientRect().height / lh };
  }, { items: longest.map((l) => ({ bodyText: l.row.body.join(" · "), mutedText: l.row.muted.join(" · ") })), wrapMode: process.env.MEASURE_WRAP ?? "" })
    .then((r) => {
      console.log(`instrument: ${JSON.stringify(r.self)}, restored ${r.again}`);
      return r.results;
    });

  for (const mode of ["priced", "sold out"] as Mode[]) {
    const byLines = new Map<number, number>();
    longest.forEach((l, i) => { if (l.modes.has(mode)) byLines.set(measured[i].lines, (byLines.get(measured[i].lines) ?? 0) + 1); });
    console.log(`lines per row, ${mode}: ${[...byLines].sort((a, b) => a[0] - b[0]).map(([n, c]) => `${n}: ${c}`).join(", ")}`);
  }
  if (process.env.MEASURE_DUMP) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(process.env.MEASURE_DUMP, JSON.stringify(longest.map((l, i) => ({ text: l.text, from: l.from, originalId: l.originalId, standInId: l.row.oracleId, lines: measured[i].lines, body: l.row.body, muted: l.row.muted }))));
  }
  const worst = longest.map((l, i) => ({ ...l, ...measured[i] })).sort((a, b) => b.lines - a.lines || b.text.length - a.text.length);
  console.log(`rendered ${worst.length} longest lines at ${WIDTH} in a ${worst[0]?.width}px line box:`);
  for (const w of worst.slice(0, 8)) console.log(`  ${w.lines} line(s) · ${w.text.length} ch · ${w.text}  [${w.from}]`);
  if (process.env.MEASURE_TEXT) console.log(`  breaks: ${JSON.stringify((measured[0] as { breaks?: string[] }).breaks)}`);
  if (Number.isFinite(MAX_LINES) && !process.env.MEASURE_TEXT) {
    // The ruling's three lines, with the named residue allowed four and nothing allowed five.
    const listed = new Map(FOUR_LINE_RESIDUE.map((r) => [r.text, r]));
    const five = worst.filter((w) => w.lines > MAX_LINES + 1);
    const unlisted = worst.filter((w) => w.lines === MAX_LINES + 1 && listed.get(w.text)?.originalId !== w.originalId);
    const stale = FOUR_LINE_RESIDUE.filter((r) => {
      const w = worst.find((x) => x.text === r.text);
      return !w || w.lines !== MAX_LINES + 1 || w.originalId !== r.originalId || w.row.oracleId !== r.standInId;
    });
    const report = (ok: boolean, label: string, rows: string[]) => {
      if (!ok) failures += 1;
      console.log(`${ok ? "  ok  " : " FAIL "} ${label}`);
      for (const r of rows) console.log(`        ${r}`);
    };
    report(five.length === 0, `nothing reaches ${MAX_LINES + 2} lines at ${WIDTH}`, five.map((w) => `${w.lines}: ${w.text}  [${w.from}]`));
    report(unlisted.length === 0, `every row at ${MAX_LINES + 1} lines is on the named residue (${FOUR_LINE_RESIDUE.length})`,
      unlisted.map((w) => `${w.text}  [${w.from}, stand-in ${w.row.name}]`));
    report(stale.length === 0, "every residue entry still reads 4 lines, for its own original and stand-in",
      stale.map((r) => `stale: ${r.original} → ${r.standIn}: ${r.text}`));
  }
} catch (error) {
  failures += 1;
  console.log(` FAIL  the run threw — ${(error as Error).message}`);
} finally {
  if (deckId) await pool.query(`delete from decks where id = $1`, [deckId]).catch(() => { failures += 1; });
  if (aboutPrior) {
    const a = aboutPrior;
    await (a.existed
      ? pool.query(`update user_prefs set about_version_seen = $2 where user_id = $1`, [a.userId, a.value])
      : pool.query(`delete from user_prefs where user_id = $1`, [a.userId])
    ).catch(() => { failures += 1; });
  }
  await browser?.close();
  await pool.end();
}
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
