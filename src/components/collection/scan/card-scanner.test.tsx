import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("takes focus as it opens, even from a press still on the page", async () => {
    const scan = document.createElement("button");
    document.body.append(scan);
    scan.focus();
    render(<CardScanner layout="desk" listed={new Map()} deps={{ getUserMedia: () => new Promise<MediaStream>(() => {}), storage: null }} onAdd={vi.fn(async () => true)} onClose={vi.fn()} onNoneOfThese={vi.fn()} />);
    expect(document.activeElement?.hasAttribute("data-scan-close")).toBe(true);
    scan.remove();
  });

  it("leaves focus alone once it went outside the scanner, even onto nothing focusable", () => {
    const deps = { getUserMedia: () => new Promise<MediaStream>(() => {}), storage: null };
    // A new list each time, as the sheet passes one, so the scanner renders again.
    const el = () => <CardScanner layout="desk" listed={new Map()} deps={deps} onAdd={vi.fn(async () => true)} onClose={vi.fn()} onNoneOfThese={vi.fn()} />;
    const { rerender } = render(el());
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    // A press on the sheet's plain text: focus leaves the button and lands on nothing.
    outside.blur();
    rerender(el());
    expect(document.activeElement).toBe(document.body);
    outside.remove();
  });

  it("gives focus back to the scanner when a keyboard Add takes away the press that held it", async () => {
    const embedding = new Float32Array(256);
    embedding[0] = 1;
    const SOL = { oracleId: "11111111-1111-4111-8111-111111111111", name: "Sol Ring", scryfallId: "s1", typeLine: "Artifact", imageUri: null, score: 0.97 };
    let t = 0;
    const stream = { getTracks: () => [], getVideoTracks: () => [] } as unknown as MediaStream;
    render(
      <CardScanner
        layout="phone"
        listed={new Map()}
        deps={{
          getUserMedia: async () => stream,
          readFrame: async () => {
            await new Promise((r) => setTimeout(r, 5));
            return { frame: { kind: "card", embedding }, cardInView: true, dark: false };
          },
          fetch: (async () => new Response(JSON.stringify({ index: "all", guesses: [SOL], margin: null }), { status: 200, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch,
          wait: async () => {},
          now: () => (t += 200),
          storage: null,
        }}
        onAdd={vi.fn(async () => true)}
        onClose={vi.fn()}
        onNoneOfThese={vi.fn()}
      />,
    );
    const add = await screen.findByRole("button", { name: collectionEditCopy.scan.view.add }, { timeout: 4000 });
    add.focus();
    fireEvent.keyDown(add, { key: "Enter" });
    await screen.findByText(collectionEditCopy.scan.view.added("Sol Ring"));
    await waitFor(() => expect(document.activeElement?.hasAttribute("data-scan-close")).toBe(true));
  });
});

