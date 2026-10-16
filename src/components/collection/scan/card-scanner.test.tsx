import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { collectionEditCopy } from "../../../lib/copy/collection-edit";

// The models never load here: the scanner is composed with a camera that refuses.
vi.mock("./frame-reader", () => ({ useFrameReader: () => async () => ({ frame: { kind: "none" }, cardInView: false, dark: false }) }));

const { CardScanner } = await import("./card-scanner");

describe("CardScanner", () => {
  it("keeps focus inside the scanner when the camera is refused and the blocked screen replaces the feed", async () => {
    let refuse: ((e: Error) => void) | null = null;
    render(
      <CardScanner
        layout="phone"
        listed={new Map()}
        deps={{ getUserMedia: () => new Promise<MediaStream>((_, r) => (refuse = r)), storage: null }}
        onAdd={vi.fn(async () => true)}
        onClose={vi.fn()}
        onNoneOfThese={vi.fn()}
      />,
    );
    const first = document.activeElement;
    expect(first?.hasAttribute("data-scan-close")).toBe(true);
    await waitFor(() => expect(refuse).not.toBeNull());
    refuse!(new Error("NotAllowedError"));
    await screen.findByText(collectionEditCopy.scan.camera.blockedTitle);
    await waitFor(() => {
      expect(document.activeElement).not.toBe(first);
      expect(document.activeElement?.hasAttribute("data-scan-close")).toBe(true);
    });
  });
});
