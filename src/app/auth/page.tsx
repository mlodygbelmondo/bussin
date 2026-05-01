import {
  Apple,
  AudioLines,
  CheckCircle2,
  EyeOff,
  LifeBuoy,
  LockKeyhole,
  Mail,
  PlayCircle,
  SquarePlay,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type React from "react";
import { signIn, signUp } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME, isMockMode } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";

type AuthPanel = "login" | "signup";

export default function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <AuthScreen activePanel="login" searchParams={searchParams} />;
}

export async function AuthScreen({
  activePanel,
  searchParams,
}: {
  activePanel: AuthPanel;
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const user = isMockMode
    ? null
    : (await (await createClient()).auth.getUser()).data.user;

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-[100dvh] bg-[#040917] p-1 text-white">
      <section className="relative min-h-[calc(100dvh-0.5rem)] overflow-hidden rounded-xl border border-[#25314d] bg-[radial-gradient(circle_at_18%_84%,rgba(145,72,255,0.24),transparent_25rem),radial-gradient(circle_at_38%_70%,rgba(28,103,255,0.18),transparent_28rem),linear-gradient(135deg,#060b18_0%,#071126_50%,#060b18_100%)] px-6 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] lg:px-10">
        <header className="relative z-10 flex items-center justify-between gap-4">
          <Link
            className="flex items-center gap-3 text-[26px] font-semibold tracking-tight"
            href="/"
          >
            <LogoMark />
            {APP_NAME}
          </Link>
          <div className="hidden items-center gap-5 text-sm text-[#abb4ca] sm:flex">
            <span>Need help?</span>
            <Button
              className="h-10 rounded-lg border-[#33415f] bg-[#172036]/85 px-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[#202b46]"
              variant="outline"
            >
              <LifeBuoy className="size-4" />
              Contact support
            </Button>
          </div>
        </header>

        <div className="relative z-10 mt-9 grid gap-8 xl:grid-cols-[0.67fr_1fr] xl:items-start">
          <ValuePanel />

          <section className="overflow-hidden rounded-xl border border-[#34415e] bg-[linear-gradient(135deg,rgba(31,39,65,0.92),rgba(10,18,35,0.94))] shadow-[0_28px_90px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="grid lg:grid-cols-2">
              <AuthForm
                active={activePanel === "login"}
                error={activePanel === "login" ? params.error : undefined}
                kind="login"
              />
              <AuthForm
                active={activePanel === "signup"}
                error={activePanel === "signup" ? params.error : undefined}
                kind="signup"
              />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ValuePanel() {
  return (
    <aside className="relative min-h-[760px] overflow-hidden rounded-xl xl:min-h-[820px]">
      <div className="relative z-10 pt-12">
        <h1 className="max-w-[570px] text-[44px] leading-[1.18] font-medium tracking-normal text-white sm:text-[56px]">
          Create. Preview.
          <br />
          Publish to{" "}
          <span className="bg-gradient-to-r from-[#9a63ff] to-[#4084ff] bg-clip-text font-semibold text-transparent">
            YouTube.
          </span>
        </h1>
        <p className="mt-6 max-w-[460px] text-lg leading-8 text-[#aeb7cb]">
          {APP_NAME} helps you generate original instrumental tracks with AI,
          preview in high quality, and publish directly to YouTube.
        </p>

        <div className="mt-10 grid max-w-[430px] gap-9">
          <Feature
            icon={<AudioLines className="size-7 text-[#c058ff]" />}
            text="Create unique instrumental tracks in any style or mood."
            title="Generate"
          />
          <Feature
            icon={<PlayCircle className="size-7 text-[#9d63ff]" />}
            text="Instantly preview and refine your sound with our player."
            title="Preview"
          />
          <Feature
            icon={
              <SquarePlay className="size-7 fill-[#e056ff]/70 text-[#df58ff]" />
            }
            text="Publish to YouTube with a single click and grow your audience."
            title="Publish"
          />
        </div>
      </div>

      <div className="absolute right-0 bottom-8 left-0 h-[340px]">
        <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full border border-[#283653] bg-[radial-gradient(circle_at_42%_30%,#2b3457,#090d17_68%)] shadow-[0_0_40px_rgba(88,92,255,0.28)]">
          <div className="absolute inset-x-5 top-8 h-28 rounded-t-full border-[10px] border-[#202842]" />
          <div className="absolute bottom-0 left-[-8px] h-24 w-9 rounded-full border border-[#4c5c8d] bg-[#0d1328]" />
          <div className="absolute right-[-8px] bottom-0 h-24 w-9 rounded-full border border-[#4c5c8d] bg-[#0d1328]" />
        </div>

        <div className="absolute right-0 bottom-12 left-36 h-64 rounded-[2rem] border border-[#23365b] bg-[linear-gradient(145deg,#0b1122,#111832)] shadow-[0_26px_80px_rgba(26,92,255,0.22)]">
          <div className="absolute inset-x-8 bottom-8 flex h-40 items-end gap-2">
            {[
              28, 36, 22, 54, 42, 73, 46, 87, 62, 103, 78, 126, 97, 139, 111,
              151, 132,
            ].map((height, index) => (
              <span
                className="flex-1 rounded-t-full bg-gradient-to-t from-[#ff4ee8] via-[#895dff] to-[#31dcff] shadow-[0_0_18px_rgba(139,93,255,0.9)]"
                key={`${height}-${index}`}
                style={{ height }}
              />
            ))}
          </div>
          <div className="absolute inset-x-4 top-16 h-32 rounded-[50%] border-t border-[#4d4dff]/50 opacity-70" />
          <div className="absolute inset-x-6 top-20 h-28 rounded-[50%] border-t border-[#c353ff]/45 opacity-70" />
          <div className="absolute inset-x-10 top-24 h-24 rounded-[50%] border-t border-[#28d7ff]/45 opacity-70" />
        </div>
      </div>

      <div className="absolute bottom-8 left-0 z-20 max-w-[390px] rounded-lg border border-[#35415f] bg-[linear-gradient(135deg,rgba(43,51,82,0.95),rgba(35,29,69,0.94))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur">
        <div className="text-4xl leading-none text-[#c9adff]">”</div>
        <p className="mt-1 text-sm leading-6 text-[#d6d9e5]">
          {APP_NAME} is my secret weapon for creating studio-quality
          instrumentals in minutes.
        </p>
        <p className="mt-5 text-sm text-white">— Alex M.</p>
        <p className="text-xs text-[#9ca6bc]">Music Producer</p>
        <div className="absolute right-6 bottom-4 flex gap-1.5">
          {[0, 1, 2, 3, 4].map((item) => (
            <span
              className={`size-1.5 rounded-full ${
                item === 0 ? "bg-[#b368ff]" : "bg-[#798098]"
              }`}
              key={item}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function AuthForm({
  active,
  error,
  kind,
}: {
  active: boolean;
  error?: string;
  kind: AuthPanel;
}) {
  const isSignup = kind === "signup";
  const title = isSignup ? "Sign up" : "Sign in";
  const action = isSignup ? signUp : signIn;

  return (
    <form
      action={action}
      className={`min-h-[760px] px-8 py-11 sm:px-10 lg:min-h-[820px] ${
        isSignup ? "border-t border-[#34415e] lg:border-t-0 lg:border-l" : ""
      }`}
      data-testid={isSignup ? "screen-signup" : "screen-login"}
    >
      <h2
        className={`text-center text-xl font-semibold ${
          active ? "text-[#a56cff]" : "text-white"
        }`}
      >
        {title}
      </h2>
      <div className="mt-6 h-px bg-[#303a56]">
        {active ? (
          <div className="h-[3px] rounded-full bg-gradient-to-r from-[#a85fff] to-[#8557ff] shadow-[0_0_18px_rgba(168,95,255,0.85)]" />
        ) : null}
      </div>

      <div className="mt-8 grid gap-3">
        <SocialButton label="Continue with Google" mark="G" />
        <SocialButton
          icon={<Apple className="size-5 fill-white" />}
          label="Continue with Apple"
        />
        <SocialButton
          icon={<span className="text-xl leading-none text-[#6978ff]">●●</span>}
          label="Continue with Discord"
        />
      </div>

      <div className="my-8 flex items-center gap-4 text-sm text-[#a4aec4]">
        <span className="h-px flex-1 bg-[#303a56]" />
        or continue with email
        <span className="h-px flex-1 bg-[#303a56]" />
      </div>

      {error ? (
        <p
          className="mb-5 rounded-md border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100"
          data-testid="error-state"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-5">
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
        <Field
          icon={<LockKeyhole className="size-4" />}
          label="Password"
          name="password"
          placeholder={
            isSignup ? "Create a strong password" : "Enter your password"
          }
          suffix={<EyeOff className="size-4" />}
          type="password"
        />
      </div>

      {isSignup ? <PasswordRules /> : <SignInOptions />}

      <Button
        className="mt-8 h-12 w-full rounded-lg bg-gradient-to-r from-[#725dff] to-[#b145f1] text-base font-medium shadow-[0_0_28px_rgba(134,86,255,0.35)] hover:from-[#816eff] hover:to-[#bf57fb]"
        data-testid={
          isSignup ? "signup-primary-action" : "login-primary-action"
        }
        type="submit"
      >
        {isSignup ? "Create account" : "Sign in"}
      </Button>

      <p className="mt-5 text-center text-sm text-[#aab3c8]">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <Link
          className="text-[#ad78ff] underline underline-offset-2"
          href={isSignup ? "/login" : "/signup"}
        >
          {isSignup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
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
    <label className="grid gap-2 text-sm font-medium text-white">
      {label}
      <span className="relative block">
        <span className="absolute top-1/2 left-4 z-10 -translate-y-1/2 text-[#8994ad]">
          {icon}
        </span>
        <Input
          className="h-12 rounded-lg border-[#34415e] bg-[#111a2e]/80 pr-11 pl-12 text-[15px] placeholder:text-[#7e889f] focus-visible:bg-[#121d34]"
          name={name}
          placeholder={placeholder}
          required={name !== "fullName"}
          type={type}
        />
        {suffix ? (
          <span className="absolute top-1/2 right-4 z-10 -translate-y-1/2 text-[#8994ad]">
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
      <div className="grid size-14 place-items-center rounded-lg border border-[#2a3858] bg-[#121a30]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-medium text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#a7b0c5]">{text}</p>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <span className="flex h-9 w-8 items-center justify-center gap-1">
      {[18, 27, 34, 25, 16].map((height, index) => (
        <span
          className="w-1 rounded-full bg-gradient-to-b from-[#b95cff] to-[#4e83ff]"
          key={`${height}-${index}`}
          style={{ height }}
        />
      ))}
    </span>
  );
}

function PasswordRules() {
  return (
    <div className="mt-5 grid gap-2 text-sm text-[#9fa9bf]">
      <p>Password must contain:</p>
      {["At least 8 characters", "One uppercase letter", "One number"].map(
        (rule) => (
          <span className="flex items-center gap-2" key={rule}>
            <CheckCircle2 className="size-4 text-[#758099]" />
            {rule}
          </span>
        ),
      )}
      <label className="mt-4 flex items-start gap-3 text-sm leading-6">
        <input
          className="mt-1 size-4 rounded border border-[#6d7891] bg-transparent"
          required
          type="checkbox"
        />
        <span>
          I agree to the{" "}
          <Link className="text-[#ad78ff] underline" href="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="text-[#ad78ff] underline" href="/privacy">
            Privacy Policy
          </Link>
        </span>
      </label>
    </div>
  );
}

function SignInOptions() {
  return (
    <div className="mt-5 flex items-center justify-between gap-4 text-sm">
      <label className="flex items-center gap-2 text-[#aab3c8]">
        <input
          className="size-4 rounded border-[#6d7891] accent-[#865cff]"
          defaultChecked
          type="checkbox"
        />
        Remember me
      </label>
      <Link className="text-[#ad78ff]" href="/forgot-password">
        Forgot password?
      </Link>
    </div>
  );
}

function SocialButton({
  icon,
  label,
  mark,
}: {
  icon?: React.ReactNode;
  label: string;
  mark?: string;
}) {
  return (
    <button
      className="grid h-12 grid-cols-[1fr_auto_1fr] items-center rounded-lg border border-[#34415e] bg-[#172035]/80 px-5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-[#202a43]"
      type="button"
    >
      <span />
      <span className="flex items-center gap-4">
        {mark ? (
          <span className="text-xl font-bold">
            <span className="text-[#4285f4]">G</span>
          </span>
        ) : (
          icon
        )}
        {label}
      </span>
      <span />
    </button>
  );
}
