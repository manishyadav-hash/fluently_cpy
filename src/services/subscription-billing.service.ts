import { env } from "../config/env";

export interface SubscriptionBillingServiceContract {
  getInvoiceUrl(subscriptionId: string): Promise<string>;
  getPaymentUrl(subscriptionId: string): Promise<string>;
}

export class PlaceholderSubscriptionBillingService implements SubscriptionBillingServiceContract {
  async getInvoiceUrl(subscriptionId: string): Promise<string> {
    return `${env.CDN_BASE_URL}/invoices/${subscriptionId}.pdf`;
  }

  async getPaymentUrl(subscriptionId: string): Promise<string> {
    return `${env.PAYMENTS_BASE_URL}/${subscriptionId}`;
  }
}
