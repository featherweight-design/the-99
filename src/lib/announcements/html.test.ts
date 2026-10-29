import { describe, expect, it } from "vitest";
import { htmlToText } from "./html";

describe("htmlToText", () => {
  it("drops inline tags without inserting a space", () => {
    expect(htmlToText("<i>Magic: The Gathering</i>®")).toBe("Magic: The Gathering®");
    expect(htmlToText("<em>Magic</em>'s")).toBe("Magic's");
  });

  it("still separates block elements and line breaks", () => {
    expect(htmlToText("<p>First</p><p>Second</p>")).toBe("First Second");
    expect(htmlToText("<li>One</li><li>Two</li>")).toBe("One Two");
    expect(htmlToText("Line one<br>Line two<br/>three")).toBe("Line one Line two three");
  });
});
