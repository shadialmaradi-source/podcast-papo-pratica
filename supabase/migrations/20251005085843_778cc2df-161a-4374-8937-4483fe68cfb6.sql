-- Add new columns to youtube_videos table
ALTER TABLE youtube_videos
ADD COLUMN IF NOT EXISTS is_curated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES auth.users(id);

-- Update RLS policy to allow users to see their own videos regardless of status
DROP POLICY IF EXISTS "YouTube videos are viewable by everyone" ON youtube_videos;

CREATE POLICY "Users can view completed videos and their own videos"
ON youtube_videos FOR SELECT
USING (
  status = 'completed' OR 
  (added_by_user_id = auth.uid())
);

-- Seed curated Italian educational videos
INSERT INTO youtube_videos (video_id, title, description, language, difficulty_level, status, is_curated, thumbnail_url, duration, category) VALUES
('jRGrNDV2mKc', 'Easy Italian 1 - Coffee!', 'Learn Italian through real conversations about coffee culture', 'italian', 'beginner', 'completed', true, 'https://img.youtube.com/vi/jRGrNDV2mKc/maxresdefault.jpg', 480, 'Culture'),
('sOke8RCH9zg', 'Italian Grammar - Presente', 'Master the Italian present tense with clear explanations', 'italian', 'intermediate', 'completed', true, 'https://img.youtube.com/vi/sOke8RCH9zg/maxresdefault.jpg', 720, 'Grammar'),
('9vLT8O-SJlE', 'Advanced Italian Conversation', 'Practice advanced Italian through native speaker discussions', 'italian', 'advanced', 'completed', true, 'https://img.youtube.com/vi/9vLT8O-SJlE/maxresdefault.jpg', 900, 'Conversation');

-- Seed curated Portuguese educational videos
INSERT INTO youtube_videos (video_id, title, description, language, difficulty_level, status, is_curated, thumbnail_url, duration, category) VALUES
('pNhBWQ8AEbk', 'Easy Portuguese 1 - Greetings', 'Learn Portuguese greetings and basic phrases', 'portuguese', 'beginner', 'completed', true, 'https://img.youtube.com/vi/pNhBWQ8AEbk/maxresdefault.jpg', 420, 'Basics'),
('KP0E-BVBqkM', 'Portuguese Pronunciation Guide', 'Master Portuguese pronunciation with native speakers', 'portuguese', 'intermediate', 'completed', true, 'https://img.youtube.com/vi/KP0E-BVBqkM/maxresdefault.jpg', 660, 'Pronunciation'),
('fJ0kBd7lwCI', 'Brazilian Portuguese Culture', 'Explore Brazilian culture through Portuguese conversations', 'portuguese', 'advanced', 'completed', true, 'https://img.youtube.com/vi/fJ0kBd7lwCI/maxresdefault.jpg', 840, 'Culture');

-- Seed curated English educational videos
INSERT INTO youtube_videos (video_id, title, description, language, difficulty_level, status, is_curated, thumbnail_url, duration, category) VALUES
('VjsZ-geaEYg', 'English Basics - Introductions', 'Learn how to introduce yourself in English', 'english', 'beginner', 'completed', true, 'https://img.youtube.com/vi/VjsZ-geaEYg/maxresdefault.jpg', 360, 'Basics'),
('dzcULqtNKLA', 'English Grammar - Past Tense', 'Understanding English past tense forms', 'english', 'intermediate', 'completed', true, 'https://img.youtube.com/vi/dzcULqtNKLA/maxresdefault.jpg', 540, 'Grammar'),
('YddwkMJG1Jo', 'Advanced English Idioms', 'Master common English idioms and expressions', 'english', 'advanced', 'completed', true, 'https://img.youtube.com/vi/YddwkMJG1Jo/maxresdefault.jpg', 720, 'Idioms');

-- Seed curated Spanish educational videos
INSERT INTO youtube_videos (video_id, title, description, language, difficulty_level, status, is_curated, thumbnail_url, duration, category) VALUES
('EqKjnBR5LfY', 'Easy Spanish 1 - Food', 'Learn Spanish through conversations about food', 'spanish', 'beginner', 'completed', true, 'https://img.youtube.com/vi/EqKjnBR5LfY/maxresdefault.jpg', 450, 'Food'),
('Hl3c5KcAr9M', 'Spanish Ser vs Estar', 'Master the difference between ser and estar', 'spanish', 'intermediate', 'completed', true, 'https://img.youtube.com/vi/Hl3c5KcAr9M/maxresdefault.jpg', 600, 'Grammar'),
('P2z2j1yXQyg', 'Spanish Literature Discussion', 'Discuss Spanish literature with native speakers', 'spanish', 'advanced', 'completed', true, 'https://img.youtube.com/vi/P2z2j1yXQyg/maxresdefault.jpg', 960, 'Literature');

-- Seed curated French educational videos
INSERT INTO youtube_videos (video_id, title, description, language, difficulty_level, status, is_curated, thumbnail_url, duration, category) VALUES
('ZJcVQH6TnJM', 'Easy French 1 - Shopping', 'Learn French through shopping conversations', 'french', 'beginner', 'completed', true, 'https://img.youtube.com/vi/ZJcVQH6TnJM/maxresdefault.jpg', 480, 'Shopping'),
('PKL4k0xV2Vg', 'French Pronouns Explained', 'Understanding French pronouns and their usage', 'french', 'intermediate', 'completed', true, 'https://img.youtube.com/vi/PKL4k0xV2Vg/maxresdefault.jpg', 630, 'Grammar'),
('8VwnL8z8cQY', 'French Cinema Discussion', 'Explore French cinema through native conversations', 'french', 'advanced', 'completed', true, 'https://img.youtube.com/vi/8VwnL8z8cQY/maxresdefault.jpg', 870, 'Cinema');

-- Seed curated German educational videos
INSERT INTO youtube_videos (video_id, title, description, language, difficulty_level, status, is_curated, thumbnail_url, duration, category) VALUES
('4lWQW5_CPGQ', 'Easy German 1 - Transportation', 'Learn German through conversations about transportation', 'german', 'beginner', 'completed', true, 'https://img.youtube.com/vi/4lWQW5_CPGQ/maxresdefault.jpg', 420, 'Transportation'),
('YnKxoF9gNJo', 'German Cases Explained', 'Master German grammatical cases', 'german', 'intermediate', 'completed', true, 'https://img.youtube.com/vi/YnKxoF9gNJo/maxresdefault.jpg', 690, 'Grammar'),
('kx_4T7QRDS0', 'German Philosophy Discussion', 'Discuss philosophy in German with native speakers', 'german', 'advanced', 'completed', true, 'https://img.youtube.com/vi/kx_4T7QRDS0/maxresdefault.jpg', 1020, 'Philosophy');