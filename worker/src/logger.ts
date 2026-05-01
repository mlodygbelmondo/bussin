export type WorkerLogger = {
  debug(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
};

export function createWorkerLogger(input: { workerId: string }): WorkerLogger {
  return {
    debug(message, metadata) {
      writeLog("debug", input.workerId, message, metadata);
    },
    error(message, metadata) {
      writeLog("error", input.workerId, message, metadata);
    },
    info(message, metadata) {
      writeLog("info", input.workerId, message, metadata);
    },
    warn(message, metadata) {
      writeLog("warn", input.workerId, message, metadata);
    },
  };
}

function writeLog(
  level: string,
  workerId: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const line = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    workerId,
    ...serializeMetadata(metadata),
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

function serializeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      value instanceof Error
        ? { message: value.message, name: value.name, stack: value.stack }
        : value,
    ]),
  );
}
