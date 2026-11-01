import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// The consumer (apps/admin) owns this file. Reading it from a test is the
// only place web touches admin's tree — the apps still never import each other.
import contract from "../../../admin/testing/contracts/storefront-revalidate.contract.json";

// Provider side of the admin → storefront contract: replay every interaction
// admin expects against the real route handler.

const SECRET = "contract-test-secret";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal()), after: vi.fn() }));
vi.mock("@/lib/image-warm", () => ({ warmProductImages: vi.fn() }));
vi.mock("@/lib/cms", () => ({ CMS_CACHE_TAG: "cms" }));
vi.mock("@/lib/products-cache", () => ({ PRODUCTS_CACHE_TAG: "products" }));

const { POST } = await import("@/app/api/revalidate/route");

describe("admin → storefront cache ping (provider)", () => {
  beforeEach(() => vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", SECRET));
  afterEach(() => vi.unstubAllEnvs());

  for (const interaction of contract.interactions) {
    it(`honours "${interaction.name}"`, async () => {
      const headers = Object.fromEntries(
        Object.entries(interaction.request.headers).map(([key, value]) => [key, value.replace("{{secret}}", SECRET)])
      );
      const request = new NextRequest(new URL(interaction.request.path, "http://localhost:3000"), {
        method: interaction.request.method,
        headers,
      });

      const response = await POST(request);

      expect(response.status).toBe(interaction.response.status);
      const { body } = interaction.response as { body?: object };
      if (body) expect(await response.json()).toMatchObject(body);
    });
  }
});
