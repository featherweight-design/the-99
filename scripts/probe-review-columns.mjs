// probe:review-columns — the two columns on /decks/[id]/changes start their cards level.
//
// `Going out` carries a note beside its heading ("all 12 go back in the pool when you commit.
// Put one back and it never left."), and from double digits that note wraps. The column header
// used to be sized by its own note, so the wrapped one grew and pushed its whole column down
// while `Coming in` beside it stayed put: the two columns' cards stopped sharing a line. The
// columns are a subgrid now, so both headers take the taller one's height.
//
// jsdom lays nothing out, so no unit test can see a row the other column's note pushed down.
// This measures, at 1300 and at 820 (the narrowest desktop, where the note wraps most):
//   - the two header rules sit on one line;
//   - the two columns' first group headings, and their first cards, sit on one line;
//   - the note really did wrap, since a run where it fits on one line measures nothing.
// At 390 the columns are one at a time behind a segmented pair and neither heading is drawn,
// so the check there is that pressing `Going out` puts its first card where `Coming in`'s was.
//
// It writes one deck (a copy of the template, committed as v1, then 12 cuts and 2 adds staged
// into its draft) under the account it signs in as, and deletes it in a `finally`. Point it at
// `local-dev` or a scratch Neon branch, never production.
//
//   PROBE_BASE=http://localhost:3013 node scripts/probe-review-columns.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";

neonConfig.webSocketConstructor = ws;

const {
  E2E_AUDIT_USER_EMAIL: EMAIL,
  E2E_AUDIT_USER_PASSWORD: PASSWORD,
  DATABASE_URL,
} = requireEnv(["E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const TEMPLATE = process.env.PROBE_TEMPLATE_DECK ?? "a1111111-1111-1111-1111-111111111111";
const CUTS = 12;
const TOLERANCE = 1;

const pool = new Pool({ connectionString: DATABASE_URL });
let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
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
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (e) {
        return String(e?.errors?.[0]?.longMessage ?? e);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(failure);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/** A copy of the template committed as v1, with CUTS cuts and two adds in its draft. */
async function buildFixture(userId, holder) {
  const template = (
    await pool.query(`select commander_oracle_id, partner_oracle_id from decks where id = $1`, [TEMPLATE])
  ).rows[0];
  if (!template) throw new Error(`No template deck ${TEMPLATE}.`);
  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, partner_oracle_id, filled)
       values ($1, 'Probe · review columns', $2, $3, true) returning id`,
    [userId, template.commander_oracle_id, template.partner_oracle_id],
  );
  holder.deckId = rows[0].id;
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto)
       select $1, oracle_id, quantity, false from deck_cards where deck_id = $2`,
    [holder.deckId, TEMPLATE],
  );
  const version = await pool.query(
    `insert into deck_versions (deck_id, number, commander_oracle_id, partner_oracle_id)
       values ($1, 1, $2, $3) returning id`,
    [holder.deckId, template.commander_oracle_id, template.partner_oracle_id],
  );
  await pool.query(
    `insert into deck_version_cards (version_id, oracle_id, quantity)
       select $1, oracle_id, quantity from deck_cards where deck_id = $2`,
    [version.rows[0].id, holder.deckId],
  );
  // Cuts from the non-basic body, so each is a whole row going out.
  const cut = await pool.query(
    `delete from deck_cards where deck_id = $1 and oracle_id in (
       select dc.oracle_id from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
        where dc.deck_id = $1 and c.type_line not like 'Basic%' order by dc.oracle_id limit $2)
     returning oracle_id`,
    [holder.deckId, CUTS],
  );
  if (cut.rowCount !== CUTS) throw new Error(`Cut ${cut.rowCount} rows, wanted ${CUTS}.`);
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto)
       select $1, c.oracle_id, 1, false from cards c
        where c.type_line like 'Artifact%' and c.oracle_id not in (
          select oracle_id from deck_version_cards where version_id = $2)
        order by c.oracle_id limit 2`,
    [holder.deckId, version.rows[0].id],
  );
}

/** Both columns' rule and first group heading, from the laid-out page. */
const readColumns = (page) =>
  onPage(page, "#review").evaluate((review) =>
    [...review.querySelectorAll(":scope > section")]
      .filter((s) => s.getBoundingClientRect().width > 0)
      .map((section) => {
        const header = section.firstElementChild;
        const note = header.querySelector("span");
        // The first group heading carries the first `id`; the first card is the first diff row.
        const firstGroup = section.querySelector("[id]");
        const firstRow = section.querySelector("[data-diff-row]");
        const lineHeight = parseFloat(getComputedStyle(note).lineHeight) || 13;
        return {
          heading: header.querySelector("h2")?.textContent ?? "",
          ruleBottom: header.getBoundingClientRect().bottom,
          headerDrawn: header.getBoundingClientRect().height > 0,
          noteLines: Math.round(note.getBoundingClientRect().height / lineHeight),
          groupTop: firstGroup?.getBoundingClientRect().top ?? null,
          rowTop: firstRow?.getBoundingClientRect().top ?? null,
        };
      }),
  );

async function desktop(page, changes, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}${changes}`, { waitUntil: "networkidle" });
  const cols = await readColumns(page);
  if (cols.length !== 2) {
    report(false, `${width}: two columns drawn`, `found ${cols.length}`);
    return;
  }
  const [inCol, outCol] = cols;
  report(
    outCol.noteLines > 1 || inCol.noteLines > 1,
    `${width}: a note wraps (otherwise nothing is measured)`,
    `in ${inCol.noteLines} line(s), out ${outCol.noteLines} line(s)`,
  );
  report(
    Math.abs(inCol.ruleBottom - outCol.ruleBottom) <= TOLERANCE,
    `${width}: header rules level`,
    `in ${inCol.ruleBottom.toFixed(1)}, out ${outCol.ruleBottom.toFixed(1)}`,
  );
  report(
    inCol.groupTop !== null && Math.abs(inCol.groupTop - outCol.groupTop) <= TOLERANCE,
    `${width}: first group headings level`,
    `in ${inCol.groupTop?.toFixed(1)}, out ${outCol.groupTop?.toFixed(1)}`,
  );
  report(
    inCol.rowTop !== null && outCol.rowTop !== null && Math.abs(inCol.rowTop - outCol.rowTop) <= TOLERANCE,
    `${width}: first cards level`,
    `in ${inCol.rowTop?.toFixed(1)}, out ${outCol.rowTop?.toFixed(1)}`,
  );
}

async function phone(page, changes) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}${changes}`, { waitUntil: "networkidle" });
  const inTop = (await readColumns(page))[0]?.rowTop ?? null;
  await onPage(page, "button[aria-pressed]").filter({ hasText: /going out/i }).click();
  const shown = await readColumns(page);
  const outTop = shown[0]?.rowTop ?? null;
  report(
    shown.length === 1 && /out/i.test(shown[0].heading) && !shown[0].headerDrawn,
    "390: one column at a time, its heading left to the segmented pair",
    `${shown.length} column(s) drawn`,
  );
  report(
    inTop !== null && outTop !== null && Math.abs(inTop - outTop) <= TOLERANCE,
    "390: Going out's first card lands where Coming in's was",
    `in ${inTop?.toFixed(1)}, out ${outTop?.toFixed(1)}`,
  );
}

await clerkSetup();
const browser = await chromium.launch();
const holder = { deckId: null };
try {
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const userId = await signIn(page);
  // Or an account behind the About version is redirected to /about and `#review` never draws.
  await clearAboutSheet(page, userId);
  await buildFixture(userId, holder);
  const changes = `/decks/${holder.deckId}/changes`;
  console.log(`fixture ${holder.deckId}`);
  for (const width of [1300, 820]) await desktop(page, changes, width);
  await phone(page, changes);
} catch (e) {
  failures += 1;
  console.log(`FAIL  run aborted — ${e?.stack ?? e}`);
} finally {
  if (holder.deckId) await pool.query(`delete from decks where id = $1`, [holder.deckId]);
  await browser.close();
  await pool.end();
}
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
