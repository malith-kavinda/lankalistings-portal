/** Catalogs the server publishes so the portal cannot offer a value it will refuse. */

import { request } from "./client";
import type { Category } from "./types";

export function getCategories(signal?: AbortSignal): Promise<Category[]> {
  return request<Category[]>("/api/v1/categories", { signal });
}
