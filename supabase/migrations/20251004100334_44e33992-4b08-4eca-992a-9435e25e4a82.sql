-- Function to generate random username
CREATE OR REPLACE FUNCTION public.generate_random_username()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  adjectives TEXT[] := ARRAY[
    'Swift', 'Bright', 'Quick', 'Smart', 'Clever', 'Wise', 'Bold', 
    'Brave', 'Cool', 'Happy', 'Lucky', 'Mighty', 'Noble', 'Royal',
    'Stellar', 'Cosmic', 'Epic', 'Super', 'Ultra', 'Mega'
  ];
  nouns TEXT[] := ARRAY[
    'Learner', 'Scholar', 'Student', 'Explorer', 'Pioneer', 'Champion',
    'Master', 'Expert', 'Wizard', 'Ninja', 'Dragon', 'Phoenix', 'Tiger',
    'Eagle', 'Wolf', 'Lion', 'Panda', 'Fox', 'Bear', 'Owl'
  ];
  random_username TEXT;
  username_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random username: Adjective + Noun + 3-digit number
    random_username := adjectives[1 + floor(random() * array_length(adjectives, 1))] ||
                      nouns[1 + floor(random() * array_length(nouns, 1))] ||
                      lpad(floor(random() * 1000)::TEXT, 3, '0');
    
    -- Check if username exists
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE username = random_username
    ) INTO username_exists;
    
    -- Exit loop if username is unique
    EXIT WHEN NOT username_exists;
  END LOOP;
  
  RETURN random_username;
END;
$$;

-- Update handle_new_user to generate username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    email, 
    username,
    display_name,
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id, 
    NEW.email,
    generate_random_username(),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'display_name', 
      NEW.email
    ),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;