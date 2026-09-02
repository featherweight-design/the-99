import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { recommendationsCopy } from "../../lib/copy/recommendations";

const { keepAutoCard } = vi.hoisted(() => ({
  keepAutoCard: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({
  keepAutoCard,
}));

const { AutoTag } = await import("./auto-tag");

const outstanding: Array<() => void> = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  outstanding.push(() => resolve(undefined as T));
  return { promise, resolve };
}

afterEach(async () => {
  const settle = outstanding.splice(0);
  await act(async () => {
    settle.forEach((r) => r());
  });
  keepAutoCard.mockReset();
});

describe("AutoTag", () => {
  it("at rest reads the auto label", () => {
    render(<AutoTag deckId="d1" oracleId="sol-ring" name="Sol Ring" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveTextContent(recommendationsCopy.auto.tag);
  });

  it("on hover shows the keep label", () => {
    render(<AutoTag deckId="d1" oracleId="sol-ring" name="Sol Ring" />);
    const btn = screen.getByRole("button");
    fireEvent.mouseEnter(btn);
    expect(btn).toHaveTextContent(recommendationsCopy.auto.keep);
  });

  it("on keyboard focus shows the keep label", () => {
    render(<AutoTag deckId="d1" oracleId="sol-ring" name="Sol Ring" />);
    const btn = screen.getByRole("button");
    fireEvent.focus(btn);
    expect(btn).toHaveTextContent(recommendationsCopy.auto.keep);
  });

  it("on hover reverts to auto label when the mouse leaves", () => {
    render(<AutoTag deckId="d1" oracleId="sol-ring" name="Sol Ring" />);
    const btn = screen.getByRole("button");
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);
    expect(btn).toHaveTextContent(recommendationsCopy.auto.tag);
  });

  it("on blur reverts to auto label", () => {
    render(<AutoTag deckId="d1" oracleId="sol-ring" name="Sol Ring" />);
    const btn = screen.getByRole("button");
    fireEvent.focus(btn);
    fireEvent.blur(btn);
    expect(btn).toHaveTextContent(recommendationsCopy.auto.tag);
  });

  it("the accessible name is stable across states", () => {
    render(<AutoTag deckId="d1" oracleId="sol-ring" name="Sol Ring" />);
    const btn = screen.getByRole("button", {
      name: recommendationsCopy.auto.keepAria("Sol Ring"),
    });
    fireEvent.mouseEnter(btn);
    // aria-label should not change
    expect(btn).toHaveAccessibleName(recommendationsCopy.auto.keepAria("Sol Ring"));
  });

  it("activating it calls keepAutoCard once with the deck id and oracle id", async () => {
    keepAutoCard.mockResolvedValue(undefined);
    render(<AutoTag deckId="d1" oracleId="sol-ring" name="Sol Ring" />);

    await act(async () => {
      screen.getByRole("button").click();
    });

    expect(keepAutoCard).toHaveBeenCalledOnce();
    expect(keepAutoCard).toHaveBeenCalledWith("d1", "sol-ring");
  });

  it("while pending the button is aria-busy and does not fire the action again", async () => {
    const pending = deferred<void>();
    keepAutoCard.mockReturnValue(pending.promise);

    render(<AutoTag deckId="d1" oracleId="sol-ring" name="Sol Ring" />);

    await act(async () => {
      screen.getByRole("button").click();
    });

    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-busy", "true");

    // A second click must not fire the action again
    await act(async () => {
      btn.click();
    });
    expect(keepAutoCard).toHaveBeenCalledOnce();
  });

  // The optimistic keep is dropped when the transition reverts, so without a
  // message the tag simply reads "auto" again and the player is left to guess
  // whether the click registered at all.
  it("says so when the keep is refused", async () => {
    keepAutoCard.mockRejectedValue(new Error("nope"));

    render(<AutoTag deckId="d1" oracleId="sol-ring" name="Sol Ring" />);

    await act(async () => {
      screen.getByRole("button").click();
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      recommendationsCopy.auto.keepFailed,
    );
  });

  it("says nothing when the keep is accepted", async () => {
    keepAutoCard.mockResolvedValue(undefined);

    render(<AutoTag deckId="d1" oracleId="sol-ring" name="Sol Ring" />);

    await act(async () => {
      screen.getByRole("button").click();
    });

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
