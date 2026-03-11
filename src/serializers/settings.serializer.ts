interface SettingsResponse {
  availableLanguages: Array<{ code: string; name: string }>;
  dailyReminderTime: string;
  language: string;
  notificationsEnabled: boolean;
}

interface ContentPageResponse {
  contentHtml: string;
  lastUpdated: string;
  title: string;
}

interface HelpSupportResponse extends ContentPageResponse {
  supportEmail: string;
}

export function serializeSettings(settings: SettingsResponse) {
  return {
    language: settings.language,
    available_languages: settings.availableLanguages,
    notifications_enabled: settings.notificationsEnabled,
    daily_reminder_time: settings.dailyReminderTime,
  };
}

export function serializeContentPage(page: ContentPageResponse) {
  return {
    title: page.title,
    content_html: page.contentHtml,
    last_updated: page.lastUpdated,
  };
}

export function serializeHelpSupport(page: HelpSupportResponse) {
  return {
    ...serializeContentPage(page),
    support_email: page.supportEmail,
  };
}
