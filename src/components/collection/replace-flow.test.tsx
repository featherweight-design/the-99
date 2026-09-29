import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadPreview } from "../../app/collection/actions";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const confirmUpload = vi.fn();
const previewPaste = vi.fn();
vi.mock("../../app/collection/actions", () => ({
  confirmUpload: (...args: unknown[]) => confirmUpload(...args),
  previewPaste: (...args: unknown[]) => previewPaste(...args),
  previewUpload: vi.fn(),
}));

const { ReplaceFlow } = await import("./replace-flow");

function preview(currentCollectionCount: number): UploadPreview {
  return {
    uploadId: "up_1",
    matchedCardCount: 3,
    unmatchedRows: [],
    skippedByDesignCount: 0,
    parseErrors: [],
    currentCollectionCount,
    filename: "pasted list",
    rowCount: 3,
  };
}

// Through the real entry and review screen, so "Continue" is the button a player presses.
async function reachReview(currentCollectionCount: number) {
  previewPaste.mockResolvedValueOnce(preview(currentCollectionCount));
  render(<ReplaceFlow currentCardCount={currentCollectionCount} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
  fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), {
    target: { value: "3 Sol Ring" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
  return screen.findByRole("button", { name: /^Continue to (import|replace)/ });
}

describe("ReplaceFlow — the first import (prod walk 2026-09-28, item 5a)", () => {
  beforeEach(() => {
    push.mockReset();
    confirmUpload.mockReset();
    previewPaste.mockReset();
  });

  it("confirms a first import straight from Continue, with no modal", async () => {
    confirmUpload.mockResolvedValueOnce(undefined);
    const cont = await reachReview(0);
    await act(async () => fireEvent.click(cont));
    expect(confirmUpload).toHaveBeenCalledWith("up_1", { firstImport: true });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(push).toHaveBeenCalledWith("/collection/replace/summary/up_1");
  });

  it("holds Continue at Importing… while a first import runs, since no modal carries the wait", async () => {
    // Wired end to end through the flow, not only rendered by ReviewScreen: the prop is only
    // worth anything if the mount site passes it.
    let settle: (v: undefined) => void = () => {};
    confirmUpload.mockReturnValueOnce(new Promise((resolve) => (settle = resolve)));
    const cont = await reachReview(0);
    await act(async () => fireEvent.click(cont));
    const held = screen.getByRole("button", { name: "Importing…" });
    expect(held).toBeDisabled();
    // Nothing leaves the review mid-write, at either width: the write would land anyway.
    for (const name of ["Cancel"]) {
      const control = screen.getByRole("button", { name });
      expect(control).toBeDisabled();
      fireEvent.click(control);
    }
    expect(screen.getByRole("button", { name: "Importing…" })).toBeInTheDocument();
    await act(async () => settle(undefined));
    expect(push).toHaveBeenCalledWith("/collection/replace/summary/up_1");
  });

  it("keeps the confirm for a replace, and writes nothing until it is answered", async () => {
    const cont = await reachReview(2_933);
    fireEvent.click(cont);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(confirmUpload).not.toHaveBeenCalled();
  });

  it("falls back to the modal when the server finds a collection after all", async () => {
    confirmUpload.mockResolvedValueOnce({ needsConfirm: true, currentCollectionCount: 2_933 });
    const cont = await reachReview(0);
    await act(async () => fireEvent.click(cont));
    const dialog = await screen.findByRole("dialog");
    expect(push).not.toHaveBeenCalled();
    // The REPLACE variant, sized by what the server found: the preview drawn at 0 would have
    // asked for IMPORT over a write that deletes a collection.
    expect(dialog).toHaveTextContent("2,933");
    expect(dialog).toHaveTextContent("Replace your collection?");

    // Answering the modal is a real confirm: it no longer claims to be a first import.
    confirmUpload.mockResolvedValueOnce(undefined);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Replace with 3 cards" })));
    await waitFor(() => expect(confirmUpload).toHaveBeenLastCalledWith("up_1", { firstImport: false }));
  });

  it("reports a failed first import in the modal's error slot rather than nowhere", async () => {
    confirmUpload.mockRejectedValueOnce(new Error("Upload has no matched cards"));
    const cont = await reachReview(0);
    await act(async () => fireEvent.click(cont));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Upload has no matched cards");

    // A retry from that modal is still a first import, so it keeps the server's guard: a
    // collection another tab imported while the error was up must not be replaced unasked.
    confirmUpload.mockResolvedValueOnce(undefined);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Import 3 cards" })));
    await waitFor(() => expect(confirmUpload).toHaveBeenLastCalledWith("up_1", { firstImport: true }));
  });
});
