// One switch's page (admin STATES F1, F4, F5, F6, F13) and the head's detail mode, drawn from what
// the rule builds over sentinel envs, never the process environment.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Account } from "../../lib/admin/accounts";
import { switchPage, type OverrideDetail, type SwitchEvent } from "../../lib/admin/switch-page-rule";
import { switchCopy } from "../../lib/copy/admin";
import { explainAccounts } from "../../lib/switches/explain";
import { SWITCH_NAMES, type SwitchName } from "../../lib/switches/registry";

const path = vi.hoisted(() => ({ current: "/admin/switches/TUNING_ENABLED" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.current, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../app/admin/switches/actions", () => ({ setSwitchOverride: vi.fn(), clearSwitchOverride: vi.fn() }));

const { SwitchPageView } = await import("./switch-page");
const { AdminHead } = await import("./admin-head");

type Env = Partial<Record<SwitchName, string>>;
const AT = new Date("2026-10-11T14:02:00Z");
const ACCOUNTS: Account[] = [
  { id: "u1", name: "Hugh", email: null, named: true },
  { id: "u2", name: "Mara", email: null, named: true },
];
const ov = (o: Partial<OverrideDetail>): OverrideDetail => ({ scope: "app", groupId: null, userId: null, value: "on", note: null, updatedBy: "u1", updatedAt: AT, ...o });

function draw(name: SwitchName, env: Env, overrides: OverrideDetail[] = [], events: SwitchEvent[] = [], opts: { overridesRead?: boolean; clerk?: "ok" | "down"; account?: string | null } = {}) {
  const snapshot = { overrides: overrides.map((o) => ({ switchName: name, scope: o.scope, groupId: o.groupId, userId: o.userId, value: o.value })), groupOf: new Map<string, string>() };
  const page = switchPage({
    name,
    env: Object.fromEntries(SWITCH_NAMES.map((n) => [n, env[n] ?? null])) as Record<SwitchName, string | null>,
    overrides,
    verdicts: explainAccounts(env as NodeJS.ProcessEnv, snapshot, ACCOUNTS.map((a) => a.id)),
    accounts: ACCOUNTS,
    groups: [],
    events,
    historyLimit: 100,
    viewerId: "u1",
  });
  return render(<SwitchPageView page={page} overridesRead={opts.overridesRead ?? true} clerk={opts.clerk ?? "ok"} account={opts.account ?? null} />);
}

const section = (title: string) => screen.getByRole("heading", { level: 2, name: title });

describe("SwitchPageView", () => {
  it("draws the ladder with its deciding rungs raised, the result and the empty sections (F1 shape)", () => {
    draw("WELCOME_CREDITS_ENABLED", { PAYMENTS_ENABLED: "true", WELCOME_CREDITS_ENABLED: "true" }, [ov({ scope: "user", userId: "u2", value: "off", note: "Not yet" })]);
    const ladder = screen.getByTestId("switch-ladder");
    expect([...ladder.querySelectorAll("[data-rung]")].map((r) => r.getAttribute("data-rung"))).toEqual(["account", "group", "app", "env", "needs"]);
    expect(ladder.querySelector('[data-rung="account"]')).toHaveAttribute("data-deciding", "true");
    expect(ladder.querySelector('[data-rung="group"]')).not.toHaveAttribute("data-deciding");
    expect(screen.getByTestId("switch-result").textContent).toBe("On for 1 of 2: Hugh");
    expect(screen.getByText("No group override.")).toBeInTheDocument();
    const row = document.querySelector('[data-override="u2"]') as HTMLElement;
    expect(within(row).getByText("Mara")).toBeInTheDocument();
    expect(within(row).getByText("Off")).toBeInTheDocument();
    expect(within(row).getByText("Note: “Not yet”")).toBeInTheDocument();
    expect(within(row).getByText("You · Oct 11 · 14:02")).toBeInTheDocument();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("draws the kill banner and refuses the rows under it (F5)", () => {
    draw("FLYER_TRIAL_ENABLED", { FLYER_TRIAL_ENABLED: "off" }, [ov({ scope: "user", userId: "u2" })]);
    expect(screen.getByTestId("switch-banner-kill").textContent).toContain("FLYER_TRIAL_ENABLED=off refuses every override.");
    expect(document.querySelector('[data-rung="account"]')?.textContent).toContain("refused");
    expect(document.querySelector('[data-override="u2"]')?.textContent).toContain("refused, env var is off");
  });

  it("links the compound banner to the parent's page (F4)", () => {
    draw("WELCOME_CREDITS_ENABLED", { WELCOME_CREDITS_ENABLED: "true", PAYMENTS_ENABLED: "false" });
    const banner = screen.getByTestId("switch-banner-compound");
    expect(within(banner).getByRole("link", { name: "Open Buying credits ›" })).toHaveAttribute("href", "/admin/switches/PAYMENTS_ENABLED");
  });

  it("gives a plumbing switch App-wide and History only (F6)", () => {
    draw("LIST_CACHE_ENABLED", { LIST_CACHE_ENABLED: "true" });
    expect(screen.queryByRole("heading", { level: 2, name: "Groups" })).toBeNull();
    expect(screen.queryByRole("heading", { level: 2, name: "Accounts" })).toBeNull();
    expect(section("App-wide")).toBeInTheDocument();
    expect(section("History")).toBeInTheDocument();
  });

  it("says when there is no history, with the UTC footnote (F13)", () => {
    draw("TUNING_ENABLED", {});
    expect(screen.getByTestId("switch-history").textContent).toBe("No overrides yet. UTC. Env var changes ship with a deploy and aren’t listed.");
  });

  it("lists history newest first, as handed in, with notes", () => {
    const ev: SwitchEvent = { at: AT, actorId: "u2", kind: "override_set", scope: "app", groupId: null, userId: null, oldValue: null, newValue: "on", note: "Try it" };
    draw("TUNING_ENABLED", {}, [], [ev, { ...ev, actorId: "u1", kind: "override_cleared", oldValue: "on", newValue: null, note: null }]);
    const items = within(screen.getByTestId("switch-history")).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(["Oct 11 · 14:02Mara set app-wide: not set → onNote: “Try it”", "Oct 11 · 14:02You cleared app-wide (was on)"]);
  });

  it("warns when Clerk or the overrides could not be read", () => {
    draw("TUNING_ENABLED", {}, [], [], { clerk: "down", overridesRead: false });
    expect(screen.getByText("Names didn’t load from Clerk.")).toBeInTheDocument();
    expect(screen.getByText("Overrides didn’t load. Every row shows the env var alone.")).toBeInTheDocument();
  });
});

describe("AdminHead on a switch's page", () => {
  it("titles itself with the switch, its variable and tags, keeps Feature flags selected and links back", () => {
    // Welcome credits: the one compound switch left once the Analysis tab's switch retired.
    path.current = "/admin/switches/WELCOME_CREDITS_ENABLED";
    render(<AdminHead env="staging" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(switchCopy.WELCOME_CREDITS_ENABLED.label);
    expect(screen.getByText("WELCOME_CREDITS_ENABLED")).toBeInTheDocument();
    // A feature switch draws no kind tag; only a model switch is tagged.
    expect(screen.queryByText("model")).toBeNull();
    expect(screen.getByText("needs Buying credits")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "‹ Feature flags" })).toHaveAttribute("href", "/admin/switches");
    expect(screen.getByRole("link", { name: "Feature flags" })).toHaveAttribute("aria-current", "page");
  });

  it("stays the list's head for an unknown name", () => {
    path.current = "/admin/switches/NOPE_ENABLED";
    render(<AdminHead env="staging" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Feature flags");
    expect(screen.queryByRole("link", { name: "‹ Feature flags" })).toBeNull();
  });
});
