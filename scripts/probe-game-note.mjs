// The History row's note line on a real Games tab, at 390x844 and 1300x900.
//
// Its properties come from `docs/superpowers/design-tables/deck-tuning.md`
// §Note line and §Note quote rule, and a browser is the only thing that can
// answer four of them: that the line indents to the mark column on desktop and
// sits flush on the phone, that the quote rule stretches to the height of the
// text rather than to a guess, that a row WITHOUT a note is still exactly the
// shipped row with nothing reserved — 64px on the phone, 52px on the desktop,
// #9's own two heights — and that a note at the 140-character cap wraps instead
// of pushing the row off the viewport.
//
// The note is written by hand — nothing in the app produces one — so this needs
// a game with a note under the account it signs in as. That is not the fixture
// account: see the local-dev note in memory. Point `WALK_DECK` at a deck the
// probe user owns.
//
// Run by hand against a local `pnpm dev`: `node scripts/probe-game-note.mjs`
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.WALK_DECK ?? "47eb032a-4a19-43c9-86be-c45203365ed1";
const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = email.includes("+clerk_test")
        ? await signIn.create({ identifier: email })
        : await signIn.create({ identifier: email, password });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, [EMAIL, PASSWORD ?? ""]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const report = {};
await clerkSetup();
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll('[role="tab"]')].map((t) => t.getAttribute("aria-label")),
  );
  if (tabs.length === 0) {
    const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
    throw new Error(`No tabs on the deck page. Body:\n${body}`);
  }
  await page.click(`[role="tab"][aria-label="${tabs.find((t) => t?.startsWith("Games"))}"]`);
  await page.waitForSelector("li:has(button[aria-label='Delete this game'])", { timeout: 15_000 });

  report[vp.label] = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("li")].filter((li) =>
      li.querySelector("button[aria-label='Delete this game']"),
    );
    // The cap is the whole reason the line needs no truncation, so the fixture
    // has to hold a note AT it — a short sentence wraps in any width and would
    // let this report cap behaviour it never measured. And the no-note row is
    // half the contract: without one, "nothing reserved" goes unchecked.
    const noted = rows.filter((r) => r.querySelector(".italic"));
    // Exactly 140 and no whitespace in it. A 140-character SENTENCE wraps at
    // any width and would let this report the cap case without exercising it —
    // the whole failure being measured is a single unbroken word that a flex
    // item refuses to shrink below.
    const withNote = noted.find((r) => {
      const inner = r.querySelector(".italic").textContent.replace(/^\u201C|\u201D$/g, "");
      return inner.length === 140 && !/\s/.test(inner);
    });
    const without = rows.find((r) => !r.querySelector(".italic"));
    const read = (el, props) =>
      Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]]));
    if (!withNote || !without) {
      return {
        rows: rows.length,
        failed:
          `This deck needs BOTH a game whose note is 140 characters with no spaces ` +
          `(\`update deck_games set note = repeat('x', 140) where id = '…'\`) and a game with none. ` +
          `Found ${noted.length} noted (${withNote ? "one at the cap" : "none at the cap"}) ` +
          `and ${without ? "an unnoted row" : "no unnoted row"}.`,
      };
    }
    const text = withNote.querySelector(".italic");
    const rule = [...text.parentElement.children].find((c) => c !== text);
    return {
      rows: rows.length,
      rowsWithNote: rows.filter((r) => r.querySelector(".italic")).length,
      note: {
        quoted: /^\u201C[\s\S]*\u201D$/.test(text.textContent),
        // Spoken once, and from the marks cell rather than from the visible
        // line — the line the eye reads sits below the row's controls, so the
        // ear would otherwise meet the delete button between the marks and the
        // note. The visible line is `aria-hidden`; this is the only copy.
        spoken: withNote.querySelector(".sr-only")?.textContent ?? null,
        visibleLineHidden: text.closest("[aria-hidden]") !== null,
        lines: Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)),
        ...read(text, ["fontSize", "fontStyle", "lineHeight", "color"]),
        indent: getComputedStyle(text.parentElement).paddingLeft,
        gap: getComputedStyle(text.parentElement).gap,
        marginTop: getComputedStyle(text.parentElement).marginTop,
        rule: {
          width: Math.round(rule.getBoundingClientRect().width * 100) / 100,
          height: Math.round(rule.getBoundingClientRect().height),
          textHeight: Math.round(text.getBoundingClientRect().height),
          background: getComputedStyle(rule).backgroundColor,
          radius: getComputedStyle(rule).borderRadius,
        },
      },
      rowWithoutNote: without
        ? {
            height: Math.round(without.getBoundingClientRect().height),
            minHeight: getComputedStyle(without).minHeight,
          }
        : null,
      rowWithNoteHeight: Math.round(withNote.getBoundingClientRect().height),
      overflowsX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  await context.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));

// A probe that reports a partial fixture as a result is worse than no probe:
// it reads as an audit that passed.
const incomplete = Object.entries(report).filter(([, r]) => r.failed);
if (incomplete.length > 0) {
  for (const [label, r] of incomplete) console.error(`${label}: ${r.failed}`);
  process.exit(1);
}
