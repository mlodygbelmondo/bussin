import type { Json, Tables, TablesInsert } from "@/lib/database.types";

export const auditLogActions = [
  "integration.connected",
  "integration.disconnected",
  "generation.created",
  "track.preview_ready",
  "track.approved",
  "track.rejected",
  "render.completed",
  "upload.scheduled",
  "upload.completed",
  "upload.failed",
  "billing.changed",
] as const;

export type AuditLogAction = (typeof auditLogActions)[number];
export type AuditLog = Tables<"audit_logs">;

export type AuditLogRepository = {
  createAuditLog(input: TablesInsert<"audit_logs">): Promise<Partial<AuditLog>>;
  listAuditLogs(input: {
    workspaceId: string;
    limit: number;
  }): Promise<Partial<AuditLog>[]>;
};

export function createAuditLogService(repository: AuditLogRepository) {
  return {
    create(input: {
      workspaceId: string;
      userId?: string | null;
      action: AuditLogAction;
      entityType?: string;
      entityId?: string;
      metadata?: Json;
    }) {
      return repository.createAuditLog({
        workspace_id: input.workspaceId,
        user_id: input.userId ?? null,
        action: input.action,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        metadata: input.metadata ?? {},
      });
    },
    listRecentActivity(workspaceId: string, limit = 20) {
      return repository.listAuditLogs({
        workspaceId,
        limit: Math.min(Math.max(limit, 1), 100),
      });
    },
  };
}
