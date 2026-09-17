/** The identity written into the audit trail. It is a claim, but it must be a well-formed one. */

import { afterEach, describe, expect, it } from "vitest";
import { operatorId, setOperatorId } from "./operator";

afterEach(() => window.localStorage.clear());

describe("operatorId", () => {
  it("falls back to a named default rather than an empty string", () => {
    expect(operatorId()).toBe("portal-operator");
  });

  it("uses a stored id once one is set", () => {
    expect(setOperatorId("reviewer-7")).toBe(true);
    expect(operatorId()).toBe("reviewer-7");
  });

  it("refuses an id the server would reject, instead of sending it and getting a 403", () => {
    expect(setOperatorId("reviewer 7 with spaces")).toBe(false);
    expect(setOperatorId("r".repeat(100))).toBe(false);
    expect(setOperatorId("reviewer\nINFO forged")).toBe(false);
  });

  it("ignores a stored value that is no longer acceptable", () => {
    window.localStorage.setItem("lankalistings.operatorId", "bad value!");

    expect(operatorId()).toBe("portal-operator");
  });
});
