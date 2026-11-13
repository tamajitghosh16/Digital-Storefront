import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// The consumer (apps/admin) owns this file. Reading it from a test is the
// only place web touches admin's tree — the apps still never import each other.
import contract from "../../../admin/testing/contracts/storefront-revalidate.contract.json";

// Provider side of the admin → storefront contract: replay every interaction
// admin expects against the real route handler, and check it expired exactly
// what the request named (everything, for a bare ping) and warmed the right
// covers.

const SECRET = "contract-test-secret";

const revalidateTag = vi.hoisted(() => vi.fn());
const after = vi.hoisted(() => vi.fn((task: () => unknown) => void task()));
const warmProductImages = vi.hoisted(() => vi.fn(async () => ({ warmed: 0, failed: 0 })));
vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal()), after }));
vi.mock("@/lib/image-warm", () => ({ warmProductImages }));

const { POST } = await import("@/app/api/revalidate/route");

type Interaction = {
  name: string;
  request: { method: string; path: string; headers: Record<string, string>; body?: { tags?: string[]; productIds?: string[] } };
  response: { status: number; body?: object };
};

describe("admin → storefront cache ping (provider)", () => {
  beforeEach(() => {
    vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", SECRET);
    revalidateTag.mockClear();
    warmProductImages.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  for (const interaction of contract.interactions as Interaction[]) {
    it(`honours "${interaction.name}"`, async () => {
      const headers = Object.fromEntries(
        Object.entries(interaction.request.headers).map(([key, value]) => [key, value.replace("{{secret}}", SECRET)])
      );
      const { body } = interaction.request;
      const request = new NextRequest(new URL(interaction.request.path, "http://localhost:3000"), {
        method: interaction.request.method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const response = await POST(request);

      expect(response.status).toBe(interaction.response.status);
      if (interaction.response.body) expect(await response.json()).toMatchObject(interaction.response.body);

      if (response.status !== 200) {
        expect(revalidateTag).not.toHaveBeenCalled();
        return;
      }
      const expired = revalidateTag.mock.calls.map(([tag]) => tag);
      expect(expired).toEqual(body?.tags ?? ["cms", "catalogue"]);
      for (const [, profile] of revalidateTag.mock.calls) expect(profile).toEqual({ expire: 0 });

      if (body?.productIds?.length === 0) {
        expect(warmProductImages).not.toHaveBeenCalled();
      } else {
        expect(warmProductImages).toHaveBeenCalledWith("http://localhost:3000", body?.productIds);
      }
    });
  }
});
