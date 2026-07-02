import { CheckCircle2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const params = await searchParams;
  const code = params.code ?? "";

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card
        className="w-full max-w-[480px] gap-0 overflow-hidden p-0"
        data-testid="screen-reset-password"
      >
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <h1 className="text-xl font-semibold">Set a new password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose a new password for your account. You will be signed in once
            it is saved.
          </p>

          {params.error ? (
            <p
              className="mt-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
              data-testid="error-state"
            >
              {params.error}
            </p>
          ) : null}

          <form action={updatePassword} className="mt-5 grid gap-4">
            <input name="code" type="hidden" value={code} />

            <PasswordField
              label="New password"
              name="password"
              placeholder="Create a strong password"
              testId="reset-password-input"
            />
            <PasswordField
              label="Confirm new password"
              name="confirmPassword"
              placeholder="Repeat your new password"
              testId="reset-password-confirm"
            />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {["8+ characters", "1 uppercase", "1 number"].map((rule) => (
                <span className="flex items-center gap-1.5" key={rule}>
                  <CheckCircle2 className="size-3.5" />
                  {rule}
                </span>
              ))}
            </div>

            <Button
              className="h-12 w-full text-base"
              data-testid="reset-password-submit"
              type="submit"
            >
              Save new password
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Link expired?{" "}
            <Link className="text-primary" href="/forgot-password">
              Request a new one
            </Link>
          </p>
        </div>
      </Card>
    </main>
  );
}

function PasswordField({
  label,
  name,
  placeholder,
  testId,
}: {
  label: string;
  name: string;
  placeholder: string;
  testId: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <span className="relative block">
        <span className="absolute top-1/2 left-4 z-10 -translate-y-1/2 text-muted-foreground">
          <LockKeyhole className="size-4" />
        </span>
        <Input
          className="h-11 rounded-lg pl-12 text-[15px]"
          data-testid={testId}
          minLength={8}
          name={name}
          placeholder={placeholder}
          required
          type="password"
        />
      </span>
    </label>
  );
}
