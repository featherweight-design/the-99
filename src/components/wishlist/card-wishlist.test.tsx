// Card details' Wishlist section (Social R2 PR 5): the box before and after Add, the stepper's writes and their
// failures, Remove, and where focus goes.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { wishlistCopy } from "../../lib/copy/wishlist";
import { CardWishlist } from "./card-wishlist";

const CARD = "00000000-0000-4000-8000-0000000000c1";
const add = vi.fn();
const set = vi.fn();
const remove = vi.fn();
vi.mock("../../app/collection/wishlist/actions", () => ({
  addToWishlistAction: (...a: unknown[]) => add(...a),
  setWishlistWantAction: (...a: unknown[]) => set(...a),
  removeFromWishlistAction: (...a: unknown[]) => remove(...a),
}));

const c = wishlistCopy.details;
const wanted = (want: number, have: number) => ({ ok: true, status: "wanted", want, have });
const mount = (want: number | null, owned = 1) => {
  const onWrite = vi.fn();
  render(<CardWishlist oracleId={CARD} want={want} owned={owned} onWrite={onWrite} />);
  return onWrite;
};

beforeEach(() => {
  add.mockReset();
  set.mockReset();
  remove.mockReset();
});

describe("not on the list", () => {
  it("is a box labelled Wishlist with an Add to wishlist button, and no stepper", () => {
    mount(null);
    expect(screen.getByTestId("card-wishlist")).toHaveAccessibleName(c.section0);
    expect(screen.getByRole("button", { name: c.add })).toBeInTheDocument();
    expect(screen.queryByTestId("want-stepper")).toBeNull();
    expect(screen.queryByRole("button", { name: c.remove })).toBeNull();
  });

  it("Add turns the button into the line in place, at one more than held, and focus follows to the stepper", async () => {
    add.mockResolvedValue(wanted(2, 1));
    const onWrite = mount(null);
    const addButton = screen.getByRole("button", { name: c.add });
    addButton.focus();
    fireEvent.click(addButton);
    await waitFor(() => expect(screen.getByTestId("want-stepper")).toBeInTheDocument());
    expect(add).toHaveBeenCalledWith(CARD);
    expect(screen.getByTestId("card-wishlist")).toHaveAccessibleName(c.section);
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("2");
    expect(screen.getByText(c.have(1))).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: c.more })).toHaveFocus());
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it("a refused Add says so in a toast and stays an Add button", async () => {
    add.mockResolvedValue({ ok: false, reason: "invalid" });
    mount(null);
    fireEvent.click(screen.getByRole("button", { name: c.add }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.failedAdd);
    expect(screen.queryByTestId("want-stepper")).toBeNull();
  });

  it("an Add that throws says so too", async () => {
    add.mockRejectedValue(new Error("x"));
    mount(null);
    fireEvent.click(screen.getByRole("button", { name: c.add }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.failedAdd);
  });
});

describe("on the list", () => {
  it("draws the stepper at the want, have, and Remove, and does not take focus as it opens", () => {
    mount(3, 2);
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("3");
    expect(screen.getByText(c.have(2))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.remove })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.more })).not.toHaveFocus();
  });

  it("a step writes the count and shows the server's answer, not its own guess", async () => {
    let answer!: (v: unknown) => void;
    set.mockReturnValue(new Promise((r) => { answer = r; }));
    const onWrite = mount(2, 1);
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    expect(set).toHaveBeenCalledWith(CARD, 3);
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("2");
    await act(async () => answer(wanted(3, 1)));
    expect(onWrite).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("3");
  });

  it("a failed step goes back to what stands and says so", async () => {
    set.mockResolvedValue({ ok: false, reason: "invalid" });
    mount(2, 1);
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.failedSet);
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("2");
  });

  it("a step that throws goes back too", async () => {
    set.mockRejectedValue(new Error("x"));
    mount(2, 1);
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.failedSet);
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("2");
  });

  it("a want the collection already holds leaves no line: the box goes back to Add", async () => {
    set.mockResolvedValue({ ok: true, status: "held", want: 2, have: 2 });
    mount(1, 2);
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    expect(await screen.findByRole("button", { name: c.add })).toBeInTheDocument();
    expect(screen.queryByTestId("want-stepper")).toBeNull();
  });

  it("ignores a second step while one is out", async () => {
    let answer!: (v: unknown) => void;
    set.mockReturnValue(new Promise((r) => { answer = r; }));
    mount(2, 1);
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    expect(set).toHaveBeenCalledTimes(1);
    await act(async () => answer(wanted(3, 1)));
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("3");
  });

  it("Remove takes the card off the list and puts focus on the Add button", async () => {
    remove.mockResolvedValue({ ok: true, removed: true });
    const onWrite = mount(2, 1);
    fireEvent.click(screen.getByRole("button", { name: c.remove }));
    const addBtn = await screen.findByRole("button", { name: c.add });
    await waitFor(() => expect(addBtn).toHaveFocus());
    expect(remove).toHaveBeenCalledWith(CARD);
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it("a failed Remove says so and the line stands", async () => {
    remove.mockResolvedValue({ ok: false, reason: "off" });
    mount(2, 1);
    fireEvent.click(screen.getByRole("button", { name: c.remove }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.failedSet);
    expect(screen.getByTestId("want-stepper")).toBeInTheDocument();
  });
});

describe("writes never overlap", () => {
  it("ignores a second press of Add while the first is out, and draws the first's answer", async () => {
    let answer: (v: unknown) => void = () => {};
    add.mockReturnValue(new Promise((r) => { answer = r; }));
    const onWrite = mount(null);
    const button = screen.getByRole("button", { name: c.add });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(add).toHaveBeenCalledTimes(1);
    await act(async () => { answer(wanted(2, 1)); });
    expect(await screen.findByTestId("want-stepper")).toBeInTheDocument();
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it("ignores a second press of Remove while the first is out, and draws the first's answer", async () => {
    let answer: (v: unknown) => void = () => {};
    remove.mockReturnValue(new Promise((r) => { answer = r; }));
    const onWrite = mount(2);
    const button = screen.getByRole("button", { name: c.remove });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(remove).toHaveBeenCalledTimes(1);
    await act(async () => { answer({ ok: true, status: "removed", have: 1 }); });
    expect(await screen.findByRole("button", { name: c.add })).toBeInTheDocument();
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it("ignores Remove while a step is out, so a failed step still goes back to what the server holds", async () => {
    let answerStep: (v: unknown) => void = () => {};
    set.mockReturnValue(new Promise((r) => { answerStep = r; }));
    mount(2);
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    fireEvent.click(screen.getByRole("button", { name: c.remove }));
    expect(remove).not.toHaveBeenCalled();
    await act(async () => { answerStep({ ok: false, reason: "invalid" }); });
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("2");
  });

  it("ignores a step while Remove is out", async () => {
    let answer: (v: unknown) => void = () => {};
    remove.mockReturnValue(new Promise((r) => { answer = r; }));
    mount(2);
    fireEvent.click(screen.getByRole("button", { name: c.remove }));
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    expect(set).not.toHaveBeenCalled();
    await act(async () => { answer({ ok: true, status: "removed", have: 1 }); });
    expect(await screen.findByRole("button", { name: c.add })).toBeInTheDocument();
  });
});

describe("focus when the line goes", () => {
  it("a step down to what the collection holds puts focus on Add", async () => {
    set.mockResolvedValue({ ok: true, status: "held", have: 1 });
    mount(2, 1);
    const fewer = screen.getByRole("button", { name: c.fewer });
    fewer.focus();
    fireEvent.click(fewer);
    const addButton = await screen.findByRole("button", { name: c.add });
    await waitFor(() => expect(addButton).toHaveFocus());
  });
});

describe("focus after Add", () => {
  it("stays where the reader moved it while the Add was out", async () => {
    let answer!: (v: unknown) => void;
    add.mockReturnValue(new Promise((r) => { answer = r; }));
    render(<><CardWishlist oracleId={CARD} want={null} owned={1} onWrite={vi.fn()} /><button type="button">elsewhere</button></>);
    const addButton = screen.getByRole("button", { name: c.add });
    addButton.focus();
    fireEvent.click(addButton);
    const elsewhere = screen.getByRole("button", { name: "elsewhere" });
    elsewhere.focus();
    await act(async () => answer(wanted(2, 1)));
    expect(await screen.findByTestId("want-stepper")).toBeInTheDocument();
    expect(elsewhere).toHaveFocus();
  });
});

describe("a refreshed snapshot", () => {
  const view = (want: number | null, owned: number, onWrite = vi.fn()) => (
    <CardWishlist oracleId={CARD} want={want} owned={owned} onWrite={onWrite} />
  );

  it("is adopted when no write is out: a cached unlisted card refreshed to listed draws the line and the count", () => {
    const { rerender } = render(view(null, 1));
    expect(screen.getByRole("button", { name: c.add })).toBeInTheDocument();
    rerender(view(3, 2));
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("3");
    expect(screen.getByText(c.have(2))).toBeInTheDocument();
  });

  it("is not adopted while a step is out, and the step's own answer stands", async () => {
    let answer: (v: unknown) => void = () => {};
    set.mockReturnValue(new Promise((r) => { answer = r; }));
    const { rerender } = render(view(2, 1));
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    rerender(view(2, 1));
    rerender(view(5, 1));
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("2");
    await act(async () => { answer(wanted(3, 1)); });
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("3");
  });

  it("steps from the adopted count, not the one it mounted with", async () => {
    set.mockResolvedValue(wanted(5, 1));
    const { rerender } = render(view(2, 1));
    rerender(view(4, 1));
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    expect(set).toHaveBeenCalledWith(CARD, 5);
  });
});
