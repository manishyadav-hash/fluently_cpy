interface TrialOfferResponse {
  autoRenew: boolean;
  benefits: string[];
  durationDays: number;
  priceAmount: number;
  priceCurrency: string;
  warningText: string;
}

interface SubscriptionPlanResponse {
  badge: string | null;
  description: string | null;
  id: string;
  interval: "month" | "year";
  monthlyEquivalent: number | null;
  name: string;
  priceAmount: number;
  priceCurrency: string;
}

interface SubscriptionResponse {
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  id: string;
  paymentUrl: string;
  planId: string | null;
  status: "trial" | "active" | "expired" | "cancelled" | "pending";
  trialEndDate: Date | null;
}

interface CancelSubscriptionResponse {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  id: string;
  status: "trial" | "active" | "expired" | "cancelled" | "pending";
}

interface InvoiceResponse {
  amount: number;
  currency: string;
  invoiceDate: string;
  invoiceUrl: string;
  planName: string;
  status: string;
}

export function serializeTrialOffer(trialOffer: TrialOfferResponse) {
  return {
    price_amount: trialOffer.priceAmount,
    price_currency: trialOffer.priceCurrency,
    duration_days: trialOffer.durationDays,
    auto_renew: trialOffer.autoRenew,
    benefits: trialOffer.benefits,
    warning_text: trialOffer.warningText,
  };
}

export function serializeSubscriptionPlan(plan: SubscriptionPlanResponse) {
  return {
    id: plan.id,
    name: plan.name,
    interval: plan.interval,
    price_amount: plan.priceAmount,
    price_currency: plan.priceCurrency,
    monthly_equivalent: plan.monthlyEquivalent,
    badge: plan.badge,
    description: plan.description,
  };
}

export function serializeCheckoutSubscription(subscription: SubscriptionResponse) {
  return {
    id: subscription.id,
    plan_id: subscription.planId,
    status: subscription.status,
    trial_end_date: toIsoOrNull(subscription.trialEndDate),
    current_period_start: toIsoOrNull(subscription.currentPeriodStart),
    current_period_end: toIsoOrNull(subscription.currentPeriodEnd),
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
    created_at: subscription.createdAt.toISOString(),
    payment_url: subscription.paymentUrl,
  };
}

export function serializeCurrentSubscription(subscription: SubscriptionResponse | null) {
  if (!subscription) {
    return null;
  }

  return {
    id: subscription.id,
    plan_id: subscription.planId,
    status: subscription.status,
    trial_end_date: toIsoOrNull(subscription.trialEndDate),
    current_period_start: toIsoOrNull(subscription.currentPeriodStart),
    current_period_end: toIsoOrNull(subscription.currentPeriodEnd),
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
    created_at: subscription.createdAt.toISOString(),
  };
}

export function serializeCancelledSubscription(subscription: CancelSubscriptionResponse) {
  return {
    id: subscription.id,
    status: subscription.status,
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
    current_period_end: toIsoOrNull(subscription.currentPeriodEnd),
  };
}

export function serializeInvoice(invoice: InvoiceResponse) {
  return {
    invoice_url: invoice.invoiceUrl,
    invoice_date: invoice.invoiceDate,
    amount: invoice.amount,
    currency: invoice.currency,
    plan_name: invoice.planName,
    status: invoice.status,
  };
}

function toIsoOrNull(value: Date | null) {
  return value ? value.toISOString() : null;
}
