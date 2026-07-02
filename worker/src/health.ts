import { createServer, type Server } from "node:http";
import type { WorkerLogger } from "./logger";

// The poll loop is considered stalled when no tick happened for this long.
// Generous on purpose: a busy render batch can hold the loop for minutes.
const STALL_THRESHOLD_MS = 15 * 60 * 1000;

export type HealthTracker = {
  ready: Promise<void>;
  recordTick(): void;
  server: Server;
  stop(): Promise<void>;
};

export function startHealthServer(input: {
  logger: WorkerLogger;
  port: number;
}): HealthTracker {
  let lastTickAt = Date.now();
  let readySettled = false;

  const server = createServer((request, response) => {
    if (request.url !== "/healthz") {
      response.writeHead(404).end();
      return;
    }

    const sinceLastTickMs = Date.now() - lastTickAt;
    const healthy = sinceLastTickMs < STALL_THRESHOLD_MS;

    response
      .writeHead(healthy ? 200 : 503, { "content-type": "application/json" })
      .end(
        JSON.stringify({
          lastTickAt: new Date(lastTickAt).toISOString(),
          sinceLastTickMs,
          status: healthy ? "ok" : "stalled",
        }),
      );
  });
  const ready = new Promise<void>((resolve, reject) => {
    server.once("listening", () => {
      readySettled = true;
      resolve();
    });
    server.once("error", (error) => {
      if (!readySettled) {
        readySettled = true;
        reject(error);
      }
    });
  });

  server.listen(input.port, () => {
    input.logger.info("Worker health endpoint listening.", {
      port: input.port,
    });
  });
  server.on("error", (error) => {
    input.logger.error("Worker health endpoint failed.", { error });
  });

  return {
    ready,
    recordTick() {
      lastTickAt = Date.now();
    },
    server,
    stop() {
      return new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }

        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}
