CREATE INDEX IF NOT EXISTS idx_teacher_lessons_teacher_id ON teacher_lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_student_email ON teacher_lessons(student_email);
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_share_token ON teacher_lessons(share_token);
CREATE INDEX IF NOT EXISTS idx_lesson_exercises_lesson_id ON lesson_exercises(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_lesson_id ON lesson_responses(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_user_id ON lesson_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher_id ON teacher_students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_youtube_exercises_video_id ON youtube_exercises(video_id);