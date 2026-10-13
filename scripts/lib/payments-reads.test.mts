import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { paymentReadFindings, paymentReadsIn } from "./payments-reads.mjs";

describe("paymentReadsIn", () => {
  it("finds the stripe package, by every import form", () => {
    for (const src of [
      `import Stripe from "stripe";`,
      `import type Stripe from "stripe";`,
      `const S = require("stripe");`,
      `const S = await import("stripe");`,
      `import { webhooks } from "stripe/lib/webhooks";`,
    ]) expect(paymentReadsIn(src).map((f) => f.why)).toEqual(["imports the stripe package"]);
  });

  it("finds a Stripe table by binding, by namespace, by the relational API and by name", () => {
    expect(paymentReadsIn(`import { decks, stripeCustomers as sc } from "../../db/schema";`)).toEqual([{ line: 1, why: "imports stripeCustomers" }]);
    expect(paymentReadsIn(`import * as s from "../db/schema";\nawait db.select().from(s.paymentRecords);`)).toEqual([{ line: 2, why: "reads schema.paymentRecords" }]);
    expect(paymentReadsIn(`await db.query.stripeEvents.findMany();`)).toEqual([{ line: 1, why: "reads db.query.stripeEvents" }]);
    expect(paymentReadsIn("sql`DELETE FROM STRIPE_CUSTOMERS`").map((f) => f.why)).toEqual(["names STRIPE_CUSTOMERS"]);
  });

  it("does not read a type-only schema import, or a package whose name only starts with stripe", () => {
    expect(paymentReadsIn(`import type { paymentRecords } from "../db/schema";`)).toEqual([]);
    expect(paymentReadsIn(`import { x } from "stripe-like";`)).toEqual([]);
  });
});

describe("the shipped tree", () => {
  it("reaches stripe and its tables only through src/lib/payments", async () => {
    const { files, findings } = await paymentReadFindings(process.cwd());
    expect(files).toBeGreaterThan(100);
    expect(findings).toEqual([]);
  });

  it("would report the webhook route if it imported the SDK itself", async () => {
    const root = mkdtempSync(join(tmpdir(), "payments-reads-"));
    try {
      mkdirSync(join(root, "src/app/api/stripe-webhook"), { recursive: true });
      mkdirSync(join(root, "src/lib/payments"), { recursive: true });
      writeFileSync(join(root, "src/app/api/stripe-webhook/route.ts"), `import Stripe from "stripe";\n`);
      writeFileSync(join(root, "src/lib/payments/stripe.ts"), `import Stripe from "stripe";\n`);
      const { findings } = await paymentReadFindings(root);
      expect(findings).toEqual([{ path: "src/app/api/stripe-webhook/route.ts", line: 1, why: "imports the stripe package" }]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
