

# Plan: Add "Assign Library Video" from Teacher Students Page

## Current State (Already Built)

Most of this feature **already exists**:
- Library page already shows "Assign to Student" button on video cards for teachers
- `AssignVideoModal` component exists with student dropdown, due date, note fields
- `video_assignments` table exists with RLS policies
- `VideoBrowserModal` and `CommunityVideoBrowser` components exist
- Student home page already shows video assignments

## What's Missing

The only missing piece is: **teachers cannot assign library videos from the `/teacher/students` page**. The student rows have View/Edit/Archive buttons but no Assign action.

## Plan

### 1. Add Assign button to each student row in TeacherStudents

**`src/pages/TeacherStudents.tsx`**
- Import `VideoBrowserModal` and add state: `assignStudentEmail: string | null`
- Add a "Assign Video" icon button (e.g. `Video` icon from lucide) in the actions column next to View/Edit/Archive
- Clicking it sets `assignStudentEmail` to that student's email, opening `VideoBrowserModal`
- Render `<VideoBrowserModal>` at the bottom of the component, passing the selected student email

This reuses the existing `VideoBrowserModal` → `AssignVideoModal` flow, which already handles video selection, student pre-selection, due date, note, and database insertion.

### 2. No database changes needed

The `video_assignments` table, RLS policies, and all related queries already exist.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/TeacherStudents.tsx` | Add assign video button per row + VideoBrowserModal integration |

