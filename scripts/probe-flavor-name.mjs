// Gate for #467: a Secret Lair name typed into the Add panel finds the card, and
// the row says which printed name it was found by. The meta line is a visual
// claim — it truncates, and the flavor name leads it — so it is read out of a
// real browser at both widths rather than asserted only in jsdom.
//
// Needs `flavor_name` populated. The weekly catalog refresh does that; on a local
// branch, two rows are enough:
//
//   update printings set flavor_name = 'Freya, Queen of the Valkyries'
//     where set_code = 'sld' and collector_number = '2215';
//   update printings set flavor_name = 'Battle of Olympus'
//     where set_code = 'sld' and collector_number = '2208';
//
// Run by hand: `PROBE_DECK=<id> node scripts/probe-flavor-name.mjs`. Not part of
// `pnpm test` — it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK;
if (!DECK) throw new Error("Set PROBE_DECK.");

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

// "Freya" and "olymp" reach a flavor name only; "Iroas" is the same card by its
// oracle name, where the row must NOT repeat a name the title already carries.
const TERMS = ["Freya", "olymp", "Iroas"];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_client_trust") {
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

// Per option: its title, the whole sentence the meta line drew, the sentence a
// screen reader gets, and — for the typed run inside the flavor name — the colour
// the highlight resolved to and whether it survived the fold's clipping.
async function options(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[role='option'], [data-testid='quick-add-dock'] [role='row']")].slice(0, 4).map((node) => {
      const visible = [...node.querySelectorAll("*")].filter((n) => {
        const s = getComputedStyle(n);
        return s.display !== "none" && s.visibility !== "hidden";
      });
      const marks = visible
        .filter((n) => n.children.length === 0 && (n.textContent ?? "").trim() !== "")
        .filter((n) => getComputedStyle(n).color !== getComputedStyle(n.parentElement).color)
        .map((n) => ({ text: (n.textContent ?? "").trim(), colour: getComputedStyle(n).color }));
      return {
        aria: node.getAttribute("aria-label"),
        // innerText, not textContent: it drops the width's hidden half, so this is
        // what the reader at this viewport can actually read.
        text: node.innerText.replace(/\s+/g, " ").trim(),
        marks,
        clipped: node.scrollWidth > node.clientWidth,
      };
    }),
  );
}

await clerkSetup();
const browser = await chromium.launch();

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n########## ${label}`);

  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  for (const term of TERMS) {
    const search = page.getByRole("combobox").first();
    if ((await search.count()) === 0) {
      console.log("  no combobox found");
      break;
    }
    await search.click();
    await search.fill(term);
    await page.waitForTimeout(1600);
    // Both cards are red, and every fixture deck the probe account owns is in
    // other colours — so the owned-and-in-colour default finds nothing here and
    // the panel's own escape hatch is the only way to reach the rows under test.
    const wider = page.getByRole("button", { name: /search all cards/i });
    if ((await wider.count()) > 0) {
      await wider.first().click();
      await page.waitForTimeout(1600);
    }
    console.log(`\n--- '${term}'`);
    const rows = await options(page);
    if (rows.length === 0) console.log("  no options");
    for (const row of rows) {
      console.log(`  drawn:  ${JSON.stringify(row.text)}${row.clipped ? "  [clipped]" : ""}`);
      console.log(`  spoken: ${JSON.stringify(row.aria)}`);
      for (const m of row.marks) console.log(`  mark:   ${JSON.stringify(m.text)} ${m.colour}`);
    }
    await page.screenshot({ path: `/tmp/flavor-${width}-${term}.png` });
    await page.keyboard.press("Escape");
  }

  await context.close();
}

await browser.close();
