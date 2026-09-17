/**
 * The client's job is turning a failed response into something the UI can act on. These test that,
 * not the happy path.
 */

import { describe, expect, it } from "vitest";
import { ApiError, request } from "./client";
import { BASE, failure, http, ok, server } from "../../test/server";

describe("request", () => {
  it("unwraps the envelope and returns the data", async () => {
    server.use(http.get(`${BASE}/api/v1/thing`, () => ok({ id: "x" })));

    await expect(request<{ id: string }>("/api/v1/thing")).resolves.toEqual({ id: "x" });
  });

  it("carries the correlation id off a failure, which is the only handle for the logs", async () => {
    server.use(
      http.get(`${BASE}/api/v1/thing`, () =>
        failure(409, "VERSION_CONFLICT", "Reload before saving.", [], "cor_abc123"),
      ),
    );

    const error = await request("/api/v1/thing").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).correlationId).toBe("cor_abc123");
    expect((error as ApiError).code).toBe("VERSION_CONFLICT");
    expect((error as ApiError).isVersionConflict).toBe(true);
  });

  it("keeps field-level details so a form can point at the field that failed", async () => {
    server.use(
      http.post(`${BASE}/api/v1/thing`, () =>
        failure(422, "APPROVAL_VALIDATION_FAILED", "Cannot publish yet.", [
          { field: "title", code: "REQUIRED", message: "A title is required before publishing." },
          { field: "category", code: "REQUIRED", message: "A category is required." },
        ]),
      ),
    );

    const error = (await request("/api/v1/thing", { method: "POST" }).catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.details).toHaveLength(2);
    expect(error.detailFor("title")).toBe("A title is required before publishing.");
    expect(error.detailFor("nothing")).toBeUndefined();
  });

  it("drops empty query parameters rather than sending them", async () => {
    let seen = "";
    server.use(
      http.get(`${BASE}/api/v1/thing`, ({ request: received }) => {
        seen = new URL(received.url).search;
        return ok([]);
      }),
    );

    await request("/api/v1/thing", {
      query: { batch_id: "bat_1", category: undefined, warning: "", offset: 0 },
    });

    expect(seen).toBe("?batch_id=bat_1&offset=0");
  });

  it("says the service is unreachable rather than leaking a fetch error", async () => {
    server.use(http.get(`${BASE}/api/v1/thing`, () => HttpResponseError()));

    const error = (await request("/api/v1/thing").catch((caught: unknown) => caught)) as ApiError;

    expect(error.code).toBe("NETWORK_UNAVAILABLE");
    expect(error.message).toContain("Is it running?");
  });

  it("reports a non-JSON response instead of throwing a parse error", async () => {
    server.use(
      http.get(`${BASE}/api/v1/thing`, () =>
        new Response("<html>502 Bad Gateway</html>", { status: 502 }),
      ),
    );

    const error = (await request("/api/v1/thing").catch((caught: unknown) => caught)) as ApiError;

    expect(error.code).toBe("MALFORMED_RESPONSE");
  });

  it("sends the operator id so the audit trail names a reviewer", async () => {
    let seen: string | null = null;
    server.use(
      http.post(`${BASE}/api/v1/thing`, ({ request: received }) => {
        seen = received.headers.get("X-Operator-Id");
        return ok({});
      }),
    );

    await request("/api/v1/thing", { method: "POST", body: {}, operatorId: "reviewer-7" });

    expect(seen).toBe("reviewer-7");
  });
});

/** MSW's way of simulating a connection that never completes. */
function HttpResponseError(): Response {
  return Response.error();
}
