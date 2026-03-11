interface StaticContentPage {
  contentHtml: string;
  lastUpdated: string;
  title: string;
}

interface HelpSupportPage extends StaticContentPage {
  supportEmail: string;
}

const LAST_UPDATED = "2026-01-15";

const CONTENT_PAGES = {
  privacyPolicy: {
    title: "Privacy Policy",
    contentHtml: "<h1>Privacy Policy</h1><p>We handle your account, learning, and support data to operate Fluently securely and reliably.</p>",
    lastUpdated: LAST_UPDATED,
  },
  termsAndConditions: {
    title: "Terms & Conditions",
    contentHtml: "<h1>Terms & Conditions</h1><p>By using Fluently, you agree to the platform terms, billing terms, and acceptable use rules.</p>",
    lastUpdated: LAST_UPDATED,
  },
  refundPolicy: {
    title: "Pricing & Refund Policy",
    contentHtml: "<h1>Pricing & Refund Policy</h1><p>Subscription pricing, trial policies, and refund handling are described here.</p>",
    lastUpdated: LAST_UPDATED,
  },
  helpSupport: {
    title: "Help & Support",
    contentHtml: "<h1>Help & Support</h1><p>Reach out if you need account, billing, or learning support.</p>",
    supportEmail: "support@fluently.app",
    lastUpdated: LAST_UPDATED,
  },
} satisfies {
  helpSupport: HelpSupportPage;
  privacyPolicy: StaticContentPage;
  refundPolicy: StaticContentPage;
  termsAndConditions: StaticContentPage;
};

export interface ContentServiceContract {
  getHelpSupport(): Promise<HelpSupportPage>;
  getPrivacyPolicy(): Promise<StaticContentPage>;
  getRefundPolicy(): Promise<StaticContentPage>;
  getTermsAndConditions(): Promise<StaticContentPage>;
}

export class ContentService implements ContentServiceContract {
  async getPrivacyPolicy() {
    return CONTENT_PAGES.privacyPolicy;
  }

  async getTermsAndConditions() {
    return CONTENT_PAGES.termsAndConditions;
  }

  async getRefundPolicy() {
    return CONTENT_PAGES.refundPolicy;
  }

  async getHelpSupport() {
    return CONTENT_PAGES.helpSupport;
  }
}
