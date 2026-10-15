// The phone layering rule (#177): the shell tab bar owns the true bottom edge
// at z-40, so a route dock pinned to `bottom-0` at a lower z is drawn over.
// jsdom lays nothing out, so these assert the two halves of the rule that
// survive without layout — where the footer is pinned, and that the scrolling
// column reserves the footer's height rather than assuming a constant. The
// clearance itself is measured at runtime by `scripts/probe-bottom.mjs`.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { addPanelCopy } from "../../lib/copy/decks-builder";

vi.mock("../../app/decks/actions", () => ({ createDeck: vi.fn() }));
// Partial, not a bare stub: the component imports `unstable_rethrow` from this
// module, and a stub that omits it hands the catch path an undefined to call.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

const { CreatePicker } = await import("./create-picker");

// jsdom implements no layout and ships no scrollIntoView; a pick calls it to bring the picked row into
// view. Patched only when missing, so a real implementation is never masked.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const commanders = [
  {
    oracleId: "oracle-1",
    name: "Greta, Sweettooth Scourge",
    colorIdentity: ["B", "G"],
    imageUri: null,
    oracleText: null,
    typeLine: "Legendary Creature — Human",
    poolCount: 42,
  },
];

describe("CreatePicker — phone bottom stack", () => {
  it("pins the footer above the tab bar, not on the bottom edge", () => {
    render(<CreatePicker legalCommanders={commanders} />);
    const footer = screen.getByTestId("create-picker-dock");

    expect(footer).toHaveClass("bottom-[var(--tabbar-h)]");
    expect(footer).not.toHaveClass("bottom-0");
    expect(screen.getAllByRole("button", { name: /create deck/i }).some((b) =>
      footer?.contains(b),
    )).toBe(true);
  });

  it("reserves the footer's measured height under the commander list", () => {
    const { container } = render(<CreatePicker legalCommanders={commanders} />);
    const column = container.querySelector(".pb-\\[var\\(--picker-reserve\\)\\]");

    expect(column).not.toBeNull();
    // Nothing has been measured in jsdom, so the reserve is the breathing room
    // alone. The point of the assertion is that the value is a variable.
    expect((column as HTMLElement).style.getPropertyValue("--picker-reserve")).toBe("12px");
  });

  it("carries only the summary and the button, so its height cannot move under a thumb", () => {
    const { container } = render(<CreatePicker legalCommanders={commanders} />);
    const footer = screen.getByTestId("create-picker-dock");

    expect(footer).toHaveTextContent(addPanelCopy.createPicker.dockSummaryEmpty);
    // The name field is the thing that used to live here. It belongs to the
    // scrolling flow now — in the dock it would resize on selection.
    expect(footer.querySelector("#picker-deck-name-mobile")).toBeNull();
    expect(container.querySelector("#picker-deck-name-mobile")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Greta/ }));
    expect(footer).toHaveTextContent(
      addPanelCopy.createPicker.dockSummary("Greta, Sweettooth Scourge", "Golgari"),
    );
    expect(footer.querySelector("#picker-deck-name-mobile")).toBeNull();
  });

  it("puts the relocated name field above the list, which scrolls without end", () => {
    const { container } = render(<CreatePicker legalCommanders={commanders} />);
    const name = container.querySelector("#picker-deck-name-mobile") as HTMLElement;
    const list = container.querySelector("ul") as HTMLElement;

    expect(name.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("drops the relocated name field when there is no commander to name a deck after", () => {
    const { container } = render(<CreatePicker legalCommanders={[]} />);
    expect(container.querySelector("#picker-deck-name-mobile")).toBeNull();
  });
});

// `partnerNoneOwned` is a statement about the collection, not about the search:
// it says nobody the player owns can pair with this commander. Printing it over
// a query that simply matched nothing would tell a player they own no partner
// while the partner they own sits one typo away.
describe("CreatePicker — the partner list's empty state", () => {
  const pairable = [
    {
      oracleId: "oracle-a",
      name: "Ishai, Ojutai Dragonspeaker",
      colorIdentity: ["W", "U"],
      imageUri: null,
      oracleText: "Partner (You can have two commanders if both have partner.)",
      typeLine: "Legendary Creature — Human",
      poolCount: 3,
    },
    {
      oracleId: "oracle-b",
      name: "Bruse Tarl, Boorish Herder",
      colorIdentity: ["R", "W"],
      imageUri: null,
      oracleText: "Partner (You can have two commanders if both have partner.)",
      typeLine: "Legendary Creature — Human",
      poolCount: 2,
    },
  ];

  function enterPairingMode() {
    render(<CreatePicker legalCommanders={pairable} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Ishai/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^Add a partner/ })[0]);
  }

  it("says nobody can pair only when the list is empty on its own terms", () => {
    render(
      <CreatePicker
        legalCommanders={[{ ...pairable[0], oracleText: "Partner—Father & son" }]}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Ishai/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^Add a partner/ })[0]);

    // The slot's own caption says this too when the count is zero, so the
    // assertion is that it is said — not that it is said exactly once.
    expect(screen.getAllByText(/none of your commanders can pair/).length).toBeGreaterThan(0);
  });

  it("offers a Doctor's companion to a Time Lord Doctor, read off the Doctor's type line", () => {
    const doctor = {
      ...pairable[0], oracleId: "oracle-doctor", name: "The Tenth Doctor",
      oracleText: "Allons-y! — Whenever The Tenth Doctor attacks, ...", typeLine: "Legendary Creature — Time Lord Doctor",
    };
    const rose = {
      ...pairable[1], oracleId: "oracle-rose", name: "Rose Tyler",
      oracleText: "Doctor's companion (You can have two commanders if the other is the Doctor.)", typeLine: "Legendary Creature — Human",
    };
    render(<CreatePicker legalCommanders={[doctor, rose, pairable[0]]} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Tenth Doctor/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^Add a partner/ })[0]);

    expect(screen.getAllByRole("button", { name: /Rose Tyler/ }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: /Ishai/ })).toHaveLength(0);
  });

  it("falls back to the ordinary no-match message when a query emptied the list", () => {
    enterPairingMode();
    fireEvent.change(screen.getAllByPlaceholderText("Search commanders…")[0], {
      target: { value: "zzzznotacommander" },
    });

    expect(screen.getByText(/No commanders match/)).toBeInTheDocument();
    expect(screen.queryByText(/none of your commanders can pair/)).toBeNull();
  });
});

// The picker draws each candidate's card image, and every row here is a card the player
// OWNS — so both the art and the name are their copy's. `name` stays the oracle name on
// the row itself, because `canPair` matches a "Partner with" ability against it.
describe("CreatePicker — a renamed copy", () => {
  const renamed = [
    {
      oracleId: "oracle-sld",
      name: "Iroas, God of Victory",
      printedName: "Freya, Queen of the Valkyries",
      colorIdentity: ["R", "W"],
      imageUri: null,
      oracleText: null,
      typeLine: "Legendary Creature — Human",
      poolCount: 12,
    },
  ];

  it("lists the row under the name printed on the card", () => {
    render(<CreatePicker legalCommanders={renamed} />);

    expect(screen.getByText("Freya, Queen of the Valkyries")).toBeTruthy();
    expect(screen.queryByText("Iroas, God of Victory")).toBeNull();
  });

  it("finds it by either name", () => {
    render(<CreatePicker legalCommanders={renamed} />);
    const search = screen.getByRole("searchbox");

    fireEvent.change(search, { target: { value: "freya" } });
    expect(screen.getByText("Freya, Queen of the Valkyries")).toBeTruthy();

    // The oracle name is what a player who knows the card types.
    fireEvent.change(search, { target: { value: "iroas" } });
    expect(screen.getByText("Freya, Queen of the Valkyries")).toBeTruthy();
  });
});

describe("CreatePicker — Help me choose's door", () => {
  it("draws the door first in the list column, above the search, with the sub that offers it", () => {
    render(<CreatePicker legalCommanders={commanders} helpDoor />);
    const door = screen.getByTestId("help-me-choose-door");
    expect(door.parentElement!.firstElementChild).toBe(door);
    expect(screen.getByRole("link", { name: "Help me choose →" }).getAttribute("href")).toBe("/decks/new/choose");
    expect(screen.getByText(addPanelCopy.createPicker.sub)).toBeTruthy();
  });

  it("adds the past-runs link to History only when the page says the player has a run", () => {
    const { unmount } = render(<CreatePicker legalCommanders={commanders} helpDoor />);
    expect(screen.queryByTestId("past-runs-link")).toBeNull();
    unmount();
    render(<CreatePicker legalCommanders={commanders} helpDoor pastRuns />);
    const links = screen.getAllByTestId("past-runs-link");
    // One per width (the wide one closes the sentence, the narrow one has its own line), both to History.
    expect(links).toHaveLength(2);
    for (const l of links) {
      expect(l.getAttribute("href")).toBe("/decks/new/choose?v=history");
      expect(l.textContent).toBe("Your past runs ›");
    }
  });

  it("is never in the dock", () => {
    render(<CreatePicker legalCommanders={commanders} helpDoor />);
    expect(screen.getByTestId("create-picker-dock").querySelector("[data-testid='help-me-choose-door']")).toBeNull();
  });

  it("draws the precon door directly under Help me choose, and the sub offers both", () => {
    render(<CreatePicker legalCommanders={commanders} helpDoor preconDoor />);
    const help = screen.getByTestId("help-me-choose-door");
    expect(help.nextElementSibling).toBe(screen.getByTestId("precon-door"));
    expect(screen.getByRole("link", { name: "Browse precons →" }).getAttribute("href")).toBe("/decks/precons?from=new");
    expect(screen.getByText(addPanelCopy.createPicker.subDoors)).toBeTruthy();
  });

  it("draws the precon door first when Help me choose is off", () => {
    render(<CreatePicker legalCommanders={commanders} preconDoor />);
    const door = screen.getByTestId("precon-door");
    expect(door.parentElement!.firstElementChild).toBe(door);
    expect(screen.getByText(addPanelCopy.createPicker.subPrecon)).toBeTruthy();
  });

  it("is drawn only when the page passes the flag, and the sub then makes no offer", () => {
    render(<CreatePicker legalCommanders={commanders} />);
    expect(screen.queryByTestId("help-me-choose-door")).toBeNull();
    expect(screen.getByText(addPanelCopy.createPicker.subAlone)).toBeTruthy();
  });
});

// One rule for a search field that picks from a list (DECK INPUT UX, Hugh 2026-10-12).
describe("CreatePicker — its search", () => {
  const two = [
    commanders[0],
    { ...commanders[0], oracleId: "oracle-2", name: "Atraxa, Praetors' Voice", colorIdentity: ["W", "U", "B", "G"] },
  ];

  it("clears the search once a commander is picked, keeps the pick and brings it into view", () => {
    const reveal = vi.spyOn(Element.prototype, "scrollIntoView");
    render(<CreatePicker legalCommanders={two} />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "greta" } });
    fireEvent.click(screen.getByRole("button", { name: /Greta, Sweettooth Scourge/, pressed: false }));
    expect(search).toHaveValue("");
    expect(screen.getByRole("button", { name: /Greta, Sweettooth Scourge/, pressed: true })).toBeTruthy();
    expect(screen.getByText("Atraxa, Praetors' Voice")).toBeTruthy();
    expect(reveal.mock.contexts.some((el) => (el as Element).getAttribute("data-picker-row") === "oracle-1")).toBe(true);
    reveal.mockRestore();
  });

  it("clears the search on Escape", () => {
    render(<CreatePicker legalCommanders={two} />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "greta" } });
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
  });
});
