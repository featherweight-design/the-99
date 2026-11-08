import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { collectionSources, type GuideText } from "../../lib/copy/collection-sources";
import { landingCopy } from "../../lib/copy/landing";
import { Bring } from "./bring";

const section = () => screen.getByTestId("landing-bring");
const press = (app: string) => fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${app}`) }));
const openCount = () => screen.getAllByRole("button").filter((b) => b.getAttribute("aria-expanded") === "true").length;
const text = (parts: readonly GuideText[]) => parts.map((p) => (typeof p === "string" ? p : p.b)).join("");

describe("Bring", () => {
  it("leads with the first-timer path, then a row per source", () => {
    render(<Bring />);
    const html = section().textContent ?? "";
    const first = html.indexOf(landingCopy.bring.firstTimer.title);
    const apps = html.indexOf(landingCopy.bring.appsLabel);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(apps).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(apps);
    expect(within(section()).getByText(/Scan cards with your phone’s camera/)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);
    for (const name of ["ManaBox", "Moxfield", "Archidekt", "Deckbox", "Another app", "A list"]) expect(within(section()).getByText(name)).toBeInTheDocument();
    expect(html).not.toMatch(/Start here/);
  });

  it("opens one guide at a time, keeps panels mounted so aria-controls always resolves, and closes on a second press", () => {
    render(<Bring />);
    for (const b of screen.getAllByRole("button")) expect(document.getElementById(b.getAttribute("aria-controls") ?? "")).not.toBeNull();
    expect(openCount()).toBe(0);
    press("ManaBox");
    expect(screen.getByText(collectionSources.apps[0].foot as string, { exact: false })).toBeVisible();
    press("Archidekt");
    expect(screen.getByRole("button", { name: /^ManaBox/ })).toHaveAttribute("aria-expanded", "false");
    expect(openCount()).toBe(1);
    press("Archidekt");
    expect(openCount()).toBe(0);
  });

  it("states the requirement in every guide and shows the Moxfield note in Moxfield's alone", () => {
    render(<Bring />);
    for (const app of collectionSources.apps) {
      press(app.name);
      const panel = document.getElementById(screen.getByRole("button", { name: new RegExp(`^${app.name}`) }).getAttribute("aria-controls") ?? "") as HTMLElement;
      expect(panel).toBeVisible();
      expect(panel.textContent).toContain(collectionSources.requirement);
      expect(panel.querySelectorAll("ol > li")).toHaveLength(3);
      expect(panel.textContent?.includes(collectionSources.moxfieldNote)).toBe(app.id === "moxfield");
    }
  });

  it("says How to export once, and names no brand the parser has no fixture for", () => {
    render(<Bring />);
    expect((section().textContent ?? "").match(/How to export/g)).toHaveLength(1);
    const all = JSON.stringify([collectionSources, landingCopy.bring]);
    expect(all).not.toMatch(/TCGplayer|Dragon Shield|Delver/i);
    expect(collectionSources.another.sub).toBe("Any CSV with a Name and a Quantity column");
    expect(all).not.toContain("—");
  });

  it("promises no action a signed-out visitor cannot take: no upload 'here', and every upload step says once you're in", () => {
    const steps = collectionSources.apps.flatMap((a) => a.steps.map(text));
    expect(steps.join("\n")).not.toMatch(/\bhere\b/i);
    for (const t of steps.filter((t) => /upload/i.test(t))) expect(t).toMatch(/once you’re in/i);
    expect(JSON.stringify(landingCopy.bring.firstTimer.steps)).toMatch(/once you’re in/);
  });

  it("draws no upload control: no file input anywhere in the landing tree", () => {
    const dir = join(process.cwd(), "src/components/landing");
    for (const f of readdirSync(dir).filter((n) => /\.tsx$/.test(n) && !/\.test\./.test(n))) {
      expect(readFileSync(join(dir, f), "utf8"), f).not.toMatch(/type=["']file["']/);
    }
    render(<Bring />);
    expect(document.querySelector("input")).toBeNull();
  });
});
