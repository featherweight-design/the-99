/**
 * probe:swap-fits — Fits your decks in a real browser (swap tools PR 5b), at 1300x900 and 390x844.
 *
 * It presses what a reader presses: a card's name on a deck page opens the card, the footer's
 * `Find a deck for it →` opens the picker OVER the card, and Add puts the card in another deck's
 * draft. What it proves is what jsdom cannot:
 *   - the door has layout at each width, 44px tall on the phone;
 *   - the picker is 560 wide on desktop and starts at 96px on the phone;
 *   - the card stays the same node under it, covered;
 *   - a universal staple's chip reads `staple · any commander` in italics with no percentage, and
 *     the staple note is drawn once;
 *   - Add writes the row the database then holds, and stamps the row `in the draft`;
 *   - the add's reply is small. The action defers its revalidation with after(), so the page it
 *     was called from is not shipped back (the proof 5a moved here, since 5a had no caller);
 *   - Escape closes the picker and lands focus on the door.
 *   - a reason line wraps between its segments only (close-out ruling 5), read per character at 390
 *     on the longest-named partner of a counted two-card combo. With the old markup the dot sits at
 *     the end of the first line (311px against a need at 327). The lead's own nowrap cannot be failed
 *     from the catalog: the longest counted lead, `Completes a combo with Mister Fantastic, Reed
 *     Richards`, fits one line at 390 with or without it, so that half is defensive.
 *
 * FIXTURE. Two decks under the audit account: one led by Kenrith (every color) holding a colorless
 * universal staple, and one led by a mono-blue legend holding nothing, which the staple fits. The
 * staple is chosen through `loadUniversalStaples`, the one definition, never a list of our own.
 * Both decks are deleted in a `finally`, and the About row is put back as the run found it. Needs
 * a server with SWAP_TOOLS_ENABLED=true (PROBE_BASE). Point it at local-dev, never production.
 *
 * Four mutations fail it: the add revalidating inside the action (1,392,099 bytes against 77), the
 * phone door's 44px row removed (22px), the door's focus return removed (focus on BODY), and the
 * picker at 640 wide. The reply is measured from `/collection` and not the deck page, and that is
 * the lesson of its first run: from the deck page the inline revalidation cost about 3 KB and the
 * check passed over it, because revalidating the deck's own paths re-renders almost nothing there.
 */
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Locator, type Page } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";
import { requireEnv } from "./lib/env.mjs";
import { loadUniversalStaples } from "../src/lib/staples/universal";
import { swapToolsCopy } from "../src/lib/copy/swap-tools";
import { isInfiniteOrGameEnding } from "../src/lib/spellbook/combo-features";

neonConfig.webSocketConstructor = ws;
const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const pool = new Pool({ connectionString: DATABASE_URL });
const copy = swapToolsCopy.fits;

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

let failures = 0;
let aboutPrior: Awaited<ReturnType<typeof captureAboutSeen>> | null = null;
function report(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
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
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  aboutPrior = await captureAboutSeen(userId);
  await pool.query(
    `insert into user_prefs (user_id, about_version_seen) values ($1, $2)
       on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, $2)`,
    [userId, version],
  );
  await clearAboutSheet(page, userId);
  return userId;
}

const q = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cardDialogs = (page: Page) => page.locator('[role="dialog"][aria-labelledby^="card-modal-title"]');
const picker = (page: Page) => page.getByRole("dialog", { name: copy.pickerTitle });
const visibleDoor = (page: Page) => page.getByTestId("fits-door").filter({ visible: true }).first();

async function openRowCard(page: Page, name: string): Promise<Locator> {
  const target = onPage(page, "span, button").filter({ hasText: new RegExp(`^${q(name)}$`) }).filter({ visible: true }).first();
  for (let i = 0; i < 8 && (await target.count()) === 0; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(250);
  }
  await target.click();
  const card = cardDialogs(page).first();
  await card.waitFor({ timeout: 20_000 });
  return card;
}

void (async () => {
  const deckIds: string[] = [];
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    await clerkSetup();
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: WIDTHS[0].viewport });
    const page = await context.newPage();
    const userId = await signIn(page);

    // The staple, through the one definition, and colorless so the blue deck can take it.
    const staples = [...(await loadUniversalStaples(drizzle(pool) as never))];
    const { rows: [staple] } = await pool.query(
      `select c.oracle_id, c.name from cards c where c.oracle_id = any($1::uuid[]) and cardinality(c.color_identity) = 0
         and c.commander_legal and c.name not like '%//%'
         and exists (select 1 from collection_items ci where ci.user_id = $2 and ci.oracle_id = c.oracle_id)
       order by c.name limit 1`,
      [staples, userId],
    );
    // Owned, so `/collection` can open it: that is the route whose reply measures the deferral.
    if (!staple) throw new Error("The account owns no colorless universal staple on this database.");
    const { rows: [kenrith] } = await pool.query(`select oracle_id from cards where name = 'Kenrith, the Returned King'`);
    const { rows: [blue] } = await pool.query(
      `select oracle_id from cards where commander_legal and type_line ~* 'legendary creature'
         and color_identity = array['U']::text[] order by name limit 1`,
    );
    const holder = (await pool.query(
      `insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe · fits holder', $2) returning id`, [userId, kenrith.oracle_id],
    )).rows[0].id as string;
    deckIds.push(holder);
    const taker = (await pool.query(
      `insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe · fits taker', $2) returning id`, [userId, blue.oracle_id],
    )).rows[0].id as string;
    deckIds.push(taker);
    await pool.query(`insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)`, [holder, staple.oracle_id]);
    console.log(`fixture: ${staple.name} held by ${holder}, taken by ${taker}`);

    for (const w of WIDTHS) {
      await page.setViewportSize(w.viewport);
      await pool.query(`delete from deck_cards where deck_id = $1`, [taker]);
      await page.goto(`${BASE}/decks/${holder}`, { waitUntil: "domcontentloaded" });
      const card = await openRowCard(page, staple.name);
      const cardNode = await card.elementHandle();

      // The door.
      const door = visibleDoor(page);
      await door.waitFor({ timeout: 10_000 });
      const doorBox = await door.boundingBox();
      report(`${w.label} door`, doorBox !== null, doorBox ? `${Math.round(doorBox.width)}x${Math.round(doorBox.height)}` : "no layout");
      if (w.label === 390) report("390 door target", (doorBox?.height ?? 0) >= 44, `${doorBox?.height ?? 0}px`);

      // The picker, over the card.
      await door.click();
      const sheet = picker(page);
      await sheet.waitFor({ timeout: 15_000 });
      await sheet.getByTestId("fits-row").first().waitFor({ timeout: 20_000 });
      const box = await sheet.boundingBox();
      if (w.label === 1300) report("1300 picker width", Math.round(box?.width ?? 0) === 560, `${Math.round(box?.width ?? 0)}px`);
      else report("390 picker top", Math.round(box?.y ?? 0) === 96, `${Math.round(box?.y ?? 0)}px`);
      const sameNode = await cardNode!.evaluate((el) => el.isConnected && el.closest("[inert]") !== null);
      report(`${w.label} card stays, covered`, sameNode, sameNode ? "same node, inert" : "replaced or live");

      // The staple form on the taker's row, and the note once.
      const row = sheet.getByTestId("fits-row").filter({ hasText: "probe · fits taker" });
      const rowText = (await row.innerText()).replace(/\s+/g, " ");
      report(`${w.label} staple reason line`, rowText.includes(copy.cmdrStaple) && !/%/.test(rowText), rowText.slice(0, 120));
      const italic = await row.getByText(copy.cmdrStaple).evaluate((el) => getComputedStyle(el).fontStyle);
      report(`${w.label} staple reason italic`, italic === "italic", italic);
      report(`${w.label} staple note once`, (await sheet.getByTestId("fits-staple-note").count()) === 1, "count");
      const heldRow = sheet.getByTestId("fits-holds-row").filter({ hasText: "probe · fits holder" });
      report(`${w.label} holder listed as holding`, (await heldRow.count()) === 1, (await heldRow.count()) ? (await heldRow.innerText()).replace(/\s+/g, " ") : "absent");

      // Add.
      await row.getByRole("button", { name: /^Add / }).click();
      await row.getByText(copy.added).waitFor({ timeout: 15_000 });
      const { rows: written } = await pool.query(`select 1 from deck_cards where deck_id = $1 and oracle_id = $2`, [taker, staple.oracle_id]);
      report(`${w.label} add written`, written.length === 1, `${written.length} row`);
      const open = row.getByRole("link", { name: copy.openDeck });
      report(`${w.label} open the deck`, (await open.getAttribute("href")) === `/decks/${taker}`, (await open.getAttribute("href")) ?? "none");

      // Escape closes the picker to the card, and focus lands on the door.
      await page.keyboard.press("Escape");
      await sheet.waitFor({ state: "detached", timeout: 5_000 });
      await page.waitForFunction(() => {
        const el = document.activeElement as HTMLElement | null;
        return el?.dataset.testid === "fits-door";
      }, null, { timeout: 3_000 }).catch(() => null);
      const onDoor = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? document.activeElement?.tagName ?? "");
      report(`${w.label} focus back on the door`, onDoor === "fits-door", onDoor);
      report(`${w.label} card still open`, (await cardDialogs(page).count()) === 1, "card");
      await page.keyboard.press("Escape");
    }

      // THE REPLY, from `/collection`: a revalidation inside the action would re-render that route into
      // its reply (1.6 MB measured by probe:printing-pick), where after() leaves a few bytes. The deck
      // page cannot show it, since revalidating the deck's own paths re-renders almost nothing there.
      await page.setViewportSize(WIDTHS[0].viewport);
      await pool.query(`delete from deck_cards where deck_id = $1`, [taker]);
      await page.goto(`${BASE}/collection?card=${staple.oracle_id}`, { waitUntil: "domcontentloaded" });
      await cardDialogs(page).first().waitFor({ timeout: 20_000 });
      await visibleDoor(page).click();
      const sheet = picker(page);
      const row = sheet.getByTestId("fits-row").filter({ hasText: "probe · fits taker" });
      await row.waitFor({ timeout: 20_000 });
      const reply = page.waitForResponse((res) => res.request().method() === "POST"
        && Boolean(res.request().headers()["next-action"]) && res.request().postData()?.includes(taker) === true);
      await row.getByRole("button", { name: /^Add / }).click();
      const bytes = (await (await reply).body()).length;
      await row.getByText(copy.added).waitFor({ timeout: 15_000 });
      report("/collection add reply is small", bytes < 20_000, `${bytes.toLocaleString()} bytes`);

      // Close-out ruling 5: a reason line wraps BETWEEN its segments only. The longest-named partner in a
      // two-card combo the picker counts (`isInfiniteOrGameEnding`, the combo read's own test), for a
      // short-named card that is no staple, on a Kenrith deck, read at 390: the combo segment on one line
      // and inside the row, and the dot on the same line as the need it introduces.
      const { rows: pairs } = await pool.query(
        `select x.oracle_id x_id, x.name x_name, p.oracle_id p_id, p.name p_name, v.produces
           from spellbook_variants v
           join spellbook_variant_cards a on a.variant_id = v.variant_id and not a.must_be_commander
           join spellbook_variant_cards b on b.variant_id = v.variant_id and b.oracle_id <> a.oracle_id and not b.must_be_commander
           join cards x on x.oracle_id = a.oracle_id join cards p on p.oracle_id = b.oracle_id
          where v.card_count = 2 and cardinality(v.requires_template_ids) = 0 and x.commander_legal and p.commander_legal
            and length(x.name) < 16 and x.name not like '%//%' and p.name not like '%//%' and not (x.oracle_id = any($1::uuid[]))
          order by length(p.name) desc, p.name, x.name limit 200`,
        [staples],
      );
      const pick = pairs.find((r) => isInfiniteOrGameEnding(r.produces));
      if (!pick) throw new Error("No two-card combo the picker counts pairs a short-named card with a long-named partner.");
      const x = { oracle_id: pick.x_id as string, name: pick.x_name as string };
      const partner = { oracle_id: pick.p_id as string, name: pick.p_name as string };
      console.log(`combo fixture: ${x.name} with ${partner.name}`);
      const combo = (await pool.query(
        `insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe · fits combo', $2) returning id`, [userId, kenrith.oracle_id],
      )).rows[0].id as string;
      deckIds.push(combo);
      await pool.query(`insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)`, [combo, partner.oracle_id]);
      await pool.query(`insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)`, [holder, x.oracle_id]);
      await page.setViewportSize(WIDTHS[1].viewport);
      await page.goto(`${BASE}/decks/${holder}`, { waitUntil: "domcontentloaded" });
      await openRowCard(page, x.name);
      await visibleDoor(page).click();
      const comboRow = picker(page).getByTestId("fits-row").filter({ hasText: "probe · fits combo" });
      await comboRow.waitFor({ timeout: 20_000 });
      // Read by GEOMETRY, one character at a time, never by the markup: which line each character of the
      // reason sits on. The lead is everything before the ` · `; the dot must share a line with the need.
      const wrap = await comboRow.getByTestId("fits-reason").evaluate((line) => {
        const chars: Array<{ ch: string; top: number }> = [];
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          for (let i = 0; i < (n.textContent ?? "").length; i++) {
            const r = document.createRange();
            r.setStart(n, i);
            r.setEnd(n, i + 1);
            const rect = r.getClientRects()[0];
            if (rect) chars.push({ ch: n.textContent![i], top: Math.round(rect.top) });
          }
        }
        const text = chars.map((c) => c.ch).join("");
        const dot = text.indexOf("·");
        const lead = (dot < 0 ? chars : chars.slice(0, dot)).filter((c) => c.ch.trim());
        const after = dot < 0 ? null : chars.slice(dot + 1).find((c) => c.ch.trim()) ?? null;
        const row = line.closest('[data-testid="fits-row"]')!.getBoundingClientRect();
        return {
          text,
          leadLines: new Set(lead.map((c) => c.top)).size,
          lines: new Set(chars.filter((c) => c.ch.trim()).map((c) => c.top)).size,
          inside: line.getBoundingClientRect().right <= row.right + 0.5 && line.scrollWidth <= line.clientWidth,
          dotTop: dot < 0 ? null : chars[dot].top,
          nextTop: after?.top ?? null,
        };
      });
      report("390 combo reason: the long name's segment is unbroken and inside the row",
        wrap.text.includes(partner.name) && wrap.leadLines === 1 && wrap.inside,
        `lead on ${wrap.leadLines} line(s) of ${wrap.lines}, inside ${wrap.inside}: ${wrap.text}`);
      report("390 combo reason: the reason wraps, so the dot's place was tested", wrap.lines > 1, `${wrap.lines} line(s)`);
      report("390 combo reason: the dot travels with the need",
        wrap.dotTop !== null && wrap.dotTop === wrap.nextTop, wrap.dotTop === null ? "no dot drawn" : `dot at ${wrap.dotTop}, need at ${wrap.nextTop}`);
      await page.keyboard.press("Escape");
    } catch (e) {
    failures += 1;
    console.log(` FAIL  the run threw — ${(e as Error).message}`);
  } finally {
    for (const id of deckIds) await pool.query(`delete from decks where id = $1`, [id]).catch(() => { failures += 1; });
    if (aboutPrior) await restoreAboutSeen(aboutPrior).catch(() => { failures += 1; });
    await browser?.close();
    await pool.end();
  }
  // Reported AFTER the `finally`: an exit there swallows the throw and prints a pass.
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures ? 1 : 0);
})();
