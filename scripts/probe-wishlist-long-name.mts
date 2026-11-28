// pnpm probe:wishlist-long-name: a Wishlist deck box whose deck name is too long for its band, at phone and desktop
// width (#3440). The name ends in an ellipsis on one line, and the card count and "Open deck" stay whole beside it:
// the count sits inside the band, left of the link, and nothing overlaps. Fails on main, where the title ran on as
// inline text, so a long word pushed the count and the link out of the band and words wrapped the count to a line of
// its own.
// It renames one of the reader's decks and turns the reader's wishlist sync on, so it runs on a SCRATCH branch only
// and puts the name back when it ends.
//
//   PROBE_BRANCH=br-… PROBE_USER=user_… PROBE_DECK_ID=<uuid> PROBE_BASE=http://localhost:3440 pnpm probe:wishlist-long-name
// PROBE_USER is the Clerk id of E2E_AUDIT_USER_EMAIL; PROBE_DECK_ID one of its decks with cards it does not own; the
// dev server at PROBE_BASE runs on the same branch.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const BRANCH = process.env.PROBE_BRANCH;
const USER = process.env.PROBE_USER;
const DECK_ID = process.env.PROBE_DECK_ID;
if (!BRANCH || !USER || !DECK_ID) throw new Error("set PROBE_BRANCH, PROBE_USER and PROBE_DECK_ID");

const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const { rows: who } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
if (who[0]?.b !== BRANCH) throw new Error(`database reports ${who[0]?.b}, not ${BRANCH}; nothing written`);
assertScratchBranch(who[0]?.b, "probe:wishlist-long-name");
const { setWishlistSync, syncWishlistNow } = await import("../src/lib/wishlist/sync");

const NAMES = [
  // Each at or near the deck-name ceiling (DECK_NAME_MAX, 120), so it overflows the band at 1300 as well as 390.
  ["words", "Probe 3440 Gishath, Sun's Avatar and every dinosaur she ever brought to the table on a long Friday night at the card sho"],
  ["one word", "Probe3440SupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidocious"],
] as const;

const { rows: deck } = await db.execute<{ name: string }>(sql`select name from decks where id = ${DECK_ID} and user_id = ${USER}`);
if (!deck[0]) throw new Error("PROBE_DECK_ID is not one of PROBE_USER's decks");
const ORIGINAL = deck[0].name;

async function setName(name: string) {
  await db.execute(sql`update decks set name = ${name}, off_wishlist = false where id = ${DECK_ID}`);
  await setWishlistSync(USER!, true);
  await syncWishlistNow(USER!);
}

async function signIn(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded: boolean } }).Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clerk = (window as any).Clerk;
        let attempt = email.includes("+clerk_test")
          ? await clerk.client.signIn.create({ identifier: email })
          : await clerk.client.signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
          await clerk.client.signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
          attempt = await clerk.client.signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (error as any)?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const failures: string[] = [];
const check = (ok: boolean, what: string, got?: unknown) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}${ok ? "" : `  (got ${JSON.stringify(got)})`}`);
  if (!ok) failures.push(what);
};

async function run(viewport: { width: number; height: number }, label: string) {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport })).newPage();
  try {
    await signIn(page);
    for (const [kind, name] of NAMES) {
      await setName(name);
      await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "domcontentloaded" });
      const box = page.getByTestId("wishlist-box").filter({ has: page.getByRole("link", { name: `Open deck, ${name}` }) });
      await box.first().waitFor({ timeout: 30_000 });
      const m = await box.first().evaluate((el, name) => {
        const heading = el.querySelector("h2")!;
        const band = heading.parentElement!;
        const link = band.querySelector("a")!;
        const count = heading.querySelector("[class*='font-mono']") as HTMLElement | null;
        // No named helpers in here: tsx wraps them in a `__name` call the page does not define.
        const b = band.getBoundingClientRect(), l = link.getBoundingClientRect(), c = count ? count.getBoundingClientRect() : null;
        // The innermost element holding the name: on main the heading's own span, with the fix its truncating span.
        const holders = [heading, ...heading.querySelectorAll("span")].filter((s) => s.textContent?.includes(name));
        const text = holders[holders.length - 1] as HTMLElement;
        const range = document.createRange();
        range.selectNodeContents(text);
        const tops = new Set([...range.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
        return {
          bandRight: b.right, linkLeft: l.left, linkRight: l.right,
          countLeft: c?.left ?? null, countRight: c?.right ?? null, countTop: c?.top ?? null, countBottom: c?.bottom ?? null,
          linkTop: l.top, linkBottom: l.bottom,
          lines: tops.size,
          clipped: text.scrollWidth > text.clientWidth,
          name: heading.textContent,
        };
      }, name);
      const tag = `${label}, ${kind}`;
      check(m.countRight !== null && m.countRight <= m.linkLeft, `${tag}: the count ends before Open deck`, m);
      check(m.linkRight <= m.bandRight + 0.5, `${tag}: Open deck stays inside the band`, m);
      check(m.countTop !== null && m.countBottom! > m.linkTop && m.countTop < m.linkBottom, `${tag}: the count sits on the link's line`, m);
      check(m.lines === 1 && m.clipped, `${tag}: the name is one line, ended in an ellipsis`, { lines: m.lines, clipped: m.clipped });
      check(!!m.name?.includes(name), `${tag}: the heading still carries the whole name`, m.name);
      if (process.env.PROBE_SHOT) await page.screenshot({ path: `${process.env.PROBE_SHOT}-${label}-${kind.replace(" ", "-")}.png` });
    }
  } finally {
    await browser.close();
  }
}

try {
  await clerkSetup();
  await run({ width: 390, height: 844 }, "phone");
  await run({ width: 1300, height: 900 }, "desktop");
} finally {
  await db.execute(sql`update decks set name = ${ORIGINAL} where id = ${DECK_ID}`);
}
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nall passed");
process.exit(0);
