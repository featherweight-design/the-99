/**
 * What a reply cost, from the usage meters the API returned. Pure.
 *
 * Rates are dollars per million tokens, as published for the first-party API (checked against the
 * claude-api skill's model table, 2026-09-23). Cache writes cost 1.25x input on the 5-minute TTL
 * and 2x on the 1-hour one; cache reads cost 0.1x input. The Batch API halves every one of those
 * meters, cache included — the discounts stack.
 *
 * A model with no row here is a hard error rather than a zero: a harness that prices an unknown
 * model at nothing would let the budget guard wave a whole run through.
 */
export const RATES: Readonly<Record<string, { input: number; output: number }>> = {
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-opus-5": { input: 5, output: 25 },
};

export const CACHE_WRITE_5M = 1.25;
export const CACHE_WRITE_1H = 2;
export const CACHE_READ = 0.1;
export const BATCH_DISCOUNT = 0.5;

/** The meters as the API reports them. `cache_creation` splits the write by TTL when present. */
export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number } | null;
};

export function rates(model: string): { input: number; output: number } {
  const r = RATES[model];
  if (!r) throw new Error(`pricing: no rate for model ${model}`);
  return r;
}

export function costUsd(model: string, usage: Usage, opts: { batch: boolean }): number {
  const r = rates(model);
  const write = usage.cache_creation_input_tokens ?? 0;
  // Without the TTL split, every write is priced at the 5-minute rate: the only TTL this harness
  // ever asks for. A 1-hour write reported without its split would be under-priced, so the split
  // is used whenever the API sends it.
  const write1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const write5m = usage.cache_creation ? (usage.cache_creation.ephemeral_5m_input_tokens ?? 0) : write;
  const inputUnits =
    usage.input_tokens + write5m * CACHE_WRITE_5M + write1h * CACHE_WRITE_1H + (usage.cache_read_input_tokens ?? 0) * CACHE_READ;
  const usd = (inputUnits * r.input + usage.output_tokens * r.output) / 1_000_000;
  return opts.batch ? usd * BATCH_DISCOUNT : usd;
}

/**
 * The most one request can cost: every input token at full price, the reply at its ceiling, and,
 * because a malformed reply is sent once more, twice over. The budget guard sums this over a batch
 * BEFORE submitting it, so the cap holds even if every reply runs to `max_tokens` and fails.
 */
export function worstCaseUsd(model: string, inputTokens: number, maxTokens: number, opts: { batch: boolean }): number {
  // A cache write is the most expensive way an input token can be billed.
  const r = rates(model);
  const one = (inputTokens * CACHE_WRITE_5M * r.input + maxTokens * r.output) / 1_000_000;
  return 2 * (opts.batch ? one * BATCH_DISCOUNT : one);
}
