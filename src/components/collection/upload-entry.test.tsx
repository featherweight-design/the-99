import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const previewUpload = vi.fn();
vi.mock("../../app/collection/actions", () => ({
  previewUpload: (...args: unknown[]) => previewUpload(...args),
  previewPaste: vi.fn(),
}));

import { UploadEntry } from "./upload-entry";
import { COLLECTION_FILE_MAX_BYTES } from "../../lib/upload-limits";

// A File reporting a size without allocating it.
function fileOfSize(bytes: number): File {
  const f = new File(["Name,Quantity\nSol Ring,1\n"], "collection.csv", { type: "text/csv" });
  Object.defineProperty(f, "size", { value: bytes });
  return f;
}

function choose(file: File) {
  const input = screen.getByLabelText("Upload collection CSV") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("UploadEntry file size", () => {
  beforeEach(() => {
    previewUpload.mockReset();
    previewUpload.mockResolvedValue({});
  });

  // The server's own check never runs for an oversized body: Next refuses it first,
  // and the reader saw only a minified React error. This guard is what they see.
  it("refuses a file over the cap in the browser, without calling the action", () => {
    render(<UploadEntry currentCardCount={0} onPreview={() => {}} />);
    choose(fileOfSize(COLLECTION_FILE_MAX_BYTES + 1));
    expect(previewUpload).not.toHaveBeenCalled();
    expect(screen.getByText("That file is too large (max 4 MB)")).toBeTruthy();
  });

  it("sends a file exactly at the cap", async () => {
    render(<UploadEntry currentCardCount={0} onPreview={() => {}} />);
    choose(fileOfSize(COLLECTION_FILE_MAX_BYTES));
    // The header is peeked first (landing PR 7b), so the send follows a read.
    await waitFor(() => expect(previewUpload).toHaveBeenCalledTimes(1));
  });
});

// Landing PR 7b: a file whose first row names no Name or no Quantity column gets its own error, never reaches the server,
// and its link opens the export guides.
describe("UploadEntry · a file with no Name or Quantity column", () => {
  beforeEach(() => {
    previewUpload.mockReset();
    previewUpload.mockResolvedValue({});
  });
  const csv = (text: string) => new File([text], "cards.csv", { type: "text/csv" });

  it("says which column is missing, sends nothing, and opens the guides from its link", async () => {
    render(<UploadEntry currentCardCount={0} onPreview={() => {}} entry="buttons" />);
    choose(csv("Title,Amount\nSol Ring,1\n"));
    expect(await screen.findByText("This file has no Name column")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("The 99 needs a Name and a Quantity column in the first row.");
    expect(previewUpload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "How to export" }));
    expect(screen.getByRole("dialog", { name: "How to export your collection" })).toBeTruthy();
  });

  it("names Quantity when only the quantity is missing", async () => {
    render(<UploadEntry currentCardCount={0} onPreview={() => {}} entry="buttons" />);
    choose(csv("Name,Set\nSol Ring,cmd\n"));
    expect(await screen.findByText("This file has no Quantity column")).toBeTruthy();
  });

  it("hides the always-on guides line while the error, which carries its own link, is shown", async () => {
    render(<UploadEntry currentCardCount={0} onPreview={() => {}} entry="buttons" />);
    choose(csv("Name,Amount\nSol Ring,1\n"));
    await screen.findByText("This file has no Quantity column");
    expect(screen.queryByText(/Coming from ManaBox/)).toBeNull();
  });

  it("says a UTF-16 file is not a UTF-8 CSV, with no claim that a column is missing", async () => {
    render(<UploadEntry currentCardCount={0} onPreview={() => {}} entry="buttons" />);
    choose(csv("N\u0000a\u0000m\u0000e\u0000,\u0000Q\u0000\n\u0000"));
    expect(await screen.findByText("This file isn’t a UTF-8 CSV. Export it as CSV (UTF-8), or paste the list instead.")).toBeTruthy();
    expect(screen.queryByText(/has no .* column/)).toBeNull();
    expect(previewUpload).not.toHaveBeenCalled();
  });

  it("keeps the shipped words for a failure on the server", async () => {
    previewUpload.mockRejectedValueOnce(new Error("We couldn’t read this file."));
    render(<UploadEntry currentCardCount={0} onPreview={() => {}} entry="buttons" />);
    choose(csv("Name,Quantity\nSol Ring,1\n"));
    expect(await screen.findByText("We couldn’t read this file.")).toBeTruthy();
    expect(screen.queryByText(/has no .* column/)).toBeNull();
  });

  it("offers the guides from the first run's buttons entry, and not on the replace page's drop zone", () => {
    const { unmount } = render(<UploadEntry currentCardCount={0} onPreview={() => {}} entry="buttons" />);
    expect(screen.getByText(/Coming from ManaBox, Moxfield, Archidekt or Deckbox\?/)).toBeTruthy();
    unmount();
    render(<UploadEntry currentCardCount={0} onPreview={() => {}} />);
    expect(screen.queryByText(/Coming from ManaBox/)).toBeNull();
  });
});

describe("UploadEntry note over an existing collection", () => {
  it("says the file replaces the collection when it can only replace", () => {
    render(<UploadEntry currentCardCount={12} onPreview={() => {}} />);
    expect(screen.getByText(/nothing is merged/)).toBeTruthy();
  });

  it("stops saying nothing is merged once the file can be added instead", () => {
    render(<UploadEntry currentCardCount={12} onPreview={() => {}} choice />);
    expect(screen.queryByText(/nothing is merged/)).toBeNull();
    expect(screen.getByText(/can replace your current/)).toBeTruthy();
  });
});
