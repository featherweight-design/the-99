import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

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

  it("sends a file exactly at the cap", () => {
    render(<UploadEntry currentCardCount={0} onPreview={() => {}} />);
    choose(fileOfSize(COLLECTION_FILE_MAX_BYTES));
    expect(previewUpload).toHaveBeenCalledTimes(1);
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
