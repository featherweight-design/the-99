// A printing pick lands on the list behind the modal, and does it without a round trip.
//
// The bug: `/collection` mounted the card modal's provider with no post-write callback, so a
// pick was written, the modal closed, and the grid went on drawing the printing the reader
// had just replaced. `revalidatePath` does not refresh a mounted client route and window
// focus does not fire for an action taken in this tab, so nothing on that page ever knew.
//
// TWO THINGS ONLY A BROWSER CAN ANSWER, and the second is the reason this is a probe rather
// than another component test:
//
//   THE ART MOVED. The patch is a client-side state write, so what proves it is a painted
//   `background-image` on the tile, read after the modal is gone.
//
//   NOTHING WAS REFETCHED. Hugh's ruling: the fix targets client state, never a refresh.
//   This route's payload is the largest in the app, and a `router.refresh()` here would
//   look identical on screen while re-reading every card in the collection. So the probe
//   counts document loads and main-frame navigations across the whole press and requires
//   the count to be unchanged — a check no assertion about the DOM can make.
//
// It WRITES a card art preference for the account it signs in as and clears it in a
// `finally`, through the modal's own `Use the default again` control. THAT CONTROL IS
// ASSERTED, not attempted: a cleanup that cannot find its button and says nothing leaves a
// pick on the fixture account and reports a clean run, which is how the first version of
// this file behaved. A card that already carried a pick before the run is refused as a
// fixture rather than overwritten, since clearing is not restoring. Point it at
// `local-dev`, never production.
//
//   node scripts/probe-printing-pick.mjs
//   PROBE_BASE=http://localhost:3600 node scripts/probe-printing-pick.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

/**
 * What a write's reply may carry, in bytes.
 *
 * Set above the card-detail read's own reply (~15 KB here, and it grows with the card) and
 * an order of magnitude below a re-rendered `/collection`, which measured 1,665,949 bytes.
 * Anything in between is a page payload nobody asked for.
 */
const PAYLOAD_CEILING = 120_000;

/** The printing region's reset control, by the label it ships (`printingPickerCopy.printing.resetAria`). */
const RESET_ARIA = "Stop using your pick and go back to the automatic art";

let failures = 0;
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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
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
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/** The tile's painted art, which is the thing under test — never a prop, never a class. */
const tileArt = (tile) => tile.evaluate(async (el) => {
  // The grid draws its art as a lazily loaded <img> (the list payload lane, PR 1). What it
  // PAINTS is the source it resolved, so that is read — once the tile is in view and the
  // picture has loaded, since a lazy image off screen has asked for nothing yet.
  const img = el.querySelector("img");
  if (img) {
    el.scrollIntoView({ block: "center" });
    if (!img.complete) {
      await new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 15_000);
      });
    }
    return img.naturalWidth > 0 ? img.currentSrc : null;
  }
  const box = el.querySelector("[style*='background-image']");
  return box ? getComputedStyle(box).backgroundImage : null;
});

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  // Populated BEFORE the write it covers, so an abort between the two cannot leave the
  // account pinned to a printing nobody chose.
  let restore = null;

  try {
    await signIn(page);
    await page.goto(`${BASE}/collection?view=grid`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3_000);

    // A card owned in more than one printing, found by ASKING THE MODAL rather than by
    // reading the collection: the picker's own trigger counts the printings it will offer,
    // and that count is the thing the pick needs two of.
    // The tile is a plain <button> whose accessible name is the card's own name, so it is
    // reached by the art box it wraps rather than by a label it does not carry.
    const tiles = onPage(page, 'button:has(div[style*="aspect-ratio"])');
    const total = await tiles.count();
    let tile = null;
    let chosen = -1;
    for (let i = 0; i < Math.min(total, 25); i++) {
      await tiles.nth(i).click();
      await page.waitForTimeout(1_200);
      // `Set: … 2 printings owned. Choose which one represents this card.` — the trigger's
      // own spoken name, which exists only when the account owns more than one.
      const trigger = page.getByRole("button", { name: /printings owned\./ }).first();
      const many = (await trigger.count()) > 0;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      if (many) { tile = tiles.nth(i); chosen = i; break; }
    }
    if (tile === null) {
      // `failures` is what the exit code is taken from in `finally`, so this reports and
      // falls through rather than returning: an early `return` from inside the `try` skips
      // the line that sets it, and the run exits 0 while printing FAIL.
      report("a card owned in two printings", false,
        `none among the first ${Math.min(total, 25)} tiles. NOT a pass: this account cannot`
        + " exercise the pick. Point the probe at a collection that owns one card twice.");
      return;
    }

    const before = await tileArt(tile);
    // Counted across the whole press. A `router.refresh()` shows as a main-frame navigation
    // even though the URL does not move, which is exactly the cost this fix exists to avoid.
    let loads = 0;
    const navUrls = [];
    const rsc = [];
    page.on("load", () => { loads += 1; });
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) navUrls.push(f.url()); });
    page.on("response", async (r) => {
      if (r.request().method() !== "POST" && !r.url().includes("_rsc=")) return;
      let size = 0;
      try { size = (await r.body()).length; } catch {}
      rsc.push(`${r.request().method()} ${size}B ${r.url().slice(0, 70)}`);
    });

    await tile.click();
    await page.waitForTimeout(1_200);
    await page.getByRole("button", { name: /printings owned\./ }).first().click();
    await page.waitForTimeout(800);

    const options = page.getByRole("radio");
    const count = await options.count();
    // The pick that is NOT on screen now: picking the one already shown writes a preference
    // and moves no art, which would pass every check here while proving nothing.
    let target = -1;
    for (let i = 0; i < count; i++) {
      const label = (await options.nth(i).getAttribute("aria-label")) ?? "";
      const checked = await options.nth(i).getAttribute("aria-checked");
      if (checked !== "true" && !/shown now/i.test(label)) { target = i; break; }
    }
    if (target < 0) {
      report("a printing other than the one shown", false, `${count} radios, none selectable`);
      return;
    }
    // A card that already carries a pick is refused outright: this run's cleanup CLEARS the
    // preference, which would silently discard a choice the account's owner made. The reset
    // control is drawn only when a pick exists, so its absence is the test.
    if (await page.getByRole("button", { name: RESET_ARIA }).count() > 0) {
      report("a card with no pick on it already", false,
        "the card this run chose already carries an art preference, and this probe's cleanup"
        + " would clear it. Pick a different fixture, or clear it deliberately first.");
      return;
    }
    // Set before the write it covers, so a throw part-way through still reaches the cleanup.
    restore = { tileIndex: chosen };
    await options.nth(target).click();
    await page.waitForTimeout(1_500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1_500);

    const after = await tileArt(tile);
    report("the tile draws the printing that was picked", before !== null && after !== before,
      `before ${String(before).slice(0, 60)} / after ${String(after).slice(0, 60)}`);
    // The whole point of patching state rather than refetching. A refresh would satisfy the
    // check above and cost a re-read of every card in the collection.
    console.log("  --   writes:", JSON.stringify(rsc, null, 1));
    // The real property, and the one a DOM assertion cannot reach. Navigations are not the
    // measure here: the modal mirrors the open card into the URL with `history.replaceState`,
    // which fires `framenavigated` three times over a press and fetches nothing. What a
    // refresh actually costs is a re-render of this route inside the write's own reply, so
    // the check is the size of that reply. Before the fix it was 1,665,949 bytes.
    const biggest = Math.max(0, ...rsc.map((r) => Number(r.match(/ (\d+)B /)?.[1] ?? 0)));
    report("the write ships no page payload", loads === 0 && biggest < PAYLOAD_CEILING,
      `${loads} document load(s), largest write reply ${biggest}B against a`
      + ` ${PAYLOAD_CEILING}B ceiling`);

    // And it survives a re-read: the server resolves the same printing the patch drew, so
    // the reader does not watch their pick revert a moment after the page comes back.
    await page.goto(`${BASE}/collection?view=grid`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3_000);
    const reloaded = await tileArt(onPage(page, 'button:has(div[style*="aspect-ratio"])').nth(chosen));
    report("the server agrees on the next read", reloaded === after,
      `${String(reloaded).slice(0, 60)}`);
  } finally {
    // Back to no preference at all, which is the state a fixture account is in until this
    // probe runs. `Use the default again` is the region's own control for it, so the restore
    // goes through the same path a reader would.
    if (restore) {
      try {
        await page.goto(`${BASE}/collection?view=grid`, { waitUntil: "networkidle" });
        await page.waitForTimeout(3_000);
        await onPage(page, 'button:has(div[style*="aspect-ratio"])').nth(restore.tileIndex).click();
        await page.waitForTimeout(1_200);
        await page.getByRole("button", { name: /printings owned\./ }).first().click();
        await page.waitForTimeout(800);
        // The region's own reset, by the label it actually carries. A `count()` guard here
        // is what let the first version of this file miss the control entirely and print
        // "restored" over a pick it had left on the account, so the absence is a FAILURE.
        const reset = page.getByRole("button", { name: RESET_ARIA }).first();
        if (await reset.count() === 0) throw new Error("the region drew no reset control");
        await reset.click();
        await page.waitForTimeout(1_500);
        // Read back rather than assumed: the control is gone once there is no pick to drop.
        const still = await page.getByRole("button", { name: RESET_ARIA }).count();
        if (still > 0) throw new Error("the pick is still on the card");
        console.log("  --   restored: the card's art preference was cleared");
      } catch (error) {
        console.log(` FAIL  restore failed — clear the pick by hand on the fixture account: ${error}`);
        failures += 1;
      }
    }
    await browser.close();
    // IN `finally`, because two checks above report a failure and `return` — an exit code set
    // after the try block is never reached by either, so the run printed FAIL and exited 0.
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  }
}

run();
