const POSTHOG_API_KEY = "phc_p7UUw6GZ8h3JsZmK82XMKt9KTjJ40oqkZ4Un9vtNeRm";
const POSTHOG_HOST = "https://us.i.posthog.com";
const APP_VERSION = "1.0.0";
const ANALYTICS_CONSENT_KEY = "analytics_consent";

type Section = "student" | "teacher" | "shared";
type AnalyticsConsent = "accepted" | "rejected";

let distinctId: string | null = null;
let currentSection: Section = "shared";
let analyticsInitialized = false;

export const getAnalyticsConsent = (): AnalyticsConsent | null => {
  const value = localStorage.getItem(ANALYTICS_CONSENT_KEY);
  if (value === "accepted" || value === "rejected") return value;
  return null;
};

export const hasAnalyticsConsent = (): boolean => getAnalyticsConsent() === "accepted";

export const setAnalyticsConsent = (consent: AnalyticsConsent) => {
  localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  if (consent !== "accepted") {
    resetAnalytics();
    sessionStorage.removeItem("ph_session_start");
    analyticsInitialized = false;
  }
};

const getDistinctId = (): string => {
  if (distinctId) return distinctId;
  const stored = localStorage.getItem("ph_distinct_id");
  if (stored) {
    distinctId = stored;
    return stored;
  }
  const newId = crypto.randomUUID();
  localStorage.setItem("ph_distinct_id", newId);
  distinctId = newId;
  return newId;
};

const postCapture = (event: string, properties: Record<string, unknown> = {}) => {
  if (!hasAnalyticsConsent()) return;

  fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: POSTHOG_API_KEY,
      event,
      properties: {
        distinct_id: getDistinctId(),
        $current_url: window.location.href,
        $host: window.location.host,
        $pathname: window.location.pathname,
        section: currentSection,
        app_version: APP_VERSION,
        ...properties,
      },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
};

// Initialize analytics (call once on app load)
export const initAnalytics = () => {
  if (!hasAnalyticsConsent() || analyticsInitialized) return;
  getDistinctId();
  postCapture("$pageview");
  analyticsInitialized = true;
};

// Set the current macro section (student / teacher / shared)
export const setSection = (section: Section) => {
  currentSection = section;
};

// Identify user (call on login/signup)
export const identifyUser = (userId: string, email?: string) => {
  if (!hasAnalyticsConsent()) return;
  distinctId = userId;
  localStorage.setItem("ph_distinct_id", userId);
  postCapture("$identify", {
    $set: email ? { email } : {},
  });
};

// Set person properties (role, plan, level, etc.)
export const setUserProperties = (props: Record<string, unknown>) => {
  if (!hasAnalyticsConsent()) return;
  postCapture("$identify", {
    $set: props,
  });
};

// Reset on logout
export const resetAnalytics = () => {
  localStorage.removeItem("ph_distinct_id");
  distinctId = null;
  currentSection = "shared";
  analyticsInitialized = false;
  if (hasAnalyticsConsent()) {
    getDistinctId(); // generate new anonymous id
  }
};

// Track events with properties
export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  if (!hasAnalyticsConsent()) return;
  postCapture(event, properties || {});
};

// Track page views with section context
export const trackPageView = (page: string, section?: Section) => {
  if (!hasAnalyticsConsent()) return;
  if (section) currentSection = section;
  postCapture("$pageview", { page });
};

// Track page load performance
export const trackPageLoad = (page: string) => {
  if (!hasAnalyticsConsent()) return;
  postCapture("page_load_time", {
    page,
    load_time_ms: Math.round(performance.now()),
  });
};

// Track funnel steps for multi-step flows
export const trackFunnelStep = (
  funnel: string,
  step: string,
  stepIndex: number,
  props?: Record<string, unknown>
) => {
  if (!hasAnalyticsConsent()) return;
  postCapture(`${funnel}_step`, {
    funnel,
    step,
    step_index: stepIndex,
    ...props,
  });
};


export type TeacherFunnelStep =
  | "signup_completed"
  | "onboarding_completed"
  | "dashboard_next_action_clicked"
  | "checkout_started";

const TEACHER_FUNNEL_STEP_INDEX: Record<TeacherFunnelStep, number> = {
  signup_completed: 1,
  onboarding_completed: 2,
  dashboard_next_action_clicked: 3,
  checkout_started: 4,
};

export const trackTeacherFunnelStep = (
  step: TeacherFunnelStep,
  props?: Record<string, unknown>
) => {
  trackFunnelStep("teacher_funnel", step, TEACHER_FUNNEL_STEP_INDEX[step], {
    role: "teacher",
    ...props,
  });
};

// Session duration tracking
export const trackSessionStart = () => {
  if (!hasAnalyticsConsent()) return;
  sessionStorage.setItem("ph_session_start", String(Date.now()));
};

export const trackSessionEnd = () => {
  if (!hasAnalyticsConsent()) return;
  const startStr = sessionStorage.getItem("ph_session_start");
  if (!startStr) return;
  const durationSeconds = Math.round((Date.now() - Number(startStr)) / 1000);
  if (durationSeconds < 2) return; // ignore trivial sessions
  postCapture("session_ended", {
    duration_seconds: durationSeconds,
    section: currentSection,
  });
};
