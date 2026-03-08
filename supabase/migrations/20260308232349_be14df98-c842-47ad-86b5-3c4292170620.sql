
-- Grant lifetime premium student subscription
UPDATE subscriptions
SET tier = 'premium', status = 'active', expires_at = NULL, updated_at = NOW()
WHERE user_id = 'd16921f2-9385-4bcb-9052-5fd9902956fd';

-- Create teacher premium subscription
INSERT INTO teacher_subscriptions (teacher_id, plan, status)
VALUES ('d16921f2-9385-4bcb-9052-5fd9902956fd', 'premium', 'active')
ON CONFLICT DO NOTHING;

-- Update profile subscription_tier
UPDATE profiles
SET subscription_tier = 'premium', updated_at = NOW()
WHERE user_id = 'd16921f2-9385-4bcb-9052-5fd9902956fd';

-- Backfill video durations (only for valid JSON transcripts)
UPDATE youtube_videos yv
SET duration = sub.max_ts
FROM (
  SELECT yt.video_id,
    GREATEST(
      (SELECT MAX((t->>'start')::numeric + COALESCE((t->>'duration')::numeric, 0))
       FROM jsonb_array_elements(yt.transcript::jsonb) t),
      0
    )::int AS max_ts
  FROM youtube_transcripts yt
  WHERE yt.transcript IS NOT NULL
    AND yt.transcript ~ '^\s*\['
) sub
WHERE yv.id = sub.video_id
  AND yv.duration IS NULL
  AND sub.max_ts > 0;
