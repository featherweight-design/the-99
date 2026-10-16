import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { collectionEditCopy } from "../../../lib/copy/collection-edit";
import { PhotoList, type PhotoListProps } from "./photo-list";
import type { PhotoRow } from "./photo-reader";
import type { ScanGuess } from "./scan-view";

const copy = collectionEditCopy.scan;
const g = (oracleId: string, name: string): ScanGuess => ({ oracleId, name, typeLine: "Creature", imageUri: `https://img/${oracleId}` });
const ROWS: PhotoRow[] = [
  { id: 0, thumb: "blob:0", state: { kind: "sure", guess: g("a", "Killian, Decisive Mentor") } },
  { id: 1, thumb: "blob:1", state: { kind: "added", guess: g("b", "Rootha, Mastering the Moment") } },
  { id: 2, thumb: "blob:2", state: { kind: "notSure", guesses: [g("c", "Zimone"), g("d", "Jace"), g("e", "Sai")] } },
  { id: 3, thumb: "blob:3", state: { kind: "failed" } },
  { id: 4, thumb: "blob:4", state: { kind: "pending" } },
];

function draw(over: Partial<PhotoListProps> = {}) {
  const props: PhotoListProps = {
    layout: "desk", rows: ROWS, mode: "fast",
    onMode: vi.fn(), onClose: vi.fn(), onAddSure: vi.fn(), onPick: vi.fn(), onChooseMore: vi.fn(),
    ...over,
  };
  render(<PhotoList {...props} />);
  return props;
}
const row = (i: number) => screen.getAllByRole("listitem")[i];

describe("PhotoList", () => {
  it("draws a row per photo, each with its own thumbnail, and counts the photos already read (W4)", () => {
    draw();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    // Rows are decided after they appear, so the list announces them.
    expect(screen.getByRole("list").getAttribute("aria-live")).toBe("polite");
    expect(screen.getAllByAltText(copy.photos.yourPhoto).map((i) => i.getAttribute("src"))).toEqual(["blob:0", "blob:1", "blob:2", "blob:3", "blob:4"]);
    expect(screen.getByText(copy.photos.read(4))).toBeTruthy();
  });

  it("leaves the empty tile for a photo the browser cannot draw, never a broken image", () => {
    draw();
    const img = screen.getAllByAltText(copy.photos.yourPhoto)[3];
    fireEvent.error(img);
    expect(screen.getAllByAltText(copy.photos.yourPhoto)).toHaveLength(4);
    expect(within(row(3)).queryByRole("img")).toBeNull();
  });

  it("names a sure photo's card and never a printing, and says a row already added is on the list", () => {
    draw();
    expect(within(row(0)).getByText("Killian, Decisive Mentor")).toBeTruthy();
    // The index matches the card, not the printing: the printing added is the list line's to name.
    expect(row(0).textContent).not.toMatch(/·\s*#/);
    expect(within(row(0)).getByText(copy.photos.sure)).toBeTruthy();
    expect(within(row(1)).getByText(copy.fix.onList)).toBeTruthy();
  });

  it("offers a Not sure photo's top three, and a press picks one for that row", () => {
    const p = draw();
    expect(within(row(2)).getByText(copy.photos.pick)).toBeTruthy();
    expect(within(row(2)).getByText(copy.photos.photoOf(3, 5))).toBeTruthy();
    expect(within(row(2)).getByText(copy.photos.notSure)).toBeTruthy();
    fireEvent.click(within(row(2)).getByRole("button", { name: "Jace" }));
    expect(p.onPick).toHaveBeenCalledWith(2, "d");
  });

  it("says no card was read, and marks a photo still being read busy with its place in the list", () => {
    draw();
    expect(within(row(3)).getByText(copy.photos.noCard)).toBeTruthy();
    expect(row(4).getAttribute("aria-busy")).toBe("true");
    expect(within(row(4)).getByText(copy.photos.photoOf(5, 5))).toBeTruthy();
  });

  it("counts only the sure rows not yet added on the bulk press, and drops it when there are none", () => {
    const p = draw();
    fireEvent.click(screen.getByRole("button", { name: copy.photos.addSure(1) }));
    expect(p.onAddSure).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: copy.photos.more }));
    expect(p.onChooseMore).toHaveBeenCalled();
    document.body.innerHTML = "";
    draw({ rows: ROWS.slice(1) });
    expect(screen.queryByRole("button", { name: /sure/ })).toBeNull();
    expect(screen.getByRole("button", { name: copy.photos.more })).toBeTruthy();
  });

  it("scrolls the desktop's rows inside the panel and keeps its presses outside the scroll", () => {
    draw();
    const body = screen.getByTestId("scan-photos-body");
    expect(body.className).toMatch(/overflow-y-auto/);
    expect(body.className).toMatch(/min-h-0/);
    expect(body.contains(screen.getByRole("button", { name: copy.photos.more }))).toBe(false);
    expect(body.contains(screen.getAllByRole("listitem")[0])).toBe(true);
  });

  it("holds every add press while an add is in flight, so none is taken and dropped", () => {
    draw({ busy: true });
    expect((screen.getByRole("button", { name: copy.photos.addSure(1) }) as HTMLButtonElement).disabled).toBe(true);
    for (const b of within(row(2)).getAllByRole("button")) expect((b as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: copy.photos.more }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("stops from the desktop's head, and closes from the phone's ✕ beside Fast/Normal", () => {
    const desk = draw();
    fireEvent.click(screen.getByRole("button", { name: copy.camera.stop }));
    expect(desk.onClose).toHaveBeenCalled();
    document.body.innerHTML = "";
    const phone = draw({ layout: "phone" });
    fireEvent.click(screen.getByRole("button", { name: copy.close }));
    expect(phone.onClose).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: copy.mode.normal }));
    expect(phone.onMode).toHaveBeenCalledWith("normal");
  });
});
