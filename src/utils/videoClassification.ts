interface VideoClassificationInput {
  is_short?: boolean | null;
  duration?: number | null;
  category?: string | null;
}

export const SHORTS_MAX_DURATION_SECONDS = 61;

export function isVideoShort(video: VideoClassificationInput): boolean {
  if (video.is_short === true) return true;

  const normalizedCategory = (video.category || "").trim().toLowerCase();
  if (normalizedCategory === "shorts" || normalizedCategory === "short") {
    return true;
  }

  if (typeof video.duration === "number" && video.duration > 0 && video.duration <= SHORTS_MAX_DURATION_SECONDS) {
    return true;
  }

  return false;
}
