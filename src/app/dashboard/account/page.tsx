import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import {
  AccountAnalytics,
  PurchaseButton,
  CancelButton,
} from "@/components/account/account-analytics";
import { getCreditPackPriceId, getPriceIdForTier } from "@/lib/stripe-config";

async function createCheckoutSession(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const priceId = formData.get("priceId") as string;
  const mode = formData.get("mode") as "payment" | "subscription";
  const headerList = await headers();
  const origin = headerList.get("origin") || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/account?success=true`,
    cancel_url: `${origin}/dashboard/account?canceled=true`,
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { user_id: user.id },
  });

  redirect(session.url!);
}

async function cancelSubscription() {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) return;

  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  redirect("/dashboard/account");
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const planType = profile?.plan_type ?? "free";
  const subscriptionTier = profile?.subscription_tier;
  const isSubscribed = planType === "subscription";
  const periodEnd = profile?.subscription_period_end
    ? new Date(profile.subscription_period_end).toLocaleDateString()
    : null;

  // Check if subscription is set to cancel
  let cancelAtPeriodEnd = false;
  if (isSubscribed && profile?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(
        profile.stripe_subscription_id
      );
      cancelAtPeriodEnd = sub.cancel_at_period_end;
    } catch {
      // Subscription may have been deleted
    }
  }

  const planDisplayName = isSubscribed
    ? subscriptionTier === "ultimate"
      ? "Ultimate"
      : "Pro"
    : planType === "credit_pack"
      ? "Credit Pack"
      : "Free";

  return (
    <div className="max-w-2xl">
      <AccountAnalytics creditBalance={profile?.credits_remaining ?? 0} />
      <h1 className="text-2xl font-bold mb-6">Account & Billing</h1>

      {/* Current Plan Banner */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
              Current Plan
            </p>
            <p className="text-2xl font-bold mt-1">{planDisplayName}</p>
            {isSubscribed && periodEnd && (
              <p className="text-sm text-gray-500 mt-1">
                {cancelAtPeriodEnd
                  ? `Cancels ${periodEnd}`
                  : `Renews ${periodEnd}`}
                {subscriptionTier === "pro" ? " · $7.99/mo" : " · $19.99/mo"}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">
              {profile?.credits_remaining ?? 0}
            </p>
            <p className="text-xs text-gray-500">credits remaining</p>
          </div>
        </div>
        {isSubscribed && !cancelAtPeriodEnd && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <CancelButton cancelAction={cancelSubscription} />
          </div>
        )}
        {isSubscribed && cancelAtPeriodEnd && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-amber-600">
              Your subscription will end on {periodEnd}. You&rsquo;ll keep your
              remaining credits until then.
            </p>
          </div>
        )}
      </div>

      {/* Subscription Plans */}
      <h2 className="text-lg font-medium mb-3">
        {isSubscribed && cancelAtPeriodEnd
          ? "Resubscribe"
          : isSubscribed
            ? "Your Plan"
            : "Upgrade Plan"}
      </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Pro */}
            <div
              className={`rounded-lg p-5 relative ${
                subscriptionTier === "pro" && !cancelAtPeriodEnd
                  ? "border-2 border-gray-900"
                  : "border border-gray-200"
              }`}
            >
              {subscriptionTier === "pro" && !cancelAtPeriodEnd && (
                <span className="absolute -top-2.5 left-4 bg-gray-900 text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                  Current
                </span>
              )}
              <p className="text-xs font-semibold tracking-wider uppercase text-gray-500">
                Pro
              </p>
              <p className="text-3xl font-bold mt-2">
                $7.99
                <span className="text-sm font-normal text-gray-400">/mo</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                60 credits per month
              </p>
              {(subscriptionTier !== "pro" || cancelAtPeriodEnd) && (
                <form action={createCheckoutSession} className="mt-4">
                  <input
                    type="hidden"
                    name="priceId"
                    value={getPriceIdForTier("pro")}
                  />
                  <input type="hidden" name="mode" value="subscription" />
                  <PurchaseButton
                    planLabel="Pro"
                    currentPlanType={planType}
                  >
                    <span className="block text-center text-xs font-semibold tracking-wider uppercase">
                      {isSubscribed ? "Resubscribe" : "Get Pro"}
                    </span>
                  </PurchaseButton>
                </form>
              )}
            </div>

            {/* Ultimate */}
            <div
              className={`rounded-lg p-5 relative bg-[#fafaf9] ${
                subscriptionTier === "ultimate" && !cancelAtPeriodEnd
                  ? "border-2 border-gray-900"
                  : "border border-gray-200"
              }`}
            >
              <span className="absolute -top-2.5 left-4 bg-gray-900 text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                {subscriptionTier === "ultimate" && !cancelAtPeriodEnd
                  ? "Current"
                  : "Best Value"}
              </span>
              <p className="text-xs font-semibold tracking-wider uppercase text-gray-500">
                Ultimate
              </p>
              <p className="text-3xl font-bold mt-2">
                $19.99
                <span className="text-sm font-normal text-gray-400">/mo</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                300 credits per month
              </p>
              {(subscriptionTier !== "ultimate" || cancelAtPeriodEnd) && (
                <form action={createCheckoutSession} className="mt-4">
                  <input
                    type="hidden"
                    name="priceId"
                    value={getPriceIdForTier("ultimate")}
                  />
                  <input type="hidden" name="mode" value="subscription" />
                  <PurchaseButton
                    planLabel="Ultimate"
                    currentPlanType={planType}
                  >
                    <span className="block text-center text-xs font-semibold tracking-wider uppercase">
                      {subscriptionTier === "ultimate" && cancelAtPeriodEnd
                        ? "Resubscribe"
                        : "Upgrade"}
                    </span>
                  </PurchaseButton>
                </form>
              )}
            </div>
          </div>

      {/* Credit Pack */}
      <h2 className="text-lg font-medium mb-3">Buy Credits</h2>
      <div className="border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg font-bold">30 Credits</p>
            <p className="text-sm text-gray-500">
              One-time purchase &middot; no subscription required
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-2xl font-bold">$3.99</p>
            <form action={createCheckoutSession}>
              <input
                type="hidden"
                name="priceId"
                value={getCreditPackPriceId()}
              />
              <input type="hidden" name="mode" value="payment" />
              <PurchaseButton planLabel="30 Credits" currentPlanType={planType}>
                <span className="block text-center text-xs font-semibold tracking-wider uppercase">
                  Buy
                </span>
              </PurchaseButton>
            </form>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <h2 className="text-lg font-medium mb-3">Transaction History</h2>
      <div className="overflow-x-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium">
                  Reason
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium">
                  Credits
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions?.map(
                (t: {
                  id: string;
                  created_at: string;
                  reason: string;
                  amount: number;
                }) => (
                  <tr key={t.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 text-sm">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {t.reason.replace(/_/g, " ")}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-medium ${
                        t.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {t.amount > 0 ? "+" : ""}
                      {t.amount}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
