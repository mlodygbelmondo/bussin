import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from "@/app/auth/actions";

const {
  adminClientMock,
  createAccountProvisioningServiceMock,
  createAdminClientMock,
  createClientMock,
  createSupabaseAccountProvisioningRepositoryMock,
  ensureUserWorkspaceMock,
  redirectMock,
  supabaseMock,
} = vi.hoisted(() => {
  const supabaseMock = {
    auth: {
      exchangeCodeForSession: vi.fn(),
      getUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      updateUser: vi.fn(),
    },
  };

  return {
    adminClientMock: {},
    createAccountProvisioningServiceMock: vi.fn(),
    createAdminClientMock: vi.fn(),
    createClientMock: vi.fn(),
    createSupabaseAccountProvisioningRepositoryMock: vi.fn(),
    ensureUserWorkspaceMock: vi.fn(),
    redirectMock: vi.fn((url: string) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), {
        digest: `NEXT_REDIRECT;replace;${url};false`,
      });
    }),
    supabaseMock,
  };
});

vi.mock("next/navigation", () => ({
  RedirectType: {
    replace: "replace",
  },
  redirect: redirectMock,
}));

vi.mock("@/lib/app-config", () => ({
  isMockMode: false,
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock("@/server/services/account-provisioning.service", () => ({
  createAccountProvisioningService: createAccountProvisioningServiceMock,
  createSupabaseAccountProvisioningRepository:
    createSupabaseAccountProvisioningRepositoryMock,
}));

describe("auth sign in and sign up actions", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("provisions the account workspace after sign in", async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          email: "producer@example.com",
          id: "user_1",
        },
      },
      error: null,
    });

    const formData = new FormData();
    formData.set("email", "producer@example.com");
    formData.set("password", "Password1");

    const redirectDigest = await captureRedirect(signIn(formData));

    expect(redirectDigest).toContain("/dashboard");
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "producer@example.com",
      password: "Password1",
    });
    expect(ensureUserWorkspaceMock).toHaveBeenCalledWith({
      email: "producer@example.com",
      fullName: undefined,
      userId: "user_1",
    });
  });

  it("stores profile metadata and provisions the workspace after sign up", async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: {
        user: {
          email: "producer@example.com",
          id: "user_1",
        },
      },
      error: null,
    });

    const formData = new FormData();
    formData.set("email", "producer@example.com");
    formData.set("fullName", "Producer One");
    formData.set("password", "Password1");

    const redirectDigest = await captureRedirect(signUp(formData));

    expect(redirectDigest).toContain("/dashboard");
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: "producer@example.com",
      options: {
        data: {
          full_name: "Producer One",
        },
      },
      password: "Password1",
    });
    expect(ensureUserWorkspaceMock).toHaveBeenCalledWith({
      email: "producer@example.com",
      fullName: "Producer One",
      userId: "user_1",
    });
  });
});

describe("auth password reset actions", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("shows the same forgot-password confirmation even when Supabase rejects the reset request", async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({
      error: new Error("User not found"),
    });

    const formData = new FormData();
    formData.set("email", " producer@example.com ");

    const redirectDigest = await captureRedirect(
      requestPasswordReset(formData),
    );

    expect(redirectDigest).toContain("/forgot-password?sent=1");
    expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "producer@example.com",
      {
        redirectTo: "http://localhost:3000/reset-password",
      },
    );
  });

  it("does not call Supabase for an empty reset email but still avoids enumeration", async () => {
    const formData = new FormData();
    formData.set("email", " ");

    const redirectDigest = await captureRedirect(
      requestPasswordReset(formData),
    );

    expect(redirectDigest).toContain("/forgot-password?sent=1");
    expect(supabaseMock.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("preserves the recovery code when password validation fails", async () => {
    const formData = new FormData();
    formData.set("code", "recovery-code");
    formData.set("password", "short");
    formData.set("confirmPassword", "short");

    const redirectDigest = decodeRedirectDigest(
      await captureRedirect(updatePassword(formData)),
    );

    expect(redirectDigest).toContain("/reset-password?");
    expect(redirectDigest).toContain("code=recovery-code");
    expect(redirectDigest).toContain(
      "Password must be at least 8 characters long.",
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("exchanges the recovery code server-side before updating the password", async () => {
    const formData = new FormData();
    formData.set("code", "recovery-code");
    formData.set("password", "Password1");
    formData.set("confirmPassword", "Password1");

    const redirectDigest = await captureRedirect(updatePassword(formData));

    expect(redirectDigest).toContain("/dashboard");
    expect(supabaseMock.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      "recovery-code",
    );
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({
      password: "Password1",
    });
  });

  it("rejects invalid or expired recovery codes without updating the password", async () => {
    supabaseMock.auth.exchangeCodeForSession.mockResolvedValue({
      error: new Error("expired"),
    });

    const formData = new FormData();
    formData.set("code", "expired-code");
    formData.set("password", "Password1");
    formData.set("confirmPassword", "Password1");

    const redirectDigest = decodeRedirectDigest(
      await captureRedirect(updatePassword(formData)),
    );

    expect(redirectDigest).toContain(
      "This reset link is invalid or has expired. Please request a new one.",
    );
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it("rejects code-less reset submissions unless an existing session is present", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const formData = new FormData();
    formData.set("password", "Password1");
    formData.set("confirmPassword", "Password1");

    const redirectDigest = decodeRedirectDigest(
      await captureRedirect(updatePassword(formData)),
    );

    expect(redirectDigest).toContain(
      "This reset link is invalid or has expired. Please request a new one.",
    );
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });
});

describe("auth sign-out action", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("signs out of Supabase and replaces the current page with the public home page", async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });

    const redirectDigest = await captureRedirect(signOut());

    expect(redirectDigest).toContain("/");
    expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/", "replace");
  });
});

function resetMocks() {
  createClientMock.mockReset();
  createClientMock.mockResolvedValue(supabaseMock);
  createAdminClientMock.mockReset();
  createAdminClientMock.mockReturnValue(adminClientMock);
  createSupabaseAccountProvisioningRepositoryMock.mockReset();
  createSupabaseAccountProvisioningRepositoryMock.mockReturnValue({
    repository: "account-provisioning",
  });
  createAccountProvisioningServiceMock.mockReset();
  createAccountProvisioningServiceMock.mockReturnValue({
    ensureUserWorkspace: ensureUserWorkspaceMock,
  });
  ensureUserWorkspaceMock.mockReset();
  ensureUserWorkspaceMock.mockResolvedValue({
    workspaceId: "11111111-1111-4111-8111-111111111111",
  });
  redirectMock.mockClear();

  for (const mock of Object.values(supabaseMock.auth)) {
    mock.mockReset();
  }

  supabaseMock.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: "user_1" } },
    error: null,
  });
  supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  supabaseMock.auth.updateUser.mockResolvedValue({ error: null });
}

async function captureRedirect(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return String((error as { digest?: string }).digest ?? error);
  }

  throw new Error("Expected action to redirect.");
}

function decodeRedirectDigest(digest: string) {
  return decodeURIComponent(digest.replaceAll("+", " "));
}
