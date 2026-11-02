// The Switches list's states (admin STATES L1 to L6), drawn from rows the rule builds over sentinel
// envs, never the process environment. Only the model-call switch's variable is read since the env layer went
// (flags-in-DB plan PR 2), as `switchEnvValues` hands it; the list draws no env column (small items 9, item 4).
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { switchRows } from "../../lib/admin/switches-rule";
import { switchCopy } from "../../lib/copy/admin";
import { explainAccounts } from "../../lib/switches/explain";
import type { OverrideRow } from "../../lib/switches/resolve";
import { SWITCH_NAMES, switchDefaultsOn, switchKind, type SwitchName } from "../../lib/switches/registry";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/switches" }));

const { SwitchesList } = await import("./switches-list");
const { AdminHead } = await import("./admin-head");

type Env = Partial<Record<SwitchName, string>>;
const row = (over: Partial<OverrideRow>): OverrideRow => ({ switchName: "FEEDBACK_ENABLED", scope: "app", groupId: null, userId: null, value: "on", ...over });

function draw(env: Env, overrides: OverrideRow[] = [], users = ["u1", "u2"], opts: { overridesRead?: boolean; clerk?: "ok" | "down" } = {}) {
  const verdicts = explainAccounts(env as NodeJS.ProcessEnv, { overrides, groupOf: new Map() }, users);
  const values = Object.fromEntries(SWITCH_NAMES.map((n) => [n, switchDefaultsOn(n) ? (env[n] ?? null) : null])) as Record<SwitchName, string | null>;
  const rows = switchRows({ env: values, overrides, verdicts });
  return render(<SwitchesList rows={rows} total={users.length} env="staging" overridesRead={opts.overridesRead ?? true} clerk={opts.clerk ?? "ok"} />);
}

// The heads' and chips' counts, from the registry itself: a switch added or retired moves them with it.
const FEATURES = SWITCH_NAMES.filter((n) => switchKind(n) !== "plumbing").length;
const MODEL = SWITCH_NAMES.filter((n) => switchKind(n) === "model").length;

const rowOf = (name: SwitchName) => document.querySelector(`[data-switch="${name}"]`) as HTMLElement;
const chip = (name: RegExp) => within(screen.getByRole("radiogroup", { name: "Show" })).getByRole("radio", { name });

describe("SwitchesList", () => {
  it("draws every switch, features A to Z then Plumbing, with the footnote (L1)", () => {
    draw({});
    expect(document.querySelectorAll("[data-switch]")).toHaveLength(SWITCH_NAMES.length);
    const [features, plumbing] = screen.getAllByRole("heading", { level: 2 });
    expect(features.textContent).toBe(`Features${FEATURES}`);
    expect(plumbing).toHaveAttribute("data-testid", "switches-plumbing-head");
    expect(plumbing.textContent).toContain("app-wide only");
    const plumbingNames = [...plumbing.parentElement!.querySelectorAll("[data-switch]")].map((e) => e.getAttribute("data-switch"));
    expect(plumbingNames).toEqual(["SCAN_LAB_ENABLED", "LIST_CACHE_ENABLED", "MODEL_CALLS_ENABLED", "PUBLIC_PAGES_ENABLED", "RATE_LIMIT_ENABLED", "NAV_STALL_LOG_ENABLED"]);
    expect(screen.getByText("Resolved counts the 2 accounts on staging. Signed out gets the app-wide result.")).toBeInTheDocument();
  });

  it("gives every switch a name and a line", () => {
    for (const name of SWITCH_NAMES) {
      expect(switchCopy[name].label.length, name).toBeGreaterThan(0);
      expect(switchCopy[name].description.length, name).toBeGreaterThan(0);
    }
  });

  it("counts each chip and filters by it, keeping the heads' counts (L2)", () => {
    draw({}, [row({ switchName: "FLYER_TRIAL_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(chip(/^All/).textContent).toBe(`All ${SWITCH_NAMES.length}`);
    expect(chip(/^All/)).toHaveAttribute("aria-checked", "true");
    expect(chip(/^Model features/).textContent).toBe(`Model features ${MODEL}`);
    expect(chip(/^Overridden/).textContent).toBe("Overridden 1");
    fireEvent.click(chip(/^Overridden/));
    expect(chip(/^Overridden/)).toHaveAttribute("aria-checked", "true");
    expect([...document.querySelectorAll("[data-switch]")].map((e) => e.getAttribute("data-switch"))).toEqual(["FLYER_TRIAL_ENABLED"]);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(`Features${FEATURES}`);
    // The Plumbing head hides when it has no rows (L3).
    expect(screen.queryByTestId("switches-plumbing-head")).toBeNull();
  });

  // Segmented switch 3b: Show is the shared switch, a radiogroup, so the arrows move the filter with the focus.
  it("moves the Show filter with the arrow keys, never as pressed buttons", () => {
    draw({}, [row({ switchName: "FLYER_TRIAL_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(screen.getByRole("radiogroup", { name: "Show" }).querySelector("[aria-pressed]")).toBeNull();
    chip(/^All/).focus();
    fireEvent.keyDown(chip(/^All/), { key: "ArrowRight" });
    expect(chip(/^Overridden/)).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(chip(/^Overridden/));
    expect([...document.querySelectorAll("[data-switch]")].map((e) => e.getAttribute("data-switch"))).toEqual(["FLYER_TRIAL_ENABLED"]);
  });

  it("searches the name and the variable, and offers Show all when nothing matches (L2, L3)", () => {
    draw({});
    const search = screen.getByRole("searchbox", { name: "Search by name or variable" });
    fireEvent.change(search, { target: { value: "suggested" } });
    expect([...document.querySelectorAll("[data-switch]")].map((e) => e.getAttribute("data-switch"))).toEqual(["SUGGESTED_CHANGES_V2_ENABLED"]);
    fireEvent.change(search, { target: { value: "list_cache" } });
    expect([...document.querySelectorAll("[data-switch]")].map((e) => e.getAttribute("data-switch"))).toEqual(["LIST_CACHE_ENABLED"]);
    fireEvent.change(search, { target: { value: "zzzz" } });
    expect(screen.getByText("None match.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(search).toHaveValue("");
    expect(document.querySelectorAll("[data-switch]")).toHaveLength(SWITCH_NAMES.length);
  });

  // The env kill is the model-call switch's alone (`envStops`).
  it("draws the env stop's row: the KILLED tag, Off, env var is off, its overrides refused (L4)", () => {
    draw({ MODEL_CALLS_ENABLED: "off" }, [row({ switchName: "MODEL_CALLS_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    const r = rowOf("MODEL_CALLS_ENABLED");
    expect(within(r).getByTestId("switch-killed-tag").textContent).toBe("killed");
    expect(within(r).getAllByText("Off").length).toBeGreaterThan(0);
    expect(within(r).getByText("env var is off", { selector: "span.font-mono" })).toBeInTheDocument();
    expect(within(r).getByTestId("switch-meta").textContent).toBe("app-wide not set · 1 account, refused · env var is off");
    expect(within(r).getByText("1 account, refused", { selector: "span.hidden > *, span.hidden", exact: false })).toBeInTheDocument();
  });

  // Small items 9, item 4 (`Flags-Kill` K1, K2).
  it("draws a killed row: Killed in the kill ink, the KILLED tag, Off with killed under it, overrides refused", () => {
    draw({}, [
      row({ switchName: "PUSH_ENABLED", scope: "app", value: "killed" }),
      row({ switchName: "PUSH_ENABLED", scope: "user", userId: "u1", value: "on" }),
    ]);
    const r = rowOf("PUSH_ENABLED");
    const tag = within(r).getByTestId("switch-killed-tag");
    expect(tag.textContent).toBe("killed");
    expect(tag.className).toContain("uppercase");
    expect(tag.className).toContain("border-[color:var(--danger)]");
    // By the name, in the title group.
    expect(within(r).getByTestId("switch-title").contains(tag)).toBe(true);
    const app = within(r).getByText("Killed", { selector: "span.hidden" });
    expect(app.className).toContain("font-mono");
    expect(app.className).toContain("var(--danger)");
    const sub = within(r).getAllByText("killed", { selector: "span.font-mono.whitespace-nowrap" }).find((e) => !e.dataset.testid)!;
    expect(sub.className).toContain("var(--danger)");
    expect(within(r).getAllByText("Off").length).toBe(2);
    expect(within(r).getByText("1 account, refused", { selector: "span.hidden > *, span.hidden", exact: false })).toBeInTheDocument();
    expect(within(r).getByTestId("switch-meta").textContent).toBe("app-wide killed · 1 account, refused · killed");
    // A switch that is not killed carries no tag.
    expect(within(rowOf("FEEDBACK_ENABLED")).queryByTestId("switch-killed-tag")).toBeNull();
  });

  it("draws a compound row whose parent is off (L5), with its needs tag", () => {
    draw({}, [row({ switchName: "WELCOME_CREDITS_ENABLED", value: "on" })]);
    const r = rowOf("WELCOME_CREDITS_ENABLED");
    expect(within(r).getByText("needs Buying credits")).toBeInTheDocument();
    expect(within(r).getByText("Buying credits is off", { selector: "span.font-mono" })).toBeInTheDocument();
  });

  it("draws a mixed row with its count (L6), and the phone's meta line", () => {
    draw({}, [row({ scope: "app", value: "on" }), row({ scope: "user", userId: "u2", value: "off" })]);
    const r = rowOf("FEEDBACK_ENABLED");
    expect(within(r).getAllByText("Mixed").length).toBe(2);
    expect(within(r).getByText("1 of 2 on", { selector: "span.font-mono" })).toBeInTheDocument();
    expect(within(r).getByTestId("switch-meta").textContent).toBe("app-wide on · 1 account · 1 of 2 on");
    expect(r.querySelector('[class*="var(--success)_50%"]')).not.toBeNull();
  });

  it("names an app-wide override, with no env column (small items 9, item 4)", () => {
    draw({}, [row({ scope: "app", value: "on" })]);
    const r = rowOf("FEEDBACK_ENABLED");
    // The overrides slot is always drawn (design table: `app-wide · overrides · N of 7 on`).
    expect(within(r).getByTestId("switch-meta").textContent).toBe("app-wide on · no overrides · 2 of 2 on");
    expect(screen.queryByText("Env var")).toBeNull();
  });

  it("draws the model-call switch set false as the kill it now is, as off is", () => {
    draw({ MODEL_CALLS_ENABLED: "false" });
    expect(within(rowOf("MODEL_CALLS_ENABLED")).getByTestId("switch-killed-tag")).toBeInTheDocument();
  });

  // At 390 a row with two tags wrapped the pill onto a line of its own at the left (8a contact sheet).
  // The pill must sit outside the wrapping name-and-tags group, as a fixed sibling after it. No row carries two tags
  // since the Analysis tab's switch retired (Proposed cuts and Suggested changes were model AND needs), so the shape is
  // pinned on the two model rows and on the one compound row, a tag each.
  it.each(["OVERVIEW_V2_ENABLED", "SUGGESTED_CHANGES_V2_ENABLED", "WELCOME_CREDITS_ENABLED"] as const)(
    "keeps the phone's resolved pill out of %s's wrapping title group",
    (name) => {
      draw({});
      const r = rowOf(name);
      const title = within(r).getByTestId("switch-title");
      const pill = within(r).getByTestId("switch-resolved-phone");
      expect(title.className).toContain("flex-wrap");
      expect(title.className).toContain("flex-1");
      expect(title.contains(pill)).toBe(false);
      expect(title.querySelectorAll("span.uppercase")).toHaveLength(1);
      expect(pill.parentElement).toBe(title.parentElement);
      expect(pill.previousElementSibling).toBe(title);
      expect(pill.className).toContain("flex-none");
      expect(pill.parentElement!.className).not.toContain("flex-wrap");
    },
  );

  it("marks a killed switch's app-wide override refused, in the cell and the meta line (L4)", () => {
    const first = draw({ MODEL_CALLS_ENABLED: "off" }, [row({ switchName: "MODEL_CALLS_ENABLED", scope: "app", value: "on" })]);
    const r = rowOf("MODEL_CALLS_ENABLED");
    const cell = within(r).getByText("On, refused", { selector: "span.hidden" });
    expect(cell.className).toContain("var(--danger)");
    expect(within(r).getByTestId("switch-meta").textContent).toBe("app-wide on, refused · no overrides · env var is off");
    // An app-wide override that is not refused reads plainly.
    first.unmount();
    draw({}, [row({ switchName: "FLYER_TRIAL_ENABLED", scope: "app", value: "on" })]);
    expect(within(rowOf("FLYER_TRIAL_ENABLED")).getByText("On", { selector: "span.hidden" }).className).not.toContain("var(--danger)");
  });

  it("keeps the resolved count in one unbreakable piece, on the phone and on desktop", () => {
    draw({}, [row({ scope: "app", value: "on" }), row({ scope: "user", userId: "u2", value: "off" })]);
    const counts = within(rowOf("FEEDBACK_ENABLED")).getAllByText("1 of 2 on");
    expect(counts).toHaveLength(2);
    for (const c of counts) expect(c.className).toContain("whitespace-nowrap");
  });

  it("says so when the accounts are the stored ids because Clerk could not be read (STATES A3)", () => {
    draw({}, [], ["u1"], { clerk: "down" });
    expect(screen.getByText("Names didn’t load from Clerk.")).toBeInTheDocument();
  });

  it("says nothing about Clerk when Clerk answered", () => {
    draw({});
    expect(screen.queryByText("Names didn’t load from Clerk.")).toBeNull();
  });

  it("says so when the overrides could not be read", () => {
    draw({}, [], ["u1"], { overridesRead: false });
    expect(screen.getByText("Overrides didn’t load. Every row shows the env var alone.")).toBeInTheDocument();
  });
});

describe("AdminHead on /admin/switches", () => {
  it("marks the Feature flags tab, after Costs, and titles the page", () => {
    render(<AdminHead env="staging" />);
    expect(screen.getByRole("heading", { level: 1, name: "Feature flags" })).toBeInTheDocument();
    const tabs = within(screen.getByRole("navigation", { name: "Admin pages" })).getAllByRole("link");
    expect(tabs.map((t) => [t.textContent, t.getAttribute("aria-current")])).toEqual([
      ["Costs", null],
      ["Feature flags", "page"],
      ["Groups", null],
      ["Accounts", null],
      ["Models", null],
      ["Invites", null],
      ["Payments", null],
    ]);
  });
});

describe("SwitchesList row links (admin plan 8b)", () => {
  it("opens each switch's page from its row", () => {
    draw({});
    for (const name of SWITCH_NAMES) {
      expect(rowOf(name).querySelector("a")).toHaveAttribute("href", `/admin/switches/${name}`);
    }
  });
});
