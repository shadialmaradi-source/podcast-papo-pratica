

# Student Email Flow Analysis & Recommendations

## Current State

### Auth Emails (Currently Broken - Going to Spam)
- **Problem**: Using default Supabase emails from `fezpzihnvblzjrdzgioq.supabase.co` → lands in spam
- **Emails needed**: Sign-up confirmation, Password reset, Magic link (if used)
- **Solution**: Set up custom email domain + Lovable auth email templates

### Transactional Emails (Already Implemented via Resend)
| Edge Function | Status | Trigger |
|--------------|--------|---------|
| `send-daily-reminders` | ✅ Working | Cron job |
| `send-weekly-recaps` | ✅ Working | Cron job |
| `send-leaderboard-alerts` | ✅ Working | Cron job |
| `notify-teacher-email` | ✅ Working | DB trigger on assignment completion |

### Student Notification Preferences Table
Already exists: `user_notification_preferences`
- `email_daily_reminders` ✅
- `email_weekly_recaps` ✅
- `email_leaderboard_alerts` ✅

---

## Student Journey & Recommended Email Touchpoints

### 1. Authentication Emails (Priority: HIGH)
**Current**: Default Supabase → Spam
**Fix**: Custom domain + branded templates

| Email Type | When | Template Needed |
|-----------|------|-----------------|
| Email Confirmation | After signup | Yes - Lovable auth template |
| Password Reset | User requests | Yes - Lovable auth template |

**Implementation**: 
- Set up custom email domain (e.g., `notify.listenflow.app`)
- Scaffold Lovable auth email templates with ListenFlow branding

---

### 2. Onboarding Welcome Email (Priority: MEDIUM)
**Currently**: None
**Recommendation**: Send after onboarding completion

| Trigger | Content |
|---------|---------|
| Student completes onboarding (selects language + level) | Welcome email with quick-start guide |

**Implementation**: New edge function `send-welcome-email` triggered after profile update

---

### 3. Assignment Notifications (Priority: HIGH)
**Currently**: Teachers get notified when students complete assignments, but students don't get notified when teachers assign them.

| Email Type | When | Currently |
|-----------|------|-----------|
| New video assignment | Teacher assigns video | ❌ Missing |
| New speaking assignment | Teacher assigns speaking task | ❌ Missing |
| Assignment reminder | 24h before due date | ❌ Missing |

**Implementation**: 
- New `notify-student-assignment` edge function
- DB trigger on `video_assignments` INSERT
- Add `email_assignment_notifications` column to preferences

---

### 4. Achievement/Milestone Emails (Priority: LOW)
**Currently**: None

| Email Type | When |
|-----------|------|
| First lesson complete | Student finishes first video |
| Streak milestone | 7-day, 30-day, 100-day streak |
| Level up | Completes enough content to suggest next CEFR level |

---

## Recommended Implementation Order

1. **Auth emails** (Custom domain + templates) → Fixes spam issue
2. **Assignment notifications to students** → Closes the teacher→student communication loop
3. **Welcome email** → Better onboarding experience
4. **Milestone emails** → Engagement/retention (lower priority)

---

## Technical Changes Required

### Step 1: Auth Emails (No code changes, configuration only)
- Set up custom email domain via Lovable Cloud → Email
- Scaffold auth templates with `scaffold_auth_email_templates`
- Deploy `auth-email-hook` function

### Step 2: Student Assignment Notifications
```
New files:
- supabase/functions/notify-student-assignment/index.ts

Database changes:
- Add column: user_notification_preferences.email_assignment_notifications BOOLEAN DEFAULT true
- Add trigger: notify_student_on_assignment() on video_assignments INSERT
```

### Step 3: Welcome Email
```
New files:
- supabase/functions/send-welcome-email/index.ts

Database changes:
- Add trigger: notify_on_onboarding_complete() on profiles UPDATE (when native_language changes from NULL)
```

---

## Questions Before Implementation

Do you have a custom domain you'd like to use for emails (e.g., `notify.listenflow.app`)? This is required to fix the spam issue with auth emails.

