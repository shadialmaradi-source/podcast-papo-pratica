

# Plan: White-Label Branding for Premium Teachers

## Overview
Add a branding settings page for Premium teachers to customize their logo, colors, and optional "Powered by" text. Apply these customizations to the student lesson view when accessed via share links.

Custom domain support is excluded from this iteration -- it requires infrastructure-level DNS/SSL provisioning that cannot be handled client-side. We'll note it as "Coming Soon" in the UI.

## Database Changes (Migration)

Add a `branding` JSONB column to `teacher_profiles`:

```sql
ALTER TABLE teacher_profiles ADD COLUMN branding jsonb DEFAULT NULL;
```

Structure: `{ "logo_url": "...", "primary_color": "#hex", "secondary_color": "#hex", "show_powered_by": true }`

Update the SELECT RLS policy on `teacher_profiles` to allow students to read branding for their teacher (needed for the student lesson view to fetch branding):

```sql
CREATE POLICY "Anyone can read teacher branding"
  ON teacher_profiles FOR SELECT TO authenticated
  USING (true);
```

This replaces the current "Teachers can select own profile" policy since the table only contains non-sensitive data (name, bio, specialties, branding). We keep INSERT/UPDATE/DELETE restricted to the owner.

Also need a storage bucket for logo uploads:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-logos', 'teacher-logos', true);

CREATE POLICY "Teachers can upload own logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'teacher-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers can update own logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'teacher-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view teacher logos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'teacher-logos');
```

## Files to Create

### `src/pages/TeacherBranding.tsx`
Branding settings page (Premium-gated):
- Check `teacher_subscriptions.plan` -- if not `premium`, show upgrade prompt with link to `/teacher/pricing`
- **Logo upload**: File input, preview, upload to `teacher-logos` bucket under `{teacher_id}/logo.png`, save URL to `branding.logo_url`
- **Primary color picker**: Input type="color" + hex text input
- **Secondary color picker**: Same
- **"Powered by" toggle**: Show/hide "Powered by [Teacher Name]" in student view
- **Live preview panel**: Mock student lesson header showing logo + colors
- Save button updates `teacher_profiles.branding`
- Track `branding_updated` analytics event

### `src/hooks/useTeacherBranding.tsx`
Hook that, given a `teacher_id`, fetches `teacher_profiles.branding` and returns parsed branding config. Used by StudentLesson to apply customization.

## Files to Modify

### `src/pages/StudentLesson.tsx`
- After loading lesson, fetch the teacher's branding via `teacher_id` from the lesson
- Need teacher_id: the `teacher_lessons` table has `teacher_id` -- add it to the lesson fetch query
- If branding exists: apply `primary_color` as CSS custom property (`--brand-primary`), show teacher logo in header instead of default, show "Powered by [Teacher Name]" in footer
- Use inline `style` overrides for branded buttons/badges

### `src/pages/TeacherDashboard.tsx`
- Add a "Branding" hero card with Palette icon, navigating to `/teacher/branding`

### `src/App.tsx`
- Add route: `/teacher/branding` -> `<ProtectedRoute><TeacherBranding /></ProtectedRoute>`

## Technical Notes
- Logo uploads stored in Supabase Storage `teacher-logos` bucket, organized by teacher ID
- Branding is optional -- if null/undefined, student view renders normally
- CSS custom properties approach: set `--brand-primary` and `--brand-secondary` on a wrapper div, then use them in inline styles for key elements (header bg, button bg, badge colors)
- No custom domain implementation in this phase -- UI shows "Coming Soon" badge

