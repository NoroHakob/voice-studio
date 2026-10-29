import { polar } from "@/lib/polar";

// Customer doesn't exist in Polar yet -> no subscription
export async function hasActiveSubscription(orgId: string): Promise<boolean> {
  try {
    const customerState = await polar.customers.getStateExternal({
      externalId: orgId,
    });
    return (customerState.activeSubscriptions ?? []).length > 0;
  } catch {
    return false;
  }
}
