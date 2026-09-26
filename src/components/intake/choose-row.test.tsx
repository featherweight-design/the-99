import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";


const { CardDetailProvider } = await import("../cards/card-detail-provider");
const { ChooseRow } = await import("./choose-row");
const { emptyParams } = await import("../../lib/intake/params");
import type { ChooseParams } from "../../lib/intake/params";
import type { ResultRow } from "../../lib/intake/rows";
import type { Trial } from "./choose-row";

const ID = "0000aaaa-0000-4000-8000-00000000000c";
const CARD = "0000aaaa-0000-4000-8000-000000000001";
const row = (over: Partial<ResultRow> = {}): ResultRow => ({
  oracleId: ID, name: "Gishath, Sun's Avatar", colorIdentity: ["R", "G", "W"], imageUri: null, artCropUri: null,
  mark: { kind: "free" }, themeFits: [], cardFit: null, ownedSupport: 0, supportTotal: 0, ...over,
});
const params: ChooseParams = { ...emptyParams(), results: true, themes: ["dinosaurs", "landfall"], card: CARD, budgetDollars: 150, bracket: 3 };

const pending: Trial = { state: "pending" };
function draw(r: ResultRow = row(), trial: Trial = pending, retry = vi.fn(), cardUnpriced = false) {
  return render(
    <CardDetailProvider fetchCard={vi.fn()}>
      <ul>
        <ChooseRow row={r} figures={[]} owned={false} params={params} cardName="Regisaur Alpha" cardUnpriced={cardUnpriced} trial={trial} retry={retry} />
      </ul>
    </CardDetailProvider>,
  );
}

describe("a result row", () => {
  it("paints a best fit from the card's image where the catalog has no crop, never a blank block", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn()}>
        <ul>
          <ChooseRow row={row({ imageUri: "https://img/card.jpg", artCropUri: null })} figures={[]} owned={false} params={params} cardName={null} trial={pending} retry={vi.fn()} best={1} />
        </ul>
      </CardDetailProvider>,
    );
    const art = container.querySelector<HTMLElement>("[aria-hidden][style]");
    expect(art?.style.backgroundImage).toContain("https://img/card.jpg");
  });

  it("marks a free commander, a held one with its deck, and an unowned one with its buy tag", async () => {
    draw(row({ mark: { kind: "free" } }));
    expect(screen.getByTestId("mark-free").textContent).toBe("owned · free");
    draw(row({ mark: { kind: "held", deck: "Big Lizards" } }));
    expect(screen.getByTestId("mark-held").textContent).toBe("none free, in Big Lizards");
    draw(row({ mark: { kind: "buy", price: { kind: "priced", cents: 1234 } } }));
    expect(screen.getByTestId("mark-buy").textContent).toBe("buy·$12.34");
  });

  it("hands off to the create page with the commander and the results' own params, so it can read the answers and go back", () => {
    draw();
    const href = new URL(screen.getByTestId("row-hand-off").getAttribute("href")!, "http://x");
    expect(href.pathname).toBe("/decks/new");
    expect(href.searchParams.get("commander")).toBe(ID);
    // The results screen's params, whole: the create page parses them with the results' own parser.
    const { commander: _, ...rest } = Object.fromEntries(href.searchParams);
    expect(rest).toEqual({ t: "dinosaurs,landfall", a: CARD, b: "150", k: "3", v: "results" });
  });

  it("keeps the name a sibling of the row's press, never nested inside it", () => {
    draw();
    const press = screen.getByTestId("row-hand-off");
    expect(press.contains(screen.getByTestId("row-name"))).toBe(false);
    expect(press.querySelector("button, a")).toBeNull();
  });

  it("says it is counting, then shows the figures", () => {
    const { unmount } = draw(row(), pending);
    expect(screen.getByTestId("ownership-line").dataset.trial).toBe("pending");
    expect(screen.getByText("Counting what you own…")).toBeTruthy();
    unmount();
    draw(row(), { state: "ready", figures: { body: 99, owned: 41, buyCents: 12_049, unpricedCard: null } });
    // Each segment leads with its own separator: the text reads as the one sentence, dots between.
    expect(screen.getByTestId("ownership-line").textContent).toContain("·you own 41 of its 99·about $120 to buy, inside $150");
    expect(screen.queryByTestId("row-unpriced")).toBeNull();
  });

  it("says when the build-around card has no price and the figure leaves it out", () => {
    draw(row(), { state: "ready", figures: { body: 99, owned: 41, buyCents: 5_000, unpricedCard: "absent" } });
    expect(screen.getByTestId("row-unpriced").textContent).toContain("Regisaur Alpha");
  });

  it("says it on a row still counting and on one that failed, from the card's chip (4e: every row)", () => {
    for (const trial of [pending, { state: "failed" } as const]) {
      const { unmount } = draw(row(), trial, vi.fn(), true);
      expect(screen.getByTestId("row-unpriced").textContent).toContain("Regisaur Alpha");
      unmount();
    }
    // A ready row's own count decides over the chip.
    draw(row(), { state: "ready", figures: { body: 99, owned: 41, buyCents: 5_000, unpricedCard: null } }, vi.fn(), true);
    expect(screen.queryByTestId("row-unpriced")).toBeNull();
  });

  it("offers Retry when the count fails, and asks the list to count again", () => {
    const retry = vi.fn();
    draw(row(), { state: "failed" }, retry);
    expect(screen.getByText("Couldn’t count what you own.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("the set tag (three answers §2)", () => {
  it("draws the code after the pips, titled and spoken with the set's name, and nothing with no set", () => {
    draw(row({ set: { code: "hob", name: "The Hobbit" } }));
    const tags = screen.getAllByTestId("row-set");
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0].getAttribute("title")).toBe("The Hobbit");
    expect(tags[0].textContent).toBe("Printed in The HobbitHOB");
    // After the pips: the name, then its pips, then the tag, in one line.
    const line = [...tags[0].parentElement!.children];
    expect(line.indexOf(tags[0])).toBe(line.length - 1);
    expect(line[line.length - 2].querySelector("[aria-label], svg, span")).not.toBeNull();
  });

  it("draws no tag when no set was asked", () => {
    draw(row());
    expect(screen.queryAllByTestId("row-set")).toHaveLength(0);
  });
});

describe("own-only (three answers §3)", () => {
  it("marks the commander apart, and says where the 99 comes from and how much of its usual 99 is yours", () => {
    render(
      <CardDetailProvider fetchCard={vi.fn()}>
        <ul>
          <ChooseRow row={row()} figures={[]} owned={false} params={{ ...params, pool: "own" }} cardName="Regisaur Alpha" cardUnpriced={false}
            trial={{ state: "ready", figures: { body: 99, owned: 58, buyCents: 12_000, unpricedCard: null } }} retry={vi.fn()} />
        </ul>
      </CardDetailProvider>,
    );
    const line = screen.getByTestId("ownership-line").textContent ?? "";
    expect(line).toContain("commander");
    expect(line).toContain("99 from your cards");
    expect(line).toContain("58 of its usual 99 are yours");
    // Nothing is bought for the 99: no figure to buy.
    expect(line).not.toMatch(/to buy/);
  });
});
