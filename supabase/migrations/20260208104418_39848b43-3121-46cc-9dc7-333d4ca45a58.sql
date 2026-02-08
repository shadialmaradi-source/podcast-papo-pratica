
-- =============================================
-- LEARNING PATH: Tables, RLS, Indexes, Seed Data
-- =============================================

-- 1. learning_weeks — themed week definitions
CREATE TABLE public.learning_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cefr_level TEXT NOT NULL DEFAULT 'A1',
  language TEXT NOT NULL DEFAULT 'english',
  order_index INTEGER NOT NULL DEFAULT 0,
  total_videos INTEGER NOT NULL DEFAULT 5,
  is_locked_by_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. week_videos — videos within each week
CREATE TABLE public.week_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES public.learning_weeks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL DEFAULT '',
  youtube_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 60,
  thumbnail_url TEXT,
  source TEXT NOT NULL DEFAULT '',
  order_in_week INTEGER NOT NULL DEFAULT 1,
  grammar_focus TEXT NOT NULL DEFAULT '',
  vocabulary_tags TEXT[] DEFAULT '{}',
  xp_reward INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. user_week_progress — per-user week unlock/completion
CREATE TABLE public.user_week_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_id UUID NOT NULL REFERENCES public.learning_weeks(id) ON DELETE CASCADE,
  videos_completed INTEGER NOT NULL DEFAULT 0,
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_id)
);

-- 4. user_video_progress — per-user video completion
CREATE TABLE public.user_video_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_video_id UUID NOT NULL REFERENCES public.week_videos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMP WITH TIME ZONE,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_video_id)
);

-- Indexes
CREATE INDEX idx_learning_weeks_level_lang ON public.learning_weeks(level, language);
CREATE INDEX idx_week_videos_week_id ON public.week_videos(week_id);
CREATE INDEX idx_user_week_progress_user ON public.user_week_progress(user_id);
CREATE INDEX idx_user_video_progress_user ON public.user_video_progress(user_id);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.learning_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.week_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_week_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_video_progress ENABLE ROW LEVEL SECURITY;

-- learning_weeks: public read
CREATE POLICY "Anyone can view learning weeks"
  ON public.learning_weeks FOR SELECT USING (true);

-- week_videos: public read
CREATE POLICY "Anyone can view week videos"
  ON public.week_videos FOR SELECT USING (true);

-- user_week_progress: own data only
CREATE POLICY "Users can view own week progress"
  ON public.user_week_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own week progress"
  ON public.user_week_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own week progress"
  ON public.user_week_progress FOR UPDATE USING (auth.uid() = user_id);

-- user_video_progress: own data only
CREATE POLICY "Users can view own video progress"
  ON public.user_video_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own video progress"
  ON public.user_video_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own video progress"
  ON public.user_video_progress FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- SEED DATA: 8 Beginner Weeks
-- =============================================

-- Week 1: Greetings & Introductions (A1, unlocked by default)
INSERT INTO public.learning_weeks (level, week_number, title, description, cefr_level, language, order_index, total_videos, is_locked_by_default)
VALUES ('beginner', 1, 'Greetings & Introductions', 'Learn basic greetings, how to say hello and goodbye, and introduce yourself in everyday situations.', 'A1', 'english', 1, 5, false);

-- Week 2: Daily Routine (A1)
INSERT INTO public.learning_weeks (level, week_number, title, description, cefr_level, language, order_index, total_videos, is_locked_by_default)
VALUES ('beginner', 2, 'Daily Routine', 'Talk about your daily activities, tell time, and describe what you do every day.', 'A1', 'english', 2, 5, true);

-- Week 3: Food & Eating (A1)
INSERT INTO public.learning_weeks (level, week_number, title, description, cefr_level, language, order_index, total_videos, is_locked_by_default)
VALUES ('beginner', 3, 'Food & Eating', 'Learn food vocabulary, how to order at a restaurant, and talk about your favorite meals.', 'A1', 'english', 3, 6, true);

-- Week 4: Family & Friends (A1-A2)
INSERT INTO public.learning_weeks (level, week_number, title, description, cefr_level, language, order_index, total_videos, is_locked_by_default)
VALUES ('beginner', 4, 'Family & Friends', 'Describe your family members, talk about relationships, and introduce your friends.', 'A1', 'english', 4, 5, true);

-- Week 5: Shopping & Money (A2)
INSERT INTO public.learning_weeks (level, week_number, title, description, cefr_level, language, order_index, total_videos, is_locked_by_default)
VALUES ('beginner', 5, 'Shopping & Money', 'Learn to shop, ask about prices, handle money, and describe what you want to buy.', 'A2', 'english', 5, 6, true);

-- Week 6: Time & Dates (A2)
INSERT INTO public.learning_weeks (level, week_number, title, description, cefr_level, language, order_index, total_videos, is_locked_by_default)
VALUES ('beginner', 6, 'Time & Dates', 'Tell time, talk about days of the week, months, seasons, and make appointments.', 'A2', 'english', 6, 5, true);

-- Week 7: Describing Things (A2)
INSERT INTO public.learning_weeks (level, week_number, title, description, cefr_level, language, order_index, total_videos, is_locked_by_default)
VALUES ('beginner', 7, 'Describing Things', 'Use adjectives to describe people, places, and objects. Learn comparatives and superlatives.', 'A2', 'english', 7, 6, true);

-- Week 8: Past Experiences (A2)
INSERT INTO public.learning_weeks (level, week_number, title, description, cefr_level, language, order_index, total_videos, is_locked_by_default)
VALUES ('beginner', 8, 'Past Experiences', 'Talk about what happened yesterday, last week, or in the past using simple past tense.', 'A2', 'english', 8, 6, true);

-- =============================================
-- SEED VIDEOS (real YouTube IDs)
-- =============================================

-- Helper: get week IDs by week_number for beginner english
-- Week 1 videos (Greetings & Introductions)
INSERT INTO public.week_videos (week_id, title, youtube_url, youtube_id, duration_seconds, source, order_in_week, grammar_focus, vocabulary_tags, xp_reward)
VALUES
  ((SELECT id FROM public.learning_weeks WHERE week_number = 1 AND level = 'beginner' AND language = 'english'),
   'How to Greet People in English', 'https://www.youtube.com/watch?v=oW0cJBpRsLQ', 'oW0cJBpRsLQ', 62, 'VOA Learning English', 1, 'Greetings', ARRAY['hello','hi','good morning','good afternoon'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 1 AND level = 'beginner' AND language = 'english'),
   'Saying Hello and Goodbye', 'https://www.youtube.com/watch?v=3y1dERsgOCw', '3y1dERsgOCw', 75, 'BBC Learning English', 2, 'Greetings', ARRAY['goodbye','see you','bye','take care'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 1 AND level = 'beginner' AND language = 'english'),
   'How to Introduce Yourself', 'https://www.youtube.com/watch?v=oqYKs-fMIoI', 'oqYKs-fMIoI', 90, 'English with Lucy', 3, 'Present Simple', ARRAY['my name is','I am from','nice to meet you'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 1 AND level = 'beginner' AND language = 'english'),
   'Nice to Meet You - Basic Conversations', 'https://www.youtube.com/watch?v=R7sW5Hnz1VY', 'R7sW5Hnz1VY', 85, 'English Addict', 4, 'Questions', ARRAY['where are you from','what do you do','how are you'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 1 AND level = 'beginner' AND language = 'english'),
   'Formal vs Informal Greetings', 'https://www.youtube.com/watch?v=VnDXjkC5dAA', 'VnDXjkC5dAA', 95, 'mmmEnglish', 5, 'Register', ARRAY['formal','informal','dear','hey'], 10);

-- Week 2 videos (Daily Routine)
INSERT INTO public.week_videos (week_id, title, youtube_url, youtube_id, duration_seconds, source, order_in_week, grammar_focus, vocabulary_tags, xp_reward)
VALUES
  ((SELECT id FROM public.learning_weeks WHERE week_number = 2 AND level = 'beginner' AND language = 'english'),
   'My Daily Routine', 'https://www.youtube.com/watch?v=SjMmxsQ0kfM', 'SjMmxsQ0kfM', 78, 'Easy English', 1, 'Present Simple', ARRAY['wake up','get dressed','have breakfast','go to work'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 2 AND level = 'beginner' AND language = 'english'),
   'Telling Time in English', 'https://www.youtube.com/watch?v=IBBQXBhSNUs', 'IBBQXBhSNUs', 95, 'English with Lucy', 2, 'Time Expressions', ARRAY['oclock','half past','quarter to','quarter past'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 2 AND level = 'beginner' AND language = 'english'),
   'Morning Routine Vocabulary', 'https://www.youtube.com/watch?v=WsNM0eTzKTI', 'WsNM0eTzKTI', 68, 'VOA Learning English', 3, 'Present Simple', ARRAY['brush teeth','take a shower','make the bed','eat breakfast'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 2 AND level = 'beginner' AND language = 'english'),
   'What Do You Do Every Day?', 'https://www.youtube.com/watch?v=MYcRpOevJt4', 'MYcRpOevJt4', 82, 'English Addict', 4, 'Adverbs of Frequency', ARRAY['always','usually','sometimes','never'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 2 AND level = 'beginner' AND language = 'english'),
   'Evening Routine', 'https://www.youtube.com/watch?v=QGi-dSWJzn0', 'QGi-dSWJzn0', 70, 'BBC Learning English', 5, 'Present Simple', ARRAY['cook dinner','watch TV','read a book','go to bed'], 10);

-- Week 3 videos (Food & Eating)
INSERT INTO public.week_videos (week_id, title, youtube_url, youtube_id, duration_seconds, source, order_in_week, grammar_focus, vocabulary_tags, xp_reward)
VALUES
  ((SELECT id FROM public.learning_weeks WHERE week_number = 3 AND level = 'beginner' AND language = 'english'),
   'Food Vocabulary for Beginners', 'https://www.youtube.com/watch?v=7o0TjKCEh8w', '7o0TjKCEh8w', 80, 'English with Lucy', 1, 'Nouns', ARRAY['bread','cheese','milk','egg','rice'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 3 AND level = 'beginner' AND language = 'english'),
   'At the Restaurant', 'https://www.youtube.com/watch?v=bPMGsslXxP4', 'bPMGsslXxP4', 92, 'Easy English', 2, 'Would like', ARRAY['menu','order','waiter','bill'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 3 AND level = 'beginner' AND language = 'english'),
   'Fruits and Vegetables', 'https://www.youtube.com/watch?v=x7YLTM6dGMM', 'x7YLTM6dGMM', 65, 'VOA Learning English', 3, 'Countable/Uncountable', ARRAY['apple','banana','tomato','onion','carrot'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 3 AND level = 'beginner' AND language = 'english'),
   'Ordering Food in English', 'https://www.youtube.com/watch?v=BLPdCOMq1Qg', 'BLPdCOMq1Qg', 88, 'mmmEnglish', 4, 'Polite Requests', ARRAY['can I have','I would like','please','thank you'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 3 AND level = 'beginner' AND language = 'english'),
   'Cooking Vocabulary', 'https://www.youtube.com/watch?v=1TvDHgWiCaE', '1TvDHgWiCaE', 75, 'English Addict', 5, 'Verbs', ARRAY['cook','boil','fry','bake','mix'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 3 AND level = 'beginner' AND language = 'english'),
   'My Favorite Food', 'https://www.youtube.com/watch?v=H2IfMSdiXRY', 'H2IfMSdiXRY', 70, 'BBC Learning English', 6, 'Like/Dislike', ARRAY['like','love','hate','prefer','favorite'], 10);

-- Week 4 videos (Family & Friends)
INSERT INTO public.week_videos (week_id, title, youtube_url, youtube_id, duration_seconds, source, order_in_week, grammar_focus, vocabulary_tags, xp_reward)
VALUES
  ((SELECT id FROM public.learning_weeks WHERE week_number = 4 AND level = 'beginner' AND language = 'english'),
   'Family Members in English', 'https://www.youtube.com/watch?v=B1TnYD0WDEE', 'B1TnYD0WDEE', 85, 'English with Lucy', 1, 'Possessives', ARRAY['mother','father','sister','brother','parents'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 4 AND level = 'beginner' AND language = 'english'),
   'Describing Your Family', 'https://www.youtube.com/watch?v=yoIKKOkNbXE', 'yoIKKOkNbXE', 78, 'Easy English', 2, 'Adjectives', ARRAY['tall','short','young','old','friendly'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 4 AND level = 'beginner' AND language = 'english'),
   'Talking About Friends', 'https://www.youtube.com/watch?v=LZ3LkQ5qbcc', 'LZ3LkQ5qbcc', 72, 'VOA Learning English', 3, 'Present Simple', ARRAY['friend','best friend','classmate','neighbor'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 4 AND level = 'beginner' AND language = 'english'),
   'Family Relationships', 'https://www.youtube.com/watch?v=PNi1RF2nrng', 'PNi1RF2nrng', 90, 'BBC Learning English', 4, 'Have/Has', ARRAY['uncle','aunt','cousin','nephew','niece'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 4 AND level = 'beginner' AND language = 'english'),
   'Introducing Your Family', 'https://www.youtube.com/watch?v=jWSIq-DrTl0', 'jWSIq-DrTl0', 68, 'mmmEnglish', 5, 'This is / These are', ARRAY['this is my','these are my','let me introduce'], 10);

-- Week 5 videos (Shopping & Money)
INSERT INTO public.week_videos (week_id, title, youtube_url, youtube_id, duration_seconds, source, order_in_week, grammar_focus, vocabulary_tags, xp_reward)
VALUES
  ((SELECT id FROM public.learning_weeks WHERE week_number = 5 AND level = 'beginner' AND language = 'english'),
   'Shopping Vocabulary', 'https://www.youtube.com/watch?v=a-1yXRHN3Wk', 'a-1yXRHN3Wk', 88, 'English with Lucy', 1, 'Nouns', ARRAY['shop','store','price','sale','discount'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 5 AND level = 'beginner' AND language = 'english'),
   'How Much Does It Cost?', 'https://www.youtube.com/watch?v=K9-sMWjxPqA', 'K9-sMWjxPqA', 75, 'VOA Learning English', 2, 'How much/many', ARRAY['cost','cheap','expensive','change','pay'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 5 AND level = 'beginner' AND language = 'english'),
   'At the Supermarket', 'https://www.youtube.com/watch?v=i9VRI3qR7uw', 'i9VRI3qR7uw', 92, 'Easy English', 3, 'Countable/Uncountable', ARRAY['basket','checkout','aisle','receipt'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 5 AND level = 'beginner' AND language = 'english'),
   'Clothes Shopping', 'https://www.youtube.com/watch?v=wt9d7d4_-Ek', 'wt9d7d4_-Ek', 82, 'BBC Learning English', 4, 'This/That/These/Those', ARRAY['shirt','dress','shoes','size','try on'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 5 AND level = 'beginner' AND language = 'english'),
   'Numbers and Money', 'https://www.youtube.com/watch?v=KBY8MPjJ5q0', 'KBY8MPjJ5q0', 70, 'mmmEnglish', 5, 'Numbers', ARRAY['dollar','euro','pound','cents','total'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 5 AND level = 'beginner' AND language = 'english'),
   'Asking for Help in a Shop', 'https://www.youtube.com/watch?v=bXKYnBFHYlQ', 'bXKYnBFHYlQ', 65, 'English Addict', 6, 'Can/Could', ARRAY['excuse me','where is','can you help','looking for'], 10);

-- Week 6 videos (Time & Dates)
INSERT INTO public.week_videos (week_id, title, youtube_url, youtube_id, duration_seconds, source, order_in_week, grammar_focus, vocabulary_tags, xp_reward)
VALUES
  ((SELECT id FROM public.learning_weeks WHERE week_number = 6 AND level = 'beginner' AND language = 'english'),
   'Days of the Week', 'https://www.youtube.com/watch?v=mXMofxtDPUQ', 'mXMofxtDPUQ', 60, 'VOA Learning English', 1, 'Time Expressions', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 6 AND level = 'beginner' AND language = 'english'),
   'Months and Seasons', 'https://www.youtube.com/watch?v=Fe9bnYRzFvk', 'Fe9bnYRzFvk', 72, 'English with Lucy', 2, 'Prepositions of Time', ARRAY['January','spring','summer','winter','autumn'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 6 AND level = 'beginner' AND language = 'english'),
   'Making Appointments', 'https://www.youtube.com/watch?v=2KRBI0k3cXA', '2KRBI0k3cXA', 85, 'Easy English', 3, 'Would like to', ARRAY['appointment','schedule','available','free','busy'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 6 AND level = 'beginner' AND language = 'english'),
   'Telling the Date', 'https://www.youtube.com/watch?v=nAzjmBVeNVk', 'nAzjmBVeNVk', 78, 'BBC Learning English', 4, 'Ordinal Numbers', ARRAY['first','second','third','date','year'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 6 AND level = 'beginner' AND language = 'english'),
   'When Is Your Birthday?', 'https://www.youtube.com/watch?v=k37-3Wz6PD4', 'k37-3Wz6PD4', 68, 'mmmEnglish', 5, 'Questions with When', ARRAY['birthday','born','celebrate','party','age'], 10);

-- Week 7 videos (Describing Things)
INSERT INTO public.week_videos (week_id, title, youtube_url, youtube_id, duration_seconds, source, order_in_week, grammar_focus, vocabulary_tags, xp_reward)
VALUES
  ((SELECT id FROM public.learning_weeks WHERE week_number = 7 AND level = 'beginner' AND language = 'english'),
   'Common Adjectives', 'https://www.youtube.com/watch?v=VKc1jwT1ufk', 'VKc1jwT1ufk', 80, 'English with Lucy', 1, 'Adjectives', ARRAY['big','small','hot','cold','beautiful','ugly'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 7 AND level = 'beginner' AND language = 'english'),
   'Describing People', 'https://www.youtube.com/watch?v=0HtzBBz0wE4', '0HtzBBz0wE4', 88, 'Easy English', 2, 'Be + Adjective', ARRAY['tall','short','thin','heavy','young','old'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 7 AND level = 'beginner' AND language = 'english'),
   'Describing Places', 'https://www.youtube.com/watch?v=mL7JM3XcJIs', 'mL7JM3XcJIs', 75, 'VOA Learning English', 3, 'There is/are', ARRAY['quiet','noisy','crowded','empty','modern'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 7 AND level = 'beginner' AND language = 'english'),
   'Colors and Shapes', 'https://www.youtube.com/watch?v=jYAYGi2pRO0', 'jYAYGi2pRO0', 65, 'BBC Learning English', 4, 'Nouns', ARRAY['red','blue','green','circle','square','triangle'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 7 AND level = 'beginner' AND language = 'english'),
   'Comparing Things', 'https://www.youtube.com/watch?v=iqE_7K9INZE', 'iqE_7K9INZE', 92, 'mmmEnglish', 5, 'Comparatives', ARRAY['bigger','smaller','more','less','than'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 7 AND level = 'beginner' AND language = 'english'),
   'The Best and the Worst', 'https://www.youtube.com/watch?v=x1gJq-IGQIc', 'x1gJq-IGQIc', 82, 'English Addict', 6, 'Superlatives', ARRAY['best','worst','most','least','ever'], 10);

-- Week 8 videos (Past Experiences)
INSERT INTO public.week_videos (week_id, title, youtube_url, youtube_id, duration_seconds, source, order_in_week, grammar_focus, vocabulary_tags, xp_reward)
VALUES
  ((SELECT id FROM public.learning_weeks WHERE week_number = 8 AND level = 'beginner' AND language = 'english'),
   'Simple Past Tense', 'https://www.youtube.com/watch?v=0BQFYuMgJrY', '0BQFYuMgJrY', 90, 'English with Lucy', 1, 'Past Simple Regular', ARRAY['worked','played','watched','listened','walked'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 8 AND level = 'beginner' AND language = 'english'),
   'Irregular Past Verbs', 'https://www.youtube.com/watch?v=ldNSKVflVOw', 'ldNSKVflVOw', 95, 'mmmEnglish', 2, 'Past Simple Irregular', ARRAY['went','saw','ate','had','made','took'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 8 AND level = 'beginner' AND language = 'english'),
   'What Did You Do Yesterday?', 'https://www.youtube.com/watch?v=Sm0gSN_r7Dc', 'Sm0gSN_r7Dc', 72, 'Easy English', 3, 'Past Simple Questions', ARRAY['did you','what did','where did','when did'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 8 AND level = 'beginner' AND language = 'english'),
   'My Last Vacation', 'https://www.youtube.com/watch?v=YyqE18Hh77c', 'YyqE18Hh77c', 85, 'VOA Learning English', 4, 'Past Simple Narrative', ARRAY['traveled','visited','stayed','enjoyed','returned'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 8 AND level = 'beginner' AND language = 'english'),
   'Talking About the Weekend', 'https://www.youtube.com/watch?v=GxM-qDL6uDM', 'GxM-qDL6uDM', 68, 'BBC Learning English', 5, 'Past Simple', ARRAY['weekend','last Saturday','hung out','relaxed'], 10),
  ((SELECT id FROM public.learning_weeks WHERE week_number = 8 AND level = 'beginner' AND language = 'english'),
   'Life Story - Past Tense Practice', 'https://www.youtube.com/watch?v=UpB5G7v0JVY', 'UpB5G7v0JVY', 88, 'English Addict', 6, 'Past Simple Mixed', ARRAY['was born','grew up','moved','studied','started'], 10);
