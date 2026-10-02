import { describe, expect, it } from "vitest";

import { injectCuratedNotes } from "../release-notes.mjs";

describe("injectCuratedNotes", () => {
  it("finds a version heading with a release date without building a regex from the version", () => {
    const changelog = "## [1.7.3] - 2026-10-02\n\n### Security\n\n- Summary.\n";
    const result = injectCuratedNotes(changelog, "### User-facing changes\n\n- Note.", "1.7.3");

    expect(result).toContain("## [1.7.3] - 2026-10-02");
    expect(result).toContain("### User-facing changes\n\n- Note.");
    expect(result.indexOf("### User-facing changes")).toBeLessThan(result.indexOf("### Security"));
  });

  it("rejects a changelog version outside the numeric semver format", () => {
    expect(() => injectCuratedNotes("## [1.7.3]", "Notes.", "1.7.3-questarr")).toThrow(
      "Invalid changelog version: 1.7.3-questarr."
    );
  });
});
