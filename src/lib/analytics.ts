const POSTHOG_API_KEY = "phc_p7UUw6GZ8h3JsZmK82XMKt9KTjJ40oqkZ4Un9vtNeRm";
const POSTHOG_HOST = "https://us.i.posthog.com";

let distinctId: string | null = null;

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

// Identify user (call on login/signup)
export const identifyUser = (userId: string, email?: string) => {
  distinctId = userId;
  localStorage.setItem("ph_distinct_id", userId);
  postCapture("$identify", {
    $set: email ? { email } : {},
  });
};

// Reset on logout
export const resetAnalytics = () => {
  localStorage.removeItem("ph_distinct_id");
  distinctId = null;
  getDistinctId(); // generate new anonymous id
};

// Track events with properties
export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  postCapture(event, properties || {});
};

// Track page load performance
export const trackPageLoad = (page: string) => {
  postCapture("page_load_time", {
    page,
    load_time_ms: Math.round(performance.now()),
  });
};
