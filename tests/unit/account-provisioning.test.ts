import { describe, expect, it, vi } from "vitest";
import {
  createAccountProvisioningService,
  type AccountProvisioningRepository,
} from "@/server/services/account-provisioning.service";

const userId = "22222222-2222-4222-8222-222222222222";
const workspaceId = "11111111-1111-4111-8111-111111111111";

describe("account provisioning service", () => {
  it("creates a profile and default workspace when the user has no membership", async () => {
    const repository = makeRepository({
      membership: null,
      ownedWorkspace: null,
      workspace: { id: workspaceId },
    });
    const service = createAccountProvisioningService(repository);

    const result = await service.ensureUserWorkspace({
      email: "producer@example.com",
      fullName: "Producer One",
      userId,
    });

    expect(result).toEqual({ workspaceId });
    expect(repository.upsertProfile).toHaveBeenCalledWith({
      email: "producer@example.com",
      fullName: "Producer One",
      userId,
    });
    expect(repository.createWorkspace).toHaveBeenCalledWith({
      name: "producer's Workspace",
      ownerUserId: userId,
    });
  });

  it("returns an existing workspace without creating another one", async () => {
    const repository = makeRepository({
      membership: { workspace_id: workspaceId },
      ownedWorkspace: null,
      workspace: { id: "33333333-3333-4333-8333-333333333333" },
    });
    const service = createAccountProvisioningService(repository);

    await expect(
      service.ensureUserWorkspace({
        email: "producer@example.com",
        userId,
      }),
    ).resolves.toEqual({ workspaceId });

    expect(repository.createWorkspace).not.toHaveBeenCalled();
    expect(repository.ensureOwnerMembership).not.toHaveBeenCalled();
  });

  it("repairs owner membership for an existing owned workspace", async () => {
    const repository = makeRepository({
      membership: null,
      ownedWorkspace: { id: workspaceId },
      workspace: { id: "33333333-3333-4333-8333-333333333333" },
    });
    const service = createAccountProvisioningService(repository);

    await expect(
      service.ensureUserWorkspace({
        email: "producer@example.com",
        userId,
      }),
    ).resolves.toEqual({ workspaceId });

    expect(repository.createWorkspace).not.toHaveBeenCalled();
    expect(repository.ensureOwnerMembership).toHaveBeenCalledWith({
      userId,
      workspaceId,
    });
  });
});

function makeRepository(input: {
  membership: { workspace_id: string } | null;
  ownedWorkspace: { id: string } | null;
  workspace: { id: string };
}): AccountProvisioningRepository {
  return {
    createWorkspace: vi.fn().mockResolvedValue(input.workspace),
    ensureOwnerMembership: vi.fn().mockResolvedValue(undefined),
    getOwnedWorkspaceForUser: vi.fn().mockResolvedValue(input.ownedWorkspace),
    getPrimaryMembershipForUser: vi.fn().mockResolvedValue(input.membership),
    upsertProfile: vi.fn().mockResolvedValue(undefined),
  };
}
