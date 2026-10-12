import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { PreconRow } from "../../../lib/precons/list";
import { PreconTile } from "./precon-tile";

const commander = (name: string, imageUri: string | null = `https://img/${name}.jpg`) =>
  ({ oracleId: `${name}-id`, name, imageUri, colorIdentity: ["C"] });

const row = (over: Partial<PreconRow> = {}): PreconRow => ({
  fileName: "EldraziUnbound_CMM", name: "Eldrazi Unbound", setCode: "CMM", releaseDate: "2023-08-04", twinName: null,
  commanders: [commander("Ulalek, Fused Atrocity")], identity: [], owned: 74, of: 85, unmapped: 0, built: [], ...over,
});

const tile = (r: PreconRow) => render(<ul><PreconTile row={r} href="/decks/precons/x" /></ul>);

describe("PreconTile", () => {
  it("captions the figure, the name and the set, and speaks the commander in its link", () => {
    tile(row());
    expect(screen.getByText("you own")).toBeInTheDocument();
    expect(screen.getByText("74 of 85")).toBeInTheDocument();
    expect(screen.getByText("CMM · Aug 2023")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Eldrazi Unbound, with Ulalek, Fused Atrocity. You own 74 of 85 of its cards." }))
      .toHaveAttribute("href", "/decks/precons/x");
    expect(screen.queryByTestId("tile-foot")).toBeNull();
  });

  it("leaves the art out of the server HTML unless the tile is in the first screen", () => {
    const html = (eager: boolean) => renderToString(<ul><PreconTile row={row()} href="/x" eager={eager} /></ul>);
    expect(html(false)).not.toContain("https://img/");
    expect(html(true)).toContain("https://img/");
  });

  it("draws the foot only with the row's own lines: decks one per line, linked first, then the twin and unmapped", () => {
    tile(row({
      twinName: "Eldrazi Unbound (Collector's Edition)",
      unmapped: 1,
      built: [
        { deckId: "a", deckName: "HD - Eldrazi", shared: 73, sameCommanders: true, linked: true },
        { deckId: "b", deckName: "HD - Other", shared: 84, sameCommanders: false, linked: false },
      ],
    }));
    const foot = screen.getByTestId("tile-foot");
    expect(within(foot).getByRole("link", { name: "HD - Eldrazi" })).toHaveAttribute("href", "/decks/a");
    expect([...foot.children].map((c) => c.textContent)).toEqual([
      "HD - Eldrazibuilt from this · 73 shared",
      "HD - Other84 shared",
      "also sold as a Collector’s Edition",
      "1 card not in our catalog yet",
    ]);
  });

  it("draws both partners' cards in one box, and a plate for a card with no image (T3e, T3f)", () => {
    tile(row({ commanders: [commander("Rograkh, Son of Rohgahh"), commander("Silas Renn", null)] }));
    expect(screen.getAllByTestId("tile-pair-card")).toHaveLength(2);
    expect(screen.getByTestId("tile-no-art")).toHaveTextContent("Silas Rennno art on file");
    expect(screen.getByRole("link", { name: /with Rograkh, Son of Rohgahh and Silas Renn\./ })).toBeInTheDocument();
  });

  it("names a precon with no commander the catalog can place, and draws the plate", () => {
    tile(row({ commanders: [] }));
    expect(screen.getByRole("link", { name: "Eldrazi Unbound. You own 74 of 85 of its cards." })).toBeInTheDocument();
    expect(screen.getByTestId("tile-no-art")).toHaveTextContent("no art on file");
  });
});
