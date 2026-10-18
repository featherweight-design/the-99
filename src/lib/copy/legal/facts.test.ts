// Every number and name the legal pages state, pinned to the code that makes it true (launch epic B1, plan B1.4). A fact
// that drifts fails here instead of going quietly false. Where the text is built FROM the constant, the test also asserts
// the rendered words, so a template edit cannot detach them.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { creditsPageCopy } from "../credits-page";
import { HISTORY_RETENTION_DAYS } from "../../collection/retention";
import { HOLD_MS } from "../../invites/rules";
import { PAID_DAILY_LIMIT } from "../../model/allowance-rule";
import { PACKS } from "../../payments/packs";
import { WELCOME_DAYS, WELCOME_UNITS } from "../../payments/welcome";
import { RETAIN_MS } from "../../rate/rules";
import { privacyDoc } from "./privacy";
import { LEGAL_EMAIL, type LegalBlock, type LegalDoc } from "./shared";
import { termsDoc } from "./terms";

const flat = (doc: LegalDoc) =>
  [...doc.intro, ...doc.sections.flatMap((s) => [...s.blocks])]
    .flatMap((b: LegalBlock) => (b.kind === "p" ? [`${b.lead ?? ""} ${b.text}`] : b.items.map((i) => `${i.lead ?? ""} ${i.text}`)))
    .join("\n");
const privacy = flat(privacyDoc);
const terms = flat(termsDoc);

describe("the numbers", () => {
  it("states the invite hold as the code holds it", () => {
    expect(HOLD_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(privacy).toContain("An invite is valid for up to 7 days");
  });

  it("states the welcome grant and the pack as the ledger grants them", () => {
    expect(terms).toContain(`New accounts get ${WELCOME_UNITS} welcome credits, which expire ${WELCOME_DAYS} days`);
    expect([WELCOME_UNITS, WELCOME_DAYS]).toEqual([15, 30]);
    expect(terms).toContain(`A pack is ${PACKS.pack40.units} credits for $${PACKS.pack40.priceCents / 100}`);
    expect([PACKS.pack40.units, PACKS.pack40.priceCents]).toEqual([40, 500]);
  });

  it("states the daily paid limit as the allowance rule holds it", () => {
    expect(terms).toContain(`share one daily limit on how many you can spend, ${PAID_DAILY_LIMIT} a day unless your account has a different one`);
    expect(PAID_DAILY_LIMIT).toBe(20);
  });
});

describe("the words", () => {
  it("states the undo window as the history retention holds it", () => {
    expect(HISTORY_RETENTION_DAYS).toBe(90);
    expect(privacy).toContain(`kept as history for ${HISTORY_RETENTION_DAYS} days`);
  });

  it("names card images, not mana symbols, as what Scryfall serves to the browser", () => {
    expect(privacy).toContain("card images load straight from Scryfall");
    expect(privacy).not.toMatch(/mana symbols load/);
    expect(readFileSync("src/lib/cards/mana-sprite.ts", "utf8")).toContain("/mana/sprite.svg");
  });

  it("names one support address, the one /credits uses", () => {
    expect(LEGAL_EMAIL).toBe("support@the-99.dev");
    const all = `${privacy}\n${terms}`;
    expect(all).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it("composes the refund paragraph from the Credits page's own parts", () => {
    expect(terms).toContain(`${creditsPageCopy.refunds.before}{email}${creditsPageCopy.refunds.after}`);
  });

  it("states refunds and disputes as K2 does them (reverse.ts, createPackCheckout)", () => {
    expect(terms).toContain("we take back the credits from that payment that you haven’t spent");
    expect(terms).toContain("A dispute also pauses buying on the account until we lift the pause.");
    // The rules the sentences describe: a refund or lost dispute revokes the unspent part, a won dispute gives back what it took,
    // and an opened or lost dispute blocks buying until it is cleared by hand (`purchaseBlocked`, enforced where a Session is made).
    const reverse = readFileSync("src/lib/payments/reverse.ts", "utf8");
    expect(reverse).toContain("purchase block");
    const rule = readFileSync("src/lib/payments/refund-rule.ts", "utf8");
    expect(rule).toMatch(/kind: "restore"/);
    expect(readFileSync("src/lib/payments/checkout.ts", "utf8")).toContain("purchaseBlocked(");
    expect(readFileSync("src/lib/payments/blocked.ts", "utf8")).toContain("Cleared by hand");
  });

  it("says US cards the way Checkout does", () => {
    expect(creditsPageCopy.sub + JSON.stringify(creditsPageCopy)).toContain("US cards");
    expect(terms).toContain("takes US cards only");
  });

  it("states the 18-or-older line and invite-only on both pages (rulings L11 and L2: no code source)", () => {
    expect(privacy).toContain("You need to be 18 or older");
    expect(terms).toContain("You need to be 18 or older");
    expect(terms).toContain("invite-only");
  });

  it("does not describe the anonymous counter, which nothing calls yet", () => {
    expect(RETAIN_MS).toBe(60 * 60 * 1000);
    expect(`${privacy}\n${terms}`).not.toMatch(/anonymous|rate_hits|up to an hour|swept hourly/i);
    expect(readFileSync("src/lib/rate/anon.ts", "utf8")).toContain("observeAnonymousHit");
  });

  it("does not repeat the Fan Content passages inside the Terms (the notice carries them)", () => {
    expect(terms).not.toMatch(/Fan Content|Wizards of the Coast/);
    expect(termsDoc.sections.map((s) => s.title)).not.toContain("Card content");
  });
});

describe("the processors", () => {
  const privacySources = [
    ["Clerk", "src/lib/invites/clerk.ts"],
    ["Stripe", "src/lib/payments/stripe.ts"],
    ["Resend", "src/lib/invites/mail.ts"],
    ["Anthropic", "src/lib/model/client.ts"],
    ["jsDelivr", "src/lib/scan/models.ts"],
    ["Hugging Face", "src/lib/scan/models.ts"],
  ] as const;

  it("names each processor the code calls, and the code still calls it", () => {
    for (const [name, file] of privacySources) {
      expect(privacy, name).toContain(name);
      const src = readFileSync(file, "utf8").toLowerCase();
      const probe = name === "Hugging Face" ? "huggingface" : name === "Anthropic" ? "anthropic" : name.toLowerCase();
      expect(src, `${name} in ${file}`).toContain(probe);
    }
    for (const name of ["Neon", "Vercel", "Scryfall", "Mana Pool", "Commander Spellbook", "EDHREC", "MTGJSON"]) expect(privacy, name).toContain(name);
  });
});

describe("the style", () => {
  it("has no em dash and no British spelling", () => {
    for (const text of [privacy, terms]) {
      expect(text).not.toContain("—");
      expect(text).not.toMatch(/\b(colour|organis(e|ed|ation)|behaviour|licence|cancelled|catalogue)\b/i);
    }
  });
});
