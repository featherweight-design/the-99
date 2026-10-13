import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const dismissAbout = vi.fn(async (_form: FormData) => "/commanders");
vi.mock("../../app/about/actions", () => ({ dismissAbout }));
const go = vi.fn();
vi.mock("../shell/pending-push", () => ({ usePendingPush: () => ({ go }) }));

const { DismissForm } = await import("./dismiss-form");

describe("DismissForm", () => {
  it("records the dismiss, then navigates to the destination the action returns, as a reported push", async () => {
    render(
      <DismissForm destination="/commanders?a=free" shown={["notes", "how-it-works"]}>
        <button type="submit">Got it</button>
      </DismissForm>,
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Got it" })));
    const form = dismissAbout.mock.calls[0]?.[0] as FormData;
    expect(form.get("next")).toBe("/commanders?a=free");
    // The entries the page showed, which the dismiss acknowledges and no others.
    expect(form.getAll("shown")).toEqual(["notes", "how-it-works"]);
    // The server's validated answer, never the page's own copy of the field.
    expect(go).toHaveBeenCalledWith("/commanders");
  });
});
