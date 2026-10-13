// The Models page (admin STATES M1, M2): one row per feature or job with its model, effort, origin,
// where it lives and this month's spend; the job switches with GitHub's values, or `—` and the
// no-token line when they could not be read.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MODEL_ROWS } from "../../lib/admin/models";
import { adminCopy } from "../../lib/copy/admin";
import { ModelsView, type ModelsRow } from "./models-view";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/models", useRouter: () => ({ refresh: vi.fn() }) }));
const { AdminHead } = await import("./admin-head");

const copy = adminCopy.models;
const ROWS: ModelsRow[] = MODEL_ROWS.map((d) => ({ ...d, micro: d.key === "tuning" ? 549_000 : d.key === "labels" ? 120_950_000 : 0, partial: d.key === "labels" }));
const VALUES = {
  CATALOG_REFRESH_ENABLED: "true", COMBO_REFRESH_ENABLED: "true", COMMANDER_INDEX_ENABLED: "true",
  CARD_LABELS_ENABLED: "true", TUNING_CHECK_ENABLED: null, PROSE_MAX_USD: "0",
};

describe("ModelsView", () => {
  it("draws M1: every registry row with its model, effort, origin, location and spend", () => {
    render(<ModelsView rows={ROWS} jobs={{ values: VALUES }} month="October" env="staging" />);
    expect(screen.getByText(copy.features)).toBeTruthy();
    expect(screen.getByText("October so far, staging")).toBeTruthy();
    const table = screen.getByTestId("model-rows");
    expect(table.querySelectorAll("[data-model-row]")).toHaveLength(MODEL_ROWS.length);
    const tuning = within(table.querySelector<HTMLElement>("[data-model-row='tuning']")!);
    expect(tuning.getAllByText(copy.rows.tuning)).toHaveLength(2);
    expect(tuning.getAllByText("$0.549")).toHaveLength(2);
    const t = MODEL_ROWS.find((r) => r.key === "tuning")!;
    expect(tuning.getByText(t.model)).toBeTruthy();
    expect(tuning.getByText(t.at)).toBeTruthy();
    expect(table.querySelector("[data-model-row='tuning'] [data-form='phone']")!.textContent).toContain(
      `${copy.cols.model} ${t.model} · ${copy.cols.effort} ${t.effort} · ${copy.cols.origin} player · ${copy.cols.at} ${t.at}`,
    );
    const labels = within(table.querySelector<HTMLElement>("[data-model-row='labels']")!);
    expect(labels.getByText(copy.batch(MODEL_ROWS.find((r) => r.key === "labels")!.model))).toBeTruthy();
    expect(labels.getAllByText("$120.95 so far")).toHaveLength(2);
    expect(labels.getByText(copy.noEffort)).toBeTruthy();
    expect(screen.getByText(copy.featuresFoot)).toBeTruthy();
  });

  it("draws the job switches with GitHub's values, `not set` for one the repository lacks", () => {
    render(<ModelsView rows={ROWS} jobs={{ values: VALUES }} month="October" env="staging" />);
    const jobs = screen.getByTestId("job-rows");
    expect(jobs.querySelectorAll("[data-job]")).toHaveLength(6);
    expect(within(jobs.querySelector<HTMLElement>("[data-job='PROSE_MAX_USD']")!).getAllByText("0")).toHaveLength(2);
    expect(within(jobs.querySelector<HTMLElement>("[data-job='TUNING_CHECK_ENABLED']")!).getAllByText(copy.unset)).toHaveLength(2);
    expect(screen.queryByText(copy.noToken)).toBeNull();
    expect(screen.getByText(copy.jobsFoot)).toBeTruthy();
  });

  it("draws M2 when the values could not be read: `—` in every Value cell and the no-token line", () => {
    render(<ModelsView rows={ROWS} jobs={{ values: null }} month="October" env="production" />);
    expect(screen.getByText(copy.noToken)).toBeTruthy();
    const jobs = screen.getByTestId("job-rows");
    for (const li of jobs.querySelectorAll<HTMLElement>("[data-job]")) {
      expect(within(li).getAllByText("—")).toHaveLength(2);
      expect(within(li).queryByText("true")).toBeNull();
    }
  });
});

describe("ModelsView for a screen reader", () => {
  // The visible column heads are aria-hidden, so every value carries its column's name before it.

  it("names every value's column, in both forms of both tables", () => {
    render(<ModelsView rows={ROWS} jobs={{ values: VALUES }} month="October" env="staging" />);
    const t = MODEL_ROWS.find((r) => r.key === "tuning")!;
    const tuning = screen.getByTestId("model-rows").querySelector("[data-model-row='tuning']")!;
    const expectedModel = [
      `${copy.cols.feature} ${copy.rows.tuning}`, `${copy.cols.origin} player`, `${copy.cols.model} ${t.model}`,
      `${copy.cols.effort} ${t.effort}`, "October $0.549", `${copy.cols.at} ${t.at}`,
    ];
    for (const form of ["phone", "desktop"]) {
      const text = tuning.querySelector(`[data-form='${form}']`)!.textContent!;
      for (const want of expectedModel) expect(text, `${form}: ${want}`).toContain(want);
    }
    const desktopCells = [...tuning.querySelector("[data-form='desktop']")!.children];
    expect(desktopCells.map((c) => c.firstElementChild?.className)).toEqual(Array(6).fill("sr-only"));

    const prose = screen.getByTestId("job-rows").querySelector("[data-job='PROSE_MAX_USD']")!;
    for (const form of ["phone", "desktop"]) {
      const text = prose.querySelector(`[data-form='${form}']`)!.textContent!;
      for (const want of [`${copy.jobCols.variable} PROSE_MAX_USD`, `${copy.jobCols.value} 0`, `${copy.jobCols.readAt} .github/workflows/commander-index.yml`]) {
        expect(text, `${form}: ${want}`).toContain(want);
      }
    }
    expect([...prose.querySelector("[data-form='desktop']")!.children].map((c) => c.firstElementChild?.className)).toEqual(Array(3).fill("sr-only"));
  });
});

describe("AdminHead on /admin/models", () => {
  it("selects Models, the fifth tab, and draws its title and sub", () => {
    render(<AdminHead env="staging" />);
    const tabs = screen.getAllByRole("link").filter((a) => a.closest("nav"));
    expect(tabs.map((t) => [t.textContent, t.getAttribute("aria-current")]).at(-1)).toEqual(["Models", "page"]);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(copy.title);
    expect(screen.getByText(copy.sub)).toBeTruthy();
  });
});
