export interface PriceConfig {
  tier?: "pro" | "ultimate";
  credits: number;
}

export function getPriceConfig(): Record<string, PriceConfig> {
  return {
    [process.env.STRIPE_PRICE_PRO_MONTHLY!]: { tier: "pro", credits: 60 },
    [process.env.STRIPE_PRICE_ULTIMATE_MONTHLY!]: {
      tier: "ultimate",
      credits: 300,
    },
    [process.env.STRIPE_PRICE_CREDIT_PACK!]: { credits: 30 },
  };
}

export function getPriceIdForTier(tier: "pro" | "ultimate"): string {
  return tier === "pro"
    ? process.env.STRIPE_PRICE_PRO_MONTHLY!
    : process.env.STRIPE_PRICE_ULTIMATE_MONTHLY!;
}

export function getCreditPackPriceId(): string {
  return process.env.STRIPE_PRICE_CREDIT_PACK!;
}
