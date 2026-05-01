import { AuthScreen } from "@/app/auth/page";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string | string[] }>;
}) {
  return <AuthScreen activePanel="login" searchParams={searchParams} />;
}
