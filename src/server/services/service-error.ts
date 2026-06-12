export type ServiceErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATE"
  | "PLAN_LIMIT_EXCEEDED"
  | "SUNO_NOT_CONNECTED"
  | "VALIDATION_ERROR";

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
