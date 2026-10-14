import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const mirror = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/url/mirror", () => ({ mirrorUrl: mirror }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("../../shell/pending-reporter", () => ({ PendingReporter: () => null }));
let reverted: () => void = () => {};
vi.mock("../../collection/revert-confirm", () => ({
  RevertConfirm: (p: { entryId: string; title: string; onReverted: () => void }) => {
    reverted = p.onReverted;
    return <div data-testid="revert" data-entry={p.entryId}>{p.title}</div>;
  },
}));
import { PreconAddedReceipt } from "./precon-added-receipt";

const ID = "7d0a1c1e-4d1a-4b9a-8d3c-2f7a5a9e1b11";
const receipt = { entryId: ID, name: "Multiverse Reforged", cards: 99, copies: 100, foil: 2, tokens: { marked: 9, names: ["Soldier"] } };

beforeEach(() => { mirror.mockReset(); refresh.mockReset(); window.history.replaceState(null, "", `/decks/d1?from=precon&added=${ID}`); });

describe("PreconAddedReceipt", () => {
  it("draws the add's counts, foil and tokens, and a History link to its entry", () => {
    render(<PreconAddedReceipt receipt={receipt} />);
    expect(screen.getByText("100 copies added")).toBeInTheDocument();
    expect(screen.getByText("99 cards are in your collection now.")).toBeInTheDocument();
    expect(screen.getByText("2 of them foil")).toBeInTheDocument();
    expect(screen.getByText("9 tokens marked owned")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See it in History" })).toHaveAttribute("href", `/collection/history?entry=${ID}`);
  });

  it("leaves the foil and tokens lines out when there are none", () => {
    render(<PreconAddedReceipt receipt={{ ...receipt, foil: 0, tokens: { marked: 0, names: [] } }} />);
    expect(screen.queryByText(/of them foil/)).toBeNull();
    expect(screen.queryByText(/marked owned/)).toBeNull();
  });

  it("says one token in the singular", () => {
    render(<PreconAddedReceipt receipt={{ ...receipt, tokens: { marked: 1, names: ["Monarch"] } }} />);
    expect(screen.getByText("1 token marked owned")).toBeInTheDocument();
  });

  it("takes ?added= off the address on first draw and keeps the rest", () => {
    render(<PreconAddedReceipt receipt={receipt} stripParam />);
    expect(mirror).toHaveBeenCalledTimes(1);
    const url = mirror.mock.calls[0][0] as URL;
    expect(url.pathname).toBe("/decks/d1");
    expect(url.searchParams.get("from")).toBe("precon");
    expect(url.searchParams.has("added")).toBe(false);
  });

  it("leaves the address alone when not asked to strip it (the dialog's fallback)", () => {
    render(<PreconAddedReceipt receipt={receipt} />);
    expect(mirror).not.toHaveBeenCalled();
  });

  it("goes away with the ✕", () => {
    const onClose = vi.fn();
    render(<PreconAddedReceipt receipt={receipt} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss the receipt" }));
    expect(screen.queryByText("100 copies added")).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the existing revert for the entry on Undo, and goes away once it is undone", () => {
    render(<PreconAddedReceipt receipt={receipt} />);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByTestId("revert")).toHaveAttribute("data-entry", ID);
    expect(screen.getByTestId("revert")).toHaveTextContent("Added from Multiverse Reforged");
    act(() => reverted());
    expect(screen.queryByText("100 copies added")).toBeNull();
    expect(refresh).toHaveBeenCalled();
  });

  it("puts a note above the receipt when given one", () => {
    render(<PreconAddedReceipt receipt={receipt} note="The cards are in your collection, but we couldn’t start the deck." />);
    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t start the deck");
  });
});
