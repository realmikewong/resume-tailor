"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function AccountAnalytics({ creditBalance }: { creditBalance: number }) {
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
      onClick={() => trackEvent("upgrade_clicked", { plan: planLabel, plan_type: currentPlanType })}
      className="w-full bg-white p-6 rounded-lg shadow-sm border-2 border-gray-200 hover:border-blue-500 text-left"
    >
      {children}
    </button>
  );
}
