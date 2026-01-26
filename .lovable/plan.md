

## Add PostHog Analytics for User Retention Tracking

### Overview
Implement PostHog analytics throughout the app to track user behavior, retention, and lesson completion funnel. This will enable you to see retention charts, funnel analysis, and user paths in PostHog dashboard.

---

### Part 1: Install PostHog and Create Analytics Utility

**1.1 Add posthog-js package**
Install the PostHog JavaScript SDK:
```
posthog-js (will be added to package.json)
```

**1.2 Create Analytics Utility File**

Create `src/lib/analytics.ts` to centralize all PostHog logic:

```typescript
import posthog from 'posthog-js';

// Initialize PostHog (call once on app load)
export const initAnalytics = () => {
  if (typeof window !== 'undefined' && !posthog.__loaded) {
    posthog.init('YOUR_POSTHOG_API_KEY', {
      api_host: 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
      // Respect user privacy
      respect_dnt: true,
    });
  }
};

// Identify user (call on login/signup)
export const identifyUser = (userId: string, email?: string) => {
  posthog.identify(userId, email ? { email } : {});
};

// Reset on logout
export const resetAnalytics = () => {
  posthog.reset();
};

// Track events with properties
export const trackEvent = (event: string, properties?: Record<string, any>) => {
  posthog.capture(event, properties);
};
```

---

### Part 2: Initialize PostHog on App Load

**File: `src/App.tsx`**

Add initialization in the main App component:

```typescript
import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

// Inside App component, before the return:
useEffect(() => {
  initAnalytics();
}, []);
```

---

### Part 3: Track Authentication Events

**3.1 Track User Signup**

**File: `src/pages/Auth.tsx`**

After successful signup (line ~88), add:
```typescript
import { trackEvent } from "@/lib/analytics";

// After successful signUp:
trackEvent('user_signup', { 
  method: 'email',
  timestamp: new Date().toISOString()
});
```

For Google sign-in (line ~47), track after OAuth redirect completes.

**3.2 Track User Login and Identify**

**File: `src/hooks/useAuth.tsx`**

Inside `onAuthStateChange`, when user logs in:
```typescript
import { identifyUser, trackEvent, resetAnalytics } from "@/lib/analytics";

// In onAuthStateChange callback:
if (event === 'SIGNED_IN' && session?.user) {
  identifyUser(session.user.id, session.user.email);
  trackEvent('user_login', {
    method: session.user.app_metadata?.provider || 'email',
    timestamp: new Date().toISOString()
  });
} else if (event === 'SIGNED_OUT') {
  resetAnalytics();
}
```

---

### Part 4: Track Lesson Flow Events

**4.1 Video Started**

**File: `src/pages/Lesson.tsx`**

Track when user selects a level and starts the lesson:
```typescript
import { trackEvent } from "@/lib/analytics";

const handleStartExercises = (level: string) => {
  trackEvent('video_started', {
    video_id: videoId,
    difficulty_level: level,
    timestamp: new Date().toISOString()
  });
  setSelectedLevel(level);
  setLessonState("exercises");
};
```

**4.2 Exercise Completed (Step 1)**

**File: `src/components/YouTubeExercises.tsx`**

Track when user finishes all exercises (in the results/completion handler):
```typescript
import { trackEvent } from "@/lib/analytics";

// When showing results:
trackEvent('exercise_completed', {
  video_id: videoId,
  difficulty_level: level,
  score: score,
  total_exercises: exercises.length,
  accuracy: percentage,
  timestamp: new Date().toISOString()
});
```

**4.3 Speaking Completed (Step 2)**

**File: `src/components/YouTubeSpeaking.tsx`**

Track when user completes speaking practice:
```typescript
import { trackEvent } from "@/lib/analytics";

// When speaking analysis completes:
trackEvent('speaking_completed', {
  video_id: videoId,
  difficulty_level: level,
  mode: isSummaryMode ? 'summary' : 'beginner',
  score: analysisResults?.overallScore || analysisResults?.contentScore,
  timestamp: new Date().toISOString()
});
```

**4.4 Flashcard Reviewed (Step 3)**

**File: `src/components/lesson/LessonFlashcards.tsx`**

Track flashcard review progress:
```typescript
import { trackEvent } from "@/lib/analytics";

// When user marks card as learned:
trackEvent('flashcard_reviewed', {
  card_index: currentIndex,
  total_cards: flashcards.length,
  marked_learned: true,
  timestamp: new Date().toISOString()
});
```

**4.5 Lesson Completed**

**File: `src/components/lesson/LessonCompleteScreen.tsx`**

Track when user completes all 3 steps:
```typescript
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// In component body:
useEffect(() => {
  trackEvent('lesson_completed', {
    exercises_count: totalExercises,
    exercise_score: exerciseScore,
    exercise_accuracy: exerciseAccuracy,
    flashcards_count: flashcardsCount,
    xp_earned: xpEarned,
    timestamp: new Date().toISOString()
  });
}, []); // Track once on mount
```

---

### Part 5: Track Premium/Payment Events (Placeholder)

When you add payment functionality, add these tracking points:

```typescript
// When user views premium screen
trackEvent('premium_viewed', {
  source: 'lesson_complete' | 'settings' | 'feature_gate',
  timestamp: new Date().toISOString()
});

// When user initiates payment
trackEvent('payment_initiated', {
  plan_type: 'monthly' | 'yearly',
  price: 9.99,
  timestamp: new Date().toISOString()
});

// When payment succeeds
trackEvent('payment_completed', {
  plan_type: 'monthly' | 'yearly',
  amount: 9.99,
  currency: 'USD',
  timestamp: new Date().toISOString()
});
```

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/analytics.ts` | Create | PostHog utility functions |
| `src/App.tsx` | Modify | Initialize PostHog on app load |
| `src/hooks/useAuth.tsx` | Modify | Identify users on login, track login/logout |
| `src/pages/Auth.tsx` | Modify | Track signups |
| `src/pages/Lesson.tsx` | Modify | Track video_started |
| `src/components/YouTubeExercises.tsx` | Modify | Track exercise_completed |
| `src/components/YouTubeSpeaking.tsx` | Modify | Track speaking_completed |
| `src/components/lesson/LessonFlashcards.tsx` | Modify | Track flashcard_reviewed |
| `src/components/lesson/LessonCompleteScreen.tsx` | Modify | Track lesson_completed |

---

### Event Summary

| Event | When Triggered | Key Properties |
|-------|---------------|----------------|
| `user_signup` | After successful registration | method |
| `user_login` | Every login (auth state change) | method |
| `video_started` | User clicks to start exercises | video_id, difficulty_level |
| `exercise_completed` | User finishes all quiz questions | video_id, score, accuracy |
| `speaking_completed` | User completes speaking practice | video_id, mode, score |
| `flashcard_reviewed` | User reviews flashcard | card_index, marked_learned |
| `lesson_completed` | User finishes all 3 steps | exercises_count, accuracy, xp_earned |
| `premium_viewed` | User views paywall | source |
| `payment_initiated` | User clicks to pay | plan_type, price |
| `payment_completed` | Payment succeeds | plan_type, amount |

---

### After Implementation

1. **Sign up at posthog.com** (free tier available)
2. **Copy your Project API Key** from Settings → Project → API Keys
3. **Replace `YOUR_POSTHOG_API_KEY`** in `src/lib/analytics.ts`
4. **Test events** by using the app and checking PostHog's Live Events view

### PostHog Retention Dashboard Setup

Once events are flowing:
1. Go to **Insights → New Insight → Retention**
2. Set cohort starting event: `user_signup` or `user_login`
3. Set returning event: `user_login`
4. Time intervals: Daily
5. Date range: Last 30 days

This will show you Day 1, Day 7, Day 30 retention rates.

---

### Technical Notes

- PostHog only initializes client-side (safe for SSR)
- Uses localStorage for session persistence
- Respects Do Not Track browser setting
- Won't block UI if PostHog fails to load
- All events include timestamps for accurate time-based analysis

