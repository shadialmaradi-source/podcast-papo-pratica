
-- Create teacher_profiles table
CREATE TABLE public.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  languages_taught TEXT[] DEFAULT '{}',
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teacher_students table
CREATE TABLE public.teacher_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  student_email TEXT NOT NULL,
  student_name TEXT,
  level TEXT,
  native_language TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active TIMESTAMP WITH TIME ZONE,
  UNIQUE(teacher_id, student_email)
);

-- Enable RLS
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

-- RLS for teacher_profiles: teachers can CRUD own row
CREATE POLICY "Teachers can select own profile"
  ON public.teacher_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own profile"
  ON public.teacher_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own profile"
  ON public.teacher_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own profile"
  ON public.teacher_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = teacher_id);

-- RLS for teacher_students: teachers can CRUD own students
CREATE POLICY "Teachers can select own students"
  ON public.teacher_students FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own students"
  ON public.teacher_students FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own students"
  ON public.teacher_students FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own students"
  ON public.teacher_students FOR DELETE
  TO authenticated
  USING (auth.uid() = teacher_id);
