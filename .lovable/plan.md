

# ListenFlow Launch Roadmap

A prioritized list of fixes organized from quickest wins to more complex tasks. Each item can be completed in one session.

---

## Day 1: Quick Wins (5-10 minutes each)

### Task 1.1: Remove Test Route
**Time:** 5 minutes | **Difficulty:** Easy

Remove the `/test-transcript` route from production. This is a debug page that shouldn't be public.

**What to do:**
- Remove line 98 from `src/App.tsx`: `<Route path="/test-transcript" element={<TestTranscript />} />`
- Remove the import on line 17: `import TestTranscript from "./pages/TestTranscript";`

---

### Task 1.2: Add Missing Secret
**Time:** 2 minutes | **Difficulty:** Easy

The `YOUTUBE_DATA_API_KEY` secret is missing from Supabase. Without it, video duration detection falls back to HTML scraping.

**What to do:**
- Go to Supabase Dashboard > Settings > Edge Functions
- Add `YOUTUBE_DATA_API_KEY` with your Google API key

---

### Task 1.3: Enable Leaked Password Protection
**Time:** 2 minutes | **Difficulty:** Easy

Security feature that checks if passwords have been exposed in data breaches.

**What to do:**
- Go to Supabase Dashboard > Authentication > Providers > Email
- Enable "Leaked password protection"

---

## Day 2: Database Security (15-20 minutes)

### Task 2.1: Fix RLS Policies for 3 Tables
**Time:** 15 minutes | **Difficulty:** Medium

Three tables have RLS enabled but no policies, which blocks all access:
1. `youtube_exercises` - Exercises for videos
2. `exercises` - Podcast exercises  
3. `anonymous_speech_attempts` - Speech attempt tracking

**What to do:**
Add appropriate RLS policies via migration:

```sql
-- youtube_exercises: Anyone can read, service role can write
CREATE POLICY "Anyone can view youtube exercises" ON youtube_exercises
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage youtube exercises" ON youtube_exercises
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

-- exercises: Anyone can read, service role can write
CREATE POLICY "Anyone can view exercises" ON exercises
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage exercises" ON exercises
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

-- anonymous_speech_attempts: Anyone can read/write (anonymous)
CREATE POLICY "Anyone can manage anonymous attempts" ON anonymous_speech_attempts
  FOR ALL USING (true) WITH CHECK (true);
```

---

## Day 3: Content & Library (20-30 minutes)

### Task 3.1: Add Curated Starter Videos
**Time:** 30 minutes | **Difficulty:** Medium

Currently 10 videos exist but none are marked as curated. New users see an empty library.

**What to do:**
1. Find 3-5 good beginner YouTube videos (under 10 min) for each language:
   - Portuguese (primary)
   - English
   - Spanish
   - French
   - Italian
   - German

2. Import each video through the app OR update existing videos:
```sql
UPDATE youtube_videos 
SET is_curated = true 
WHERE id IN ('uuid1', 'uuid2', 'uuid3');
```

3. Ensure each has exercises generated and status = 'completed'

---

## Day 4: Stripe Production Setup (30 minutes)

### Task 4.1: Configure Stripe Webhook
**Time:** 20 minutes | **Difficulty:** Medium

The webhook receives payment events to update subscriptions.

**What to do:**
1. Log into Stripe Dashboard
2. Go to Developers > Webhooks
3. Add endpoint: `https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in Supabase secrets

---

### Task 4.2: Switch to Live Stripe Keys
**Time:** 10 minutes | **Difficulty:** Easy

If still using test keys, switch to live keys.

**What to do:**
1. Get live keys from Stripe Dashboard
2. Update `STRIPE_SECRET_KEY` in Supabase secrets
3. Create live product/price if needed

---

## Day 5: Automation Setup (30 minutes)

### Task 5.1: Set Up Cron Jobs for Notifications
**Time:** 30 minutes | **Difficulty:** Medium

Edge functions exist but aren't scheduled:
- `send-daily-reminders` - Reminder emails
- `send-weekly-recaps` - Weekly progress emails
- `send-leaderboard-alerts` - Competition alerts

**What to do:**
1. Go to Supabase Dashboard > Database > Extensions
2. Enable `pg_cron` if not enabled
3. Add cron jobs via SQL:

```sql
-- Daily reminders at 9am UTC
SELECT cron.schedule(
  'daily-reminders',
  '0 9 * * *',
  $$SELECT net.http_post(
    'https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/send-daily-reminders',
    '{}',
    '{"Authorization": "Bearer YOUR_CRON_SECRET"}'
  )$$
);

-- Weekly recaps on Sundays at 10am UTC
SELECT cron.schedule(
  'weekly-recaps',
  '0 10 * * 0',
  $$SELECT net.http_post(
    'https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/send-weekly-recaps',
    '{}',
    '{"Authorization": "Bearer YOUR_CRON_SECRET"}'
  )$$
);
```

---

## Day 6: Testing & Polish (1-2 hours)

### Task 6.1: End-to-End Testing
**Time:** 1 hour | **Difficulty:** Medium

Test all critical user flows:

| Flow | Test |
|------|------|
| Sign up | Create new account, verify email works |
| First lesson | Complete onboarding flow, watch video, do exercises |
| Import video | Add personal YouTube video, verify quota tracking |
| Premium | Test Stripe checkout, verify subscription updates |
| Profile | Check streak, badges, weekly stats display |
| Logout/Login | Session persistence works |

---

### Task 6.2: Mobile Responsiveness Check
**Time:** 30 minutes | **Difficulty:** Easy

Test on mobile devices:
- Landing page
- Lesson flow
- Profile page
- Import dialog

---

## Day 7: Launch Prep (30 minutes)

### Task 7.1: Final Checklist

- [ ] All test routes removed
- [ ] Secrets configured correctly
- [ ] RLS policies in place
- [ ] Curated content exists
- [ ] Stripe webhook configured
- [ ] Cron jobs scheduled
- [ ] E2E tests pass
- [ ] Mobile looks good

### Task 7.2: Publish!

Click **Publish** in Lovable to deploy to `listenflow.lovable.app`

---

## Summary by Day

| Day | Focus | Time | Items |
|-----|-------|------|-------|
| 1 | Quick Wins | 15 min | Remove test route, add API key, enable password protection |
| 2 | Database | 20 min | Fix RLS policies for 3 tables |
| 3 | Content | 30 min | Add curated starter videos |
| 4 | Payments | 30 min | Configure Stripe webhook + live keys |
| 5 | Automation | 30 min | Set up cron jobs for emails |
| 6 | Testing | 1.5 hrs | E2E testing + mobile check |
| 7 | Launch | 30 min | Final checklist + publish |

**Total: ~4-5 hours spread over 7 days**

---

## Optional Enhancements (Post-Launch)

These can be done after launch:
- Add more curated videos for each language
- Implement proper notification/account settings in profile
- Add analytics dashboard for admin
- Implement referral system
- Add social sharing features

