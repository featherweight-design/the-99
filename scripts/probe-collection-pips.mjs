// R5 §1 for #43: the shingled colour-identity pips on a /collection dense row,
// driven rather than read. Signs in, opens /collection in Rows view at both
// widths, and reports the pip track each row actually drew — pip count, box
// size, step between adjacent pips, occupied width against the grid track, and
// each pip's computed box-shadow and z-index, at rest and on hover.
//
// The point of the run is the four- and five-pip rows: R5 §1 shingles from four
// so a five-colour identity fits a 40px track on phone and a 54px track on
// desktop, and the pip ring reads from --row-bg so it repaints on hover.
//
// Run by hand, and not part of `pnpm test` — it needs a browser and a
// signed-in session:
//   PROBE_BASE=http://localhost:3001 node scripts/probe-collection-pips.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

// CLERK_SECRET_KEY is asserted but not bound: `clerkSetup()` reads it from the
// environment itself.
const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// Optional: a `+clerk_test` fixture address takes the email-code path below and
// has no password to supply.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844, track: 40 },
  { label: "desktop · 1300x900", width: 1300, height: 900, track: 54 },
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
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// One reading per row: the pip track is the row button's second grid child.
function readRows(page) {
  return page.evaluate(() => {
    const out = [];
    for (const button of document.querySelectorAll("button[aria-label]")) {
      const name = button.querySelector("span[title]");
      if (!name) continue;
      const track = button.children[1];
      if (!track) continue;
      const pips = [...track.children];
      if (pips.length === 0) continue;
      const boxes = pips.map((p) => p.getBoundingClientRect());
      const styles = pips.map((p) => getComputedStyle(p));
      const trackBox = track.getBoundingClientRect();
      out.push({
        name: name.getAttribute("title"),
        pipCount: pips.length,
        pipSize: `${Math.round(boxes[0].width)}×${Math.round(boxes[0].height)}`,
        step: boxes.length > 1 ? Math.round(boxes[1].left - boxes[0].left) : null,
        occupied: Math.round(boxes.at(-1).right - boxes[0].left),
        trackWidth: Math.round(trackBox.width),
        overflows: boxes.at(-1).right > trackBox.right + 0.5,
        marginLefts: styles.map((s) => s.marginLeft),
        zIndexes: styles.map((s) => s.zIndex),
        boxShadow: styles[0].boxShadow,
        rowBg: getComputedStyle(button).getPropertyValue("--row-bg").trim(),
      });
    }
    return out;
  });
}

await clerkSetup();

const browser = await chromium.launch();
try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });

    // Rows view is the surface R5 §1 draws. The toggle only responds once the
    // client component has hydrated, so wait for the grid to paint first.
    const rowsToggle = page.getByRole("button", { name: "Rows view" });
    await rowsToggle.waitFor({ timeout: 30_000 });
    await page.waitForTimeout(800);
    await rowsToggle.click();
    await page.waitForSelector("button[aria-label] span[title]", { timeout: 30_000 });
    await page.waitForTimeout(400);

    const all = await readRows(page);
    const byCount = new Map();
    for (const row of all) if (!byCount.has(row.pipCount)) byCount.set(row.pipCount, row);

    console.log(`\n=== ${viewport.label} — track ${viewport.track}px ===`);
    console.log(`rows read: ${all.length}; pip counts present: ${[...byCount.keys()].sort().join(", ")}`);
    for (const count of [...byCount.keys()].sort()) {
      const r = byCount.get(count);
      console.log(
        `\n  ${count} pip(s) — ${r.name}\n` +
          `    size ${r.pipSize}  step ${r.step ?? "—"}  occupied ${r.occupied}px / track ${r.trackWidth}px  overflows: ${r.overflows}\n` +
          `    margin-left ${r.marginLefts.join(", ")}\n` +
          `    z-index     ${r.zIndexes.join(", ")}\n` +
          `    box-shadow  ${r.boxShadow}\n` +
          `    --row-bg    ${r.rowBg}`,
      );
    }

    // Hover: the ring must repaint with the row, so --row-bg has to swap.
    const four = all.find((r) => r.pipCount >= 4);
    if (four) {
      const target = page.locator(`button[aria-label] span[title="${four.name}"]`).first();
      await target.hover();
      await page.waitForTimeout(300);
      const hovered = (await readRows(page)).find((r) => r.name === four.name);
      console.log(
        `\n  hover on ${four.name} (${four.pipCount} pips)\n` +
          `    --row-bg  rest ${four.rowBg}  →  hover ${hovered?.rowBg}\n` +
          `    swapped: ${hovered?.rowBg !== four.rowBg}`,
      );
    } else {
      console.log("\n  no four- or five-colour row on this page — widen the probe's search");
    }

    // Four pips is where R5 §1 starts shingling, and the first page of the
    // collection happens not to carry one, so go and find one by name.
    const search = page.getByLabel("Search your cards");
    let found = [];
    for (const term of ["Atraxa", "Yidris", "Breya", "Saskia", "Kynaios", "Omnath", "Aragorn"]) {
      await search.fill(term);
      await page.waitForTimeout(1200);
      found = (await readRows(page)).filter((r) => r.pipCount === 4);
      if (found.length > 0) break;
    }
    if (found.length > 0) {
      const r = found[0];
      console.log(
        `\n  4 pip(s) — ${r.name}\n` +
          `    size ${r.pipSize}  step ${r.step}  occupied ${r.occupied}px / track ${r.trackWidth}px  overflows: ${r.overflows}\n` +
          `    margin-left ${r.marginLefts.join(", ")}\n` +
          `    z-index     ${r.zIndexes.join(", ")}`,
      );
    } else {
      console.log("\n  no four-colour row matched the search");
    }

    await context.close();
  }
} finally {
  await browser.close();
}
