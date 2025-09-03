-- First delete user exercise results that reference the exercises we want to delete
DELETE FROM user_exercise_results WHERE exercise_id IN (
  SELECT id FROM exercises WHERE episode_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- Then delete the exercises
DELETE FROM exercises WHERE episode_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';