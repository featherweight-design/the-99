// The signature card picker (avatar handoff 20, P1 to P8): any card, the printings screen for a card with more than
// one, a save that keeps the picker open until it lands, and the one place a pick that is gone is told.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const a = vi.hoisted(() => ({ listDeckFacesAction: vi.fn(), searchFaceCardsAction: vi.fn(), listFacePrintingsAction: vi.fn() }));
vi.mock("../../app/friends/actions", () => a);

import { SignaturePicker } from "./signature-picker";
import { socialCopy } from "../../lib/copy/social";
import { printingPickerCopy } from "../../lib/copy/collection";

const s = socialCopy.signature;
const TUTOR = "11111111-1111-4111-8111-111111111111";
const BOLT = "22222222-2222-4222-8222-222222222222";
const hit = (oracleId: string, name: string, printings: number, typeLine = "Instant") => ({
  oracleId, name, typeLine, artCropUri: `https://x/${name}.jpg`, colorIdentity: [], printings,
});
const TUTOR_HIT = hit(TUTOR, "Mystical Tutor", 3);
const BOLT_HIT = hit(BOLT, "Lightning Bolt", 1);
const printing = (id: string, setName: string, setCode: string) => ({
  scryfallId: id, setCode, setName, collectorNumber: "1", imageUri: `https://x/${setCode}.jpg`, artCropUri: `https://x/${setCode}-crop.jpg`,
});
const P_STA = "aaaaaaaa-0000-4000-8000-000000000001";
const P_EMA = "aaaaaaaa-0000-4000-8000-000000000002";
const P_MIR = "aaaaaaaa-0000-4000-8000-000000000003";
const TUTOR_PRINTINGS = {
  oracleId: TUTOR, name: "Mystical Tutor",
  usual: { imageUri: "https://x/usual.jpg", artCropUri: "https://x/usual-crop.jpg", setCode: "STA" },
  printings: [printing(P_STA, "Strixhaven Mystical Archive", "STA"), printing(P_EMA, "Eternal Masters", "EMA"), printing(P_MIR, "Mirage", "MIR")],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  a.listDeckFacesAction.mockResolvedValue({ ok: true, tiles: [] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function type(value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: s.search }), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

describe("SignaturePicker", () => {
  it("names the face a signature card and searches any card, its type line under the name", async () => {
    a.searchFaceCardsAction.mockResolvedValue({ ok: true, hits: [BOLT_HIT, TUTOR_HIT] });
    render(<SignaturePicker current={null} onSave={async () => true} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: s.title })).toBeTruthy();
    await type("tu");
    expect(a.searchFaceCardsAction).toHaveBeenCalledWith("tu");
    const list = screen.getByRole("listbox", { name: s.search });
    expect(within(list).getAllByText("Instant")).toHaveLength(2);
    // A card with more than one printing trails its count; one with one printing trails nothing.
    expect(within(list).getByText(s.printings(3))).toBeTruthy();
    expect(within(list).queryByText(s.printings(1))).toBeNull();
  });

  it("saves a one-printing card on press with the usual art, holding the picker open until it lands", async () => {
    a.searchFaceCardsAction.mockResolvedValue({ ok: true, hits: [BOLT_HIT, TUTOR_HIT] });
    let land!: (ok: boolean) => void;
    const onSave = vi.fn(() => new Promise<boolean>((r) => (land = r)));
    render(<SignaturePicker current={null} onSave={onSave} onClose={() => {}} />);
    await type("bo");
    fireEvent.click(screen.getByText("Lightning Bolt"));
    expect(onSave).toHaveBeenCalledWith({ oracleId: BOLT, printingId: null, face: expect.objectContaining({ oracleId: BOLT, printingId: null }) });
    // P4: the row says Saving, and every row is held until the write answers.
    expect(screen.getByText(s.saving)).toBeTruthy();
    expect(screen.getByRole("listbox").getAttribute("aria-busy")).toBe("true");
    for (const b of within(screen.getByRole("listbox")).getAllByRole("button")) expect(b).toBeDisabled();
    // A failure gives the rows back; the caller toasts.
    await act(async () => land(false));
    expect(screen.queryByText(s.saving)).toBeNull();
    for (const b of within(screen.getByRole("listbox")).getAllByRole("button")) expect(b).not.toBeDisabled();
  });

  it("opens a card with several printings on its own screen, the usual art first, and saves the printing pressed", async () => {
    a.searchFaceCardsAction.mockResolvedValue({ ok: true, hits: [TUTOR_HIT] });
    a.listFacePrintingsAction.mockResolvedValue({ ok: true, card: TUTOR_PRINTINGS });
    const onSave = vi.fn(async () => true);
    render(<SignaturePicker current={null} onSave={onSave} onClose={() => {}} />);
    await type("tutor");
    fireEvent.click(screen.getByRole("button", { name: s.printingsAria("Mystical Tutor", 3) }));
    expect(onSave).not.toHaveBeenCalled();
    expect(a.listFacePrintingsAction).toHaveBeenCalledWith(TUTOR);
    expect(await screen.findByRole("dialog", { name: "Mystical Tutor" })).toBeTruthy();
    await act(async () => {});
    expect(screen.getByText(s.printingsSub(3))).toBeTruthy();
    const tiles = [...document.querySelectorAll("[data-face-printing]")].map((e) => e.getAttribute("data-face-printing"));
    expect(tiles).toEqual(["usual", P_STA, P_EMA, P_MIR]);
    // Three printings and the usual art: no set search under twelve tiles.
    expect(screen.queryByLabelText(s.setSearch)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: s.tileAria("Eternal Masters EMA", false) }));
    expect(onSave).toHaveBeenCalledWith({ oracleId: TUTOR, printingId: P_EMA, face: expect.objectContaining({ artCropUri: "https://x/EMA-crop.jpg" }) });
    await act(async () => {});
  });

  it("goes back to the search with the query standing", async () => {
    a.searchFaceCardsAction.mockResolvedValue({ ok: true, hits: [TUTOR_HIT] });
    a.listFacePrintingsAction.mockResolvedValue({ ok: true, card: TUTOR_PRINTINGS });
    render(<SignaturePicker current={null} onSave={async () => true} onClose={() => {}} />);
    await type("tutor");
    fireEvent.click(screen.getByRole("button", { name: s.printingsAria("Mystical Tutor", 3) }));
    await screen.findByRole("dialog", { name: "Mystical Tutor" });
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: s.back }));
    expect(screen.getByRole("combobox", { name: s.search })).toHaveValue("tutor");
    expect(screen.getByText("Mystical Tutor")).toBeTruthy();
  });

  it("marks the current pick, and tells a pick that is gone only on that card's screen (P8)", async () => {
    a.searchFaceCardsAction.mockResolvedValue({ ok: true, hits: [TUTOR_HIT] });
    a.listFacePrintingsAction.mockResolvedValue({ ok: true, card: TUTOR_PRINTINGS });
    const gone = { oracleId: TUTOR, name: "Mystical Tutor", artCropUri: "https://x/usual-crop.jpg", printingId: P_STA, printingGone: true };
    render(<SignaturePicker current={gone} onSave={async () => true} onClose={() => {}} />);
    expect(screen.queryByText(s.gone)).toBeNull();
    await type("tutor");
    fireEvent.click(screen.getByRole("button", { name: s.printingsAria("Mystical Tutor", 3) }));
    await screen.findByRole("dialog", { name: "Mystical Tutor" });
    await act(async () => {});
    expect(screen.getByText(s.gone)).toBeTruthy();
    // Friends see the usual art, so that tile reads Shown now and is the one pressed.
    const usual = screen.getByRole("button", { name: s.tileAria(s.usualArt, true) });
    expect(usual.getAttribute("aria-pressed")).toBe("true");
    expect(within(usual).getByText(printingPickerCopy.printing.badgeShownNow)).toBeTruthy();
    expect(screen.getByText(s.previewNow)).toBeTruthy();
    // The preview names where the usual art comes from.
    expect(screen.getByText(s.previewLine(s.usualArt, "STA"))).toBeTruthy();
  });

  it("offers the set search over twelve tiles, matching a set's name, code or number", async () => {
    const many = Array.from({ length: 12 }, (_, i) => printing(`bbbbbbbb-0000-4000-8000-${String(i).padStart(12, "0")}`, `Set ${i}`, `S${i}`));
    a.searchFaceCardsAction.mockResolvedValue({ ok: true, hits: [hit(TUTOR, "Mystical Tutor", 12)] });
    a.listFacePrintingsAction.mockResolvedValue({ ok: true, card: { ...TUTOR_PRINTINGS, printings: many } });
    render(<SignaturePicker current={null} onSave={async () => true} onClose={() => {}} />);
    await type("tutor");
    fireEvent.click(screen.getByRole("button", { name: s.printingsAria("Mystical Tutor", 12) }));
    await screen.findByRole("dialog", { name: "Mystical Tutor" });
    await act(async () => {});
    fireEvent.change(screen.getByLabelText(s.setSearch), { target: { value: "s11" } });
    const tiles = [...document.querySelectorAll("[data-face-printing]")].map((e) => e.getAttribute("data-face-printing"));
    expect(tiles).toEqual(["usual", many[11].scryfallId]);
  });

  it("saves a deck tile in the printing its deck holds", async () => {
    a.listDeckFacesAction.mockResolvedValue({
      ok: true, tiles: [{ oracleId: TUTOR, name: "Mystical Tutor", artCropUri: "https://x/STA-crop.jpg", colorIdentity: ["U"], printingId: P_STA }],
    });
    const onSave = vi.fn(async () => true);
    render(<SignaturePicker current={null} onSave={onSave} onClose={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Mystical Tutor" }));
    expect(onSave).toHaveBeenCalledWith({ oracleId: TUTOR, printingId: P_STA, face: expect.objectContaining({ printingId: P_STA }) });
    await act(async () => {});
  });
});
