import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { ServiceError } from "@/server/services/service-error";

export type Workspace = Tables<"workspaces">;
export type WorkspaceMembership = Tables<"workspace_members">;
export type WorkspaceRole = WorkspaceMembership["role"];

export type WorkspaceMembershipWithWorkspace = WorkspaceMembership & {
  workspace: Workspace;
};

export type WorkspaceRepository = {
  createWorkspace(input: TablesInsert<"workspaces">): Promise<Workspace>;
  getMembership(input: {
    workspaceId: string;
    userId: string;
  }): Promise<WorkspaceMembership | null>;
  getPrimaryMembershipForUser(
    userId: string,
  ): Promise<WorkspaceMembershipWithWorkspace | null>;
  updateWorkspace(input: {
    workspaceId: string;
    values: Pick<TablesUpdate<"workspaces">, "name" | "onboarding_completed">;
  }): Promise<Workspace>;
};

export function createWorkspaceService(repository: WorkspaceRepository) {
  return {
    async getCurrentUserWorkspace(userId: string) {
      const membership = await repository.getPrimaryMembershipForUser(userId);

      if (!membership) {
        throw new ServiceError("NOT_FOUND", "Workspace not found.");
      }

      return membership;
    },
    async checkMembership(workspaceId: string, userId: string) {
      return Boolean(await repository.getMembership({ workspaceId, userId }));
    },
    async checkOwnerOrAdminRole(workspaceId: string, userId: string) {
      const membership = await repository.getMembership({
        workspaceId,
        userId,
      });

      return isOwnerOrAdmin(membership?.role);
    },
    createDefaultWorkspace(input: {
      ownerUserId: string;
      name?: string;
      email?: string;
    }) {
      return repository.createWorkspace({
        owner_user_id: input.ownerUserId,
        name: input.name ?? defaultWorkspaceName(input.email),
      });
    },
    async updateWorkspaceSettings(input: {
      workspaceId: string;
      userId: string;
      values: Pick<TablesUpdate<"workspaces">, "name" | "onboarding_completed">;
    }) {
      const allowed = await this.checkOwnerOrAdminRole(
        input.workspaceId,
        input.userId,
      );

      if (!allowed) {
        throw new ServiceError("FORBIDDEN", "Workspace admin access required.");
      }

      return repository.updateWorkspace({
        workspaceId: input.workspaceId,
        values: input.values,
      });
    },
  };
}

export function isOwnerOrAdmin(role: WorkspaceRole | null | undefined) {
  return role === "owner" || role === "admin";
}

function defaultWorkspaceName(email: string | undefined) {
  if (!email) {
    return "My Workspace";
  }

  return `${email.split("@")[0]}'s Workspace`;
}
