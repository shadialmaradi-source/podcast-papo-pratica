-- Standardize difficulty levels from CEFR to beginner/intermediate/advanced
UPDATE youtube_exercises 
SET difficulty = 'beginner' 
WHERE difficulty IN ('A1', 'A2');

UPDATE youtube_exercises 
SET difficulty = 'intermediate' 
WHERE difficulty IN ('B1', 'B2');

UPDATE youtube_exercises 
SET difficulty = 'advanced' 
WHERE difficulty IN ('C1', 'C2');