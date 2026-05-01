// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStorageSignedUrl } from "@/server/services/storage";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const mockedCreateAdminClient = vi.mocked(createAdminClient);
const workspaceId = "11111111-1111-4111-8111-111111111111";
const requesterUserId = "33333333-3333-4333-8333-333333333333";

describe("createStorageSignedUrl", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("checks requester membership before creating a signed URL", async () => {
    const admin = mockAdminClient();

    await expect(
      createStorageSignedUrl({
        bucket: "image-assets",
        workspaceId,
        requesterUserId,
        path: `${workspaceId}/mock-cover.png`,
      }),
    ).resolves.toBe("https://storage.example.test/signed-url");

    expect(admin.tableFrom).toHaveBeenCalledWith("workspace_members");
    expect(admin.select).toHaveBeenCalledWith("id");
    expect(admin.eqWorkspace).toHaveBeenCalledWith("workspace_id", workspaceId);
    expect(admin.eqUser).toHaveBeenCalledWith("user_id", requesterUserId);
    expect(admin.maybeSingle).toHaveBeenCalled();
    expect(admin.storageFrom).toHaveBeenCalledWith("image-assets");
    expect(admin.createSignedUrl).toHaveBeenCalledWith(
      `${workspaceId}/mock-cover.png`,
      3600,
    );
  });

  it("rejects when the requester is not a workspace member", async () => {
    const admin = mockAdminClient({ membership: null });

    await expect(
      createStorageSignedUrl({
        bucket: "image-assets",
        workspaceId,
        requesterUserId,
        path: `${workspaceId}/mock-cover.png`,
      }),
    ).rejects.toThrow("Not authorized to access storage object.");

    expect(admin.tableFrom).toHaveBeenCalledWith("workspace_members");
    expect(admin.storageFrom).not.toHaveBeenCalled();
    expect(admin.createSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects paths outside the requested workspace boundary", async () => {
    await expect(
      createStorageSignedUrl({
        bucket: "image-assets",
        workspaceId,
        requesterUserId,
        path: "22222222-2222-4222-8222-222222222222/mock-cover.png",
      }),
    ).rejects.toThrow("Storage path must start with the workspace id.");

    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
  });
});

function mockAdminClient({
  membership = { id: "membership-id" },
}: {
  membership?: { id: string } | null;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: membership,
    error: null,
  });
  const eqUser = vi.fn().mockReturnValue({ maybeSingle });
  const eqWorkspace = vi.fn().mockReturnValue({ eq: eqUser });
  const select = vi.fn().mockReturnValue({ eq: eqWorkspace });
  const tableFrom = vi.fn().mockReturnValue({ select });
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://storage.example.test/signed-url" },
    error: null,
  });
  const storageFrom = vi.fn().mockReturnValue({ createSignedUrl });

  mockedCreateAdminClient.mockReturnValue({
    from: tableFrom,
    storage: { from: storageFrom },
  } as unknown as ReturnType<typeof createAdminClient>);

  return {
    createSignedUrl,
    eqUser,
    eqWorkspace,
    maybeSingle,
    select,
    storageFrom,
    tableFrom,
  };
}
