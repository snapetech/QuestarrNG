import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const CachePolicy = require("http-cache-semantics");

function makePolicy(cacheControl, headers = {}) {
  const request = {
    url: "/account",
    method: "GET",
    headers: { host: "example.test", accept: "text/html" },
  };
  const policy = new CachePolicy(
    request,
    {
      status: 200,
      headers: {
        "cache-control": cacheControl,
        age: "120",
        ...headers,
      },
    },
    { shared: true }
  );

  return { request, policy };
}

describe("http-cache-semantics security override", () => {
  it("does not serve a shared Set-Cookie response for max-stale", () => {
    const { request, policy } = makePolicy(
      "max-age=60, stale-if-error=600, stale-while-revalidate=600",
      { "set-cookie": "session=another-user" }
    );
    const staleRequest = {
      ...request,
      headers: { ...request.headers, "cache-control": "max-stale" },
    };

    expect(policy.maxAge()).toBe(0);
    expect(policy.evaluateRequest(staleRequest).response).toBeUndefined();
  });

  it("blocks stale extension and error fallbacks for restricted shared responses", () => {
    const { request, policy } = makePolicy(
      "max-age=60, stale-if-error=600, stale-while-revalidate=600",
      { "set-cookie": "session=another-user" }
    );

    expect(policy.timeToLive()).toBe(0);
    expect(policy.useStaleWhileRevalidate()).toBe(false);
    expect(policy.revalidatedPolicy(request, { status: 503, headers: {} }).modified).toBe(true);
  });

  it("keeps ordinary max-stale reuse and explicitly public cookie responses working", () => {
    const ordinary = makePolicy("max-age=60");
    const ordinaryStaleRequest = {
      ...ordinary.request,
      headers: { ...ordinary.request.headers, "cache-control": "max-stale" },
    };
    const publicCookie = makePolicy("max-age=60, public", {
      "set-cookie": "session=public-content",
    });
    const publicStaleRequest = {
      ...publicCookie.request,
      headers: { ...publicCookie.request.headers, "cache-control": "max-stale" },
    };

    expect(ordinary.policy.evaluateRequest(ordinaryStaleRequest).response).toBeDefined();
    expect(publicCookie.policy.evaluateRequest(publicStaleRequest).response).toBeDefined();
  });
});
