export function buildStudentLessonSharePath(shareToken: string): string {
  return `/lesson/student/${encodeURIComponent(shareToken)}`;
}

function normalizeLovableOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    const projectDomainMatch = url.hostname.match(/^([a-f0-9-]{36})\.lovableproject\.com$/i);

    if (projectDomainMatch?.[1]) {
      url.hostname = `id-preview--${projectDomainMatch[1]}.lovable.app`;
    }

    const normalizedPath = url.pathname.replace(/\/+$/, "");
    const basePath = normalizedPath === "/" ? "" : normalizedPath;

    return `${url.origin}${basePath}`;
  } catch {
    return origin.replace(/\/+$/, "");
  }
}

function resolveShareOrigin(): string {
  const configuredOrigin =
    import.meta.env.VITE_PUBLIC_APP_URL ||
    import.meta.env.VITE_APP_URL ||
    import.meta.env.VITE_SITE_URL;

  if (typeof configuredOrigin === "string" && configuredOrigin.trim().length > 0) {
    return normalizeLovableOrigin(configuredOrigin.trim());
  }

  return normalizeLovableOrigin(window.location.origin);
}

export function buildStudentLessonShareLink(shareToken: string): string {
  return `${resolveShareOrigin()}${buildStudentLessonSharePath(shareToken)}`;
}
