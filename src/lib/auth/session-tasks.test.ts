// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SIGN_IN_TASKS_PATH, TASK_URLS, accountsOrigin, hostedTaskUrl, taskPath } from "./session-tasks";

describe("session tasks", () => {
  it("name every task at its in-app address under /sign-in/tasks", () => {
    expect(SIGN_IN_TASKS_PATH).toBe("/sign-in/tasks");
    expect(TASK_URLS).toEqual({
      "choose-organization": "/sign-in/tasks/choose-organization",
      "reset-password": "/sign-in/tasks/reset-password",
      "setup-mfa": "/sign-in/tasks/setup-mfa",
    });
  });

  it("send a pending session to its task with the absolute page to come back to, and an unknown task to /sign-in/tasks", () => {
    expect(taskPath("reset-password", "https://the99.test/decks")).toBe("/sign-in/tasks/reset-password?redirect_url=https%3A%2F%2Fthe99.test%2Fdecks");
    expect(taskPath("something-new", "https://the99.test/")).toBe("/sign-in/tasks?redirect_url=https%3A%2F%2Fthe99.test%2F");
  });

  it("find the Account Portal as Clerk does, and its hosted /sign-in/tasks with the query kept", () => {
    expect(accountsOrigin("clerk.the99.app")).toBe("https://accounts.the99.app");
    expect(accountsOrigin("happy-cat-1.clerk.accounts.dev")).toBe("https://happy-cat-1.accounts.dev");
    expect(hostedTaskUrl("clerk.the99.app", "?redirect_url=https%3A%2F%2Fthe99.app%2Fdecks")).toBe("https://accounts.the99.app/sign-in/tasks?redirect_url=https%3A%2F%2Fthe99.app%2Fdecks");
    expect(hostedTaskUrl("clerk.the99.app", "")).toBe("https://accounts.the99.app/sign-in/tasks");
  });
});
