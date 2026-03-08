

# Plan: Remove Exercise Type Badge

## Problem
The exercise header shows technical labels like "MCQ", "TF", "CLOZE" which are meaningless to users.

## Change

### `src/components/YouTubeExercises.tsx` (lines 935-942)
Remove the exercise type badge, keeping only the points badge:
```tsx
<div className="flex gap-2">
  <Badge variant="outline" className="text-xs">
    {currentExercise.points} pts
  </Badge>
</div>
```

### Files to modify:
- `src/components/YouTubeExercises.tsx` — remove the type badge from the exercise header

