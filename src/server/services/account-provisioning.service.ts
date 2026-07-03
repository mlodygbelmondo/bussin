import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type AccountProvisioningRepository = {
  createWorkspace(input: {
    name: string;
    ownerUserId: string;
  }): Promise<{ id: string }>;
  ensureOwnerMembership(input: {
    userId: string;
    workspaceId: string;
  }): Promise<void>;
  getOwnedWorkspaceForUser(userId: string): Promise<{ id: string } | null>;
  getPrimaryMembershipForUser(
    userId: string,
  ): Promise<{ workspace_id: string } | null>;
  upsertProfile(input: {
    email: string;
    fullName: string | null;
    userId: string;
  }): Promise<void>;
};

export function createAccountProvisioningService(
  repository: AccountProvisioningRepository,
) {
  return {
    async ensureUserWorkspace(input: {
      email: string | null | undefined;
      fullName?: string | null;
      userId: string;
    }) {
      const email = normalizeEmail(input.email);

      if (email) {
        await repository.upsertProfile({
          email,
          fullName: normalizeFullName(input.fullName),
          userId: input.userId,
        });
      }

      const membership = await repository.getPrimaryMembershipForUser(
        input.userId,
      );

      if (membership) {
        return { workspaceId: membership.workspace_id };
      }

      const ownedWorkspace = await repository.getOwnedWorkspaceForUser(
        input.userId,
      );

      if (ownedWorkspace) {
        await repository.ensureOwnerMembership({
          userId: input.userId,
          workspaceId: ownedWorkspace.id,
        });

        return { workspaceId: ownedWorkspace.id };
      }

      const workspace = await repository.createWorkspace({
        name: defaultWorkspaceName(email),
        ownerUserId: input.userId,
      });

      return { workspaceId: workspace.id };
    },
  };
}

export function createSupabaseAccountProvisioningRepository(
  supabase: SupabaseClient<Database>,
): AccountProvisioningRepository {
  return {
    async createWorkspace(input) {
      const { data, error } = await supabase
        .from("workspaces")
        .insert({
          name: input.name,
          owner_user_id: input.ownerUserId,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async ensureOwnerMembership(input) {
      const { error } = await supabase.from("workspace_members").upsert(
        {
          role: "owner",
          user_id: input.userId,
          workspace_id: input.workspaceId,
        },
        { onConflict: "workspace_id,user_id" },
      );

      if (error) {
        throw new Error(error.message);
      }
    },
    async getOwnedWorkspaceForUser(userId) {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async getPrimaryMembershipForUser(userId) {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async upsertProfile(input) {
      const { error } = await supabase.from("profiles").upsert(
        {
          email: input.email,
          full_name: input.fullName,
          user_id: input.userId,
        },
        { onConflict: "user_id" },
      );

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

function defaultWorkspaceName(email: string | null) {
  if (!email) {
    return "My Workspace";
  }

  return `${email.split("@")[0]}'s Workspace`;
}

function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();

  return normalized || null;
}

function normalizeFullName(fullName: string | null | undefined) {
  const normalized = fullName?.trim();

  return normalized || null;
}
