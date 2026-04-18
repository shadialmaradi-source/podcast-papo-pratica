export function buildStudentLessonSharePath(shareToken: string): string {
  return `/lesson/student/${encodeURIComponent(shareToken)}`;
}

function resolveShareOrigin(): string {
  const configuredOrigin =
    import.meta.env.VITE_PUBLIC_APP_URL ||
    import.meta.env.VITE_APP_URL ||
    import.meta.env.VITE_SITE_URL;

  if (typeof configuredOrigin === "string" && configuredOrigin.trim().length > 0) {
    return configuredOrigin.replace(/\/+$/, "");
  }

  return window.location.origin;
}

export function buildStudentLessonShareLink(shareToken: string): string {
  return `${resolveShareOrigin()}${buildStudentLessonSharePath(shareToken)}`;
}
