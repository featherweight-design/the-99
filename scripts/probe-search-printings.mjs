// Alternate printings from search (handoff design_handoff_the99_alternate_printings, README-R2), pressed: a card opened
// from card search shows a strip of its catalog printings. Selecting a thumb VIEWS that printing in place (title caption
// and the pressed thumb move, nothing is stored), Add to collection opens Edit copies with the printing on screen, and
// closing forgets the view. On the phone the strip scrolls under a swipe without paging the card or dragging the sheet;
// on desktop the ▸ paddle and the arrow keys move it.
//
// Read-only: it signs in, searches, presses and cancels; it writes nothing (the Edit copies sheet is cancelled).
//   PROBE_BASE=http://localhost:3721 PROBE_QUERY="Black Lotus" node scripts/probe-search-printings.mjs
// PROBE_QUERY must name a card with 2+ catalog printings that the account owns NONE of (a card with 6+ makes the strip
// overflow, which the swipe and paddle checks need). Point it at local-dev or a scratch branch, NEVER production.
// PROBE_SHOTS=<dir> saves a frame per step.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const QUERY = process.env.PROBE_QUERY ?? "Black Lotus";
const SHOTS = process.env.PROBE_SHOTS;
let failed = 0;
const check = (width, label, ok, saw) => {
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : " FAIL "} [${width}] ${label} — ${saw}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const s = window.Clerk.client.signIn;
      let a = await s.create({ identifier: email });
      const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
      await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
      a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (a.status !== "complete") return `sign-in status: ${a.status}`;
      await window.Clerk.setActive({ session: a.createdSessionId });
      return null;
    } catch (e) { return e?.errors?.[0]?.longMessage ?? String(e); }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const SIZES = { phone: { width: 390, height: 844, touch: true }, desktop: { width: 1300, height: 900, touch: false } };
const sheet = (page) => page.getByRole("dialog", { name: "Search all cards" });
const card = (page) => page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: new RegExp(QUERY, "i") }) });

async function run(browser, name, { width, height, touch }) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, serviceWorkers: "block" });
  const page = await ctx.newPage();
  const shot = async (tag) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/printings-${name}-${tag}.png` }); };
  const openCard = async () => {
    // The press can land before hydration: press again until the sheet is up.
    for (let i = 0; i < 8 && !(await sheet(page).isVisible()); i++) {
      await page.getByRole("button", { name: "Search all cards", exact: true }).locator("visible=true").first().click();
      await sheet(page).waitFor({ timeout: 3_000 }).catch(() => {});
    }
    const field = sheet(page).getByRole("combobox");
    await field.waitFor({ timeout: 60_000 });
    await field.fill(QUERY, { timeout: 60_000 });
    const option = sheet(page).getByRole("option").first();
    await option.waitFor({ timeout: 30_000 });
    await option.click();
    await card(page).first().waitFor({ timeout: 30_000 });
  };
  const strip = () => card(page).getByTestId("printing-strip").locator("visible=true").first();
  const thumbs = () => strip().getByRole("button", { name: /number/ });
  const pressedCount = () => thumbs().evaluateAll((els) => els.filter((e) => e.getAttribute("aria-pressed") === "true").length);
  const swipe = async (x, y, dx) => {
    const cdp = await ctx.newCDPSession(page);
    const pt = (px) => [{ x: px, y, id: 1 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(x) });
    for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt(x + (dx * i) / 8) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(400);
  };
  try {
    await signIn(page);
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
    await openCard();
    // R3 (phone): no strip. The Set line is the "N printings" button; it opens the panel over a taller shelf, and the
    // panel closes by its ✕ and by Escape (the card stays).
    if (touch) {
      const button = card(page).getByTestId("printings-button");
      const there = await button.waitFor({ timeout: 15_000 }).then(() => true, () => false);
      check(name, "the Set line is a printings button", there, there ? (await button.innerText()).replace(/\s+/g, " ") : "no printings-button");
      check(name, "no strip is drawn on the phone", (await card(page).getByTestId("printing-strip").locator("visible=true").count()) === 0, "strip absent");
      if (!there) return;
      const height = async () => Math.round((await card(page).getByTestId("card-sheet").boundingBox()).height);
      const h0 = await height();
      await shot("rest");
      await button.click();
      const panel = card(page).getByTestId("printings-panel");
      const open = await panel.waitFor({ timeout: 5_000 }).then(() => true, () => false);
      check(name, "pressing the button opens the panel", open, open ? "panel visible" : "no panel");
      if (!open) return;
      await page.waitForTimeout(500);
      const h1 = await height();
      check(name, "the shelf grows for the panel", h1 > h0, `sheet ${h0} -> ${h1}`);
      check(name, "the field has focus", await panel.getByRole("searchbox").or(panel.getByRole("textbox")).first().evaluate((el) => el === document.activeElement).catch(() => false), "search field focused");
      await shot("panel");
      await panel.getByRole("button", { name: /^Close/ }).click();
      await panel.waitFor({ state: "detached", timeout: 3_000 }).catch(() => {});
      await page.waitForTimeout(500);
      check(name, "the ✕ closes the panel and the shelf returns", (await panel.count()) === 0 && (await height()) === h0, `sheet ${await height()} (was ${h0})`);
      check(name, "focus returns to the button", await button.evaluate((el) => el === document.activeElement), "button focused");
      await button.click();
      await panel.waitFor({ timeout: 5_000 });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      check(name, "Escape closes the panel and not the card", (await panel.count()) === 0 && (await card(page).first().isVisible()), "panel closed, card open");
      return;
    }
    // An absent strip is a failed check, not a thrown timeout: the probe must fail on the strip itself.
    const drawn = await strip().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    check(name, "the strip is drawn under the card", drawn, drawn ? "visible" : "no printing-strip on screen");
    if (!drawn) return;
    const n = await thumbs().count();
    check(name, "the strip lists the card's printings", n > 1, `thumbs=${n}`);
    check(name, "no printings disclosure is on the Set field", (await card(page).locator("button[aria-expanded]").filter({ hasText: /\d+ printings/ }).count()) === 0, "trigger absent");
    check(name, "one thumb is shown", (await pressedCount()) === 1, `pressed=${await pressedCount()}`);
    const heading = card(page).getByRole("heading", { name: new RegExp(QUERY, "i") }).first();
    const live = () => page.locator('[aria-live="polite"]').allInnerTexts().then((t) => t.join(" "));
    await shot("rest");

    const scrollerOf = () => strip().evaluateHandle((el) => [...el.querySelectorAll("*")].find((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== "visible") ?? null);
    const overflow = await (await scrollerOf()).evaluate((e) => (e ? e.scrollWidth - e.clientWidth : 0));
    const scrollLeft = async () => (await scrollerOf()).evaluate((e) => (e ? e.scrollLeft : -1));

    if (touch) {
      if (overflow > 2) {
        const box = await strip().boundingBox();
        const startLeft = await scrollLeft();
        const headingBefore = (await heading.innerText()).trim();
        const sheetTop = (await card(page).first().boundingBox())?.y;
        await swipe(box.x + box.width * 0.8, box.y + box.height / 2, -box.width * 0.6);
        const moved = (await scrollLeft()) - startLeft;
        check(name, "a swipe on the strip scrolls it", moved > 20, `scrolled ${Math.round(moved)}px`);
        check(name, "the swipe did not page the card", (await heading.innerText()).trim() === headingBefore, `heading="${headingBefore}"`);
        check(name, "the swipe did not drag the sheet", (await strip().boundingBox()).y === box.y, `y ${box.y}->${(await strip().boundingBox()).y} top ${sheetTop}`);
      } else {
        check(name, "the strip overflows (pick a card with more printings)", false, `overflow=${overflow}`);
      }
    } else if (overflow > 2) {
      const fwd = card(page).getByRole("button", { name: "More printings" }).locator("visible=true").first();
      const before = await scrollLeft();
      await fwd.click();
      await page.waitForTimeout(500);
      check(name, "the ▸ paddle scrolls the strip forward", (await scrollLeft()) > before, `${before}->${await scrollLeft()}`);
      const back = card(page).getByRole("button", { name: "Previous printings" }).locator("visible=true").first();
      check(name, "the ◂ paddle appears once scrolled", await back.isVisible().catch(() => false), "back paddle");
    }

    // Select a thumb that is not shown: it is viewed in place, nothing is stored.
    const all = await thumbs().evaluateAll((els) => els.map((e) => [e.getAttribute("aria-pressed"), e.getAttribute("aria-label") ?? ""]));
    const target = all.findIndex(([p]) => p !== "true");
    await thumbs().nth(target).scrollIntoViewIfNeeded();
    await thumbs().nth(target).click();
    const after = await thumbs().evaluateAll((els) => els.map((e) => e.getAttribute("aria-pressed")));
    check(name, "the selected thumb is the one shown", after[target] === "true" && after.filter((p) => p === "true").length === 1, `target=${target}`);
    const m = /^(.*?), number (\S+?)(,|$)/.exec(all[target][1]);
    check(name, "the title area names that printing", !!m && (await card(page).first().innerText()).includes(m[2]), `want number ${m?.[2]}`);
    check(name, "the live line announces it", !!m && (await live()).includes(`Showing ${m[1]}`), `live="${(await live()).slice(0, 80)}"`);
    await shot("viewing");

    // Keys: an arrow moves the roving focus, Enter selects.
    if (!touch) {
      await thumbs().nth(target).focus();
      await page.keyboard.press("ArrowLeft");
      const focusedIdx = await thumbs().evaluateAll((els) => els.findIndex((e) => e === document.activeElement));
      check(name, "ArrowLeft moves focus along the strip", focusedIdx === target - 1 || target === 0, `focus ${focusedIdx} from ${target}`);
    }

    // R3 (desktop): the strip's Search tile opens the printings panel over the details column; selecting views a
    // printing and keeps the panel open; Escape closes the panel first (the card stays), then the card.
    if (!touch) {
      const tile = strip().getByRole("button", { name: "Search printings" });
      const hasTile = (await tile.count()) === 1;
      check(name, "the strip leads with a Search tile", hasTile, hasTile ? "tile present" : "no Search tile");
      if (hasTile) {
        await tile.click();
        const panel = card(page).getByTestId("printings-panel");
        const open = await panel.waitFor({ timeout: 5_000 }).then(() => true, () => false);
        check(name, "pressing the tile opens the panel", open, open ? "panel visible" : "no panel");
        if (open) {
          const focusOk = await page.evaluate(() => document.activeElement?.getAttribute("placeholder")?.startsWith("Search ") === true);
          check(name, "focus moves to the search field", focusOk, "placeholder-focused");
          const box = await panel.boundingBox();
          const sBox = await strip().boundingBox();
          check(name, "the panel sits under the strip", !!box && !!sBox && box.y >= sBox.y + sBox.height - 2, `panel y ${Math.round(box?.y ?? -1)}, strip bottom ${Math.round((sBox?.y ?? 0) + (sBox?.height ?? 0))}`);
          const row = panel.getByRole("button", { name: /number/ });
          const rn = await row.count();
          check(name, "the panel lists every printing", rn === n, `panel=${rn} strip=${n}`);
          await shot("panel-open");
          await page.keyboard.type("beta");
          await shot("panel-query");
          await panel.getByRole("searchbox").or(panel.getByRole("textbox")).first().fill("");
          await page.keyboard.type("zzzzzz");
          const empty = await panel.getByText(/No printings match/).isVisible().catch(() => false);
          check(name, "a query with no match says so", empty, empty ? "empty head" : "no empty head");
          await panel.getByRole("searchbox").or(panel.getByRole("textbox")).first().fill("");
          const pick = row.nth(rn > 1 ? 1 : 0);
          const pLabel = (await pick.getAttribute("aria-label")) ?? "";
          await pick.click();
          check(name, "selecting in the panel views it and keeps the panel open", (await pick.getAttribute("aria-pressed")) === "true" && (await panel.isVisible()), pLabel.slice(0, 40));
          await page.keyboard.press("Escape");
          const gone = !(await panel.isVisible().catch(() => false));
          check(name, "Escape closes the panel and not the card", gone && (await card(page).first().isVisible()), gone ? "panel closed, card open" : "panel still open");
          const back = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Search printings");
          check(name, "focus returns to the tile", back, "tile focused");
        }
      }
    }

    // Add to collection opens Edit copies at the printing on screen.
    if (!touch) await thumbs().nth(target).click();
    const more = card(page).getByRole("button", { name: /All details/ }).locator("visible=true").first();
    if (await more.count()) await more.click().catch(() => {});
    const add = card(page).getByRole("button", { name: /Add to collection/ }).locator("visible=true").first();
    if (await add.count()) {
      await add.click();
      const edit = page.locator('[role="dialog"]').filter({ hasText: /Edit copies|Add cards|Add to collection/ }).last();
      await edit.waitFor({ timeout: 30_000 });
      await page.waitForFunction(() => ![...document.querySelectorAll('[role="dialog"]')].some((d) => /Reading your copies/.test(d.textContent ?? "")), null, { timeout: 30_000 });
      const body = (await edit.innerText()).replace(/\s+/g, " ");
      const setCode = /\((\w+)\), number/.exec(all[target][1])?.[1] ?? m?.[1];
      check(name, "Add to collection opens at the printing on screen", !!m && body.includes(`#${m[2]}`), `want #${m?.[2]} (${setCode})`);
      await shot("edit");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Discard", exact: true }).click({ timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(800);
    } else {
      check(name, "Add to collection is offered", false, "no button");
    }

    // A fresh open has forgotten the view.
    for (let i = 0; i < 4 && (await page.getByRole("dialog").count()) > 0; i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
    }
    await openCard();
    await strip().waitFor({ timeout: 15_000 });
    const reopened = await thumbs().evaluateAll((els) => els.findIndex((e) => e.getAttribute("aria-pressed") === "true"));
    const first = all.findIndex(([p]) => p === "true");
    check(name, "closing forgets the view", reopened === first, `shown ${reopened}, was ${first}`);
  } catch (e) {
    failed++;
    await shot("threw").catch(() => {});
    console.log(` FAIL [${name}] threw — ${String(e).split("\n")[0]}`);
  } finally {
    await ctx.close();
  }
}

await clerkSetup();
const browser = await chromium.launch();
for (const [name, size] of Object.entries(SIZES)) await run(browser, name, size);
await browser.close();
console.log(failed ? `${failed} FAILED` : "all checks passed");
process.exit(failed ? 1 : 0);
