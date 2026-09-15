import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const setCardProxied = vi.fn();
vi.mock("../../app/decks/actions", () => ({ setCardProxied: (...a: unknown[]) => setCardProxied(...a) }));

import { ProxyControl } from "./proxy-control";
import { proxyCopy } from "../../lib/copy/proxies";

const onSaved = vi.fn();
const mount = (proxied = false) =>
  render(
    <ProxyControl
      deckId="d1"
      deckName="HD Gods"
      oracleId="o1"
      cardName="The Ozolith"
      proxied={proxied}
      onSaved={onSaved}
    />,
  );

describe("the proxy control", () => {
  beforeEach(() => {
    setCardProxied.mockReset();
    onSaved.mockReset();
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

  it("invalidates the cached card so the receipt stops being stale", async () => {
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(onSaved).toHaveBeenCalled();
  });

  it("does not invalidate when the write was refused", async () => {
    setCardProxied.mockResolvedValue({ ok: false, message: "nope" });
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("ignores a second tap while the first is in flight", async () => {
    // Two writes whose ORDER the network does not promise: the server could
    // finish `true` last while the reader's last press was `false`.
    let release: (v: unknown) => void = () => {};
    setCardProxied.mockImplementation(() => new Promise((r) => { release = r; }));
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(setCardProxied).toHaveBeenCalledTimes(1);
    await act(async () => { release({ ok: true }); });
  });

  it("announces the unmark, not only the mark", async () => {
    // Read off state rather than the transition, the live region announced a
    // change every time an already-proxied card was opened, and said nothing at
    // all on an unmark.
    mount(true);
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(screen.getByText(proxyCopy.control.announceUnmarked("The Ozolith", "HD Gods"))).toBeTruthy();
  });

  it("announces nothing merely for opening a proxied card", () => {
    mount(true);
    expect(screen.queryByText(proxyCopy.control.announceMarked("The Ozolith", "HD Gods"))).toBeNull();
  });
});
