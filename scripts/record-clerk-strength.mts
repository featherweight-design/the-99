// record:clerk-strength: asks Clerk's DEV instance what it says to each password in a fixed list, and writes the answers to
// `src/lib/auth/strength-fixture.json`, the recorded side of the estimator's agreement tests (live password strength, G3).
// CI never calls Clerk; this is run by hand when the list or Clerk's settings change.
//
// How: it opens a dev-browser session on the dev Frontend API (the one the publishable key names), reads the instance's
// public `/v1/environment` (sign-up mode, `min_zxcvbn_strength`), then for each password starts a ticket sign-up with the
// row's address (and first name on Q1 rows), that password and a DELIBERATELY INVALID ticket. Each row records exactly the
// inputs Clerk was sent. Clerk does not read either as a user input here: a password equal to the address's local part, or
// to the first name, is accepted (measured 2026-11-15). The instance is
// invite-only, and Clerk checks the password before the ticket (measured 2026-11-15): a weak or breached password comes back
// `form_password_not_strong_enough` or `form_password_pwned`, and a password Clerk accepts comes back `ticket_invalid_code`,
// recorded as `accepted`. With no valid ticket there is no invitation to redeem, so no attempt can create a sign-up or a user.
//
// It refuses anything but a `pk_test_` key, so it can only ever reach the development instance. It prints no key and no
// token. If Clerk ever answers with anything else (the order changed, a rate limit), the run stops asking Clerk and records
// `source: "zxcvbn-rule"` from there: the answer Clerk's own rule (zxcvbn score below `min_zxcvbn_strength`) gives, labelled
// as such, never passed off as Clerk's.
import "./lib/env.mjs";
import { writeFileSync } from "node:fs";
import { requireEnv } from "./lib/env.mjs";
import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import { adjacencyGraphs, dictionary as commonDictionary } from "@zxcvbn-ts/language-common";

const OUT = new URL("../src/lib/auth/strength-fixture.json", import.meta.url);
/** Exactly what Clerk is sent, and so exactly what each row records as the estimator's inputs: Q1 has the first name, K5 does not. */
const EMAIL = "colin@example.com";
const Q1 = ["Colin", EMAIL];
const K5 = [EMAIL];

/** The list: every drawn sample, its swap, and each common pattern the third guide must catch. */
const LIST: ReadonlyArray<{ password: string; inputs: string[] }> = [
  // Drawn samples (Main.dc.html, K5.dc.html) and the swaps that replace two of them.
  ...["colin9", "colinmtg", "password1", "colin1994", "copper fox casts ninety", "tidal-rummage", "Trombone#47x", "Kq#7mzpa", "Summer2024!", "Kettle#4", "Lantern#47x"].map(
    (password) => ({ password, inputs: Q1 }),
  ),
  ...["Rummage#4", "Strawberry!123"].map((password) => ({ password, inputs: Q1 })),
  ...["colinmtg", "colin1994", "Kettle#4", "Lantern#47x", "Rummage#4", "Strawberry!123"].map((password) => ({ password, inputs: K5 })),
  // Common patterns: dictionary words, l33t, dates and years, keyboard runs, sequences, repeats, names.
  ...[
    "sunflower",
    "basketball7",
    "P@ssw0rd",
    "Password123!",
    "iloveyou2",
    "letmein!!",
    "dragon2020",
    "January1994",
    "12/05/1994",
    "qwertyuiop",
    "asdfghjkl;",
    "abcdefgh1",
    "12345678",
    "aaaaaaaa",
    "abcabcabc",
    "Jennifer1",
    "Colin2025!",
    "colin@example",
    "monkey123",
    // Clearly stronger: a passphrase and two random strings.
    "correct horse battery staple",
    "violet anchor drifts slowly",
    "zq8!Lm2#Vx",
    "Rk4$wP9n!tYc",
  ].map((password) => ({ password, inputs: Q1 })),
  // Q4 (breached) candidates: 12+ characters, Good or better with all three guides ticked, no year, no name.
  ...[
    "HelloWorld@123",
    "Helloworld@123",
    "Hello@World123",
    "Chocolate@123",
    "Chocolate!123",
    "Strawberry!123",
    "Pineapple@123",
    "Watermelon#123",
    "Welcome@Home1",
    "Happy@Birthday1",
    "Sweetheart!123",
    "Spongebob!123",
    "Snowflake@123",
    "Christmas!123",
    "Tr0ub4dor&3x",
  ].map((password) => ({ password, inputs: Q1 })),
  // Names and English words with digits or a symbol, no year (orchestrator ruling B, 2026-11-15): does Clerk refuse as too
  // weak anything the common-only estimator reads as Good?
  ...[
    "Gonzalez#19x",
    "Margaret!42",
    "Elephant#77",
    "Johnson#88x",
    "Williams!73",
    "Jennifer#58",
    "Michelle!36",
    "Butterfly#64",
    "Mountain!82",
    "Garcia#47x",
    "Patricia!91",
    "Rodriguez#5x",
    "Kitchen!38",
    "Thompson#62",
    "Victoria!27",
  ].map((password) => ({ password, inputs: Q1 })),
];

const { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk } = requireEnv(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]);
if (!pk.startsWith("pk_test_")) {
  console.error("Refusing: the publishable key is not a pk_test_ key. This only ever runs against Clerk's development instance.");
  process.exit(1);
}
const fapi = `https://${Buffer.from(pk.slice("pk_test_".length), "base64").toString("utf8").replace(/\$$/, "")}`;

type ClerkErrors = { errors?: Array<{ code?: string }> };
const firstCode = (body: unknown): string | null => (body as ClerkErrors)?.errors?.[0]?.code ?? null;

async function devBrowser(): Promise<string> {
  const res = await fetch(`${fapi}/v1/dev_browser`, { method: "POST" });
  const body = (await res.json()) as { id?: string; token?: string };
  const token = body.id ?? body.token;
  if (!res.ok || !token) throw new Error(`dev_browser failed (HTTP ${res.status})`);
  return token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Codes Clerk returns for the password itself. Anything else before a password code means it never looked. */
const PASSWORD_CODES = new Set(["form_password_not_strong_enough", "form_password_pwned", "form_password_length_too_short", "form_password_size_in_bytes_exceeded", "form_password_validation_failed"]);

const token = await devBrowser();
const q = `__clerk_db_jwt=${encodeURIComponent(token)}`;
const env = (await (await fetch(`${fapi}/v1/environment?${q}`)).json()) as {
  user_settings?: { sign_up?: { mode?: string }; password_settings?: { min_zxcvbn_strength?: number; min_length?: number } };
};
const minStrength = env.user_settings?.password_settings?.min_zxcvbn_strength ?? null;
const mode = env.user_settings?.sign_up?.mode ?? null;
console.log(`dev instance: sign_up.mode=${mode} min_zxcvbn_strength=${minStrength} min_length=${env.user_settings?.password_settings?.min_length ?? "?"}`);

const zxcvbn = new ZxcvbnFactory({ graphs: adjacencyGraphs, dictionary: commonDictionary });
const ruleAnswer = (password: string, inputs: string[]) =>
  zxcvbn.check(password, inputs).score < (minStrength ?? 2) ? "form_password_not_strong_enough" : "accepted";

const attempt = (body: URLSearchParams) =>
  fetch(`${fapi}/v1/client/sign_ups?${q}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });

const recordedAt = new Date().toISOString();
const rows: Array<{ password: string; inputs: string[]; clerk: string; source: string; recordedAt: string }> = [];
let blocked: string | null = null;
for (const { password, inputs } of LIST) {
  if (!blocked) {
    const body = new URLSearchParams({
      strategy: "ticket",
      ticket: "not-a-ticket",
      email_address: EMAIL,
      password,
      ...(inputs.includes("Colin") ? { first_name: "Colin" } : {}),
    });
    // Clerk rate-limits sign-up attempts per client: wait out a 429 (its Retry-After, else 15s) up to six times.
    let res = await attempt(body);
    for (let tries = 0; res.status === 429 && tries < 6; tries++) {
      await sleep((Number(res.headers.get("retry-after")) || 15) * 1000);
      res = await attempt(body);
    }
    const json = await res.json().catch(() => null);
    const raw = firstCode(json);
    const code = raw === "ticket_invalid_code" ? "accepted" : raw;
    if (!res.ok && code && (code === "accepted" || PASSWORD_CODES.has(code))) {
      rows.push({ password, inputs, clerk: code, source: "clerk-dev", recordedAt });
      console.log(`${JSON.stringify(password).padEnd(32)} ${code}`);
      await sleep(3000);
      continue;
    }
    blocked = `HTTP ${res.status} ${code ?? "no code"}`;
    console.log(`Clerk refused before checking the password (${blocked}); recording zxcvbn-rule answers from here.`);
  }
  rows.push({ password, inputs, clerk: ruleAnswer(password, inputs), source: "zxcvbn-rule", recordedAt });
}

writeFileSync(OUT, `${JSON.stringify({ minZxcvbnStrength: minStrength, signUpMode: mode, rows }, null, 2)}\n`);
console.log(`wrote ${rows.length} rows (${rows.filter((r) => r.source === "clerk-dev").length} from Clerk)`);
