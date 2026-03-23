import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

// Map Stripe price IDs to credit amounts
const PRICE_TO_CREDITS: Record<string, number> = {
  "price_1TDzVSLzuvlRUbnLXqtUb2DP": 1,
  "price_1TDzW4LzuvlRUbnLt7rfrfvt": 5,
  "price_1TDzWNLzuvlRUbnLr83sFm4k": 10,
};

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
        // Look up the price ID from the line items
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        const credits = priceId ? PRICE_TO_CREDITS[priceId] ?? 0 : 0;

        if (credits > 0) {
          await admin.rpc("add_credits", {
            p_user_id: userId,
            p_amount: credits,
            p_reason: "purchase_credit_pack",
            p_stripe_payment_id: session.payment_intent as string,
          });

          await admin
            .from("profiles")
            .update({ plan_type: "credit_pack" })
            .eq("user_id", userId);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
