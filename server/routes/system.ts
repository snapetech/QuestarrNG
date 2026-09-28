import { Router } from "express";
import fs from "fs-extra";
import path from "node:path";
import { storage } from "../storage.js";
import { routesLogger as logger } from "../logger.js";
import { isSensitivePath } from "../path-security.js";

function isWithinRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toVirtualPath(root: string, absolutePath: string): string {
  const relative = path.relative(root, absolutePath);
  if (!relative || relative === ".") return "/";
  return `/${relative.split(path.sep).join("/")}`;
}

function sortDirents(
  a: { isDirectory: boolean; name: string },
  b: { isDirectory: boolean; name: string }
): number {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
  return a.name.localeCompare(b.name);
}

export const systemRouter = Router();

systemRouter.use((req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.locals.userId = req.user.id;
  return next();
});

// Browsing is confined to paths the signed-in user explicitly configured.
systemRouter.get("/browse", async (req, res) => {
  try {
    const rawPath = (req.query.path as string) || "/";
    const rawRoot = req.query.root as string | undefined;
    const userId = res.locals.userId as string;

    const [config, rommConfig, mappings] = await Promise.all([
      storage.getImportConfig(userId),
      storage.getRomMConfig(userId),
      storage.getPathMappings(),
    ]);
    const allowedRoots = Array.from(
      new Set(
        [
          config.libraryRoot,
          ...(rommConfig.enabled ? [rommConfig.libraryRoot] : []),
          ...mappings.map((mapping) => mapping.localPath),
        ]
          .filter(Boolean)
          .map((candidate) => path.resolve(candidate))
          .filter((candidate) => candidate !== path.parse(candidate).root)
      )
    );
    const defaultRoot = path.resolve(config.libraryRoot || "/data");
    let root = defaultRoot;
    if (rawRoot && rawRoot !== "/") {
      if (rawRoot.startsWith("\\\\") || /^[a-zA-Z]:[\\/]/.test(rawRoot)) {
        return res.status(400).json({ error: "Invalid root: host paths are not allowed" });
      }
      if (rawRoot.split(/[\\/]+/).includes("..")) {
        return res.status(400).json({ error: "Invalid root: traversal detected" });
      }
      const requestedRoot = path.resolve(rawRoot);
      if (!allowedRoots.includes(requestedRoot)) {
        return res.status(403).json({ error: "Browsing is limited to configured library paths" });
      }
      root = requestedRoot;
    }
    if (!allowedRoots.includes(root)) {
      return res.status(403).json({ error: "No configured library path is available to browse" });
    }

    if (rawPath.startsWith("\\\\") || /^[a-zA-Z]:[\\/]/.test(rawPath)) {
      return res.status(400).json({ error: "Invalid path: absolute host paths are not allowed" });
    }

    const normalizedPath = path.normalize(rawPath);
    const userPath =
      normalizedPath === path.sep || normalizedPath === "."
        ? ""
        : normalizedPath.replace(/^[/\\]+/, "");
    if (userPath.split(/[\\/]+/).includes("..")) {
      return res.status(400).json({ error: "Invalid path: traversal detected" });
    }

    const validPath = path.resolve(root, userPath);
    if (!isWithinRoot(root, validPath)) {
      return res.status(400).json({ error: "Invalid path: traversal detected" });
    }

    if (isSensitivePath(validPath)) {
      return res.status(403).json({ error: "Access to this path is not allowed" });
    }

    // Check if exists
    if (!(await fs.pathExists(validPath))) {
      return res.status(404).json({ error: "Path not found" });
    }

    const [realRoot, realPath] = await Promise.all([fs.realpath(root), fs.realpath(validPath)]);
    if (
      realRoot === path.parse(realRoot).root ||
      !isWithinRoot(realRoot, realPath) ||
      isSensitivePath(realPath)
    ) {
      return res.status(403).json({ error: "Access to this path is not allowed" });
    }

    const stats = await fs.stat(validPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: "Path is not a directory" });
    }

    const files = await fs.readdir(validPath, { withFileTypes: true });

    // Format output using root-relative virtual paths so subsequent requests
    // are consistent across platforms and do not expose host absolute paths.
    const items = files.map((f: import("node:fs").Dirent) => ({
      name: f.name,
      path: toVirtualPath(root, path.join(validPath, f.name)),
      isDirectory: f.isDirectory(),
      size: 0, // Getting size for all files might be slow
    }));

    // Sort: Directories first, then files
    items.sort(sortDirents);

    return res.json({
      root,
      path: toVirtualPath(root, validPath),
      parent: validPath === root ? null : toVirtualPath(root, path.dirname(validPath)),
      items,
    });
  } catch (error) {
    logger.error({ error }, "File browser error");
    return res.status(500).json({ error: "Internal server error" });
  }
});
