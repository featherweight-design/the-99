// The in-flight latch is a ref, so nothing re-renders when it sticks — a throw
// on the first click would leave the control silently dead for the rest of the
// page's life, with no error and no pending state to show for it.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDeckMutation } from "./use-deck-mutation";

function Harness({ mutate }: { mutate: () => Promise<void> }) {
  const { error, run } = useDeckMutation(false, "Could not add that card.");
  return (
    <>
      <button onClick={() => run(mutate)}>add</button>
      <span>{error ?? "no error"}</span>
    </>
  );
}

async function click() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "add" }));
  });
}

describe("useDeckMutation", () => {
  it("releases the latch when the action throws synchronously", async () => {
    const mutate = vi.fn(() => {
      throw new Error("boom");
    }) as unknown as () => Promise<void>;

    render(<Harness mutate={mutate} />);
    await click();
    expect(screen.getByText("Could not add that card.")).toBeInTheDocument();

    await click();
    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it("releases the latch when the action rejects", async () => {
    const mutate = vi.fn().mockRejectedValue(new Error("boom"));

    render(<Harness mutate={mutate} />);
    await click();
    await click();
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
