import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Downloader } from "../../shared/schema.js";

const safeFetchMock = vi.fn();

vi.mock("../logger.js", () => ({
  downloadersLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../ssrf.js", () => ({
  isSafeUrl: vi.fn().mockResolvedValue(true),
  safeFetch: safeFetchMock,
}));

const { SABnzbdClient } = await import("../downloaders/sabnzbd.js");

function createMockDownloader(overrides: Partial<Downloader> = {}): Downloader {
  const timestamp = new Date("2024-01-01T00:00:00.000Z");
  return {
    id: "sab-ssl",
    name: "Test SAB",
    type: "sabnzbd",
    url: "sab.local",
    enabled: true,
    priority: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    port: 8080,
    useSsl: true,
    urlPath: null,
    username: "api-key",
    password: "secret",
    category: null,
    downloadPath: "/downloads",
    label: "test",
    addStopped: false,
    removeCompleted: false,
    postImportCategory: null,
    settings: null,
    allowSelfSignedCertificate: true,
    allowInsecureLan: false,
    ...overrides,
  };
}

describe("SABnzbd TLS fallback hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    safeFetchMock.mockReset();
  });

  it("preserves certificate verification when the legacy self-signed option is enabled", async () => {
    safeFetchMock.mockRejectedValueOnce(
      Object.assign(new Error("self-signed certificate"), {
        cause: { code: "DEPTH_ZERO_SELF_SIGNED_CERT" },
      })
    );

    const client = new SABnzbdClient(createMockDownloader());
    const result = await client.testConnection();

    expect(result.success).toBe(false);
    expect(safeFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://sab.local:8080"),
      expect.objectContaining({ allowPrivate: true, requireHttps: true })
    );
  });
});
