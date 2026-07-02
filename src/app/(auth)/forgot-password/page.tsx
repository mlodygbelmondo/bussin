import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card
        className="w-full max-w-[480px] gap-0 overflow-hidden p-0"
        data-testid="screen-forgot-password"
      >
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          {sent ? (
            <div className="grid justify-items-center gap-3 text-center">
              <span className="grid size-14 place-items-center rounded-lg border border-line bg-panel">
                <MailCheck className="size-7 text-primary" />
              </span>
              <h1 className="text-xl font-semibold">Check your email</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                If an account exists for that address, we sent a link to reset
                your password. The link expires after a short while, so use it
                soon.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold">Forgot your password?</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Enter the email address for your account and we will send you a
                link to reset your password.
              </p>

              {params.error ? (
                <p
                  className="mt-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
                  data-testid="error-state"
                >
                  {params.error}
                </p>
              ) : null}

              <form action={requestPasswordReset} className="mt-5 grid gap-4">
                <label className="grid gap-1.5 text-sm font-medium">
                  Email address
                  <span className="relative block">
                    <span className="absolute top-1/2 left-4 z-10 -translate-y-1/2 text-muted-foreground">
                      <Mail className="size-4" />
                    </span>
                    <Input
                      className="h-11 rounded-lg pl-12 text-[15px]"
                      data-testid="forgot-password-email"
                      name="email"
                      placeholder="you@example.com"
                      required
                      type="email"
                    />
                  </span>
                </label>

                <Button
                  className="h-12 w-full text-base"
                  data-testid="forgot-password-submit"
                  type="submit"
                >
                  Send reset link
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm">
            <Link
              className="inline-flex items-center gap-1.5 text-primary"
              href="/login"
            >
              <ArrowLeft className="size-4" />
              Back to sign in
            </Link>
          </p>
        </div>
      </Card>
    </main>
  );
}
