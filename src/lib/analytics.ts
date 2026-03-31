declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...properties });
}
