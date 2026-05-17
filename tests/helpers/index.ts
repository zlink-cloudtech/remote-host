import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AddressInfo } from "node:net";
import express from "express";

/**
 * Auto-cleaned temp directory per test.
 */
export function useTempDir(): { getPath: () => string } {
  const dirs: string[] = [];

  beforeEach(() => {
    dirs.push(mkdtempSync(join(tmpdir(), "remote-host-test-")));
  });

  afterEach(() => {
    for (const d of dirs) {
      rmSync(d, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  return {
    getPath: () => dirs[dirs.length - 1],
  };
}

/**
 * Start a mock Express server on a random port. Returns URL and close function.
 */
export async function startMockServer(): Promise<{
  url: string;
  app: express.Express;
  close: () => Promise<void>;
}> {
  const app = express();
  app.use(express.json());

  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        app,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
    server.on("error", reject);
  });
}
