// A version's overview (6e): read when the row opens, drawn only when the version has one, and
// opened read only: the record line, no write control, never stale.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({ fetchVersionSynopsis: vi.fn() }));
vi.mock("../../app/decks/synopsis-actions", () => actions);

import { checkedSynopsis } from "./__fixtures__/synopsis";
import { VersionOverviewLink } from "./synopsis-version";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { synopsisCopy as copy } from "../../lib/copy/synopsis";

const draw = () =>
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <VersionOverviewLink versionId="v-3" />
    </CardDetailProvider>,
  );

// A block body: a returned function is registered as a teardown, and this one is the mock.
beforeEach(() => {
  actions.fetchVersionSynopsis.mockReset();
});

describe("VersionOverviewLink", () => {
  it("draws nothing for a version committed without an overview", async () => {
    actions.fetchVersionSynopsis.mockResolvedValue({ kind: "not_found" });
    const { container } = draw();
    await waitFor(() => expect(actions.fetchVersionSynopsis).toHaveBeenCalledWith("v-3"));
    expect(container.textContent).toBe("");
  });

  it("draws nothing while the read is in flight: no placeholder", () => {
    actions.fetchVersionSynopsis.mockImplementation(() => new Promise(() => {}));
    const { container } = draw();
    expect(container.textContent).toBe("");
  });

  it("draws nothing when the read fails, and raises nothing", async () => {
    actions.fetchVersionSynopsis.mockImplementation(() => Promise.reject(new Error("down")));
    const { container } = draw();
    await waitFor(() => expect(actions.fetchVersionSynopsis).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("opens the version's overview read only, with its record line", async () => {
    actions.fetchVersionSynopsis.mockResolvedValue({
      kind: "ok", versionNumber: 3, committedAt: new Date("2026-09-20T12:00:00Z"), content: checkedSynopsis(), art: {},
    });
    draw();
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(copy.version.entry) }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(copy.version.record(3))).toBeTruthy();
    expect(within(dialog).getAllByText(/version 3 · committed/).length).toBeGreaterThan(0);
    // Read only: no write, no retry, no stale banner.
    for (const label of [copy.writeNew, copy.writeOne, copy.tryAgain, "Re-analyze"]) {
      expect(within(dialog).queryByRole("button", { name: label })).toBeNull();
    }
    expect(within(dialog).queryByText(copy.modal.stale)).toBeNull();
    expect(within(dialog).getAllByRole("button", { name: /Sol Ring/ }).length).toBeGreaterThan(0);
  });
});
