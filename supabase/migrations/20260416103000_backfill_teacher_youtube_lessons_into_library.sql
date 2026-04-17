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
), deduped_lessons as (
  select video_id, title, language, teacher_id, transcript
  from (
    select
      nl.*,
      row_number() over (
        partition by nl.video_id
        order by
          (nullif(trim(nl.transcript), '') is not null) desc,
          nl.title asc,
          nl.teacher_id asc nulls last
      ) as row_num
    from normalized_lessons nl
  ) ranked_lessons
  where row_num = 1
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
  dl.video_id,
  dl.title,
  dl.language,
  'beginner',
  'completed',
  now(),
  dl.teacher_id,
  'https://img.youtube.com/vi/' || dl.video_id || '/hqdefault.jpg',
  false
from deduped_lessons dl
where not exists (
  select 1
  from youtube_videos yv
  where yv.video_id = dl.video_id
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
), deduped_transcripts as (
  select extracted_video_id, language, transcript
  from (
    select
      tyl.*,
      row_number() over (
        partition by tyl.extracted_video_id
        order by length(trim(tyl.transcript)) desc
      ) as row_num
    from teacher_youtube_lessons tyl
    where tyl.extracted_video_id is not null
  ) ranked_transcripts
  where row_num = 1
)
insert into youtube_transcripts (
  video_id,
  transcript,
  language,
  word_count
)
select
  yv.id,
  dt.transcript,
  dt.language,
  array_length(regexp_split_to_array(trim(dt.transcript), '\\s+'), 1)
from deduped_transcripts dt
join youtube_videos yv on yv.video_id = dt.extracted_video_id
where dt.extracted_video_id is not null
  and not exists (
    select 1
    from youtube_transcripts yt
    where yt.video_id = yv.id
  );
