// The declaration ask, walked in a real browser at 1300x900 and 390x844.
//
// WHY A BROWSER. Four of its rulings are facts no component test can reach:
//
//   · THE CHIPS' SIZE. 36px tall and auto width on desktop, 44px and half the row each at 390,
//     with the mark at 22 and 26. jsdom lays nothing out, so a class list reading `h-11` passes
//     over an arbitrary value that never compiled.
//   · THE ANSWER PERSISTS. A press writes `decks.declared_bracket` through the server action, and
//     the only proof the write landed is reading the column back and reloading the page.
//   · THE REPLY IS SMALL. A Server Action that revalidates during its own run re-renders the
//     calling route into its reply — `probe:printing-pick` measured 1.6 MB against 122 bytes —
//     and this one is pressed on the deck page. The revalidation is deferred into `after()`, and
//     what proves it is the SIZE of the action's own response.
//   · THE RINGED `?` IS GONE. Round 3 retired it from the verdict and the climb; its absence is
//     read off the painted page, where a stray glyph from either block would show.
//
// FIXTURES ARE BUILT, never borrowed. Four brews under the signed-in account, each reaching one
// reading through game changers alone: none permits `[1,2]`, four permit `[4,5]`, one permits
// `[3]`. Two carry a declaration OUTSIDE their range, written straight to the column, because
// that is the drift state and no control can produce it on purpose. All four are deleted in a
// `finally`; their cards cascade.
//
// TWO MUTATIONS WERE RUN AGAINST IT AND BOTH FAIL: the desktop chip at 40px rather than its height (38 then, 36 since #887) (one
// check), and the revalidation moved back inside the action, whose reply then measured 112,778
// bytes against 90 (two checks, one per width).
//
// It also seeds `user_prefs.about_version_seen` forward with `greatest(...)`, as
// `probe:verdict-block` does and for its reason: the About gate would otherwise redirect every
// route to `/about`. Needs a server with ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`,
// never production.
//
//   PROBE_BASE=http://localhost:3021 node scripts/probe-declaration-ask.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { padToWhole } from "./lib/whole-deck.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 }, chipH: 36, markPx: 22, nameFont: 13 },
  { label: 390, viewport: { width: 390, height: 844 }, chipH: 44, markPx: 26, nameFont: 13.5 },
];

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
  const userId = await page.evaluate(() => window.Clerk.user.id);
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, userId);
  return userId;
}

/** Four brews, each reaching its reading through game changers alone. Ids are pushed BEFORE the
 *  insert that makes each one exist, so a throw part-way through still cleans up what it made. */
async function buildFixtures(userId, made) {
  // A legend that is not itself a game changer — a GC commander counts against every limit.
  const [commander] = await sql`
    select oracle_id from cards
    where type_line ilike '%legendary creature%' and not game_changer
      and oracle_id not in (select oracle_id from cards where game_changer)
    order by name limit 1`;
  const gcs = await sql`
    select oracle_id from cards where game_changer and type_line not ilike '%legendary creature%'
    order by name limit 4`;
  if (!commander || gcs.length < 4) throw new Error("the catalog holds too few game changers to build [4,5]");
  const specs = [
    { key: "ask", gc: 0, declared: null },
    { key: "high", gc: 4, declared: null },
    { key: "driftRange", gc: 0, declared: 4 },
    { key: "driftSingle", gc: 1, declared: 1 },
  ];
  const decks = {};
  for (const s of specs) {
    const id = crypto.randomUUID();
    made.push(id);
    await sql`
      insert into decks (id, user_id, name, commander_oracle_id, declared_bracket)
      values (${id}, ${userId}, ${`Declaration probe · ${s.key}`}, ${commander.oracle_id}, ${s.declared})`;
    for (const g of gcs.slice(0, s.gc)) {
      await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${id}, ${g.oracle_id}, 1)`;
    }
    // Whole, or the press is refused (ruling 1). Wastes moves no bracket fact.
    await padToWhole(sql, id, s.gc);
    decks[s.key] = id;
  }
  return decks;
}

/** The deck page, the Analysis tab by a PRESS, and the profile asked for. */
async function openAnalysis(p, deckId, label) {
  await p.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const up = await p.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 25_000 }).then(() => true, () => false);
  if (!report(`${label}px · the deck page rendered`, up, up ? "tablist is up" : "no tablist")) return false;
  const tab = onPageRole(p, "tab", /Analysis/);
  if (!report(`${label}px · the Analysis tab is drawn`, (await tab.count()) > 0,
      "absent means ANALYSIS_TAB_ENABLED is off on this server")) return false;
  await tab.first().click();
  await onPageRole(p, "button", /^(Re-)?[Aa]nalyze$/).first().click();
  const ready = await onPage(p, 'section[aria-label="Your bracket"]')
    .first().waitFor({ state: "visible", timeout: 25_000 }).then(() => true, () => false);
  return report(`${label}px · the verdict is drawn`, ready, ready ? "ready" : "no verdict after 25s");
}

const group = (p) => onPage(p, '[role="group"][aria-label="Declare this deck\'s bracket"]');
const blockText = (p) =>
  onPage(p, 'section[aria-label="Your bracket"]').first().evaluate((el) => el.textContent.replace(/\s+/g, " ").trim());
const stored = async (id) => (await sql`select declared_bracket from decks where id = ${id}`)[0]?.declared_bracket ?? null;

async function walk(p, width, decks) {
  const { label, chipH, markPx, nameFont } = width;
  await sql`update decks set declared_bracket = null where id = ${decks.ask}`;

  // ── The ask, measured ────────────────────────────────────────────────────────────────────
  if (await openAnalysis(p, decks.ask, label)) {
    const chips = await group(p).first().evaluate((g) => {
      const row = g.getBoundingClientRect();
      return {
        rowW: Math.round(row.width),
        chips: [...g.querySelectorAll("button")].map((b) => {
          const r = b.getBoundingClientRect();
          // Each chip draws one mark per width and hides the other; the drawn one is the reading.
          const mark = [...b.querySelectorAll('[data-testid="bracket-mark"]')]
            .map((m) => m.getBoundingClientRect()).find((r) => r.width > 0) ?? { width: 0 };
          const name = getComputedStyle(b.querySelector(":scope > span:last-child"));
          return {
            text: b.querySelector(":scope > span:last-child").textContent.trim(), h: Math.round(r.height), w: Math.round(r.width),
            mark: Math.round(mark.width), font: parseFloat(name.fontSize), weight: name.fontWeight,
            radius: getComputedStyle(b).borderTopLeftRadius,
          };
        }),
      };
    }).catch(() => null);
    if (report(`${label}px · the ask draws two chips`, chips?.chips.length === 2,
        chips ? chips.chips.map((c) => c.text).join(" / ") : "no group")) {
      report(`${label}px · each chip is ${chipH}px tall`, chips.chips.every((c) => c.h === chipH),
        chips.chips.map((c) => c.h).join(", "));
      report(`${label}px · each chip's mark is ${markPx}px`, chips.chips.every((c) => c.mark === markPx),
        chips.chips.map((c) => c.mark).join(", "));
      report(`${label}px · the name is ${nameFont}px at 600`,
        chips.chips.every((c) => c.font === nameFont && c.weight === "600"),
        chips.chips.map((c) => `${c.font}/${c.weight}`).join(", "));
      if (label === 390) {
        // HALF THE ROW EACH: `flex:1`, with the 8px gap between them.
        const sum = chips.chips[0].w + chips.chips[1].w + 8;
        report("390px · the chips share the row equally",
          Math.abs(chips.chips[0].w - chips.chips[1].w) <= 1 && Math.abs(sum - chips.rowW) <= 1,
          `${chips.chips[0].w} + ${chips.chips[1].w} + 8 against ${chips.rowW}`);
      } else {
        // AUTO WIDTH: the pair leaves the row's remainder empty rather than splitting it.
        const sum = chips.chips[0].w + chips.chips[1].w + 8;
        report("1300px · the chips size to their content", sum < chips.rowW - 24,
          `${chips.chips[0].w} + ${chips.chips[1].w} + 8 of a ${chips.rowW}px row`);
        // THE ONE HOVER THE PACKAGE DRAWS: `--elevated` and the bracket's full ink.
        const chip = group(p).first().locator("button").first();
        const before = await chip.evaluate((b) => getComputedStyle(b).backgroundColor);
        await chip.hover();
        await p.waitForTimeout(150);
        const after = await chip.evaluate((b) => getComputedStyle(b).backgroundColor);
        report("1300px · a chip lights under the pointer", before !== after, `${before} → ${after}`);
        await p.mouse.move(0, 0);
      }
    }

    const text = await blockText(p);
    report(`${label}px · no ringed ? in the verdict`, !/\?/.test(text), text.slice(0, 90));
    const climb = await onPage(p, '[data-testid="climb-rung"]').evaluateAll((els) =>
      els.map((e) => e.textContent).join(" "));
    report(`${label}px · and none in the climb`, !/\?/.test(climb), `${climb.length} chars of climb`);

    // ── The press: the answer draws, the reply is small, the column holds it ──────────────────
    const replies = [];
    p.on("response", async (res) => {
      if (res.request().method() === "POST" && res.request().headers()["next-action"]) {
        replies.push((await res.body().catch(() => Buffer.alloc(0))).length);
      }
    });
    await group(p).first().getByRole("button", { name: "Core" }).click();
    const answered = await onPage(p, 'section[aria-label="Your bracket"]').first()
      .getByText("Declared Core.", { exact: false }).waitFor({ timeout: 5_000 }).then(() => true, () => false);
    report(`${label}px · the answer replaces the chips`, answered && (await group(p).count()) === 0,
      answered ? "Declared Core." : "no answer drawn");
    // THE FACE IS THE TITLE LINE, read alone: the range it replaced moves into the description
    // below, so the block's whole text still names it.
    const face = await onPage(p, 'section[aria-label="Your bracket"]').first().evaluate((el) => ({
      title: el.querySelector('[data-testid="verdict-name"]')?.textContent,
      marks: el.querySelectorAll('[data-testid="verdict-marks"] [data-testid="bracket-mark"]').length,
      split: el.textContent.includes("Split"),
    }));
    report(`${label}px · and resolves the face to one chip`,
      // One mark, the answer's own name, and no `Split` anywhere in the box: the label is retired,
      // and this keeps a regression that brought it back from passing on the other two.
      face.title === "Core" && face.marks === 1 && !face.split,
      `title "${face.title}", ${face.marks} mark(s) in the pill${face.split ? ", Split drawn" : ""}`);
    await p.waitForTimeout(1500);
    report(`${label}px · the column holds the answer`, (await stored(decks.ask)) === 2, `declared_bracket = ${await stored(decks.ask)}`);
    const biggest = Math.max(0, ...replies);
    report(`${label}px · the action's reply carries no page`, replies.length > 0 && biggest < 20_000,
      `${replies.length} action repl${replies.length === 1 ? "y" : "ies"}, largest ${biggest} bytes`);

    // A RELOAD READS IT BACK: the answer is the deck's, not the visit's.
    if (await openAnalysis(p, decks.ask, label)) {
      const again = await blockText(p);
      report(`${label}px · a fresh visit draws the stored answer`, again.includes("Declared Core."), again.slice(0, 90));
      await onPageRole(p, "button", "change").first().click();
      report(`${label}px · change re-asks the same range`, (await group(p).count()) === 1, "chips are back");
      await group(p).first().getByRole("button", { name: "Exhibition" }).click();
      await p.waitForTimeout(1500);
      report(`${label}px · and a new answer replaces the old`, (await stored(decks.ask)) === 1,
        `declared_bracket = ${await stored(decks.ask)}`);
    }
  }

  // ── The high range ───────────────────────────────────────────────────────────────────────
  if (await openAnalysis(p, decks.high, label)) {
    const names = await group(p).first().locator("button > span:last-child").allTextContents().catch(() => []);
    report(`${label}px · [4,5] asks Optimized or cEDH`, names.join("/") === "Optimized/cEDH", names.join("/"));
  }

  // ── Drift, on a range: the line, the faint mark, then the ask ─────────────────────────────
  if (await openAnalysis(p, decks.driftRange, label)) {
    const drift = await onPage(p, 'section[aria-label="Your bracket"]').first().evaluate((el) => {
      const line = [...el.querySelectorAll("p")].find((x) => x.textContent.includes("was declared"));
      const mark = line?.parentElement?.querySelector('[data-testid="bracket-mark"]');
      return line ? {
        text: line.textContent, mark: mark ? Math.round(mark.getBoundingClientRect().width) : null,
        bracket: mark?.dataset.bracket, opacity: mark ? getComputedStyle(mark).opacity : null,
      } : null;
    });
    report(`${label}px · drift states the old answer`, drift?.text === "Optimized was declared, and this deck has since moved out of it.",
      drift?.text ?? "no line");
    report(`${label}px · beside its own faint 22px mark`,
      drift?.mark === 22 && drift?.bracket === "4" && Number(drift?.opacity) < 1,
      drift ? `${drift.mark}px rank ${drift.bracket} at ${drift.opacity}` : "none");
    report(`${label}px · and then asks`, (await group(p).count()) === 1, "chips below the line");
  }

  // ── Drift, on a single bracket: the line and nothing further ──────────────────────────────
  if (await openAnalysis(p, decks.driftSingle, label)) {
    const text = await blockText(p);
    report(`${label}px · single-bracket drift states it`, text.includes("Exhibition was declared"), text.slice(0, 90));
    report(`${label}px · and asks nothing`, (await group(p).count()) === 0, "no chips");
  }
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const made = [];
  try {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: width.viewport });
      const p = await ctx.newPage();
      const userId = await signIn(p);
      const decks = made.length ? Object.fromEntries(
        ["ask", "high", "driftRange", "driftSingle"].map((k, i) => [k, made[i]]),
      ) : await buildFixtures(userId, made);
      await walk(p, width, decks);
      await ctx.close();
    }
  } finally {
    await browser.close();
    if (made.length) await sql`delete from decks where id = any(${made})`;
    console.log(`       (cleaned up ${made.length} fixture deck${made.length === 1 ? "" : "s"})`);
  }
}

await run();
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
