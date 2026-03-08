const POSTHOG_API_KEY = "phc_p7UUw6GZ8h3JsZmK82XMKt9KTjJ40oqkZ4Un9vtNeRm";
const POSTHOG_HOST = "https://us.i.posthog.com";
const APP_VERSION = "1.0.0";

type Section = "student" | "teacher" | "shared";

let distinctId: string | null = null;
let currentSection: Section = "shared";

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
  getDistinctId();
  postCapture("$pageview");
};

// Set the current macro section (student / teacher / shared)
export const setSection = (section: Section) => {
  currentSection = section;
};

// Identify user (call on login/signup)
export const identifyUser = (userId: string, email?: string) => {
  distinctId = userId;
  localStorage.setItem("ph_distinct_id", userId);
  postCapture("$identify", {
    $set: email ? { email } : {},
  });
};

// Set person properties (role, plan, level, etc.)
export const setUserProperties = (props: Record<string, unknown>) => {
  postCapture("$identify", {
    $set: props,
  });
};

// Reset on logout
export const resetAnalytics = () => {
  localStorage.removeItem("ph_distinct_id");
  distinctId = null;
  currentSection = "shared";
  getDistinctId(); // generate new anonymous id
};

// Track events with properties
export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  postCapture(event, properties || {});
};

// Track page views with section context
export const trackPageView = (page: string, section?: Section) => {
  if (section) currentSection = section;
  postCapture("$pageview", { page });
};

// Track page load performance
export const trackPageLoad = (page: string) => {
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
  postCapture(`${funnel}_step`, {
    funnel,
    step,
    step_index: stepIndex,
    ...props,
  });
};

// Session duration tracking
export const trackSessionStart = () => {
  sessionStorage.setItem("ph_session_start", String(Date.now()));
};

export const trackSessionEnd = () => {
  const startStr = sessionStorage.getItem("ph_session_start");
  if (!startStr) return;
  const durationSeconds = Math.round((Date.now() - Number(startStr)) / 1000);
  if (durationSeconds < 2) return; // ignore trivial sessions
  postCapture("session_ended", {
    duration_seconds: durationSeconds,
    section: currentSection,
  });
};
