import {
  AudioLines,
  CheckCircle2,
  LifeBuoy,
  Mail,
  PlayCircle,
  SquarePlay,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type React from "react";
import { signIn, signUp } from "@/app/auth/actions";
import {
  PasswordField,
  PendingPromptNotice,
} from "@/app/auth/auth-client-fields";
import { Aurora } from "@/components/common/aurora";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isMockMode } from "@/lib/app-config";
import { APP_NAME } from "@/lib/app-public-config";
import { createWorkspaceClient } from "@/lib/supabase";

type AuthPanel = "login" | "signup";
type AuthSearchParams = {
  error?: string;
  next?: string | string[];
};

export default function AuthPage({
  searchParams,
}: {
  searchParams: Promise<AuthSearchParams>;
}) {
  return <AuthScreen activePanel="login" searchParams={searchParams} />;
}

export async function AuthScreen({
  activePanel,
  searchParams,
}: {
  activePanel: AuthPanel;
  searchParams: Promise<AuthSearchParams>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(singleParam(params.next));
  const user = isMockMode
    ? null
    : (await (await createWorkspaceClient()).auth.getUser()).data.user;

  if (user) {
    redirect(next);
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-[1200px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            className="font-display flex items-center gap-3 text-[26px] font-semibold tracking-normal"
            href="/"
          >
            <LogoMark />
            {APP_NAME}
          </Link>
          <div className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <span>Need help?</span>
            <Button type="button" variant="outline">
              <LifeBuoy className="size-4" />
              Contact support
            </Button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 xl:grid-cols-[minmax(0,1fr)_480px] xl:gap-12">
          <ValuePanel />

          <Card className="mx-auto w-full max-w-[480px] gap-0 overflow-hidden p-0">
            <nav aria-label="Authentication" className="grid grid-cols-2">
              <AuthTab
                active={activePanel === "login"}
                href={authHref("/login", next)}
                label="Sign in"
              />
              <AuthTab
                active={activePanel === "signup"}
                href={authHref("/signup", next)}
                label="Sign up"
              />
            </nav>
            <AuthForm error={params.error} kind={activePanel} next={next} />
          </Card>
        </div>
      </section>
    </main>
  );
}

function ValuePanel() {
  return (
    <aside className="relative hidden overflow-hidden xl:block">
      <Aurora />
      <div className="relative">
        <h1 className="font-display max-w-[570px] text-[clamp(2.4rem,3vw,3.35rem)] leading-[1.16] font-medium tracking-normal">
          Create. Preview.
          <br />
          Publish to{" "}
          <span className="font-semibold text-primary">YouTube.</span>
        </h1>
        <p className="mt-5 max-w-[460px] text-base leading-7 text-muted-foreground">
          {APP_NAME} helps you generate original instrumental tracks with AI,
          preview in high quality, and publish directly to YouTube.
        </p>

        <div className="mt-7 grid max-w-[440px] gap-5">
          <Feature
            icon={<AudioLines className="size-7 text-primary" />}
            text="Create unique instrumental tracks in any style or mood."
            title="Generate"
          />
          <Feature
            icon={<PlayCircle className="size-7 text-primary" />}
            text="Instantly preview and refine your sound with our player."
            title="Preview"
          />
          <Feature
            icon={<SquarePlay className="size-7 text-primary" />}
            text="Publish to YouTube with a single click and grow your audience."
            title="Publish"
          />
        </div>
      </div>

      <div className="relative mt-10 max-w-[430px] rounded-lg border border-line bg-card p-5">
        <p className="text-sm leading-6 text-card-foreground">
          {APP_NAME} is my secret weapon for creating studio-quality
          instrumentals in minutes.
        </p>
        <p className="mt-5 text-sm font-medium">Alex M.</p>
        <p className="text-xs text-muted-foreground">Music Producer</p>
      </div>
    </aside>
  );
}

function AuthTab({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`font-display relative block border-b border-line px-4 pt-4 pb-3 text-center text-lg font-semibold transition-colors ${
        active
          ? "text-primary"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
      href={href}
    >
      {label}
      {active ? (
        <span className="absolute inset-x-0 bottom-0 block h-[3px] bg-primary" />
      ) : null}
    </Link>
  );
}

function AuthForm({
  error,
  kind,
  next,
}: {
  error?: string;
  kind: AuthPanel;
  next: string;
}) {
  const isSignup = kind === "signup";
  const action = isSignup ? signUp : signIn;

  return (
    <form
      action={action}
      className="px-5 py-5 sm:px-8 sm:py-6"
      data-testid={isSignup ? "screen-signup" : "screen-login"}
    >
      <input name="next" type="hidden" value={next} />

      {isSignup ? <PendingPromptNotice /> : null}

      {error ? (
        <p
          className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
          data-testid="error-state"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-3.5">
        {isSignup ? (
          <Field
            icon={<UserRound className="size-4" />}
            label="Full name"
            name="fullName"
            placeholder="Your full name"
            type="text"
          />
        ) : null}
        <Field
          icon={<Mail className="size-4" />}
          label="Email address"
          name="email"
          placeholder="you@example.com"
          type="email"
        />
        <PasswordField
          placeholder={
            isSignup ? "Create a strong password" : "Enter your password"
          }
        />
      </div>

      {isSignup ? <PasswordRules /> : <SignInOptions />}

      <Button
        className="mt-5 h-12 w-full text-base"
        data-testid={
          isSignup ? "signup-primary-action" : "login-primary-action"
        }
        type="submit"
      >
        {isSignup ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}

function authHref(path: "/login" | "/signup", next: string) {
  if (next === "/dashboard") {
    return path;
  }

  const params = new URLSearchParams({ next });

  return `${path}?${params.toString()}`;
}

function safeRedirectPath(value?: string) {
  if (!value) {
    return "/dashboard";
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("://")
  ) {
    return "/dashboard";
  }

  return value;
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Field({
  icon,
  label,
  name,
  placeholder,
  suffix,
  type,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  placeholder: string;
  suffix?: React.ReactNode;
  type: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <span className="relative block">
        <span className="absolute top-1/2 left-4 z-10 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          className="h-11 rounded-lg pl-12 pr-11 text-[15px]"
          name={name}
          placeholder={placeholder}
          required={name !== "fullName"}
          type={type}
        />
        {suffix ? (
          <span className="absolute top-1/2 right-4 z-10 -translate-y-1/2 text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function Feature({
  icon,
  text,
  title,
}: {
  icon: React.ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[56px_1fr] gap-4">
      <div className="grid size-14 place-items-center rounded-lg border border-line bg-panel">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-medium">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <span className="flex h-9 w-8 items-center justify-center gap-1">
      {[18, 27, 34, 25, 16].map((height, index) => (
        <span
          className="w-1 rounded-full bg-primary"
          key={`${height}-${index}`}
          style={{ height }}
        />
      ))}
    </span>
  );
}

function PasswordRules() {
  return (
    <div className="mt-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {["8+ characters", "1 uppercase", "1 number"].map((rule) => (
          <span className="flex items-center gap-1.5" key={rule}>
            <CheckCircle2 className="size-3.5" />
            {rule}
          </span>
        ))}
      </div>
      <label className="mt-3 flex items-start gap-2.5 leading-5">
        <input
          className="mt-0.5 size-4 rounded border border-border bg-transparent accent-primary"
          required
          type="checkbox"
        />
        <span>
          I agree to the{" "}
          <Link className="text-primary underline" href="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="text-primary underline" href="/privacy">
            Privacy Policy
          </Link>
        </span>
      </label>
    </div>
  );
}

function SignInOptions() {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-sm">
      <label className="flex items-center gap-2 text-muted-foreground">
        <input
          className="size-4 rounded border-border accent-primary"
          defaultChecked
          type="checkbox"
        />
        Remember me
      </label>
      <Link className="text-primary" href="/forgot-password">
        Forgot password?
      </Link>
    </div>
  );
}
