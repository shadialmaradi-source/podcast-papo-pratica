-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username text UNIQUE;

-- Add constraint for username length (3-30 characters)
ALTER TABLE public.profiles 
ADD CONSTRAINT username_length_check 
CHECK (username IS NULL OR (char_length(username) >= 3 AND char_length(username) <= 30));

-- Create index for faster username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Add constraint for username format (alphanumeric, underscore, hyphen only)
ALTER TABLE public.profiles 
ADD CONSTRAINT username_format_check 
CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_-]+$');

-- Create prohibited words table for multi-language profanity filtering
CREATE TABLE public.prohibited_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  language text NOT NULL,
  severity text DEFAULT 'high',
  category text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on prohibited_words
ALTER TABLE public.prohibited_words ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read prohibited words (needed for validation)
CREATE POLICY "Prohibited words are viewable by authenticated users"
ON public.prohibited_words
FOR SELECT
TO authenticated
USING (true);

-- Create index for faster word lookups
CREATE INDEX idx_prohibited_words_word ON public.prohibited_words(lower(word));
CREATE INDEX idx_prohibited_words_language ON public.prohibited_words(language);

-- Insert common prohibited words across languages
INSERT INTO public.prohibited_words (word, language, severity, category) VALUES
-- English profanity
('fuck', 'en', 'high', 'profanity'),
('shit', 'en', 'high', 'profanity'),
('bitch', 'en', 'high', 'profanity'),
('damn', 'en', 'medium', 'profanity'),
('ass', 'en', 'medium', 'profanity'),
('bastard', 'en', 'high', 'profanity'),
('cunt', 'en', 'high', 'profanity'),
('dick', 'en', 'high', 'profanity'),
('piss', 'en', 'medium', 'profanity'),
('hell', 'en', 'low', 'profanity'),

-- Italian profanity
('cazzo', 'it', 'high', 'profanity'),
('merda', 'it', 'high', 'profanity'),
('puttana', 'it', 'high', 'profanity'),
('stronzo', 'it', 'high', 'profanity'),
('culo', 'it', 'medium', 'profanity'),
('coglione', 'it', 'high', 'profanity'),
('figa', 'it', 'high', 'profanity'),
('porco', 'it', 'high', 'blasphemy'),
('dio', 'it', 'high', 'blasphemy'),
('madonna', 'it', 'high', 'blasphemy'),

-- Portuguese profanity
('porra', 'pt', 'high', 'profanity'),
('merda', 'pt', 'high', 'profanity'),
('caralho', 'pt', 'high', 'profanity'),
('puta', 'pt', 'high', 'profanity'),
('filho da puta', 'pt', 'high', 'profanity'),
('fodase', 'pt', 'high', 'profanity'),
('cu', 'pt', 'high', 'profanity'),
('buceta', 'pt', 'high', 'profanity'),
('viado', 'pt', 'high', 'profanity'),

-- German profanity
('scheisse', 'de', 'high', 'profanity'),
('scheiße', 'de', 'high', 'profanity'),
('arsch', 'de', 'medium', 'profanity'),
('fick', 'de', 'high', 'profanity'),
('hure', 'de', 'high', 'profanity'),
('fotze', 'de', 'high', 'profanity'),
('schwanz', 'de', 'high', 'profanity'),
('verdammt', 'de', 'medium', 'profanity'),

-- French profanity
('merde', 'fr', 'high', 'profanity'),
('putain', 'fr', 'high', 'profanity'),
('connard', 'fr', 'high', 'profanity'),
('salope', 'fr', 'high', 'profanity'),
('bordel', 'fr', 'medium', 'profanity'),
('chier', 'fr', 'high', 'profanity'),
('con', 'fr', 'medium', 'profanity'),
('bite', 'fr', 'high', 'profanity');