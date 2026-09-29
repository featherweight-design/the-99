// Gate for the printed name: a player looking at their own copy sees the name
// printed on it — *Battle of Olympus*, not *World at War* — on the decklist row,
// the card tile, the modal, and the decklist export.
//
// Every claim here is visual or export text, so it is read out of a real browser
// rather than asserted only in jsdom. The control state is checked beside the
// renamed one, because it is every card but a handful: an ordinary card must
// render byte-identically to before, with no `oracle` line and no reserved
// height for one.
//
// THE FIXTURE IS THIS SCRIPT'S OWN. `flavor_name` is null on all but a few
// hundred printings, and on a fresh local database it is null everywhere, so the
// probe plants a name on a card the probe deck actually contains and restores it
// in a `finally`. It picks an oracle whose every printing is null today and puts
// the value back as null, so an interrupted run leaves nothing behind but the
// state it found. #467's `scripts/probe-flavor-name.mjs` plants its rows by hand
// instead — that probe reads the Add panel, where any catalog card will do; this
// one needs the renamed card to be in a deck the account owns.
//
// Point it at `local-dev` or a scratch Neon branch — NEVER production. It writes.
//
// Run by hand, with a dev server up:
//   PROBE_DECK=<deck uuid> node scripts/probe-printed-name.mjs
// Not part of `pnpm test`: it needs a browser, a signed-in session and a database.
import { requireEnv } from "./lib/env.mjs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const {
  E2E_AUDIT_USER_EMAIL: EMAIL,
  E2E_AUDIT_USER_PASSWORD: PASSWORD,
  DATABASE_URL,
} = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK;
if (!DECK) throw new Error("Set PROBE_DECK to a deck the probe account owns.");

// The name planted on the fixture printing. Any string that is not the card's
// oracle name would do; the spec's own example makes the log read like the spec.
const PRINTED = "Battle of Olympus";

// A writing probe pointed at production would rename a card for every player.
// The check is deliberately blunt — a host that says production is refused, and
// nothing else about the string is trusted.
if (/prod/i.test(DATABASE_URL)) {
  throw new Error("DATABASE_URL looks like production. This probe writes — point it at local-dev.");
}

const VIEWPORTS = [
  { label: "narrowest supported · 320x700", width: 320, height: 700 },
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

let failures = 0;
function check(label, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
          });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * The card the probe renames, and a control beside it.
 *
 * The subject has to be a card in this deck that the player OWNS — an unowned
 * card keeps its oracle name by locked decision 2, so renaming one would prove
 * nothing. Every printing of it must print the oracle name today, so restoring
 * to null puts the row back exactly.
 *
 * It also has to be a holding that names the printing it is. The printed name
 * is read off `collection_items.scryfall_id` — the copy physically owned — and
 * the CSV the local fixture was seeded from carries neither a Scryfall id nor a
 * collector number, so no card on this database can have a printed name until
 * one row says which printing it is. The probe writes that too, and puts it
 * back: it is the state a real export with printing columns produces.
 */
async function pickFixture() {
  const { rows } = await pool.query(
    `select c.oracle_id, c.name,
            ci.set_code, ci.collector_number, ci.finish, ci.scryfall_id,
            p.scryfall_id as printing_id, p.collector_number as printing_number,
            p.image_uri as printing_image, c.image_uri as oracle_image
       from decks d
       join deck_cards dc on dc.deck_id = d.id
       join cards c on c.oracle_id = dc.oracle_id
       join collection_items ci on ci.user_id = d.user_id and ci.oracle_id = c.oracle_id
       join printings p
         on p.oracle_id = c.oracle_id
        and p.set_code = lower(ci.set_code)
        and p.is_representative
      where d.id = $1
        and c.type_line !~ 'Basic'
        and not exists (
          select 1 from printings q
           where q.oracle_id = c.oracle_id and q.flavor_name is not null
        )
        -- The art checks compare what the page draws against p.image_uri,
        -- the representative printing for the holding's set. That is only the
        -- picture the route resolves when nothing outranks it: a holding that
        -- names its copy by id resolves that copy instead, and an art
        -- preference outranks both. Excluding them here keeps the expected URL
        -- and the resolved one the same thing, rather than failing a route
        -- that is behaving correctly.
        -- And a printing that HAS a picture: a null one is "distinct from" the
        -- oracle image and would sort to the front as the subject, but the
        -- route falls through it to the oracle art and prints no name at all.
        and p.image_uri is not null
        and ci.scryfall_id is null
        and not exists (
          select 1 from card_art_preferences a
           where a.user_id = ci.user_id and a.oracle_id = c.oracle_id
        )
        -- One holding per card, so the restore has one row to put back.
        and 1 = (select count(*) from collection_items x
                  where x.user_id = ci.user_id and x.oracle_id = ci.oracle_id)
      -- A subject whose printing draws different art from the oracle row is
      -- the only one that can prove the two travel together: where they are
      -- the same picture, reading the wrong column looks correct.
      order by (p.image_uri is distinct from c.image_uri) desc, c.name
      limit 2`,
    [DECK],
  );
  if (rows.length < 2) {
    throw new Error(
      "Need two owned, non-basic, un-renamed cards in PROBE_DECK — is the deck built and the collection seeded?",
    );
  }
  const [subject, control] = rows;
  subject.owned = `${subject.set_code.toUpperCase()} ${subject.printing_number}`;
  return { subject, control };
}

/**
 * Point the holding at a real printing, and print a name on that printing.
 * Returns the undo, which reverses both by the key the first update wrote.
 */
async function plant(s) {
  await pool.query(`update printings set flavor_name = $2 where scryfall_id = $1`, [
    s.printing_id,
    PRINTED,
  ]);
  const { rowCount } = await pool.query(
    `update collection_items set scryfall_id = $5, collector_number = $6
      where user_id = (select user_id from decks where id = $1)
        and oracle_id = $2 and set_code = $3 and finish = $4 and collector_number = $7`,
    [DECK, s.oracle_id, s.set_code, s.finish, s.printing_id, s.printing_number, s.collector_number],
  );
  if (rowCount !== 1) throw new Error(`fixture holding did not update (${rowCount} rows)`);
  return async () => {
    await pool.query(
      `update collection_items set scryfall_id = $5, collector_number = $6
        where user_id = (select user_id from decks where id = $1)
          and oracle_id = $2 and set_code = $3 and finish = $4 and collector_number = $7`,
      [DECK, s.oracle_id, s.set_code, s.finish, s.scryfall_id, s.collector_number, s.printing_number],
    );
    await pool.query(`update printings set flavor_name = null where scryfall_id = $1`, [
      s.printing_id,
    ]);
  };
}

/**
 * The `title` attributes on the row or tile that names this card — the
 * attribute the spec forbids on these surfaces, because it is pointer-only
 * recovery on a phone-first surface.
 *
 * Scoped to that one row's subtree rather than the page: the deck spine puts a
 * `title` on the partner's name, which is a different surface and out of this
 * feature's scope, and a page-wide count would report it as this row's fault.
 */
const titlesOnRow = (page, text) =>
  page.evaluate((wanted) => {
    const leaf = [...document.querySelectorAll("span, div, a, button")]
      .filter((n) => n.children.length === 0)
      .find((n) => (n.textContent ?? "").trim() === wanted);
    if (!leaf) return null;
    let container = leaf;
    for (let i = 0; i < 6 && container.parentElement; i += 1) {
      container = container.parentElement;
      if (container.tagName === "LI" || container.getAttribute("role") === "listitem") break;
    }
    const titles = [...container.querySelectorAll("[title]")].map((n) => n.getAttribute("title"));
    if (container.hasAttribute("title")) titles.push(container.getAttribute("title"));
    return titles;
  }, text);

/** The tallest of the elements whose own text is `text`, plus its line height —
 *  a caption is one line when the two are within a line of each other. */
function captionLines(page, text) {
  return page.evaluate((wanted) => {
    const node = [...document.querySelectorAll("span, div")]
      .filter((n) => n.children.length === 0)
      .find((n) => (n.textContent ?? "").trim() === wanted);
    if (!node) return null;
    const s = getComputedStyle(node);
    const line = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
    return { height: node.getBoundingClientRect().height, line, lines: Math.round(node.getBoundingClientRect().height / line) };
  }, text);
}

/**
 * The background image the tile captioned `text` draws, or null.
 *
 * Walks out from the caption rather than querying the page, so the answer is
 * this card's art and not the first picture on the screen.
 */
const tileArt = (page, text) =>
  page.evaluate((wanted) => {
    const leaf = [...document.querySelectorAll("span, div")]
      .filter((n) => n.children.length === 0)
      .find((n) => (n.textContent ?? "").trim() === wanted);
    if (!leaf) return null;
    let container = leaf;
    for (let i = 0; i < 6 && container.parentElement; i += 1) {
      container = container.parentElement;
      // A CSS background, or a lazy <img> (the /collection grid and the deck Card view).
      const art = [...container.querySelectorAll("*")]
        .map((n) => (n.tagName === "IMG" ? `url("${n.currentSrc || n.getAttribute("src")}")` : getComputedStyle(n).backgroundImage))
        .find((v) => v.startsWith("url("));
      if (art) return art.slice(5, -2);
    }
    return null;
  }, text);

/** Open the modal from the named trigger and report the header. */
async function readModal(page, triggerName) {
  const trigger = page.getByRole("button", { name: new RegExp(escapeRe(triggerName)) });
  // Reported, not thrown: a missing trigger is one more finding, and throwing
  // here would cost every check after it at this viewport.
  if ((await trigger.count()) === 0) return { error: `no trigger named ${triggerName}` };
  await trigger.first().click();
  await page.waitForTimeout(600);
  const shot = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { error: "no dialog" };
    const heading = dialog.querySelector("h3");
    const header = heading?.parentElement;
    const labels = [...dialog.querySelectorAll("*")]
      .filter((n) => n.children.length === 0)
      .map((n) => (n.textContent ?? "").trim());
    // The distance between the title and the type line. Header HEIGHT cannot
    // answer the reserved-space question on its own — two cards have names of
    // different lengths, so their titles wrap differently — but the gap between
    // the same two elements is the same measurement on both cards.
    const paragraphs = header ? [...header.querySelectorAll("p")] : [];
    const typeLine = paragraphs.at(-1);
    const gap =
      heading && typeLine
        ? Math.round(typeLine.getBoundingClientRect().top - heading.getBoundingClientRect().bottom)
        : null;
    return {
      heading: (heading?.textContent ?? "").trim(),
      paragraphs: paragraphs.length,
      gap,
      oracleLabel: labels.includes("oracle"),
      text: dialog.innerText.replace(/\s+/g, " ").trim(),
    };
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  return shot;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let undo = async () => {};
const browser = await chromium.launch();
try {
  const { subject, control } = await pickFixture();
  console.log(`subject: ${subject.name} → "${PRINTED}"  owned as ${subject.owned}`);
  console.log(`control: ${control.name} (prints its own oracle name)`);
  undo = await plant(subject);

  await clerkSetup();

  for (const { label, width, height } of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await signIn(page);
    console.log(`\n########## ${label}`);

    await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // 1 — the list view names the copy, and the whole name reaches a button.
    const listView = page.getByRole("button", { name: "List view" });
    if ((await listView.count()) > 0) {
      await listView.first().click();
      await page.waitForTimeout(500);
    }
    check("list: the row shows the printed name", (await page.getByText(PRINTED, { exact: true }).count()) > 0);
    check(
      "list: the row never shows the oracle name",
      (await page.getByText(subject.name, { exact: true }).count()) === 0,
      subject.name,
    );
    check(
      "list: the full printed name is a button's accessible name",
      (await page.getByRole("button", { name: new RegExp(escapeRe(PRINTED)) }).count()) > 0,
    );
    const listTitles = await titlesOnRow(page, PRINTED);
    check("list: the row carries no title attribute", listTitles?.length === 0, JSON.stringify(listTitles));

    // 3 — the modal titles the card by its printing and glosses the oracle name.
    const renamed = await readModal(page, PRINTED);
    check("modal: the heading is the printed name", renamed.heading === PRINTED, renamed.heading);
    check("modal: an `oracle` label is present", renamed.oracleLabel === true);
    check("modal: the oracle name follows it", renamed.text.includes(subject.name));
    check("modal: the oracle line is a line of its own", renamed.paragraphs === 2, JSON.stringify(renamed.paragraphs));

    // 4 — the control state: no label, and no height reserved for one.
    const ordinary = await readModal(page, control.name);
    check("modal control: the heading is the oracle name", ordinary.heading === control.name, ordinary.heading);
    check("modal control: no `oracle` label", ordinary.oracleLabel === false);
    check("modal control: it has only the type line under the title", ordinary.paragraphs === 1);
    check(
      "modal control: no height is held open for the line it does not draw",
      ordinary.gap !== null && renamed.gap !== null && ordinary.gap < renamed.gap,
      `control gap ${ordinary.gap}px vs renamed ${renamed.gap}px`,
    );

    // 2 — the card view: printed caption, one line, and still no `title`.
    const cardView = page.getByRole("button", { name: "Card view" });
    if ((await cardView.count()) === 0) {
      check("grid: the Card view control exists", false);
    } else {
      await cardView.first().click();
      await page.waitForTimeout(700);
      check("grid: the tile caption shows the printed name", (await page.getByText(PRINTED, { exact: true }).count()) > 0);
      const caption = await captionLines(page, PRINTED);
      check("grid: the caption is one line high", caption !== null && caption.lines === 1, JSON.stringify(caption));
      const tileTitles = await titlesOnRow(page, PRINTED);
      check("grid: the tile carries no title attribute", tileTitles?.length === 0, JSON.stringify(tileTitles));
      check(
        "grid: the full printed name is a button's accessible name",
        (await page.getByRole("button", { name: new RegExp(escapeRe(PRINTED)) }).count()) > 0,
      );

      // 2b — the art and the caption are the same printing. Stated first as a
      // fact about the fixture: where the two pictures are identical the check
      // below passes off either column and proves nothing, so a run that could
      // not find such a subject says so rather than reporting a green.
      check(
        "grid: the fixture's printing draws different art from the oracle row",
        subject.printing_image !== subject.oracle_image,
        subject.printing_image === subject.oracle_image ? "same picture — the art check is vacuous" : "",
      );
      const art = await tileArt(page, PRINTED);
      check(
        "grid: the tile draws the art of the printing it is named for",
        art === subject.printing_image,
        `${art} vs ${subject.printing_image}`,
      );
      const controlArt = await tileArt(page, control.name);
      check(
        "grid control: an un-renamed card still draws its own printing's art",
        controlArt === control.printing_image,
        `${controlArt} vs ${control.printing_image}`,
      );
    }

    // 5 — the export. The decklist names the printing; the shopping list does not.
    const exportButton = page.getByRole("button", { name: "Export" });
    if ((await exportButton.count()) === 0) {
      check("export: the Export control exists", false);
    } else {
      await exportButton.first().click();
      await page.waitForTimeout(600);
      const decklist = await page.evaluate(
        () => document.querySelector('[role="dialog"][aria-label="Export deck"]')?.innerText ?? "",
      );
      const line = decklist.split("\n").find((l) => l.includes(PRINTED));
      const match = line?.match(/^(\d+) (.+) \(([A-Za-z0-9]+)\) (\S+)$/);
      check("export: the renamed line names name AND printing", Boolean(match), JSON.stringify(line));
      if (match) {
        check("export: the name on that line is the printed one", match[2] === PRINTED, match[2]);
        check(
          "export: the printing is one the player owns",
          `${match[3].toUpperCase()} ${match[4]}` === subject.owned,
          `${match[3]} ${match[4]} vs owned ${subject.owned}`,
        );
      }
      check(
        "export: the oracle name is nowhere in the decklist",
        !decklist.includes(subject.name),
        subject.name,
      );

      const shoppingTab = page.getByRole("button", { name: "Shopping list" });
      if ((await shoppingTab.count()) === 0) {
        console.log("  SKIP  export: no Shopping tab on this deck");
      } else {
        await shoppingTab.first().click();
        await page.waitForTimeout(500);
        const shopping = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"][aria-label="Export deck"]');
          const panel = dialog?.querySelector('[role="tabpanel"]') ?? dialog;
          return panel?.innerText ?? "";
        });
        // A fully-owned fixture deck has nothing to buy; the claim is only
        // meaningful when the list has rows in it.
        const names = shopping.split("\n").filter((l) => /[A-Za-z]/.test(l));
        if (names.length === 0) {
          console.log("  SKIP  export: the shopping list is empty on this deck");
        } else {
          check("export: the shopping list names no printing", !/\([A-Za-z0-9]{2,6}\)/.test(shopping));
        }
      }
      await page.keyboard.press("Escape");
    }

    await page.screenshot({ path: `/tmp/printed-name-${width}.png`, fullPage: false });
    await context.close();
  }
} finally {
  await undo();
  await browser.close();
  await pool.end();
}

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
