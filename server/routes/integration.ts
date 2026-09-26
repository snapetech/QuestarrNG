import { Router, type Request, type Response } from "express";
import { constants, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { storage } from "../storage.js";
import { routesLogger as logger } from "../logger.js";
import { normalizeTitle } from "../../shared/title-utils.js";
import { quickAddGameByTitle } from "../game-quick-add.js";
// Relative path, not the "@shared" alias — see the comment in
// game-quick-add.ts.
import { GAME_STATUSES, type Game } from "../../shared/schema.js";
import { getContentFilterFlags, excludeFilteredContent } from "../content-filter.js";

const { version: APP_VERSION } = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8")
) as { version: string };

/**
 * Version of the integration contract itself, bumped when a change would break
 * an already-released extension. Clients check it during the ping handshake so
 * a mismatched pair fails loudly instead of misbehaving halfway through a sync.
 */
export const INTEGRATION_API_VERSION = 1;

/** Upper bound on a single library sync payload, to keep one request bounded. */
const MAX_SYNC_GAMES = 5000;
const seerrDispatchQueues = new Map<string, Promise<void>>();

export const integrationRouter = Router();

// Every route below runs behind authenticateApiKeyOrToken, so req.user is
// always populated; this guard is defence-in-depth against a future mount that
// forgets the middleware.
integrationRouter.use((req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Every response here varies by req.user (auth status, library contents),
  // so it must never be cached by a shared proxy or the client's HTTP cache.
  res.set("Cache-Control", "no-store");
  return next();
});

/** The library shape handed to external clients — a stable subset of Game. */
function toIntegrationGame(game: Game) {
  return {
    id: game.id,
    title: game.title,
    igdbId: game.igdbId,
    steamAppId: game.steamAppId,
    status: game.status,
    releaseStatus: game.releaseStatus,
    releaseDate: game.releaseDate,
    coverUrl: game.coverUrl,
    platforms: game.platforms ?? [],
    variant: {
      operatingSystem: game.targetOperatingSystem,
      architecture: game.targetArchitecture,
    },
    genres: game.genres ?? [],
    libraryPath: game.libraryPath,
    addedAt: game.addedAt,
  };
}

type IntegrationAsset = {
  id: string;
  name: string;
  size: number;
  filePath: string;
};

type SeerrVariant = {
  operatingSystem: "windows" | "linux" | "macos";
  architecture: "x64" | "arm64" | "x86" | "universal";
};

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  );
}

async function getDeliverableAssets(userId: string, gameId: string): Promise<IntegrationAsset[]> {
  const config = await storage.getImportConfig(userId);
  let root: string;
  try {
    root = await fs.realpath(config.libraryRoot);
  } catch {
    return [];
  }

  const records = await storage.getGameFiles(gameId);
  const assets: IntegrationAsset[] = [];
  for (const file of records) {
    try {
      const reported = path.isAbsolute(file.filePath)
        ? file.filePath
        : path.resolve(root, file.filePath);
      const lexical = path.resolve(reported);
      if (!isWithin(root, lexical)) continue;
      const [canonical, linkInfo] = await Promise.all([
        fs.realpath(lexical),
        fs.lstat(lexical),
      ]);
      if (linkInfo.isSymbolicLink() || !isWithin(root, canonical)) continue;
      const stat = await fs.stat(canonical);
      if (!stat.isFile()) continue;
      assets.push({
        id: file.id,
        name: path.basename(file.storedName || file.originalName),
        size: stat.size,
        filePath: canonical,
      });
    } catch {
      // A stale, missing, or unreadable file is not a deliverable asset.
    }
  }
  return assets;
}

async function toSeerrRequestView(
  userId: string,
  row: NonNullable<Awaited<ReturnType<typeof storage.getIntegrationRequest>>>
) {
  let status = row.status;
  let downloadId = row.downloadId;
  let game: Game | undefined;
  let assets: IntegrationAsset[] = [];

  if (row.gameId) {
    game = await storage.getGame(row.gameId);
    if (!game || game.userId !== userId) {
      return null;
    }
    assets = await getDeliverableAssets(userId, game.id);
    if (assets.length > 0) {
      status = "available";
    } else if (row.errorMessage) {
      status = "failed";
    } else {
      const downloads = await storage.getDownloadsByGameId(game.id);
      const attemptedAt = new Date(row.attemptedAt ?? row.createdAt ?? 0).getTime();
      const matchingDownloads = row.downloadId
        ? downloads.filter((download) => download.id === row.downloadId)
        : downloads.filter(
            (download) => new Date(download.addedAt ?? 0).getTime() >= attemptedAt
          );
      const latestAttempt = matchingDownloads.sort(
        (a, b) => new Date(b.addedAt ?? 0).getTime() - new Date(a.addedAt ?? 0).getTime()
      )[0];
      const latestActive =
        game.status === "downloading"
          ? downloads
              .filter((download) =>
                [
                  "downloading",
                  "paused",
                  "unpacking",
                  "completed_pending_import",
                  "manual_review_required",
                ].includes(download.status)
              )
              .sort(
                (a, b) =>
                  new Date(b.addedAt ?? 0).getTime() - new Date(a.addedAt ?? 0).getTime()
              )[0]
          : undefined;
      const latest = latestAttempt ?? latestActive;
      if (latest && !downloadId) downloadId = latest.id;
      if (latest?.status === "failed") status = "failed";
      else if (
        ["unpacking", "completed_pending_import", "manual_review_required"].includes(
          latest?.status ?? ""
        )
      ) {
        status = "importing";
      } else if (["downloading", "paused"].includes(latest?.status ?? "")) {
        status = "downloading";
      } else if (game.status === "wanted") status = "searching";
      else status = "failed";
    }
  }

  if (status !== row.status || downloadId !== row.downloadId) {
    await storage.updateIntegrationRequest(userId, row.externalRequestId, { status, downloadId });
  }

  return {
    externalRequestId: row.externalRequestId,
    title: row.title,
    variant: {
      operatingSystem: row.operatingSystem,
      architecture: row.architecture,
    },
    game: game ? { id: game.id, title: game.title, status: game.status } : null,
    status,
    deliverable: assets.length > 0,
    error: status === "failed" ? row.errorMessage ?? "The request could not be completed." : null,
  };
}

function contentDisposition(filename: string): string {
  const safe = path.basename(filename).replace(/[\r\n"\\]/g, "_").replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(path.basename(filename));
  return `attachment; filename="${safe || "download"}"; filename*=UTF-8''${encoded}`;
}

async function withSeerrDispatchLock<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = seerrDispatchQueues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  seerrDispatchQueues.set(key, current);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (seerrDispatchQueues.get(key) === current) {
      seerrDispatchQueues.delete(key);
    }
  }
}

// ── Handshake ────────────────────────────────────────────────────────────────
// Lets an extension verify its URL and credential in one call before doing any
// real work, and surfaces the version pair in its own logs.
integrationRouter.get("/ping", (req: Request, res: Response) => {
  res.json({
    service: "questarr",
    version: APP_VERSION,
    apiVersion: INTEGRATION_API_VERSION,
    authenticatedAs: { id: req.user!.id, username: req.user!.username },
    usingApiKey: Boolean(req.apiKeyId),
  });
});

const seerrRequestSchema = z
  .object({
    externalRequestId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_.:-]+$/),
    title: z.string().trim().min(1).max(500),
    variant: z
      .object({
        operatingSystem: z.enum(["windows", "linux", "macos"]),
        architecture: z.enum(["x64", "arm64", "x86", "universal"]).default("x64"),
      })
      .strict(),
  })
  .strict();

async function dispatchSeerrRequest(
  userId: string,
  externalRequestId: string,
  title: string,
  variant: SeerrVariant
): Promise<{ game?: Game; error?: string }> {
  const result = await quickAddGameByTitle(userId, title, { status: "wanted", source: "api" });
  if (result.outcome === "not_found") {
    await storage.updateIntegrationRequest(userId, externalRequestId, {
      status: "failed",
      errorMessage: "No matching game was found in the QuestarrNG catalog.",
    });
    return { error: "No matching game was found in the QuestarrNG catalog." };
  }

  const game = result.game;
  if (
    (game.targetOperatingSystem && game.targetOperatingSystem !== variant.operatingSystem) ||
    (game.targetArchitecture && game.targetArchitecture !== variant.architecture)
  ) {
    const error = "This game is already tracked with a different platform variant.";
    await storage.updateIntegrationRequest(userId, externalRequestId, {
      status: "failed",
      errorMessage: error,
    });
    return { error };
  }

  const currentAssets = await getDeliverableAssets(userId, game.id);
  if (
    result.outcome === "duplicate" &&
    !currentAssets.length &&
    !["wanted", "downloading"].includes(game.status)
  ) {
    const error = "This game is already in Questarr and has no verified downloadable files.";
    await storage.updateIntegrationRequest(userId, externalRequestId, {
      gameId: game.id,
      status: "failed",
      errorMessage: error,
    });
    return { error, game };
  }

  await storage.updateGame(game.id, {
    targetOperatingSystem: variant.operatingSystem,
    targetArchitecture: variant.architecture,
  });
  const refreshed = (await storage.getGame(game.id)) ?? game;
  await storage.updateIntegrationRequest(userId, externalRequestId, {
    gameId: refreshed.id,
    status: currentAssets.length
      ? "available"
      : refreshed.status === "downloading"
        ? "downloading"
        : "searching",
    errorMessage: null,
  });
  return { game: refreshed };
}

// Stable, user-scoped machine contract used by SeerrNG. The legacy v1 routes
// above and below remain unchanged for existing Playnite clients.
integrationRouter.get("/seerrng/v1/ping", (_req: Request, res: Response) => {
  res.json({ service: "QuestarrNG", apiVersion: 1, requestContractVersion: 1 });
});

integrationRouter.post("/seerrng/v1/requests", async (req: Request, res: Response) => {
  const parsed = seerrRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request payload", issues: parsed.error.issues });
  }
  const { externalRequestId, title, variant } = parsed.data;
  const userId = req.user!.id;

  try {
    let row = await storage.getIntegrationRequest(userId, externalRequestId);
    if (row) {
      if (
        row.title !== title ||
        row.operatingSystem !== variant.operatingSystem ||
        row.architecture !== variant.architecture
      ) {
        return res
          .status(409)
          .json({ error: "externalRequestId is already bound to a different request" });
      }
      if (row.gameId || row.status === "failed") {
        const request = await toSeerrRequestView(userId, row);
        return request
          ? res.status(200).json(request)
          : res.status(404).json({ error: "Request not found" });
      }
    } else {
      row = await storage.addIntegrationRequest({
        userId,
        externalRequestId,
        title,
        operatingSystem: variant.operatingSystem,
        architecture: variant.architecture,
        status: "accepted",
      });
      if (
        row.title !== title ||
        row.operatingSystem !== variant.operatingSystem ||
        row.architecture !== variant.architecture
      ) {
        return res
          .status(409)
          .json({ error: "externalRequestId is already bound to a different request" });
      }
    }

    const dispatched = await withSeerrDispatchLock(
      `${userId}:${normalizeTitle(title)}`,
      () => dispatchSeerrRequest(userId, externalRequestId, title, variant)
    );
    if (dispatched.error) {
      const failed = await storage.getIntegrationRequest(userId, externalRequestId);
      const request = failed ? await toSeerrRequestView(userId, failed) : null;
      return res.status(dispatched.game ? 409 : 404).json(request ?? { error: dispatched.error });
    }
    const updated = await storage.getIntegrationRequest(userId, externalRequestId);
    const request = updated ? await toSeerrRequestView(userId, updated) : null;
    return request
      ? res.status(202).json(request)
      : res.status(500).json({ error: "Request was not persisted" });
  } catch (error) {
    logger.error({ error, externalRequestId }, "SeerrNG request dispatch failed");
    await storage.updateIntegrationRequest(userId, externalRequestId, {
      status: "failed",
      errorMessage: "QuestarrNG could not start this request.",
    });
    return res.status(500).json({ error: "QuestarrNG could not start this request" });
  }
});

integrationRouter.post(
  "/seerrng/v1/requests/:externalRequestId/retry",
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const externalRequestId = req.params.externalRequestId;
    const row = await storage.getIntegrationRequest(userId, externalRequestId);
    if (!row) return res.status(404).json({ error: "Request not found" });
    if (row.status !== "failed") {
      return res.status(409).json({ error: "Only failed requests can be retried" });
    }

    await storage.updateIntegrationRequest(userId, externalRequestId, {
      status: "accepted",
      errorMessage: null,
      downloadId: null,
      attemptedAt: new Date(),
    });
    const result = await withSeerrDispatchLock(
      `${userId}:${normalizeTitle(row.title)}`,
      () =>
        dispatchSeerrRequest(userId, externalRequestId, row.title, {
          operatingSystem: row.operatingSystem as SeerrVariant["operatingSystem"],
          architecture: row.architecture as SeerrVariant["architecture"],
        })
    );
    const updated = await storage.getIntegrationRequest(userId, externalRequestId);
    const request = updated ? await toSeerrRequestView(userId, updated) : null;
    return result.error
      ? res.status(409).json(request ?? { error: result.error })
      : res.status(202).json(request);
  }
);

integrationRouter.get(
  "/seerrng/v1/requests/:externalRequestId",
  async (req: Request, res: Response) => {
    const row = await storage.getIntegrationRequest(req.user!.id, req.params.externalRequestId);
    if (!row) return res.status(404).json({ error: "Request not found" });
    const request = await toSeerrRequestView(req.user!.id, row);
    return request ? res.json(request) : res.status(404).json({ error: "Request not found" });
  }
);

integrationRouter.get(
  "/seerrng/v1/requests/:externalRequestId/assets",
  async (req: Request, res: Response) => {
    const row = await storage.getIntegrationRequest(req.user!.id, req.params.externalRequestId);
    if (!row) return res.status(404).json({ error: "Request not found" });
    const request = await toSeerrRequestView(req.user!.id, row);
    if (!request || !row.gameId || request.status !== "available") {
      return res.json({ assets: [], bundleSupported: false });
    }
    const assets = await getDeliverableAssets(req.user!.id, row.gameId);
    return res.json({
      assets: assets.map(({ id, name, size }) => ({
        id,
        name,
        size,
        url: `/api/integration/seerrng/v1/requests/${encodeURIComponent(row.externalRequestId)}/assets/${encodeURIComponent(id)}`,
      })),
      bundleSupported: false,
    });
  }
);

integrationRouter.get(
  "/seerrng/v1/requests/:externalRequestId/assets/:assetId",
  async (req: Request, res: Response) => {
    const row = await storage.getIntegrationRequest(req.user!.id, req.params.externalRequestId);
    if (!row?.gameId) return res.status(404).json({ error: "Asset not found" });
    const view = await toSeerrRequestView(req.user!.id, row);
    if (!view || view.status !== "available") return res.status(404).json({ error: "Asset not found" });
    const asset = (await getDeliverableAssets(req.user!.id, row.gameId)).find(
      (candidate) => candidate.id === req.params.assetId
    );
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
    try {
      handle = await fs.open(asset.filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      const stat = await handle.stat();
      if (!stat.isFile()) {
        await handle.close();
        return res.status(404).json({ error: "Asset not found" });
      }
      const size = stat.size;
      if (size === 0) {
        res.status(200).set({
          "Content-Type": "application/octet-stream",
          "Content-Length": "0",
          "Content-Disposition": contentDisposition(asset.name),
          "Cache-Control": "no-store",
          "Accept-Ranges": "bytes",
        });
        await handle.close();
        return res.end();
      }

      let start = 0;
      let end = size - 1;
      let statusCode = 200;
      const range = req.header("range");
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) {
          await handle.close();
          return res.status(416).set("Content-Range", `bytes */${size}`).end();
        }
        if (!match[1]) {
          const suffix = Number(match[2]);
          start = Math.max(0, size - suffix);
        } else {
          start = Number(match[1]);
          if (match[2]) end = Number(match[2]);
        }
        if (start >= size || end < start || end >= size) {
          await handle.close();
          return res.status(416).set("Content-Range", `bytes */${size}`).end();
        }
        statusCode = 206;
      }

      res.status(statusCode).set({
        "Content-Type": "application/octet-stream",
        "Content-Length": String(end - start + 1),
        "Content-Disposition": contentDisposition(asset.name),
        "Cache-Control": "no-store",
        "Accept-Ranges": "bytes",
        ...(statusCode === 206 ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
      });
      const stream = handle.createReadStream({ start, end, autoClose: true });
      stream.on("error", (error) => {
        logger.error({ error, assetId: asset.id }, "SeerrNG asset stream failed");
        if (!res.headersSent) res.status(500);
        res.destroy(error);
      });
      return stream.pipe(res);
    } catch (error) {
      await handle?.close().catch(() => undefined);
      logger.error({ error, assetId: req.params.assetId }, "SeerrNG asset could not be opened");
      if (!res.headersSent) return res.status(404).json({ error: "Asset not found" });
      return res.destroy(error as Error);
    }
  }
);

// ── Pull: Questarr library → external client ─────────────────────────────────
const libraryQuerySchema = z.object({
  // Rejects a malformed filter (e.g. "?status=,", "wanted,,owned", or an
  // unknown status) outright rather than silently degrading into "no filter"
  // or "matches nothing" — either of those would be a confusing way to fail.
  status: z
    .string()
    .trim()
    .min(1)
    .transform((v) => v.split(",").map((s) => s.trim()))
    .pipe(z.array(z.enum(GAME_STATUSES)).min(1))
    .optional(),
  includeHidden: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

integrationRouter.get("/library", async (req: Request, res: Response) => {
  try {
    const parsed = libraryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    const { status: statuses, includeHidden } = parsed.data;

    const games = await storage.getUserGames(req.user!.id, includeHidden, statuses);
    // Match /api/games' own behavior: a title the user filtered out (adult
    // content, age-restricted) must not leak through this endpoint either.
    const filterFlags = await getContentFilterFlags(req.user!.id);
    const visibleGames = excludeFilteredContent(games, filterFlags);
    return res.json({ games: visibleGames.map(toIntegrationGame), count: visibleGames.length });
  } catch (error) {
    logger.error({ error }, "Integration library fetch failed");
    return res.status(500).json({ error: "Failed to fetch library" });
  }
});

// ── Push: external library → Questarr ────────────────────────────────────────
const syncSchema = z.object({
  games: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(500),
        // Playnite's own game id, echoed back untouched so the extension can
        // correlate results with its library without re-matching by title.
        externalId: z.string().trim().max(200).optional(),
        installed: z.boolean().optional(),
        steamAppId: z.number().int().positive().optional(),
      })
    )
    .min(1)
    .max(MAX_SYNC_GAMES),
  // When true, a matched game that the client reports as installed is promoted
  // to "owned" in Questarr. Off by default: a sync should not rewrite library
  // state unless the user opted in.
  markInstalledAsOwned: z.boolean().optional().default(false),
});

integrationRouter.post("/library/sync", async (req: Request, res: Response) => {
  try {
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid sync payload", issues: parsed.error.issues });
    }
    const { games: incoming, markInstalledAsOwned } = parsed.data;
    const userId = req.user!.id;

    const library = await storage.getUserGames(userId, true);

    // Index the library once; a sync can carry thousands of titles and a linear
    // scan per entry would make this quadratic.
    const byNormalizedTitle = new Map<string, Game>();
    const bySteamAppId = new Map<number, Game>();
    for (const game of library) {
      const key = normalizeTitle(game.title);
      if (!byNormalizedTitle.has(key)) byNormalizedTitle.set(key, game);
      if (game.steamAppId) bySteamAppId.set(game.steamAppId, game);
    }

    const matched: Array<{
      externalId?: string | undefined;
      title: string;
      gameId: string;
      status: string;
    }> = [];
    const unmatched: Array<{ externalId?: string | undefined; title: string }> = [];
    const promoted: string[] = [];

    for (const entry of incoming) {
      const match =
        (entry.steamAppId ? bySteamAppId.get(entry.steamAppId) : undefined) ??
        byNormalizedTitle.get(normalizeTitle(entry.title));

      if (!match) {
        unmatched.push({ externalId: entry.externalId, title: entry.title });
        continue;
      }

      let status = match.status;
      if (markInstalledAsOwned && entry.installed && match.status === "wanted") {
        await storage.updateGameStatus(match.id, { status: "owned" });
        status = "owned";
        promoted.push(match.id);
      }

      matched.push({
        externalId: entry.externalId,
        title: entry.title,
        gameId: match.id,
        status,
      });
    }

    logger.info(
      {
        userId,
        received: incoming.length,
        matched: matched.length,
        unmatched: unmatched.length,
        promoted: promoted.length,
      },
      "Integration library sync"
    );

    return res.json({
      received: incoming.length,
      matched,
      unmatched,
      promotedToOwned: promoted.length,
    });
  } catch (error) {
    logger.error({ error }, "Integration library sync failed");
    return res.status(500).json({ error: "Library sync failed" });
  }
});

// ── Request a game from the couch ────────────────────────────────────────────
// Matches a free-text title against IGDB and adds it to the library. Adding it
// as "wanted" is what hands it to the existing auto-search pipeline, which
// searches indexers and sends the best release to the download client — so a
// single call from Playnite is enough to start a download.
const requestSchema = z.object({
  title: z.string().trim().min(1).max(500),
  status: z.enum(["wanted", "owned"]).optional().default("wanted"),
});

integrationRouter.post("/games/request", async (req: Request, res: Response) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid request payload", issues: parsed.error.issues });
    }
    const { title, status } = parsed.data;
    const userId = req.user!.id;

    // Shared with POST /api/games/match-and-add (the browser's own "quick
    // add" flow) so the two entry points can't drift on matching, content
    // filtering, or dedupe behavior.
    const result = await quickAddGameByTitle(userId, title, { status, source: "api" });

    switch (result.outcome) {
      case "not_found":
        // Deliberately indistinguishable from "no match": a filtered title
        // must not be discoverable through this endpoint either.
        return res.status(404).json({ error: "No game found on IGDB for this title" });
      case "duplicate":
        return res
          .status(409)
          .json({ error: "Game already in collection", game: toIntegrationGame(result.game) });
      case "added":
        logger.info(
          {
            userId,
            title: result.game.title,
            igdbId: result.game.igdbId,
            viaApiKey: Boolean(req.apiKeyId),
          },
          "Game requested through the integration API"
        );
        return res.status(201).json({ game: toIntegrationGame(result.game) });
    }

    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    logger.error({ error }, "Integration game request failed");
    return res.status(500).json({ error: "Failed to request game" });
  }
});
