import { describe, expect, it, vi } from "vitest";
import { createScheduledUploadRepository } from "@/server/services/scheduled-upload.repository";
import {
  selectCount,
  selectMaybeSingle,
  selectRows,
  selectSingle,
  throwOnError,
} from "@/server/services/supabase-query";

describe("supabase query unwrap helpers", () => {
  it("selectSingle returns the row and rejects errors and missing rows", async () => {
    await expect(
      selectSingle(Promise.resolve({ data: { id: "row" }, error: null })),
    ).resolves.toEqual({ id: "row" });
    await expect(
      selectSingle(Promise.resolve({ data: null, error: { message: "boom" } })),
    ).rejects.toThrow("boom");
    await expect(
      selectSingle(Promise.resolve({ data: null, error: null })),
    ).rejects.toThrow("Expected one database row, found none.");
  });

  it("selectMaybeSingle returns null for missing rows and rejects errors", async () => {
    await expect(
      selectMaybeSingle(Promise.resolve({ data: null, error: null })),
    ).resolves.toBeNull();
    await expect(
      selectMaybeSingle(
        Promise.resolve({ data: null, error: { message: "boom" } }),
      ),
    ).rejects.toThrow("boom");
  });

  it("selectRows and selectCount default to empty results", async () => {
    await expect(
      selectRows(Promise.resolve({ data: null, error: null })),
    ).resolves.toEqual([]);
    await expect(
      selectCount(Promise.resolve({ count: null, error: null })),
    ).resolves.toBe(0);
    await expect(
      selectCount(Promise.resolve({ count: 7, error: null })),
    ).resolves.toBe(7);
  });

  it("throwOnError resolves silently without an error", async () => {
    await expect(
      throwOnError(Promise.resolve({ error: null })),
    ).resolves.toBeUndefined();
    await expect(
      throwOnError(Promise.resolve({ error: { message: "boom" } })),
    ).rejects.toThrow("boom");
  });
});

describe("scheduled upload repository", () => {
  function createUpdateQueryStub(result: {
    data: unknown;
    error: { message: string } | null;
  }) {
    const query = {
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      maybeSingle: vi.fn(() => Promise.resolve(result)),
      select: vi.fn(() => query),
      update: vi.fn(() => query),
    };
    const supabase = {
      from: vi.fn(() => query),
    };

    return { query, supabase };
  }

  it("guards updateUpload with the allowed statuses when provided", async () => {
    const upload = { id: "upload-id", status: "scheduled" };
    const { query, supabase } = createUpdateQueryStub({
      data: upload,
      error: null,
    });
    const repository = createScheduledUploadRepository(
      supabase as unknown as Parameters<
        typeof createScheduledUploadRepository
      >[0],
    );

    await expect(
      repository.updateUpload({
        allowedStatuses: ["draft", "scheduled"],
        uploadId: "upload-id",
        values: { status: "cancelled" },
        workspaceId: "workspace-id",
      }),
    ).resolves.toBe(upload);

    expect(query.update).toHaveBeenCalledWith({ status: "cancelled" });
    expect(query.eq).toHaveBeenCalledWith("workspace_id", "workspace-id");
    expect(query.eq).toHaveBeenCalledWith("id", "upload-id");
    expect(query.in).toHaveBeenCalledWith("status", ["draft", "scheduled"]);
  });

  it("skips the status guard when no allowed statuses are provided", async () => {
    const { query, supabase } = createUpdateQueryStub({
      data: null,
      error: null,
    });
    const repository = createScheduledUploadRepository(
      supabase as unknown as Parameters<
        typeof createScheduledUploadRepository
      >[0],
    );

    await expect(
      repository.updateUpload({
        uploadId: "upload-id",
        values: { scheduled_at: "2026-08-01T00:00:00.000Z" },
        workspaceId: "workspace-id",
      }),
    ).resolves.toBeNull();

    expect(query.in).not.toHaveBeenCalled();
  });
});
