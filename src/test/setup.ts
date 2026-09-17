/**
 * Test environment wiring.
 *
 * MSW is started once for the whole run and its handlers reset between tests, so one test's stubbed
 * failure cannot leak into the next and produce a passing test for the wrong reason.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./server";

beforeAll(() => {
  // `error` rather than `warn`: a request nothing stubbed means the test is exercising a call it
  // did not intend to, and silently returning nothing would hide that.
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => server.close());

// jsdom does not implement `confirm`, and the pager guards unsaved edits with it.
window.confirm = vi.fn(() => true);

// `clipboard` is left to user-event, which installs its own stub per `setup()` call. Defining one
// here non-configurably makes that redefinition throw and every such test fail on setup.
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn(async () => undefined) },
  writable: true,
  configurable: true,
});
