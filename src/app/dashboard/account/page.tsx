import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

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

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Account & Billing</h1>

      {/* Credit Balance */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <p className="text-sm text-gray-500">Credit Balance</p>
        <p className="text-4xl font-bold">{profile?.credits_remaining ?? 0}</p>
        <p className="text-sm text-gray-400 mt-1">
          Plan: {profile?.plan_type ?? "free"}
        </p>
      </div>

      {/* Purchase Options */}
      <h2 className="text-lg font-medium mb-3">Purchase Credits</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <form action={createCheckoutSession}>
          <input type="hidden" name="priceId" value={process.env.STRIPE_CREDIT_PACK_PRICE_ID} />
          <input type="hidden" name="mode" value="payment" />
          <button
            type="submit"
            className="w-full bg-white p-6 rounded-lg shadow-sm border-2 border-gray-200 hover:border-blue-500 text-left"
          >
            <h3 className="font-bold text-lg">10 Credits</h3>
            <p className="text-gray-500 text-sm">One-time purchase</p>
            <p className="text-2xl font-bold mt-2">$9.99</p>
          </button>
        </form>
        <form action={createCheckoutSession}>
          <input type="hidden" name="priceId" value={process.env.STRIPE_MONTHLY_PRICE_ID} />
          <input type="hidden" name="mode" value="subscription" />
          <button
            type="submit"
            className="w-full bg-white p-6 rounded-lg shadow-sm border-2 border-gray-200 hover:border-blue-500 text-left"
          >
            <h3 className="font-bold text-lg">15 Credits/Month</h3>
            <p className="text-gray-500 text-sm">Monthly subscription</p>
            <p className="text-2xl font-bold mt-2">$14.99/mo</p>
          </button>
        </form>
      </div>

      {/* Transaction History */}
      <h2 className="text-lg font-medium mb-3">Transaction History</h2>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Reason</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Credits</th>
            </tr>
          </thead>
          <tbody>
            {transactions?.map((t: { id: string; created_at: string; reason: string; amount: number }) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
