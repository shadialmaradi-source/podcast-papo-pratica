-- Update the user's video to have the correct user_id
UPDATE youtube_videos 
SET added_by_user_id = 'd16921f2-9385-4bcb-9052-5fd9902956fd'::uuid
WHERE id = '3b69bf8d-f077-4394-9828-be2b4361ce63';