// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type TestContext = {
  admin: SupabaseClient;
  anonymous: SupabaseClient;
  userA: TestUser;
  userB: TestUser;
  clientA: SupabaseClient;
  clientB: SupabaseClient;
  workspaceAId: string;
  workspaceBId: string;
  requestAId: string;
  requestBId: string;
};

type TestUser = {
  id: string;
  email: string;
  password: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasRealSupabaseConfig =
  Boolean(supabaseUrl?.startsWith("http")) &&
  Boolean(anonKey) &&
  Boolean(serviceRoleKey) &&
  anonKey !== "test-anon-key" &&
  serviceRoleKey !== "test-service-role-key" &&
  anonKey !== "replace-me" &&
  serviceRoleKey !== "replace-me";

describe.skipIf(!hasRealSupabaseConfig)("Supabase workspace RLS", () => {
  const context = {} as TestContext;

  beforeAll(async () => {
    context.admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    context.anonymous = createClient(supabaseUrl!, anonKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    context.userA = await createTestUser(context.admin, "a");
    context.userB = await createTestUser(context.admin, "b");
    context.clientA = await createSignedInClient(context.userA);
    context.clientB = await createSignedInClient(context.userB);

    context.workspaceAId = await createOwnedWorkspace(
      context.clientA,
      context.userA.id,
      "Workspace A",
    );
    context.workspaceBId = await createOwnedWorkspace(
      context.clientB,
      context.userB.id,
      "Workspace B",
    );

    context.requestAId = await createGenerationRequest(
      context.clientA,
      context.workspaceAId,
      context.userA.id,
    );
    context.requestBId = await createGenerationRequest(
      context.clientB,
      context.workspaceBId,
      context.userB.id,
    );
  }, 30_000);

  afterAll(async () => {
    await Promise.allSettled([
      context.workspaceAId
        ? context.admin
            .from("workspaces")
            .delete()
            .eq("id", context.workspaceAId)
        : Promise.resolve(),
      context.workspaceBId
        ? context.admin
            .from("workspaces")
            .delete()
            .eq("id", context.workspaceBId)
        : Promise.resolve(),
    ]);

    await Promise.allSettled([
      context.userA?.id
        ? context.admin.auth.admin.deleteUser(context.userA.id)
        : Promise.resolve(),
      context.userB?.id
        ? context.admin.auth.admin.deleteUser(context.userB.id)
        : Promise.resolve(),
    ]);
  });

  it("allows a workspace owner to read rows in their own workspace", async () => {
    const { data, error } = await context.clientA
      .from("generation_requests")
      .select("id, workspace_id")
      .eq("id", context.requestAId);

    expect(error).toBeNull();
    expect(data).toEqual([
      {
        id: context.requestAId,
        workspace_id: context.workspaceAId,
      },
    ]);
  });

  it("blocks user A from reading user B workspace rows", async () => {
    const { data, error } = await context.clientA
      .from("generation_requests")
      .select("id")
      .eq("id", context.requestBId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("blocks unauthenticated workspace reads", async () => {
    const { data, error } = await context.anonymous
      .from("generation_requests")
      .select("id")
      .eq("id", context.requestAId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

async function createTestUser(
  admin: SupabaseClient,
  label: string,
): Promise<TestUser> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `bussin-rls-${label}-${unique}@example.test`;
  const password = `Bussin-${label}-${unique}!`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Could not create test user ${label}: ${error?.message}`);
  }

  return {
    id: data.user.id,
    email,
    password,
  };
}

async function createSignedInClient(user: TestUser): Promise<SupabaseClient> {
  const client = createClient(supabaseUrl!, anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (error) {
    throw new Error(`Could not sign in test user: ${error.message}`);
  }

  return client;
}

async function createOwnedWorkspace(
  client: SupabaseClient,
  ownerUserId: string,
  name: string,
): Promise<string> {
  const { data, error } = await client
    .from("workspaces")
    .insert({
      name,
      owner_user_id: ownerUserId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Could not create workspace: ${error?.message}`);
  }

  return data.id;
}

async function createGenerationRequest(
  client: SupabaseClient,
  workspaceId: string,
  createdByUserId: string,
): Promise<string> {
  const { data, error } = await client
    .from("generation_requests")
    .insert({
      workspace_id: workspaceId,
      created_by_user_id: createdByUserId,
      style: "synthwave",
      mood: "focused",
      duration_seconds: 120,
      track_count: 1,
      publish_mode: "draft",
      status: "queued",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Could not create generation request: ${error?.message}`);
  }

  return data.id;
}
