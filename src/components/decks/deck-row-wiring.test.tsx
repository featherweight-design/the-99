import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeckDescriptionField } from "./deck-description-field";
import { DeckRowWiringProvider, INERT_ROW_WIRING, reportMissingWiring } from "./deck-row-wiring";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const field = <DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />;

describe("a deck control with no wiring", () => {
  it("throws on a press under test, so a test that forgot the provider fails", () => {
    expect(() => reportMissingWiring("Anything", true)).toThrow(/needs a DeckRowWiringProvider/);
  });

  it("says so once in the console when it is only drawn", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    reportMissingWiring("Drawn control");
    reportMissingWiring("Drawn control");
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toMatch(/Drawn control needs a DeckRowWiringProvider/);
  });

  it("is reported by the description box when no provider is mounted", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(field);
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/DeckDescriptionField needs a DeckRowWiringProvider/));
  });
});

describe("INERT_ROW_WIRING", () => {
  it("draws the description box with no error, and every member does nothing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DeckRowWiringProvider value={INERT_ROW_WIRING}>{field}</DeckRowWiringProvider>);
    expect(screen.getByText("0 / 240")).toBeInTheDocument();
    expect(error).not.toHaveBeenCalled();
    await expect(INERT_ROW_WIRING.removeCard("d", "o")).resolves.toBeUndefined();
    await expect(INERT_ROW_WIRING.setBasicQuantity("d", "o", 3)).resolves.toEqual({ ok: false, reason: "not-in-deck" });
    await expect(INERT_ROW_WIRING.addCard("d", "o")).resolves.toEqual({ ok: false, message: "" });
    await expect(INERT_ROW_WIRING.pullCard("s", "o", "d")).resolves.toEqual({ ok: false, message: "" });
    await expect(INERT_ROW_WIRING.searchDescriptionCards("sol")).resolves.toBeNull();
    await expect(INERT_ROW_WIRING.searchTuningNotesCards("sol")).resolves.toBeNull();
  });
});
