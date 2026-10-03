import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getLogFilePath, readLastLogLines } from "../log-file.js";

describe("readLastLogLines", () => {
  const tempDirectories: string[] = [];
  const originalLogFile = process.env.QUESTARR_LOG_FILE;

  afterEach(async () => {
    if (originalLogFile === undefined) {
      delete process.env.QUESTARR_LOG_FILE;
    } else {
      process.env.QUESTARR_LOG_FILE = originalLogFile;
    }
    await Promise.all(
      tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true }))
    );
  });

  it("defaults the log path to server.log under the working directory", () => {
    delete process.env.QUESTARR_LOG_FILE;

    expect(getLogFilePath()).toBe(path.resolve(process.cwd(), "server.log"));
  });

  it("resolves a configured log path relative to the working directory", () => {
    process.env.QUESTARR_LOG_FILE = "data/server.log";

    expect(getLogFilePath()).toBe(path.resolve(process.cwd(), "data/server.log"));
  });

  it("returns the full trailing lines when the latest line is longer than the old byte estimate", async () => {
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "questarr-log-file-"));
    tempDirectories.push(tempDirectory);

    const logPath = path.join(tempDirectory, "server.log");
    const longMessage = JSON.stringify({
      level: 30,
      response: {
        success: false,
        message: `Synology failure: ${"x".repeat(1500)}`,
      },
    });
    const logContents = [`{"msg":"first"}`, `{"msg":"second"}`, longMessage].join("\n");

    await writeFile(logPath, logContents, "utf8");

    await expect(readLastLogLines(logPath, 2)).resolves.toEqual([`{"msg":"second"}`, longMessage]);
  });

  it("keeps the last line when the file does not end with a newline", async () => {
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "questarr-log-file-"));
    tempDirectories.push(tempDirectory);

    const logPath = path.join(tempDirectory, "server.log");
    await writeFile(logPath, `{"msg":"one"}\n{"msg":"two"}`, "utf8");

    await expect(readLastLogLines(logPath, 1)).resolves.toEqual([`{"msg":"two"}`]);
  });
});
