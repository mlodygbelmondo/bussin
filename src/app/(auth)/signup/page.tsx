import { AuthScreen } from "@/app/auth/page";

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <AuthScreen activePanel="signup" searchParams={searchParams} />;
}
