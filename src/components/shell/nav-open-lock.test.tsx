// The lock at zero cards with the no-collection entry on (call 6): Collection opens, Commanders and Decks stay
// locked, the well and the phone bracket span those two, and the note's button and sentence follow first run. With
// `openLock` null the shut three-slot lock stands; nav.test.tsx pins that whole.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavRail, TabBar } from "./nav";

vi.mock("../../lib/ui/reveal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/ui/reveal")>()),
  reveal: vi.fn(),
}));

let pathname = "/";
const push = vi.fn();
vi.mock("./pending-push", async () => {
  const { useRouter } = await import("next/navigation");
  return {
    usePendingPush: () => {
      const router = useRouter();
      return { go: (href: string) => router.push(href) };
    },
  };
});
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push }) }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Ana", fullName: "Ana Ruiz", primaryEmailAddress: { emailAddress: "a@example.com" } } }),
  useClerk: () => ({ redirectToUserProfile: vi.fn(), signOut: vi.fn() }),
}));

afterEach(() => {
  pathname = "/";
  push.mockReset();
  document.body.innerHTML = "";
});

const slot = (name: string) => screen.getByRole("button", { name: `${name}, locked` });
const noteOf = (button: HTMLElement) => document.getElementById(button.getAttribute("aria-controls")!)!;
const FIRST_RUN = { hasDecks: false };
const WITH_DECKS = { hasDecks: true };

describe("the open lock, desktop rail", () => {
  it("opens Collection and holds the other two in the well", () => {
    const { container } = render(<NavRail locked openLock={FIRST_RUN} theme="amonkhet" />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Collection" })).toHaveAttribute("href", "/collection");
    expect(within(nav).queryByRole("button", { name: "Collection, locked" })).toBeNull();
    const well = container.querySelector("[data-lock-well]") as HTMLElement;
    expect(within(well).getAllByRole("button", { name: /, locked$/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Commanders, locked",
      "Decks, locked",
    ]);
    expect(well.contains(within(nav).getByRole("link", { name: "Collection" }))).toBe(false);
  });

  it("names the other locked slot in the note, never Collection", () => {
    render(<NavRail locked openLock={FIRST_RUN} theme="amonkhet" />);
    expect(slot("Commanders")).toHaveAccessibleDescription("Commanders opens once your cards are in. So do Decks.");
  });

  it("on first run, Go to step 1 finds the upload when it is on the page", () => {
    render(
      <>
        <NavRail locked openLock={FIRST_RUN} theme="amonkhet" />
        <button type="button" data-step1-upload>
          Upload a CSV
        </button>
      </>,
    );
    fireEvent.pointerEnter(slot("Decks"));
    fireEvent.click(within(noteOf(slot("Decks"))).getByRole("button", { name: "Go to step 1" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Upload a CSV" }));
    expect(push).not.toHaveBeenCalled();
  });

  it("on first run off Home, Go to step 1 goes to Home's step 1, not the replace page", () => {
    pathname = "/collection";
    render(<NavRail locked openLock={FIRST_RUN} theme="amonkhet" />);
    fireEvent.pointerEnter(slot("Decks"));
    fireEvent.click(within(noteOf(slot("Decks"))).getByRole("button", { name: "Go to step 1" }));
    expect(push).toHaveBeenCalledWith("/");
    expect(push).not.toHaveBeenCalledWith("/collection/replace");
  });

  it("outside first run, the button is Add your cards to /collection and the note says where the decks are", () => {
    render(<NavRail locked openLock={WITH_DECKS} theme="amonkhet" />);
    expect(slot("Decks")).toHaveAccessibleDescription(
      "Decks opens once your cards are in. So do Commanders. Your decks are on Home until then.",
    );
    fireEvent.pointerEnter(slot("Decks"));
    const note = noteOf(slot("Decks"));
    expect(within(note).queryByRole("button", { name: "Go to step 1" })).toBeNull();
    fireEvent.click(within(note).getByRole("button", { name: "Add your cards" }));
    expect(push).toHaveBeenCalledWith("/collection");
  });

  it("with openLock null, Collection is locked and the note's button is Go to step 1", () => {
    render(<NavRail locked openLock={null} theme="amonkhet" />);
    expect(slot("Collection")).toBeInTheDocument();
    expect(slot("Decks")).toHaveAccessibleDescription("Decks opens once your cards are in. So do Collection and Commanders.");
    fireEvent.pointerEnter(slot("Decks"));
    fireEvent.click(within(noteOf(slot("Decks"))).getByRole("button", { name: "Go to step 1" }));
    expect(push).toHaveBeenCalledWith("/collection/replace");
  });

  it("draws no lock once a card lands, whatever openLock says", () => {
    const { container } = render(<NavRail locked={false} openLock={WITH_DECKS} theme="amonkhet" />);
    expect(container.querySelector("[data-lock-well]")).toBeNull();
    expect(screen.queryByRole("button", { name: /, locked$/ })).toBeNull();
  });
});

describe("the open lock, phone tab bar", () => {
  it("spans the bracket over tabs 3 to 4, with Home and Collection live before it and Friends after", () => {
    const { container } = render(<TabBar locked openLock={FIRST_RUN} />);
    const bracket = container.querySelector("[data-lock-bracket]")!;
    expect((bracket as HTMLElement).style.marginLeft).toBe("40%");
    expect((bracket as HTMLElement).style.width).toBe("40%");
    const bar = screen.getByRole("navigation", { name: "Primary" });
    const order = Array.from(bar.querySelectorAll("a, button[data-locked-slot]")).map(
      (el) => el.getAttribute("data-locked-slot") ?? el.textContent,
    );
    expect(order).toEqual(["Home", "Collection", "Commanders", "Decks", "Friends"]);
    expect(within(bar).getByRole("link", { name: "Collection" })).toHaveAttribute("href", "/collection");
  });

  it("keeps the shut bracket over tabs 2 to 4 with openLock null", () => {
    const { container } = render(<TabBar locked openLock={null} />);
    const bracket = container.querySelector<HTMLElement>("[data-lock-bracket]")!;
    expect(bracket.style.marginLeft).toBe("20%");
    expect(bracket.style.width).toBe("60%");
    expect(slot("Collection")).toBeInTheDocument();
  });

  it("outside first run, the tapped note's button is Add your cards", () => {
    render(<TabBar locked openLock={WITH_DECKS} />);
    fireEvent.click(slot("Commanders"));
    const note = noteOf(slot("Commanders"));
    expect(note).toHaveTextContent("Your decks are on Home until then.");
    fireEvent.click(within(note).getByRole("button", { name: "Add your cards" }));
    expect(push).toHaveBeenCalledWith("/collection");
  });

  it("on first run, the tapped note's button is Go to step 1", () => {
    render(<TabBar locked openLock={FIRST_RUN} />);
    fireEvent.click(slot("Decks"));
    const note = noteOf(slot("Decks"));
    expect(note).not.toHaveTextContent("Your decks are on Home");
    expect(within(note).getByRole("button", { name: "Go to step 1" })).toBeInTheDocument();
  });
});
