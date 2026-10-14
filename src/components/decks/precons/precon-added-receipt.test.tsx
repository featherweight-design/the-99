import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const mirror = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/url/mirror", () => ({ mirrorUrl: mirror }));
import { StripAddedParam } from "./precon-added-receipt";

const ID = "7d0a1c1e-4d1a-4b9a-8d3c-2f7a5a9e1b11";

beforeEach(() => { mirror.mockReset(); window.history.replaceState(null, "", `/decks/d1?from=precon&added=${ID}`); });

describe("StripAddedParam", () => {
  it("StripAddedParam spends a claim no receipt could be drawn for, so a reload cannot repeat it", () => {
    render(<StripAddedParam />);
    expect(mirror).toHaveBeenCalledTimes(1);
    const url = mirror.mock.calls[0][0] as URL;
    expect(url.searchParams.has("added")).toBe(false);
    expect(url.searchParams.get("from")).toBe("precon");
  });
});
