// #337: `createDeck` ends in `redirect()`, which signals by throwing. Both
// create surfaces await it inside a try/catch, so before `unstable_rethrow` the
// success path set "We couldn’t create that deck. Try again." on its way out and the
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

const FAILED = /create that deck/;

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

// The picker draws a name field per breakpoint, so both carry the label.
function typeName(value: string) {
  for (const field of screen.getAllByLabelText("Deck name")) {
    fireEvent.change(field, { target: { value } });
  }
}

// Matched by prefix on both carriers: Next has moved the target between the
// message and the `digest` across versions, and `src/app/decks/actions.test.ts`
// already sees the `NEXT_REDIRECT;<target>` form. An exact-equality check would
// stop swallowing on the next move and fail the file for the wrong reason.
function isRedirect(value: unknown) {
  if (!(value instanceof Error)) return false;
  const digest = (value as { digest?: unknown }).digest;
  return (
    value.message.startsWith("NEXT_REDIRECT") ||
    (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT"))
  );
}

// Rethrowing is the fix, and the rethrow escapes the transition: in the app
// Next's router catches it and navigates, but nothing here does, so jsdom
// reports it as an uncaught error and vitest fails the file. Swallow it — the
// assertions below are about what the component painted, not about who
// eventually catches the redirect.
function swallowRedirect(event: ErrorEvent | PromiseRejectionEvent) {
  const value = "reason" in event ? event.reason : event.error;
  if (isRedirect(value)) event.preventDefault();
}

// `createDeck` is shared across the file, so its call history is not a per-test
// signal: `toHaveBeenCalled` would be satisfied by the test before this one.
// The flag is scoped to one test and cannot be. Clearing the shared mock
// between tests is the obvious alternative and is not safe here — dropping its
// recorded results detaches the rejected promise a redirecting run leaves
// behind, and it resurfaces as an unhandled rejection that fails the file.
function redirectingRun(target: string) {
  const state = { called: false };
  createDeck.mockImplementation(async () => {
    state.called = true;
    return redirect(target);
  });
  return state;
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
    const run = redirectingRun("/decks/new-id");
    render(<CreatePicker legalCommanders={commanders} />);

    fireEvent.click(screen.getByRole("button", { name: /Greta/ }));
    typeName("Greta goes to town");
    fireEvent.click(screen.getAllByRole("button", { name: /create deck/i })[0]);

    await waitFor(() => expect(run.called).toBe(true));
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
    const run = redirectingRun("/decks/new-id");
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

    await waitFor(() => expect(run.called).toBe(true));
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

describe("CreatePreFilled — the desktop card face", () => {
  // The two card faces converge on one ring alpha and one shadow, and nothing
  // else covered this one: these tests exercise submission and errors, and the
  // browser census measures `[data-commander-thumb]` elements — which a 220px
  // face deliberately is not, since the player is meant to read the printing.
  it("rings and shadows the face at the converged values", () => {
    const { container } = render(
      <CreatePreFilled
        oracleId="oracle-1"
        name="Greta, Sweettooth Scourge"
        typeLine="Legendary Creature — Human Peasant"
        colorIdentity={["B", "G"]}
        imageUri={null}
      />,
    );
    const face = Array.from(container.querySelectorAll<HTMLElement>("div")).find(
      (el) => el.style.aspectRatio === "63/88",
    )!;
    expect(face.style.boxShadow).toContain("inset 0 0 0 1px rgba(0,0,0,0.4)");
    expect(face.style.boxShadow).toContain("0 20px 50px rgba(0,0,0,0.5)");
    // The 24px offset was this face's own drift, and `.3` the other's ring.
    expect(face.style.boxShadow).not.toContain("24px");
    expect(face.style.boxShadow).not.toContain("0.3)");
  });
});
