import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeltaStrip } from "./delta-strip";

const refresh = vi.fn();
const ownedFingerprintForSet = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("../../app/collection/(list)/sets/actions", () => ({
  ownedFingerprintForSet: (code: string) => ownedFingerprintForSet(code),
}));

beforeEach(() => {
  refresh.mockClear();
  ownedFingerprintForSet.mockReset();
});

const focus = () => fireEvent(window, new Event("focus"));

describe("DeltaStrip", () => {
  it("renders nothing until a check has run", () => {
    ownedFingerprintForSet.mockResolvedValue("a,b|");
    const { container } = render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays absent when the count has not moved", async () => {
    ownedFingerprintForSet.mockResolvedValue("a,b|");
    const { container } = render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    focus();
    await waitFor(() => expect(ownedFingerprintForSet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("names the delta for this set once an upload has landed", async () => {
    ownedFingerprintForSet.mockResolvedValue("a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s|");
    render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    focus();
    await waitFor(() => expect(
      screen.getByText(/17 more cards from this set are in your collection now/),
    ).toBeInTheDocument());
  });

  it("uses the singular for one card", async () => {
    ownedFingerprintForSet.mockResolvedValue("a,b,c|");
    render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    focus();
    await waitFor(() => expect(
      screen.getByText(/1 more card from this set is in your collection now/),
    ).toBeInTheDocument());
  });

  it("announces itself, since it appears without the reader doing anything", async () => {
    ownedFingerprintForSet.mockResolvedValue("a,b,c|");
    render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    focus();
    const status = await screen.findByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("offers refresh as an act rather than relighting the grid itself", async () => {
    ownedFingerprintForSet.mockResolvedValue("a,b,c|");
    render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    focus();
    const button = await screen.findByRole("button", { name: "Refresh the grid" });
    fireEvent.click(button);
    expect(refresh).toHaveBeenCalled();
  });

  it("is not dismissible — it leaves when the grid is right, not when it is waved away", async () => {
    ownedFingerprintForSet.mockResolvedValue("a,b,c|");
    render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    focus();
    await screen.findByRole("status");
    expect(screen.queryByRole("button", { name: /dismiss|close/i })).toBeNull();
  });

  it("leaves the page alone when the check fails", async () => {
    ownedFingerprintForSet.mockRejectedValue(new Error("offline"));
    const { container } = render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    focus();
    await waitFor(() => expect(ownedFingerprintForSet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("stops checking once unmounted", async () => {
    ownedFingerprintForSet.mockResolvedValue("a,b,c|");
    const { unmount } = render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    unmount();
    focus();
    expect(ownedFingerprintForSet).not.toHaveBeenCalled();
  });
});

describe("DeltaStrip — changes a count cannot see", () => {
  it("offers a refresh when a printing was swapped and the count held still", async () => {
    // Same number of owned cells, different printings: the art and the foil mark on
    // screen are stale, and a count-based check would have said nothing.
    ownedFingerprintForSet.mockResolvedValue("a,c|");
    render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    fireEvent(window, new Event("focus"));
    expect(await screen.findByText(/Which printings you own from this set has changed/))
      .toBeInTheDocument();
  });

  it("says so when cards were removed", async () => {
    ownedFingerprintForSet.mockResolvedValue("a|");
    render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    fireEvent(window, new Event("focus"));
    expect(await screen.findByText(/1 card from this set is no longer in your collection/))
      .toBeInTheDocument();
  });

  it("does not poll a set whose catalog is not indexed", () => {
    // The page renders no cells at all then, so its baseline is empty and any classified
    // row the server counts would read as an upload the reader never made.
    ownedFingerprintForSet.mockResolvedValue("a,b,c|");
    render(<DeltaStrip code="dsk" fingerprint="" indexed={false} />);
    fireEvent(window, new Event("focus"));
    expect(ownedFingerprintForSet).not.toHaveBeenCalled();
  });

  it("applies only the latest check when two focus events race", async () => {
    let resolveFirst: (v: string) => void = () => {};
    ownedFingerprintForSet
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce("a,b,c|");
    render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    fireEvent(window, new Event("focus"));
    fireEvent(window, new Event("focus"));
    await screen.findByRole("status");
    resolveFirst("a,b,c,d,e,f|");
    await waitFor(() => expect(
      screen.getByText(/1 more card from this set is in your collection now/),
    ).toBeInTheDocument());
  });
});

describe("DeltaStrip — a pick is not an upload", () => {
  it("says what changed without claiming an upload finished", async () => {
    // The same-count case is reached by picking a different printing in the card modal.
    ownedFingerprintForSet.mockResolvedValue("a,b|o-1>268");
    render(<DeltaStrip code="dsk" fingerprint="a,b|" indexed />);
    fireEvent(window, new Event("focus"));
    expect(await screen.findByText(/Which printings you own from this set has changed/))
      .toBeInTheDocument();
    expect(screen.queryByText(/upload finished/)).toBeNull();
  });
});

describe("DeltaStrip — a same-tab pick", () => {
  it("checks when the modal closes, since window focus never fires for it", async () => {
    // The printing picker lives in the card modal. Picking one moves which cell is filled,
    // and revalidatePath does not refresh a mounted client route — so before this the grid
    // kept showing the old cell with nothing offering a refresh.
    ownedFingerprintForSet.mockResolvedValue("a,b|o-1>268");
    const { rerender } = render(
      <DeltaStrip code="dsk" fingerprint="a,b|" indexed recheckKey="0" />,
    );
    rerender(<DeltaStrip code="dsk" fingerprint="a,b|" indexed recheckKey="1" />);
    expect(await screen.findByText(/Which printings you own from this set has changed/))
      .toBeInTheDocument();
  });
});

// §31: while this strip is showing a message the head may not collapse. The parent decides
// that from what the strip reports, and the parent's own tests use a MOCK — so a real strip
// that stopped reporting would leave both suites green. This is the only place that fact is
// tested against the component that has to produce it.
describe("DeltaStrip — what it reports to the head", () => {
  const props = { code: "dsk", fingerprint: "a:1", indexed: true };

  it("reports firing when the fingerprint has moved", async () => {
    const onFiring = vi.fn();
    ownedFingerprintForSet.mockResolvedValue("a:2");
    render(<DeltaStrip {...props} recheckKey="1" onFiring={onFiring} />);
    await waitFor(() => expect(onFiring).toHaveBeenCalledWith(true));
  });

  it("does not report firing when it matches", async () => {
    const onFiring = vi.fn();
    ownedFingerprintForSet.mockResolvedValue("a:1");
    render(<DeltaStrip {...props} recheckKey="1" onFiring={onFiring} />);
    await waitFor(() => expect(ownedFingerprintForSet).toHaveBeenCalled());
    expect(onFiring).not.toHaveBeenCalledWith(true);
  });

  // An unindexed set never polls, so it can never pin the head open.
  it("does not report firing when the set is not indexed", async () => {
    const onFiring = vi.fn();
    ownedFingerprintForSet.mockResolvedValue("a:2");
    render(<DeltaStrip {...props} indexed={false} recheckKey="1" onFiring={onFiring} />);
    await waitFor(() => expect(onFiring).toHaveBeenCalledWith(false));
    expect(onFiring).not.toHaveBeenCalledWith(true);
  });

  // Clearing on unmount matters as much as reporting: the head would otherwise stay pinned
  // open after the strip left the page.
  it("clears it on unmount", async () => {
    const onFiring = vi.fn();
    ownedFingerprintForSet.mockResolvedValue("a:2");
    const { unmount } = render(<DeltaStrip {...props} recheckKey="1" onFiring={onFiring} />);
    await waitFor(() => expect(onFiring).toHaveBeenCalledWith(true));
    onFiring.mockClear();
    unmount();
    expect(onFiring).toHaveBeenCalledWith(false);
  });

  it("renders without one, because the prop is optional", async () => {
    ownedFingerprintForSet.mockResolvedValue("a:2");
    render(<DeltaStrip {...props} recheckKey="1" />);
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
  });
});
