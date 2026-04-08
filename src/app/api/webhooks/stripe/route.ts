import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPriceConfig } from "@/lib/stripe-config";
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
  const priceConfig = getPriceConfig();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      if (!userId) break;

      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id
      );
      const priceId = lineItems.data[0]?.price?.id;
      if (!priceId) break;

      const config = priceConfig[priceId];
      if (!config) break;

      if (session.mode === "subscription") {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await admin
          .from("profiles")
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            subscription_tier: config.tier,
            plan_type: "subscription",
            subscription_period_end: new Date(
              subscription.items.data[0].current_period_end * 1000
            ).toISOString(),
          })
          .eq("user_id", userId);

        await admin.rpc("reset_credits", {
          p_user_id: userId,
          p_amount: config.credits,
          p_reason: "subscription_started",
        });
      } else if (session.mode === "payment") {
        await admin.rpc("add_credits", {
          p_user_id: userId,
          p_amount: config.credits,
          p_reason: "purchase_credit_pack",
          p_stripe_payment_id: session.payment_intent as string,
        });

        const { data: profile } = await admin
          .from("profiles")
          .select("plan_type")
          .eq("user_id", userId)
          .single();

        if (profile?.plan_type === "free") {
          await admin
            .from("profiles")
            .update({ plan_type: "credit_pack" })
            .eq("user_id", userId);
        }
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;

      if (invoice.billing_reason === "subscription_create") break;

      // In Stripe SDK v20+, subscription is on parent.subscription_details
      const subDetails = invoice.parent?.subscription_details;
      if (!subDetails) break;
      const subscriptionId =
        typeof subDetails.subscription === "string"
          ? subDetails.subscription
          : subDetails.subscription?.id;
      if (!subscriptionId) break;

      const { data: profile } = await admin
        .from("profiles")
        .select("user_id, subscription_tier")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      if (!profile?.subscription_tier) break;

      const tier = profile.subscription_tier as "pro" | "ultimate";
      const credits = tier === "pro" ? 60 : 300;

      await admin.rpc("reset_credits", {
        p_user_id: profile.user_id,
        p_amount: credits,
        p_reason: "subscription_renewal",
      });

      await admin
        .from("profiles")
        .update({
          subscription_period_end: new Date(
            invoice.period_end * 1000
          ).toISOString(),
        })
        .eq("user_id", profile.user_id);

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const previousAttributes = event.data
        .previous_attributes as Partial<Stripe.Subscription>;

      if (previousAttributes?.cancel_at_period_end === undefined) break;

      const { data: profile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (!profile) break;

      await admin
        .from("profiles")
        .update({
          subscription_period_end: new Date(
            subscription.items.data[0].current_period_end * 1000
          ).toISOString(),
        })
        .eq("user_id", profile.user_id);

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      const { data: profile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (!profile) break;

      await admin
        .from("profiles")
        .update({
          plan_type: "free",
          stripe_subscription_id: null,
          subscription_tier: null,
          subscription_period_end: null,
          credits_remaining: 0,
        })
        .eq("user_id", profile.user_id);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
