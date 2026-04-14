const SHARED_LESSON_PATH_PATTERN = /^\/lesson\/student\/[^/?#]+(?:[?#].*)?$/;

export function isSafeInternalPath(path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith("/");
}

export function isSharedLessonPath(path: string | null | undefined): path is string {
  return isSafeInternalPath(path) && SHARED_LESSON_PATH_PATTERN.test(path);
}

export function setPendingLessonRedirect(path: string) {
  if (!isSafeInternalPath(path)) return;
  localStorage.setItem("post_auth_redirect", path);

  const tokenMatch = path.match(/^\/lesson\/student\/([^/?#]+)/);
  if (tokenMatch?.[1]) {
    localStorage.setItem("pending_lesson_token", tokenMatch[1]);
  }
}

export function getPendingLessonRedirect(): string | null {
  const redirect = localStorage.getItem("post_auth_redirect");
  if (isSharedLessonPath(redirect)) return redirect;

  const token = localStorage.getItem("pending_lesson_token");
  if (token) return `/lesson/student/${token}`;

  return null;
}

export function clearPendingLessonRedirect() {
  localStorage.removeItem("post_auth_redirect");
  localStorage.removeItem("pending_lesson_token");
}
