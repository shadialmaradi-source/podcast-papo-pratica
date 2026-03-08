
-- Add branding JSONB column to teacher_profiles
ALTER TABLE teacher_profiles ADD COLUMN branding jsonb DEFAULT NULL;

-- Replace restrictive SELECT policy with open one (table has no sensitive data)
DROP POLICY IF EXISTS "Teachers can select own profile" ON teacher_profiles;
CREATE POLICY "Anyone authenticated can read teacher profiles"
  ON teacher_profiles FOR SELECT TO authenticated
  USING (true);

-- Create storage bucket for teacher logos
INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-logos', 'teacher-logos', true);

-- Storage policies
CREATE POLICY "Teachers can upload own logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'teacher-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers can update own logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'teacher-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers can delete own logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'teacher-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view teacher logos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'teacher-logos');
