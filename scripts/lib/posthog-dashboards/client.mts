// The PostHog REST calls the dashboards script makes: nothing else reaches the network. Kept apart from the script so a
// test can hand it a fake fetch without loading the repository's secrets file.
import type { DashboardDef, InsightDef } from "./definitions.mts";
import type { Existing, ExistingInsight } from "./plan.mts";

const DEFAULT_INGEST_HOST = "https://us.i.posthog.com";

/** The API host: `POSTHOG_API_HOST`, else the ingest host the app is configured with, mapped to its app host (`us.i.posthog.com` is `us.posthog.com`). */
export function apiHostFor(env: { POSTHOG_API_HOST?: string; NEXT_PUBLIC_POSTHOG_HOST?: string }): string {
  const explicit = env.POSTHOG_API_HOST?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const ingest = (env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_INGEST_HOST).replace(/\/+$/, "");
  // Only PostHog's own ingest hosts map to an app host. A proxy or self-hosted address would send the key somewhere else.
  if (!/^https:\/\/[a-z]+\.i\.posthog\.com$/.test(ingest)) throw new Error("NEXT_PUBLIC_POSTHOG_HOST is not a PostHog ingest host: set POSTHOG_API_HOST to the app host");
  return ingest.replace(".i.posthog.com", ".posthog.com");
}

type Page<T> = { results: T[]; next: string | null };

export function makeClient(host: string, projectId: string, key: string, fetchImpl: typeof fetch = fetch) {
  // The key is a bearer token: it travels over https only, whatever the host setting says.
  if (new URL(host).protocol !== "https:") throw new Error("the PostHog API host must be https");
  const base = `${host}/api/projects/${encodeURIComponent(projectId)}`;
  async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
    // A `next` link is followed only on the host the key was made for: a key goes nowhere else.
    if (new URL(url).origin !== new URL(host).origin) throw new Error(`refusing to send the key to ${new URL(url).origin}`);
    const res = await fetchImpl(url, {
      method,
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    // The status and the path only: a response body can echo what was sent.
    if (!res.ok) throw new Error(`PostHog ${method} ${new URL(url).pathname} answered ${res.status}`);
    return (await res.json()) as T;
  }
  async function list<T>(path: string): Promise<T[]> {
    const out: T[] = [];
    let url: string | null = `${base}/${path}/?limit=100`;
    while (url) {
      const page: Page<T> = await call("GET", url);
      out.push(...page.results);
      url = page.next;
    }
    return out;
  }
  return {
    dashboards: () => list<Existing>("dashboards"),
    insights: () => list<ExistingInsight>("insights"),
    createDashboard: (def: DashboardDef) => call<Existing>("POST", `${base}/dashboards/`, { name: def.name, description: def.description }),
    createInsight: (def: InsightDef, dashboard: number) =>
      call<Existing>("POST", `${base}/insights/`, { name: def.name, description: def.description, query: def.query, dashboards: [dashboard] }),
    updateInsight: (id: number, def: InsightDef, dashboards: number[]) =>
      call<Existing>("PATCH", `${base}/insights/${id}/`, { description: def.description, query: def.query, dashboards }),
  };
}
