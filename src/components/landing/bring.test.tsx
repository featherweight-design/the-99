import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { collectionSources } from "../../lib/copy/collection-sources";
import { landingCopy } from "../../lib/copy/landing";
import { Bring } from "./bring";

const section = () => screen.getByTestId("landing-bring");
const press = (app: string) => fireEvent.click(screen.getByRole("button", { name: landingCopy.bring.guideOpen(app) }));

describe("Bring", () => {
  it("leads with the first-timer path, then a row per source", () => {
    render(<Bring />);
    const html = section().textContent ?? "";
    expect(html.indexOf(landingCopy.bring.firstTimer.title)).toBeLessThan(html.indexOf(landingCopy.bring.appsLabel));
    expect(within(section()).getByText(/Scan cards with your phone’s camera/)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);
    for (const name of ["ManaBox", "Moxfield", "Archidekt", "Deckbox", "Another app", "A list"]) expect(within(section()).getByText(name)).toBeInTheDocument();
    expect(section().textContent).not.toMatch(/Start here/);
  });

  it("opens one guide at a time and closes it on a second press", () => {
    render(<Bring />);
    press("ManaBox");
    expect(screen.getByText(collectionSources.apps[0].foot, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: landingCopy.bring.guideOpen("ManaBox") })).toHaveAttribute("aria-expanded", "true");
    press("Archidekt");
    expect(screen.getByRole("button", { name: landingCopy.bring.guideOpen("ManaBox") })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("button").filter((b) => b.getAttribute("aria-expanded") === "true")).toHaveLength(1);
    press("Archidekt");
    expect(screen.getAllByRole("button").filter((b) => b.getAttribute("aria-expanded") === "true")).toHaveLength(0);
  });

  it("states the requirement in each guide and carries the Moxfield note in Moxfield's alone", () => {
    render(<Bring />);
    press("Moxfield");
    expect(section().textContent).toContain(collectionSources.requirement);
    expect(screen.getByText(collectionSources.moxfieldNote)).toBeInTheDocument();
    press("Deckbox");
    expect(screen.queryByText(collectionSources.moxfieldNote)).toBeNull();
  });

  it("says How to export once, and names no brand the parser has no fixture for", () => {
    render(<Bring />);
    expect((section().textContent ?? "").match(/How to export/g)).toHaveLength(1);
    const all = JSON.stringify([collectionSources, landingCopy.bring]);
    expect(all).not.toMatch(/TCGplayer|Dragon Shield|Delver/i);
    expect(collectionSources.another.sub).toBe("Any CSV with a Name and a Quantity column");
    expect(all).not.toContain("—");
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
