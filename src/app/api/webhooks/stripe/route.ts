import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;

      if (!userId) break;

      if (session.mode === "payment") {
        // One-time credit pack purchase: add 10 credits atomically
        await admin.rpc("add_credits", {
          p_user_id: userId,
          p_amount: 10,
          p_reason: "purchase_credit_pack",
          p_stripe_payment_id: session.payment_intent as string,
        });

        await admin
          .from("profiles")
          .update({ plan_type: "credit_pack" })
          .eq("user_id", userId);
      }

      if (session.mode === "subscription") {
        // First subscription payment: add 15 credits atomically
        await admin.rpc("add_credits", {
          p_user_id: userId,
          p_amount: 15,
          p_reason: "subscription_payment",
          p_stripe_payment_id: session.subscription as string,
        });

        await admin
          .from("profiles")
          .update({ plan_type: "subscription" })
          .eq("user_id", userId);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      // Recurring subscription renewal
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string; billing_reason?: string };
      if (invoice.billing_reason !== "subscription_cycle") break;

      // Find user by subscription ID
      const subscriptionId = invoice.subscription as string;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.user_id;

      if (!userId) break;

      await admin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: 15,
        p_reason: "subscription_renewal",
        p_stripe_payment_id: invoice.id,
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
