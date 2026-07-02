import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestPasswordReset, updatePassword } from "@/app/auth/actions";

const { createClientMock, redirectMock, supabaseMock } = vi.hoisted(() => {
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
    createClientMock: vi.fn(),
    redirectMock: vi.fn((url: string) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), {
        digest: `NEXT_REDIRECT;replace;${url};false`,
      });
    }),
    supabaseMock,
  };
});

vi.mock("next/navigation", () => ({
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

describe("auth password reset actions", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    createClientMock.mockResolvedValue(supabaseMock);
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
