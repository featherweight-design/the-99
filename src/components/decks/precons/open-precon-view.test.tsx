import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { OpenPrecon, OpenPreconCard } from "../../../lib/precons/open-read";

const providerProps = vi.hoisted(() => ({ picks: null as unknown, views: null as unknown }));
vi.mock("../../cards/card-detail-provider", () => ({
  CardDetailProvider: ({ children, deckPrintingPicks, viewPrintings }: { children: React.ReactNode; deckPrintingPicks?: unknown; viewPrintings?: unknown }) => {
    providerProps.picks = deckPrintingPicks;
    providerProps.views = viewPrintings;
    return children;
  },
  useCardDetail: () => ({ open: vi.fn() }),
}));
const startProps = vi.hoisted(() => ({ illegal: [] as string[] }));
vi.mock("./start-precon", () => ({ StartPrecon: (p: { illegal: string[] }) => { startProps.illegal = p.illegal; return null; } }));
vi.mock("../decklist-group", () => ({
  DecklistGroup: (p: { label: string; note?: string; readOnly?: boolean; cards: { name: string; layout?: string | null }[]; footer?: React.ReactNode; footerCount?: number }) => (
    <section data-testid="group" data-readonly={String(p.readOnly)} data-footer-count={p.footerCount ?? 0}>
      <h2>{p.label}</h2><span>{p.note}</span>{p.cards.map((c) => <span key={c.name} data-layout={c.layout ?? ""}>{c.name}</span>)}{p.footer}
    </section>
  ),
}));
import { OpenPreconView } from "./open-precon-view";

const card = (name: string, over: Partial<OpenPreconCard> = {}): OpenPreconCard => ({
  oracleId: name, name, typeLine: "Creature — Eldrazi", manaCost: null, layout: "normal", imageUri: null, quantity: 1,
  isCommander: false, basic: false, owned: true, legal: true, printing: { scryfallId: `p-${name}`, setCode: "cmm", collectorNumber: "1", label: "CMM 1", imageUri: null, backImageUri: null }, ...over,
});

function precon(over: Partial<Extract<OpenPrecon, { kind: "precon" }>["row"]> = {}, cards = [
  card("Zhulodok", { isCommander: true, typeLine: "Legendary Creature — Eldrazi" }),
  card("Sol Ring", { typeLine: "Artifact", owned: false }),
  card("Ruins", { typeLine: "Land" }),
  card("Wastes", { typeLine: "Basic Land", basic: true, quantity: 15 }),
]): Extract<OpenPrecon, { kind: "precon" }> {
  return {
    kind: "precon", setName: "Commander Masters", hasCollection: true, cards,
    row: {
      fileName: "EldraziUnbound_CMM", name: "Eldrazi Unbound", setCode: "CMM", releaseDate: "2023-08-04",
      twinName: null, commanders: [], identity: [], owned: 1, of: 2, unmapped: 0, built: [], ...over,
    },
  };
}

describe("OpenPreconView", () => {
  it("says how many it owns, basics aside, and draws every group read-only", () => {
    render(<OpenPreconView precon={precon()} fromNew={false} />);
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByText("15 basic lands not counted")).toBeInTheDocument();
    expect(screen.getAllByTestId("group").every((g) => g.dataset.readonly === "true")).toBe(true);
    expect(screen.getByText("Wastes ×15")).toBeInTheDocument();
    expect(screen.getByText("you own 0 of 1")).toBeInTheDocument();
  });

  it("counts a card listed under two printings once in its group's note", () => {
    render(<OpenPreconView precon={precon({}, [
      card("Zhulodok", { isCommander: true, typeLine: "Legendary Creature — Eldrazi" }),
      card("Sol Ring", { typeLine: "Artifact", owned: true }),
      { ...card("Sol Ring", { typeLine: "Artifact", owned: true }), printing: null },
      card("Mind Stone", { typeLine: "Artifact", owned: false }),
    ])} fromNew={false} />);
    expect(screen.getByText("you own 1 of 2")).toBeInTheDocument();
  });

  it("draws a card the feed lists under two printings once, with its copies summed", () => {
    render(<OpenPreconView precon={precon({}, [
      card("Zhulodok", { isCommander: true, typeLine: "Legendary Creature — Eldrazi" }),
      card("Ruins", { typeLine: "Land" }),
      card("Plains", { typeLine: "Basic Land — Plains", basic: true, quantity: 5 }),
      { ...card("Plains", { typeLine: "Basic Land — Plains", basic: true, quantity: 4 }), printing: null },
    ])} fromNew={false} />);
    expect(screen.getByText("Plains ×9")).toBeInTheDocument();
    expect(screen.queryByText("Plains ×5")).toBeNull();
  });

  it("hands each row its layout, so a two-faced card keeps its mark", () => {
    render(<OpenPreconView precon={precon({}, [
      card("Zhulodok", { isCommander: true, typeLine: "Legendary Creature — Eldrazi" }),
      card("Delver of Secrets", { layout: "transform" }),
    ])} fromNew={false} />);
    expect(screen.getByText("Delver of Secrets").dataset.layout).toBe("transform");
  });

  it("names a banned card once to the start dialog, however many printings list it", () => {
    render(<OpenPreconView precon={precon({}, [
      card("Zhulodok", { isCommander: true, typeLine: "Legendary Creature — Eldrazi" }),
      card("Dockside Extortionist", { legal: false }),
      { ...card("Dockside Extortionist", { legal: false }), printing: null },
    ])} fromNew={false} />);
    expect(startProps.illegal).toEqual(["Dockside Extortionist"]);
  });

  it("lists the basics under Lands and counts them in its figure (O2)", () => {
    render(<OpenPreconView precon={precon()} fromNew={false} />);
    const lands = screen.getAllByTestId("group").find((g) => g.querySelector("h2")?.textContent === "Lands")!;
    expect(lands.dataset.footerCount).toBe("15");
    expect(lands.textContent).toContain("Wastes ×15");
  });

  it("opens card details on the precon's own printing (O6)", () => {
    render(<OpenPreconView precon={precon()} fromNew={false} />);
    expect(providerProps.picks).toMatchObject({ "Sol Ring": { setCode: "cmm", collectorNumber: "1" } });
  });

  it("views a two-faced card's precon printing on both faces", () => {
    render(<OpenPreconView precon={precon({}, [
      card("Zhulodok", { isCommander: true, typeLine: "Legendary Creature — Eldrazi" }),
      { ...card("Delver of Secrets", { layout: "transform" }), printing: { scryfallId: "s", setCode: "isd", collectorNumber: "51", label: "ISD 51", imageUri: "front.jpg", backImageUri: "back.jpg" } },
    ])} fromNew={false} />);
    expect(providerProps.views).toMatchObject({ "Delver of Secrets": { imageUri: "front.jpg", backImageUri: "back.jpg" } });
  });

  it("draws the empty-collection band above the own box only without a collection (O5)", () => {
    const { rerender } = render(<OpenPreconView precon={precon()} fromNew={false} />);
    expect(screen.queryByText("Upload your collection")).toBeNull();
    rerender(<OpenPreconView precon={{ ...precon(), hasCollection: false }} fromNew={false} />);
    expect(screen.getByRole("link", { name: "Upload your collection" }).getAttribute("href")).toBe("/collection/replace");
  });

  it("names New deck on the back link when the list was opened from it", () => {
    render(<OpenPreconView precon={precon()} fromNew />);
    expect(screen.getByRole("link", { name: "‹ New deck" }).getAttribute("href")).toBe("/decks/precons?from=new");
  });

  it("names every deck that shares the list, not the first two", () => {
    render(<OpenPreconView precon={precon({ built: ["A", "B", "C"].map((d, i) => ({ deckId: d, deckName: d, shared: 70 - i, sameCommanders: false })) })} fromNew={false} />);
    expect(screen.getByText("Your deck C shares 68 of its cards.")).toBeInTheDocument();
  });

  it("words a shared deck by whether it kept the commander", () => {
    render(<OpenPreconView precon={precon({ built: [
      { deckId: "a", deckName: "HD - Eldrazi", shared: 73, sameCommanders: true },
      { deckId: "b", deckName: "Kilo", shared: 64, sameCommanders: false },
    ] })} fromNew={false} />);
    expect(screen.getByText("Your deck HD - Eldrazi has the same commander and 73 of its cards.")).toBeInTheDocument();
    expect(screen.getByText("Your deck Kilo shares 64 of its cards.")).toBeInTheDocument();
  });

  it("says commanders when the precon has two", () => {
    render(<OpenPreconView precon={precon({
      commanders: [
        { oracleId: "a", name: "Frodo", imageUri: null, colorIdentity: ["G"] },
        { oracleId: "b", name: "Sam", imageUri: null, colorIdentity: ["W"] },
      ],
      built: [{ deckId: "a", deckName: "Shire", shared: 80, sameCommanders: true }],
    }, [
      card("Frodo", { isCommander: true, typeLine: "Legendary Creature — Halfling" }),
      card("Sam", { isCommander: true, typeLine: "Legendary Creature — Halfling" }),
      card("Sol Ring", { typeLine: "Artifact" }),
      card("Wastes", { typeLine: "Basic Land", basic: true, quantity: 15 }),
    ])} fromNew={false} />);
    expect(screen.getByText("Your deck Shire has the same commanders and 80 of its cards.")).toBeInTheDocument();
    expect(screen.getByText("2 commanders and 16 cards · 18 in all")).toBeInTheDocument();
  });

  it("names the twin and an unmapped card, with the count the ingest kept", () => {
    render(<OpenPreconView precon={precon({ twinName: "Eldrazi Unbound Collector’s Edition", unmapped: 1 })} fromNew={false} />);
    expect(screen.getByText(/Also sold as Eldrazi Unbound Collector’s Edition/)).toBeInTheDocument();
    expect(screen.getByText("1 card in this precon isn’t in our catalog yet, so 18 are listed.")).toBeInTheDocument();
  });
});
