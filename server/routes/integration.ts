import { Router, type Request, type Response } from "express";
import { createReadStream, promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { createHash } from "node:crypto";
import { storage } from "../storage.js";
import { routesLogger as logger } from "../logger.js";
import { igdbClient, type CatalogSearchCursor } from "../igdb.js";
import { checkAutoSearch, withGameOperationLock } from "../cron.js";
import { DownloaderManager } from "../downloaders/manager.js";
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
const MAX_CATALOG_RESULTS = 50;
const INTERRUPTED_HANDOFF_MESSAGE =
  "Questarr restarted during a download handoff. Check the download client's queue and history before retrying.";

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

const seerrVariantSchema = z.object({
  operatingSystem: z.enum(["windows", "linux", "macos"]),
  architecture: z.enum(["x64", "arm64", "x86", "universal"]),
});

const seerrRequestIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(
    (value) =>
      !Array.from(value).some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
      )
  );

const catalogLimitSchema = z.coerce.number().int().min(1).max(MAX_CATALOG_RESULTS).default(20);
const catalogCursorSchema = z.object({
  queryHash: z.string().regex(/^[a-f0-9]{64}$/),
  approach: z.number().int().min(0).max(3),
  offset: z.number().int().min(0).max(10000),
  seenIds: z.array(z.number().int().positive()).max(1000),
});
const catalogQueryHash = (query: string) => createHash("sha256").update(query).digest("hex");
const parseCatalogPlatformIds = (value: unknown): number[] | null => {
  if (value === undefined) return [];
  if (typeof value !== "string" || !/^[0-9,]{1,600}$/.test(value)) return null;
  const ids = value.split(",").map(Number);
  return ids.length <= 100 && ids.every((id) => Number.isSafeInteger(id) && id > 0)
    ? [...new Set(ids)].sort((a, b) => a - b)
    : null;
};
const catalogSearchIdentity = (query: string, platformIds: number[]) =>
  `${query}:${platformIds.join(",")}`;
const parseCatalogCursor = (
  value: unknown,
  query: string
): CatalogSearchCursor | null | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,20000}$/.test(value)) return null;
  try {
    const parsed = catalogCursorSchema.safeParse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    );
    if (!parsed.success || parsed.data.queryHash !== catalogQueryHash(query)) return null;
    return {
      approach: parsed.data.approach,
      offset: parsed.data.offset,
      seenIds: parsed.data.seenIds,
    };
  } catch {
    return null;
  }
};
const encodeCatalogCursor = (cursor: CatalogSearchCursor, query: string): string =>
  Buffer.from(JSON.stringify({ ...cursor, queryHash: catalogQueryHash(query) })).toString(
    "base64url"
  );

const seerrGameSchema = (value: unknown) => {
  const game = igdbClient.formatGameData(value as Parameters<typeof igdbClient.formatGameData>[0]);
  return {
    id: `igdb-${String(game.igdbId)}`,
    igdbId: Number(game.igdbId),
    title: String(game.title ?? ""),
    summary: String(game.summary ?? ""),
    coverUrl: String(game.coverUrl ?? ""),
    releaseDate: String(game.releaseDate ?? ""),
    platforms: Array.isArray(game.platforms) ? game.platforms : [],
    platformOptions: Array.isArray(game.platformOptions) ? game.platformOptions : [],
    genres: Array.isArray(game.genres) ? game.genres : [],
  };
};

const seerrGameDetailSchema = (value: unknown) => {
  const game = igdbClient.formatGameData(value as Parameters<typeof igdbClient.formatGameData>[0]);
  const source = value as { videos?: Array<{ name?: string; video_id?: string }> };
  return {
    ...seerrGameSchema(value),
    rating: typeof game.rating === "number" ? game.rating : null,
    publishers: Array.isArray(game.publishers) ? game.publishers.slice(0, 20) : [],
    developers: Array.isArray(game.developers) ? game.developers.slice(0, 20) : [],
    screenshots: Array.isArray(game.screenshots) ? game.screenshots.slice(0, 12) : [],
    videos: (Array.isArray(source.videos) ? source.videos : [])
      .filter(
        (video) =>
          video && typeof video.video_id === "string" && /^[A-Za-z0-9_-]{11}$/.test(video.video_id)
      )
      .slice(0, 6)
      .map((video) => ({ name: String(video.name ?? "").slice(0, 120), videoId: video.video_id })),
  };
};

const findSeerrGame = async (userId: string, externalRequestId: string) =>
  (await storage.getUserGames(userId, true)).find(
    (game) => game.seerrExternalRequestId === externalRequestId
  );

const isContainedPath = (candidate: string, root: string): boolean =>
  candidate === root || candidate.startsWith(`${root.replace(/[\\/]+$/, "")}${path.sep}`);

const getSeerrAssets = async (userId: string, gameId: string) => {
  const [files, config] = await Promise.all([
    storage.getGameFiles(gameId),
    storage.getImportConfig(userId),
  ]);
  let libraryRoot: string;
  try {
    libraryRoot = await fs.realpath(config.libraryRoot);
  } catch {
    return [];
  }

  const assets = [];
  for (const file of files.slice(0, 100)) {
    try {
      const realPath = await fs.realpath(file.filePath);
      if (!isContainedPath(realPath, libraryRoot)) continue;
      const stats = await fs.stat(realPath);
      if (!stats.isFile()) continue;
      assets.push({
        id: file.id,
        name: path.basename(file.originalName || file.storedName || realPath),
        size: stats.size,
        path: realPath,
      });
    } catch {
      // A stale import row or a removed file is not a deliverable asset.
    }
  }
  return assets;
};

const getSeerrRequest = async (userId: string, externalRequestId: string) => {
  const game = await findSeerrGame(userId, externalRequestId);
  if (!game) return undefined;

  const [assets, downloads] = await Promise.all([
    getSeerrAssets(userId, game.id),
    storage.getDownloadsByGameId(game.id),
  ]);
  const latestDownload = [...downloads].sort(
    (a, b) => (b.addedAt?.getTime() ?? 0) - (a.addedAt?.getTime() ?? 0)
  )[0];
  const downloadStatus = latestDownload?.status.toLowerCase() ?? "";
  let status:
    "accepted" | "searching" | "downloading" | "importing" | "available" | "failed" | "cancelled";
  if (game.seerrCancelled || game.status === "shelved") {
    status = "cancelled";
  } else if (["owned", "playing", "completed"].includes(game.status) || assets.length > 0) {
    status = "available";
  } else if (game.seerrRecoveryRequired) {
    status = "failed";
  } else if (["unpacking", "importing", "manual_review_required"].includes(downloadStatus)) {
    status = "importing";
  } else if (["downloading", "queued", "paused"].includes(downloadStatus)) {
    status = "downloading";
  } else if (["failed", "error", "import-failed"].includes(downloadStatus)) {
    status = "failed";
  } else if (game.status === "downloading") {
    status = "downloading";
  } else if (game.seerrDispatching) {
    status = "searching";
  } else if (game.searchResultsAvailable) {
    status = "searching";
  } else if (game.status === "wanted") {
    status = "failed";
  } else {
    status = "accepted";
  }

  return {
    externalRequestId,
    status,
    deliverable: assets.length > 0,
    error:
      status === "failed"
        ? game.seerrRecoveryRequired
          ? INTERRUPTED_HANDOFF_MESSAGE
          : (latestDownload?.errorMessage ?? "No usable release was found.")
        : null,
    title: game.title,
    game: { id: game.id, title: game.title, status: game.status },
    variant: game.seerrVariant ?? undefined,
  };
};

// ── SeerrNG software-provider contract ──────────────────────────────────────
// This is intentionally separate from the general integration API above. It
// is versioned because SeerrNG persists the external request identity and
// expects provider-side retry and asset routes to remain idempotent.
integrationRouter.get("/seerrng/v1/ping", (_req: Request, res: Response) => {
  res.json({ service: "questarr", apiVersion: 1, requestContractVersion: 1 });
});

integrationRouter.get("/seerrng/v1/catalog/search", async (req: Request, res: Response) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const limit = catalogLimitSchema.safeParse(req.query.limit ?? 20);
  if (!query || query.length > 200 || !limit.success) {
    return res.status(400).json({ error: "A valid search query and limit are required." });
  }
  try {
    return res.json((await igdbClient.searchGames(query, limit.data)).map(seerrGameSchema));
  } catch (error) {
    logger.error({ error }, "SeerrNG catalog search failed");
    return res.status(502).json({ error: "IGDB catalog search failed." });
  }
});

integrationRouter.get("/seerrng/v1/catalog/search-page", async (req: Request, res: Response) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const limit = catalogLimitSchema.safeParse(req.query.limit ?? 20);
  const platformIds = parseCatalogPlatformIds(req.query.platformIds);
  const identity = catalogSearchIdentity(query, platformIds ?? []);
  const cursor = parseCatalogCursor(req.query.cursor, identity);
  if (!query || query.length > 200 || !limit.success || cursor === null || platformIds === null) {
    return res.status(400).json({ error: "A valid search query, limit, and cursor are required." });
  }
  try {
    const page = await igdbClient.searchCatalogPage(query, limit.data, cursor, platformIds);
    return res.json({
      results: page.results.map(seerrGameSchema),
      nextCursor: page.cursor ? encodeCatalogCursor(page.cursor, identity) : null,
    });
  } catch (error) {
    logger.error({ error }, "SeerrNG paged catalog search failed");
    return res.status(502).json({ error: "IGDB catalog search failed." });
  }
});

integrationRouter.get("/seerrng/v1/catalog/popular", async (req: Request, res: Response) => {
  const limit = catalogLimitSchema.safeParse(req.query.limit ?? 20);
  if (!limit.success) return res.status(400).json({ error: "Invalid result limit." });
  try {
    return res.json((await igdbClient.getPopularGames(limit.data)).map(seerrGameSchema));
  } catch (error) {
    logger.error({ error }, "SeerrNG popular catalog fetch failed");
    return res.status(502).json({ error: "IGDB catalog is unavailable." });
  }
});

integrationRouter.get("/seerrng/v1/catalog/popular-page", async (req: Request, res: Response) => {
  const limit = catalogLimitSchema.safeParse(req.query.limit ?? 20);
  const offset = z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .safeParse(req.query.offset ?? 0);
  const platformIds = parseCatalogPlatformIds(req.query.platformIds);
  if (!limit.success || !offset.success || platformIds === null) {
    return res
      .status(400)
      .json({ error: "A valid result limit, offset, and platform list are required." });
  }
  try {
    if (platformIds.length === 0) {
      const games = await igdbClient.getPopularGames(limit.data + 1, offset.data);
      return res.json({
        results: games.slice(0, limit.data).map(seerrGameSchema),
        nextOffset:
          games.length > limit.data && offset.data + limit.data <= 10000
            ? offset.data + limit.data
            : null,
      });
    }

    const allowedPlatforms = new Set(platformIds);
    const games = [];
    let currentOffset = offset.data;
    let hasMore = false;
    for (let batch = 0; batch < 8 && currentOffset <= 10000; batch++) {
      const take = limit.data - games.length;
      const raw = await igdbClient.getPopularGames(take, currentOffset);
      currentOffset += raw.length;
      games.push(
        ...raw.filter((game) =>
          game.platforms?.some((platform) => allowedPlatforms.has(platform.id))
        )
      );
      hasMore = raw.length === take;
      if (!hasMore || games.length >= limit.data) break;
    }
    return res.json({
      results: games.map(seerrGameSchema),
      nextOffset: hasMore && currentOffset <= 10000 ? currentOffset : null,
    });
  } catch (error) {
    logger.error({ error }, "SeerrNG paged popular catalog fetch failed");
    return res.status(502).json({ error: "IGDB catalog is unavailable." });
  }
});

integrationRouter.get("/seerrng/v1/catalog/platforms", async (_req: Request, res: Response) => {
  try {
    return res.json(await igdbClient.getPlatforms());
  } catch (error) {
    logger.error({ error }, "SeerrNG platform catalog fetch failed");
    return res.status(502).json({ error: "IGDB platform catalog is unavailable." });
  }
});

integrationRouter.get("/seerrng/v1/catalog/games/:igdbId", async (req: Request, res: Response) => {
  const igdbId = Number(req.params.igdbId);
  if (!Number.isSafeInteger(igdbId) || igdbId <= 0) {
    return res.status(400).json({ error: "Invalid IGDB game ID." });
  }
  try {
    const game = await igdbClient.getGameById(igdbId, true);
    return game
      ? res.json(seerrGameDetailSchema(game))
      : res.status(404).json({ error: "Game not found." });
  } catch (error) {
    logger.error({ error, igdbId }, "SeerrNG catalog game fetch failed");
    return res.status(502).json({ error: "IGDB catalog is unavailable." });
  }
});

integrationRouter.get("/seerrng/v1/library/lookup", async (req: Request, res: Response) => {
  const igdbIds = parseCatalogPlatformIds(req.query.igdbIds);
  if (!igdbIds || igdbIds.length === 0) {
    return res.status(400).json({ error: "Provide up to 100 IGDB IDs." });
  }
  try {
    const games = await storage.getUserGamesByIgdbIds(req.user!.id, igdbIds);
    const filterFlags = await getContentFilterFlags(req.user!.id);
    const visibleGames = excludeFilteredContent(games, filterFlags);
    return res.json({
      games: visibleGames.map((game) => ({ igdbId: game.igdbId, status: game.status })),
    });
  } catch (error) {
    logger.error({ error }, "SeerrNG library lookup failed");
    return res.status(500).json({ error: "Library lookup failed." });
  }
});

const seerrCreateRequestSchema = z.object({
  externalRequestId: seerrRequestIdSchema,
  title: z.string().trim().min(1).max(500),
  igdbId: z.number().int().positive().optional(),
  variant: seerrVariantSchema,
});

integrationRouter.post("/seerrng/v1/requests", async (req: Request, res: Response) => {
  const parsed = seerrCreateRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid software request payload." });
  const { externalRequestId, title, igdbId, variant } = parsed.data;
  try {
    const existing = await findSeerrGame(req.user!.id, externalRequestId);
    if (existing) {
      const current = await getSeerrRequest(req.user!.id, externalRequestId);
      return res.status(200).json(current);
    }

    const result = await quickAddGameByTitle(req.user!.id, title, {
      status: "wanted",
      source: "api",
      ...(igdbId ? { igdbId } : {}),
      seerrExternalRequestId: externalRequestId,
      seerrVariant: variant,
    });
    if (result.outcome === "not_found") {
      return res.status(404).json({ error: "No matching PC game was found." });
    }
    if (result.outcome === "duplicate") {
      return res.status(409).json({ error: "Game is already linked to another request." });
    }
    if (!result.game.seerrCancelled && result.game.status === "wanted") {
      await checkAutoSearch({ userId: req.user!.id, gameId: result.game.id, force: true });
    }
    return res.status(201).json(await getSeerrRequest(req.user!.id, externalRequestId));
  } catch (error) {
    logger.error({ error, externalRequestId }, "SeerrNG software request failed");
    return res.status(500).json({ error: "Software request could not be started." });
  }
});

integrationRouter.get(
  "/seerrng/v1/requests/:externalRequestId",
  async (req: Request, res: Response) => {
    const externalRequestId = seerrRequestIdSchema.safeParse(req.params.externalRequestId);
    if (!externalRequestId.success) return res.status(400).json({ error: "Invalid request ID." });
    try {
      const request = await getSeerrRequest(req.user!.id, externalRequestId.data);
      return request ? res.json(request) : res.status(404).json({ error: "Request not found." });
    } catch (error) {
      logger.error({ error }, "SeerrNG software request status failed");
      return res.status(500).json({ error: "Request status is unavailable." });
    }
  }
);

integrationRouter.post(
  "/seerrng/v1/requests/:externalRequestId/retry",
  async (req: Request, res: Response) => {
    const externalRequestId = seerrRequestIdSchema.safeParse(req.params.externalRequestId);
    if (!externalRequestId.success) return res.status(400).json({ error: "Invalid request ID." });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (
      "confirmNoExistingDownload" in body &&
      typeof body.confirmNoExistingDownload !== "boolean"
    ) {
      return res.status(400).json({ error: "Invalid retry confirmation." });
    }
    const confirmNoExistingDownload = body.confirmNoExistingDownload === true;
    try {
      const game = await findSeerrGame(req.user!.id, externalRequestId.data);
      if (!game) return res.status(404).json({ error: "Request not found." });
      let retryError: { status: number; error: string } | undefined;
      let confirmationRequired = false;
      await withGameOperationLock(game.id, async () => {
        const currentGame = await storage.getGame(game.id);
        if (!currentGame) {
          retryError = { status: 404, error: "Request not found." };
          return;
        }
        if (currentGame.seerrCancelled || currentGame.status === "shelved") {
          retryError = { status: 409, error: "Cancelled requests cannot be retried." };
          return;
        }
        if (currentGame.seerrDispatching) {
          retryError = {
            status: 409,
            error: "Another acquisition or cancellation operation is in progress.",
          };
          return;
        }
        if (currentGame.seerrRecoveryRequired && !confirmNoExistingDownload) {
          confirmationRequired = true;
          return;
        }
        const assets = await getSeerrAssets(req.user!.id, currentGame.id);
        if (["owned", "playing", "completed"].includes(currentGame.status) || assets.length > 0) {
          retryError = { status: 409, error: "The game is already available." };
          return;
        }
        await storage.updateGame(currentGame.id, {
          status: "wanted",
          seerrRecoveryRequired: false,
          searchResultsAvailable: false,
        });
      });
      if (retryError) return res.status(retryError.status).json({ error: retryError.error });
      if (confirmationRequired) {
        return res.status(409).json({
          confirmationRequired: "confirmNoExistingDownload",
          error: INTERRUPTED_HANDOFF_MESSAGE,
        });
      }
      await checkAutoSearch({ userId: req.user!.id, gameId: game.id, force: true });
      return res.json(await getSeerrRequest(req.user!.id, externalRequestId.data));
    } catch (error) {
      logger.error({ error }, "SeerrNG software request retry failed");
      return res.status(500).json({ error: "Request could not be retried." });
    }
  }
);

integrationRouter.post(
  "/seerrng/v1/requests/:externalRequestId/cancel",
  async (req: Request, res: Response) => {
    const externalRequestId = seerrRequestIdSchema.safeParse(req.params.externalRequestId);
    if (!externalRequestId.success) return res.status(400).json({ error: "Invalid request ID." });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (
      "confirmNoExistingDownload" in body &&
      typeof body.confirmNoExistingDownload !== "boolean"
    ) {
      return res.status(400).json({ error: "Invalid cancellation confirmation." });
    }
    const confirmNoExistingDownload = body.confirmNoExistingDownload === true;
    try {
      const game = await findSeerrGame(req.user!.id, externalRequestId.data);
      if (!game) return res.status(404).json({ error: "Request not found." });
      return await withGameOperationLock(game.id, async () => {
        const currentGame = await storage.getGame(game.id);
        if (!currentGame) return res.status(404).json({ error: "Request not found." });
        if (currentGame.seerrCancelled)
          return res.json(await getSeerrRequest(req.user!.id, externalRequestId.data));
        if (currentGame.seerrRecoveryRequired && !confirmNoExistingDownload) {
          return res.status(409).json({
            confirmationRequired: "confirmNoExistingDownload",
            error: INTERRUPTED_HANDOFF_MESSAGE,
          });
        }

        const assets = await getSeerrAssets(req.user!.id, currentGame.id);
        if (["owned", "playing", "completed"].includes(currentGame.status) || assets.length > 0) {
          return res.status(409).json({ error: "An available game cannot be cancelled." });
        }
        if (
          !(await storage.claimSeerrOperation(currentGame.id, {
            allowRecovery: confirmNoExistingDownload,
          }))
        ) {
          return res.status(409).json({
            error: "Another acquisition or cancellation operation is in progress.",
          });
        }

        try {
          const downloads = await storage.getDownloadsByGameId(currentGame.id);
          const terminalDownloadStatuses = new Set([
            "completed",
            "imported",
            "manual_review_required",
            "cancelled",
            "failed",
            "error",
          ]);
          const activeDownloads = downloads.filter(
            (download) => !terminalDownloadStatuses.has(download.status.toLowerCase())
          );
          if (
            currentGame.status === "downloading" &&
            activeDownloads.length === 0 &&
            !currentGame.seerrRecoveryRequired
          ) {
            return res.status(409).json({
              error:
                "Questarr reports an active download but cannot identify a tracked download to stop.",
            });
          }
          if (
            activeDownloads.some(
              (download) => download.seerrExternalRequestId !== externalRequestId.data
            )
          ) {
            return res.status(409).json({
              error:
                "An active download is not safely linked to this request. Stop it in the download client before cancelling.",
            });
          }
          if (
            activeDownloads.some((download) => download.downloadHash.startsWith("questarr-add-"))
          ) {
            return res.status(409).json({
              error:
                "The download client is still confirming this download. Try cancelling again after its tracking ID is available.",
            });
          }
          for (const download of activeDownloads) {
            const downloader = await storage.getDownloader(download.downloaderId);
            if (!downloader)
              return res
                .status(409)
                .json({ error: "The active download client is no longer configured." });
            const removed = await DownloaderManager.removeDownload(
              downloader,
              download.downloadHash,
              false
            );
            if (!removed.success)
              return res.status(502).json({ error: "The active download could not be cancelled." });
            await storage.updateGameDownloadStatus(
              download.id,
              "cancelled",
              "Cancelled through SeerrNG."
            );
          }
          await storage.finishSeerrOperation(currentGame.id, {
            status: "shelved",
            seerrCancelled: true,
            seerrRecoveryRequired: false,
            searchResultsAvailable: false,
          });
          return res.json(await getSeerrRequest(req.user!.id, externalRequestId.data));
        } finally {
          await storage.finishSeerrOperation(currentGame.id);
        }
      });
    } catch (error) {
      logger.error({ error }, "SeerrNG software request cancellation failed");
      return res.status(500).json({ error: "Request could not be cancelled." });
    }
  }
);

integrationRouter.get(
  "/seerrng/v1/requests/:externalRequestId/assets",
  async (req: Request, res: Response) => {
    const externalRequestId = seerrRequestIdSchema.safeParse(req.params.externalRequestId);
    if (!externalRequestId.success) return res.status(400).json({ error: "Invalid request ID." });
    const game = await findSeerrGame(req.user!.id, externalRequestId.data);
    if (!game) return res.status(404).json({ error: "Request not found." });
    try {
      const assets = await getSeerrAssets(req.user!.id, game.id);
      return res.json({
        assets: assets.map(({ id, name, size }) => ({ id, name, size, url: "" })),
        bundleSupported: false,
      });
    } catch (error) {
      logger.error({ error }, "SeerrNG software assets lookup failed");
      return res.status(500).json({ error: "Assets are unavailable." });
    }
  }
);

integrationRouter.get(
  "/seerrng/v1/requests/:externalRequestId/assets/:assetId",
  async (req: Request, res: Response) => {
    const externalRequestId = seerrRequestIdSchema.safeParse(req.params.externalRequestId);
    const assetId = z.string().min(1).max(256).safeParse(req.params.assetId);
    if (!externalRequestId.success || !assetId.success)
      return res.status(400).json({ error: "Invalid asset request." });
    const game = await findSeerrGame(req.user!.id, externalRequestId.data);
    if (!game) return res.status(404).json({ error: "Request not found." });
    try {
      const asset = (await getSeerrAssets(req.user!.id, game.id)).find(
        (item) => item.id === assetId.data
      );
      if (!asset) return res.status(404).json({ error: "Asset not found." });
      const size = asset.size;
      let start = 0;
      let end = size - 1;
      let statusCode = 200;
      const range = req.header("Range");
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || size === 0) {
          res.set("Content-Range", `bytes */${size}`);
          return res.status(416).end();
        }
        if (!match[1]) {
          const suffix = Number(match[2]);
          if (!suffix) {
            res.set("Content-Range", `bytes */${size}`);
            return res.status(416).end();
          }
          start = Math.max(0, size - suffix);
        } else {
          start = Number(match[1]);
          if (match[2]) end = Math.min(size - 1, Number(match[2]));
        }
        if (!Number.isSafeInteger(start) || start < 0 || start >= size || end < start) {
          res.set("Content-Range", `bytes */${size}`);
          return res.status(416).end();
        }
        statusCode = 206;
        res.set("Content-Range", `bytes ${start}-${end}/${size}`);
      }
      res.set({
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
      });
      const stream = createReadStream(asset.path, { start, end });
      stream.on("error", (error) => {
        logger.warn({ error }, "SeerrNG asset stream failed");
        if (!res.headersSent) res.status(404).end();
        else res.destroy(error);
      });
      return stream.pipe(res.status(statusCode));
    } catch (error) {
      logger.error({ error }, "SeerrNG software asset stream failed");
      return res.status(500).json({ error: "Asset could not be streamed." });
    }
  }
);

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
    genres: game.genres ?? [],
    libraryPath: game.libraryPath,
    addedAt: game.addedAt,
  };
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
