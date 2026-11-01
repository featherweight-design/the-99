// Small items 9, A6b: a card the player owns none of has no Remove to offer, so the button is not drawn (it used to be
// drawn disabled). An owned card still offers it.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectionEditCopy } from "../../lib/copy/collection-edit";

const load = vi.fn();
vi.mock("../../app/collection/edit-actions", () => ({ loadEditSheet: (id: string) => load(id), editCollection: vi.fn() }));

const { EditCopiesSheet } = await import("./edit-copies-sheet");
const card = { oracleId: "ghalta", name: "Ghalta, Primal Hunger", imageUri: null };
const choice = { setCode: "rix", collectorNumber: "130", name: "Ghalta", finishes: ["nonfoil"] };
const label = collectionEditCopy.remove.action;

afterEach(cleanup);

describe("EditCopiesSheet Remove", () => {
  it("is not rendered when no copy is owned", async () => {
    load.mockResolvedValue({ choices: [choice], holdings: [] });
    render(<EditCopiesSheet card={card} onClose={() => {}} />);
    // The footer draws once the read lands; its Save is there, its Remove is not.
    await screen.findByText(collectionEditCopy.copies.save);
    expect(screen.queryByText(label)).toBeNull();
  });

  it("is rendered and enabled when a copy is owned", async () => {
    load.mockResolvedValue({ choices: [choice], holdings: [{ setCode: "rix", collectorNumber: "130", finish: "nonfoil", quantity: 1, condition: null }] });
    render(<EditCopiesSheet card={card} onClose={() => {}} />);
    const btn = await screen.findByText(label);
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });
});
