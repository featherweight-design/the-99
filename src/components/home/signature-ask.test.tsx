// Asking for a signature card once (avatar handoff 20, calls 4 and 5): the first-run row's two states and Skip, and the
// Home strip's ✕. Each press reaches its action; the picker it opens is `signature-picker.test.tsx`'s.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const a = vi.hoisted(() => ({
  setSignatureCardAction: vi.fn(),
  skipFacePromptAction: vi.fn(),
  listDeckFacesAction: vi.fn(),
  searchFaceCardsAction: vi.fn(),
  listFacePrintingsAction: vi.fn(),
}));
vi.mock("../../app/friends/actions", () => a);

import { SignatureRow, SignatureStrip } from "./signature-ask";
import { socialCopy } from "../../lib/copy/social";

const s = socialCopy.signature;
const FACE = { oracleId: "o-poly", name: "Polyraptor", artCropUri: "https://x/poly.jpg", printingId: null, printingGone: false };

beforeEach(() => {
  vi.resetAllMocks();
  a.listDeckFacesAction.mockResolvedValue({ ok: true, tiles: [] });
  a.skipFacePromptAction.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe("SignatureRow", () => {
  it("asks with no face, and its press opens the picker over Home", async () => {
    render(<SignatureRow face={null} name="Sam" />);
    expect(document.querySelector("[data-signature-row]")?.getAttribute("data-signature-row")).toBe("todo");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${s.choose}`) }));
    expect(await screen.findByRole("dialog", { name: s.title })).toBeTruthy();
  });

  it("Skip takes the row away and stops asking", async () => {
    render(<SignatureRow face={null} name="Sam" />);
    fireEvent.click(screen.getByRole("button", { name: s.skipAria }));
    expect(document.querySelector("[data-signature-row]")).toBeNull();
    await act(async () => {});
    expect(a.skipFacePromptAction).toHaveBeenCalledTimes(1);
  });

  it("is done once picked, names the card, and reopens the picker", async () => {
    render(<SignatureRow face={FACE} name="Sam" />);
    expect(document.querySelector("[data-signature-row]")?.getAttribute("data-signature-row")).toBe("done");
    expect(screen.queryByRole("button", { name: s.skipAria })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: s.doneAria("Polyraptor") }));
    expect(await screen.findByRole("dialog", { name: s.title })).toBeTruthy();
    // With a face, the picker would offer to clear it; Home opens it to ask for a card, so it does not (call 6).
    expect(screen.queryByRole("button", { name: socialCopy.commander.clear })).toBeNull();
  });
});

describe("SignatureStrip", () => {
  it("asks once: its link opens the picker, its ✕ stops asking", async () => {
    render(<SignatureStrip name="Sam Adams" />);
    expect(screen.getByRole("region", { name: s.stripRegion })).toBeTruthy();
    expect(screen.getByText("SA")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: s.choose }));
    expect(await screen.findByRole("dialog", { name: s.title })).toBeTruthy();
  });

  it("✕ hides it at once and writes the flag", async () => {
    render(<SignatureStrip name={null} />);
    fireEvent.click(screen.getByRole("button", { name: s.stripDismiss }));
    expect(screen.queryByRole("region", { name: s.stripRegion })).toBeNull();
    await act(async () => {});
    expect(a.skipFacePromptAction).toHaveBeenCalledTimes(1);
  });
});
