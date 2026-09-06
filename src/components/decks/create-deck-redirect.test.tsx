// #337: `createDeck` ends in `redirect()`, which signals by throwing. Both
// create surfaces await it inside a try/catch, so before `unstable_rethrow` the
// success path set "Failed to create deck. Try again." on its way out and the
// player saw the failure flash for as long as the navigation took.
//
// The thrown value is built by calling the real `redirect()` rather than by
// hand: its shape is Next's to change, and a hand-rolled stand-in would keep
// passing after the framework moved.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

const createDeck = vi.fn();
vi.mock("../../app/decks/actions", () => ({ createDeck: (...args: unknown[]) => createDeck(...args) }));
// Partial: `unstable_rethrow` is the thing under test, so it has to be the real
// one, and `redirect` has to be the real one for it to recognise.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

const { CreatePicker } = await import("./create-picker");
const { CreatePreFilled } = await import("./create-pre-filled");

const FAILED = /Failed to create deck/;

const commanders = [
  {
    oracleId: "oracle-1",
    name: "Greta, Sweettooth Scourge",
    colorIdentity: ["B", "G"],
    imageUri: null,
    poolCount: 42,
  },
];

// The picker draws a name field per breakpoint, so both carry the label.
function typeName(value: string) {
  for (const field of screen.getAllByLabelText("Deck name")) {
    fireEvent.change(field, { target: { value } });
  }
}

// Rethrowing is the fix, and the rethrow escapes the transition: in the app
// Next's router catches it and navigates, but nothing here does, so jsdom
// reports it as an uncaught error and vitest fails the file. Swallow it —
// the assertions below are about what the component painted, not about who
// eventually catches the redirect.
function swallowRedirect(event: ErrorEvent | PromiseRejectionEvent) {
  const value = "reason" in event ? event.reason : event.error;
  if (value instanceof Error && value.message === "NEXT_REDIRECT") event.preventDefault();
}

describe("create surfaces — a redirecting action is not a failure", () => {
  beforeAll(() => {
    window.addEventListener("error", swallowRedirect);
    window.addEventListener("unhandledrejection", swallowRedirect);
  });
  afterAll(() => {
    window.removeEventListener("error", swallowRedirect);
    window.removeEventListener("unhandledrejection", swallowRedirect);
  });

  it("picker: shows no error when the action redirects", async () => {
    createDeck.mockImplementation(async () => redirect("/decks/new-id"));
    render(<CreatePicker legalCommanders={commanders} />);

    fireEvent.click(screen.getByRole("button", { name: /Greta/ }));
    typeName("Greta goes to town");
    fireEvent.click(screen.getAllByRole("button", { name: /create deck/i })[0]);

    await waitFor(() => expect(createDeck).toHaveBeenCalled());
    expect(screen.queryByText(FAILED)).toBeNull();
  });

  it("picker: still shows the error when the action really fails", async () => {
    createDeck.mockImplementation(async () => {
      throw new Error("database is on fire");
    });
    render(<CreatePicker legalCommanders={commanders} />);

    fireEvent.click(screen.getByRole("button", { name: /Greta/ }));
    typeName("Greta goes to town");
    fireEvent.click(screen.getAllByRole("button", { name: /create deck/i })[0]);

    expect(await screen.findAllByText(FAILED)).not.toHaveLength(0);
  });

  it("pre-filled: shows no error when the action redirects", async () => {
    createDeck.mockImplementation(async () => redirect("/decks/new-id"));
    render(
      <CreatePreFilled
        oracleId="oracle-1"
        name="Greta, Sweettooth Scourge"
        typeLine="Legendary Creature — Human Peasant"
        colorIdentity={["B", "G"]}
        imageUri={null}
      />,
    );

    typeName("Greta goes to town");
    fireEvent.click(screen.getAllByRole("button", { name: /create deck/i })[0]);

    await waitFor(() => expect(createDeck).toHaveBeenCalled());
    expect(screen.queryByText(FAILED)).toBeNull();
  });

  it("pre-filled: still shows the error when the action really fails", async () => {
    createDeck.mockImplementation(async () => {
      throw new Error("database is on fire");
    });
    render(
      <CreatePreFilled
        oracleId="oracle-1"
        name="Greta, Sweettooth Scourge"
        typeLine="Legendary Creature — Human Peasant"
        colorIdentity={["B", "G"]}
        imageUri={null}
      />,
    );

    typeName("Greta goes to town");
    fireEvent.click(screen.getAllByRole("button", { name: /create deck/i })[0]);

    expect(await screen.findAllByText(FAILED)).not.toHaveLength(0);
  });
});
