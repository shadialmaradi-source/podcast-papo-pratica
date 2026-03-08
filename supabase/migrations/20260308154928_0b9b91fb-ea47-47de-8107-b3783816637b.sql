CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher_status ON teacher_students(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_teacher ON teacher_lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_lesson ON lesson_responses(lesson_id);