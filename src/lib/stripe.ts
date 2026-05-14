import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

export function createStripeClient() {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"));
}
