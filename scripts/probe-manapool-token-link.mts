// Proves, in a real browser, that ONE Mana Pool add-deck link can carry name-only card lines and
// `[SET] number` token lines together, and that each token line lands on the printing it names
// (plan `2026-10-11-tokens-for-my-deck.md`, PR 2; audit finding 3).
//
// It builds the token catalog and the chosen printing per token from a `pnpm catalog:fetch <dir>`
// exactly as the app will (`TokenCatalogBuilder`, `compareTokenOffers`), writes the lines with the
// app's own `manapoolAddDeckUrl`, loads the real `manapool.com/add-deck` page, and reads what the
// page says back. READS A PUBLIC PAGE; it completes no cart and signs in as nobody.
//
//   CATALOG_FETCH_DIR=<dir> pnpm probe:manapool-token-link
//
// What the page reports (measured 2026-10-11): `Any Printing: (n/m in stock)` counts lines it can
// place by name, `Exact: (n/m in stock)` counts lines whose named printing is in stock, and a line
// it cannot place is drawn `Card not found`. Name-only lines count as exact. So a clean run has
// every line placed, Any = Exact = the line count; and a CONTROL line naming a set and number that
// do not exist must pull Exact below Any, which proves the counter can fail at all.
import "./lib/env.mjs";
import { chromium } from "playwright";
import { fetchBulkIndex, streamBulkEntries } from "../src/lib/scryfall/bulk";
import { fetchManapoolSingles } from "../src/lib/manapool/client";
import { parseManapoolPayload } from "../src/lib/manapool/parse";
import { manapoolAddDeckUrl, MANAPOOL_URL_MAX, type ManapoolLine } from "../src/lib/manapool/links";
import type { PriceRow } from "../src/lib/manapool/parse";
import { TokenCatalogBuilder } from "../src/lib/tokens/catalog";
import { compareTokenOffers, tokenManapoolLine, type TokenOffer, type TokenPriceFact } from "../src/lib/tokens/price";

// Tokens the brief names: Aang's four, and the four whose names are also real cards' names.
const NAMES = ["Ally", "Monk", "Soldier", "Food", "Treasure", "Ninja", "Spirit", "Timeless Witness"];

async function main() {
  if (!process.env.CATALOG_FETCH_DIR) throw new Error("probe:manapool-token-link: set CATALOG_FETCH_DIR to a `pnpm catalog:fetch` directory");

  const builder = new TokenCatalogBuilder();
  for await (const e of streamBulkEntries(await fetchBulkIndex("default_cards"))) builder.add(e);
  const catalog = builder.finish(new Set());
  const feed = parseManapoolPayload(await fetchManapoolSingles());
  const newest = feed.asOf;
  const feedById = new Map<string, PriceRow>(feed.rows.map((r) => [r.scryfallId, r]));

  // The chosen printing per token oracle, by the app's own rule.
  type Offer = TokenOffer & { setCode: string; collectorNumber: string; row: PriceRow };
  const offersByToken = new Map<string, Offer[]>();
  for (const p of catalog.printings) {
    const r = feedById.get(p.scryfallId);
    if (!r) continue;
    const list = offersByToken.get(p.tokenOracleId) ?? [];
    list.push({ scryfallId: p.scryfallId, priceCents: r.priceCents, priceCentsFoil: r.priceCentsFoil, priceCentsEtched: r.priceCentsEtched, asOf: r.asOf, setCode: p.setCode, collectorNumber: p.collectorNumber, row: r });
    offersByToken.set(p.tokenOracleId, list);
  }
  const chosen = (oracleId: string) => [...(offersByToken.get(oracleId) ?? [])].sort((a, b) => compareTokenOffers(a, b, newest))[0];

  const tokens = catalog.tokens.filter((t) => NAMES.includes(t.name) || t.layout === "double_faced_token").filter((t) => chosen(t.oracleId));
  // Every distinct token under those names (the collisions), and three double-faced ones.
  const named = tokens.filter((t) => NAMES.includes(t.name));
  const dfc = tokens.filter((t) => t.layout === "double_faced_token").slice(0, 3);
  let differing = 0;
  const lines: ManapoolLine[] = [{ name: "Sol Ring", quantity: 1 }, { name: "Lightning Bolt", quantity: 1 }];
  for (const t of [...named, ...dfc]) {
    const c = chosen(t.oracleId);
    // The line the app sends: Mana Pool's own name, set and number for the product the price belongs to.
    const fact: TokenPriceFact = {
      cents: c.priceCents, foilCents: c.priceCentsFoil, etchedCents: c.priceCentsEtched, asOf: c.asOf,
      printing: { scryfallId: c.scryfallId, setCode: c.setCode, collectorNumber: c.collectorNumber, productName: c.row.productName, productSet: c.row.productSet, productNumber: c.row.productNumber },
    };
    lines.push(tokenManapoolLine(t.name, 1, fact));
    if (c.row.productNumber !== c.collectorNumber) differing++;
  }
  console.log(`${differing} of ${lines.length - 2} token lines name a Mana Pool number that is not Scryfall's`);
  console.log(`${lines.length} lines: ${lines.length - 2} token lines (${named.length} under the brief's names, ${dfc.length} double-faced) and 2 card lines`);

  const browser = await chromium.launch();
  let failed = false;
  try {
    const clean = await read(browser, lines);
    console.log("clean :", clean);
    if (clean.notFound.length > 0) { console.error(`FAIL: ${clean.notFound.length} line(s) were not found: ${clean.notFound.join("; ")}`); failed = true; }
    if (clean.any !== lines.length || clean.exact !== lines.length) {
      console.error(`FAIL: expected Any = Exact = ${lines.length}, got Any ${clean.any}/${clean.anyOf}, Exact ${clean.exact}/${clean.exactOf}`);
      failed = true;
      // Say WHICH lines: each one alone, so a printing Mana Pool does not recognise is named.
      for (const line of lines.filter((l) => l.printing)) {
        const label = line.printing ? `${line.name} [${line.printing.setCode.toUpperCase()}] ${line.printing.collectorNumber}` : line.name;
        try {
          const one = await read(browser, [line]);
          if (one.exact !== 1) console.error(`  not exact: ${label} (Any ${one.any}/${one.anyOf}, Exact ${one.exact}/${one.exactOf}, not found: ${one.notFound.join("; ") || "none"})`);
        } catch (e) {
          console.error(`  unreadable: ${label} (${e instanceof Error ? e.message : String(e)})`);
        }
      }
    }

    // The control: the same list plus one line naming a printing that does not exist.
    const control = await read(browser, [...lines, { name: "Treasure", quantity: 1, printing: { setCode: "tla", collectorNumber: "99999" } }]);
    console.log("control:", control);
    if (!(control.exact < control.any)) { console.error("FAIL: the control line did not pull Exact below Any, so this probe cannot tell a wrong printing from a right one"); failed = true; }
  } finally {
    await browser.close();
  }

  // Length: Omnath's cart (the brief: 67 card lines and 14 tokens) in one link.
  const cart: ManapoolLine[] = [
    ...Array.from({ length: 67 }, (_, i) => ({ name: `Typical Card Name Number ${String(i).padStart(2, "0")}`, quantity: 1 })),
    ...lines.slice(2, 16),
  ];
  const href = manapoolAddDeckUrl(cart)!;
  console.log(`Omnath-sized cart (67 cards + 14 token lines): ${href.length} characters, limit ${MANAPOOL_URL_MAX}`);
  if (href.length > MANAPOOL_URL_MAX) { console.error("FAIL: one Omnath cart no longer fits one link"); failed = true; }
  process.exit(failed ? 1 : 0);
}

async function read(browser: Awaited<ReturnType<typeof chromium.launch>>, lines: ManapoolLine[]) {
  const page = await browser.newPage();
  try {
    await page.goto(manapoolAddDeckUrl(lines)!, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForFunction(() => /Exact:\s*\n?\(\d+\/\d+ in stock/.test(document.body.innerText), undefined, { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(2500);
    const text = await page.locator("body").innerText();
    const count = (label: string) => {
      const m = text.match(new RegExp(`${label}:\\s*\\n?\\(?(\\d+)/(\\d+) in stock`));
      if (!m) throw new Error(`the page did not report "${label}"; Mana Pool's add-deck page has changed`);
      return [Number(m[1]), Number(m[2])] as const;
    };
    const [any, anyOf] = count("Any Printing");
    const [exact, exactOf] = count("Exact");
    const notFound = [...text.matchAll(/(\S[^\n]*)\n\s*Card not found/g)].map((m) => m[1].trim());
    return { any, anyOf, exact, exactOf, notFound };
  } finally {
    await page.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
