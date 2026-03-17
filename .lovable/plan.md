

# Profile & Library Navigation Consistency — 3 Files

## 1. `src/pages/ProfilePageWrapper.tsx` — History-aware back navigation

**Current**: Always navigates to `/app`.

**Fix**: Use `window.history.length > 1` check, then `navigate(-1)`, fallback to `/app`.

```tsx
const handleBack = () => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate("/app");
  }
};
return <ProfilePage onBack={handleBack} />;
```

---

## 2. `src/pages/Library.tsx` — Persist tab and level in localStorage

**Lines 61-62**: Initialize from localStorage, fall back to defaults.

```tsx
const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>(
  () => (localStorage.getItem('library_selected_level') as any) || 'beginner'
);
const [activeTab, setActiveTab] = useState<'curated' | 'community'>(
  () => (localStorage.getItem('library_active_tab') as any) || 'curated'
);
```

**Persist on change**: Add two `useEffect` hooks (or inline in setters):

```tsx
useEffect(() => { localStorage.setItem('library_selected_level', selectedLevel); }, [selectedLevel]);
useEffect(() => { localStorage.setItem('library_active_tab', activeTab); }, [activeTab]);
```

---

## 3. `src/components/ProfilePage.tsx` — Dynamic learning path context

**Line 169-192** (`loadLearningPathData`): Use profile's `selected_language` and `current_level` instead of hardcoded `"beginner"` and `"english"`.

Map CEFR levels to learning-path tiers:
- A1/A2 → `"beginner"`
- B1/B2 → `"intermediate"`
- C1/C2 → `"advanced"`

```tsx
const loadLearningPathData = async () => {
  if (!user || !profile) return;
  const cefrToTier = (cefr: string): string => {
    const c = (cefr || 'A1').toUpperCase();
    if (c.startsWith('C')) return 'advanced';
    if (c.startsWith('B')) return 'intermediate';
    return 'beginner';
  };
  const tier = cefrToTier(profile.current_level);
  const lang = profile.selected_language || 'english';
  try {
    const weeks = await fetchWeeksForLevel(tier, lang, user.id);
    // ... rest unchanged
  }
};
```

**Line 679**: Replace hardcoded `— Beginner` with dynamic tier label:

```tsx
? `Week ${...week_number} of ${...totalWeeks} — ${tier.charAt(0).toUpperCase() + tier.slice(1)}`
```

To make the tier available in render, store it alongside the progress state (add a `level` field to `learningPathProgress`).

**Dependency fix**: `loadLearningPathData` depends on `profile`, so call it after profile loads (move the call or add `profile` to the dependency/trigger).

---

## Summary

| File | Change |
|------|--------|
| `ProfilePageWrapper.tsx` | Use `navigate(-1)` with `/app` fallback |
| `Library.tsx` | Init tab/level from localStorage; persist on change |
| `ProfilePage.tsx` | Use profile language/level for learning path; dynamic tier label |

3 files, minimal changes, no architecture redesign.

