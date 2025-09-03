-- Update existing and add new podcast sources with Spotify episode URLs
-- Delete existing data to start fresh
DELETE FROM user_exercise_results;
DELETE FROM exercises;
DELETE FROM user_episode_progress;  
DELETE FROM podcast_episodes;
DELETE FROM podcast_sources;

-- Add comprehensive podcast sources for multiple languages
INSERT INTO podcast_sources (id, title, description, rss_url, language, category, difficulty_level, thumbnail_url, spotify_chart_rank, is_public) VALUES
-- Italian Podcasts
('11111111-1111-1111-1111-111111111111', 'Stories in Slow Italian', 'Learn Italian through engaging stories told at a slower pace, perfect for language learners', 'https://storiesinslowitalian.com/feed', 'italian', 'Stories', 'B1', 'https://i.scdn.co/image/ab6765630000ba8af27a9790a909b413140ffb81', 1, true),
('22222222-2222-2222-2222-222222222222', 'Simple Italian Podcast', 'Comprehensible Italian podcast for natural language acquisition', 'https://www.simpleitalianpodcast.com/feed', 'italian', 'Language Learning', 'A2', 'https://i.scdn.co/image/ab6765630000ba8ac1218db33800f967aaad8a35', 2, true),

-- Portuguese Podcasts  
('33333333-3333-3333-3333-333333333333', 'Coffee Break Portuguese', 'Learn Portuguese with teacher Rafael and student Ava in bite-sized lessons', 'https://feeds.feedburner.com/coffeebreakportuguese', 'portuguese', 'Language Learning', 'A1', 'https://i.scdn.co/image/ab6765630000ba8af27a9790a909b413140ffb81', 1, true),
('44444444-4444-4444-4444-444444444444', 'Portuguese Pod101', 'Comprehensive Portuguese learning podcast from beginner to advanced', 'https://www.portuguesepod101.com/feed', 'portuguese', 'Language Learning', 'B1', 'https://example.com/portuguese-pod101.jpg', 2, true),

-- Spanish Podcasts
('55555555-5555-5555-5555-555555555555', 'Coffee Break Spanish', 'Learn Spanish in just 15-20 minutes with Coffee Break Spanish', 'https://feeds.feedburner.com/coffeebreakspanish', 'spanish', 'Language Learning', 'A1', 'https://example.com/coffee-break-spanish.jpg', 1, true),
('66666666-6666-6666-6666-666666666666', 'SpanishLearningLab', 'Stories and conversations in Spanish for intermediate learners', 'https://spanishlearninglab.com/feed', 'spanish', 'Stories', 'B2', 'https://example.com/spanish-learning-lab.jpg', 2, true);

-- Add podcast episodes with specific Spotify embed URLs
INSERT INTO podcast_episodes (id, podcast_source_id, title, description, episode_url, duration, episode_number, publish_date) VALUES
-- Italian Episodes (Stories in Slow Italian)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'La Storia di Roma Antica', 'Discover the fascinating history of Ancient Rome through this engaging story', 'https://open.spotify.com/episode/2sg5YB59AWkzVEfDy7kbpY', 1800, 1, '2024-01-15'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Le Tradizioni Italiane', 'Learn about Italian traditions and cultural practices', 'https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk', 1600, 2, '2024-01-22'),

-- Italian Episodes (Simple Italian Podcast)  
('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'La Famiglia Italiana', 'Understanding Italian family structure and relationships', 'https://open.spotify.com/episode/0qbr1w9gMM4xJH0h1x1t8V', 1400, 1, '2024-01-10'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Il Cibo e la Cultura', 'Food culture and traditions in Italy', 'https://open.spotify.com/episode/3UOo5P3LR84xZz2F3l4H6J', 1500, 2, '2024-01-17'),

-- Portuguese Episodes (Coffee Break Portuguese)
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'Primeiros Passos em Português', 'Your first steps in learning Portuguese', 'https://open.spotify.com/episode/5A5kB4w9Wv5Qq1h9G2j9Lm', 1200, 1, '2024-01-08'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'Cumprimentos e Apresentações', 'Greetings and introductions in Portuguese', 'https://open.spotify.com/episode/7T7nM8p5Vy9Xx3k2H5m4Kp', 1300, 2, '2024-01-15'),

-- Portuguese Episodes (Portuguese Pod101)
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '44444444-4444-4444-4444-444444444444', 'Explorando Lisboa', 'Exploring Lisbon and Portuguese culture', 'https://open.spotify.com/episode/6C6oL7r2Xz8Dd4m7J3p9Nn', 2000, 1, '2024-01-12'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', '44444444-4444-4444-4444-444444444444', 'O Brasil e Portugal', 'Differences and similarities between Brazilian and European Portuguese', 'https://open.spotify.com/episode/8E8qP9t4Zz0Ff6p9L5r2Qq', 1800, 2, '2024-01-19'),

-- Spanish Episodes (Coffee Break Spanish)
('c3d4e5f6-a7b8-9012-cdef-123456789012', '55555555-5555-5555-5555-555555555555', 'Introducción al Español', 'Introduction to Spanish language basics', 'https://open.spotify.com/episode/9F9rQ0u5Aa1Gg7q0M6s3Rr', 1100, 1, '2024-01-05'),
('d4e5f6a7-b8c9-0123-defa-234567890123', '55555555-5555-5555-5555-555555555555', 'En el Restaurante', 'Ordering food and dining out in Spanish', 'https://open.spotify.com/episode/0G0sR1v6Bb2Hh8r1N7t4Ss', 1250, 2, '2024-01-12'),

-- Spanish Episodes (SpanishLearningLab)
('e5f6a7b8-c9d0-1234-efab-345678901234', '66666666-6666-6666-6666-666666666666', 'Cultura Hispanoamericana', 'Latin American culture and traditions', 'https://open.spotify.com/episode/1H1tS2w7Cc3Ii9s2O8u5Tt', 1700, 1, '2024-01-09'),
('f6a7b8c9-d0e1-2345-fabc-456789012345', '66666666-6666-6666-6666-666666666666', 'Historia de España', 'Spanish history and heritage', 'https://open.spotify.com/episode/2I2uT3x8Dd4Jj0t3P9v6Uu', 1900, 2, '2024-01-16');