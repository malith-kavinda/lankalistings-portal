/**
 * The media service, stubbed at the network boundary.
 *
 * MSW rather than a mocked module, so the tests exercise the real client — its envelope unwrapping,
 * its error mapping, its query-parameter building. A mocked `listReviewQueue` would prove the
 * components render, and nothing about whether the portal talks to the server correctly.
 */

import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { limits, makeBatch, makeDetail, makePage } from "./fixtures";

const BASE = "http://localhost:8001";

export function ok<T>(data: T) {
  return HttpResponse.json({ data, error: null });
}

export function failure(
  status: number,
  code: string,
  message: string,
  details: { field: string | null; code: string; message: string }[] = [],
  correlationId = "cor_test_01",
) {
  return HttpResponse.json(
    { data: null, error: { code, message, details, correlation_id: correlationId } },
    { status },
  );
}

export const defaultHandlers = [
  http.get(`${BASE}/api/v1/ingestion-limits`, () => ok(limits)),
  http.get(`${BASE}/api/v1/ingestion-batches`, () => ok([makeBatch()])),
  http.get(`${BASE}/api/v1/ingestion-batches/:batchId`, () => ok(makeBatch())),
  http.post(`${BASE}/api/v1/ingestion-batches`, () => ok(makeBatch())),
  http.post(`${BASE}/api/v1/ingestion-items/:itemId/retry`, () => ok({ mode: "resume", items: [] })),
  http.get(`${BASE}/api/v1/advertisements/review`, () => ok(makePage())),
  http.get(`${BASE}/api/v1/advertisements/rejection-reasons`, () =>
    ok([
      { code: "not_an_advertisement", description: "The region is not an advertisement." },
      { code: "other", description: "Something else, described in the note." },
    ]),
  ),
  http.get(`${BASE}/api/v1/categories`, () =>
    ok([
      { slug: "vehicles", label: "Vehicles" },
      { slug: "property", label: "Property" },
      { slug: "other", label: "Other" },
    ]),
  ),
  http.get(`${BASE}/api/v1/advertisements`, () => ok([])),
  http.get(`${BASE}/api/v1/advertisements/:id`, () => ok(makeDetail())),
  http.patch(`${BASE}/api/v1/advertisements/:id`, () => ok(makeDetail())),
  http.post(`${BASE}/api/v1/advertisements/:id/approve`, () => ok(makeDetail())),
  http.post(`${BASE}/api/v1/advertisements/:id/reject`, () => ok(makeDetail())),
];

export const server = setupServer(...defaultHandlers);
export { BASE, http };
