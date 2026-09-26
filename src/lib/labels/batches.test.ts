import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { cardLabelBatches, cardLabelsStaging } from "../../db/schema";

const MIGRATION = "drizzle/0068_card_label_batches.sql";

/**
 * The batch-intent table's SHAPE, asserted because the crash window it exists to close is
 * invisible in any value a function returns.
 *
 * The bug this replaced: the table was keyed on the provider's `batch_id`, which Anthropic
 * assigns only when `batches.create` RETURNS. So no row could be written before submitting,
 * and a process dying in that window left no trace — the next dispatch saw nothing in
 * flight, re-submitted and paid twice, which is the one failure the table is for.
 *
 * A probe against a real Postgres is what will prove the constraints REFUSE (this
 * repository's convention for anything a database decides); these assert the declarations
 * a probe would then exercise, so a column or constraint cannot quietly disappear first.
 */
describe("the batch intent table can record an intent before submitting", () => {
  it("keys on a key we choose, not on the provider's batch id", () => {
    // If `batch_id` were the key it could not be null, and an intent could not exist.
    expect(cardLabelBatches.intentKey.primary).toBe(true);
    expect(cardLabelBatches.batchId.primary).toBe(false);
  });

  it("allows a null batch id, which is what an unsubmitted intent looks like", () => {
    expect(cardLabelBatches.batchId.notNull).toBe(false);
  });

  it("defaults a new row to `intended`, so a crashed submit leaves the weaker claim", () => {
    expect(cardLabelBatches.status.default).toBe("intended");
    expect(cardLabelBatches.status.notNull).toBe(true);
  });

  // Every field a resumed run needs to reconcile without re-deriving the run's chunking.
  it("carries the run, the model, the request id and the names it asked about", () => {
    for (const col of [
      cardLabelBatches.runId, cardLabelBatches.model, cardLabelBatches.customId, cardLabelBatches.asked,
    ]) {
      expect(col.notNull).toBe(true);
    }
  });
});

describe("the generated migration carries the constraints the comments claim", () => {
  // Read from the MIGRATION rather than from Drizzle internals: the migration is what
  // Postgres will actually run, and it is the artifact that can drift from the schema
  // declaration. A first version of this reached for a private extra-config builder and
  // asserted nothing, because that object is not renderable SQL.
  const sql = readFileSync(MIGRATION, "utf8");

  // `batches.create` takes every chunk for a model at once and returns ONE id for all of
  // them, so a global unique on `batch_id` would reject every chunk row after the first and
  // make the table unusable by its only writer.
  it("does not make the batch id globally unique", () => {
    expect(sql).not.toMatch(/UNIQUE\("batch_id"\)/);
  });

  // `custom_id` carries uniqueness instead, and GLOBALLY — not merely within a batch. The
  // sample sends `sonnet-0`, reused every run, so a recovery listing the provider's batches
  // for `sonnet-0` finds one per run and may adopt an older result or re-submit a chunk
  // already paid for. That is the double charge this table exists to prevent, arriving
  // through the recovery path instead of the submit path.
  it("makes the request id unique across every batch and every run", () => {
    expect(sql).toContain('UNIQUE("custom_id")');
  });

  // Per-chunk granularity: a returned `custom_id` has to map back to the cards that request
  // asked about, and a provider batch can have some requests succeed and others fail.
  it("records the request id and the cards that request asked about", () => {
    expect(sql).toMatch(/"custom_id" text NOT NULL/);
    expect(sql).toMatch(/"asked" jsonb NOT NULL/);
  });

  it("creates the intent table with a nullable batch id", () => {
    expect(sql).toMatch(/"intent_key" text PRIMARY KEY NOT NULL/);
    // No NOT NULL on batch_id — that is what lets an intent exist before submitting.
    expect(sql).toMatch(/"batch_id" text,/);
  });

  it("ties a status past `intended` to having the provider id", () => {
    // The rule: a row may only claim to be submitted, collected, expired or failed if it
    // knows WHICH batch it is talking about. `abandoned` is exempt by design — that is
    // precisely the case where the id was never learned.
    expect(sql).toContain(
      `"card_label_batches"."status" in ('intended', 'abandoned') or "card_label_batches"."batch_id" is not null`,
    );
  });

  it("admits exactly the seven states the resume path uses", () => {
    for (const state of [
      "intended", "submitted", "in_progress", "collected", "expired", "failed", "abandoned",
    ]) {
      expect(sql, `state ${state}`).toContain(`'${state}'`);
    }
  });

  it("scopes staging by run and card together", () => {
    expect(sql).toContain('PRIMARY KEY("run_id","oracle_id")');
  });
});

describe("staging is scoped by run", () => {
  // The composite key is what lets two runs coexist and what makes `delete where run_id`
  // a complete clear. Keyed on oracle id alone, a second run would collide with the first.
  it("keys on the run AND the card, not the card alone", () => {
    expect(cardLabelsStaging.oracleId.primary).toBe(false);
    expect(cardLabelsStaging.runId.primary).toBe(false);
  });

  it("carries the hash and the model each staged row was produced under", () => {
    for (const col of [
      cardLabelsStaging.inputHash, cardLabelsStaging.model, cardLabelsStaging.promptVersion,
    ]) {
      expect(col.notNull).toBe(true);
    }
  });
});
