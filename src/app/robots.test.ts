import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots.txt", () => {
  it("lets crawlers in, and keeps them off the API and personal links", () => {
    expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/join/", "/friend/"] } });
  });
});
