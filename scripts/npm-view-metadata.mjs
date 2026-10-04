export function parseLatestPackageMetadata(stdout) {
  const result = JSON.parse(stdout);
  const latest = Array.isArray(result) ? result[0] : result;

  if (typeof latest === "string") {
    return { version: latest, deprecated: null };
  }

  return {
    version: latest?.version ?? latest?.["dist-tags"]?.latest,
    deprecated: latest?.deprecated || null,
  };
}
