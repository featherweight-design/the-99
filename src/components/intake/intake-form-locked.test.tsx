// Help me choose locks while it reads (small items 3, item 5). Its own file: an earlier suite leaves a submit
// pending on purpose, and React entangles async transitions, so a later release would never land after it.

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn(async (query: string) => { void query; return { kind: "refused" as const }; }));
vi.mock("../../app/decks/new/choose/actions", () => ({ submitChoose: push }));
vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: vi.fn(async () => []) }));
vi.mock("../../app/decks/new/choose/form-reach-actions", () => ({ formReachData: vi.fn(async () => ({ cards: [] })) }));

const { IntakeForm } = await import("./intake-form");
const { emptyParams } = await import("../../lib/intake/params");

describe("the form locks while it reads (small items 3, item 5)", () => {
  const themes = [{ slug: "orcs", label: "Orcs", commanders: 20 }];
  const start = { ...emptyParams(), words: "scary", themes: ["orcs"], sets: ["blb"] };
  const sets = [{ code: "blb", name: "Bloomburrow", releasedAt: "2024-08-02", commanders: 3 }];
  const form = () => screen.getByTestId("choose-dock").closest("form")!;
  const fields = () => Array.from(form().querySelectorAll("[inert]"));
  const slow = () => {
    let release!: () => void;
    // Reset first: an earlier suite's unused once-implementation would otherwise answer this press.
    push.mockReset();
    push.mockImplementation(async () => ({ kind: "refused" as const }));
    push.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ kind: "refused" as const }); }));
    return () => act(async () => { release(); });
  };
  const mount = () => render(<IntakeForm themes={themes} sets={sets as never} initial={start} />);
  const press = () => screen.getAllByRole("button", { name: /Find commanders|Reading/ })[0];

  it("sets nothing while idle", () => {
    mount();
    expect(fields()).toHaveLength(0);
    expect(form().hasAttribute("aria-busy")).toBe(false);
    expect(form().hasAttribute("data-intake-locked")).toBe(false);
  });

  it("makes the seven fields inert and the form busy from the press", async () => {
    push.mockClear();
    const settle = slow();
    mount();
    await act(async () => { fireEvent.click(press()); });
    expect(form().getAttribute("aria-busy")).toBe("true");
    expect(form().hasAttribute("data-intake-locked")).toBe(true);
    expect(fields()).toHaveLength(7);
    for (const label of ["Colors", "Theme", "Sets", "Cards for the 99", "Budget", "Bracket", /Anything else\?/]) {
      expect(screen.getAllByText(label)[0].closest("[inert]")).not.toBeNull();
    }
    // The press itself stays outside the lock, so it keeps focus.
    expect(press().closest("[inert]")).toBeNull();
    await settle();
  });

  it("moves focus from a field to the press on a submit by Enter, while it reads and after a refusal", async () => {
    push.mockClear();
    const settle = slow();
    mount();
    const budget = form().querySelector<HTMLElement>('input[inputmode="decimal"], input[type="number"], input[name*="budget" i]');
    const field = budget ?? screen.getByLabelText(/Anything else\?/);
    field.focus();
    expect(document.activeElement).toBe(field);
    await act(async () => { fireEvent.submit(form()); });
    const focused = document.activeElement as HTMLElement;
    expect(focused).not.toBe(field);
    expect(focused.tagName).toBe("BUTTON");
    expect(focused.closest("[inert]")).toBeNull();
    expect(focused.getAttribute("type")).toBe("submit");
    await settle();
    await waitFor(() => expect(fields()).toHaveLength(0));
    expect(document.activeElement).toBe(focused);
  });

  it("closes an open [[ card lookup when the read starts", async () => {
    push.mockClear();
    const settle = slow();
    mount();
    const box = screen.getByLabelText(/Anything else\?/) as HTMLTextAreaElement;
    box.focus();
    await act(async () => { fireEvent.change(box, { target: { value: "scary [[So", selectionStart: 10 } }); });
    await waitFor(() => expect(box.getAttribute("aria-expanded")).toBe("true"));
    await act(async () => { fireEvent.click(press()); });
    expect(box.getAttribute("aria-expanded")).not.toBe("true");
    await settle();
  });

  it("hides the controls with visibility, keeping their boxes in the tree", async () => {
    const css = (await import("node:fs")).readFileSync(`${process.cwd()}/src/app/globals.css`, "utf8");
    expect(css).toMatch(/\[data-intake-locked\] \[data-lock-hide\] \{ visibility: hidden; \}/);
    push.mockClear();
    const settle = slow();
    mount();
    const hideable = () => Array.from(form().querySelectorAll("[data-lock-hide]"));
    const before = hideable().length;
    // Chip ✕ (theme and set), the Add another… input, the Sets trigger and the [[ ]] button.
    expect(before).toBeGreaterThanOrEqual(5);
    await act(async () => { fireEvent.click(press()); });
    expect(hideable()).toHaveLength(before);
    for (const el of hideable()) {
      expect((el as HTMLElement).hidden).toBe(false);
      expect((el as HTMLElement).style.display).not.toBe("none");
      expect(el.closest("[inert]")).not.toBeNull();
    }
    await settle();
  });

  it("unlocks, values kept, when a refusal returns the form", async () => {
    push.mockClear();
    const settle = slow();
    mount();
    await act(async () => { fireEvent.click(press()); });
    expect(fields()).toHaveLength(7);
    await settle();
    await waitFor(() => expect(fields()).toHaveLength(0));
    expect(form().hasAttribute("aria-busy")).toBe(false);
    expect(form().hasAttribute("data-intake-locked")).toBe(false);
    expect((screen.getByLabelText(/Anything else\?/) as HTMLTextAreaElement).value).toBe("scary");
  });
});
