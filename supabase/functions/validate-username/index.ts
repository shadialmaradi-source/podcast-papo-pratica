import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, currentUserId } = await req.json();

    console.log('Validating username:', username, 'for user:', currentUserId);

    if (!username) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Username is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Length validation
    if (username.length < 3 || username.length > 30) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Username must be 3-30 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Format validation (alphanumeric, underscore, hyphen only)
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: 'Username can only contain letters, numbers, underscore, and hyphen' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Profanity check across all languages
    const usernameLower = username.toLowerCase();
    
    // Remove special characters that might be used to disguise profanity
    const normalizedUsername = usernameLower
      .replace(/[0]/g, 'o')
      .replace(/[1]/g, 'i')
      .replace(/[3]/g, 'e')
      .replace(/[4]/g, 'a')
      .replace(/[5]/g, 's')
      .replace(/[7]/g, 't')
      .replace(/[8]/g, 'b')
      .replace(/[@]/g, 'a')
      .replace(/[\$]/g, 's')
      .replace(/[_-]/g, '');

    // Fetch prohibited words from database
    const { data: prohibitedWords, error: wordsError } = await supabase
      .from('prohibited_words')
      .select('word, language');

    if (wordsError) {
      console.error('Error fetching prohibited words:', wordsError);
      return new Response(
        JSON.stringify({ valid: false, reason: 'Validation service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if username contains any prohibited words
    for (const entry of prohibitedWords || []) {
      const prohibitedWord = entry.word.toLowerCase();
      
      // Check both original and normalized username
      if (usernameLower.includes(prohibitedWord) || normalizedUsername.includes(prohibitedWord)) {
        console.log('Profanity detected:', prohibitedWord, 'in username:', username);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            reason: 'Username contains inappropriate language. Please choose a different username.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Uniqueness check
    const { data: existingUsers, error: uniqueError } = await supabase
      .from('profiles')
      .select('user_id, username')
      .ilike('username', username);

    if (uniqueError) {
      console.error('Error checking username uniqueness:', uniqueError);
      return new Response(
        JSON.stringify({ valid: false, reason: 'Validation service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if username is taken by someone else
    const isTakenByOther = existingUsers?.some(
      user => user.user_id !== currentUserId && user.username.toLowerCase() === usernameLower
    );

    if (isTakenByOther) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Username is already taken' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All validations passed
    console.log('Username validation passed:', username);
    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-username function:', error);
    return new Response(
      JSON.stringify({ valid: false, reason: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
