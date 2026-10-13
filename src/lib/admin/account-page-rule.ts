import { adminCopy, switchCopy } from "../copy/admin";
import { allowanceFrom, freeCount, type LedgerRow } from "../model/allowance-rule";
import type { AccountSwitches } from "../switches/explain";
import { SWITCHES, type SwitchName } from "../switches/registry";
import type { Account } from "./accounts";
import { capMicro, usd } from "./costs-rule";
import { accountName } from "./names";
import { sourceText } from "./switch-page-rule";

/**
 * The Accounts pages as arithmetic (admin STATES A1 to A7, plan 9b). Pure: the loader
 * (`account-page.ts`) reads, this decides what is drawn. Months are UTC calendar months, as on Costs.
 */
const copy = adminCopy.accounts;
const lower = (s: string) => s.toLocaleLowerCase("en-US");

/** A2: a name or email holding the query, or a Clerk id starting with it. An empty query keeps every account. */
export function matchesAccount(a: Account, query: string): boolean {
  const q = lower(query.trim());
  if (!q) return true;
  return [a.name, a.email].some((v) => v !== null && lower(v).includes(q)) || lower(a.id).startsWith(q);
}

/** The avatar's letters: the name's first two words, else the email's or the id's first letter. */
export function initials(a: Account): string {
  if (a.name) {
    const words = a.name.trim().split(/\s+/).filter(Boolean);
    const letters = words.slice(0, 2).map((w) => w[0]).join("");
    if (letters) return letters.toLocaleUpperCase("en-US");
  }
  if (a.email) return a.email[0].toLocaleUpperCase("en-US");
  return (a.id.replace(/^user_/, "")[0] ?? "?").toLocaleUpperCase("en-US");
}

/** A time of day in UTC, 12-hour (`2:20 PM`): the admin's times are UTC (`Times are UTC.`). */
export function utcClock(at: Date): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(at);
}

/** A month's name, read in UTC (`October`). */
export function utcMonthName(at: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(at);
}

/** The free allowance's count for every account, from the window's ledger rows and each account's own limit. */
export function creditsNow(
  ids: readonly string[],
  rows: readonly (LedgerRow & { userId: string })[],
  limits: ReadonlyMap<string, number>,
  now: Date,
): Map<string, { left: number; limit: number }> {
  return new Map(
    ids.map((id) => {
      const a = allowanceFrom(rows.filter((r) => r.userId === id), now, limits.get(id));
      return [id, { left: freeCount(a), limit: a.limit }];
    }),
  );
}

export type AccountRow = {
  id: string;
  /** What the row draws: the Clerk name, else the email, else the id. */
  name: string;
  /** The Clerk name alone, for the search: a drawn fallback must not widen the id's prefix match. */
  clerkName: string | null;
  email: string | null;
  initials: string;
  group: { id: string; name: string } | null;
  credits: string;
  spend: string;
};

/** A1: one row per account, in the universe's order (owner first, then A to Z). */
export function accountRows(input: {
  accounts: readonly Account[];
  groupOf: ReadonlyMap<string, string>;
  groupNames: ReadonlyMap<string, string>;
  credits: ReadonlyMap<string, { left: number; limit: number }>;
  spend: ReadonlyMap<string, number>;
}): AccountRow[] {
  return input.accounts.map((a) => {
    const groupId = input.groupOf.get(a.id);
    const groupName = groupId ? input.groupNames.get(groupId) : undefined;
    const c = input.credits.get(a.id);
    return {
      id: a.id,
      name: accountName(a),
      clerkName: a.name,
      email: a.email,
      initials: initials(a),
      group: groupId && groupName ? { id: groupId, name: groupName } : null,
      credits: c ? copy.creditsLeft(c.left, c.limit) : "",
      spend: usd(input.spend.get(a.id) ?? 0),
    };
  });
}

/** A4's role line, from the account's ACTUAL daily limit and, for the owner, the share the allowance enforces. */
export function roleLine(owner: boolean, limit: number, shareMicro: number): string {
  return owner ? copy.role.owner(limit, capMicro(shareMicro)) : copy.role.other(limit);
}

export type Tile = { key: "credits" | "spent" | "presses" | "hub"; label: string; figure: string; sub: string | null };

/** A4, A6, A7: Credits now, Spent in ‹Month›, Presses and Tuning hub. */
export function accountTiles(input: {
  credits: { used: number; limit: number; reopensAt: Date | null };
  owner: boolean;
  shareMicro: number;
  spentMicro: number;
  presses: number;
  hub: { drawn: boolean; tools: number };
  month: string;
}): Tile[] {
  const left = freeCount(input.credits);
  // A7: the reset time only once nothing is left. `reopensAt` is set exactly then (`allowanceFrom`), and
  // says when the next credit comes back; out of credits is the rule's to decide, never a count here.
  const reset = input.credits.reopensAt ? copy.resetAt(utcClock(input.credits.reopensAt)) : null;
  const share = input.owner && input.shareMicro > 0 ? copy.ownerShare(Math.round((input.spentMicro / input.shareMicro) * 100), capMicro(input.shareMicro)) : null;
  return [
    { key: "credits", label: copy.tiles.credits, figure: copy.creditsLeft(left, input.credits.limit), sub: reset },
    { key: "spent", label: copy.tiles.spent(input.month), figure: usd(input.spentMicro), sub: share },
    { key: "presses", label: copy.tiles.presses, figure: String(input.presses), sub: null },
    { key: "hub", label: copy.tiles.hub, figure: input.hub.drawn ? copy.hub.drawn : copy.hub.notDrawn, sub: copy.hub.tools(input.hub.tools) },
  ];
}

export type SwitchLine = { name: SwitchName; label: string; on: boolean; source: string; kill: boolean };
export type SwitchGroups = { override: SwitchLine[]; rule: SwitchLine[]; envOn: string[]; envOff: string[]; total: number };

const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, "en-US");

/**
 * A4, A5: every switch in three groups. Set by an override when an account, group or app-wide override
 * decides it; off by a rule when the env var's kill or an off parent does; from the environment for the
 * rest, as two lists of names, on and off.
 */
export function switchGroups(switches: AccountSwitches, groupName: (id: string) => string): SwitchGroups {
  const lines = SWITCHES.map(({ name }) => {
    const v = switches[name];
    const line: SwitchLine = { name, label: switchCopy[name].label, on: v.on, source: sourceText(v.source, groupName), kill: v.source.kind === "kill" };
    return { line, kind: v.source.kind };
  }).sort((a, b) => byLabel(a.line, b.line));
  const of = (...kinds: string[]) => lines.filter((l) => kinds.includes(l.kind)).map((l) => l.line);
  const env = of("env");
  return {
    override: of("account", "group", "app"),
    rule: of("kill", "parent"),
    envOn: env.filter((l) => l.on).map((l) => l.label),
    envOff: env.filter((l) => !l.on).map((l) => l.label),
    total: lines.length,
  };
}

export type FeatureSpend = { feature: string; name: string; presses: number; spent: string };

/** Spend by feature's `Total` foot: every press this month and what they cost. */
export function featureTotal(rows: readonly { presses: number; micro: number }[]): { presses: number; spent: string } {
  return { presses: rows.reduce((n, r) => n + r.presses, 0), spent: usd(rows.reduce((n, r) => n + r.micro, 0)) };
}

/** A4's spend by feature, most spent first; A6 when empty. */
export function featureSpend(rows: readonly { feature: string; presses: number; micro: number }[]): FeatureSpend[] {
  const name = (f: string) => adminCopy.costs.featureNames[f] ?? f;
  return [...rows]
    .sort((a, b) => b.micro - a.micro || name(a.feature).localeCompare(name(b.feature), "en-US"))
    .map((r) => ({ feature: r.feature, name: name(r.feature), presses: r.presses, spent: usd(r.micro) }));
}
