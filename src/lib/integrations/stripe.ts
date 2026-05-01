import Stripe from "stripe";
import { env, requireEnv } from "@/lib/env";

export function createStripe() {
  return new Stripe(requireEnv(env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"), {
    appInfo: {
      name: "Suno YouTube MVP",
    },
  });
}
