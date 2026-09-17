/** The client-side mirror of the server's three upload limits. */

import { describe, expect, it } from "vitest";
import { duplicateNames, validateSelection } from "./uploadValidation";
import { limits } from "../test/fixtures";

function file(name: string, size: number, type = "image/png"): File {
  const blob = new File([""], name, { type });
  // `File` size is derived from its content; overriding is simpler than allocating 10 MB per test.
  Object.defineProperty(blob, "size", { value: size });
  return blob;
}

describe("validateSelection", () => {
  it("accepts a normal selection", () => {
    expect(validateSelection([file("a.png", 1000)], limits)).toEqual([]);
  });

  it("refuses an empty selection", () => {
    expect(validateSelection([], limits)).toHaveLength(1);
  });

  it("refuses more images than a batch holds", () => {
    const tooMany = Array.from({ length: 30 }, (_, index) => file(`p${index}.png`, 10));

    const problems = validateSelection(tooMany, limits);

    expect(problems.some((problem) => problem.message.includes("at most 25"))).toBe(true);
  });

  it("refuses an image over the per-image limit, and names it", () => {
    const problems = validateSelection([file("huge.png", 20 * 1024 * 1024)], limits);

    expect(problems).toHaveLength(1);
    expect(problems[0].filename).toBe("huge.png");
  });

  it("refuses a batch over the total limit even when each image is fine", () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      file(`p${index}.png`, 9 * 1024 * 1024),
    );

    const problems = validateSelection(many, limits);

    expect(problems.some((problem) => problem.message.includes("the limit is"))).toBe(true);
  });

  it("refuses an unsupported type", () => {
    const problems = validateSelection([file("doc.pdf", 100, "application/pdf")], limits);

    expect(problems[0].message).toContain("not a supported image type");
  });

  it("allows a file the browser could not type, because the server sniffs the bytes", () => {
    expect(validateSelection([file("scan", 100, "")], limits)).toEqual([]);
  });

  it("does not block an upload while the limits are still loading", () => {
    expect(validateSelection([file("a.png", 999_999_999)], undefined)).toEqual([]);
  });
});

describe("duplicateNames", () => {
  it("finds repeated names", () => {
    expect(duplicateNames([file("a.png", 1), file("b.png", 1), file("a.png", 1)])).toEqual([
      "a.png",
    ]);
  });

  it("returns nothing when every name is distinct", () => {
    expect(duplicateNames([file("a.png", 1), file("b.png", 1)])).toEqual([]);
  });
});
