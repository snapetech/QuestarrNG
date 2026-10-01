import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Downloader } from "../../shared/schema.js";

const safeFetchMock = vi.fn();

const loggerWarnMock = vi.fn();
vi.mock("../logger.js", () => ({
  downloadersLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: loggerWarnMock,
  },
}));

vi.mock("../ssrf.js", () => ({
  isSafeUrl: vi.fn().mockResolvedValue(true),
  safeFetch: safeFetchMock,
}));

const { SABnzbdClient } = await import("../downloaders/sabnzbd.js");

const createDownloader = (overrides: Partial<Downloader> = {}): Downloader => {
  const now = new Date("2024-01-01T00:00:00.000Z");
  return {
    id: "sab-tls",
    name: "SABnzbd",
    type: "sabnzbd",
    url: "sab.local",
    enabled: true,
    priority: 1,
    port: null,
    useSsl: true,
    urlPath: null,
    username: "api-key",
    password: null,
    downloadPath: null,
    category: null,
    label: null,
    addStopped: false,
    removeCompleted: false,
    postImportCategory: null,
    settings: null,
    allowSelfSignedCertificate: false,
    allowInsecureLan: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

const selfSignedError = () => {
  const err = new Error("self-signed certificate") as Error & { cause?: { code: string } };
  err.cause = { code: "DEPTH_ZERO_SELF_SIGNED_CERT" };
  return err;
};

describe("SABnzbd TLS certificate validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    safeFetchMock.mockReset();
  });

  it("does not make an insecure retry when the legacy opt-in is off", async () => {
    safeFetchMock.mockRejectedValue(selfSignedError());

    const client = new SABnzbdClient(createDownloader({ allowSelfSignedCertificate: false }));

    const result = await client.testConnection();
    expect(result.success).toBe(false);
    expect(loggerWarnMock).not.toHaveBeenCalled();
  });

  it("never disables certificate validation when the legacy opt-in is on", async () => {
    safeFetchMock.mockRejectedValue(selfSignedError());

    const client = new SABnzbdClient(createDownloader({ allowSelfSignedCertificate: true }));
    const result = await client.testConnection();

    expect(result.success).toBe(false);
    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({ downloaderId: "sab-tls", url: expect.any(String) }),
      expect.stringContaining("NODE_EXTRA_CA_CERTS")
    );

    const [loggedFields] = loggerWarnMock.mock.calls[0];
    expect(loggedFields.url).not.toContain("api-key");
    expect(loggedFields.url).toContain("apikey=%5Bredacted%5D");
  });
});
