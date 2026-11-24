import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hide = vi.fn();
vi.mock("../../app/decks/new/choose/actions", () => ({ hideChooseIntro: () => hide() }));

import { helpMeChooseCopy } from "../../lib/copy/help-me-choose";
import { helpMeChooseIntroCopy as copy } from "../../lib/copy/help-me-choose-intro";
import { CHOOSE_WORDS_ID, ChooseIntro } from "./choose-intro";

const art = { lead: "https://cards.example/ghalta.jpg", rest: ["https://cards.example/2.jpg", null] as [string | null, string | null] };

beforeEach(() => {
  hide.mockReset();
  hide.mockResolvedValue({ ok: true });
});

describe("the Help me choose intro", () => {
  it("draws open with no mark: the steps, both tiles, the 1 credit pill and the reader's daily line", () => {
    render(<ChooseIntro initiallyOpen art={art} daily={1} />);
    expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
    for (const s of copy.steps) expect(screen.getAllByText(s.title).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.free.title)).toBeTruthy();
    expect(screen.getByText(helpMeChooseCopy.read.cost)).toBeTruthy();
    expect(screen.getByText("1 free credit a day, shared by every tool")).toBeTruthy();
  });

  it("says the reader's own daily figure, and leaves the line out while credits are off", () => {
    const { unmount } = render(<ChooseIntro initiallyOpen art={null} daily={3} />);
    expect(screen.getByText("3 free credits a day, shared by every tool")).toBeTruthy();
    unmount();
    render(<ChooseIntro initiallyOpen art={null} daily={null} />);
    expect(screen.queryByText(/free credits? a day/)).toBeNull();
    expect(screen.getByText(copy.paid.line)).toBeTruthy();
  });

  it("draws the example without art when the art read failed", () => {
    const { container } = render(<ChooseIntro initiallyOpen art={null} daily={null} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(copy.exampleName)).toBeTruthy();
  });

  it("draws folded once the mark is set, and opens again on the press without writing", () => {
    render(<ChooseIntro initiallyOpen={false} art={art} daily={1} />);
    const folded = screen.getByRole("button", { name: copy.foldedAria });
    expect(folded.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("heading", { name: copy.title })).toBeNull();
    fireEvent.click(folded);
    expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
    expect(hide).not.toHaveBeenCalled();
  });

  it("folds on Hide and writes the mark; a failed write folds it all the same", async () => {
    hide.mockRejectedValueOnce(new Error("down"));
    render(<ChooseIntro initiallyOpen art={art} daily={1} />);
    fireEvent.click(screen.getByRole("button", { name: copy.hide }));
    expect(screen.getByRole("button", { name: copy.foldedAria })).toBeTruthy();
    await waitFor(() => expect(hide).toHaveBeenCalledTimes(1));
  });

  it("the jump link moves focus to the Anything else? box", () => {
    render(
      <>
        <ChooseIntro initiallyOpen art={null} daily={1} />
        <textarea id={CHOOSE_WORDS_ID} />
      </>,
    );
    const box = document.getElementById(CHOOSE_WORDS_ID)!;
    const scroll = vi.fn();
    box.scrollIntoView = scroll;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.paid.jump.replace("?", "\\?")) }));
    expect(scroll).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    expect(document.activeElement).toBe(box);
  });
});
