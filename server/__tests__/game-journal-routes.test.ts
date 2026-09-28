import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  configDir: "",
  storage: {
    getGame: vi.fn(),
    getGameJournalEntries: vi.fn(),
    addGameJournalEntry: vi.fn(),
    deleteGameJournalEntry: vi.fn(),
    getGameMilestones: vi.fn(),
    addGameMilestone: vi.fn(),
    updateGameMilestone: vi.fn(),
    deleteGameMilestone: vi.fn(),
    getGameScreenshots: vi.fn(),
    addGameScreenshot: vi.fn(),
    updateGameScreenshotCaption: vi.fn(),
    deleteGameScreenshot: vi.fn(),
  },
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
  expressLogger: {
    warn: vi.fn(),
  },
}));

vi.mock("../storage.js", () => ({ storage: mocks.storage }));
vi.mock("../config-loader.js", () => ({
  configLoader: {
    getConfigDir: () => mocks.configDir,
    getSslConfig: () => ({
      enabled: false,
      port: 5000,
      certPath: "",
      keyPath: "",
      redirectHttp: false,
    }),
  },
}));
vi.mock("../logger.js", async () => {
  const actual = await vi.importActual<typeof import("../logger.js")>("../logger.js");
  return {
    ...actual,
    routesLogger: mocks.logger,
    expressLogger: mocks.expressLogger,
  };
});
vi.mock("../auth.js", () => ({
  authenticateToken: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: "user-1", username: "tester" };
    next();
  },
}));
vi.mock("../middleware.js", async () => {
  const actual = await vi.importActual<typeof import("../middleware.js")>("../middleware.js");
  return {
    ...actual,
    sensitiveEndpointLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

import { gameJournalRoutes } from "../game-journal-routes.js";

const GAME_ID = "00000000-0000-4000-8000-000000000001";
const ENTRY_ID = "00000000-0000-4000-8000-000000000002";
const MILESTONE_ID = "00000000-0000-4000-8000-000000000003";
const SCREENSHOT_ID = "00000000-0000-4000-8000-000000000004";
const PNG_IMAGE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64"
);

describe("game journal routes", () => {
  let app: express.Express;
  let configDir: string;

  beforeEach(async () => {
    vi.resetAllMocks();
    configDir = await fs.mkdtemp(path.join(os.tmpdir(), "questarr-game-journal-"));
    mocks.configDir = configDir;
    mocks.storage.getGame.mockResolvedValue({ id: GAME_ID, userId: "user-1" });
    mocks.storage.getGameJournalEntries.mockResolvedValue([]);
    mocks.storage.getGameMilestones.mockResolvedValue([]);
    mocks.storage.getGameScreenshots.mockResolvedValue([]);
    mocks.storage.addGameJournalEntry.mockImplementation(async (entry) => ({
      id: ENTRY_ID,
      ...entry,
    }));
    mocks.storage.addGameMilestone.mockImplementation(async (milestone) => ({
      id: MILESTONE_ID,
      completedAt: null,
      ...milestone,
    }));
    mocks.storage.updateGameMilestone.mockImplementation(async (id, _userId, completed) => ({
      id,
      label: "Beat the final boss",
      completedAt: completed ? new Date("2026-01-01T00:00:00.000Z") : null,
    }));
    mocks.storage.addGameScreenshot.mockImplementation(async (screenshot) => ({
      id: SCREENSHOT_ID,
      ...screenshot,
    }));
    mocks.storage.updateGameScreenshotCaption.mockImplementation(async (id, _userId, caption) => ({
      id,
      filePath: path.join(configDir, "screenshots", GAME_ID, "saved.png"),
      caption,
    }));

    app = express();
    app.use(express.json());
    app.use(gameJournalRoutes);
  });

  afterEach(async () => {
    await fs.rm(configDir, { recursive: true, force: true });
  });

  it("lists, creates, validates, and deletes journal entries", async () => {
    mocks.storage.getGameJournalEntries.mockResolvedValue([{ id: ENTRY_ID, note: "First run" }]);
    const list = await request(app).get(`/api/games/${GAME_ID}/journal`);
    expect(list.status).toBe(200);
    expect(list.body).toEqual([{ id: ENTRY_ID, note: "First run" }]);

    const created = await request(app)
      .post(`/api/games/${GAME_ID}/journal`)
      .send({ note: "  Clear!  " });
    expect(created.status).toBe(201);
    expect(mocks.storage.addGameJournalEntry).toHaveBeenCalledWith({
      gameId: GAME_ID,
      userId: "user-1",
      note: "Clear!",
    });

    const invalid = await request(app).post(`/api/games/${GAME_ID}/journal`).send({ note: "   " });
    expect(invalid.status).toBe(400);

    mocks.storage.deleteGameJournalEntry.mockResolvedValue(false);
    expect((await request(app).delete(`/api/games/${GAME_ID}/journal/${ENTRY_ID}`)).status).toBe(
      404
    );
    mocks.storage.deleteGameJournalEntry.mockResolvedValue(true);
    expect((await request(app).delete(`/api/games/${GAME_ID}/journal/${ENTRY_ID}`)).status).toBe(
      204
    );
    expect(mocks.storage.deleteGameJournalEntry).toHaveBeenLastCalledWith(ENTRY_ID, "user-1");
  });

  it("limits journal and milestone data to the owning user and handles storage errors", async () => {
    mocks.storage.getGame.mockResolvedValueOnce({ id: GAME_ID, userId: "another-user" });
    expect((await request(app).get(`/api/games/${GAME_ID}/journal`)).status).toBe(404);

    mocks.storage.getGameJournalEntries.mockRejectedValueOnce(new Error("read failed"));
    expect((await request(app).get(`/api/games/${GAME_ID}/journal`)).status).toBe(500);

    mocks.storage.addGameJournalEntry.mockRejectedValueOnce(new Error("insert failed"));
    expect(
      (await request(app).post(`/api/games/${GAME_ID}/journal`).send({ note: "A note" })).status
    ).toBe(500);

    mocks.storage.deleteGameJournalEntry.mockRejectedValueOnce(new Error("delete failed"));
    expect((await request(app).delete(`/api/games/${GAME_ID}/journal/${ENTRY_ID}`)).status).toBe(
      500
    );
    expect(mocks.logger.error).toHaveBeenCalled();
  });

  it("lists, creates, updates, validates, and deletes milestones", async () => {
    mocks.storage.getGameMilestones.mockResolvedValue([{ id: MILESTONE_ID, label: "Finish" }]);
    expect((await request(app).get(`/api/games/${GAME_ID}/milestones`)).body).toEqual([
      { id: MILESTONE_ID, label: "Finish" },
    ]);

    const created = await request(app)
      .post(`/api/games/${GAME_ID}/milestones`)
      .send({ label: "  Find the key  " });
    expect(created.status).toBe(201);
    expect(mocks.storage.addGameMilestone).toHaveBeenCalledWith({
      gameId: GAME_ID,
      userId: "user-1",
      label: "Find the key",
    });
    expect(
      (await request(app).post(`/api/games/${GAME_ID}/milestones`).send({ label: " " })).status
    ).toBe(400);

    mocks.storage.updateGameMilestone.mockResolvedValueOnce(undefined);
    expect(
      (
        await request(app)
          .patch(`/api/games/${GAME_ID}/milestones/${MILESTONE_ID}`)
          .send({ completed: true })
      ).status
    ).toBe(404);
    const updated = await request(app)
      .patch(`/api/games/${GAME_ID}/milestones/${MILESTONE_ID}`)
      .send({ completed: true });
    expect(updated.status).toBe(200);
    expect(updated.body.completedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(
      (
        await request(app)
          .patch(`/api/games/${GAME_ID}/milestones/${MILESTONE_ID}`)
          .send({ completed: "yes" })
      ).status
    ).toBe(400);

    mocks.storage.deleteGameMilestone.mockResolvedValue(false);
    expect(
      (await request(app).delete(`/api/games/${GAME_ID}/milestones/${MILESTONE_ID}`)).status
    ).toBe(404);
    mocks.storage.deleteGameMilestone.mockResolvedValue(true);
    expect(
      (await request(app).delete(`/api/games/${GAME_ID}/milestones/${MILESTONE_ID}`)).status
    ).toBe(204);
  });

  it("reports milestone storage failures", async () => {
    mocks.storage.getGameMilestones.mockRejectedValueOnce(new Error("read failed"));
    expect((await request(app).get(`/api/games/${GAME_ID}/milestones`)).status).toBe(500);

    mocks.storage.addGameMilestone.mockRejectedValueOnce(new Error("insert failed"));
    expect(
      (await request(app).post(`/api/games/${GAME_ID}/milestones`).send({ label: "Finish" })).status
    ).toBe(500);

    mocks.storage.updateGameMilestone.mockRejectedValueOnce(new Error("update failed"));
    expect(
      (
        await request(app)
          .patch(`/api/games/${GAME_ID}/milestones/${MILESTONE_ID}`)
          .send({ completed: false })
      ).status
    ).toBe(500);

    mocks.storage.deleteGameMilestone.mockRejectedValueOnce(new Error("delete failed"));
    expect(
      (await request(app).delete(`/api/games/${GAME_ID}/milestones/${MILESTONE_ID}`)).status
    ).toBe(500);
  });

  it("lists and uploads screenshots after checking the actual image bytes", async () => {
    mocks.storage.getGameScreenshots.mockResolvedValue([
      { id: SCREENSHOT_ID, caption: "Opening", filePath: "stored.png" },
    ]);
    const listed = await request(app).get(`/api/games/${GAME_ID}/screenshots`);
    expect(listed.status).toBe(200);
    expect(listed.body[0].url).toBe(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}/file`);

    expect(
      (await request(app).post(`/api/games/${GAME_ID}/screenshots`).field("caption", "caption"))
        .status
    ).toBe(400);
    const badBytes = await request(app)
      .post(`/api/games/${GAME_ID}/screenshots`)
      .attach("file", Buffer.from("not an image"), {
        filename: "bad.png",
        contentType: "image/png",
      });
    expect(badBytes.status).toBe(400);

    const uploaded = await request(app)
      .post(`/api/games/${GAME_ID}/screenshots`)
      .field("caption", "  Boss fight  ")
      .attach("file", PNG_IMAGE, { filename: "shot.png", contentType: "image/png" });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.caption).toBe("Boss fight");
    expect(uploaded.body.filePath).toContain(path.join("screenshots", GAME_ID));
    await expect(fs.stat(uploaded.body.filePath)).resolves.toBeDefined();

    mocks.storage.addGameScreenshot.mockRejectedValueOnce(new Error("metadata insert failed"));
    const failed = await request(app)
      .post(`/api/games/${GAME_ID}/screenshots`)
      .attach("file", PNG_IMAGE, { filename: "shot.png", contentType: "image/png" });
    expect(failed.status).toBe(500);
    expect(mocks.logger.error).toHaveBeenCalled();
  });

  it("serves, updates, and deletes screenshot metadata and files safely", async () => {
    const screenshotPath = path.join(configDir, "screenshots", GAME_ID, "shot.png");
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    await fs.writeFile(screenshotPath, PNG_IMAGE);
    mocks.storage.getGameScreenshots.mockResolvedValue([
      { id: SCREENSHOT_ID, caption: "Old", filePath: screenshotPath },
    ]);
    expect(
      (await request(app).get(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}/file`)).status
    ).toBe(200);

    mocks.storage.getGameScreenshots.mockResolvedValue([]);
    expect(
      (await request(app).get(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}/file`)).status
    ).toBe(404);
    mocks.storage.getGameScreenshots.mockResolvedValue([
      { id: SCREENSHOT_ID, filePath: path.join(configDir, "outside.png") },
    ]);
    expect(
      (await request(app).get(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}/file`)).status
    ).toBe(500);

    mocks.storage.updateGameScreenshotCaption.mockResolvedValueOnce(undefined);
    expect(
      (
        await request(app)
          .patch(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}`)
          .send({ caption: null })
      ).status
    ).toBe(404);
    const updated = await request(app)
      .patch(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}`)
      .send({ caption: "  Edited  " });
    expect(updated.status).toBe(200);
    expect(updated.body.caption).toBe("Edited");
    expect(
      (
        await request(app)
          .patch(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}`)
          .send({ caption: 12 })
      ).status
    ).toBe(400);

    mocks.storage.deleteGameScreenshot.mockResolvedValue(undefined);
    expect(
      (await request(app).delete(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}`)).status
    ).toBe(404);
    mocks.storage.deleteGameScreenshot.mockResolvedValue({ filePath: screenshotPath });
    expect(
      (await request(app).delete(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}`)).status
    ).toBe(204);
    await expect(fs.stat(screenshotPath)).rejects.toThrow();

    mocks.storage.deleteGameScreenshot.mockResolvedValue({
      filePath: path.join(configDir, "escape.png"),
    });
    expect(
      (await request(app).delete(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}`)).status
    ).toBe(500);
  });

  it("handles screenshot storage and send failures", async () => {
    mocks.storage.getGameScreenshots.mockRejectedValueOnce(new Error("read failed"));
    expect((await request(app).get(`/api/games/${GAME_ID}/screenshots`)).status).toBe(500);

    mocks.storage.getGameScreenshots.mockResolvedValue([
      { id: SCREENSHOT_ID, filePath: path.join(configDir, "screenshots", GAME_ID, "missing.png") },
    ]);
    expect(
      (await request(app).get(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}/file`)).status
    ).toBe(404);

    mocks.storage.updateGameScreenshotCaption.mockRejectedValueOnce(new Error("update failed"));
    expect(
      (
        await request(app)
          .patch(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}`)
          .send({ caption: "New" })
      ).status
    ).toBe(500);

    mocks.storage.deleteGameScreenshot.mockRejectedValueOnce(new Error("delete failed"));
    expect(
      (await request(app).delete(`/api/games/${GAME_ID}/screenshots/${SCREENSHOT_ID}`)).status
    ).toBe(500);
  });

  it("rejects malformed resource identifiers before storage access", async () => {
    expect((await request(app).get("/api/games/not-a-uuid/journal")).status).toBe(400);
    expect((await request(app).delete(`/api/games/${GAME_ID}/journal/not-a-uuid`)).status).toBe(
      400
    );
    expect(mocks.storage.getGame).not.toHaveBeenCalled();
  });
});
