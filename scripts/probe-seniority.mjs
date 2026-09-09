// Seniority allocation: the oldest mature deck holding a card keeps it, and a
// junior mature deck that wants the same copy has to go and buy one. Walks
// /decks and both fixture deck pages and reports the status pill, the
// provenance line, and whether the retired mix glosses still render.
//
// Run by hand: `node scripts/probe-seniority.mjs`. Not part of `pnpm test`: it
// needs a browser, a signed-in session, and two 99-card decks that contest a
// card.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SENIOR = process.env.PROBE_SENIOR_DECK;
const JUNIOR = process.env.PROBE_JUNIOR_DECK;
if (!SENIOR || !JUNIOR) {
  throw new Error("Set PROBE_SENIOR_DECK and PROBE_JUNIOR_DECK to two 99-card deck ids.");
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

const readDeck = (page) =>
  page.evaluate(() => {
    const text = document.body.innerText;
    const line = (needle) =>
      text
        .split("\n")
        .map((s) => s.trim())
        .find((s) => s.includes(needle)) ?? null;
    return {
      pill: ["Draft", "Building", "Over", "Unresolved", "To buy", "Complete"].filter((p) =>
        new RegExp(`(^|\\n)\\s*${p}\\s*(\\n|$)`).test(text),
      ),
      provenance: line("We filled"),
      guideNotGate: text.includes("a guide, not a gate"),
      workedExample: text.includes("average ~10 sources"),
      shortMarkers: (text.match(/short \d+/g) ?? []).length,
      buyMarkers: (text.match(/\bbuy\b/gi) ?? []).length,
    };
  });

await clerkSetup();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await context.newPage();
await signIn(page);

await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
console.log("########## /decks");
console.log(await page.evaluate(() => document.body.innerText));

for (const [label, id] of [
  ["SENIOR", SENIOR],
  ["JUNIOR", JUNIOR],
]) {
  await page.goto(`${BASE}/decks/${id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const seen = await readDeck(page);
  console.log(`\n########## ${label} ${id}`);
  console.log(`  pills seen: ${seen.pill.join(", ") || "none"}`);
  console.log(`  provenance: ${seen.provenance ?? "ABSENT"}`);
  console.log(`  "a guide, not a gate": ${seen.guideNotGate ? "PRESENT" : "gone"}`);
  console.log(`  worked-example callout: ${seen.workedExample ? "PRESENT" : "gone"}`);
  console.log(`  short markers: ${seen.shortMarkers}`);
}

await browser.close();
