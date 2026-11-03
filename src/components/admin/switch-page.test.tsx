// One switch's page (admin STATES F1, F4, F5, F6, F13) and the head's detail mode, drawn from what
// the rule builds over sentinel envs, never the process environment. Only the model-call switch's variable is read
// since the env layer went (flags-in-DB plan PR 2), so the env values are that variable alone, as `switchEnvValues`
// hands them, and a row is what turns any other switch on.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Account } from "../../lib/admin/accounts";
import { switchPage, type OverrideDetail, type SwitchEvent } from "../../lib/admin/switch-page-rule";
import { switchCopy } from "../../lib/copy/admin";
import { explainAccounts } from "../../lib/flags/explain";
import { SWITCH_NAMES, switchDefaultsOn, type SwitchName } from "../../lib/flags/registry";
import type { OverrideRow } from "../../lib/flags/resolve";

const path = vi.hoisted(() => ({ current: "/admin/flags/OVERVIEW_V2_ENABLED" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.current, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../app/admin/flags/actions", () => ({ setSwitchOverride: vi.fn(), clearSwitchOverride: vi.fn() }));

const { SwitchPageView } = await import("./switch-page");
const { AdminHead } = await import("./admin-head");

type Env = Partial<Record<SwitchName, string>>;
const AT = new Date("2026-10-11T14:02:00Z");
const ACCOUNTS: Account[] = [
  { id: "u1", name: "Hugh", email: null, named: true },
  { id: "u2", name: "Mara", email: null, named: true },
];
const ov = (o: Partial<OverrideDetail>): OverrideDetail => ({ scope: "app", groupId: null, userId: null, value: "on", note: null, updatedBy: "u1", updatedAt: AT, ...o });

function draw(name: SwitchName, env: Env, overrides: OverrideDetail[] = [], events: SwitchEvent[] = [], opts: { overridesRead?: boolean; clerk?: "ok" | "down"; account?: string | null; others?: OverrideRow[] } = {}) {
  const snapshot = {
    overrides: [...overrides.map((o) => ({ switchName: name, scope: o.scope, groupId: o.groupId, userId: o.userId, value: o.value })), ...(opts.others ?? [])],
    groupOf: new Map<string, string>(),
  };
  const page = switchPage({
    name,
    env: Object.fromEntries(SWITCH_NAMES.map((n) => [n, switchDefaultsOn(n) ? (env[n] ?? null) : null])) as Record<SwitchName, string | null>,
    overrides,
    verdicts: explainAccounts(env as NodeJS.ProcessEnv, snapshot, ACCOUNTS.map((a) => a.id)),
    allFeatures: (opts.others ?? []).filter((o) => o.switchName === "ALL_FEATURES" && o.scope === "user" && o.value === "on").map((o) => o.userId!),
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
    draw("WELCOME_CREDITS_ENABLED", {}, [ov({ scope: "app", value: "on" }), ov({ scope: "user", userId: "u2", value: "off", note: "Not yet" })], [], {
      others: [{ switchName: "PAYMENTS_ENABLED", scope: "app", groupId: null, userId: null, value: "on" }],
    });
    const ladder = screen.getByTestId("switch-ladder");
    expect([...ladder.querySelectorAll("[data-rung]")].map((r) => r.getAttribute("data-rung"))).toEqual(["account", "all", "group", "app", "fallback", "needs"]);
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

  // Small items 9, item 4 (`Flags-Kill` K3, K7).
  it("draws a killed flag: the banner, the first Killed rung, Killed filled, overrides refused, killed with Clear live", () => {
    draw("PUSH_ENABLED", {}, [ov({ scope: "app", value: "killed" }), ov({ scope: "user", userId: "u2", value: "on" })]);
    const banner = screen.getByTestId("switch-banner-kill");
    expect(banner.textContent).toBe(
      "Killed: off for everyone.Killed beats every account and group override and All features. Pick On, Off or Not set to lift it; the overrides below come back as they were.",
    );
    expect(banner.className).toContain("border-[color:var(--danger)]");
    const ladder = screen.getByTestId("switch-ladder");
    expect([...ladder.querySelectorAll("[data-rung]")].map((r) => r.getAttribute("data-rung"))).toEqual(["killed", "account", "all", "group", "fallback"]);
    const killed = ladder.querySelector('[data-rung="killed"]') as HTMLElement;
    expect(killed).toHaveAttribute("data-deciding", "true");
    expect(killed.textContent).toBe("Killedthe app-wide rowdecides for all 2");
    expect(within(killed).getByText("the app-wide row").className).toContain("var(--danger)");
    expect(ladder.querySelector('[data-rung="account"]')?.textContent).toContain("refused");
    // All features sits between Account and Group, labelled and drawn as every other rung (`Flags-Kill` K3).
    expect(ladder.querySelector('[data-rung="all"]')?.textContent).toBe("All featuresNonedecides for none");
    const app = screen.getByTestId("switch-app");
    expect(within(app).getByRole("radio", { name: "Killed" })).toHaveAttribute("aria-checked", "true");
    expect(within(app).getByRole("radio", { name: "On" })).toBeEnabled();
    expect(app.textContent).toContain("Killed is the kill switch: off for everyone, overrides refused.");
    const row = document.querySelector('[data-override="u2"]') as HTMLElement;
    expect(within(row).getByText("refused, killed")).toBeInTheDocument();
    expect(within(row).getByRole("radio", { name: "On" })).toBeDisabled();
    expect(within(row).getByRole("radio", { name: "Off" })).toBeDisabled();
    expect(within(row).getByRole("button", { name: "Clear" })).toBeEnabled();
    // No new override is added under the kill.
    expect(screen.getByRole("button", { name: "Add an account override" })).toBeDisabled();
  });

  it("draws All features on its own rung, between Account and Group, with its count (`Flags-Kill` K5)", () => {
    draw("PUSH_ENABLED", {}, [ov({ scope: "app", value: "on" })], [], { others: [{ switchName: "ALL_FEATURES", scope: "user", groupId: null, userId: "u2", value: "on" }] });
    const ladder = screen.getByTestId("switch-ladder");
    expect([...ladder.querySelectorAll("[data-rung]")].map((r) => r.getAttribute("data-rung"))).toEqual(["account", "all", "group", "app", "fallback"]);
    const all = ladder.querySelector('[data-rung="all"]') as HTMLElement;
    expect(all.textContent).toBe("All features1 accountdecides for 1");
    expect(all).toHaveAttribute("data-deciding", "true");
    expect(within(all).getByText("1 account").className).toContain("text-[color:var(--fg)]");
  });

  // The env kill is the model-call switch's alone (`envStops`), a plumbing switch: its app-wide row is what it refuses.
  it("draws the env stop's own banner and refuses the rows under it (F5)", () => {
    draw("MODEL_CALLS_ENABLED", { MODEL_CALLS_ENABLED: "off" }, [ov({ scope: "app" })]);
    expect(screen.getByTestId("switch-banner-kill").textContent).toContain("MODEL_CALLS_ENABLED=off refuses every override.");
    expect(document.querySelector('[data-rung="app"]')?.textContent).toContain("refused");
    expect(document.body.textContent).toContain("Refused while the env var is off.");
  });

  it("draws no kill banner for a feature switch whose variable is off", () => {
    draw("FLYER_TRIAL_ENABLED", { FLYER_TRIAL_ENABLED: "off" }, [ov({ scope: "user", userId: "u2" })]);
    expect(screen.queryByTestId("switch-banner-kill")).toBeNull();
    expect(document.querySelector('[data-override="u2"]')?.textContent).not.toContain("refused");
  });

  it("links the compound banner to the parent's page (F4)", () => {
    draw("WELCOME_CREDITS_ENABLED", {}, [ov({ scope: "app", value: "on" })]);
    const banner = screen.getByTestId("switch-banner-compound");
    expect(within(banner).getByRole("link", { name: "Open Buying credits ›" })).toHaveAttribute("href", "/admin/flags/PAYMENTS_ENABLED");
  });

  it("gives a plumbing switch App-wide and History only (F6)", () => {
    draw("LIST_CACHE_ENABLED", {});
    expect(screen.queryByRole("heading", { level: 2, name: "Groups" })).toBeNull();
    expect(screen.queryByRole("heading", { level: 2, name: "Accounts" })).toBeNull();
    expect(section("App-wide")).toBeInTheDocument();
    expect(section("History")).toBeInTheDocument();
  });

  it("says when there is no history, with the UTC footnote (F13)", () => {
    draw("OVERVIEW_V2_ENABLED", {});
    expect(screen.getByTestId("switch-history").textContent).toBe("No overrides yet. Times are UTC.");
  });

  it("lists history newest first, as handed in, with notes", () => {
    const ev: SwitchEvent = { at: AT, actorId: "u2", kind: "override_set", scope: "app", groupId: null, userId: null, oldValue: null, newValue: "on", note: "Try it" };
    draw("OVERVIEW_V2_ENABLED", {}, [], [ev, { ...ev, actorId: "u1", kind: "override_cleared", oldValue: "on", newValue: null, note: null }]);
    const items = within(screen.getByTestId("switch-history")).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(["Oct 11 · 14:02Mara set app-wide: not set → onNote: “Try it”", "Oct 11 · 14:02You cleared app-wide (was on)"]);
  });

  it("warns when Clerk or the overrides could not be read", () => {
    draw("OVERVIEW_V2_ENABLED", {}, [], [], { clerk: "down", overridesRead: false });
    expect(screen.getByText("Names didn’t load from Clerk.")).toBeInTheDocument();
    expect(screen.getByText("Overrides didn’t load. Every flag shows its fallback.")).toBeInTheDocument();
  });
});

describe("AdminHead on a switch's page", () => {
  it("titles itself with the switch, its variable and tags, keeps Feature flags selected and links back", () => {
    // Welcome credits: the one compound switch left once the Analysis tab's switch retired.
    path.current = "/admin/flags/WELCOME_CREDITS_ENABLED";
    render(<AdminHead env="staging" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(switchCopy.WELCOME_CREDITS_ENABLED.label);
    expect(screen.getByText("WELCOME_CREDITS_ENABLED")).toBeInTheDocument();
    // A feature switch draws no kind tag; only a model switch is tagged.
    expect(screen.queryByText("model")).toBeNull();
    expect(screen.getByText("needs Buying credits")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "‹ Feature flags" })).toHaveAttribute("href", "/admin/flags");
    expect(screen.getByRole("link", { name: "Feature flags" })).toHaveAttribute("aria-current", "page");
  });

  it("stays the list's head for an unknown name", () => {
    path.current = "/admin/flags/NOPE_ENABLED";
    render(<AdminHead env="staging" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Feature flags");
    expect(screen.queryByRole("link", { name: "‹ Feature flags" })).toBeNull();
  });
});
