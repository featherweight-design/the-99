import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Emphasised, localised } from "./emphasis";

describe("Emphasised", () => {
  it("marks each value once, in the order the sentence prints them", () => {
    const { container } = render(
      <Emphasised text="1,047 fall below and 212 have no data" values={["1,047", "212"]} color="red" />,
    );
    expect([...container.querySelectorAll("strong")].map((el) => el.textContent)).toEqual([
      "1,047",
      "212",
    ]);
    expect(container.textContent).toBe("1,047 fall below and 212 have no data");
  });

  it("skips a value the sentence's chosen phrasing did not print", () => {
    const { container } = render(
      <Emphasised text="1 match, 0 shown" values={["7", "0"]} color="red" />,
    );
    expect([...container.querySelectorAll("strong")].map((el) => el.textContent)).toEqual(["0"]);
  });

  // A tint is not a stress: the exclusion line marks its figures by colour alone, and
  // `<strong>` would have a screen reader emphasise what no sighted reader hears.
  it("uses a neutral element where the drawing marks by colour alone", () => {
    const { container } = render(
      <Emphasised text="212 have no data" values={["212"]} color="red" weight={400} />,
    );
    expect(container.querySelector("strong")).toBeNull();
    expect(container.querySelector("span")?.textContent).toBe("212");
  });
});

describe("localised", () => {
  it("formats a count the way the copy module interpolates it", () => {
    expect(localised(3326)).toBe("3,326");
  });
});
