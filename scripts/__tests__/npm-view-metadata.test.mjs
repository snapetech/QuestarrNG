import { describe, expect, it } from "vitest";
import { parseLatestPackageMetadata } from "../npm-view-metadata.mjs";

describe("npm view latest metadata", () => {
  it("reads version and deprecation from npm's array-shaped field output", () => {
    expect(
      parseLatestPackageMetadata(
        JSON.stringify([
          {
            version: "3.3.2",
            deprecated: "Merged into tsx: https://tsx.hirok.io",
          },
        ])
      )
    ).toEqual({
      version: "3.3.2",
      deprecated: "Merged into tsx: https://tsx.hirok.io",
    });
  });

  it("accepts the version-only array returned when the latest version is not deprecated", () => {
    expect(parseLatestPackageMetadata(JSON.stringify(["0.31.11"]))).toEqual({
      version: "0.31.11",
      deprecated: null,
    });
  });

  it("reads the latest version from a complete package manifest", () => {
    expect(
      parseLatestPackageMetadata(
        JSON.stringify({ "dist-tags": { latest: "2.0.0" }, deprecated: null })
      )
    ).toEqual({ version: "2.0.0", deprecated: null });
  });
});
