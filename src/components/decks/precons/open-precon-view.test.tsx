import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { OpenPrecon, OpenPreconCard } from "../../../lib/precons/open-read";

const providerProps = vi.hoisted(() => ({ picks: null as unknown, views: null as unknown }));
vi.mock("../../cards/card-detail-provider", () => ({
  CardDetailProvider: ({ children, deckPrintingPicks, viewPrintings }: { children: React.ReactNode; deckPrintingPicks?: unknown; viewPrintings?: unknown }) => {
    providerProps.picks = deckPrintingPicks;
    providerProps.views = viewPrintings;
    return children;
  },
  useCardDetail: () => ({ open: vi.fn() }),
  cardDetailCopy: { triggerAria: (name: string) => `View details for ${name}` },
  CardDetailTrigger: ({ children, name, siblings }: { children: React.ReactNode; name: string; siblings?: readonly string[] }) => (
    <button type="button" aria-label={name} data-siblings={(siblings ?? []).join(",")}>{children}</button>
  ),
}));
const startProps = vi.hoisted(() => ({ illegal: [] as string[], row: null as null | { built: unknown }, dock: undefined as string | undefined, addedOn: undefined as string | null | undefined, addFileName: undefined as string | undefined }));
vi.mock("./start-precon", () => ({
  StartPrecon: (p: { illegal: string[]; row: { built: unknown }; dockSummary?: string; addedOn?: string | null; addFileName?: string }) => {
    startProps.illegal = p.illegal; startProps.row = p.row; startProps.dock = p.dockSummary;
    startProps.addedOn = p.addedOn; startProps.addFileName = p.addFileName; return null;
  },
}));
const linkActions = vi.hoisted(() => ({ linkPrecon: vi.fn(), unlinkPrecon: vi.fn() }));
const mirrored = vi.hoisted(() => ({ urls: [] as string[] }));
vi.mock("../../../lib/url/mirror", () => ({ mirrorUrl: (u: string) => { mirrored.urls.push(u); } }));
vi.mock("../../../app/decks/precon-link-actions", () => linkActions);
vi.mock("../decklist-group", () => ({
  DecklistGroup: (p: { label: string; note?: string; readOnly?: boolean; view?: string; cards: { name: string; layout?: string | null }[]; footer?: React.ReactNode; footerCount?: number; cardTail?: React.ReactNode }) => (
    <section data-testid="group" data-readonly={String(p.readOnly)} data-view={p.view ?? "list"} data-footer-count={p.footerCount ?? 0}>
      <h2>{p.label}</h2><span>{p.note}</span>{p.cards.map((c) => <span key={c.name} data-layout={c.layout ?? ""}>{c.name}</span>)}{p.footer}
      {p.cardTail && <ul data-testid="card-tail">{p.cardTail}</ul>}
    </section>
  ),
}));
import { OpenPreconView } from "./open-precon-view";

const card = (name: string, over: Partial<OpenPreconCard> = {}): OpenPreconCard => ({
  oracleId: name, name, typeLine: "Creature — Eldrazi", manaCost: null, layout: "normal", imageUri: null, quantity: 1, foil: 0,
  isCommander: false, basic: false, owned: true, legal: true, printing: { scryfallId: `p-${name}`, setCode: "cmm", collectorNumber: "1", label: "CMM 1", imageUri: null, backImageUri: null }, ...over,
});

function precon(over: Partial<Extract<OpenPrecon, { kind: "precon" }>["row"]> = {}, cards = [
  card("Zhulodok", { isCommander: true, typeLine: "Legendary Creature — Eldrazi" }),
  card("Sol Ring", { typeLine: "Artifact", owned: false }),
  card("Ruins", { typeLine: "Land" }),
  card("Wastes", { typeLine: "Basic Land", basic: true, quantity: 15 }),
]): Extract<OpenPrecon, { kind: "precon" }> {
  return {
    kind: "precon", setName: "Commander Masters", hasCollection: true, cards, decks: [], addedOn: null, collector: null,
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
    // R3: the own box no longer repeats the basics rule (the list's sub line says it once).
    expect(screen.queryByText(/basic lands not counted/)).toBeNull();
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

  it("draws no built line without a collection, but still hands the decks to the start dialog", () => {
    const built = [{ deckId: "a", deckName: "HD - Eldrazi", shared: 73, sameCommanders: true, linked: false }];
    render(<OpenPreconView precon={{ ...precon({ built }), hasCollection: false }} fromNew={false} />);
    expect(screen.queryByText(/Your deck HD - Eldrazi/)).toBeNull();
    expect(startProps.row?.built).toEqual(built);
  });

  it("never tells the start dialog a banned commander stays in", () => {
    render(<OpenPreconView precon={precon({}, [
      card("Zhulodok", { isCommander: true, typeLine: "Legendary Creature — Eldrazi", legal: false }),
      card("Dockside Extortionist", { legal: false }),
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
    render(<OpenPreconView precon={precon({ built: ["A", "B", "C"].map((d, i) => ({ deckId: d, deckName: d, shared: 70 - i, sameCommanders: false, linked: false })) })} fromNew={false} />);
    expect(screen.getByText("Your deck C shares 68 of its cards.")).toBeInTheDocument();
  });

  it("words a shared deck by whether it kept the commander", () => {
    render(<OpenPreconView precon={precon({ built: [
      { deckId: "a", deckName: "HD - Eldrazi", shared: 73, sameCommanders: true, linked: false },
      { deckId: "b", deckName: "Kilo", shared: 64, sameCommanders: false, linked: false },
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
      built: [{ deckId: "a", deckName: "Shire", shared: 80, sameCommanders: true, linked: false }],
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

  it("says a linked deck was built from it, with Unlink, before the decks that only share (K8, K16)", () => {
    render(<OpenPreconView precon={precon({ of: 85, built: [
      { deckId: "a", deckName: "HD - Eldrazi", shared: 73, sameCommanders: true, linked: true },
      { deckId: "b", deckName: "Kilo", shared: 64, sameCommanders: false, linked: false },
    ] })} fromNew={false} />);
    const sentence = screen.getByText("Your deck HD - Eldrazi was built from this. 73 of its 85 cards are still in it.");
    const lines = screen.getAllByText(/^Your deck /).map((e) => e.textContent);
    expect(lines.indexOf(sentence.textContent)).toBeLessThan(lines.indexOf("Your deck Kilo shares 64 of its cards."));
    expect(screen.queryByText(/HD - Eldrazi has the same commander/)).toBeNull();
    expect(within(sentence.parentElement!).getByRole("button", { name: "Unlink" })).toBeInTheDocument();
  });

  it("keeps the linked line, and its Unlink, without a collection", () => {
    render(<OpenPreconView precon={{ ...precon({ built: [{ deckId: "a", deckName: "HD - Eldrazi", shared: 1, sameCommanders: true, linked: true }] }), hasCollection: false }} fromNew={false} />);
    expect(screen.getByText(/Your deck HD - Eldrazi was built from this/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlink" })).toBeInTheDocument();
  });

  it("unlinks from the confirm, naming what leaves, and says so when it fails (K13)", async () => {
    linkActions.unlinkPrecon.mockRejectedValueOnce(new Error("boom"));
    render(<OpenPreconView precon={precon({ built: [{ deckId: "a", deckName: "HD - Eldrazi", shared: 1, sameCommanders: true, linked: true }] })} fromNew={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));
    const dialog = screen.getByRole("dialog", { name: "Unlink HD - Eldrazi from Eldrazi Unbound?" });
    expect(within(dialog).getByText("v0 leaves · v1 is first again")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Unlink" }));
    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent("That didn’t unlink. Try again."));
    expect(linkActions.unlinkPrecon).toHaveBeenCalledWith("a", "EldraziUnbound_CMM");
  });

  it("links a deck from the picker, most shared first, naming one linked elsewhere (K7)", async () => {
    linkActions.linkPrecon.mockResolvedValueOnce(undefined);
    render(<OpenPreconView precon={{ ...precon({ of: 85 }), decks: [
      { deckId: "e", deckName: "HD - Eldrazi", commanders: ["Ulalek"], shared: 73, sameCommanders: true, linkedElsewhere: null },
      { deckId: "k", deckName: "Kilo", commanders: ["Kilo"], shared: 6, sameCommanders: false, linkedElsewhere: "Counter Intelligence" },
    ] }} fromNew={false} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Link a deck" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Link a deck to Eldrazi Unbound" });
    const radios = within(dialog).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual(["Select HD - Eldrazi", "Select Kilo"]);
    expect(within(dialog).getByText("built from Counter Intelligence · linking moves it here")).toBeInTheDocument();
    expect(within(dialog).getByText("73 of 85")).toBeInTheDocument();
    fireEvent.click(radios[1]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Link Kilo" }));
    await waitFor(() => expect(linkActions.linkPrecon).toHaveBeenCalledWith("k", "EldraziUnbound_CMM"));
  });

  it("names the linked deck in the phone dock", () => {
    render(<OpenPreconView precon={precon({ built: [{ deckId: "a", deckName: "HD - Eldrazi", shared: 1, sameCommanders: true, linked: true }] })} fromNew={false} />);
    expect(startProps.dock).toBe("Eldrazi Unbound · your deck HD - Eldrazi was built from this");
  });

  describe("Card view (R4 §6)", () => {
    beforeEach(() => window.localStorage.clear());

    it("opens on List, the deck page's well at the list-note line", () => {
      render(<OpenPreconView precon={precon()} fromNew={false} />);
      expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getAllByTestId("group").every((g) => g.dataset.view === "list")).toBe(true);
      expect(screen.getByText("Wastes ×15")).toBeInTheDocument();
      expect(screen.queryByTestId("card-tail")).toBeNull();
    });

    it("draws every group as cards, stores the choice apart from the deck page's, and tiles the basics", () => {
      window.localStorage.setItem("the99:deck-view", "list");
      render(<OpenPreconView precon={precon()} fromNew={false} />);
      fireEvent.click(screen.getByRole("button", { name: "Card view" }));
      expect(screen.getAllByTestId("group").every((g) => g.dataset.view === "card")).toBe(true);
      expect(window.localStorage.getItem("the99:precons:openView")).toBe("card");
      expect(window.localStorage.getItem("the99:deck-view")).toBe("list");
      // The basics leave the dashed line for one tile per name, still in Lands' count.
      expect(screen.queryByText("Wastes ×15")).toBeNull();
      const tail = screen.getByTestId("card-tail");
      expect(within(tail).getByText("×15")).toBeInTheDocument();
      expect(within(tail).getByText("basic · not counted")).toBeInTheDocument();
      expect(screen.getByText(/each card shows the precon’s printing/)).toBeInTheDocument();
    });

    it("counts a basic's arts from the printings it merges (G-R4-2)", () => {
      window.localStorage.setItem("the99:precons:openView", "card");
      const wastes = (n: string) => card("Wastes", { typeLine: "Basic Land", basic: true, quantity: 5,
        printing: { scryfallId: `w${n}`, setCode: "cmm", collectorNumber: n, label: `CMM ${n}`, imageUri: null, backImageUri: null } });
      render(<OpenPreconView precon={precon({}, [
        card("Zhulodok", { isCommander: true, typeLine: "Legendary Creature — Eldrazi" }),
        card("Ruins", { typeLine: "Land" }), wastes("287"), wastes("288"), wastes("289"),
      ])} fromNew={false} />);
      const tail = screen.getByTestId("card-tail");
      expect(within(tail).getByText("CMM · first of 3 arts")).toBeInTheDocument();
      expect(within(tail).getByText("×15")).toBeInTheDocument();
      // The basic joins card details' run after Lands' cards, so its Prev/Next work like any tile's.
      expect(within(tail).getByRole("button", { name: "Wastes" }).dataset.siblings).toBe("Zhulodok,Ruins,Wastes");
    });
  });
});

describe("OpenPreconView edition switch", () => {
  const ce = (name: string, over: Partial<OpenPreconCard> = {}) => card(name, {
    foil: 1, printing: { scryfallId: `ce-${name}`, setCode: "cmc", collectorNumber: "9", label: "CMC 9", imageUri: null, backImageUri: null }, ...over,
  });
  const withCollector = () => ({
    ...precon(),
    addedOn: "2026-10-01T00:00:00.000Z",
    collector: { fileName: "EldraziUnboundCE_CMM", addedOn: null, cards: [
      ce("Zhulodok", { isCommander: true, typeLine: "Legendary Creature — Eldrazi" }),
      ce("Sol Ring", { typeLine: "Artifact", owned: false }),
      ce("Ruins", { typeLine: "Land" }),
      ce("Wastes", { typeLine: "Basic Land", basic: true, quantity: 15, foil: 15 }),
    ] },
  });
  const viewed = (oracleId: string) => (providerProps.views as Record<string, { setCode: string }>)[oracleId]?.setCode;

  beforeEach(() => { mirrored.urls = []; window.history.replaceState(null, "", "/decks/precons/EldraziUnbound_CMM?from=new"); });

  it("is not drawn for a precon with no Collector's Edition", () => {
    render(<OpenPreconView precon={precon()} fromNew={false} />);
    expect(screen.queryByRole("radiogroup", { name: "Edition" })).toBeNull();
  });

  it("starts on the edition the URL named, and draws that edition's printings", () => {
    render(<OpenPreconView precon={withCollector()} fromNew={false} edition="collector" />);
    expect(screen.getByRole("radio", { name: "Collector's Edition" })).toHaveAttribute("aria-checked", "true");
    expect(viewed("Sol Ring")).toBe("cmc");
    expect(screen.getByText("Every card in the Collector's Edition is foil.")).toBeInTheDocument();
  });

  it("hands Start the chosen edition's own box and its own added date", () => {
    render(<OpenPreconView precon={withCollector()} fromNew={false} />);
    expect(startProps).toMatchObject({ addFileName: "EldraziUnbound_CMM", addedOn: "2026-10-01T00:00:00.000Z" });
    fireEvent.click(screen.getByRole("radio", { name: "Collector's Edition" }));
    expect(startProps).toMatchObject({ addFileName: "EldraziUnboundCE_CMM", addedOn: null });
  });

  it("swaps the printings on a press, keeps the counts, and writes only its own parameter", () => {
    render(<OpenPreconView precon={withCollector()} fromNew={false} />);
    expect(viewed("Sol Ring")).toBe("cmm");
    fireEvent.click(screen.getByRole("radio", { name: "Collector's Edition" }));
    expect(viewed("Sol Ring")).toBe("cmc");
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(mirrored.urls.at(-1)).toBe("/decks/precons/EldraziUnbound_CMM?from=new&edition=collector");
    fireEvent.click(screen.getByRole("radio", { name: "Regular" }));
    expect(viewed("Sol Ring")).toBe("cmm");
    expect(mirrored.urls.at(-1)).toBe("/decks/precons/EldraziUnbound_CMM?from=new");
  });
});
