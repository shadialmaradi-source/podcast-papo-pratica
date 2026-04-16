-- Backfill teacher-created YouTube lessons into canonical youtube_videos/youtube_transcripts
-- Idempotent: safe to run multiple times.

with teacher_youtube_lessons as (
  select distinct
    substring(tl.youtube_url from '(?:v=|youtu\.be/|shorts/|embed/)([A-Za-z0-9_-]{11})') as extracted_video_id,
    tl.title,
    tl.language,
    tl.teacher_id,
    tl.transcript
  from teacher_lessons tl
  where tl.lesson_type = 'youtube'
    and tl.youtube_url is not null
), normalized_lessons as (
  select
    extracted_video_id as video_id,
    coalesce(nullif(title, ''), 'YouTube Video ' || extracted_video_id) as title,
    coalesce(nullif(language, ''), 'italian') as language,
    teacher_id,
    transcript
  from teacher_youtube_lessons
  where extracted_video_id is not null
)
insert into youtube_videos (
  video_id,
  title,
  language,
  difficulty_level,
  status,
  processed_at,
  added_by_user_id,
  thumbnail_url,
  is_curated
)
select
  nl.video_id,
  nl.title,
  nl.language,
  'beginner',
  'completed',
  now(),
  nl.teacher_id,
  'https://img.youtube.com/vi/' || nl.video_id || '/hqdefault.jpg',
  false
from normalized_lessons nl
where not exists (
  select 1
  from youtube_videos yv
  where yv.video_id = nl.video_id
);

-- Ensure previously inserted "ready" rows with transcripts become visible in library.
update youtube_videos yv
set
  status = 'completed',
  processed_at = coalesce(yv.processed_at, now())
where yv.status = 'ready'
  and exists (
    select 1
    from youtube_transcripts yt
    where yt.video_id = yv.id
  );

-- Backfill missing transcript rows from teacher_lessons transcripts where available.
with teacher_youtube_lessons as (
  select distinct
    substring(tl.youtube_url from '(?:v=|youtu\.be/|shorts/|embed/)([A-Za-z0-9_-]{11})') as extracted_video_id,
    coalesce(nullif(tl.language, ''), 'italian') as language,
    tl.transcript
  from teacher_lessons tl
  where tl.lesson_type = 'youtube'
    and tl.youtube_url is not null
    and tl.transcript is not null
    and length(trim(tl.transcript)) > 0
)
insert into youtube_transcripts (
  video_id,
  transcript,
  language,
  word_count
)
select
  yv.id,
  tyl.transcript,
  tyl.language,
  array_length(regexp_split_to_array(trim(tyl.transcript), '\\s+'), 1)
from teacher_youtube_lessons tyl
join youtube_videos yv on yv.video_id = tyl.extracted_video_id
where tyl.extracted_video_id is not null
  and not exists (
    select 1
    from youtube_transcripts yt
    where yt.video_id = yv.id
  );
