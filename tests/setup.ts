import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_MODE ??= "live";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.STRIPE_SECRET_KEY ??= "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_placeholder";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= "pk_test_placeholder";
process.env.STRIPE_CREATOR_PRICE_ID ??= "price_creator_placeholder";
process.env.STRIPE_PRO_PRICE_ID ??= "price_pro_placeholder";
process.env.STRIPE_STUDIO_PRICE_ID ??= "price_studio_placeholder";
process.env.SECRETS_ENCRYPTION_KEY ??= "test-encryption-key";
process.env.GOOGLE_CLIENT_ID ??= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-google-client-secret";
process.env.GOOGLE_REDIRECT_URI ??=
  "http://localhost:3000/api/youtube/oauth/callback";
process.env.SUNO_DEFAULT_API_BASE_URL ??= "https://api.example.test";
process.env.WORKER_ID ??= "test-worker";
process.env.WORKER_MAX_CONCURRENCY ??= "2";
