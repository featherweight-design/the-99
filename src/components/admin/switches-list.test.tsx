// The Switches list's states (admin STATES L1 to L6), drawn from rows the rule builds over sentinel
// envs, never the process environment.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { switchRows } from "../../lib/admin/switches-rule";
import { switchCopy } from "../../lib/copy/admin";
import { explainAccounts } from "../../lib/switches/explain";
import type { OverrideRow } from "../../lib/switches/resolve";
import { SWITCH_NAMES, type SwitchName } from "../../lib/switches/registry";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/switches" }));

const { SwitchesList } = await import("./switches-list");
const { AdminHead } = await import("./admin-head");

type Env = Partial<Record<SwitchName, string>>;
const row = (over: Partial<OverrideRow>): OverrideRow => ({ switchName: "DECK_NOTES_ENABLED", scope: "app", groupId: null, userId: null, value: "on", ...over });

function draw(env: Env, overrides: OverrideRow[] = [], users = ["u1", "u2"], opts: { overridesRead?: boolean } = {}) {
  const verdicts = explainAccounts(env as NodeJS.ProcessEnv, { overrides, groupOf: new Map() }, users);
  const values = Object.fromEntries(SWITCH_NAMES.map((n) => [n, env[n] ?? null])) as Record<SwitchName, string | null>;
  const rows = switchRows({ env: values, overrides, verdicts });
  return render(<SwitchesList rows={rows} total={users.length} env="staging" overridesRead={opts.overridesRead ?? true} />);
}

const rowOf = (name: SwitchName) => document.querySelector(`[data-switch="${name}"]`) as HTMLElement;
const chip = (name: RegExp) => within(screen.getByRole("group", { name: "Show" })).getByRole("button", { name });

describe("SwitchesList", () => {
  it("draws every switch, features A to Z then Plumbing, with the footnote (L1)", () => {
    draw({});
    expect(document.querySelectorAll("[data-switch]")).toHaveLength(SWITCH_NAMES.length);
    const [features, plumbing] = screen.getAllByRole("heading", { level: 2 });
    expect(features.textContent).toBe("Features27");
    expect(plumbing).toHaveAttribute("data-testid", "switches-plumbing-head");
    expect(plumbing.textContent).toContain("app-wide only");
    const plumbingNames = [...plumbing.parentElement!.querySelectorAll("[data-switch]")].map((e) => e.getAttribute("data-switch"));
    expect(plumbingNames).toEqual(["ABOUT_SHEET_ENABLED", "HOW_IT_WORKS_ENABLED", "LABEL_ROLE_COUNTS_ENABLED", "LIST_CACHE_ENABLED", "RATE_LIMIT_ENABLED"]);
    expect(screen.getByText("Resolved counts the 2 accounts on staging. Signed out gets the app-wide result.")).toBeInTheDocument();
  });

  it("gives every switch a name and a line", () => {
    for (const name of SWITCH_NAMES) {
      expect(switchCopy[name].label.length, name).toBeGreaterThan(0);
      expect(switchCopy[name].description.length, name).toBeGreaterThan(0);
    }
  });

  it("counts each chip and filters by it, keeping the heads' counts (L2)", () => {
    draw({ DECK_NOTES_ENABLED: "true" }, [row({ switchName: "DECK_STATS_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(chip(/^All/).textContent).toBe("All32");
    expect(chip(/^All/)).toHaveAttribute("aria-pressed", "true");
    expect(chip(/^Model features/).textContent).toBe("Model features7");
    expect(chip(/^Overridden/).textContent).toBe("Overridden1");
    fireEvent.click(chip(/^Overridden/));
    expect(chip(/^Overridden/)).toHaveAttribute("aria-pressed", "true");
    expect([...document.querySelectorAll("[data-switch]")].map((e) => e.getAttribute("data-switch"))).toEqual(["DECK_STATS_ENABLED"]);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Features27");
    // The Plumbing head hides when it has no rows (L3).
    expect(screen.queryByTestId("switches-plumbing-head")).toBeNull();
  });

  it("searches the name and the variable, and offers Show all when nothing matches (L2, L3)", () => {
    draw({});
    const search = screen.getByRole("searchbox", { name: "Search by name or variable" });
    fireEvent.change(search, { target: { value: "suggested" } });
    expect([...document.querySelectorAll("[data-switch]")].map((e) => e.getAttribute("data-switch"))).toEqual(["TUNING_ENABLED"]);
    fireEvent.change(search, { target: { value: "list_cache" } });
    expect([...document.querySelectorAll("[data-switch]")].map((e) => e.getAttribute("data-switch"))).toEqual(["LIST_CACHE_ENABLED"]);
    fireEvent.change(search, { target: { value: "zzzz" } });
    expect(screen.getByText("None match.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(search).toHaveValue("");
    expect(document.querySelectorAll("[data-switch]")).toHaveLength(SWITCH_NAMES.length);
  });

  it("draws a kill switch row: env off in danger, Off, killed, its overrides refused (L4)", () => {
    draw({ DECK_BENCHMARKS_ENABLED: "off" }, [row({ switchName: "DECK_BENCHMARKS_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    const r = rowOf("DECK_BENCHMARKS_ENABLED");
    const env = within(r).getAllByText("off").find((e) => e.className.includes("font-mono"))!;
    expect(env.className).toContain("var(--danger)");
    expect(within(r).getAllByText("Off").length).toBeGreaterThan(0);
    expect(within(r).getByText("env var is off", { selector: "span.font-mono" })).toBeInTheDocument();
    expect(within(r).getByText("env off · app-wide not set · 1 account, refused · env var is off")).toBeInTheDocument();
    expect(within(r).getByText("1 account, refused", { selector: "span.hidden > *, span.hidden", exact: false })).toBeInTheDocument();
  });

  it("draws a compound row whose parent is off (L5), with its needs tag", () => {
    draw({ SHOPPING_MARK_BOUGHT_ENABLED: "true", COLLECTION_EDIT_ENABLED: "false" });
    const r = rowOf("SHOPPING_MARK_BOUGHT_ENABLED");
    expect(within(r).getByText("needs Collection edit")).toBeInTheDocument();
    expect(within(r).getByText("Collection edit is off", { selector: "span.font-mono" })).toBeInTheDocument();
  });

  it("draws a mixed row with its count (L6), and the phone's meta line", () => {
    draw({ DECK_NOTES_ENABLED: "true" }, [row({ scope: "user", userId: "u2", value: "off" })]);
    const r = rowOf("DECK_NOTES_ENABLED");
    expect(within(r).getAllByText("Mixed").length).toBe(2);
    expect(within(r).getByText("1 of 2 on", { selector: "span.font-mono" })).toBeInTheDocument();
    expect(within(r).getByText("env true · app-wide not set · 1 account · 1 of 2 on")).toBeInTheDocument();
    expect(r.querySelector('[class*="var(--success)_50%"]')).not.toBeNull();
  });

  it("names an unset env var, and an app-wide override", () => {
    draw({}, [row({ scope: "app", value: "on" })]);
    const r = rowOf("DECK_NOTES_ENABLED");
    // The overrides slot is always drawn (design table: `env · app-wide · overrides · N of 7 on`).
    expect(within(r).getByText("env unset · app-wide on · no overrides · 2 of 2 on")).toBeInTheDocument();
  });

  // At 390 a row with two tags wrapped the pill onto a line of its own at the left (8a contact sheet).
  // The pill must sit outside the wrapping name-and-tags group, as a fixed sibling after it.
  it.each(["FIND_A_DECK_READ_ENABLED", "PROPOSED_CUTS_ENABLED", "TUNING_ENABLED"] as const)(
    "keeps the phone's resolved pill out of %s's wrapping title group",
    (name) => {
      draw({});
      const r = rowOf(name);
      const title = within(r).getByTestId("switch-title");
      const pill = within(r).getByTestId("switch-resolved-phone");
      expect(title.className).toContain("flex-wrap");
      expect(title.className).toContain("flex-1");
      expect(title.contains(pill)).toBe(false);
      expect(title.querySelectorAll("span.uppercase")).toHaveLength(2);
      expect(pill.parentElement).toBe(title.parentElement);
      expect(pill.previousElementSibling).toBe(title);
      expect(pill.className).toContain("flex-none");
      expect(pill.parentElement!.className).not.toContain("flex-wrap");
    },
  );

  it("says so when the overrides could not be read", () => {
    draw({}, [], ["u1"], { overridesRead: false });
    expect(screen.getByText("Overrides didn’t load. Every row shows the env var alone.")).toBeInTheDocument();
  });
});

describe("AdminHead on /admin/switches", () => {
  it("marks the Switches tab, after Costs, and titles the page", () => {
    render(<AdminHead env="staging" />);
    expect(screen.getByRole("heading", { level: 1, name: "Switches" })).toBeInTheDocument();
    const tabs = within(screen.getByRole("navigation", { name: "Admin pages" })).getAllByRole("link");
    expect(tabs.map((t) => [t.textContent, t.getAttribute("aria-current")])).toEqual([
      ["Costs", null],
      ["Switches", "page"],
    ]);
  });
});
