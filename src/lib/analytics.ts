import posthog from 'posthog-js';

// Initialize PostHog (call once on app load)
export const initAnalytics = () => {
  if (typeof window !== 'undefined' && !posthog.__loaded) {
    posthog.init('YOUR_POSTHOG_API_KEY', {
      api_host: 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
      // Respect user privacy
      respect_dnt: true,
    });
  }
};

// Identify user (call on login/signup)
export const identifyUser = (userId: string, email?: string) => {
  posthog.identify(userId, email ? { email } : {});
};

// Reset on logout
export const resetAnalytics = () => {
  posthog.reset();
};

// Track events with properties
export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  posthog.capture(event, properties);
};
