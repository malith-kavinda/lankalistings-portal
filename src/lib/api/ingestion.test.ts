/**
 * What `createBatch` actually puts on the wire.
 *
 * Tested against a stubbed `fetch` rather than through MSW: MSW's Node interceptor cannot consume a
 * `FormData` body built from jsdom `File` objects — the request hangs — and the thing worth
 * asserting here is the body the client constructs, which a stub shows directly.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { assetUrl, createBatch, retryItem } from "./ingestion";

function stubFetch() {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchStub = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ data: { id: "bat_1" }, error: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchStub);
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("createBatch", () => {
  it("appends every file under `images`, which is the field the server reads", async () => {
    const calls = stubFetch();

    await createBatch([
      new File(["a"], "page-1.png", { type: "image/png" }),
      new File(["b"], "page-2.png", { type: "image/png" }),
    ]);

    const body = calls[0].init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.getAll("images").map((entry) => (entry as File).name)).toEqual([
      "page-1.png",
      "page-2.png",
    ]);
  });

  it("does not set Content-Type, so the browser writes the multipart boundary", async () => {
    const calls = stubFetch();

    await createBatch([new File(["a"], "page.png", { type: "image/png" })]);

    expect(calls[0].init.headers).not.toHaveProperty("Content-Type");
  });

  it("identifies the operator so the batch is attributed", async () => {
    const calls = stubFetch();

    await createBatch([new File(["a"], "page.png", { type: "image/png" })], {
      operatorId: "reviewer-2",
    });

    expect(calls[0].init.headers).toMatchObject({ "X-Operator-Id": "reviewer-2" });
  });
});

describe("retryItem", () => {
  it("defaults to resume, which keeps artifacts that are still valid", async () => {
    const calls = stubFetch();

    await retryItem("itm_1");

    expect(calls[0].url).toContain("mode=resume");
  });

  it("passes reprocess through when the reviewer asks for a fresh generation", async () => {
    const calls = stubFetch();

    await retryItem("itm_1", { mode: "reprocess" });

    expect(calls[0].url).toContain("mode=reprocess");
  });
});

describe("assetUrl", () => {
  it("addresses the stored representation the viewer needs", () => {
    expect(assetUrl("ast_1", "original")).toContain("/api/v1/media/assets/ast_1/original");
  });
});
