// "I own this precon" (Start dialog checkbox, the receipt on the deck page, History's "Added from ...") walked in a
// real browser at 390x844 and 1300x900 (precon ownership UI, PR B; Hugh specified it, no design round).
//
// Per width: the Start dialog draws the box UNTICKED with the Printings fact unchanged; ticking swaps that fact;
// starting adds first and lands on the deck with the receipt in the arrival band (title, body, History link, Undo, ✕)
// and `?added=` already stripped from the address while `from=precon` stays; a reload shows no receipt; History's top
// precon entry reads "Added from Probe Own". Phone then presses Undo and Revert (the receipt goes, the copies go);
// desktop presses ✕ (the receipt goes). Layout: no horizontal overflow, the ✕ is in the band's corner and the receipt
// text stops before it, and Undo sits inside the viewport.
//
// It writes a fixture precon of 31 cards the account does NOT own (`ProbePreconOwn`), and removes it, the decks
// it started and the collection rows the adds made (the fixture cards are unowned, so deleting their rows restores the
// collection exactly) in a `finally`. Point it at local-dev (it checks the branch). Needs PRECONS_ENABLED=true and
// COLLECTION_EDIT_ENABLED=true in the server's environment, started FRESH (the precon catalog is memoized per server).
//
//   PRECONS_ENABLED=true COLLECTION_EDIT_ENABLED=true pnpm dev   (another shell)
//   PROBE_BASE=http://localhost:3000 node scripts/probe-precon-own.mjs
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
const FILE = "ProbePreconOwn";
const NAME = "Probe Own";

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1300, height: 900 },
];

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
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
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
  return page.evaluate(() => window.Clerk.user.id);
}

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

let userId = null;
let fixtureIds = [];
async function cleanup() {
  if (userId) {
    await sql`delete from decks where user_id = ${userId} and built_from_precon = ${FILE}`;
    if (fixtureIds.length > 0) await sql`delete from collection_items where user_id = ${userId} and oracle_id = any(${fixtureIds}::uuid[])`;
  }
  await sql`delete from precons where file_name = ${FILE}`;
}

await clerkSetup();
const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
if (!branch || branch === PRODUCTION || branch === STAGING) {
  throw new Error(`refusing to write a fixture to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev`);
}
const browser = await chromium.launch();
try {
  const probeContext = await browser.newContext();
  const probePage = await probeContext.newPage();
  userId = await signIn(probePage);
  await probeContext.close();
  await cleanup();

  // The commander must pass the deck start's own check (a legal legendary creature); the rest are any unowned legal card.
  const [lead] = await sql`
    select oracle_id from cards c
    where commander_legal and type_line like 'Legendary Creature%' and type_line not like '%//%'
      and not exists (select 1 from collection_items ci where ci.user_id = ${userId} and ci.oracle_id = c.oracle_id)
    order by name limit 1`;
  const body = await sql`
    select oracle_id from cards c
    where commander_legal and type_line not like 'Basic%' and type_line not like '%//%' and oracle_id <> ${lead.oracle_id}
      and not exists (select 1 from collection_items ci where ci.user_id = ${userId} and ci.oracle_id = c.oracle_id)
    order by name limit 30`;
  if (!lead || body.length < 30) throw new Error("the account owns too much of the catalog for an unowned fixture");
  const cards = [lead, ...body];
  fixtureIds = cards.map((c) => c.oracle_id);
  const rest = body;
  await sql`insert into precons (file_name, name, set_code, release_date) values (${FILE}, ${NAME}, 'PRB', '2026-01-01')`;
  await sql`insert into precon_cards (file_name, position, oracle_id, quantity, is_commander) values (${FILE}, 0, ${lead.oracle_id}, 1, true)`;
  for (const [i, c] of rest.entries()) {
    await sql`insert into precon_cards (file_name, position, oracle_id, quantity, is_commander) values (${FILE}, ${i + 1}, ${c.oracle_id}, 1, false)`;
  }

  for (const w of WIDTHS) {
    const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.name === "phone", isMobile: w.name === "phone" });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks/precons/${encodeURIComponent(FILE)}`, { waitUntil: "domcontentloaded" });
    const start = onPage(page, 'button:has-text("Start with this precon")').filter({ visible: true }).first();
    await start.waitFor({ timeout: 60_000 }).catch(async () => {
      console.error(page.url(), (await onPage(page, "main").first().innerText().catch(() => "(no main)")).slice(0, 300));
      throw new Error("no Start button: restart the dev server so its ten-minute precon catalog memo is empty, then run again");
    });
    await start.click();
    const dialog = page.getByRole("dialog");
    const box = dialog.getByRole("checkbox", { name: /I own this precon/ });
    await box.waitFor();
    check(!(await box.isChecked()), `${w.name}: the box is unticked by default`, "unticked");
    check(await dialog.getByText("picked from the copies you hold").isVisible(), `${w.name}: the Printings fact is the usual one while unticked`, "usual");
    const bb = await box.boundingBox();
    check(bb && bb.width >= 16 && bb.height >= 16, `${w.name}: the box is a real target`, `${bb?.width}x${bb?.height}`);
    await box.check();
    check(await dialog.getByText("the box’s own, from the copies you add").isVisible(), `${w.name}: ticking swaps the Printings fact`, "swapped");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(over <= 0, `${w.name}: the dialog causes no horizontal overflow`, `${over}px`);
    await dialog.getByRole("button", { name: "Start the deck" }).click();

    await page.waitForURL(/\/decks\/[0-9a-f-]{36}/, { timeout: 60_000 });
    const receipt = page.getByRole("button", { name: "Undo" });
    await receipt.waitFor({ timeout: 30_000 });
    check(await page.getByText("31 copies added").isVisible(), `${w.name}: the receipt says what was added`, "31 copies added");
    check(await page.getByRole("link", { name: "See it in History" }).isVisible(), `${w.name}: the receipt links to History`, "link");
    await page.waitForFunction(() => !new URL(location.href).searchParams.has("added"), null, { timeout: 10_000 });
    const sp = await page.evaluate(() => new URL(location.href).searchParams.get("from"));
    check(sp === "precon", `${w.name}: ?added= is stripped and from=precon stays`, `from=${sp}`);
    const geo = await page.evaluate(() => {
      const x = document.querySelector('button[aria-label="Dismiss the receipt"]');
      const band = x.parentElement;
      const t = [...band.querySelectorAll("p")].map((p) => { const r = document.createRange(); r.selectNodeContents(p); return r.getBoundingClientRect().right; });
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        xRight: band.getBoundingClientRect().right - x.getBoundingClientRect().right,
        xTop: x.getBoundingClientRect().top - band.getBoundingClientRect().top,
        xLeft: x.getBoundingClientRect().left, textRight: Math.max(...t),
      };
    });
    const want = w.name === "phone" ? { right: 4, top: 2 } : { right: 22, top: 4 };
    check(geo.overflow <= 0, `${w.name}: the deck page has no horizontal overflow with the receipt`, `${geo.overflow}px`);
    check(Math.abs(geo.xRight - want.right) <= 1 && Math.abs(geo.xTop - want.top) <= 1, `${w.name}: the ✕ sits in the band's corner`, `${geo.xRight.toFixed(1)}px right, ${geo.xTop.toFixed(1)}px top`);
    check(geo.textRight <= geo.xLeft + 0.5, `${w.name}: the receipt text stops before the ✕`, `text ends ${geo.textRight.toFixed(0)}, ✕ starts ${geo.xLeft.toFixed(0)}`);

    if (w.name === "phone") {
      // Undo: the existing revert confirmation, then the receipt goes and the copies are gone from the collection.
      await receipt.click();
      await page.getByRole("button", { name: "Revert", exact: true }).click();
      await page.getByText("31 copies added").waitFor({ state: "detached", timeout: 30_000 });
      const [{ n }] = await sql`select count(*)::int as n from collection_items where user_id = ${userId} and oracle_id = any(${fixtureIds}::uuid[])`;
      check(n === 0, `${w.name}: Undo reverts the add and the receipt goes`, `${n} fixture rows left`);
    } else {
      await page.getByRole("button", { name: "Dismiss the receipt" }).click();
      check((await page.getByText("31 copies added").count()) === 0, `${w.name}: the ✕ dismisses the receipt`, "gone");
    }
    // A reload first: the address was stripped, so nothing draws a receipt again (History keeps the record).
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("tab").first().waitFor({ timeout: 30_000 }).catch(() => {});
    check((await page.getByText("31 copies added").count()) === 0, `${w.name}: a reload shows no receipt`, "gone");

    await page.goto(`${BASE}/collection/history`, { waitUntil: "domcontentloaded" });
    await page.getByText(`Added from ${NAME}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
    check((await page.getByText(`Added from ${NAME}`).count()) > 0, `${w.name}: History titles the entry "Added from ${NAME}"`, "titled");
    await context.close();
  }
} finally {
  await cleanup();
  await browser.close();
}
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
