"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function AccountAnalytics({
  creditBalance,
}: {
  creditBalance: number;
}) {
  useEffect(() => {
    if (creditBalance === 0) {
      trackEvent("credits_exhausted");
    }
  }, [creditBalance]);
  return null;
}

export function PurchaseButton({
  planLabel,
  currentPlanType,
  children,
}: {
  planLabel: string;
  currentPlanType: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      onClick={() =>
        trackEvent("upgrade_clicked", {
          plan: planLabel,
          plan_type: currentPlanType,
        })
      }
      className="w-full bg-white p-6 rounded-lg shadow-sm border-2 border-gray-200 hover:border-blue-500 text-left"
    >
      {children}
    </button>
  );
}

export function CancelButton({
  cancelAction,
}: {
  cancelAction: () => Promise<void>;
}) {
  return (
    <button
      onClick={async () => {
        if (
          confirm(
            "Are you sure you want to cancel your subscription? You'll keep your credits until the end of your billing period."
          )
        ) {
          trackEvent("subscription_cancel_clicked");
          await cancelAction();
        }
      }}
      className="text-sm text-gray-400 underline hover:text-gray-600 transition-colors"
    >
      Cancel subscription
    </button>
  );
}
