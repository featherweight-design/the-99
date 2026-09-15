import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const setCardProxied = vi.fn();
vi.mock("../../app/decks/actions", () => ({ setCardProxied: (...a: unknown[]) => setCardProxied(...a) }));

import { ProxyControl } from "./proxy-control";
import { proxyCopy } from "../../lib/copy/proxies";

const mount = (proxied = false) =>
  render(
    <ProxyControl
      deckId="d1"
      deckName="HD Gods"
      oracleId="o1"
      cardName="The Ozolith"
      proxied={proxied}
    />,
  );

describe("the proxy control", () => {
  beforeEach(() => {
    setCardProxied.mockReset();
    setCardProxied.mockResolvedValue({ ok: true });
  });

  it("names the deck in the label, not just the heading", async () => {
    // A sheet paged through with Prev/Next is easy to lose your place in, so
    // the name belongs in the sentence the reader is about to act on.
    mount();
    expect(screen.getByText(proxyCopy.control.label("HD Gods"))).toBeTruthy();
  });

  it("marks, and says what did NOT happen alongside what did", async () => {
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(setCardProxied).toHaveBeenCalledWith("d1", "o1", true);
    // "Covered" alone is true and incomplete, and the incomplete half is the one
    // a reader turns into a purchase they never made.
    const marked = screen.getByText(proxyCopy.control.marked("HD Gods"));
    expect(marked.textContent).toContain("Nothing is claimed from your collection");
  });

  it("unmarks on a second press", async () => {
    mount(true);
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(setCardProxied).toHaveBeenCalledWith("d1", "o1", false);
  });

  it("states ruling 2 in both states, and offers no confirm", () => {
    mount();
    expect(screen.getByText(proxyCopy.control.note)).toBeTruthy();
    // Immediate: no Apply, no confirm, no undo receipt. The tick is the receipt.
    expect(screen.queryByRole("button", { name: /apply|confirm/i })).toBeNull();
  });

  it("reverts the tick when the server refuses", async () => {
    // Reachable by being slow: the card left the deck between render and tap.
    setCardProxied.mockResolvedValue({ ok: false, message: "That card isn't in this deck any more." });
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("That card isn't in this deck any more.")).toBeTruthy();
  });

  it("reverts when the action throws", async () => {
    setCardProxied.mockRejectedValue(new Error("network"));
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });
});
