// What the weekly cost check reads, and how it reads it. READ-ONLY: every request goes through `getJson`/`getText`
// below, which can only GET (cost-check.test.mts fails on any other verb in this file). The tokens are least-scope
// but neither Vercel nor Neon can make one read-only, so this file is where that promise is kept.

const VERCEL = "https://api.vercel.com";
const NEON = "https://console.neon.tech/api/v2";

async function get(url, token) {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${new URL(url).pathname} answered ${res.status}`);
  return res;
}
export const getJson = async (url, token) => (await get(url, token)).json();
export const getText = async (url, token) => (await get(url, token)).text();

/** Vercel's FOCUS billing charges for [from, to), one object per line. */
export async function fetchCharges({ token, teamId, from, to }) {
  const text = await getText(`${VERCEL}/v1/billing/charges?teamId=${teamId}&from=${from.toISOString()}&to=${to.toISOString()}`, token);
  const rows = text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  if (rows.length === 0) throw new Error("the billing API returned no charge rows");
  return rows;
}

/** Deployments of one project (every target; both projects only ever deploy production) created in [from, to). Pages by `until`, stops on a repeat. */
export async function fetchDeployments({ token, teamId, projectId, from, to }) {
  const seen = new Map();
  let until = to.getTime();
  for (let page = 0; page < 40; page++) {
    const r = await getJson(`${VERCEL}/v6/deployments?teamId=${teamId}&projectId=${projectId}&limit=100&since=${from.getTime()}&until=${until}`, token);
    const fresh = r.deployments.filter((d) => !seen.has(d.uid));
    for (const d of fresh) seen.set(d.uid, d);
    const next = r.pagination?.next;
    if (fresh.length === 0 || !next || next === until) break;
    until = next;
  }
  return [...seen.values()];
}

export async function fetchNeon({ token, projectId }) {
  const [project, branches, endpoints] = await Promise.all([
    getJson(`${NEON}/projects/${projectId}`, token),
    getJson(`${NEON}/projects/${projectId}/branches`, token),
    getJson(`${NEON}/projects/${projectId}/endpoints`, token),
  ]);
  return { project: project.project, branches: branches.branches, endpoints: endpoints.endpoints };
}

const sum = (rows, name, key) => rows.filter((r) => r.ServiceName === name).reduce((a, r) => a + (Number(r[key]) || 0), 0);

/** One week of charge rows to the figures the rules read. The plan seat (no consumed unit) is not usage. */
export function summariseCharges(rows) {
  const usage = rows.filter((r) => r.ConsumedUnit);
  // A usage row whose figures cannot be read must fail the Vercel read, not count as zero and read green.
  for (const r of usage) {
    if (!Number.isFinite(Number(r.EffectiveCost)) || !Number.isFinite(Number(r.ConsumedQuantity)) || r.EffectiveCost === null || r.ConsumedQuantity === null) {
      throw new Error(`a ${r.ServiceName ?? "charge"} row has an unreadable cost or quantity`);
    }
  }
  return {
    costUsd: usage.reduce((a, r) => a + (Number(r.EffectiveCost) || 0), 0),
    buildMinutes: sum(rows, "Build CPU Minutes", "ConsumedQuantity"),
    buildUsd: sum(rows, "Build CPU Minutes", "EffectiveCost"),
    functionGbHours: sum(rows, "Fluid Provisioned Memory", "ConsumedQuantity"),
    activeCpuHours: sum(rows, "Fluid Active CPU", "ConsumedQuantity"),
    invocations: sum(rows, "Function Invocations", "ConsumedQuantity"),
    transferGb: sum(rows, "Fast Data Transfer", "ConsumedQuantity") + sum(rows, "Fast Origin Transfer", "ConsumedQuantity"),
    observabilityEvents: sum(rows, "Observability Events", "ConsumedQuantity"),
  };
}

/** Splits charge rows into the week before `weekStart` and the week from it, by each row's own start. */
export function splitWeeks(rows, weekStart) {
  const cut = weekStart.getTime();
  const thisWeek = rows.filter((r) => Date.parse(r.ChargePeriodStart) >= cut);
  const lastWeek = rows.filter((r) => Date.parse(r.ChargePeriodStart) < cut);
  return { thisWeek: summariseCharges(thisWeek), lastWeek: summariseCharges(lastWeek) };
}

/** The Neon counters (billing period to date) and the settings the rules check, as a snapshot. */
export function summariseNeon({ project, branches, endpoints }, now) {
  for (const k of ["compute_time_seconds", "data_transfer_bytes"]) {
    if (project?.[k] === null || project?.[k] === undefined || !Number.isFinite(Number(project[k]))) throw new Error(`the Neon project has no readable ${k}`);
  }
  const byBranch = new Map(branches.map((b) => [b.id, b]));
  return {
    at: now.toISOString(),
    month: now.toISOString().slice(0, 7),
    computeSeconds: Number(project.compute_time_seconds) || 0,
    transferBytes: Number(project.data_transfer_bytes) || 0,
    branches: branches.map((b) => ({
      id: b.id, name: b.name, computeSeconds: Number(b.compute_time_seconds) || 0,
      transferBytes: Number(b.data_transfer_bytes) || 0, logicalBytes: Number(b.logical_size) || 0,
    })),
    // Every scratch branch's compute ceiling; the rule compares them with its own cap, so the cap lives in one place.
    scratchEndpoints: endpoints
      .filter((e) => byBranch.get(e.branch_id)?.name?.startsWith("scratch-"))
      .map((e) => ({ branch: byBranch.get(e.branch_id).name, maxCu: e.autoscaling_limit_max_cu ?? 0 })),
    branchCount: branches.length,
  };
}

/**
 * This week's Neon use as the change since the previous snapshot, scaled to seven days. Null when there is no
 * usable previous snapshot: none, under a day old, or from another month (the counters reset on the 1st).
 */
export function neonWeek(current, previous) {
  if (!previous || previous.month !== current.month) return null;
  const days = (Date.parse(current.at) - Date.parse(previous.at)) / 86_400_000;
  if (!(days >= 1) || current.computeSeconds < previous.computeSeconds || current.transferBytes < previous.transferBytes) return null;
  const k = 7 / days;
  return {
    days,
    computeCuHours: ((current.computeSeconds - previous.computeSeconds) / 3600) * k,
    transferGb: ((current.transferBytes - previous.transferBytes) / 1e9) * k,
  };
}
