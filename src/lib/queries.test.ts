/** Polling has to stop, or the portal asks forever for an answer that is already final. */

import { describe, expect, it } from "vitest";
import { BATCH_POLL_MS, batchRefetchInterval, queryKeys } from "./queries";

describe("batchRefetchInterval", () => {
  it("polls while the batch can still change", () => {
    expect(batchRefetchInterval("queued")).toBe(BATCH_POLL_MS);
    expect(batchRefetchInterval("processing")).toBe(BATCH_POLL_MS);
  });

  it("polls before the first response, when the status is not yet known", () => {
    expect(batchRefetchInterval(undefined)).toBe(BATCH_POLL_MS);
  });

  it.each(["completed", "partial_failed", "failed", "cancelled"] as const)(
    "stops once the batch is %s",
    (status) => {
      expect(batchRefetchInterval(status)).toBe(false);
    },
  );
});

describe("queryKeys", () => {
  it("nests review keys under one prefix, so one invalidation refreshes the queue and detail", () => {
    expect(queryKeys.reviewQueue({})[0]).toBe("review");
    expect(queryKeys.candidate("adv_1")[0]).toBe("review");
  });

  it("gives different filters different keys, so a filtered page is cached separately", () => {
    expect(queryKeys.reviewQueue({ category: "vehicles" })).not.toEqual(
      queryKeys.reviewQueue({ category: "jobs" }),
    );
  });
});
